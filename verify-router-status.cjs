const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const source=html.slice(html.indexOf('async function showRouterStatus(){'),html.indexOf('async function showGraphicsStudio(){'));
async function check(response,timeout=false){
 const button={disabled:false,textContent:'Stato AI Router'},messages=[];
 let release,abort,cleared=false,calls=0;
 const ctx={$:()=>button,AbortController,setTimeout:fn=>(abort=fn,1),clearTimeout:()=>cleared=true,add:(role,text)=>messages.push(text),api:async(action,data,options)=>{calls++;assert.equal(action,'router_status');return new Promise((resolve,reject)=>{release=()=>resolve(response);options.signal.addEventListener('abort',()=>reject(Error('aborted')));});}};
 vm.createContext(ctx);vm.runInContext(source,ctx);
 const running=ctx.showRouterStatus();
 assert.equal(button.disabled,true);assert.match(button.textContent,/corso/);
 await ctx.showRouterStatus();assert.equal(calls,1);
 if(timeout)abort();else release();
 await running;assert.equal(button.disabled,false);assert.equal(button.textContent,'Stato AI Router');assert(cleared);
 return messages.join('\n');
}
(async()=>{
 const offline=await check({freellmapi:{configured:true,reachable:false,authenticated:false,detail:'raw internal error'}});
 assert.match(offline,/Autenticazione: non verificata/);assert.match(offline,/tunnel Cloudflare/);assert(!offline.includes('raw internal'));
 assert.match(await check({freellmapi:{configured:true,reachable:true,authenticated:false}}),/Autenticazione: ERRORE/);
 assert.match(await check({freellmapi:{configured:true,reachable:true,authenticated:true}}),/Autenticazione: OK/);
 assert.match(await check({},true),/25 secondi/);
 console.log('PASS router: pending, duplicate suppression, network/auth distinction, timeout and recovery');
})().catch(e=>{console.error(e);process.exitCode=1});
