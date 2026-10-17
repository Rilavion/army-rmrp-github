window.VSRF_SEARCH=(function(){
  const CACHE_KEY="vsrf-search-cache";
  const TTL=5*60*1000;
  let cache=null;

  function readCache(){
    try{
      const c=JSON.parse(sessionStorage.getItem(CACHE_KEY)||"null");
      if(c&&c.at&&Date.now()-c.at<TTL) return c.data;
    }catch(e){}
    return null;
  }
  function writeCache(data){
    try{sessionStorage.setItem(CACHE_KEY,JSON.stringify({at:Date.now(),data}))}catch(e){}
  }

  const STATIC=[
    {group:"Страницы",title:"Главная",hint:"Общая информация о в/ч",href:"index.html",kw:"главная home о части"},
    {group:"Страницы",title:"Уставы",hint:"Каталог документов",href:"ustav.html",kw:"устав документы"},
    {group:"Страницы",title:"Обучение",hint:"Курсы и уроки",href:"training.html",kw:"обучение курсы уроки тренировка"},
    {group:"Страницы",title:"Состав",hint:"Личный состав и штаб",href:"composition.html",kw:"состав личный офицеры штаб"},
    {group:"Страницы",title:"Документы",hint:"Конструктор документов",href:"docs.html",kw:"документы приказ рапорт указание конструктор"},
    {group:"Страницы",title:"Новости",hint:"Оперативная сводка",href:"news.html",kw:"новости"},
    {group:"Страницы",title:"Автопарк",hint:"Техника бригады",href:"autopark.html",kw:"автопарк техника машины"},
    {group:"Страницы",title:"Карта",hint:"Схема территории",href:"map.html",kw:"карта территория"},
    {group:"Страницы",title:"Личный кабинет",hint:"Профиль и настройки",href:"lk.html",kw:"личный кабинет профиль настройки"},
    {group:"Страницы",title:"FAQ",hint:"Частые вопросы",href:"faq.html",kw:"faq вопросы частые ответы"}
  ];

  async function build(force){
    if(!force){
      const c=cache||readCache();
      if(c){cache=c;return c}
    }
    const data=STATIC.slice();
    const auth=window.VSRF_AUTH;

    if(auth&&auth.state&&auth.state.client){
      const client=auth.state.client;
      await Promise.all([
        (async()=>{try{
          const {data:rows}=await client.from("news").select("id,title,body,dept,tag,created_at").order("created_at",{ascending:false}).limit(100);
          if(rows) rows.forEach(r=>data.push({group:"Новости",title:r.title||"Без заголовка",hint:(r.body||"").slice(0,90),href:"news.html#n="+r.id,kw:(r.title+" "+(r.body||"")+" "+(r.dept||"")+" "+(r.tag||"")).toLowerCase()}));
        }catch(e){}})(),
        (async()=>{try{
          const {data:rows}=await client.from("vehicles").select("id,title,purpose,tag").limit(80);
          if(rows) rows.forEach(r=>data.push({group:"Автопарк",title:r.title,hint:r.purpose||r.tag||"Техника",href:"autopark.html#v="+r.id,kw:(r.title+" "+(r.purpose||"")+" "+(r.tag||"")).toLowerCase()}));
        }catch(e){}})(),
        (async()=>{try{
          const {data:rows}=await client.from("ustavy").select("slug,title,code,content").order("sort_order",{ascending:true}).limit(50);
          if(rows) rows.forEach(r=>{
            data.push({group:"Уставы",title:r.title||r.slug,hint:r.code||"Устав",href:"ustav.html#doc/"+r.slug,kw:(r.title+" "+(r.code||"")).toLowerCase()});
            const c=r.content;
            if(c&&c.sections&&Array.isArray(c.sections)){
              c.sections.forEach(s=>{
                if(s.title&&s.id) data.push({group:"Разделы устава",title:s.title,hint:r.title||r.slug,href:"ustav.html#doc/"+r.slug+"|"+s.id,kw:(s.title+" "+(s.text||s.body||"")).toLowerCase().slice(0,400)});
              });
            }
          });
        }catch(e){}})(),
        (async()=>{try{
          const {data:rows}=await client.from("train_lessons").select("id,title,excerpt,content").limit(80);
          if(rows) rows.forEach(r=>data.push({group:"Обучение",title:r.title,hint:(r.excerpt||"").slice(0,90),href:"training.html#l="+r.id,kw:(r.title+" "+(r.excerpt||"")+" "+(r.content||"")).toLowerCase().slice(0,400)}));
        }catch(e){}})(),
        (async()=>{try{
          const {data:rows}=await client.from("composition").select("state").eq("id",1).maybeSingle();
          const state=rows&&rows.state;
          if(state){
            const walk=(node,path)=>{
              if(!node) return;
              if(node.name||node.rank||node.role){
                data.push({group:"Состав",title:node.name||node.role||"Позиция",hint:[node.rank,node.role,path].filter(Boolean).join(" · "),href:"composition.html",kw:((node.name||"")+" "+(node.rank||"")+" "+(node.role||"")).toLowerCase()});
              }
              if(Array.isArray(node.children)) node.children.forEach(ch=>walk(ch,(path?path+" / ":"")+(node.name||node.role||"")));
              if(Array.isArray(node.slots)) node.slots.forEach(ch=>walk(ch,(path?path+" / ":"")+(node.name||node.role||"")));
            };
            if(Array.isArray(state)) state.forEach(n=>walk(n,""));
            else walk(state,"");
          }
        }catch(e){}})()
      ]);
    }

    if(window.VSRF_FAQ){
      try{
        const rows=await window.VSRF_FAQ.loadAll();
        rows.forEach(r=>data.push({group:"FAQ",title:r.q,hint:(r.a||"").slice(0,90),href:"faq.html#"+r.id,kw:(r.q+" "+r.a+" "+(r.cat||"")).toLowerCase()}));
      }catch(e){}
    }

    if(window.VSRF_USTAV_TOC){
      window.VSRF_USTAV_TOC.forEach(t=>data.push({group:"Разделы устава",title:t.label,hint:"Устав внутренней службы",href:"ustav.html#doc/ustav-vnutrenney-sluzhby|"+t.id,kw:t.label.toLowerCase()}));
    }

    cache=data;writeCache(data);
    return data;
  }
  function invalidate(){cache=null;try{sessionStorage.removeItem(CACHE_KEY)}catch(e){}}
  return {build,invalidate,STATIC};
})();
