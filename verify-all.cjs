const {spawnSync}=require('node:child_process');
const suites=[
 'verify-autonomy.cjs','verify-completion.cjs','verify-executor.cjs',
 'verify-executor-port.cjs','verify-graphics.cjs','verify-lab.cjs',
 'verify-router-status.cjs','verify-security.cjs','verify-web-learning.cjs',
 'verify-web-learning-ui.cjs','verify-web-search.cjs'
];
for(const suite of [...suites,['--test','executor/executor.test.mjs']]){
 const args=Array.isArray(suite)?suite:[suite];
 process.stdout.write('\nRunning '+args.join(' ')+'\n');
 const result=spawnSync(process.execPath,args,{cwd:__dirname,stdio:'inherit',windowsHide:true,shell:false});
 if(result.error){console.error(result.error.message);process.exit(1);}
 if(result.status!==0)process.exit(result.status||1);
}
console.log('\nAll available regression suites passed. Browser and installed-PC checks remain separate.');
