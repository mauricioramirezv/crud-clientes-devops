// Reuses the local SonarQube server and creates only this exercise's resources.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const dir = path.join(process.env.LOCALAPPDATA, 'CrudClientesDevOps');
fs.mkdirSync(dir, {recursive: true});
const secretPath = path.join(dir, 'credentials.json');
const secrets = fs.existsSync(secretPath) ? JSON.parse(fs.readFileSync(secretPath)) : {
  jenkinsPassword: 'Aa9!' + crypto.randomBytes(24).toString('base64url'),
  sonarUserPassword: 'Aa9!' + crypto.randomBytes(24).toString('base64url')
};
const save = () => fs.writeFileSync(secretPath, JSON.stringify(secrets, null, 2));
save();
fs.writeFileSync(path.join(dir, 'jenkins-password.txt'), secrets.jenkinsPassword);
const existingSecretFile = path.join(process.env.LOCALAPPDATA, 'LaMoradaSonar', 'credentials.json');
const existingTokenFile = path.join(__dirname,'../../LaMorada/.sonar-token');
const adminPassword = process.env.SONAR_ADMIN_PASSWORD || (fs.existsSync(existingSecretFile) ? JSON.parse(fs.readFileSync(existingSecretFile)).adminPassword : '');
const adminToken = process.env.SONAR_ADMIN_TOKEN || (fs.existsSync(existingTokenFile) ? fs.readFileSync(existingTokenFile,'utf8').trim() : '');
if (!adminPassword && !adminToken) throw Error('Set SONAR_ADMIN_TOKEN or SONAR_ADMIN_PASSWORD to configure the existing SonarQube server.');
const base = 'http://localhost:9000';
const project = 'crud-clientes-devops';
async function api(endpoint, params={}, method='GET', user='admin', password=adminPassword) {
  const query = new URLSearchParams(params);
  const response = await fetch(base + '/api/' + endpoint + (method==='GET'?'?'+query:''), {
    method, headers: {Authorization: user==='admin' && adminToken ? 'Bearer '+adminToken : 'Basic '+Buffer.from(user+':'+password).toString('base64'), 'Content-Type':'application/x-www-form-urlencoded'},
    ...(method==='POST'?{body:query}: {})
  });
  const text = await response.text();
  if (!response.ok) throw Error(endpoint+' '+response.status+' '+text);
  return text ? JSON.parse(text) : {};
}
(async () => {
  const projects = await api('projects/search', {projects:project});
  if (!projects.components.length) await api('projects/create',{project,name:'CRUD Clientes DevOps',visibility:'public'},'POST');
  const users = await api('users/search', {q:'jenkins-crud'});
  if (!users.users.some(u=>u.login==='jenkins-crud')) await api('users/create',{login:'jenkins-crud',name:'Jenkins CI - CRUD Clientes',password:secrets.sonarUserPassword,local:'true'},'POST');
  for (const permission of ['scan','user','codeviewer']) await api('permissions/add_user',{login:'jenkins-crud',permission,projectKey:project},'POST');
  if (!secrets.sonarToken) {
    const token = await api('user_tokens/generate',{name:'jenkins-crud-pipeline',type:'PROJECT_ANALYSIS_TOKEN',projectKey:project},'POST','jenkins-crud',secrets.sonarUserPassword);
    secrets.sonarToken=token.token; save();
  }
  const gateName='CRUD Clientes - Quality Gate';
  const gates=await api('qualitygates/list');
  if (!gates.qualitygates.some(g=>g.name===gateName)) await api('qualitygates/create',{name:gateName},'POST');
  const gate=await api('qualitygates/show',{name:gateName});
  const conditions=[['coverage','LT','90'],['duplicated_lines_density','GT','3'],['software_quality_reliability_rating','GT','1'],['software_quality_security_rating','GT','1'],['software_quality_maintainability_rating','GT','1'],['security_hotspots_reviewed','LT','100'],['new_coverage','LT','90'],['new_duplicated_lines_density','GT','3'],['new_violations','GT','0'],['new_security_hotspots_reviewed','LT','100']];
  for(const [metric,op,error] of conditions) {
    const existing=gate.conditions.find(c=>c.metric===metric);
    if(existing) await api('qualitygates/update_condition',{id:existing.id,metric,op,error},'POST');
    else await api('qualitygates/create_condition',{gateName,metric,op,error},'POST');
  }
  await api('qualitygates/select',{gateName,projectKey:project},'POST');
  await api('new_code_periods/set',{project,type:'PREVIOUS_VERSION'},'POST');
  // Evaluate coverage/duplication even when a change has fewer than 20 lines.
  await api('settings/set',{key:'sonar.qualitygate.ignoreSmallChanges',value:'false',component:project},'POST');
  const hooks=await api('webhooks/list',{project});
  if(!hooks.webhooks.some(h=>h.url==='http://jenkins:8080/sonarqube-webhook/')) await api('webhooks/create',{project,name:'Jenkins Quality Gate',url:'http://jenkins:8080/sonarqube-webhook/'},'POST');
  fs.mkdirSync(path.join(__dirname,'evidence'),{recursive:true});
  fs.writeFileSync(path.join(__dirname,'evidence','quality-gate-config.json'),JSON.stringify(await api('qualitygates/show',{name:gateName}),null,2));
  console.log('Project, technical user, restricted analysis token, Quality Gate and webhook configured. Secrets stored outside Git.');
})().catch(e=>{console.error(e.message);process.exitCode=1});
