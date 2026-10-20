import {transaction,audit,queue} from './db.mjs';
// Former bot timer: expiry is now performed by the portal's worker.
export async function expireViolations(db){return transaction(db,async c=>{
 const rows=(await c.query("UPDATE violations_registry SET status='removed',removed_at=now(),removed_by_name='Система сайта',removed_reason='Истёк срок',updated_at=now() WHERE status='active' AND removed_at IS NULL AND expires_at<=now() RETURNING *")).rows;
 for(const row of rows){await c.query("INSERT INTO violations_history(violation_id,action,status,after_data,comment,changed_by_name) VALUES($1,'expired','removed',$2,'Истёк срок','Система сайта')",[row.id,JSON.stringify(row)]);await audit(c,null,'expire','violation',row.id);if(row.notify_mode!=='silent')await queue(c,'vp','violation',row.id,{embeds:[{title:'Срок взыскания истёк',description:`${row.target_fio||''} · ${row.target_static||''}`,footer:{text:row.id}}]});}return rows.length;
 });}
