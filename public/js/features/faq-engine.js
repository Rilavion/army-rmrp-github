window.VSRF_FAQ=(function(){
  const KEY="vsrf-faq-local";
  const DEFAULTS=[
    {id:"join",cat:"Приём",q:"Как попасть в 1-ю МСБр?",a:"Подайте заявку через раздел «Новости» → «Приём» либо свяжитесь с командиром в игре. После собеседования и стажировки в отделении новобранцев вы получаете назначение в подразделение."},
    {id:"training",cat:"Обучение",q:"Какие есть курсы подготовки?",a:"Каталог курсов доступен на странице «Обучение»: строевая, огневая, тактическая, медицинская. Каждый курс завершается тестом. Прогресс отображается в личном кабинете."},
    {id:"ranks",cat:"Служба",q:"Как получить повышение в звании?",a:"Повышения выдаются командованием по результатам активности, прохождения курсов и участия в операциях. Список званий и требований — в разделе «Состав»."},
    {id:"docs",cat:"Документы",q:"Как оформить рапорт или приказ?",a:"Откройте «Документы» → «Конструктор». Выберите тип (приказ / рапорт / указание), заполните форму, распечатайте или скачайте PNG. Все документы соответствуют ГОСТ."},
    {id:"uniform",cat:"Служба",q:"Требования к форме одежды?",a:"Уставная форма 1-й МСБр — VDV/Ratnik. Головной убор — берет крапового цвета. Полный список — в «Уставе внутренней службы» → раздел «Форма одежды»."},
    {id:"map",cat:"Территория",q:"Где находится расположение части?",a:"Смотрите интерактивную карту в разделе «Карта». Отмечены КПП, штаб, казармы, автопарк, полигон и стрельбище."},
    {id:"leave",cat:"Служба",q:"Как оформить отпуск / убытие?",a:"Подать рапорт через конструктор документов, согласовать с непосредственным командиром, получить визу комбрига. Форма рапорта — в «Документы» → «Рапорт на убытие»."},
    {id:"discipline",cat:"Служба",q:"Что делать при нарушении устава?",a:"Разбирательство ведёт непосредственный командир. Меры — от замечания до дисциплинарного взыскания. Все взыскания фиксируются в личном деле. Подробнее — «Дисциплинарный устав»."}
  ];

  function readLocal(){
    try{
      const raw=localStorage.getItem(KEY);
      if(raw===null){
        const seed=DEFAULTS.slice();
        writeLocal(seed);
        return seed;
      }
      return JSON.parse(raw)||[];
    }catch(e){return []}
  }
  function writeLocal(list){try{localStorage.setItem(KEY,JSON.stringify(list||[]))}catch(e){}}

  let mode="local";

  async function loadAll(){
    const auth=window.VSRF_AUTH;
    if(auth&&auth.state&&auth.state.client){
      try{
        const {data,error}=await auth.state.client.from("faq").select("*").order("sort",{ascending:true});
        if(!error&&data){
          mode="supabase";
          return data.map(r=>({id:r.id,cat:r.cat||"Общее",q:r.q||"",a:r.a||"",sort:r.sort||0}));
        }
      }catch(e){}
    }
    mode="local";
    return readLocal();
  }
  async function save(item){
    if(mode==="supabase"){
      const client=window.VSRF_AUTH.state.client;
      try{
        const {error}=await client.from("faq").upsert(item);
        if(!error) return true;
      }catch(e){}
    }
    const list=readLocal();
    const i=list.findIndex(x=>x.id===item.id);
    if(i>=0) list[i]=item;else list.push(item);
    writeLocal(list);
    return true;
  }
  async function remove(id){
    if(mode==="supabase"){
      const client=window.VSRF_AUTH.state.client;
      try{
        const {error}=await client.from("faq").delete().eq("id",id);
        if(!error) return true;
      }catch(e){}
    }
    writeLocal(readLocal().filter(x=>x.id!==id));
    return true;
  }
  function getMode(){return mode}
  function resetDefaults(){writeLocal(DEFAULTS.slice())}
  function clearAll(){writeLocal([])}
  function makeId(){return "faq_"+Date.now().toString(36)+Math.random().toString(36).slice(2,6)}

  return {DEFAULTS,loadAll,save,remove,makeId,readLocal,writeLocal,getMode,resetDefaults,clearAll};
})();
