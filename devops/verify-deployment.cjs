// Smoke test: creates and removes only its own disposable client.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const base=process.env.API_URL || 'http://localhost:8000';
const evidence=[];
async function call(method,route,body,expected) {
  const response=await fetch(base+route,{method,headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  evidence.push({method,route,status:response.status,expected});
  assert.equal(response.status,expected,method+' '+route);
  if(response.status===204) return;
  return response.headers.get('content-type')?.includes('application/json')?response.json():response.text();
}
(async()=>{
  let id;
  try {
    assert.equal((await call('GET','/health',null,200)).status,'ok');
    assert.match(await call('GET','/',null,200),/CRUD|Clientes/i);
    assert.match(await call('GET','/docs',null,200),/swagger/i);
    const email='pipeline-'+Date.now()+'@example.com';
    const created=await call('POST','/clientes',{nombre:'Prueba Pipeline',email},201);
    id=created.id;
    assert.equal((await call('GET','/clientes/'+id,null,200)).email,email);
    assert.ok((await call('GET','/clientes',null,200)).some(c=>c.id===id));
    assert.equal((await call('PUT','/clientes/'+id,{nombre:'Prueba Pipeline Editada',email},200)).nombre,'Prueba Pipeline Editada');
    await call('DELETE','/clientes/'+id,null,204);
    await call('GET','/clientes/'+id,null,404);
    id=undefined;
    fs.mkdirSync(path.join(__dirname,'evidence'),{recursive:true});
    fs.writeFileSync(path.join(__dirname,'evidence','deployment-smoke.json'),JSON.stringify({checkedAt:new Date().toISOString(),base,result:'PASS',checks:evidence},null,2));
    console.log('PASS: health, frontend, Swagger and full CRUD; test client removed.');
  } finally {
    if(id!==undefined) await fetch(base+'/clientes/'+id,{method:'DELETE'});
  }
})().catch(e=>{console.error(e.message);process.exitCode=1});
