/* Browser lab: opaque iframe, offline CSP, disposable test Worker. No host execution. */
(function(){
 'use strict';
 function testWorker(){
  const report=self.postMessage.bind(self);self.postMessage=()=>{throw new Error('Canale riservato al runner');};
  self.onmessage=async event=>{
   const {files,entry}=event.data,tests=[],cache={},logs=[];
   const stringify=x=>JSON.stringify(x);
   const fail=m=>{throw new Error(m||'Asserzione fallita');};
   function deep(a,b,seen=new WeakMap()){
    if(Object.is(a,b))return true;
    if(!a||!b||typeof a!=='object'||typeof b!=='object'||Object.getPrototypeOf(a)!==Object.getPrototypeOf(b))return false;
    if(a instanceof Date)return a.getTime()===b.getTime();
    if(a instanceof RegExp)return a.source===b.source&&a.flags===b.flags;
    if(seen.has(a))return seen.get(a)===b;seen.set(a,b);
    const ak=Reflect.ownKeys(a),bk=Reflect.ownKeys(b);
    return ak.length===bk.length&&ak.every(k=>Object.hasOwn(b,k)&&deep(a[k],b[k],seen));
   }
   const assert=Object.assign((x,m)=>{if(!x)fail(m);},{
    ok:(x,m)=>{if(!x)fail(m);},
    equal:(a,b,m)=>{if(!Object.is(a,b))fail(m||`${stringify(a)} diverso da ${stringify(b)}`);},
    deepEqual:(a,b,m)=>{if(!deep(a,b))fail(m||'Oggetti diversi');},
    throws:(fn,expected)=>{let caught;try{fn();}catch(e){caught=e;}if(!caught)fail('Eccezione attesa non sollevata');if(typeof expected==='function'&&!(caught instanceof expected))fail('Tipo eccezione diverso da quello atteso');if(expected instanceof RegExp&&!expected.test(String(caught.message)))fail('Eccezione diversa da quella attesa');}
   });
   assert.strictEqual=assert.equal;assert.deepStrictEqual=assert.deepEqual;
   assert.rejects=async(fn,expected)=>{let caught;try{await (typeof fn==='function'?fn():fn);}catch(e){caught=e;}if(!caught)fail('Promise doveva fallire');if(expected instanceof RegExp&&!expected.test(String(caught.message)))fail('Errore diverso da quello atteso');};
   const test=(name,fn)=>{if(typeof fn!=='function')throw new Error('Il test richiede una funzione');tests.push({name:String(name).slice(0,180),fn});};test.test=test;test.it=test;
   globalThis.test=test;globalThis.assert=Object.freeze(assert);
   console.log=(...values)=>{if(logs.join('').length<4000)logs.push(values.map(String).join(' ').slice(0,400));};
   function load(name,from=''){
    if(['node:assert/strict','assert/strict','node:assert','assert'].includes(name))return assert;
    if(['node:test','test'].includes(name))return test;
    if(!name.startsWith('.')&&from)throw new Error('Modulo non disponibile nel browser: '+name);
    const parts=(from?from.split('/').slice(0,-1):[]).concat(name.split('/')),normalized=[];
    for(const p of parts){if(!p||p==='.')continue;if(p==='..'){if(!normalized.length)throw new Error('Import fuori dai file forniti');normalized.pop();}else normalized.push(p);}
    const base=normalized.join('/');const key=[base,base+'.js',base+'.cjs'].find(k=>Object.hasOwn(files,k));
    if(!key)throw new Error('File/modulo mancante: '+base);
    if(cache[key])return cache[key].exports;
    const module={exports:{}};cache[key]=module;
    new Function('require','module','exports',files[key]+'\n//# sourceURL=lab/'+key)(n=>load(n,key),module,module.exports);
    return module.exports;
   }
   const results=[];
   try{
    load(entry);
    if(!tests.length)throw new Error('Nessun test registrato: usa test(nome, funzione).');
    if(tests.length>100)throw new Error('Massimo 100 test per esecuzione');
    for(const t of tests){try{await t.fn();results.push({name:t.name,passed:true});}catch(e){results.push({name:t.name,passed:false,error:String(e.message||e).slice(0,500)});}}
    report({passed:results.every(t=>t.passed),total:results.length,failed:results.filter(t=>!t.passed).length,tests:results,logs});
   }catch(e){report({passed:false,total:results.length,tests:results,error:String(e.message||e).slice(0,1000),logs});}
  };
 }
 function bridge(){
  'use strict';
  function read(){
   const nodes=[...document.querySelectorAll('input,textarea,select,button,a')].slice(0,60);
   return {text:document.body.innerText.slice(0,16000),controls:nodes.map((el,i)=>{el.setAttribute('data-lab-control',String(i));return {selector:'[data-lab-control="'+i+'"]',tag:el.tagName.toLowerCase(),type:el.type||'',text:(el.innerText||el.getAttribute('aria-label')||el.placeholder||'').slice(0,180),value:['password','file'].includes(el.type)?'[omesso]':String(el.value||'').slice(0,200)};})};
  }
  window.addEventListener('message',async event=>{
   if(event.source!==parent||event.data?.channel!=='stefano-lab-command')return;
   const {id,command,args}=event.data;
   const reply=result=>parent.postMessage({channel:'stefano-lab-result',id,result},'*');
   try{
    if(command==='read'){reply(read());return;}
    if(command==='click'||command==='fill'){
     if(typeof args.selector!=='string'||args.selector.length>200)throw new Error('Selettore non valido');
     const matches=document.querySelectorAll(args.selector);if(matches.length!==1)throw new Error('Il selettore deve individuare un solo elemento');
     const el=matches[0];if(['password','file'].includes(el.type))throw new Error('Campo protetto');
     if(command==='click')el.click();
     else{if(!['INPUT','TEXTAREA','SELECT'].includes(el.tagName))throw new Error('Elemento non compilabile');el.value=String(args.value||'').slice(0,4000);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}
     await new Promise(resolve=>setTimeout(resolve,40));reply({performed:command,...read()});return;
    }
    if(command==='test'){
     const worker=new Worker(URL.createObjectURL(new Blob([args.worker],{type:'text/javascript'})));
     let finished=false;
     const finish=result=>{if(finished)return;finished=true;clearTimeout(timer);worker.terminate();reply(result);};
     const timer=setTimeout(()=>finish({passed:false,total:0,timed_out:true,error:'Tempo massimo di 3 secondi superato: Worker terminato.'}),3000);
     worker.onmessage=e=>finish(e.data);worker.onerror=e=>finish({passed:false,total:0,error:String(e.message).slice(0,800)});
     worker.postMessage({files:args.files,entry:args.entry});return;
    }
    throw new Error('Comando laboratorio sconosciuto');
   }catch(e){reply({error:String(e.message||e).slice(0,1000)});}
  });
 }
 const CSP="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob:; worker-src blob:; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'";
 const frameHTML=html=>'<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="'+CSP+'"></head><body><script>('+bridge.toString()+')();<\/script>'+html+'</body></html>';
 class StefanoLab{
  constructor(container){this.container=container;this.frame=null;this.pending=new Map();this.sequence=0;
   this.listener=e=>{if(e.data?.channel!=='stefano-lab-result')return;const p=this.pending.get(e.data.id);if(!p||e.source!==p.frame.contentWindow)return;clearTimeout(p.timer);this.pending.delete(e.data.id);p.resolve(e.data.result);};
   window.addEventListener('message',this.listener);
  }
  async createFrame(html,visible){
   const frame=document.createElement('iframe');frame.setAttribute('sandbox','allow-scripts');frame.referrerPolicy='no-referrer';frame.title=visible?'Anteprima interattiva isolata':'Test JavaScript isolati';frame.style.cssText=visible?'width:100%;height:420px;background:white;border:1px solid #46506a;border-radius:10px':'display:none';
   const loaded=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Anteprima non pronta')),5000);frame.onload=()=>{clearTimeout(timer);resolve();};});
   frame.srcdoc=frameHTML(html);(visible?this.container:document.body).appendChild(frame);await loaded;return frame;
  }
  request(frame,command,args={}){return new Promise((resolve,reject)=>{const id=String(++this.sequence);const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error('Laboratorio: risposta non ricevuta'));},6000);this.pending.set(id,{frame,resolve,reject,timer});frame.contentWindow.postMessage({channel:'stefano-lab-command',id,command,args},'*');});}
  async open(html){this.frame?.remove();this.container.classList.remove('hidden');this.frame=await this.createFrame(html,true);return {runtime:'offline_html_preview',...await this.request(this.frame,'read')};}
  async action(command,args={}){if(!this.frame)throw new Error('Apri prima un file HTML con preview.open');return {runtime:'offline_html_preview',...await this.request(this.frame,command,args)};}
  async test(files,entry){const frame=await this.createFrame('',false);try{return {runtime:'browser_worker_commonjs_subset',network:'blocked_by_csp',...await this.request(frame,'test',{files,entry,worker:'('+testWorker.toString()+')();'})};}finally{frame.remove();}}
  close(){this.frame?.remove();this.frame=null;this.container.classList.add('hidden');}
 }
 window.StefanoLab=StefanoLab;
})();
