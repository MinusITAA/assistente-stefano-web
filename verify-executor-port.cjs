const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const s=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const fn=s.slice(s.indexOf('async function localExecutor('),s.indexOf('async function previewExecutor('));
let sent;
const c={executorSession:{token:'demo-token',port:'8787'},$:()=>({value:'8788'}),AbortSignal,fetch:async(url,init)=>{sent={url,init};return {ok:true,json:async()=>({ok:true})};}};
vm.createContext(c);vm.runInContext(fn,c);
(async()=>{
 await c.localExecutor('/pair');assert.equal(sent.url,'http://127.0.0.1:8788/pair');assert.equal(sent.init.headers.Authorization,undefined);
 await c.localExecutor('/execute');assert.equal(sent.url,'http://127.0.0.1:8787/execute');
 c.executorSession=null;await c.localExecutor('/pair');assert.equal(sent.url,'http://127.0.0.1:8788/pair');
 assert(s.includes('<option value="8788">8788'));
 console.log('PASS new port, legacy pinned session and no token sent during pairing');
})().catch(e=>{console.error(e);process.exitCode=1});
