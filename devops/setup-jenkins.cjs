const {request,secrets}=require('./jenkins-api.cjs');
const fs=require('node:fs');
const path=require('node:path');
const token=Buffer.from(secrets.sonarToken).toString('base64');
const pipeline=Buffer.from(fs.readFileSync(path.join(__dirname,'../Jenkinsfile'),'utf8')).toString('base64');
const script=`
import jenkins.model.*
import hudson.util.Secret
import com.cloudbees.plugins.credentials.*
import com.cloudbees.plugins.credentials.domains.Domain
import org.jenkinsci.plugins.plaincredentials.impl.StringCredentialsImpl
import hudson.plugins.sonar.*
import hudson.plugins.git.*
import org.jenkinsci.plugins.workflow.job.WorkflowJob
import org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition
import org.jenkinsci.plugins.workflow.job.properties.PipelineTriggersJobProperty
import hudson.triggers.SCMTrigger

def j=Jenkins.get()
def store=SystemCredentialsProvider.getInstance().getStore()
def credential=new StringCredentialsImpl(CredentialsScope.GLOBAL,'sonarqube-crud-token','Restricted token for CRUD Clientes',Secret.fromString(new String('${token}'.decodeBase64(),'UTF-8')))
def previous=store.getCredentials(Domain.global()).find{it.id=='sonarqube-crud-token'}
if(previous) store.updateCredentials(Domain.global(),previous,credential)
else store.addCredentials(Domain.global(),credential)
def sonar=SonarGlobalConfiguration.get()
sonar.setInstallations(new SonarInstallation('SonarQube','http://sonarqube:9000','sonarqube-crud-token',null,null,null,null,null,null))
sonar.setBuildWrapperEnabled(true)
def scanner=j.getDescriptorByType(SonarRunnerInstallation.DescriptorImpl.class)
scanner.setInstallations(new SonarRunnerInstallation('SonarScanner','/opt/sonar-scanner',[]))
scanner.save()
JenkinsLocationConfiguration.get().setUrl('http://localhost:8080/')
def job=j.getItem('crud-clientes-devops') ?: j.createProject(WorkflowJob.class,'crud-clientes-devops')
def definition=new CpsFlowDefinition(new String('${pipeline}'.decodeBase64(),'UTF-8'),true)
job.setDefinition(definition)
job.setDescription('Clase 13: GitHub, tests backend/frontend, SonarQube, Quality Gate, Docker build and deployment. Poll GitHub every five minutes.')
job.addProperty(new PipelineTriggersJobProperty([new SCMTrigger('H/5 * * * *')]))
job.save()
j.save()
println 'CONFIGURED'
`;
request('/scriptText',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({script})})
 .then(result=>{if(!result.trim().endsWith('CONFIGURED')) throw Error(result); console.log(result.trim());})
 .catch(e=>{console.error(e.message.replaceAll(secrets.sonarToken,'[REDACTED]').replaceAll(token,'[REDACTED]'));process.exitCode=1});
