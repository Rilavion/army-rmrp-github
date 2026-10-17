import {fail,uuid,text} from './security.mjs';
import {need} from './policy.mjs';
import {transaction,audit,queue} from './db.mjs';
export const organizations=['vs_rf','cgb3','cgb7','fso','fsb','uvd_cao','gibdd','codd','fsvng','fsin'];
export function validateSupply(b){
 const choose=(key,values)=>{if(!values.includes(b[key]))fail(400,'Некорректное поле: '+key);return b[key];};
 const integer=(v,max)=>{if(!Number.isInteger(v)||v<0||v>max)fail(400,'Количество должно быть целым числом в допустимом диапазоне');return v;};
 const counts={};for(const key of organizations)counts[key]=integer(b.organizations?.[key],999);
 const planned=integer(b.trucks_planned,99),arrived=integer(b.trucks_arrived,planned);
 const date=new Date(b.event_at);if(!b.event_at||!Number.isFinite(date.getTime()))fail(400,'Укажите дату поставки');
 return {location:choose('location',['RLS','VS','OB7']),recipient:text(b.recipient,1,120).trim(),status:choose('status',['DELIVERED','NOT_DELIVERED']),trucks_planned:planned,trucks_arrived:arrived,escort_status:choose('escort_status',['YES','NO','UNKNOWN']),event_at:date.toISOString(),comment:text(b.comment??'',0,1000),organizations:counts,total:Object.values(counts).reduce((a,v)=>a+v,0)};
}
function payload(r){return {embeds:[{title:'ВС РФ · Учёт поставок',description:`Направление: ${r.location}\nПолучатель: ${r.recipient}\nСтатус: ${r.status==='DELIVERED'?'Доставлено':'Не доставлено'}\nМашины: ${r.trucks_arrived} / ${r.trucks_planned}\nУчастников: ${r.total}\nСопровождение: ${r.escort_status}\n${r.comment}`,fields:Object.entries(r.organizations).map(([name,value])=>({name,value:String(value),inline:true})),timestamp:r.event_at,footer:{text:`${r.id} · версия ${r.revision}${r.deleted_at?' · удалено':''}`}}]};}
export function supplyLedger(app,db){
 const answer=(res,data)=>res.json({data,error:null});
 app.get('/api/v1/supply-ledger',async(req,res)=>{
  need(req.user,'supply','view');const values=[],where=[];
  const add=(sql,value)=>{values.push(value);where.push(sql.replace('?',`$${values.length}`));};
  if(req.query.deleted==='true'){if(req.user.role!=='admin')fail(403,'Удалённые записи видны администратору');where.push('deleted_at IS NOT NULL');}else where.push('deleted_at IS NULL');
  if(req.query.location)add('location=?',req.query.location);
  for(const [key,op]of [['from','>='],['to','<']])if(req.query[key]){if(!/^\d{4}-\d{2}-\d{2}$/.test(req.query[key]))fail(400,'Неверная дата');add(`event_at ${op} (?::date::timestamp${key==='to'?" + interval '1 day'":''}) AT TIME ZONE 'Europe/Moscow'`,req.query[key]);}
  const clause=where.join(' AND '),offset=Number(req.query.offset||0);if(!Number.isSafeInteger(offset)||offset<0)fail(400,'Неверная страница');
  const summary=(await db.query(`SELECT count(*)::int count,coalesce(sum(total),0)::int participants,coalesce(sum(trucks_planned),0)::int planned,coalesce(sum(trucks_arrived),0)::int arrived,count(*) FILTER(WHERE status='DELIVERED')::int delivered FROM supply_ledger WHERE ${clause}`,values)).rows[0];
  const rows=(await db.query(`SELECT * FROM supply_ledger WHERE ${clause} ORDER BY event_at DESC,id LIMIT 100 OFFSET $${values.length+1}`,[...values,offset])).rows;
  answer(res,{rows,summary,offset});
 });
 app.get('/api/v1/supply-ledger/:id/history',async(req,res)=>{need(req.user,'supply','view');answer(res,(await db.query('SELECT id,action,snapshot,created_at FROM supply_ledger_history WHERE supply_id=$1 ORDER BY id DESC',[uuid(req.params.id)])).rows);});
 async function record(c,user,action,r){await c.query('INSERT INTO supply_ledger_history(supply_id,actor_id,action,snapshot) VALUES($1,$2,$3,$4)',[r.id,user.id,action,JSON.stringify(r)]);await audit(c,user,action,'supply_ledger',r.id);if(r.webhook_requested)await queue(c,'supplies','supply_ledger',r.id,payload(r));}
 app.post('/api/v1/supply-ledger',async(req,res)=>{
  need(req.user,'supply','replace');const data=validateSupply(req.body),key=uuid(req.body.idempotency_key);
  const r=await transaction(db,async c=>{const keys=Object.keys(data),values=Object.values(data).map(v=>typeof v==='object'?JSON.stringify(v):v);const {rows:[r]}=await c.query(`INSERT INTO supply_ledger(${keys.join(',')},created_by,updated_by,idempotency_key) VALUES(${values.map((_,i)=>'$'+(i+1)).join(',')},$${values.length+1},$${values.length+1},$${values.length+2}) ON CONFLICT(created_by,idempotency_key) DO NOTHING RETURNING *`,[...values,req.user.id,key]);if(r){await record(c,req.user,'create',r);return r;}return (await c.query('SELECT * FROM supply_ledger WHERE created_by=$1 AND idempotency_key=$2',[req.user.id,key])).rows[0];});answer(res,r);
 });
 app.post('/api/v1/supply-ledger/:id/:action',async(req,res)=>{
  const action=req.params.action;if(!['update','delete','restore','send'].includes(action))fail(404,'Действие не найдено');need(req.user,'supply',action==='delete'?'delete':'replace');if(action==='restore'&&req.user.role!=='admin')fail(403,'Восстановление доступно администратору');
  const result=await transaction(db,async c=>{const {rows:[old]}=await c.query('SELECT * FROM supply_ledger WHERE id=$1 FOR UPDATE',[uuid(req.params.id)]);if(!old)fail(404,'Запись не найдена');if(req.body.revision!==old.revision)fail(409,'Запись уже изменена. Обновите список перед сохранением.');if(old.deleted_at&&action!=='restore')fail(409,'Запись удалена');if(!old.deleted_at&&action==='restore')fail(409,'Запись уже активна');
   const updates=action==='update'?validateSupply(req.body):action==='delete'?{deleted_at:new Date().toISOString()}:action==='restore'?{deleted_at:null}:{webhook_requested:true};
   const keys=Object.keys(updates),values=Object.values(updates).map(v=>v&&typeof v==='object'?JSON.stringify(v):v);const {rows:[r]}=await c.query(`UPDATE supply_ledger SET ${keys.map((k,i)=>k+'=$'+(i+1)).join(',')},revision=revision+1,updated_at=now(),updated_by=$${values.length+1} WHERE id=$${values.length+2} RETURNING *`,[...values,req.user.id,old.id]);await record(c,req.user,action,r);return r;});answer(res,result);
 });
}
