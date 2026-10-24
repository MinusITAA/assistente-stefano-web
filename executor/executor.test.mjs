import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createEngine} from './engine.mjs';
import {createHandler} from './server.mjs';
import {allowedURL,redact} from './policy.mjs';

async function fixture(t){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'stefano-executor-test-'));
 t.after(()=>fs.rm(root,{recursive:true,force:true}));
 return {workspace:root,origin:'https://minusitaa.github.io',browserOrigins:['https://minusitaa.github.io']};
}
test('files are written, read back, versioned and validated',async t=>{
 const config=await fixture(t),engine=await createEngine(config);
 let r=await engine.execute({tool:'files.write',path:'demo/a.json',content:'{"n":1}'});assert(r.verified);
 r=await engine.execute({tool:'json.validate',path:'demo/a.json'});assert(r.passed);
 r=await engine.execute({tool:'files.write',path:'demo/a.json',content:'{"n":2}'});
 assert.equal(await fs.readFile(path.join(config.workspace,'.history',r.backup),'utf8'),'{"n":1}');
 assert.equal((await engine.execute({tool:'files.read',path:'demo/a.json'})).content,'{"n":2}');
 await engine.execute({tool:'files.write',path:'bad.json',content:'{bad}'});
 assert.equal((await engine.execute({tool:'json.validate',path:'bad.json'})).passed,false);
});
test('traversals, absolute paths, hidden files and unknown tools are denied',async t=>{
 const engine=await createEngine(await fixture(t));
 for(const p of ['../escape.txt','C:/escape.txt','/escape.txt','.env','x/../../a','x\\a','.history/a'])
  await assert.rejects(engine.execute({tool:'files.write',path:p,content:'no'}));
 await assert.rejects(engine.execute({tool:'shell',command:'anything'}));
});
test('symlinks cannot escape the workspace',async t=>{
 const config=await fixture(t),outside=await fixture(t),engine=await createEngine(config);
 try{await fs.symlink(outside.workspace,path.join(config.workspace,'outside'),'junction');}catch(e){if(e.code==='EPERM'){t.skip('Windows sandbox denies junction creation; actual junction escape test unavailable');return;}throw e;}
 await assert.rejects(engine.execute({tool:'files.write',path:'outside/escape.txt',content:'no'}),/Link simbolici/);
 await assert.rejects(fs.access(path.join(outside.workspace,'escape.txt')));
});
test('syntax checks do not execute source code',async t=>{
 const config=await fixture(t),engine=await createEngine(config);
 await engine.execute({tool:'files.write',path:'code.cjs',content:'require("node:fs").writeFileSync("executed.txt","no");'});
 assert((await engine.execute({tool:'javascript.check',path:'code.cjs'})).passed);
 await assert.rejects(fs.access(path.join(config.workspace,'executed.txt')));
 await engine.execute({tool:'files.write',path:'bad.js',content:'const x = ;'});
 assert.equal((await engine.execute({tool:'javascript.check',path:'bad.js'})).passed,false);
});
test('browser sites and credential redaction are constrained',()=>{
 assert.equal(allowedURL('https://minusitaa.github.io/assistente-stefano-web/',['https://minusitaa.github.io']),'https://minusitaa.github.io/assistente-stefano-web/');
 for(const u of ['http://127.0.0.1/','https://evil.example/','https://u:p@minusitaa.github.io/'])assert.throws(()=>allowedURL(u,['https://minusitaa.github.io']));
 assert(!redact('password = "fake-password-123"').includes('fake-password-123'));
});
test('HTTP handler enforces origin, pairing, session and revocation (in memory)',async t=>{
 const config=await fixture(t),events=[];
 const service=await createHandler(config,{pairCode:'12345678',logPair:()=>{},onAudit:e=>events.push(e)});
 t.after(()=>service.close());
 const post=async(route,body,token,origin=config.origin)=>{
   let status,raw='';const req={method:'POST',url:route,headers:{origin,...(token?{authorization:'Bearer '+token}:{})},async *[Symbol.asyncIterator](){yield Buffer.from(JSON.stringify(body));}};
   const res={writeHead(code){status=code;},end(data){raw=data||'';}};
   await service.handler(req,res);return {status,json:async()=>JSON.parse(raw)};
 };
 assert.equal((await post('/execute',{action:{tool:'files.list'}})).status,401);
 assert.equal((await post('/pair',{code:'12345678'},null,'https://evil.example')).status,403);
 assert.equal((await post('/pair',{code:'bad'})).status,403);
 const paired=await(await post('/pair',{code:'12345678'})).json();assert(paired.token);assert.equal(paired.tools.includes('shell'),false);
 assert.equal((await post('/pair',{code:'12345678'})).status,403);
 const response=await(await post('/execute',{action:{tool:'files.write',path:'test.json',content:'{}'}},paired.token)).json();assert(response.ok);assert(response.result.verified);
 assert.equal(events.length,1);assert(!JSON.stringify(events).includes(paired.token));
 assert.equal((await post('/disconnect',{},paired.token)).status,200);
 assert.equal((await post('/execute',{action:{tool:'files.list'}},paired.token)).status,401);
 assert.equal((await post('/pair',{code:'12345678'})).status,403);
});

test('HTTP body preserves fragmented UTF-8 and rejects malformed or oversized input',async t=>{
 const config=await fixture(t);
 const service=await createHandler(config,{pairCode:'12345678',logPair:()=>{}});t.after(()=>service.close());
 const post=async(route,bytes,token,fragment=false)=>{
  let status,raw='';
  const req={method:'POST',url:route,headers:{origin:config.origin,...(token?{authorization:'Bearer '+token}:{})},async *[Symbol.asyncIterator](){if(fragment){for(const byte of bytes)yield Buffer.from([byte]);}else yield bytes;}};
  const res={writeHead(code){status=code;},end(data){raw=data||'';}};
  await service.handler(req,res);return {status,data:JSON.parse(raw)};
 };
 const pair=await post('/pair',Buffer.from('{"code":"12345678"}'));
 const token=pair.data.token;
 const text='Prezzo 25,80 € + IVA; quantità, qualità, città, più. 🦷';
 const write=await post('/execute',Buffer.from(JSON.stringify({action:{tool:'files.write',path:'unicode.txt',content:text}})),token,true);
 assert.equal(write.status,200);assert(write.data.result.verified);
 assert.equal(await fs.readFile(path.join(config.workspace,'unicode.txt'),'utf8'),text);
 const malformed=Buffer.concat([Buffer.from('{"action":{"tool":"files.write","path":"bad.txt","content":"'),Buffer.from([0xc3,0x28]),Buffer.from('"}}')]);
 assert.equal((await post('/execute',malformed,token,true)).status,400);
 await assert.rejects(fs.access(path.join(config.workspace,'bad.txt')));
 const large=await post('/execute',Buffer.alloc(280001,120),token);
 assert.equal(large.status,400);assert.match(large.data.error,/troppo grande/);
});
