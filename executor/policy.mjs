import path from 'node:path';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';

export const TOOLS = ['files.list','files.read','files.write','json.validate','javascript.check','browser.open','browser.read','browser.screenshot'];
export function validateAction(action) {
  if (!action || !TOOLS.includes(action.tool)) throw new Error('Strumento non consentito');
  if (JSON.stringify(action).length > 270000) throw new Error('Richiesta troppo grande');
  return action;
}
export async function safePath(root, relative, allowRoot=false) {
  if (typeof relative !== 'string' || relative.includes('\0') || /[:\\]/.test(relative)) throw new Error('Percorso non valido');
  const parts=relative.split('/');
  if (parts.some(p=>p==='..'||p.startsWith('.')||/^(?:node_modules|credentials|secrets|id_rsa|id_ed25519)$/i.test(p))) throw new Error('Percorso protetto');
  const base=await fs.realpath(root), target=path.resolve(base,relative);
  const rel=path.relative(base,target);
  if ((!allowRoot&&!rel)||rel.startsWith('..')||path.isAbsolute(rel)) throw new Error('Percorso fuori dalla cartella consentita');
  let current=base;
  for (const part of parts.filter(Boolean)) {
    current=path.join(current,part);
    try { if ((await fs.lstat(current)).isSymbolicLink()) throw new Error('Link simbolici e junction non consentiti'); }
    catch(e) { if(e.code!=='ENOENT')throw e; }
  }
  return target;
}
export function allowedURL(value,origins) {
  const u=new URL(value);
  if(u.protocol!=='https:'||u.username||u.password||!origins.includes(u.origin))throw new Error('Sito fuori dal perimetro');
  return u.href;
}
export function redact(text) {
  return String(text).replace(/((?:["']?(?:api[_-]?key|password|secret|token|service_role_key)["']?)\s*[:=]\s*)(?:"(?:\\.|[^"\\\r\n])*"|'(?:\\.|[^'\\\r\n])*')/gi,'$1"[OMESSO]"')
    .replace(/\b(?:sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9_]{20,}|eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\b/g,'[CREDENZIALE OMESSA]');
}
export function digest(content){return createHash('sha256').update(content).digest('hex');}
