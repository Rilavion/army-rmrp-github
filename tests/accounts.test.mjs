import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir} from 'node:fs/promises';
import {createApp} from '../server/app.mjs';
import sharp from 'sharp';
import {passwordHash} from '../server/security.mjs';
const origin='http://localhost:18933',password='registration-password-123';
let photo,engine,db,server,base,admin,reviewer,ordinary,reviewRole,memberRole,adminRole,highRole;
async function call(path,body,cookie='',method=body?'POST':'GET'){
 const r=await fetch(base+'/api/v1'+path,{method,headers:{Origin:origin,Cookie:cookie,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
 return {status:r.status,...await r.json(),cookie:r.headers.get('set-cookie')};
}
const payload=id=>({static_id:id,display_name:'Тест Военнослужащий',position:'Инструктор',military_rank:'Сержант',discord:'test.user',udo_photo:photo,password});
const request=async id=>(await db.query('SELECT * FROM registration_requests WHERE static_id=$1',[id])).rows[0];
before(async()=>{
 photo='data:image/png;base64,'+(await sharp({create:{width:20,height:20,channels:3,background:'#446633'}}).png().toBuffer()).toString('base64');
 engine=new PGlite();for(const f of (await readdir(new URL('../database/',import.meta.url))).filter(f=>/^\d{3}-.*\.sql$/.test(f)).sort())await engine.exec(await readFile(new URL('../database/'+f,import.meta.url),'utf8'));
 let tail=Promise.resolve();const raw=async(t,v=[])=>{const r=await engine.query(t,v);return {rows:r.rows,rowCount:r.affectedRows??r.rows.length};};
 db={query:(...a)=>{const p=tail.then(()=>raw(...a));tail=p.catch(()=>{});return p;},connect:async()=>{let release;const prior=tail;tail=new Promise(r=>release=r);await prior;return {query:raw,release};}};
 memberRole=(await db.query("SELECT id FROM custom_roles WHERE key='user'")).rows[0].id;
 adminRole=(await db.query("SELECT id FROM custom_roles WHERE key='admin'")).rows[0].id;
 reviewRole=(await db.query(`INSERT INTO custom_roles(key,name,base_role,permissions) VALUES('reviewer','Проверяющий','user',
  '{"registration":{"review":true},"composition":{"view":true},"tests":{"view":true},"training":{"view":true},"docs":{"view":true}}') RETURNING id`)).rows[0].id;
 highRole=(await db.query(`INSERT INTO custom_roles(key,name,base_role,permissions) VALUES('high','Редактор','user','{"news":{"edit":true}}') RETURNING id`)).rows[0].id;
 for(const [key,role,custom]of [['admin','admin',null],['reviewer','user',reviewRole],['ordinary','user',memberRole]]){
  const u=(await db.query('INSERT INTO users(email,password_hash,static_id) VALUES($1,$2,$3) RETURNING id',[key+'@test.invalid',await passwordHash(password),{admin:'000-001',reviewer:'000-002',ordinary:'000-003'}[key]])).rows[0];
  await db.query('INSERT INTO user_roles(user_id,role,custom_role_id) VALUES($1,$2,$3)',[u.id,role,custom]);
 }
 const app=await createApp(db,{origin,key:'a'.repeat(64),registrationEnabled:true,test:true});server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
 [admin,reviewer,ordinary]=await Promise.all(['admin','reviewer','ordinary'].map(async key=>(await call('/auth/login',{static_id:{admin:'000-001',reviewer:'000-002',ordinary:'000-003'}[key],password})).cookie.split(';')[0]));
});
after(async()=>{await new Promise(r=>server.close(r));await engine.close();});
test('strict static rejects every alternative format; role and password checks are server-side',async()=>{
 for(const id of ['123456','12-3456','123-4567',' 123-456','123-456\n','１２３-４５６','123–456',123456])assert.equal((await call('/accounts/register',payload(id))).status,400,String(id));
 assert.equal((await call('/accounts/register',{...payload('100-001'),password:'short'})).status,400);
 assert.equal((await call('/accounts/register',{...payload('100-001'),role:'admin'})).status,400);
 assert.equal((await call('/accounts/register',payload('100-001'))).status,200);
 assert.equal((await call('/accounts/register',payload('100-001'))).status,409);
});
test('pending application is not an account and cannot access private records or review lists',async()=>{
 const login=await call('/accounts/login',{static_id:'100-001',password});assert.equal(login.data.status,'pending');assert.equal(login.cookie,null);
 assert.equal((await db.query("SELECT count(*)::int n FROM users WHERE static_id='100-001'")).rows[0].n,0);
 assert.equal((await call('/accounts/login',{static_id:'100-001',password:'wrong-password'})).status,401);
 assert.equal((await call('/accounts/review')).status,401);assert.equal((await call('/accounts/review',undefined,ordinary)).status,403);
 assert.equal((await call('/db/query',{table:'complaints',action:'select',filters:[]})).status,401);
 for(const cookie of ['',ordinary,admin])assert.equal((await call('/db/query',{table:'registration_requests',action:'select',filters:[]},cookie)).status,404);
 const data=(await call('/accounts/review',undefined,reviewer)).data;assert.equal(data.requests.length,1);
 assert.ok(!JSON.stringify(data).includes('password_hash'));assert.ok(!data.roles.some(r=>[adminRole,highRole,reviewRole].includes(r.id)));
});
test('reviewer can grant only non-administrative subset roles, exactly once, and decision is audited',async()=>{
 const r=await request('100-001');
 for(const role of [adminRole,highRole,reviewRole])assert.equal((await call('/accounts/review/'+r.id,{decision:'approve',custom_role_id:role},reviewer)).status,403);
 assert.equal((await call('/accounts/review/'+r.id,{decision:'approve',custom_role_id:memberRole},ordinary)).status,403);
 const result=await call('/accounts/review/'+r.id,{decision:'approve',custom_role_id:memberRole},reviewer);assert.equal(result.status,200,JSON.stringify(result));
 assert.equal((await call('/accounts/review/'+r.id,{decision:'approve',custom_role_id:memberRole},reviewer)).status,409);
 const approved=await request('100-001');assert.equal(approved.password_hash,null);assert.ok(approved.user_id);
 const role=(await db.query('SELECT * FROM user_roles WHERE user_id=$1',[approved.user_id])).rows[0];assert.equal(role.role,'user');assert.equal(role.custom_role_id,memberRole);
 assert.equal((await db.query("SELECT count(*)::int n FROM audit_log WHERE action='registration_approve' AND entity_id=$1",[r.id])).rows[0].n,1);
 const login=await call('/accounts/login',{static_id:'100-001',password});assert.equal(login.status,200);assert.ok(login.data.session);assert.match(login.cookie,/HttpOnly/);assert.match(login.cookie,/SameSite=Strict/);
 const session=login.cookie.split(';')[0];assert.ok((await call('/auth/session',undefined,session)).data.session);
 assert.equal((await call('/db/query',{table:'news',action:'insert',body:{title:'Denied'}},session)).status,403);
 await db.query('UPDATE users SET disabled=true WHERE id=$1',[approved.user_id]);
 assert.equal((await call('/accounts/login',{static_id:'100-001',password})).status,401);
 assert.equal((await call('/auth/session',undefined,session)).data.session,null);
});
test('rejection requires a reason; status is visible only with the applicant password',async()=>{
 await call('/accounts/register',payload('100-002'));const r=await request('100-002');
 assert.equal((await call('/accounts/review/'+r.id,{decision:'reject'},reviewer)).status,400);
 assert.equal((await call('/accounts/review/'+r.id,{decision:'reject',note:'Статик не подтверждён'},reviewer)).status,200);
 const login=await call('/accounts/login',{static_id:'100-002',password});assert.equal(login.data.status,'rejected');assert.equal(login.data.review_note,'Статик не подтверждён');assert.equal(login.cookie,null);
 assert.equal((await call('/accounts/login',{static_id:'100-002',password:'incorrect-password'})).status,401);
});
test('two reviewers cannot approve the same application twice',async()=>{
 await call('/accounts/register',payload('100-003'));const r=await request('100-003');
 const results=await Promise.all([admin,reviewer].map(cookie=>call('/accounts/review/'+r.id,{decision:'approve',custom_role_id:memberRole},cookie)));
 assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);assert.equal((await db.query("SELECT count(*)::int n FROM users WHERE static_id='100-003'")).rows[0].n,1);
});
test('only admin may grant review privileges and revoked reviewers lose access immediately',async()=>{
 assert.equal((await call('/accounts/reviewer-roles/'+memberRole,{enabled:true},reviewer)).status,403);
 assert.equal((await call('/accounts/reviewer-roles/'+reviewRole,{enabled:false},admin)).status,200);
 assert.equal((await call('/accounts/review',undefined,reviewer)).status,403);
 assert.equal((await call('/accounts/reviewer-roles/'+reviewRole,{enabled:true},admin)).status,200);
 assert.equal((await call('/accounts/review',undefined,reviewer)).status,200);
});
test('registration is disabled by default while static login remains available',async()=>{
 const app=await createApp(db,{origin,key:'a'.repeat(64),test:true});const off=app.listen(0,'127.0.0.1');await new Promise(r=>off.once('listening',r));const prior=base;base='http://127.0.0.1:'+off.address().port;
 try{
  assert.equal((await call('/accounts/config')).data.enabled,false);
  assert.equal((await call('/accounts/register',payload('100-004'))).status,503);
  assert.equal((await call('/accounts/login',{static_id:'100-003',password})).status,200);
  assert.equal((await call('/auth/login',{static_id:'000-001',password})).status,200);
 }finally{base=prior;await new Promise(r=>off.close(r));}
});
test('registration lifecycle works with restricted runtime database privileges',async()=>{
 await db.query('CREATE ROLE army_runtime NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS');
 await db.query('CREATE TABLE schema_migrations(name text)');
 await engine.exec(await readFile(new URL('../database/runtime-grants.sql',import.meta.url),'utf8'));
 await db.query('SET ROLE army_runtime');
 try{
  assert.equal((await call('/accounts/register',payload('100-005'))).status,200);
  const r=await request('100-005');
  const decision=await call('/accounts/review/'+r.id,{decision:'approve',custom_role_id:memberRole},reviewer);
  assert.equal(decision.status,200,JSON.stringify(decision));
  const login=await call('/accounts/login',{static_id:'100-005',password});
  assert.equal(login.status,200);assert.equal(login.data.user.static_id,'100-005');
  assert.equal(login.data.user.user_metadata.position,'Инструктор');
  assert.equal(login.data.user.user_metadata.military_rank,'Сержант');
  assert.equal(login.data.user.user_metadata.discord,'test.user');
 }finally{await db.query('RESET ROLE');}
});
test('position, rank, Discord and a genuine identity image are mandatory on the server',async()=>{
 for(const field of ['position','military_rank','discord','udo_photo']){
  const body=payload('200-001');delete body[field];
  assert.equal((await call('/accounts/register',body)).status,400,field);
 }
 for(const invalid of ['data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=', 'data:image/png;base64,bm90IGFuIGltYWdl']){
  assert.equal((await call('/accounts/register',{...payload('200-001'),udo_photo:invalid})).status,415);
 }
 assert.equal((await call('/accounts/register',{...payload('200-001'),udo_photo:'x'.repeat(1400001)})).status,400);
 assert.equal((await call('/accounts/register',{...payload('200-001'),discord:'<script>'})).status,400);
 assert.equal(await request('200-001'),undefined);
});
test('identity photo is re-encoded and private, including after approval',async()=>{
 const r=await request('100-005');
 for(const [cookie,expected]of [['',401],[ordinary,403],[reviewer,200],[admin,200]]){
  const response=await fetch(base+'/api/v1/accounts/review/'+r.id+'/udo',{headers:{Cookie:cookie}});
  assert.equal(response.status,expected);
  if(expected===200){
   assert.equal(response.headers.get('content-type'),'image/jpeg');
   assert.equal(response.headers.get('cache-control'),'no-store');
   const bytes=Buffer.from(await response.arrayBuffer());assert.equal((await sharp(bytes).metadata()).format,'jpeg');
  }
 }
 for(const cookie of ['',ordinary,admin])assert.equal((await call('/db/query',{table:'registration_identity_documents',action:'select',filters:[]},cookie)).status,404);
 const list=await call('/accounts/review?status=approved',undefined,reviewer);
 assert.ok(list.data.requests.some(x=>x.has_udo&&x.position==='Инструктор'));
 assert.ok(!JSON.stringify(list).includes('base64'));
});
test('email login has no remaining API fallback; existing accounts use static even with registration disabled',async()=>{
 for(const path of ['/auth/login','/accounts/login']){
  const response=await call(path,{email:'admin@test.invalid',password});
  assert.equal(response.status,400);assert.equal(response.cookie,null);
  assert.equal((await call(path,{static_id:'000-001',password})).status,200);
 }
 const created=await call('/auth/admin/users',{static_id:'200-002',password,display_name:'Новый Сотрудник',custom_role_id:memberRole},admin);
 assert.equal(created.status,200,JSON.stringify(created));
 assert.equal((await call('/auth/login',{static_id:'200-002',password})).status,200);
});
test('historical incomplete applications cannot be approved without the new required evidence',async()=>{
 const r=(await db.query('INSERT INTO registration_requests(static_id,display_name,password_hash) VALUES($1,$2,$3) RETURNING id',['200-003','Старая Заявка',await passwordHash(password)])).rows[0];
 assert.equal((await call('/accounts/review/'+r.id,{decision:'approve',custom_role_id:memberRole},admin)).status,409);
 assert.equal((await db.query("SELECT count(*)::int n FROM users WHERE static_id='200-003'")).rows[0].n,0);
});
