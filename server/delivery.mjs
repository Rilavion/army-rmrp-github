import {decrypt,webhookURL} from './security.mjs';
import {transaction} from './db.mjs';
import {deliveryStatus} from './notifications.mjs';
export async function deliverOne(db,key,fetcher=fetch) {
 const row=await transaction(db,async c=>{
  await c.query(`UPDATE outbox SET status=CASE WHEN message_id IS NULL THEN 'uncertain' ELSE 'retry' END,last_error='WORKER_INTERRUPTED',next_attempt=now(),updated_at=now() WHERE status='sending' AND updated_at<now()-interval '2 minutes'`);
  const {rows:[o]}=await c.query(`SELECT o.*,r.encrypted_url FROM outbox o JOIN webhook_routes r ON r.id=o.route_id
  WHERE o.status IN ('pending','retry') AND o.next_attempt<=now() AND r.enabled AND r.encrypted_url IS NOT NULL
  ORDER BY o.created_at FOR UPDATE OF o SKIP LOCKED LIMIT 1`);
  if(o) await c.query("UPDATE outbox SET status='sending',attempts=attempts+1,updated_at=now() WHERE id=$1",[o.id]);return o;
 });
 if(!row) return false;
 let status='sent', messageId=row.message_id, code=null, delay=0;
 try {
  const base=webhookURL(decrypt(row.encrypted_url,key));
  if(messageId&&!/^\d{17,20}$/.test(messageId)) throw new Error('INVALID_MESSAGE_ID');
  const url=messageId?`${base}/messages/${messageId}`:`${base}?wait=true`;
  const {_document,...payload}=row.payload;payload.allowed_mentions={parse:[]};let body=JSON.stringify(payload),headers={'content-type':'application/json'};
  if(_document){const form=new FormData();payload.attachments=[{id:0,filename:_document.name}];form.append('payload_json',JSON.stringify(payload));form.append('files[0]',new Blob([_document.text],{type:'text/plain;charset=utf-8'}),_document.name);body=form;headers={};}
  const response=await fetcher(url,{method:messageId?'PATCH':'POST',headers,body,redirect:'error',signal:AbortSignal.timeout(10000)});
  if(response.status===429){const data=await response.json().catch(()=>({}));delay=Math.min(3600,Math.max(1,Number(data.retry_after)||30));status='retry';code='DISCORD_RATE_LIMIT';}
  else if(!response.ok){code=`DISCORD_HTTP_${response.status}`;status=response.status>=500?(messageId?'retry':'uncertain'):'failed';delay=Math.min(3600,2**Math.min(row.attempts+1,10));}
  else {const data=await response.json();if(!/^\d{17,20}$/.test(data.id||'')) throw new Error('INVALID_RESPONSE');messageId=data.id;}
 } catch {status=messageId?'retry':'uncertain';code='DELIVERY_UNCONFIRMED';delay=60;}
 if(status==='retry'&&row.attempts>=7){status='failed';code='RETRY_LIMIT';}
 await db.query(`UPDATE outbox SET message_id=$1,status=CASE WHEN $2='sent' AND version>$3 THEN 'pending' ELSE $2 END,
 sent_version=CASE WHEN $2='sent' THEN $3 ELSE sent_version END,last_error=$4,next_attempt=now()+$5*interval '1 second',updated_at=now() WHERE id=$6`,[messageId,status,row.version,code,delay,row.id]);
 await deliveryStatus(db,row,status,messageId,code);
 return true;
}
