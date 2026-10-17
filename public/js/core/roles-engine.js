window.VSRF_ROLES=(function(){
  let myRole=null;
  let myPermissions={};
  let myCustomRole=null;
  const listeners=[];

  function waitReady(timeoutMs){
    return new Promise(resolve=>{
      const deadline=Date.now()+(timeoutMs||5000);
      function check(){
        const s=window.VSRF_AUTH&&window.VSRF_AUTH.state;
        if(s&&s.ready){resolve(s);return true}
        return false;
      }
      if(check()) return;
      const t=setInterval(()=>{
        if(check()){clearInterval(t);return}
        if(Date.now()>deadline){clearInterval(t);resolve(window.VSRF_AUTH&&window.VSRF_AUTH.state||null)}
      },80);
      if(window.VSRF_AUTH&&window.VSRF_AUTH.onChange){
        window.VSRF_AUTH.onChange(st=>{if(st&&st.ready){clearInterval(t);resolve(st)}});
      }
    });
  }

  let loading=null;
  function loadMyRole(){if(loading)return loading;loading=loadRole().finally(()=>loading=null);return loading;}
  async function loadRole(){
    await waitReady(5000);
    const s=window.VSRF_AUTH&&window.VSRF_AUTH.state;
    if(!s||!s.user||!s.client){
      myRole=null;myPermissions={};myCustomRole=null;
      console.log("[VSRF_ROLES] Нет клиента/пользователя. auth.state =",s);
      emit();apply();return null;
    }
    console.log("[VSRF_ROLES] Загружаем роль для user_id =",s.user.id,"email =",s.user.email);
    try{
      const {data,error}=await s.client.from("user_roles").select("role,display_name,custom_role_id").eq("user_id",s.user.id).maybeSingle();
      if(error){
        console.error("[VSRF_ROLES] Ошибка запроса:",error.message,error);
        myRole=null;myPermissions={};myCustomRole=null;
      }else{
        myRole=data?data.role:null;
        const displayName=data?data.display_name:null;
        if(displayName) try{localStorage.setItem("vsrf-my-display-name",displayName)}catch(e){}
        if(data&&data.custom_role_id){
          try{
            const {data:cr}=await s.client.from("custom_roles").select("*").eq("id",data.custom_role_id).maybeSingle();
            if(cr){myCustomRole=cr;myPermissions=cr.permissions||{}}
          }catch(e){}
        } else if(myRole){
          try{
            const {data:cr}=await s.client.from("custom_roles").select("*").eq("key",myRole).maybeSingle();
            if(cr){myCustomRole=cr;myPermissions=cr.permissions||{}}
          }catch(e){}
        } else {myCustomRole=null;myPermissions={}}
        console.log("[VSRF_ROLES] ✓ Роль:",myRole,"custom:",myCustomRole&&myCustomRole.name);
      }
    }catch(e){
      console.error("[VSRF_ROLES] Исключение:",e.message);
      myRole=null;myPermissions={};myCustomRole=null;
    }
    emit();
    apply();
    return myRole;
  }

  function apply(){
    document.body.classList.toggle("vsrf-is-admin",myRole==="admin");
    document.body.classList.toggle("vsrf-is-ss",myRole==="ss");
    document.body.classList.toggle("vsrf-is-staff",myRole==="admin"||myRole==="ss");
    const s=window.VSRF_AUTH&&window.VSRF_AUTH.state;
    document.body.classList.toggle("vsrf-is-logged",!!(s&&s.user));
    applyPermGates();
  }

  function applyPermGates(){
    document.querySelectorAll("[data-perm]").forEach(el=>{
      const raw=el.getAttribute("data-perm");
      if(!raw){el.style.display="";return}
      const parts=raw.split(",").map(p=>p.trim()).filter(Boolean);
      let allowed=false;
      for(const p of parts){
        const [sec,act]=p.split(":").map(x=>x.trim());
        if(!sec) continue;
        if(can(sec,act||"view")){allowed=true;break}
      }
      if(!allowed){
        el.style.setProperty("display","none","important");
        el.setAttribute("aria-hidden","true");
      } else {
        el.style.removeProperty("display");
        el.removeAttribute("aria-hidden");
      }
    });
  }

  function getMyRole(){return myRole}
  function getMyCustomRole(){return myCustomRole}
  function getMyPermissions(){return myPermissions}
  function isAdmin(){return myRole==="admin"}
  function isSS(){return myRole==="ss"}
  function isStaff(){return myRole==="admin"||myRole==="ss"}
  function can(section,action){
    if(myRole==="admin") return true;
    const sec=myPermissions[section];
    if(!sec) return false;
    if(action==null) return !!sec.view;
    return !!sec[action];
  }

  async function listCustomRoles(){
    const s=window.VSRF_AUTH.state;
    if(!s||!s.client) return [];
    const {data}=await s.client.from("custom_roles").select("*").order("sort",{ascending:true});
    return data||[];
  }
  function onChange(fn){listeners.push(fn);fn(myRole);return()=>{const i=listeners.indexOf(fn);if(i>=0) listeners.splice(i,1)}}
  function emit(){listeners.forEach(fn=>{try{fn(myRole)}catch(e){}})}

  // ==== Управление ролями (только для админа) ====
  async function listAllRoles(){
    const s=window.VSRF_AUTH.state;
    if(!s.client) return [];
    const {data,error}=await s.client.from("user_roles").select("*").order("created_at",{ascending:false});
    if(error){console.warn("[VSRF_ROLES] list:",error.message);return []}
    return data||[];
  }

  async function setRole(userId,role,displayName,customRoleId){
    const s=window.VSRF_AUTH.state;
    if(!s.client) return {ok:false,error:"no client"};
    try{
      const {error}=await s.client.rpc("staff_upsert_role",{
        p_user_id:userId,
        p_role:role,
        p_display_name:displayName||null,
        p_custom_role_id:customRoleId||null
      });
      if(!error) return {ok:true};
      return {ok:false,error:error.message};
    }catch(e){return {ok:false,error:e.message}}
  }

  async function removeUser(userId){
    const s=window.VSRF_AUTH.state;
    if(!s.client) return {ok:false,error:"no client"};
    const {error}=await s.client.from("user_roles").delete().eq("user_id",userId);
    if(error) return {ok:false,error:error.message};
    return {ok:true};
  }

  // ==== Создание нового пользователя ====
  // Через обычный signUp — новому юзеру приходит confirm-email, потом админ ему проставляет роль.
  // Второй вариант — админ вручную знает user_id (из auth.users) и вызывает setRole.
  async function inviteAndSetRole(email,password,role,displayName,customRoleId){
 const r=await window.VSRF_API.call('/auth/admin/users',{email,password,role:role||'user',display_name:displayName,custom_role_id:customRoleId});return r.error?{ok:false,error:r.error.message}:{ok:true,user_id:r.data.user.id};
 }
  document.addEventListener("DOMContentLoaded",()=>{
    if(window.VSRF_AUTH&&window.VSRF_AUTH.onChange){
      window.VSRF_AUTH.onChange(st=>{if(st&&st.ready) loadMyRole()});
    }
    setTimeout(loadMyRole,300);
  });

  return {loadMyRole,getMyRole,getMyCustomRole,getMyPermissions,can,isAdmin,isSS,isStaff,onChange,
          listAllRoles,setRole,removeUser,inviteAndSetRole,apply,applyPermGates,
          listCustomRoles};
})();
