import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {need} from './policy.mjs';
import {fail} from './security.mjs';
export function storage(app,root){
 const sections={'composition-photos':'composition','autopark-photos':'autopark'};
 function location(bucket,name){if(!sections[bucket])fail(404,'Хранилище не найдено');if(!/^[\w./-]{1,220}$/.test(name)||name.split('/').some(p=>!p||p==='.'||p==='..'))fail(400,'Недопустимый путь');const target=path.resolve(root,bucket,name);if(!target.startsWith(path.resolve(root,bucket)+path.sep))fail(400,'Недопустимый путь');return target;}
 app.put('/api/v1/storage/:bucket/*name',express.raw({type:()=>true,limit:'8mb'}),async(req,res)=>{
  need(req.user,sections[req.params.bucket]||'unknown','edit');const name=req.params.name.join('/'),target=location(req.params.bucket,name),b=req.body;
  if(!Buffer.isBuffer(b)||b.length<12)fail(400,'Пустое изображение');
  const png=b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),jpg=b[0]===255&&b[1]===216&&b[2]===255,webp=b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP';
  const ext=path.extname(name).toLowerCase();if(!(png&&ext==='.png'||jpg&&['.jpg','.jpeg'].includes(ext)||webp&&ext==='.webp'))fail(415,'Разрешены настоящие PNG, JPEG и WebP');
  await fs.mkdir(path.dirname(target),{recursive:true});if(req.query.upsert!=='true'&&await fs.stat(target).then(()=>true,()=>false))fail(409,'Файл существует');const temp=target+'.'+randomUUID()+'.tmp';await fs.writeFile(temp,b,{flag:'wx'});await fs.rename(temp,target);res.json({data:{path:name},error:null});
 });
 app.delete('/api/v1/storage/:bucket',async(req,res)=>{need(req.user,sections[req.params.bucket]||'unknown','edit');const names=req.body.paths;if(!Array.isArray(names)||names.length>30)fail(400,'Неверный список');for(const name of names)await fs.rm(location(req.params.bucket,name),{force:true});res.json({data:names.map(name=>({name})),error:null});});
 app.use('/media',(req,res,next)=>{if(!req.user)return res.sendStatus(401);next();},express.static(root,{dotfiles:'deny',index:false,fallthrough:false,setHeaders:res=>res.setHeader('X-Content-Type-Options','nosniff')}));
}
