(function(root){
 'use strict';
 const scope='Fonti consultate prima dei test; non dimostra causalita, correttezza generale o accesso al PC.';
 function clean(value){
  if(!value||value.status!=='tested_in_isolated_javascript_lab'||!Number.isInteger(value.total)||value.total<1||value.total>100)return null;
  const entries=Object.entries(value.hashes||{});
  if(!entries.length||entries.length>10||entries.some(([p,h])=>!/^[-\w/ .]+\.(?:js|cjs)$/.test(p)||p.split('/').some(x=>!x||x==='..'||x.startsWith('.'))||!(/^[a-f0-9]{64}$/).test(h)))return null;
  const researches=(Array.isArray(value.researches)?value.researches:[]).slice(0,12).flatMap(r=>{
   const sources=(Array.isArray(r?.sources)?r.sources:[]).slice(0,4).flatMap(s=>{
    try{const u=new URL(s.url);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.href.length>2000)return [];
     const date=Date.parse(s.retrieved_at);if(!Number.isFinite(date))return [];
     return [{url:u.href,retrieved_at:new Date(date).toISOString()}];
    }catch{return [];}
   });return sources.length?[{sources}]:[];
  });
  return researches.length?{status:value.status,scope,total:value.total,hashes:Object.fromEntries(entries),researches}:null;
 }
 function build(observations){
  if(!Array.isArray(observations))return null;
  const researches=[],writes=new Map(),pendingWrites=new Set();let evidence=null;
  for(const o of observations||[]){
   const tool=o?.action?.tool,r=o?.result;
   if(tool==='files.write'||tool==='javascript.test')evidence=null;
   if(tool==='files.write')pendingWrites.add(o.action.path);
   if(o?.error||!r)continue;
   if(tool==='web.research'&&r.record?.kind==='web_research'&&Array.isArray(r.record.sources)){
    const sources=r.record.sources.filter(s=>{try{const u=new URL(s.url);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}}).map(s=>({url:s.url,retrieved_at:s.retrieved_at}));
    if(sources.length)researches.push({sources});
   }
   if(tool==='files.write'&&r.verified===true){writes.set(o.action.path,r.sha256);pendingWrites.delete(o.action.path);}
   if(tool==='javascript.test'){
    evidence=null;
    if(pendingWrites.size||!researches.length||r.passed!==true||!(r.total>0)||r.failed>0||!Array.isArray(r.tests)||r.tests.length!==r.total||!r.tests.every(t=>t?.passed===true))continue;
    const hashes=r.hashes||{},paths=Object.keys(hashes);
    if(!paths.length||!paths.every(p=>/^[a-f0-9]{64}$/.test(hashes[p])))continue;
    if([...writes].some(([p,h])=>hashes[p]!==h))continue;
    evidence={status:'tested_in_isolated_javascript_lab',scope:'Fonti consultate prima dei test; non dimostra causalita, correttezza generale o accesso al PC.',researches:[...researches],total:r.total,hashes:{...hashes}};
   }
   if(tool==='files.write')evidence=null;
  }
  return clean(evidence);
 }
 function hasFutureRecord(records,now){
  return Array.isArray(records)&&records.some(r=>Number.isFinite(r?.recorded_at)&&r.recorded_at>now&&r.expires_at===r.recorded_at+7*86400000&&!!clean(r));
 }
 function save(storage,project,evidence,now=Date.now()){
  evidence=clean(evidence);if(!project||!evidence)return false;
  const key='stefano_learning_v1_'+encodeURIComponent(project);
  let records=[];try{records=JSON.parse(storage.getItem(key)||'[]');}catch{}
  if(!Array.isArray(records))records=[];
  if(hasFutureRecord(records,now))return false;
  const record={...evidence,recorded_at:now,expires_at:now+7*86400000};
  const signatureOf=hashes=>JSON.stringify(Object.entries(hashes).sort(([a],[b])=>a<b?-1:a>b?1:0));
  const signature=signatureOf(record.hashes);
  records=records.flatMap(r=>{
   if(!Number.isFinite(r?.recorded_at)||r.recorded_at>now||r.expires_at!==r.recorded_at+7*86400000||r.expires_at<=now)return [];
   const validated=clean(r);
   return validated&&signatureOf(validated.hashes)!==signature?[{...validated,recorded_at:r.recorded_at,expires_at:r.expires_at}]:[];
  });
  storage.setItem(key,JSON.stringify([record,...records].slice(0,20)));return true;
 }
 function list(storage,project,now=Date.now()){
  if(!project)return [];
  try{const records=JSON.parse(storage.getItem('stefano_learning_v1_'+encodeURIComponent(project))||'[]');
   return Array.isArray(records)?records.filter(r=>Number.isFinite(r?.recorded_at)&&r.recorded_at<=now&&r.expires_at===r.recorded_at+7*86400000&&r.expires_at>now).flatMap(r=>{const v=clean(r);return v?[{...v,recorded_at:r.recorded_at,expires_at:r.expires_at}]:[];}).slice(0,20):[];
  }catch{return [];}
 }
 function recall(storage,project,now=Date.now()){return list(storage,project,now).slice(0,2).map(clean);}
 function remove(storage,project,record,now=Date.now()){
  if(!project||!record)return false;
  try{const records=JSON.parse(storage.getItem('stefano_learning_v1_'+encodeURIComponent(project))||'[]');if(hasFutureRecord(records,now))return false;}catch{return false;}
  const signature=r=>JSON.stringify([r.recorded_at,Object.entries(r.hashes).sort(([a],[b])=>a<b?-1:a>b?1:0)]);
  const records=list(storage,project,now),target=clean(record);if(!target)return false;
  const key=signature({...target,recorded_at:record.recorded_at});
  const remaining=records.filter(r=>signature(r)!==key);if(remaining.length===records.length)return false;
  storage.setItem('stefano_learning_v1_'+encodeURIComponent(project),JSON.stringify(remaining));return true;
 }
 const api={build,save,recall,list,remove};if(typeof module!=='undefined')module.exports=api;else root.StefanoLearningEvidence=api;
})(typeof window==='undefined'?this:window);
