const fs=require('node:fs');
const path=require('node:path');
const {request}=require('./jenkins-api.cjs');
const dir=path.join(__dirname,'evidence');
fs.mkdirSync(dir,{recursive:true});
const token=process.env.SONAR_ADMIN_TOKEN || fs.readFileSync(path.join(__dirname,'../../LaMorada/.sonar-token'),'utf8').trim();
async function sonar(route) {
  const r=await fetch('http://localhost:9000/api/'+route,{headers:{Authorization:'Bearer '+token}});
  if(!r.ok) throw Error('Sonar HTTP '+r.status);
  return r.json();
}
async function save(name,content) { fs.writeFileSync(path.join(dir,name), typeof content==='string'?content:JSON.stringify(content,null,2)); }
(async()=>{
  await save('quality-gate-result.json',await sonar('qualitygates/project_status?projectKey=crud-clientes-devops'));
  await save('sonar-metrics.json',await sonar('measures/component?component=crud-clientes-devops&metricKeys=coverage,duplicated_lines_density,software_quality_reliability_rating,software_quality_security_rating,software_quality_maintainability_rating,security_hotspots_reviewed,ncloc,violations'));
  await save('sonar-issues.json',await sonar('issues/search?componentKeys=crud-clientes-devops&resolved=false&ps=500'));
  await save('webhook-deliveries.json',await sonar('webhooks/deliveries?componentKey=crud-clientes-devops'));
  if(!process.argv.includes('--sonar-only')) {
    await save('jenkins-build.json',await request('/job/crud-clientes-devops/lastBuild/api/json'));
    await save('jenkins-stages.json',await request('/job/crud-clientes-devops/lastBuild/wfapi/describe'));
    await save('jenkins-console.txt',await request('/job/crud-clientes-devops/lastBuild/consoleText'));
    await save('jenkins-plugins.json',await request('/pluginManager/api/json?tree=plugins[shortName,version,active]'));
    const health=await fetch('http://localhost:8000/health');
    if(!health.ok) throw Error('API health HTTP '+health.status);
    await save('deployment-health.json',{checkedAt:new Date().toISOString(),httpStatus:health.status,body:await health.json()});
  }
  console.log('Evidence exported.');
})().catch(e=>{console.error(e.message);process.exitCode=1});
