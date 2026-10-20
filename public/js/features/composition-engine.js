window.VSRF_COMP=(function(){
  /* Категории (ранги) — полностью кастомные, хранятся в state.ranks.
     Дефолтного списка больше нет: администратор добавляет свои категории
     через кнопку «🗂 Категории» на странице состава. */

  /* Легаси-маппинг старых захардкоженных ключей — только для одноразовой
     миграции text-меток существующих участников (rank_label), чтобы
     карточки не «слетели» после включения кастомных категорий. */
  const LEGACY_RANK_LABELS={
    gen_maj:"Генерал-майор",gen_lt:"Генерал-лейтенант",col:"Полковник",
    lt_col:"Подполковник",maj:"Майор",capt:"Капитан",lt:"Лейтенант"
  };

  const DEFAULT_HQ_SLOTS=[
    {key:"cmd_brigade",label:"Командир бригады",badge:"Ген-Майор",tier:1,locked:true},
    {key:"first_deputy",label:"Первый заместитель",badge:"Полковник",tier:2},
    {key:"chief_staff",label:"Начальник штаба",badge:"Полковник",tier:2},
    {key:"deputy_vp_vk",label:"Зам. по ВП и ВК",badge:"Полковник",tier:2},
    {key:"deputy_sso_roio",label:"Зам. по ССО и РОиО",badge:"Полковник",tier:2},
    {key:"deputy_mch",label:"Зам. по МЧ",badge:"Полковник",tier:2},
    {key:"assistant",label:"Помощник ком. бригады",badge:"Подполковник",tier:3}
  ];

  const SUB_PRESETS={
    vp:{color:"#c94b4b",icon:"🏛"},
    vk:{color:"#4b6dc9",icon:"📋"},
    sso:{color:"#2f7a52",icon:"🚑"},
    roio:{color:"#c78a2a",icon:"🛡"},
    mch:{color:"#a34a8e",icon:"⚕"},
    default:{color:"#7a8a4a",icon:"★"}
  };

  const DEFAULT_STATE={hq_slots:JSON.parse(JSON.stringify(DEFAULT_HQ_SLOTS)),"hq":{"cmd_brigade":{"name":"","code":"","tag":"ком. бриг","photo":""},"first_deputy":{"name":"","code":"","tag":"первый зам","photo":""},"chief_staff":{"name":"","code":"","tag":"нач. штаба","photo":""},"deputy_vp_vk":{"name":"","code":"","tag":"кур. ВП и ВК","photo":""},"deputy_sso_roio":{"name":"","code":"","tag":"кур. ССО и РОиО","photo":""},"deputy_mch":{"name":"","code":"","tag":"кур. МЧ","photo":""},"assistant":{"name":"","code":"","tag":"почти полкан","photo":""}},"subs":[{"id":"vp","name":"Военная Полиция","short":"ВП","color":"#c94b4b","icon":"🛡","members":[{"rank":"lt_col","name":"","code":"","role":"Комендант гарнизона","photo":""},{"rank":"maj","name":"","code":"","role":"Ком. батальона ВП","photo":""},{"rank":"maj","name":"","code":"","role":"Зам. ком. батальона ВП","photo":""}]},{"id":"vk","name":"Военный Комиссариат","short":"ВК","color":"#4b6dc9","icon":"📋","members":[{"rank":"lt_col","name":"","code":"","role":"Военный комиссар","photo":""},{"rank":"maj","name":"","code":"","role":"Зам. ВК","photo":""},{"rank":"maj","name":"","code":"","role":"Нач. призыва","photo":""},{"rank":"maj","name":"","code":"","role":"Нач. кадров","photo":""}]},{"id":"sso","name":"Силы Специальных Операций","short":"ССО","color":"#2f7a52","icon":"⚔","members":[{"rank":"lt_col","name":"","code":"","role":"Командир ССО","photo":""},{"rank":"maj","name":"","code":"","role":"Заместитель командира ССО","photo":""},{"rank":"maj","name":"","code":"","role":"Заместитель командира ССО","photo":""}]},{"id":"roio","name":"Рота Охраны и Обеспечения","short":"РОиО","color":"#c78a2a","icon":"🎯","members":[{"rank":"lt_col","name":"","code":"","role":"Ком. РОиО","photo":""},{"rank":"maj","name":"","code":"","role":"Зам. ком. РОиО","photo":""},{"rank":"maj","name":"","code":"","role":"Зам. ком. РОиО","photo":""}]},{"id":"mch","name":"Медицинская Часть","short":"МЧ","color":"#a34a8e","icon":"⚕","members":[{"rank":"lt_col","name":"","code":"","role":"Ком. МЧ","photo":""},{"rank":"maj","name":"","code":"","role":"Зам. ком. МЧ","photo":""}]}],"updated_at":null};

  function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}

  /* Поиск категории по ключу в списке state.ranks.
     tier = позиция в списке (чем выше в списке, тем старше категория). */
  function rankInfo(k,ranks){
    const list=Array.isArray(ranks)?ranks:[];
    const i=list.findIndex(r=>r&&r.key===k);
    if(i>=0) return {key:k,label:list[i].label||k,short:list[i].short||list[i].label||k,tier:i+1,found:true};
    return {key:k,label:k,short:k,tier:999,found:false};
  }

  function waitReady(){
    if(window.VSRF_AUTH&&window.VSRF_AUTH.whenReady) return window.VSRF_AUTH.whenReady(10000);
    return new Promise(resolve=>{
      const s=window.VSRF_AUTH&&window.VSRF_AUTH.state;
      if(!s||s.ready) return resolve();
      let off=()=>{};
      off=window.VSRF_AUTH.onChange(st=>{if(st.ready){off();resolve()}});
      setTimeout(()=>resolve(),10000);
    });
  }

  function readLocal(){try{return JSON.parse(localStorage.getItem("vsrf-composition")||"null")}catch(e){return null}}
  function writeLocal(state){localStorage.setItem("vsrf-composition",JSON.stringify(state))}

  function migrate(st){
    if(!st) st={};
    if(!st.hq_slots||!Array.isArray(st.hq_slots)||!st.hq_slots.length){
      st.hq_slots=JSON.parse(JSON.stringify(DEFAULT_HQ_SLOTS));
    }
    if(!st.hq) st.hq={};
    if(!st.subs) st.subs=[];
    if(!Array.isArray(st.ranks)) st.ranks=Object.entries(LEGACY_RANK_LABELS).map(([key,label])=>({key,label,short:label}));
    // нормализация категорий
    st.ranks=st.ranks.filter(r=>r&&r.key&&r.label).map(r=>({key:String(r.key),label:String(r.label),short:String(r.short||r.label)}));
    // миграция легаси-рангов: ставим участникам текстовую метку,
    // если её категория не существует в кастомном списке
    (st.subs||[]).forEach(sub=>{
      sub.grid_cols=Math.max(1,Math.min(10,parseInt(sub.grid_cols)||3));
      const rawRows=Array.isArray(sub.row_cols)?sub.row_cols:(typeof sub.row_cols==="string"?sub.row_cols.split(/[,;\s]+/):[]);
      sub.row_cols=rawRows.map(value=>Math.max(1,Math.min(10,parseInt(value)||sub.grid_cols))).slice(0,30);
      (sub.members||[]).forEach(m=>{
        if(!m) return;
        const found=st.ranks.some(r=>r.key===m.rank);
        if(!found){
          if(!m.rank_label){
            m.rank_label=LEGACY_RANK_LABELS[m.rank]||(m.rank&&m.rank!=="none"?m.rank:"");
          }
        }else{
          // категория есть — следом подтянем актуальный label при показе
        }
      });
    });
    return st;
  }
  async function load(){
    await waitReady();
    const s=window.VSRF_AUTH&&window.VSRF_AUTH.state;
    if(s&&s.available&&s.client&&s.user){
      for(let attempt=1;attempt<=3;attempt++){
        try{
          const {data,error}=await s.client.from("composition").select("*").eq("id",1).maybeSingle();
          if(error) throw error;
          if(data&&data.state){
            const st=typeof data.state==="string"?JSON.parse(data.state):data.state;
            return migrate(Object.assign({},DEFAULT_STATE,st));
          }
        }catch(e){console.warn(`[VSRF_COMP] attempt ${attempt}/3`,e.message)}
        if(attempt<3) await new Promise(r=>setTimeout(r,700*attempt));
      }
    }
    const cached=null;
    return migrate(cached||JSON.parse(JSON.stringify(DEFAULT_STATE)));
  }

  async function save(state){
    state.updated_at=new Date().toISOString();

    const s=window.VSRF_AUTH&&window.VSRF_AUTH.state;
    if(s&&s.available&&s.client){
      try{
        const {error}=await s.client.from("composition").upsert({id:1,state:state,updated_at:state.updated_at},{onConflict:"id"});
        if(error) throw error;
        return {ok:true,remote:true};
      }catch(e){console.warn("[VSRF_COMP] save err:",e.message);throw new Error(e.message)}
    }
    throw new Error("Войдите в аккаунт и проверьте соединение");
  }

  async function uploadPhoto(file){
    const s=window.VSRF_AUTH&&window.VSRF_AUTH.state;
    if(!s||!s.client) return {ok:false,error:"Нет связи с хранилищем. Обновите страницу."};
    if(!s.user) return {ok:false,error:"Для загрузки фото нужно войти на сайт."};
    if(!file) return {ok:false,error:"Файл не выбран."};

    const extByType={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"};
    const typeByExt={jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",webp:"image/webp"};
    const nameExt=((file.name||"").match(/\.([a-z0-9]+)$/i)||[])[1];
    const normalizedExt=nameExt&&nameExt.toLowerCase()==="jpeg"?"jpg":nameExt&&nameExt.toLowerCase();
    const contentType=extByType[file.type]?file.type:typeByExt[normalizedExt];
    const ext=extByType[contentType];

    if(!contentType||!ext) return {ok:false,error:"Поддерживаются JPG, PNG или WebP."};
    if(file.size>8*1024*1024) return {ok:false,error:"Файл больше 8 МБ."};

    // Оригинал отправляется сразу в Supabase Storage.
    // Не меняем размер, формат и качество и не требуем копию на VPS.
    const path="comp_"+Date.now()+"_"+Math.random().toString(36).slice(2,8)+"."+ext;
    try{
      const {error}=await s.client.storage.from("composition-photos").upload(path,file,{contentType,cacheControl:"31536000",upsert:false});
      if(error) return {ok:false,error:error.message};
      const {data:pub}=s.client.storage.from("composition-photos").getPublicUrl(path);
      if(!pub||!pub.publicUrl) return {ok:false,error:"Хранилище не вернуло ссылку на фото."};
      return {ok:true,url:pub.publicUrl,path};
    }catch(e){return {ok:false,error:e.message}}
  }

  function uid(){return "s_"+Math.random().toString(36).slice(2,9)}
  function rankUid(){return "rk_"+Math.random().toString(36).slice(2,9)}

  return {DEFAULT_HQ_SLOTS,DEFAULT_STATE,SUB_PRESETS,LEGACY_RANK_LABELS,load,save,migrate,uploadPhoto,esc,rankInfo,uid,rankUid};
})();
