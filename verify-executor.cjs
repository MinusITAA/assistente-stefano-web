const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('node:assert/strict');const {stripTypeScriptTypes}=require('node:module');
const root=__dirname,source=fs.readFileSync(path.join(root,'supabase/functions/assistente-stefano/index.ts'),'utf8');const c={createClient:()=>({}),Deno:{env:{get:()=>''},serve:()=>{}},console,URL,Response,AbortSignal};vm.createContext(c);vm.runInContext(stripTypeScriptTypes(source,{mode:'strip'}).replace(/^import .*;$/m,''),c);
assert.equal(c.parseExecutorStep('{"status":"tool","action":{"tool":"files.list","path":""}}').action.tool,'files.list');
assert.equal(c.parseExecutorStep('```json\n{"status":"done","message":"verificato"}\n```').status,'done');
assert.throws(()=>c.parseExecutorStep('{"status":"tool","action":{"tool":"shell"}}'));
assert.throws(()=>c.parseExecutorStep('{"status":"completed"}'));
assert.throws(()=>c.parseExecutorStep('{bad}'));
let seen;c.callModel=async m=>{seen=m;return '{"status":"tool","message":"leggo","action":{"tool":"files.list","path":""}}';};
(async()=>{
await assert.rejects(c.executorNextStep({message:'fai',tools:[]}));
const r=await c.executorNextStep({message:'Crea un JSON',tools:['files.list','shell'],observations:[{error:'demo'}]});assert.equal(r.status,'tool');
const payload=JSON.parse(seen[1].content);assert.deepEqual(payload.available_tools,['files.list']);assert(seen[0].content.includes('NON esegue codice'));
const h=fs.readFileSync(path.join(root,'index.html'),'utf8');assert(h.includes('http://127.0.0.1:8787'));assert(!h.includes("localStorage.setItem('executor"));assert(h.includes('i<12'));assert(h.includes('executorStop'));assert(h.includes("if($('useExecutor').checked)"));
console.log('PASS executor planner: strict tool envelope, capability filtering, malformed output rejection, bounded frontend loop and memory-only session');
})().catch(e=>{console.error(e);process.exitCode=1});
