import express from 'express';
import helmet from 'helmet';
import {rateLimit} from 'express-rate-limit';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {passwordHash,verifyPassword,token,hash,fail,text,uuid,encrypt,webhookURL} from './security.mjs';
import {transaction,audit,queue} from './db.mjs';
import {authorize,can,need} from './policy.mjs';
import query from './query.cjs';
import {storage} from './storage.mjs';
import {notifyMutation} from './notifications.mjs';
import {examRPC} from './exams.mjs';
import {validateSubmission} from './forms.mjs';
import {supplyLedger} from './supply-ledger.mjs';
import {accounts,strictStatic} from './accounts.mjs';
const root=path.resolve(import.meta.dirname,'..');
const publicUser=u=>u?{id:u.id,email:u.email,static_id:u.static_id||null,user_metadata:u.user_metadata||{},created_at:u.created_at}:null;
export async function createApp(db,{origin,production=false,key,test=false,registrationEnabled=process.env.REGISTRATION_ENABLED==='true',storageRoot=path.join(root,'.local/media')}={}){
 if(!origin||new URL(origin).origin!==origin||production&&!origin.startsWith('https:'))throw Error('Exact PUBLIC_ORIGIN required; HTTPS in production');
 const app=express();app.disable('x-powered-by');if(process.env.TRUST_PROXY==='1')app.set('trust proxy',1);
 // Hash original inline scripts: retain page behavior without allowing arbitrary inline JS.
 const hashes=new Set();for(const name of await fs.readdir(path.join(root,'public')))if(name.endsWith('.html')){const body=await fs.readFile(path.join(root,'public',name),'utf8');for(const m of body.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g))hashes.add("'sha256-"+createHash('sha256').update(m[1]).digest('base64')+"'");}
 app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'",...hashes],styleSrc:["'self'","'unsafe-inline'",'https://fonts.googleapis.com'],fontSrc:["'self'",'https://fonts.gstatic.com','data:'],imgSrc:["'self'",'data:','blob:','https:'],connectSrc:["'self'"],frameSrc:['https://www.youtube.com','https://www.youtube-nocookie.com','https://rutube.ru','https://vkvideo.ru','https://docs.google.com','https://drive.google.com','https://disk.yandex.ru'],objectSrc:["'none'"],baseUri:["'self'"],formAction:["'self'"],upgradeInsecureRequests:production?[]:null}}}));
 app.use('/api',rateLimit({windowMs:60000,limit:test?10000:240,standardHeaders:true,legacyHeaders:false}));
 app.use('/api',(req,res,next)=>{res.set('Cache-Control','no-store');if(!['GET','HEAD'].includes(req.method)&&req.headers.origin!==origin)return res.status(403).json({error:{message:'Недопустимый источник запроса'}});next();});
 app.use(express.json({limit:'2mb'}));
 app.use(['/api','/media'],async(req,res,next)=>{const raw=String(req.headers.cookie||'').match(/(?:^|;\s*)army_session=([\w-]+)/)?.[1];if(raw){const {rows:[u]}=await db.query(`SELECT u.*,r.role,r.custom_role_id,r.display_name,coalesce(c.permissions,'{}') permissions FROM auth_sessions s JOIN users u ON u.id=s.user_id JOIN user_roles r ON r.user_id=u.id LEFT JOIN custom_roles c ON (r.custom_role_id=c.id OR (r.custom_role_id IS NULL AND c.key=r.role)) WHERE s.token_hash=$1 AND s.expires_at>now() AND NOT u.disabled AND u.static_id IS NOT NULL`,[hash(raw)]);req.user=u;req.sessionHash=hash(raw);}next();});
 const answer=(res,data)=>res.json({data,error:null});
 async function issueSession(res,u){
  const secret=token();
  await transaction(db,async c=>{
   const {rows:[current]}=await c.query('SELECT u.disabled,u.password_hash FROM users u JOIN user_roles r ON r.user_id=u.id WHERE u.id=$1 FOR SHARE OF u,r',[u.id]);
   if(!current||current.disabled||current.password_hash!==u.password_hash)fail(401,'Доступ изменён. Повторите вход');
   await c.query("INSERT INTO auth_sessions VALUES($1,$2,now()+interval '8 hours')",[hash(secret),u.id]);
   await audit(c,u,'login','user',u.id);
  });
  res.cookie('army_session',secret,{httpOnly:true,sameSite:'strict',secure:production,path:'/',maxAge:28800000});
  answer(res,{status:'approved',user:publicUser(u),session:{user:publicUser(u)}});
 }
 await accounts(app,db,{enabled:registrationEnabled,production,test,issueSession});
 app.get('/api/v1/health',async(req,res)=>{await db.query('SELECT 1');res.json({ok:true});});
 app.get('/api/v1/auth/session',(req,res)=>answer(res,{session:req.user?{user:publicUser(req.user)}:null}));
 app.post('/api/v1/auth/logout',async(req,res)=>{if(req.sessionHash)await db.query('DELETE FROM auth_sessions WHERE token_hash=$1',[req.sessionHash]);res.clearCookie('army_session',{path:'/'});answer(res,{});});
 app.patch('/api/v1/auth/user',async(req,res)=>{if(!req.user)fail(401,'Войдите');if(req.body.password){if(!await verifyPassword(req.body.current_password,req.user.password_hash))fail(403,'Введите текущий пароль');await db.query('UPDATE users SET password_hash=$1 WHERE id=$2',[await passwordHash(req.body.password),req.user.id]);await db.query('DELETE FROM auth_sessions WHERE user_id=$1',[req.user.id]);}answer(res,{user:publicUser(req.user)});});
 const admin=u=>{if(!u)fail(401,'Войдите');if(u.role!=='admin')fail(403,'Только администратор');};
 app.get('/api/v1/auth/admin/users',async(req,res)=>{admin(req.user);answer(res,{users:(await db.query('SELECT id,static_id,user_metadata,disabled,created_at FROM users')).rows});});
 app.post('/api/v1/auth/admin/users',async(req,res)=>{admin(req.user);const b=req.body,staticId=strictStatic(b.static_id);const role=b.role||'user';if(!['user','ss'].includes(role))fail(403,'Администратор создаётся только локальным инструментом');const h=await passwordHash(b.password);const u=await tx(req.user,async c=>{if((await c.query('SELECT 1 FROM registration_requests WHERE static_id=$1',[staticId])).rows.length)fail(409,'Для этого статика уже есть заявка: рассмотрите её');const {rows:[u]}=await c.query('INSERT INTO users(email,static_id,password_hash,password_reset_required,user_metadata) VALUES($1,$2,$3,false,$4) RETURNING id,static_id,user_metadata',[staticId+'@accounts.vsrf.invalid',staticId,h,JSON.stringify({display_name:text(b.display_name,3,120)})]);await c.query('SELECT staff_upsert_role($1,$2,$3,$4)',[u.id,role,b.display_name,b.custom_role_id||null]);await audit(c,req.user,'create','user',u.id);return u;});answer(res,{user:u});});
 app.delete('/api/v1/auth/admin/users/:id',async(req,res)=>{admin(req.user);await revokeUser(req.user,req.params.id);answer(res,{});});
 async function tx(user,fn){return transaction(db,async c=>{if(user)await c.query("SELECT set_config('cgb.user_id',$1,true)",[user.id]);return fn(c);});}
 async function revokeUser(actor,id){await tx(actor,async c=>{const {rows:[r]}=await c.query('SELECT * FROM user_roles WHERE user_id=$1 FOR UPDATE',[uuid(id)]);if(!r||r.role==='admin'||id===actor.id)fail(403,'Администратор и собственная учётная запись защищены');await c.query('UPDATE users SET disabled=true WHERE id=$1',[id]);await c.query('DELETE FROM auth_sessions WHERE user_id=$1',[id]);await audit(c,actor,'disable','user',id);});}
 const columns=new Map();for(const c of (await db.query("SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_schema='public'")).rows){if(!columns.has(c.table_name))columns.set(c.table_name,new Map());columns.get(c.table_name).set(c.column_name,c.data_type);}
 app.post('/api/v1/db/query',async(req,res)=>{
  const b=req.body;if(!b||typeof b!=='object')fail(400,'Неверный запрос');const spec={...b,action:b.action||'select',filters:Array.isArray(b.filters)?b.filters:[],orders:Array.isArray(b.orders)?b.orders:[],or:Array.isArray(b.or)?b.or:[]};
  if(spec.filters.length>30||spec.or.length>5||spec.orders.length>5)fail(400,'Слишком сложный запрос');authorize(req.user,spec);
  const read=spec.action==='select';if(read&&spec.table==='test_attempts')spec.filters.push({column:'invalidated',op:'eq',value:false});if(read&&spec.limit===undefined&&!spec.range)spec.limit=1000;
  const known=columns.get(spec.table);if(!known)fail(404,'Таблица не найдена');
  if(spec.table==='user_roles'&&spec.action==='delete'){admin(req.user);const id=spec.filters.find(f=>f.column==='user_id'&&f.op==='eq')?.value;if(!id)fail(400,'Укажите сотрудника');await revokeUser(req.user,id);return answer(res,null);}
  if(!read&&spec.body){const rows=Array.isArray(spec.body)?spec.body:[spec.body];if(rows.length>200)fail(400,'Слишком много записей');for(const row of rows){if(!row||typeof row!=='object'||Array.isArray(row))fail(400,'Неверная запись');for(const k of Object.keys(row)){if(!known.has(k))fail(400,'Неизвестное поле: '+k);if(['json','jsonb'].includes(known.get(k)))row[k]=JSON.stringify(row[k]);}
    if(spec.table==='custom_roles'){if(row.base_role==='admin'||row.key==='admin')fail(403,'Администраторская роль защищена');if(row.permissions){const perms=JSON.parse(row.permissions);for(const [section,actions] of Object.entries(perms)){if(!/^[a-z_]+$/.test(section)||!actions||typeof actions!=='object'||Object.values(actions).some(v=>typeof v!=='boolean'))fail(400,'Неверные разрешения');if(section==='lk'||section==='integrations')fail(403,'Управление доступом и секретами нельзя делегировать');}}}
    if(spec.table==='test_attempts'&&Object.keys(row).some(k=>!['review_status','reviewed_by','reviewed_by_name','reviewed_at','review_history'].includes(k)))fail(403,'Баллы и ответы изменяет только сервер');
    if(spec.table==='supply_requests'&&('webhook_requested' in row))fail(403,'Используйте отправку отчёта');
  }}
  if(spec.action==='upsert'&&!spec.onConflict)spec.onConflict=spec.table==='site_data'?'key':spec.table==='user_roles'?'user_id':'id';
  if(spec.table==='custom_roles'&&!read){spec.filters.push({column:'key',op:'neq',value:'admin'});if(spec.action==='upsert'){for(const row of Array.isArray(spec.body)?spec.body:[spec.body])if(row.id&&(await db.query("SELECT 1 FROM custom_roles WHERE id=$1 AND key='admin'",[row.id])).rows.length)fail(403,'Системная роль защищена');}}
  const result=await tx(req.user,async c=>{
   if(spec.table==='test_attempts'&&spec.action==='delete'){const sel=query.compile({...spec,action:'select',select:'id',limit:1000});const rows=(await c.query(sel.text,sel.values)).rows;for(const a of rows){await c.query('UPDATE exam_runs SET invalidated=true WHERE result_id=$1',[a.id]);await c.query('UPDATE test_attempts SET invalidated=true WHERE id=$1',[a.id]);await audit(c,req.user,'reset','test_attempt',a.id);}return {rows:[]};}
   if(!read&&['report_send_requests','payroll_send_requests','vp_report_requests','test_result_requests','complaints','requests','violations_registry'].includes(spec.table))spec.returning=true;const compiled=query.compile(spec);const r=await c.query(compiled.text,compiled.values);if(!read){await audit(c,req.user,spec.action,spec.table,'',{fields:Object.keys(spec.body||{})});if(spec.table==='supply_requests')await refreshSupply(c,spec);await notifyMutation(c,spec,r.rows);}
   let count=null;if(compiled.countText)count=(await c.query(compiled.countText,compiled.countValues)).rows[0].count;return {rows:r.rows,count};
  });res.json({data:spec.head?null:result.rows,error:null,count:result.count});
 });
 async function refreshSupply(c,spec){const id=spec.filters.find(f=>f.column==='id'&&f.op==='eq')?.value;if(!id)return;const {rows:[r]}=await c.query('SELECT * FROM supply_requests WHERE id=$1',[id]);if(r?.webhook_requested)await queue(c,'supplies','supply',r.id,supplyEmbed(r));}
 function supplyEmbed(r){return {embeds:[{title:'Отчёт поставки ВС РФ',description:`${r.fio||'Организатор не указан'}\nМашин: ${r.arrived??'—'} / ${r.departed??'—'}\nДоставлено: ${r.departed?Math.round(r.arrived/r.departed*100)+'%':'не указано'}`,footer:{text:`Поставка ${r.id}`}}]};}
 app.post('/api/v1/supplies/:id/send',async(req,res)=>{need(req.user,'supply','replace');await tx(req.user,async c=>{const {rows:[r]}=await c.query('UPDATE supply_requests SET webhook_requested=true WHERE id=$1 RETURNING *',[uuid(req.params.id)]);if(!r)fail(404,'Поставка не найдена');if(!r.departed||r.arrived===null)fail(400,'Сначала сохраните выехавшие и прибывшие машины');await queue(c,'supplies','supply',r.id,supplyEmbed(r));await audit(c,req.user,'send','supply',r.id);});answer(res,{ok:true});});
 const rpcPublic=new Set(['get_complaint_form','submit_complaint','submit_request','get_supply_form','submit_supply_request']);
 const rpcSafe=new Set([...rpcPublic,'staff_upsert_role','ensure_payroll_draft','archive_payroll_draft']);
 const rpcLimit=rateLimit({windowMs:3600000,limit:test?10000:80,standardHeaders:true,legacyHeaders:false});
 app.post('/api/v1/db/rpc/:name',rpcLimit,async(req,res)=>{const name=req.params.name,args=req.body||{};const exam=await examRPC(db,req.user,name,args);if(exam.handled)return answer(res,exam.data);
  if(!rpcSafe.has(name))fail(404,'Операция недоступна');if(!rpcPublic.has(name)&&!req.user)fail(401,'Войдите');if(name==='staff_upsert_role')admin(req.user);if(name.includes('payroll'))need(req.user,'payroll','edit');
  if(name.startsWith('submit_')){for(const field of ['p_fio','p_static','p_discord'])if(args[field]!==undefined&&String(args[field]).length>150)fail(400,'Поле слишком длинное');if(args.p_static&&!/^\d{3}-\d{3}$/.test(args.p_static))fail(400,'Статик: 000-000');}
  const data=await tx(req.user,async c=>{await validateSubmission(c,name,args);const values=Object.values(args).map(v=>v&&typeof v==='object'?JSON.stringify(v):v);const named=Object.keys(args).map((k,i)=>`${query.ident(k)}=>$${i+1}`).join(',');const set=['get_complaint_form','submit_complaint','submit_request','get_supply_form'].includes(name);const r=await c.query(set?`SELECT * FROM ${query.ident(name)}(${named})`:`SELECT ${query.ident(name)}(${named}) value`,values);const result=set?r.rows:r.rows[0]?.value;if(name.startsWith('submit_')){const route=name==='submit_supply_request'?'supply_requests':name==='submit_complaint'?'complaints':args.p_kind==='warehouse'?'warehouse':'requests';const id=set?r.rows[0]?.id:result;if(id)await queue(c,route,name,String(id),{embeds:[{title:'Новое обращение ВС РФ',description:'Обращение доступно на портале для рассмотрения.',footer:{text:String(id)}}]});}if(req.user)await audit(c,req.user,'rpc',name,'');return result;});answer(res,data);
 });
 app.get('/api/v1/integrations',async(req,res)=>{admin(req.user);answer(res,{routes:(await db.query('SELECT id,label,enabled,(encrypted_url IS NOT NULL) configured FROM webhook_routes ORDER BY id')).rows,queue:(await db.query('SELECT id,route_id,entity_type,entity_id,status,attempts,message_id,last_error,updated_at FROM outbox ORDER BY updated_at DESC LIMIT 100')).rows});});
 app.post('/api/v1/integrations/:id',async(req,res)=>{admin(req.user);const encrypted=req.body.url?encrypt(webhookURL(req.body.url),key):null;if(typeof req.body.enabled!=='boolean')fail(400,'Неверное состояние');const r=await db.query('UPDATE webhook_routes SET encrypted_url=coalesce($1,encrypted_url),enabled=$2,updated_at=now() WHERE id=$3',[encrypted,req.body.enabled,req.params.id]);if(!r.rowCount)fail(404,'Маршрут не найден');await audit(db,req.user,'configure','webhook',req.params.id);answer(res,{});});
 app.get('/api/v1/audit',async(req,res)=>{admin(req.user);answer(res,(await db.query('SELECT * FROM audit_log ORDER BY id DESC LIMIT 500')).rows);});
 app.get('/api/v1/directory',async(req,res)=>{
  if(!req.user)fail(401,'Войдите в аккаунт');if(!can(req.user,'vp','view')&&!can(req.user,'payroll','view')&&!can(req.user,'complaints','review')&&!can(req.user,'requests','review')&&!can(req.user,'complaints','review')&&!can(req.user,'requests','review'))fail(403,'Нет доступа к служебному составу');
  const state=(await db.query('SELECT state FROM composition WHERE id=1')).rows[0]?.state||{},roles=[],members=new Map();
  const groups=[{id:'hq',name:'Штаб бригады',short:'Штаб',members:Object.values(state.hq||{})},...(state.subs||[])];
  for(const [index,group]of groups.entries()){
   const role_id='site:'+hash(String(group.id)).slice(0,24);roles.push({role_id,name:String(group.name||group.short||'Подразделение'),position:groups.length-index,color:/^#[0-9a-f]{6}$/i.test(group.color||'')?group.color:'#7a8a4a'});
   for(const person of group.members||[]){if(!person.name?.trim()||!/^\d{3}-\d{3}$/.test(person.code||''))continue;
    const id='static:'+person.code;
    const m=members.get(id)||{discord_id:id,parsed_fio:person.name,parsed_static:person.code,parsed_dept:group.short||group.name,display_name:person.name,raw_nick:person.name,contact_discord:String(person.discord||''),role_ids:[],role_names:[],active:true};m.role_ids.push(role_id);m.role_names.push(group.name);members.set(id,m);
   }
  }answer(res,{roles,members:[...members.values()]});
 });
 supplyLedger(app,db);
 storage(app,storageRoot);
 app.use('/api',(req,res)=>res.status(404).json({data:null,error:{message:'Маршрут не найден'}}));
 app.use(express.static(path.join(root,'public'),{dotfiles:'deny',index:'index.html'}));
 app.use((e,req,res,next)=>{const status=e.status||(['23505','23503','23514','22P02','42703'].includes(e.code)?400:500);if(status>=500)console.error('request_failed',req.path,e.code||e.name);res.status(status).json({data:null,error:{message:status>=500?'Ошибка сервера':e.status?e.message:'Данные нарушают ограничения БД'}});});
 return app;
}

