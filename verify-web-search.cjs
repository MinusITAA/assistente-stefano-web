const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {stripTypeScriptTypes}=require('node:module');const path=require('node:path');
const backend=fs.readFileSync(path.join(__dirname,'supabase/functions/assistente-stefano/index.ts'),'utf8');
const start=backend.indexOf('// Public product photographs only.');
const end=backend.indexOf('async function createGraphicsStudioSpec',start);
const ctx={URL,Uint8Array,AbortSignal,btoa,supabase:{},JINA_API_KEY:'fixture',fetch:async()=>{throw new Error('Unexpected network call')}};
vm.createContext(ctx);vm.runInContext(stripTypeScriptTypes(backend.slice(start,end),{mode:'strip'}),ctx);
for(const url of ['http://site.com/photo.png','https://localhost/a','https://127.0.0.1/a','https://169.254.169.254/a','https://[::1]/a','https://site.local/a','https://user:password@site.com/a','https://site.com:8443/a','https://0x7f000001/a'])assert.equal(ctx.graphicsPublicURL(url),null,url);
assert.equal(ctx.graphicsPublicURL('https://www.shofu.com/product.png').hostname,'www.shofu.com');
const rows=[{url:'https://www.medit.com/i700',title:'Medit i700 scanner',images:{'Medit i700 scanner':'https://www.medit.com/images/medit-i700.jpg','Medit logo':'https://www.medit.com/logo.png','Medit i700 protective cover':'https://www.medit.com/i700-cover.jpg','Other scanner':'http://localhost/image.png'}}];
const candidates=ctx.graphicsImageCandidates(rows,'Medit i700');assert.equal(candidates.length,1);assert.equal(candidates[0].exact,true);assert.equal(candidates[0].source_url,rows[0].url);
const weak=ctx.graphicsImageCandidates([{url:'https://www.medit.com/i700',title:'Medit i700 scanner',images:{'Picture':'https://www.medit.com/product.jpg'}}],'Medit i700');assert.equal(weak[0].exact,false);
const variants=ctx.graphicsImageCandidates([
 {url:'https://www.shofu.com/en/product/beautifil-flow-plus-x/',title:'Beautifil Flow Plus X',images:{'Beautifil Flow Plus X':'https://www.shofu.com/beautifil-flow-plus-x.png','Beautifil Flow Plus Shade Chart':'https://www.shofu.com/shade-chart.png'}},
 {url:'https://www.shofu.com/en/product/beautifil-flow-plus/',title:'Beautifil Flow Plus',images:{'Beautifil Flow Plus':'https://www.shofu.com/beautifil-flow-plus.png'}}
],'Beautifil Flow Plus X Shofu');assert.equal(variants.length,1);assert.equal(variants[0].exact,true);
async function main(){
 ctx.fetch=async()=>new Response('not an image',{headers:{'content-type':'text/html'}});
 await assert.rejects(ctx.graphicsRasterDataURL('https://www.medit.com/photo.jpg'),/Formato/);
 ctx.fetch=async()=>new Response(null,{status:302,headers:{location:'http://127.0.0.1/private'}});
 await assert.rejects(ctx.graphicsRasterDataURL('https://www.medit.com/photo.jpg'),/Redirect/);
 ctx.fetch=async()=>new Response(new Uint8Array(3500).fill(120),{headers:{'content-type':'image/png'}});
 assert((await ctx.graphicsRasterDataURL('https://www.medit.com/photo.png')).startsWith('data:image/png;base64,'));
 console.log('PASS: image search identity, public URL restrictions, non-image rejection, redirect restrictions and embedded raster download');
}
main().catch(e=>{console.error(e);process.exitCode=1});
