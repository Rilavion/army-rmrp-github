import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..'),target=path.resolve(process.argv[2]||'');
if(!process.argv[2]||target===root||target.startsWith(root+path.sep))throw Error('Pass a new destination outside the workspace');
const verifyOnly=process.argv[3]==='--verify-existing';
if(!verifyOnly)await fs.mkdir(target); // Never overwrite an existing handoff.
const dirs=['public','server','database','docs','deploy','tools','tests'];
const files=['README.md','package.json','package-lock.json','.gitignore','.gitattributes','.dockerignore','.env.example'];
if(!verifyOnly){for(const dir of dirs)await fs.cp(path.join(root,dir),path.join(target,dir),{recursive:true,errorOnExist:true,force:false});
for(const file of files)await fs.copyFile(path.join(root,file),path.join(target,file));}
const manifest=[];
async function verify(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){const abs=path.join(dir,e.name),rel=path.relative(target,abs);if(rel==='HANDOFF-MANIFEST.json')continue;if(e.isDirectory()){await verify(abs);continue;}const data=await fs.readFile(abs),original=await fs.readFile(path.join(root,rel));if(!data.equals(original))throw Error('Copy mismatch: '+rel);if(/\.(?:html|js|mjs|json|sql|md|example)$/.test(e.name)){const text=data.toString();if(/https:\/\/[^\s"']*supabase\.co|eyJhbGciOi[A-Za-z0-9_-]{30,}|discord\.com\/api\/webhooks\/\d{17,20}\/[A-Za-z0-9_-]{40,}/.test(text))throw Error('Credential candidate: '+rel);}
manifest.push({path:rel.replaceAll(path.sep,'/'),bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});}}
await verify(target);await fs.writeFile(path.join(target,'HANDOFF-MANIFEST.json'),JSON.stringify({created_at:new Date().toISOString(),files:manifest},null,2));
console.log(`Verified ${manifest.length} copied files; plus HANDOFF-MANIFEST.json. Destination: ${target}`);
