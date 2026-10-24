import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {safePath,validateAction,allowedURL,redact,digest} from './policy.mjs';

export async function createEngine(config,{browserFactory}={}) {
  await fs.mkdir(config.workspace,{recursive:true});
  const root=await fs.realpath(config.workspace);
  let browser,context,page;
  async function getPage(){
    if(page)return page;
    if(!browserFactory)throw new Error('Browser non installato o non abilitato');
    browser=await browserFactory();
    context=await browser.newContext({acceptDownloads:false,serviceWorkers:'block'});
    await context.route('**/*',route=>{
      try{allowedURL(route.request().url(),config.browserOrigins);return route.continue();}
      catch{return route.abort();}
    });
    page=await context.newPage();
    context.on('page',p=>{if(p!==page)p.close().catch(()=>{});});
    page.on('dialog',d=>d.dismiss().catch(()=>{}));
    return page;
  }
  async function readFile(relative){
    const p=await safePath(root,relative);const stat=await fs.stat(p);
    if(!stat.isFile()||stat.size>262144)throw new Error('File non testuale o troppo grande');
    const b=await fs.readFile(p);if(b.includes(0))throw new Error('File binario non leggibile come testo');
    return {p,text:b.toString('utf8')};
  }
  async function execute(input){
    const a=validateAction(input),tool=a.tool;
    if(tool==='files.list'){
      const dir=await safePath(root,a.path||'',true);
      const entries=await fs.readdir(dir,{withFileTypes:true});
      return {tool,entries:entries.filter(e=>!e.name.startsWith('.')&&!e.isSymbolicLink()&&!['node_modules','credentials','secrets'].includes(e.name)).slice(0,100).map(e=>({name:e.name,type:e.isDirectory()?'directory':'file'}))};
    }
    if(tool==='files.read'){const f=await readFile(a.path);return {tool,path:a.path,content:redact(f.text),sha256:digest(f.text)};}
    if(tool==='files.write'){
      if(typeof a.content!=='string'||Buffer.byteLength(a.content)>262144)throw new Error('Contenuto non valido o troppo grande');
      const p=await safePath(root,a.path);
      // Nessuna esecuzione automatica dei file scritti. Ogni sovrascrittura conserva una copia.
      let backup=null;
      try{
        const st=await fs.stat(p);if(!st.isFile()||st.size>262144)throw new Error('Destinazione non modificabile');
        const old=await fs.readFile(p);backup=digest(a.path)+'-'+Date.now()+'-'+digest(old).slice(0,12);
        await fs.mkdir(path.join(root,'.history'),{recursive:true});await fs.writeFile(path.join(root,'.history',backup),old,{flag:'wx'});
      }catch(e){if(e.code!=='ENOENT')throw e;}
      await fs.mkdir(path.dirname(p),{recursive:true});await safePath(root,a.path);
      await fs.writeFile(p,a.content,{flag:'w'});
      const saved=await fs.readFile(p,'utf8');
      return {tool,path:a.path,bytes:Buffer.byteLength(saved),sha256:digest(saved),backup,verified:saved===a.content};
    }
    if(tool==='json.validate'){
      const f=await readFile(a.path);
      try{JSON.parse(f.text);return {tool,path:a.path,passed:true,check:'JSON.parse'};}
      catch(e){return {tool,path:a.path,passed:false,error:String(e.message).slice(0,300)};}
    }
    if(tool==='javascript.check'){
      if(!/\.(?:mjs|cjs|js)$/i.test(a.path))throw new Error('Usa un file JavaScript');
      const f=await readFile(a.path);
      // --check analizza la sintassi, senza importare o eseguire il file.
      const env={SystemRoot:process.env.SystemRoot||'',TEMP:process.env.TEMP||'',TMP:process.env.TMP||''};
      return await new Promise((resolve,reject)=>{
        const child=spawn(process.execPath,['--check',f.p],{cwd:root,env,windowsHide:true,shell:false});let output='';
        const timer=setTimeout(()=>child.kill(),5000);
        child.stderr.on('data',b=>{output=(output+b.toString()).slice(0,4000);});
        child.on('error',e=>{clearTimeout(timer);reject(e);});
        child.on('exit',code=>{clearTimeout(timer);resolve({tool,path:a.path,passed:code===0,check:'node --check',code,error:redact(output)});});
      });
    }
    const p=await getPage();
    if(tool==='browser.open'){
      const url=allowedURL(a.url,config.browserOrigins);await p.goto(url,{waitUntil:'domcontentloaded',timeout:20000});
      allowedURL(p.url(),config.browserOrigins);return {tool,url:p.url(),title:await p.title()};
    }
    if(tool==='browser.read'){
      allowedURL(p.url(),config.browserOrigins);
      return {tool,url:p.url(),title:await p.title(),text:redact((await p.locator('body').innerText()).slice(0,18000))};
    }
    if(tool==='browser.screenshot'){
      allowedURL(p.url(),config.browserOrigins);const bytes=await p.screenshot({fullPage:false,timeout:10000});
      return {tool,url:p.url(),image:'data:image/png;base64,'+bytes.toString('base64')};
    }
    throw new Error('Azione non supportata');
  }
  return {execute,root,close:async()=>{await browser?.close();}};
}
