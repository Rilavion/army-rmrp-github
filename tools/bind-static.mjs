import {createInterface} from 'node:readline/promises';
import {createPool,transaction,audit} from '../server/db.mjs';
import {strictStatic} from '../server/accounts.mjs';
import {uuid,fail} from '../server/security.mjs';
// Offline migration only. No public bootstrap and no role/password changes.
let raw='';for await(const line of createInterface({input:process.stdin,terminal:false}))raw+=line;
const b=JSON.parse(raw),id=uuid(b.user_id),staticId=strictStatic(b.static_id),db=createPool();
try{
 await transaction(db,async c=>{
  const {rows:[u]}=await c.query('SELECT id,static_id FROM users WHERE id=$1 FOR UPDATE',[id]);
  if(!u)fail(404,'Аккаунт не найден');
  if(u.static_id&&u.static_id!==staticId)fail(409,'У аккаунта уже есть другой статик');
  if((await c.query('SELECT 1 FROM registration_requests WHERE static_id=$1 AND user_id IS DISTINCT FROM $2',[staticId,id])).rows.length)fail(409,'Статик занят заявкой: сначала разберите конфликт');
  await c.query('UPDATE users SET static_id=$2,updated_at=now() WHERE id=$1',[id,staticId]);
  await c.query('DELETE FROM auth_sessions WHERE user_id=$1',[id]);
  await audit(c,null,'offline_static_binding','user',id,{static_id:staticId});
 });
 console.log('Static bound; previous sessions revoked');
}finally{await db.end();}
