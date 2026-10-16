import {fail} from './security.mjs';
export async function validateSubmission(db,name,args){
 if(!name.startsWith('submit_'))return;
 const kind=args.p_kind;
 const {rows:[form]}=name==='submit_request'?await db.query('SELECT * FROM request_forms WHERE id=$1',[kind]):name==='submit_supply_request'?await db.query('SELECT * FROM supply_form WHERE id=1'):await db.query('SELECT * FROM complaint_form WHERE id=1');
 if(!form||form.enabled===false)fail(400,'Форма недоступна');
 const fio=args.p_fio??args.p_submitter_fio,stat=args.p_static??args.p_submitter_static;
 if(typeof fio!=='string'||fio.trim().length<2||fio.length>150)fail(400,'Укажите ФИО');
 if(!/^\d{3}-\d{3}$/.test(stat||''))fail(400,'Статик: 000-000');
 const values=args.p_values;if(!values||typeof values!=='object'||Array.isArray(values))fail(400,'Неверные поля формы');
 for(const f of form.fields||[]){if(f.show_if&&!values[f.show_if])continue;const v=values[f.key];if(f.required&&(v===undefined||v===null||v===false||String(v).trim()===''))fail(400,'Заполните: '+f.label);if(v===undefined||v===null||v==='')continue;
 if(typeof v==='object'||String(v).length>10000)fail(400,'Некорректное поле: '+f.label);
 if(f.type==='select'&&Array.isArray(f.options)&&f.options.length&&!f.options.includes(v))fail(400,'Выберите значение: '+f.label);
 if(f.type==='url'){try{if(!['http:','https:'].includes(new URL(v).protocol))throw Error();}catch{fail(400,'Некорректная ссылка: '+f.label);}}
 if(f.type==='number'&&!Number.isFinite(Number(v)))fail(400,'Некорректное число: '+f.label);
 }
 if(values.from_date&&values.to_date&&values.from_date>values.to_date)fail(400,'Дата окончания раньше начала');
}
