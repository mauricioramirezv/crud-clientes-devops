const fs = require('node:fs');
const path = require('node:path');
const secrets=JSON.parse(fs.readFileSync(path.join(process.env.LOCALAPPDATA,'CrudClientesDevOps','credentials.json')));
const base='http://localhost:8080';
const authorization='Basic '+Buffer.from('admin:'+secrets.jenkinsPassword).toString('base64');
async function request(route, options={}) {
  let headers={Authorization:authorization,...options.headers};
  if(options.method==='POST') {
    const crumbResponse=await fetch(base+'/crumbIssuer/api/json',{headers:{Authorization:authorization}});
    if(!crumbResponse.ok) throw Error('Jenkins crumb HTTP '+crumbResponse.status);
    const crumb=await crumbResponse.json();
    headers[crumb.crumbRequestField]=crumb.crumb;
    headers.Cookie=crumbResponse.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ');
  }
  const response=await fetch(base+route,{...options,headers});
  const text=await response.text();
  if(!response.ok) throw Error(route+' HTTP '+response.status+' '+text.slice(0,300));
  return text;
}
module.exports={request,secrets};
if(require.main===module) {
  const route=process.argv[2] || '/job/crud-clientes-devops/lastBuild/api/json';
  request(route,process.argv[3]==='POST'?{method:'POST'}:{}).then(console.log).catch(e=>{console.error(e.message);process.exitCode=1});
}
