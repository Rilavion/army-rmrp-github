window.VSRF_INFO=(function(){
  const DEFAULT_DATA={
    title:"Вооружённые Силы Российской Федерации",
    subtitle:"Структура, функции и условия службы",
    intro:"Вооружённые Силы Российской Федерации (ВС РФ) — являются ключевым инструментом обеспечения национальной безопасности страны. Их основная задача заключается в защите суверенитета, территориальной целостности и государственных интересов России. Кроме того, ВС РФ играют важную роль в реализации военной политики государства.",
    sections:[
      {
        id:"functions",
        icon:"◈",
        title:"Основные функции",
        subtitle:"Ключевые направления деятельности",
        items:[
          "Охрана государственной границы и защита территориальной целостности страны",
          "Гарантирование безопасности государства и его граждан",
          "Поддержание стабильности как на национальном, так и на международном уровне",
          "Участие в миротворческих миссиях и гуманитарных операциях",
          "Подготовка личного состава и обучение военнослужащих для выполнения боевых задач",
          "Разработка, модернизация и внедрение новых вооружений и военных технологий"
        ]
      },
      {
        id:"forms",
        icon:"⚔",
        title:"Формы службы",
        subtitle:"Два основных вида",
        cards:[
          {
            heading:"Срочная военная служба",
            text:"Обязательна для мужчин в возрасте от 18 до 30 лет и длится 12 месяцев. В этот период военнослужащие проходят базовую подготовку, получают обмундирование, питание, медицинское обслуживание и жильё за счёт государства."
          },
          {
            heading:"Контрактная служба",
            text:"Осуществляется на основании договора между военнослужащим и государством. Заключение контракта даёт право на денежное довольствие, обеспечение жильём, медицинские услуги и другие социальные гарантии."
          }
        ]
      },
      {
        id:"benefits",
        icon:"⚜",
        title:"Льготы и социальные гарантии",
        subtitle:"Военнослужащие ВС РФ пользуются рядом льгот",
        grid:[
          {label:"Жилищное обеспечение",text:"Возможность получения жилья от государства или участие в льготных ипотечных программах"},
          {label:"Образование",text:"Право на бесплатное обучение в военных учебных заведениях, стипендии и гранты"},
          {label:"Медицинское обслуживание",text:"Доступ к бесплатному лечению в военных госпиталях и поликлиниках"},
          {label:"Транспортные льготы",text:"Бесплатный проезд на общественном транспорте и скидки на ж/д и авиабилеты"},
          {label:"Пенсионное обеспечение",text:"Выплаты по выслуге лет, дополнительные надбавки и компенсации"},
          {label:"Отдых и оздоровление",text:"Бесплатные путёвки в военные санатории и базы отдыха"},
          {label:"Социальная поддержка",text:"Выплаты на детей, компенсации за аренду жилья и другие меры социальной помощи"}
        ]
      },
      {
        id:"steps",
        icon:"★",
        title:"Порядок поступления на службу",
        subtitle:"Для того чтобы стать военнослужащим ВС РФ, необходимо пройти несколько этапов",
        steps:[
          {n:"01",title:"Медицинское обследование",text:"Определение физической пригодности к службе"},
          {n:"02",title:"Подача заявления",text:"Регистрация в военкомате по месту жительства с указанием личных данных и сведений об образовании"},
          {n:"03",title:"Отбор кандидатов",text:"Оценка физических, психологических и профессиональных качеств"},
          {n:"04",title:"Прохождение военной подготовки",text:"Обучение основам военной службы, тактике и технике"},
          {n:"05",title:"Принятие присяги",text:"Официальное подтверждение верности Российской Федерации"},
          {n:"06",title:"Начало службы",text:"Выполнение обязанностей в соответствии с уставом и законодательством"}
        ]
      },
      {
        id:"tasks",
        icon:"❖",
        title:"Основные задачи",
        subtitle:"Вооружённые Силы Российской Федерации выполняют широкий спектр задач",
        items:[
          "Проведение оборонительных операций на территории России",
          "Участие в антитеррористической деятельности и борьбе с экстремизмом",
          "Охрана морских и воздушных рубежей государства",
          "Поддержание боевой готовности и проведение учений",
          "Участие в международных миротворческих операциях"
        ]
      }
    ],
    footer:"Срочная служба доступна только гражданам Российской Федерации, соответствующим требованиям по возрасту, физическому здоровью и профессиональным навыкам. Таким образом, Вооружённые Силы Российской Федерации представляют собой мощную структуру, выполняющую широкий спектр задач по обеспечению безопасности государства и граждан."
  };

  function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}

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

  async function load(){
    await waitReady(5000);
    const s=window.VSRF_AUTH&&window.VSRF_AUTH.state;
    if(s&&s.available&&s.client){
      try{
        const {data,error}=await s.client.from("info_page").select("data").eq("id",1).maybeSingle();
        if(error) throw error;
        if(data&&data.data) return data.data;
      }catch(e){console.warn("[VSRF_INFO]",e.message)}
    }
    try{
      const raw=localStorage.getItem("vsrf-info-local");
      if(raw) return JSON.parse(raw);
    }catch(e){}
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }

  async function save(payload){
    try{localStorage.setItem("vsrf-info-local",JSON.stringify(payload))}catch(e){}
    const s=window.VSRF_AUTH&&window.VSRF_AUTH.state;
    if(s&&s.available&&s.client&&s.user){
      try{
        const {error}=await s.client.from("info_page").upsert({id:1,data:payload,updated_at:new Date().toISOString()});
        if(error) return {ok:true,remote:false,error:error.message};
        return {ok:true,remote:true};
      }catch(e){return {ok:true,remote:false,error:e.message}}
    }
    return {ok:true,remote:false};
  }

  function resetDefault(){
    try{localStorage.removeItem("vsrf-info-local")}catch(e){}
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }

  return {DEFAULT_DATA,load,save,resetDefault,esc,waitReady};
})();
