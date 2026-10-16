import {fail} from './security.mjs';
export const sections={applications:'apps',apps_settings:'apps',complaints:'complaints',complaint_history:'complaints',complaint_form:'complaints',requests:'requests',request_forms:'requests',requests_settings:'requests',violations_registry:'registry',violations_history:'registry',violations_settings:'registry',vp_checks:'vp',vp_settings:'vp',vp_role_mapping:'vp',vp_reports:'vp',vp_archive:'vp_archive',vp_report_requests:'vp_archive',vp_request_forms:'vp_request',report_forms:'report',report_send_requests:'report',payroll_drafts:'payroll',payroll_archive:'payroll',payroll_settings:'payroll',payroll_send_requests:'payroll',supply_form:'supply',supply_requests:'supply',supply_entries:'supply',supply_rescan_requests:'supply',test_categories:'tests',tests:'tests',test_questions:'tests',test_attempts:'tests',test_blocks:'tests',test_ping_lines:'tests',test_result_requests:'tests',news:'news',faq:'faq',info_page:'info',ustavy:'ustav',composition:'composition',vehicles:'autopark',learn_materials:'learn',train_categories:'training',train_lessons:'training',holiday_state:'site',site_data:'site',raids_events:'raids',raids_settings:'raids',ds_members:'vp',ds_roles:'vp',ds_guild_roles:'vp',ds_channels:'site',ds_sync_requests:'vp',bot_status:'site',bot_messages:'messages'};
const publicRead=new Set(['news','faq','info_page','ustavy','vehicles','learn_materials','train_categories','train_lessons','holiday_state','test_categories','tests','request_forms','complaint_form','supply_form','test_ping_lines']);
export function can(user,section,action){return !!user&&(user.role==='admin'||user.permissions?.[section]?.[action]===true);}
export function need(user,section,action){if(!user)fail(401,'Войдите в аккаунт');if(!can(user,section,action))fail(403,'Недостаточно прав: '+section+'/'+action);}
export function authorize(user,spec){
 if(!['select','insert','upsert','update','delete'].includes(spec.action))fail(400,'Неизвестная операция');
 const read=spec.action==='select',table=spec.table;
 if(['user_roles','custom_roles'].includes(table)){
  if(!user)fail(401,'Войдите в аккаунт');
  if(read){if(table==='user_roles'&&user.role!=='admin')spec.filters.push({column:'user_id',op:'eq',value:user.id});return;}
  need(user,'lk','roles');if(user.role!=='admin')fail(403,'Ролями управляет администратор');
  if(table==='user_roles'&&spec.action!=='delete')fail(403,'Назначайте роль через защищённую операцию');return;
 }
 const section=sections[table];if(!section)fail(404,'Таблица недоступна');
 if(read&&publicRead.has(table)){if(table==='tests'&&!can(user,'tests','edit'))spec.filters.push({column:'published',op:'eq',value:true});return;}
 if(table==='test_questions'){need(user,'tests','edit');return;}
 if(table==='test_attempts'){need(user,'tests',read?'stats':'reset_attempts');if(!read&&!['delete','update'].includes(spec.action))fail(403,'Результат создаёт сервер');return;}
 if(table==='site_data'){if(!read)need(user,'site','edit');else if(!user)fail(401,'Войдите в аккаунт');return;}
 const overrides={complaint_form:'form_edit',complaints:'review',complaint_history:'review',requests:'review',test_blocks:'reset_attempts',test_result_requests:'edit',supply_requests:'replace',supply_entries:'replace',supply_form:'admin',supply_rescan_requests:'admin',report_send_requests:'submit',vp_report_requests:'send',payroll_send_requests:'send',bot_messages:'send'};
 const action=read?'view':overrides[table]||(/_settings$|_forms$|_mapping$/.test(table)?'settings':spec.action==='delete'?'delete':'edit');
 if(read&&['test_result_requests','test_attempts'].includes(table)){need(user,'tests','stats');return;}
 need(user,section,action);
}
