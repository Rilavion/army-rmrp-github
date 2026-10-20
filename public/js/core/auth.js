window.VSRF_AUTH=(function(){
  const state={client:null,user:null,ready:false,available:false,staticEnabled:false};
  const listeners=[];

  function emit(){listeners.forEach(fn=>{try{fn(state)}catch(e){}})}
  function onChange(fn){listeners.push(fn);fn(state);return()=>{const i=listeners.indexOf(fn);if(i>=0) listeners.splice(i,1)}}

  async function init(){
    try{const r=await fetch('/api/v1/accounts/config');const payload=await r.json();state.staticEnabled=payload.data?.enabled===true;}catch{}
    const cfg=window.SUPABASE_CONFIG;
    if(!cfg||!cfg.url||!cfg.anonKey||!window.supabase){
      state.available=false;state.ready=true;emit();
      wireButtons();updateUI();
      return;
    }
    try{
      state.client=window.supabase.createClient(cfg.url,cfg.anonKey);
      state.available=true;
      const {data}=await state.client.auth.getSession();
      state.user=data&&data.session?data.session.user:null;
      state.client.auth.onAuthStateChange((_ev,session)=>{
        state.user=session?session.user:null;emit();updateUI();
      });
      state.ready=true;emit();
    }catch(e){
      state.available=false;state.ready=true;emit();
    }
    wireButtons();updateUI();
  }

  function wireButtons(){
    document.querySelectorAll("[data-open-login]").forEach(b=>{
      if(b.__vsrfWired) return;b.__vsrfWired=1;
      b.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();
        if(state.user) return signOut();
        openModal();
      });
    });
    document.querySelectorAll(".login-btn").forEach(b=>{
      if(b.__vsrfWired) return;b.__vsrfWired=1;
      b.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();
        if(state.user) return signOut();
        openModal();
      });
    });
  }

  async function signOut(){
    if(!state.available||!state.client) return;
    try{await state.client.auth.signOut()}catch(e){}
  }

  function updateUI(){
    document.querySelectorAll(".login-btn").forEach(b=>{
      const label=b.querySelector("span");
      if(state.user){
        if(label) label.textContent="Выйти";
        b.setAttribute("data-logged","1");
        b.title=state.user.user_metadata?.display_name||state.user.static_id||"Выйти";
      }else{
        if(label) label.textContent="Войти";
        b.removeAttribute("data-logged");
        b.title="Войти";
      }
    });
    document.querySelectorAll(".admin-only").forEach(el=>{
      el.style.display=state.user?"":"none";
    });
  }

  function openModal(){location.href='account.html';}
  function closeModal(){}

  async function submitLogin(static_id,password){
    if(!state.available||!state.client) return {ok:false,error:"Авторизация недоступна"};
    try{
      const {data,error}=await state.client.auth.signInWithPassword({static_id,password});
      if(error) return {ok:false,error:error.message};
      if(!data?.session)return {ok:false,error:data?.status==='pending'?'Заявка ожидает проверки':'Заявка отклонена'};
      state.user=data.user;emit();updateUI();
      return {ok:true};
    }catch(e){return {ok:false,error:e.message||"Ошибка входа"}}
  }

  function bootAuth(){
    if(window.supabase||!document.querySelector('script[src*="supabase-loader"]')){
      init();
    }else{
      window.addEventListener("vsrf-supabase-loaded",()=>init(),{once:true});
      setTimeout(()=>{if(!state.ready) init()},4000);
    }
  }

  document.addEventListener("DOMContentLoaded",bootAuth);

  return {onChange,openModal,closeModal,submitLogin,signOut,state};
})();
