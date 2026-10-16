import {randomInt} from 'node:crypto';
import {hash,token,text,uuid,fail} from './security.mjs';
import {can,need} from './policy.mjs';
import {transaction,queue,audit} from './db.mjs';
function shuffle(input){const a=[...input];for(let i=a.length-1;i>0;i--){const j=randomInt(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
export function publicQuestion(q){const {correct,...safe}=q;return safe;}
export function grade(qs,answers){let score=0,total=0;for(const q of qs){if(q.kind==='prefilled')continue;const points=Number(q.points)||1;total+=points;const a=answers?.[q.id],correct=q.correct||[];let ok=false;if(q.kind==='single')ok=correct.length===1&&a===correct[0];else if(q.kind==='order')ok=Array.isArray(a)&&a.length===correct.length&&a.every((v,i)=>v===correct[i]);else if(q.kind==='multi')ok=Array.isArray(a)&&new Set(a).size===a.length&&a.length===correct.length&&a.every(v=>correct.includes(v));if(ok)score+=points;}return {score,total,max_score:total,percent:total?Math.round(score*100/total):0};}
export async function examRPC(db,user,name,args){
 const names=['cgb_test_preview','cgb_start_test','cgb_finish_test','count_test_attempts','check_test_blocked','request_test_result','army_complete_lesson','army_reset_attempts'];
 if(!names.includes(name))return {handled:false};
 const done=data=>({handled:true,data});
 if(name==='cgb_test_preview'){const {rows:[t]}=await db.query('SELECT * FROM tests WHERE id=$1',[uuid(args.p_test_id)]);if(!t||!t.published&&!can(user,'tests','edit'))fail(404,'Тест не опубликован');return done((await db.query('SELECT id,kind,points FROM test_questions WHERE test_id=$1 ORDER BY sort',[t.id])).rows);}
 if(!user)fail(401,'Войдите в аккаунт, выданный администратором. Попытки привязаны к аккаунту.');
 if(name==='army_reset_attempts'){need(user,'tests','reset_attempts');const id=uuid(args.test_id),reason=text(args.reason,5,500);if(!args.static_id&&!args.discord)fail(400,'Укажите сотрудника');return done(await transaction(db,async c=>{await c.query('SELECT id FROM tests WHERE id=$1 FOR UPDATE',[id]);const r=await c.query('UPDATE exam_runs SET invalidated=true WHERE test_id=$1 AND NOT invalidated AND (static_id=$2 OR discord=$3) RETURNING result_id',[id,args.static_id||'',args.discord||'']);for(const x of r.rows)if(x.result_id)await c.query('UPDATE test_attempts SET invalidated=true WHERE id=$1',[x.result_id]);await audit(c,user,'reset_attempts','test',id,{reason,count:r.rows.length});return {count:r.rows.length};}));}
 if(name==='army_complete_lesson'){const id=uuid(args.lesson_id);await db.query('INSERT INTO lesson_completions(user_id,lesson_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[user.id,id]);return done({ok:true});}
 if(name==='count_test_attempts'){return done((await db.query('SELECT count(*)::int n FROM exam_runs WHERE test_id=$1 AND NOT invalidated AND (user_id=$2 OR static_id=$3 OR discord=$4)',[uuid(args.p_test_id),user.id,args.p_static||'',args.p_discord||''])).rows[0].n);}
 if(name==='check_test_blocked'){return done((await db.query('SELECT reason FROM test_blocks WHERE (test_id=$1 OR test_id IS NULL) AND value IN ($2,$3) LIMIT 1',[uuid(args.p_test_id),args.p_static||'',args.p_discord||''])).rows[0]?.reason||null);}
 if(name==='request_test_result'){need(user,'tests','stats');const {rows:[r]}=await db.query('SELECT * FROM test_attempts WHERE id=$1 AND NOT invalidated',[uuid(args.p_attempt_id)]);if(!r)fail(404,'Попытка не найдена');await queue(db,'exams','test_attempt',r.id,embed(r));return done(r.id);}
 if(name==='cgb_start_test')return done(await transaction(db,async c=>{
  const fio=text(args.p_fio,3,120),stat=text(args.p_static,7,7),discord=text(args.p_discord,2,100);if(!/^\d{3}-\d{3}$/.test(stat))fail(400,'Статик: 000-000');
  const {rows:[t]}=await c.query('SELECT * FROM tests WHERE id=$1 AND published FOR UPDATE',[uuid(args.p_test_id)]);if(!t)fail(404,'Тест недоступен');
  const blocked=(await c.query('SELECT reason FROM test_blocks WHERE (test_id=$1 OR test_id IS NULL) AND value IN ($2,$3)',[t.id,stat,discord])).rows[0];if(blocked)fail(403,blocked.reason||'Прохождение заблокировано');
  const count=(await c.query('SELECT count(*)::int n FROM exam_runs WHERE test_id=$1 AND NOT invalidated AND (user_id=$2 OR static_id=$3 OR discord=$4)',[t.id,user.id,stat,discord])).rows[0].n;
  if(count>=(t.max_attempts>0?t.max_attempts:100))fail(409,'Лимит попыток исчерпан. Смена данных персонажа не сбрасывает лимит аккаунта');
  let qs=(await c.query('SELECT * FROM test_questions WHERE test_id=$1 ORDER BY sort',[t.id])).rows;if(!qs.length)fail(409,'Нет вопросов');const pre=qs.filter(q=>q.kind==='prefilled');qs=qs.filter(q=>q.kind!=='prefilled');if(t.shuffle_questions)qs=shuffle(qs);if(t.questions_per_run>0)qs=qs.slice(0,t.questions_per_run);qs=[...pre,...qs];
  for(const q of qs){if(!['single','multi','order','prefilled'].includes(q.kind))fail(409,'Некорректный тип вопроса');if(q.kind==='order')q.options=shuffle(q.options);}
  const secret=token();const {rows:[r]}=await c.query("INSERT INTO exam_runs(user_id,test_id,token_hash,fio,static_id,discord,questions,pass_score,deadline) VALUES($1,$2,$3,$4,$5,$6,$7,$8,now()+$9*interval '1 minute') RETURNING started_at,deadline",[user.id,t.id,hash(secret),fio,stat,discord,JSON.stringify(qs),t.pass_score,Math.min(180,Math.max(1,t.time_limit_minutes||60))]);return {token:secret,questions:qs.map(publicQuestion),started_at:r.started_at,expires_at:r.deadline};
 }));
 return done(await transaction(db,async c=>{
  const {rows:[r]}=await c.query('SELECT *,now() server_now FROM exam_runs WHERE token_hash=$1 AND user_id=$2 FOR UPDATE',[hash(args.p_token||''),user.id]);if(!r)fail(403,'Попытка не принадлежит аккаунту');if(r.invalidated)fail(409,'Попытка аннулирована');if(r.result_id){const a=(await c.query('SELECT * FROM test_attempts WHERE id=$1',[r.result_id])).rows[0];return {...a,percent:Number(a.percent),max_score:a.total};}
  const result=grade(r.questions,args.p_answers),expired=new Date(r.server_now)>new Date(r.deadline);if(expired){result.score=0;result.percent=0;}const passed=!expired&&result.percent>=r.pass_score;
  const {rows:[a]}=await c.query('INSERT INTO test_attempts(test_id,user_id,fio,static_id,discord,answers,score,total,percent,passed,started_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *',[r.test_id,user.id,r.fio,r.static_id,r.discord,JSON.stringify(args.p_answers||{}),result.score,result.total,result.percent,passed,r.started_at]);await c.query('UPDATE exam_runs SET finished_at=now(),result_id=$1 WHERE id=$2',[a.id,r.id]);await queue(c,'exams','test_attempt',a.id,embed(a));await audit(c,user,'submit','test_attempt',a.id);return {...a,percent:Number(a.percent),max_score:a.total,expired};
 }));
}
function embed(r){return {embeds:[{title:r.passed?'Экзамен сдан':'Экзамен не сдан',description:`${r.fio}\nРезультат: ${r.percent}%`,footer:{text:`Попытка ${r.id}`}}],allowed_mentions:{parse:[]}};}
