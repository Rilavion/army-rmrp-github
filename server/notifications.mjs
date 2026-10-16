import {queue} from './db.mjs';
export async function notifyMutation(db,spec,rows){
 const routes={report_send_requests:'reports',payroll_send_requests:'payroll',vp_report_requests:'vp',test_result_requests:'exams',complaints:'complaints',requests:'requests'};
 const route=routes[spec.table];if(!route||spec.action==='delete')return;
 for(const row of rows){if(!row.id)continue;let data=row,title='Служебная запись ВС РФ';
 if(spec.table==='payroll_send_requests'){data=(await db.query('SELECT * FROM payroll_drafts WHERE id=$1',[row.draft_id])).rows[0];title='Приказ о премировании';}
 if(spec.table==='vp_report_requests'){data=(await db.query('SELECT * FROM vp_archive WHERE id=$1',[row.archive_id])).rows[0];title='Отчёт военной полиции';}
 if(spec.table==='test_result_requests'){data=(await db.query('SELECT fio,static_id,percent,passed,created_at FROM test_attempts WHERE id=$1',[row.attempt_id])).rows[0];title='Результат экзамена';}
 if(spec.table==='report_send_requests')title='Служебный отчёт';
 const document=JSON.stringify(data||row,null,2);
 const summary=[data?.title,data?.submitter_fio||data?.fio,data?.static_id||data?.submitter_static,data?.status?`Статус: ${data.status}`:'',data?.fund_amount!=null?`Фонд: ${data.fund_amount} ₽`:''].filter(Boolean).join('\n');
 await queue(db,route,spec.table,row.id,{embeds:[{title,description:summary.slice(0,3800)||'Подробности в приложенном файле.',footer:{text:`${spec.table}: ${row.id}`}}],_document:{name:`${route}-${row.id}.txt`,text:document}});
 }
}
export async function deliveryStatus(db,row,status,messageId,code){
 const done=status==='sent',failed=['failed','uncertain'].includes(status);if(!done&&!failed)return;
 if(row.entity_type==='report_send_requests')await db.query('UPDATE report_send_requests SET status=$1,message=$2,ds_message_id=$3,processed_at=now() WHERE id=$4',[done?'done':'error',code,messageId,row.entity_id]);
 if(['payroll_send_requests','vp_report_requests','test_result_requests'].includes(row.entity_type)){
 const table=row.entity_type;await db.query(`UPDATE ${table} SET status=$1,message=$2,processed_at=now() WHERE id=$3`,[done?'sent':'error',code,row.entity_id]);
 }
}
