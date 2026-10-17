import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {createApp} from '../server/app.mjs';
import {passwordHash,token} from '../server/security.mjs';
const engine=new PGlite();
for(const f of (await readdir(new URL('../database/',import.meta.url))).filter(f=>/^\d{3}-.*\.sql$/.test(f)).sort())await engine.exec(await readFile(new URL('../database/'+f,import.meta.url),'utf8'));
// Serialize transactions on the single embedded connection; production uses a pg pool.
let tail=Promise.resolve();const raw=async(text,values=[])=>{const r=await engine.query(text,values);return {rows:r.rows,rowCount:r.affectedRows??r.rows.length};};
const db={query:(...args)=>{const p=tail.then(()=>raw(...args));tail=p.catch(()=>{});return p;},connect:async()=>{let release;const before=tail;tail=new Promise(r=>release=r);await before;return {query:raw,release};}};
let previous;try{previous=JSON.parse(await readFile(new URL('../.local/preview-login.json',import.meta.url),'utf8'));}catch{}
const password=typeof previous?.password==='string'&&previous.password.length>=12?previous.password:token(),h=await passwordHash(password);const {rows:[u]}=await db.query("INSERT INTO users(email,password_hash,password_reset_required) VALUES('preview@example.org',$1,false) RETURNING id",[h]);await db.query("INSERT INTO user_roles(user_id,role,display_name) VALUES($1,'admin','Локальный администратор')",[u.id]);
await mkdir(new URL('../.local/',import.meta.url),{recursive:true});await writeFile(new URL('../.local/preview-login.json',import.meta.url),JSON.stringify({email:'preview@example.org',password}));
const app=await createApp(db,{origin:'http://localhost:18933',key:'a'.repeat(64),test:true});
app.listen(18933,'127.0.0.1',()=>console.log('Original Army preview: http://localhost:18933 (temporary database, no Discord delivery)'));
