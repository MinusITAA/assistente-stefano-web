import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomBytes,randomInt,timingSafeEqual} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {createEngine} from './engine.mjs';
import {TOOLS,redact} from './policy.mjs';

export async function createHandler(config,{browserFactory,pairCode,onAudit=()=>{},port=8788,sessionMs=3600000,pairMs=300000,logPair=console.log}={}){
  if(config.origin!=='https://minusitaa.github.io')throw new Error('Origine frontend non consentita');
  const engine=await createEngine(config,{browserFactory});
  const code=pairCode||String(randomInt(10000000,100000000));
  const pairingUntil=Date.now()+pairMs;let attempts=0,token=null,expires=0,busy=false,pairedOnce=false;
  function equals(a,b){const x=Buffer.from(String(a||'')),y=Buffer.from(String(b||''));return x.length===y.length&&timingSafeEqual(x,y);}
  const handler=async(req,res)=>{
    const origin=req.headers.origin;
    if(origin!==config.origin){res.writeHead(403);res.end('Origine non consentita');return;}
    const cors={'Access-Control-Allow-Origin':origin,'Vary':'Origin','Cache-Control':'no-store','Access-Control-Allow-Headers':'content-type, authorization','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Private-Network':'true','Content-Type':'application/json'};
    const send=(status,data)=>{res.writeHead(status,cors);res.end(JSON.stringify(data));};
    if(req.method==='OPTIONS'){send(204,{});return;}
    if(req.method!=='POST'){send(405,{error:'Metodo non consentito'});return;}
    try{
      const chunks=[];let totalBytes=0;
      for await(const chunk of req){const bytes=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);totalBytes+=bytes.length;if(totalBytes>280000)throw new Error('Richiesta troppo grande');chunks.push(bytes);}
      // Decode once: a network chunk can end halfway through an accented letter or emoji.
      const raw=new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks,totalBytes));
      const body=JSON.parse(raw||'{}');
      if(req.url==='/pair'){
        if(pairedOnce||Date.now()>pairingUntil||++attempts>5||!equals(body.code,code)){send(403,{error:'Abbinamento non valido o scaduto'});return;}
        token=randomBytes(32).toString('hex');pairedOnce=true;expires=Date.now()+sessionMs;
        send(200,{token,expires,version:'0.1.2',tools:TOOLS.filter(t=>browserFactory||!t.startsWith('browser.')),workspace:path.basename(engine.root),browserOrigins:config.browserOrigins});return;
      }
      if(!token||Date.now()>expires||!equals(req.headers.authorization,'Bearer '+token)){send(401,{error:'Sessione non autorizzata o scaduta'});return;}
      if(req.url==='/disconnect'){token=null;expires=0;await engine.close();send(200,{ok:true});return;}
      if(req.url!=='/execute'){send(404,{error:'Endpoint sconosciuto'});return;}
      if(busy){send(409,{error:'Esecutore occupato'});return;}
      busy=true;
      try{
        const result=await engine.execute(body.action);
        await onAudit({at:new Date().toISOString(),tool:body.action?.tool,path:body.action?.path||null,ok:true});
        send(200,{ok:true,result});
      }catch(e){
        await onAudit({at:new Date().toISOString(),tool:body.action?.tool,ok:false});
        send(400,{ok:false,error:redact(e.message)});
      }finally{busy=false;}
    }catch(e){send(400,{error:redact(e.message)});}
  };
  logPair('Codice di abbinamento (5 minuti, un solo utilizzo): '+code);
  return {handler,close:async()=>{await engine.close();}};
}

export async function startServer(config,options={}){
 const service=await createHandler(config,options);
 const server=http.createServer(service.handler);
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(options.port??8788,'127.0.0.1',resolve);});
 return {port:server.address().port,close:async()=>{await service.close();await new Promise(resolve=>server.close(resolve));}};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const config=JSON.parse((await fs.readFile(new URL('./config.json',import.meta.url),'utf8')).replace(/^\uFEFF/,''));
  let browserFactory;
  if(config.enableBrowser){const {chromium}=await import('playwright');browserFactory=()=>chromium.launch({headless:true});}
  const auditPath=path.join(config.workspace,'.executor-audit.jsonl');
  const service=await startServer(config,{browserFactory,onAudit:record=>fs.appendFile(auditPath,JSON.stringify(record)+'\n')});
  console.log('Esecutore locale in ascolto su 127.0.0.1:'+service.port+'; arresto con Ctrl+C.');
  process.on('SIGINT',async()=>{await service.close();process.exit(0);});
}
