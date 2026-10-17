/* Local API facade for the original Army modules. No cloud credentials or SDK. */
(function(){
 const listeners=new Set();let current=null;
 async function call(path,body,method='POST'){
  try{const r=await fetch('/api/v1'+path,{method,credentials:'same-origin',headers:body!==undefined?{'Content-Type':'application/json'}:{},body:body!==undefined?JSON.stringify(body):undefined});const result=await r.json();return result;}catch(e){return {data:null,error:{message:'Нет связи с сервером'}};}
 }
 function emit(event){for(const fn of listeners)try{fn(event,current?{user:current}:null);}catch{}}
 class Query{
  constructor(table){this.spec={table,action:'select',filters:[],orders:[],or:[]};}
  select(columns='*',options={}){this.spec.select=columns;this.spec.returning=true;this.spec.countExact=options.count==='exact';this.spec.head=!!options.head;return this;}
  insert(body){this.spec.action='insert';this.spec.body=body;return this;}
  upsert(body,options={}){this.spec.action='upsert';this.spec.body=body;this.spec.onConflict=options.onConflict;return this;}
  update(body){this.spec.action='update';this.spec.body=body;return this;}
  delete(){this.spec.action='delete';return this;}
  eq(column,value){return this.filter(column,'eq',value)} neq(column,value){return this.filter(column,'neq',value)}
  gt(column,value){return this.filter(column,'gt',value)} gte(column,value){return this.filter(column,'gte',value)}
  lt(column,value){return this.filter(column,'lt',value)} lte(column,value){return this.filter(column,'lte',value)}
  in(column,value){return this.filter(column,'in',value)} is(column,value){return this.filter(column,'is',value)}
  not(column,op,value){return this.filter(column,'not.'+op,value)} contains(column,value){return this.filter(column,'contains',value)}
  filter(column,op,value){this.spec.filters.push({column,op,value});return this;}
  match(values){for(const [k,v] of Object.entries(values))this.eq(k,v);return this;}
  or(expression){this.spec.or.push(expression);return this;}
  order(column,options={}){this.spec.orders.push({column,...options});return this;}
  limit(n){this.spec.limit=n;return this;} range(from,to){this.spec.range={from,to};return this;}
  single(){this.mode='single';return this;} maybeSingle(){this.mode='maybe';return this;}
  then(resolve,reject){return call('/db/query',this.spec).then(r=>{if(this.mode&&!r.error){const rows=r.data||[];if(rows.length>1||(this.mode==='single'&&!rows.length))return {data:null,error:{message:'Запись не найдена или неоднозначна'}};r.data=rows[0]||null;}return r;}).then(resolve,reject);}
 }
 const auth={
  async getSession(){const r=await call('/auth/session',undefined,'GET');current=r.data?.session?.user||null;return r;},
  async getUser(){await this.getSession();return {data:{user:current},error:null};},
  async signInWithPassword(b){const r=await call('/auth/login',b);if(!r.error){current=r.data.user;emit('SIGNED_IN');}return r;},
  async signOut(){const r=await call('/auth/logout',{});current=null;emit('SIGNED_OUT');return r;},
  onAuthStateChange(fn){listeners.add(fn);return {data:{subscription:{unsubscribe:()=>listeners.delete(fn)}}};},
  updateUser:body=>call('/auth/user',body,'PATCH'),
  signUp:()=>Promise.resolve({data:null,error:{message:'Аккаунты создаёт администратор в личном кабинете'}}),
  admin:{createUser:body=>call('/auth/admin/users',body),listUsers:()=>call('/auth/admin/users',undefined,'GET'),deleteUser:id=>call('/auth/admin/users/'+encodeURIComponent(id),undefined,'DELETE')}
 };
 function channel(){let timer,stopped=false,running=false;const callbacks=[];async function poll(){if(stopped||running||document.hidden)return;running=true;try{for(const item of callbacks){if(!item.table)continue;const result=await call('/db/query',{table:item.table,action:'select',select:'*',limit:1000,filters:[],orders:[],or:[]});if(result.error)continue;const signature=JSON.stringify(result.data);if(item.signature!==undefined&&item.signature!==signature)item.fn({eventType:'REFRESH'});item.signature=signature;}}finally{running=false;}}return {on(event,filter,fn){callbacks.push({table:filter?.table,fn});return this;},subscribe(fn){poll();timer=setInterval(poll,30000);fn?.('SUBSCRIBED');return this;},unsubscribe(){stopped=true;clearInterval(timer);}};}
 const client={auth,from:table=>new Query(table),rpc:(name,args={})=>call('/db/rpc/'+encodeURIComponent(name),args),channel,removeChannel:c=>c.unsubscribe(),
 storage:{from:bucket=>({getPublicUrl:name=>({data:{publicUrl:location.origin+'/media/'+encodeURIComponent(bucket)+'/'+name.split('/').map(encodeURIComponent).join('/')}}),async upload(name,file,options={}){const r=await fetch('/api/v1/storage/'+encodeURIComponent(bucket)+'/'+name.split('/').map(encodeURIComponent).join('/')+'?upsert='+!!options.upsert,{method:'PUT',credentials:'same-origin',headers:{'Content-Type':file.type},body:file});return r.json();},remove:paths=>call('/storage/'+encodeURIComponent(bucket),{paths},'DELETE')})}};
 window.supabase={createClient:()=>client};window.VSRF_API={call};
})();
