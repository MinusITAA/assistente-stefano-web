const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const fn=html.slice(html.indexOf('async function learnWebTopic('),html.indexOf('async function showRouterStatus('));
async function run({query='Node.js test',refresh=false,fail=false,timeout=false}={}){
 const fields={webTopic:{value:query,focus(){this.focused=true}},btnWebLearn:{disabled:false,textContent:'Ricerca'},btnWebRefresh:{disabled:false},project:{value:'2'}};
 let called=0,request,finish,abort,cleared=false;const messages=[];
 const c={$:id=>fields[id],activeProjectId:null,AbortController,setTimeout:fn=>(abort=fn,1),clearTimeout:()=>cleared=true,setStatus:t=>messages.push(t),add:(r,t)=>messages.push(t),addDownload:()=>{},api:async(action,data,options)=>{called++;request={action,data};return new Promise((resolve,reject)=>{finish=()=>fail?reject(Error('rete non disponibile')):resolve({record:{query:data.query,retrieved_at:'oggi',expires_at:'domani',sources:[]},saved:true,cached:false});options.signal.addEventListener('abort',()=>reject(Error('aborted')));});}};
 vm.createContext(c);vm.runInContext(fn,c);assert(!fn.includes('prompt('));
 const p=c.learnWebTopic(null,refresh);
 if(!query){await p;assert(fields.webTopic.focused);assert.equal(called,0);return;}
 assert(fields.btnWebLearn.disabled&&fields.btnWebRefresh.disabled);
 await c.learnWebTopic('altra ricerca');assert.equal(called,1);
 if(timeout)abort();else finish();await p;
 assert.equal(fields.btnWebLearn.disabled,false);assert.equal(fields.btnWebRefresh.disabled,false);assert(cleared);
 assert.equal(request.action,'web_learn');assert.equal(request.data.refresh,refresh);assert.equal(request.data.project_id,'2');
 if(timeout)assert(messages.some(t=>t.includes('40 secondi')));
 if(fail)assert(messages.some(t=>t.includes('rete non disponibile')));
}
(async()=>{await run({query:''});await run();await run({refresh:true});await run({fail:true});await run({timeout:true});console.log('PASS web UI: inline input, refresh, duplicate guard, error and timeout recovery');})().catch(e=>{console.error(e);process.exitCode=1});
