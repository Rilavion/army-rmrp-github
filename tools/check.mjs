import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');let count=0,errors=[];
async function walk(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){if(['node_modules','.git','.local'].includes(e.name))continue;const file=path.join(dir,e.name);if(e.isDirectory()){await walk(file);continue;}if(/\.(mjs|cjs|js)$/.test(e.name)){try{execFileSync(process.execPath,['--check',file],{stdio:'pipe'});count++;}catch(err){errors.push(file+'\n'+err.stderr);}}
if(e.name.endsWith('.html')){const html=await fs.readFile(file,'utf8');for(const [i,m] of [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].entries())try{new vm.Script(m[1],{filename:file+':inline-'+i});count++;}catch(err){errors.push(file+": "+err.message);}for(const m of html.replace(/<script[^>]*>[\s\S]*?<\/script>/g,'').matchAll(/(?:src|href)="([^"#?]+)(?:[?#][^"]*)?"/g)){if(/^(https?:|data:|mailto:|tel:|javascript:|\/\/)/.test(m[1])||m[1].includes('${'))continue;const target=path.resolve(path.dirname(file),m[1]);try{await fs.access(target);}catch{errors.push(path.relative(root,file)+' missing '+m[1]);}}}}
}
await walk(root);if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log('Syntax and local links verified:',count);
