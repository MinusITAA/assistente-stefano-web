const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');const path=require('path');
const source=fs.readFileSync(path.join(__dirname,'executor-lab.js'),'utf8');new vm.Script(source);
const worker=source.slice(source.indexOf('function testWorker(){'),source.indexOf('function bridge(){'));
async function run(files,entry){let result;const c={self:{postMessage:r=>{result=r;}},console:{log(){}}};vm.createContext(c);vm.runInContext(worker+';testWorker();',c);await c.self.onmessage({data:{files,entry}});return result;}
(async()=>{
const tests="const test=require('node:test');const assert=require('node:assert/strict');const {add}=require('./math.cjs');test('sum',()=>assert.equal(add(2,3),5));test('neg',()=>assert.equal(add(-2,1),-1));";
let r=await run({'math.cjs':'exports.add=(a,b)=>a+b;','math.test.cjs':tests},'math.test.cjs');assert(r.passed);assert.equal(r.total,2);
r=await run({'math.cjs':'exports.add=(a,b)=>a-b;','math.test.cjs':tests},'math.test.cjs');assert.equal(r.passed,false);assert.equal(r.failed,2);
r=await run({'no.test.cjs':'const a=1;'},'no.test.cjs');assert.equal(r.passed,false);assert(r.error.includes('Nessun test'));
r=await run({'bad.test.cjs':"require('node:fs');"},'bad.test.cjs');assert.equal(r.passed,false);
r=await run({'deep.test.cjs':"test('keys',()=>assert.deepEqual({a:1,b:2},{b:2,a:1}));test('undefined',()=>assert.throws(()=>assert.deepEqual({a:undefined},{})));test('type',()=>assert.throws(()=>{throw new TypeError('bad')},TypeError));"},'deep.test.cjs');assert(r.passed);
assert(source.includes("sandbox','allow-scripts'"));assert(!source.includes('allow-same-origin'));assert(source.includes("connect-src 'none'"));assert(source.includes('worker.terminate()'));
console.log('PASS lab: passing/failing real JS functions, test discovery, CommonJS imports, assertions, forbidden Node modules; browser containment requires live verification.');
})().catch(e=>{console.error(e);process.exitCode=1});
