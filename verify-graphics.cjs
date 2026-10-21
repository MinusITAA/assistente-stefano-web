const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const {stripTypeScriptTypes} = require('node:module');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const script = html.slice(html.indexOf('const endpoint='), html.lastIndexOf('</script>'));
new vm.Script(script);
const backend = fs.readFileSync(path.join(__dirname, 'supabase/functions/assistente-stefano/index.ts'), 'utf8');
new vm.Script(stripTypeScriptTypes(backend, {mode:'strip'}).replace(/^import .*;$/m, ''));
const ctx = {};
vm.runInNewContext(html.slice(html.indexOf('const GRAPHICS_STUDIO_PROFILE='), html.indexOf('function isGraphicsStudioSpecFile')), ctx);
for (const [input, expected] of [
  ['Scanner 9.850 € + IVA', '9.850 €'],
  ['Prezzo € 8.500,50', '8.500,50 €'],
  ['FFP2 45 pezzi 10 € IVA 5%', '10 €'],
  ['Resina 25,80 €', '25,80 €'],
  ['nessun prezzo', '']
]) assert.equal(ctx.gsExtractPriceFromRequest(input), expected);
const plain = ctx.graphicsStudioRenderHTML({title:'Scanner <script>',source_request:'Scanner 9.850 € + IVA',price_note:'IVA esclusa'});
assert(plain.includes('9.850 €'));
assert(plain.includes('Scanner &lt;script&gt;'));
assert(!plain.includes('gs-scanner'));
const photo = ctx.graphicsStudioRenderHTML({title:'Resina',product_images:[{dataUrl:'data:image/png;base64,AAAA'}]});
assert(photo.includes('src="data:image/png;base64,AAAA"'));
const unsafe = ctx.graphicsStudioRenderHTML({title:'Resina',product_images:[{dataUrl:'javascript:alert(1)'}]});
assert(!unsafe.includes('javascript:'));
assert.equal(ctx.gsSafeFeatureText('Mascherine FFP2 con filtrazione 99% certificata CE','Mascherine FFP2, 45 pezzi, 10 euro'), '');
assert.equal(ctx.gsSafeFeatureText('Comfort prolungato','Mascherine FFP2, 45 pezzi'), '');
assert.equal(ctx.gsSafeFeatureText('Confezione da 45 pezzi','Mascherine FFP2, 45 pezzi'), 'Confezione da 45 pezzi');
assert.equal(ctx.gsSafeFeatureText('Filtrazione 99%','FFP2. Filtrazione 99% certificata dal produttore'), 'Filtrazione 99%');
for (const id of ['btnSend','btnLibrary','btnTasks','btnMemories','btnAgents','btnHealth','project','file']) assert(html.includes('id="'+id+'"'));
assert(html.includes('scale:300/96'));
assert(html.includes("out.push('png','pdf')"));
console.log('PASS: frontend/backend syntax; 24 graphics assertions. Live browser tests are required separately.');
