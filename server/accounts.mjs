import {rateLimit} from 'express-rate-limit';
import {passwordHash,verifyPassword,token,fail,text,uuid} from './security.mjs';
import {transaction,audit} from './db.mjs';
import {need,can} from './policy.mjs';
import {identityPhoto} from './identity-photo.mjs';

export function strictStatic(value){
  if(typeof value!=='string'||value.length!==7||!/^\d{3}-\d{3}$/.test(value))fail(400,'Статик: ровно 6 цифр в формате 000-000');
  return value;
}
// Review permission is not a permission to delegate account/role administration.
export function assignable(actor,role){
  if(!role||role.key==='admin'||!['user','ss'].includes(role.base_role))return false;
  if(actor.role==='admin')return true;
  if(role.base_role==='ss'&&actor.role!=='ss')return false;
  return Object.entries(role.permissions||{}).every(([section,actions])=>
    Object.entries(actions||{}).every(([action,on])=>on!==true||
      (!['lk','integrations','registration'].includes(section)&&can(actor,section,action))));
}
export async function accounts(app,db,{enabled=false,test=false,issueSession}){
  const answer=(res,data)=>res.json({data,error:null});
  const active=(req,res,next)=>{if(!enabled)return res.status(503).json({data:null,error:{message:'Приём заявок на регистрацию ещё не подключён'}});next();};
  const limiter=rateLimit({windowMs:900000,limit:test?1000:15,standardHeaders:true,legacyHeaders:false});
  const registerLimiter=rateLimit({windowMs:3600000,limit:test?1000:5,standardHeaders:true,legacyHeaders:false});
  const dummy=await passwordHash(token());
  app.get('/api/v1/accounts/config',(req,res)=>answer(res,{enabled}));
  app.post('/api/v1/accounts/register',active,registerLimiter,async(req,res)=>{
    const b=req.body||{},staticId=strictStatic(b.static_id),name=text(b.display_name,3,120);
    const position=text(b.position,2,120),militaryRank=text(b.military_rank,2,80),discord=text(b.discord,2,80);
    if(/[\s<>]/.test(discord))fail(400,'Discord: укажите имя пользователя или числовой ID без пробелов');
    if(['role','custom_role_id','permissions','status'].some(k=>k in b))fail(400,'Роль назначает проверяющий');
    const password=await passwordHash(b.password);
    const photo=await identityPhoto(b.udo_photo);
    await transaction(db,async c=>{
      if((await c.query('SELECT 1 FROM users WHERE static_id=$1',[staticId])).rows.length)fail(409,'Этот статик уже зарегистрирован');
      const {rows:[r]}=await c.query(`INSERT INTO registration_requests(static_id,display_name,password_hash,position,military_rank,discord)
        VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(static_id) DO NOTHING RETURNING id`,[staticId,name,password,position,militaryRank,discord]);
      if(!r)fail(409,'Заявка для этого статика уже существует. Войдите, чтобы проверить её статус');
      await c.query('INSERT INTO registration_identity_documents(request_id,image) VALUES($1,$2)',[r.id,photo]);
      await audit(c,null,'registration_submit','registration',r.id);
    });
    answer(res,{status:'pending'});
  });
  // A single static-only handler and shared rate limiter, including the legacy API path.
  app.post(['/api/v1/accounts/login','/api/v1/auth/login'],limiter,async(req,res)=>{
    if(req.body?.email!==undefined)fail(400,'Вход по почте отключён. Используйте статик 000-000');
    const staticId=strictStatic(req.body?.static_id);
    const {rows:[u]}=await db.query('SELECT u.* FROM users u JOIN user_roles r ON r.user_id=u.id WHERE u.static_id=$1',[staticId]);
    if(u){
      const valid=await verifyPassword(req.body.password,u.password_hash||dummy);
      if(!valid||u.disabled)fail(401,'Неверный статик или пароль, либо доступ закрыт');
      return issueSession(res,u);
    }
    const {rows:[r]}=await db.query('SELECT status,review_note,password_hash FROM registration_requests WHERE static_id=$1',[staticId]);
    const valid=await verifyPassword(req.body.password,r?.password_hash||dummy);
    if(!r||!valid||r.status==='approved')fail(401,'Неверный статик или пароль, либо доступ закрыт');
    // A pending/rejected applicant receives no portal session and no other applicant data.
    answer(res,{status:r.status,review_note:r.review_note});
  });
  app.get('/api/v1/accounts/review',active,async(req,res)=>{
    need(req.user,'registration','review');
    const status=req.query.status||'pending';if(!['pending','approved','rejected'].includes(status))fail(400,'Неверный статус');
    const rows=(await db.query(`SELECT r.id,r.static_id,r.display_name,r.position,r.military_rank,r.discord,r.status,r.review_note,r.created_at,r.reviewed_at,
      EXISTS(SELECT 1 FROM registration_identity_documents d WHERE d.request_id=r.id) has_udo,
      c.name assigned_role FROM registration_requests r LEFT JOIN user_roles ur ON ur.user_id=r.user_id
      LEFT JOIN custom_roles c ON c.id=ur.custom_role_id WHERE r.status=$1 ORDER BY r.created_at DESC LIMIT 200`,[status])).rows;
    const roles=(await db.query('SELECT id,key,name,base_role,permissions FROM custom_roles ORDER BY sort,name')).rows
      .filter(r=>assignable(req.user,r)).map(({id,name})=>({id,name}));
    answer(res,{requests:rows,roles});
  });
  app.get('/api/v1/accounts/review/:id/udo',active,async(req,res)=>{
    need(req.user,'registration','review');
    const {rows:[photo]}=await db.query('SELECT image FROM registration_identity_documents WHERE request_id=$1',[uuid(req.params.id)]);
    if(!photo)fail(404,'Фото УДО не приложено');
    res.set({'Content-Type':'image/jpeg','Content-Disposition':'inline; filename="udo.jpg"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    res.send(Buffer.from(photo.image));
  });
  app.post('/api/v1/accounts/review/:id',active,async(req,res)=>{
    need(req.user,'registration','review');
    const id=uuid(req.params.id),b=req.body||{};
    if(!['approve','reject'].includes(b.decision))fail(400,'Укажите решение');
    const note=text(b.note||'',b.decision==='reject'?3:0,1000);
    await transaction(db,async c=>{
      // Refresh and lock both the reviewer account and its current role during the decision.
      const {rows:[actor]}=await c.query(`SELECT u.id,u.disabled,ur.role,ur.custom_role_id FROM users u
        JOIN user_roles ur ON ur.user_id=u.id WHERE u.id=$1 FOR SHARE OF u,ur`,[req.user.id]);
      if(!actor||actor.disabled)fail(403,'Доступ закрыт');
      const {rows:[actorRole]}=await c.query(`SELECT permissions FROM custom_roles
        WHERE id=$1 OR ($1::uuid IS NULL AND key=$2) FOR SHARE`,[actor.custom_role_id,actor.role]);
      actor.permissions=actorRole?.permissions||{};need(actor,'registration','review');
      const {rows:[r]}=await c.query('SELECT * FROM registration_requests WHERE id=$1 FOR UPDATE',[id]);
      if(!r)fail(404,'Заявка не найдена');if(r.status!=='pending')fail(409,'Заявка уже рассмотрена. Обновите список');
      let userId=null;
      if(b.decision==='approve'){
        if(!r.position||!r.military_rank||!r.discord||!(await c.query('SELECT 1 FROM registration_identity_documents WHERE request_id=$1',[id])).rows.length)
          fail(409,'В заявке не заполнены должность, звание, Discord или фото УДО. Сначала дополните данные');
        const {rows:[role]}=await c.query('SELECT * FROM custom_roles WHERE id=$1 FOR SHARE',[uuid(b.custom_role_id)]);
        if(!assignable(actor,role))fail(403,'Нельзя назначить эту роль: она превышает ваши права или управляет доступом');
        const {rows:[u]}=await c.query(`INSERT INTO users(email,static_id,password_hash,password_reset_required,user_metadata)
          VALUES($1,$2,$3,false,$4) RETURNING id`,[r.static_id+'@accounts.vsrf.invalid',r.static_id,r.password_hash,JSON.stringify({display_name:r.display_name,position:r.position,military_rank:r.military_rank,discord:r.discord})]);
        userId=u.id;
        await c.query('INSERT INTO user_roles(user_id,role,custom_role_id,display_name) VALUES($1,$2,$3,$4)',[u.id,role.base_role,role.id,r.display_name]);
      }
      await c.query(`UPDATE registration_requests SET status=$2,review_note=$3,reviewed_by=$4,reviewed_at=now(),user_id=$5,
        password_hash=CASE WHEN $5::uuid IS NOT NULL THEN NULL ELSE password_hash END WHERE id=$1`,
        [id,b.decision==='approve'?'approved':'rejected',note,actor.id,userId]);
      await audit(c,actor,'registration_'+b.decision,'registration',id,{user_id:userId,custom_role_id:userId?b.custom_role_id:null});
    });
    answer(res,{ok:true});
  });
  // Administrators may prepare reviewer roles even while public registration is disabled.
  app.post('/api/v1/accounts/reviewer-roles/:id',async(req,res)=>{
    if(!req.user)fail(401,'Войдите');if(req.user.role!=='admin')fail(403,'Только администратор');
    if(typeof req.body?.enabled!=='boolean')fail(400,'Укажите состояние права');
    await transaction(db,async c=>{
      const r=await c.query(`UPDATE custom_roles SET permissions=jsonb_set(permissions,'{registration}',
        jsonb_build_object('review',$2::boolean)),updated_at=now() WHERE id=$1 AND key<>'admin' AND base_role<>'admin' RETURNING id`,[uuid(req.params.id),req.body.enabled]);
      if(!r.rowCount)fail(403,'Роль не найдена или защищена');
      await audit(c,req.user,'registration_review_permission','custom_role',req.params.id,{enabled:req.body.enabled});
    });
    answer(res,{ok:true});
  });
}
