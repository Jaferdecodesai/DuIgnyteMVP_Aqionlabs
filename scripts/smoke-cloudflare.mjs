import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base = new URL(process.argv[2] || 'http://127.0.0.1:4650').origin;
const scenario = {delay:7,demand:20,freight:25,cash_floor:24000};
const results = [];
async function check(name, fn) { await fn(); results.push(name); console.log('PASS '+name); }
function client() {
 let cookie='',csrf='';
 return {async call(action, input, extra={}) {
  const response=await fetch(base+'/api/'+action,{method:input===undefined?'GET':'POST',headers:{...(cookie?{cookie}:{}),...(input===undefined?{}:{origin:base,'content-type':'application/json','x-relay-csrf':csrf}),...extra},...(input===undefined?{}:{body:JSON.stringify(input)})});
  const set=response.headers.get('set-cookie'); if(set) cookie=set.split(';')[0];
  const data=await response.json(); if(data.csrf) csrf=data.csrf;
  return {response,data};
 },credentials:()=>({cookie,csrf})};
}
const a=client(),b=client(); let state,proposal,draft;
await check('native SQLite readiness and security headers',async()=>{
 const {response,data}=await a.call('health');assert.equal(response.status,200);assert.equal(data.storage,'durable-sqlite');assert.equal(response.headers.get('cache-control'),'no-store');assert.match(response.headers.get('content-security-policy'),/frame-ancestors 'none'/);
});
await check('HTML shell and API routing',async()=>{
 const root=await fetch(base);assert.equal(root.status,200);assert.match(await root.text(),/Relay/);
 const bad=await fetch(base+'/api/nested/state');assert.equal(bad.status,404);assert.match(bad.headers.get('content-type'),/json/);
 assert.equal((await fetch(base+'/api/state',{method:'DELETE'})).status,405);
});
await check('signed session cookie and isolated workspace',async()=>{
 const first=await a.call('state');assert.equal(first.response.status,200);state=first.data;
 const set=first.response.headers.get('set-cookie');assert.match(set,/HttpOnly/);assert.match(set,/SameSite=Strict/);if(base.startsWith('https:'))assert.match(set,/Secure/);
 assert.equal((await b.call('state')).data.drafts.length,0);
});
await check('origin and CSRF rejection',async()=>{
 assert.equal((await a.call('simulate',{tenant:'packaging',scenario},{origin:'https://untrusted.invalid'})).response.status,403);
 assert.equal((await a.call('simulate',{tenant:'packaging',scenario},{'x-relay-csrf':'invalid'})).response.status,403);
});
await check('reference 130-combination cash-feasible scenario',async()=>{
 const modeled=await a.call('simulate',{tenant:'packaging',scenario});assert.equal(modeled.response.status,200);proposal=modeled.data;assert.equal(proposal.evaluated,130);assert.equal(proposal.baseline.fulfilled,990);
 const plan=proposal.plans.find(p=>p.id===proposal.recommended_id);assert.equal(plan.fulfilled,1362);assert.equal(plan.spend,7887.5);assert.equal(plan.min_cash,28112.5);
});
await check('foreign proposal and unchecked confirmation rejected',async()=>{
 const body={tenant:'packaging',proposal_id:proposal.id,plan_id:proposal.recommended_id,confirm:true};
 assert.equal((await b.call('approve',body)).response.status,409);assert.equal((await a.call('approve',{...body,confirm:false})).response.status,400);
});
await check('concurrent approvals yield one draft and audit record',async()=>{
 const body={tenant:'packaging',proposal_id:proposal.id,plan_id:proposal.recommended_id,confirm:true};
 const pair=await Promise.all([a.call('approve',body),a.call('approve',body)]);pair.forEach(r=>assert.equal(r.response.status,200));assert.equal(pair.filter(r=>r.data.duplicate).length,1);assert.equal(new Set(pair.map(r=>r.data.draft.id)).size,1);draft=pair[0].data.draft;
 const saved=(await a.call('state')).data;assert.equal(saved.drafts.length,1);assert.equal(saved.audit.filter(e=>e.event==='local_draft_created').length,1);assert.equal((await b.call('state')).data.drafts.length,0);
});
await check('export contains evidence and no authentication material',async()=>{
 const {response,data}=await a.call('export');assert.equal(response.status,200);assert.equal(data.synthetic,true);assert.equal(data.drafts.length,1);assert.ok(!('csrf'in data));assert.ok(!JSON.stringify(data).includes(a.credentials().cookie));
});
await check('cancellation and invalid import retain source',async()=>{
 assert.equal((await a.call('cancel',{tenant:'packaging',draft_id:draft.id})).response.status,200);
 const before=(await a.call('state')).data;
 assert.equal((await a.call('import',{tenant:'packaging',snapshot:{...before.snapshot,synthetic:false}})).response.status,400);
 assert.equal((await a.call('state')).data.version,before.version);
});
await check('import invalidates earlier proposal and stale source blocks action',async()=>{
 const p=(await a.call('simulate',{tenant:'packaging',scenario})).data;
 const snap=(await a.call('state')).data.snapshot;
 assert.equal((await a.call('import',{tenant:'packaging',snapshot:snap})).response.status,200);
 assert.equal((await a.call('approve',{tenant:'packaging',proposal_id:p.id,plan_id:p.recommended_id,confirm:true})).response.status,409);
 assert.equal((await a.call('import',{tenant:'packaging',snapshot:{...snap,age_hours:25}})).response.status,200);
 const stale=(await a.call('simulate',{tenant:'packaging',scenario})).data;assert.ok(stale.blocked.length>0);assert.equal(stale.recommended_id,null);
});
await check('reset confirmation and retained persistence probe',async()=>{
 assert.equal((await a.call('reset',{tenant:'packaging',confirm:false})).response.status,400);
 assert.equal((await a.call('reset',{tenant:'packaging',confirm:true})).response.status,200);
 const p=(await a.call('simulate',{tenant:'packaging',scenario})).data;
 const approved=await a.call('approve',{tenant:'packaging',proposal_id:p.id,plan_id:p.recommended_id,confirm:true});assert.equal(approved.response.status,200);
 await fs.mkdir('.data',{recursive:true});await fs.writeFile('.data/cloudflare-persistence-probe.json',JSON.stringify({base,...a.credentials(),draft_id:approved.data.draft.id}),{mode:0o600});
});
await fs.mkdir('evidence',{recursive:true});
await fs.writeFile('evidence/CLOUDFLARE_SMOKE.json',JSON.stringify({base,checked_at:new Date().toISOString(),passed:results.length,checks:results},null,2)+'\n');
