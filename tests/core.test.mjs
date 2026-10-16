import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir} from 'node:fs/promises';
import {createApp} from '../server/app.mjs';
import {passwordHash} from '../server/security.mjs';
import {encrypt} from '../server/security.mjs';
import {deliverOne} from '../server/delivery.mjs';
let db,engine,server,base,admin,user,testId,questionId;
const origin='http://localhost:18933';
async function call(path,body,cookie='',method='POST'){const r=await fetch(base+'/api/v1'+path,{method,headers:{Origin:origin,Cookie:cookie,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,...await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
const spec=(table,action='select',body,extra={})=>({table,action,body,filters:[],orders:[],or:[],...extra});
before(async()=>{engine=new PGlite();for(const f of (await readdir(new URL('../database/',import.meta.url))).filter(f=>/^\d{3}-.*\.sql$/.test(f)).sort())await engine.exec(await readFile(new URL('../database/'+f,import.meta.url),'utf8'));const raw=async(t,v=[])=>{const r=await engine.query(t,v);return {rows:r.rows,rowCount:r.affectedRows??r.rows.length};};db={query:raw,connect:async()=>({query:raw,release(){}})};for(const role of ['admin','user']){const {rows:[u]}=await db.query('INSERT INTO users(email,password_hash) VALUES($1,$2) RETURNING id',[role+'@example.org',await passwordHash('test-password-12345')]);await db.query('INSERT INTO user_roles(user_id,role) VALUES($1,$2)',[u.id,role]);}const app=await createApp(db,{origin,key:'a'.repeat(64),test:true});server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;admin=(await call('/auth/login',{email:'admin@example.org',password:'test-password-12345'})).cookie;user=(await call('/auth/login',{email:'user@example.org',password:'test-password-12345'})).cookie;});
after(async()=>{await new Promise(r=>server.close(r));await engine.close();});
test('original public pages, static resources and server health remain available',async()=>{for(const f of ['index.html','vp.html','payroll.html','supply-stats.html','style.css','fon.png'])assert.equal((await fetch(base+'/'+f)).status,200,f);assert.equal((await call('/health',undefined,'','GET')).ok,true);for(const f of ['.env','server/app.mjs','database/001-base.sql'])assert.equal((await fetch(base+'/'+f)).status,404);});
test('anonymous cannot read private records or answer keys',async()=>{for(const table of ['requests','complaints','test_questions','test_attempts','payroll_drafts','vp_checks','ds_members','composition','user_roles'])assert.equal((await call('/db/query',spec(table))).status,401,table);});
test('ordinary member cannot mutate any privileged module',async()=>{for(const table of ['news','requests','complaints','test_questions','test_attempts','payroll_drafts','vp_checks','composition','user_roles','custom_roles'])assert.equal((await call('/db/query',spec(table,'update',{}, {filters:[{column:'id',op:'eq',value:1}]}),user)).status,403,table);});
test('role bootstrap is closed and administrator roles cannot be self-assigned',async()=>{assert.equal((await call('/db/rpc/staff_upsert_role',{p_user_id:'00000000-0000-4000-8000-000000000000',p_role:'admin'},user)).status,403);assert.equal((await call('/auth/admin/users',{email:'attack@example.org',password:'long-password-123',role:'admin'},admin)).status,403);assert.equal((await call('/db/query',spec('custom_roles','insert',{key:'root',base_role:'admin'}),admin)).status,403);});
test('original content modules can save and read JSON values with the API facade',async()=>{const r=await call('/db/query',spec('composition','upsert',{id:1,state:{hq:{},subs:[]}}, {onConflict:'id',returning:true}),admin);assert.equal(r.status,200,JSON.stringify(r));assert.deepEqual(r.data[0].state,{hq:{},subs:[]});});
test('original payroll draft RPC and request form RPC work on PostgreSQL schema',async()=>{const r=await call('/db/rpc/ensure_payroll_draft',{},admin);assert.equal(r.status,200,JSON.stringify(r));assert.ok(r.data);assert.equal((await call('/db/rpc/get_supply_form',{})).status,200);});
test('server owns exam timing, answer keys, scoring and account attempt limit',async()=>{testId=(await db.query("INSERT INTO tests(title,published,max_attempts,time_limit_minutes) VALUES('Тестовый курс',true,1,10) RETURNING id")).rows[0].id;questionId=(await db.query("INSERT INTO test_questions(test_id,kind,text,options,correct,points) VALUES($1,'single','Верный ответ?','[\"Да\",\"Нет\"]','[\"Да\"]',1) RETURNING id",[testId])).rows[0].id;const preview=await call('/db/rpc/cgb_test_preview',{p_test_id:testId});assert.ok(preview.data.every(q=>!('correct'in q)));const args={p_test_id:testId,p_fio:'Тест Курсант',p_static:'123-456',p_discord:'@example'};assert.equal((await call('/db/rpc/cgb_start_test',args)).status,401);const start=await call('/db/rpc/cgb_start_test',args,user);assert.equal(start.status,200,JSON.stringify(start));assert.equal((await call('/db/rpc/cgb_start_test',{...args,p_static:'999-999',p_discord:'@another'},user)).status,409);assert.equal((await call('/db/rpc/cgb_finish_test',{p_token:start.data.token,p_answers:{}},admin)).status,403);const finish=await call('/db/rpc/cgb_finish_test',{p_token:start.data.token,p_answers:{[questionId]:'Да'},score:0},user);assert.equal(finish.data.percent,100);assert.equal((await call('/db/rpc/cgb_finish_test',{p_token:start.data.token,p_answers:{}},user)).data.percent,100);assert.equal((await call('/db/rpc/submit_test_attempt',{p_test_id:testId,p_score:100},user)).status,404);});
test('webhooks are admin-only and reject network redirects/host tricks',async()=>{assert.equal((await call('/integrations',undefined,user,'GET')).status,403);assert.equal((await call('/integrations/supplies',{url:'https://discord.com.evil.test/api/webhooks/1/a',enabled:true},admin)).status,400);const r=await call('/integrations',undefined,admin,'GET');assert.ok(r.data.routes.every(x=>!('encrypted_url' in x)));});
test('forms validate required fields on server and route warehouse reports',async()=>{
 const args={p_kind:'warehouse',p_fio:'Тест Сотрудник',p_static:'123-456',p_discord:'@test',p_values:{department:'РОиО',reason:'Проверен остаток склада'}};
 assert.equal((await call('/db/rpc/submit_request',{...args,p_values:{}})).status,400);
 assert.equal((await call('/db/rpc/submit_request',{...args,p_kind:'unknown'})).status,400);
 const r=await call('/db/rpc/submit_request',args);assert.equal(r.status,200,JSON.stringify(r));assert.ok(r.data[0].id);
 assert.equal((await db.query("SELECT count(*)::int n FROM outbox WHERE route_id='warehouse'")).rows[0].n,1);
});
test('supply counts, permissions and one-message webhook updates',async()=>{
 const submitted=await call('/db/rpc/submit_supply_request',{p_fio:'Тест Поставка',p_static:'123-456',p_discord:'@test',p_values:{recipient:'ЦГБ',date:'2026-10-16',time:'18:00',resources:'Учебные ресурсы'}});
 assert.equal(submitted.status,200,JSON.stringify(submitted));const id=submitted.data;
 assert.equal((await call('/supplies/'+id+'/send',{},user)).status,403);
 const update=body=>call('/db/query',spec('supply_requests','update',body,{filters:[{column:'id',op:'eq',value:id}]}),admin);
 assert.equal((await update({departed:3,arrived:4})).status,400);
 assert.equal((await update({departed:3,arrived:2})).status,200);
 assert.equal((await call('/supplies/'+id+'/send',{},admin)).status,200);
 await db.query("UPDATE webhook_routes SET enabled=true,encrypted_url=$1 WHERE id='supplies'",[encrypt('https://discord.com/api/webhooks/123456789012345678/'+'x'.repeat(64),'a'.repeat(64))]);
 const methods=[];const fake=async(url,opts)=>{methods.push(opts.method);assert.deepEqual(JSON.parse(opts.body).allowed_mentions,{parse:[]});return {ok:true,status:200,json:async()=>({id:'123456789012345678'})};};
 assert.equal(await deliverOne(db,'a'.repeat(64),fake),true);assert.equal((await update({departed:3,arrived:3})).status,200);assert.equal(await deliverOne(db,'a'.repeat(64),fake),true);assert.deepEqual(methods,['POST','PATCH']);
});
test('cross-origin writes and private file disclosure are rejected',async()=>{
 const r=await fetch(base+'/api/v1/db/query',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json',Cookie:admin},body:JSON.stringify(spec('news','delete'))});assert.equal(r.status,403);
 for(const file of ['/.local/preview-login.json','/package.json','/database/runtime-grants.sql'])assert.equal((await fetch(base+file)).status,404);
});
test('lesson completion requires an authenticated account',async()=>{
 const lesson=(await db.query('SELECT id FROM train_lessons LIMIT 1')).rows[0].id;
 assert.equal((await call('/db/rpc/army_complete_lesson',{lesson_id:lesson})).status,401);
 assert.equal((await call('/db/rpc/army_complete_lesson',{lesson_id:lesson},user)).status,200);
});
test('empty administrator table does not open SQL bootstrap',async()=>{
 await db.query('BEGIN');try{await db.query("DELETE FROM user_roles WHERE role='admin'");const id=(await db.query("SELECT id FROM users WHERE email='user@example.org'")).rows[0].id;await db.query("SELECT set_config('cgb.user_id',$1,true)",[id]);await assert.rejects(db.query("SELECT staff_upsert_role($1,'admin')",[id]),/Administrator required/);}finally{await db.query('ROLLBACK');}
});
test('restricted runtime role can run supported RPCs without DDL privileges',async()=>{
 await db.query('CREATE ROLE army_runtime NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS');await db.query('CREATE TABLE schema_migrations(name text)');await engine.exec(await readFile(new URL('../database/runtime-grants.sql',import.meta.url),'utf8'));await db.query('SET ROLE army_runtime');
 try{assert.equal((await call('/db/rpc/ensure_payroll_draft',{},admin)).status,200);assert.equal((await call('/db/rpc/get_supply_form',{})).status,200);assert.equal((await call('/auth/login',{email:'user@example.org',password:'test-password-12345'})).status,200);await assert.rejects(db.query('CREATE TABLE must_not_exist(id int)'),/permission denied/);await assert.rejects(db.query('SELECT * FROM schema_migrations'),/permission denied/);}finally{await db.query('RESET ROLE');}
});
test('attempt reset records a reason and also releases unfinished runs',async()=>{
 assert.equal((await call('/db/rpc/army_reset_attempts',{test_id:testId,static_id:'123-456',reason:'Проверка сброса'},user)).status,403);
 assert.equal((await call('/db/rpc/army_reset_attempts',{test_id:testId,static_id:'123-456',reason:''},admin)).status,400);
 const r=await call('/db/rpc/army_reset_attempts',{test_id:testId,static_id:'123-456',reason:'Проверка сброса'},admin);assert.equal(r.status,200,JSON.stringify(r));assert.equal(r.data.count,1);
 const args={p_test_id:testId,p_fio:'Тест Курсант',p_static:'123-456',p_discord:'@example'};
 assert.equal((await call('/db/rpc/cgb_start_test',args,user)).status,200);
 assert.equal((await call('/db/rpc/army_reset_attempts',{test_id:testId,static_id:'123-456',reason:'Незавершённая попытка'},admin)).data.count,1);
 assert.equal((await call('/db/rpc/cgb_start_test',args,user)).status,200);
});
test('complaint form is seeded, editable and enforced by the server',async()=>{
 const form=(await call('/db/rpc/get_complaint_form',{})).data[0];assert.ok(form.fields.length);
 const values={submitter_fio:'Тест Заявитель',submitter_static:'123-456',target_static:'654-321',description:'Учебный пример обращения',norms:'Тестовое основание',evidence_url:'https://example.org/proof'};
 const r=await call('/db/rpc/submit_complaint',{p_values:values,p_submitter_fio:values.submitter_fio,p_submitter_static:values.submitter_static,p_target_static:values.target_static,p_evidence_url:values.evidence_url});assert.equal(r.status,200,JSON.stringify(r));
 assert.equal((await call('/db/query',spec('complaints'))).status,401);
});

