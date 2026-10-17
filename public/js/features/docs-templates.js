window.VSRF_DOC_TEMPLATES=(function(){
  const EMBLEM="favicon/favicon.png";

  const TOGGLES=[
    {key:"show_sig",label:"Показывать подпись №1",type:"toggle",default:"1"},
    {key:"show_seal",label:"Показывать печать №1",type:"toggle",default:"1"},
    {key:"show_sig2",label:"Показывать подпись №2 (второй подписант)",type:"toggle",default:"0"},
    {key:"show_seal2",label:"Показывать печать №2",type:"toggle",default:"0"},
    {key:"sig2_position",label:"Позиция подписи №2",type:"select",default:"right",options:[
      {value:"right",label:"Справа от основной"},
      {value:"left",label:"Слева от основной"},
      {value:"below",label:"Снизу отдельным блоком"}
    ]}
  ];
  const SIG2=[
    {key:"sig2_role1",label:"Подпись №2 — должность строка 1",type:"text",default:""},
    {key:"sig2_role2",label:"Подпись №2 — должность строка 2",type:"text",default:""},
    {key:"sig2_rank",label:"Подпись №2 — звание",type:"text",default:""},
    {key:"sig2_name",label:"Подпись №2 — ФИО с инициалами",type:"text",default:""},
    {key:"sig2_url",label:"Подпись №2 — URL изображения (опц.)",type:"text",default:""},
    {key:"seal2_url",label:"URL печати №2 (изображение)",type:"text",default:""}
  ];
  const COMMON_SEAL={key:"seal_url",label:"URL печати №1 (изображение)",type:"text",default:""};
  const COMMON_SIG_IMG={key:"sig_url",label:"URL подписи №1 (изображение)",type:"text",default:""};

  function withCommon(main){return [...main,...SIG2,COMMON_SEAL,COMMON_SIG_IMG,...TOGGLES]}

  const TEMPLATES={
    prikaz:{
      name:"Приказ",
      description:"Официальный приказ Министерства обороны",
      fields:withCommon([
        {key:"title",label:"Заголовок приказа",type:"textarea",default:"О формировании оперативной группы для проведения процессуальных действий"},
        {key:"date",label:"Дата",type:"text",default:"17 апреля 2026 г."},
        {key:"city",label:"Город",type:"text",default:"Москва"},
        {key:"number",label:"Номер приказа",type:"text",default:"№101"},
        {key:"preamble",label:"Преамбула (основание)",type:"textarea",default:"На основании части 5 статьи 13 Федерального конституционного закона Процессуального кодекса Российской Федерации №69-ФКЗ, в целях обеспечения проведения задержаний и процессуальных действий, установления надлежащего порядка в подразделении, —"},
        {key:"members",label:"Члены оперативной группы (каждый с новой строки)",type:"textarea",default:"Военный комендант гарнизона, подполковник Монтерро Роман Васильевич, удостоверение АА №324-340\nКомандир батальона военной полиции, подполковник Распутин Руслан Сергеевич, удостоверение АА №593-876\nЗаместитель командира ВП, майор Распутин Алексей Вадимович, удостоверение АА №248-295\nЗаместитель командира ВП, капитан Баранов Кирилл Робертович, удостоверение АА №171-958\nИнструктор ВП, младший лейтенант Алмазов Максим Вячеславович, удостоверение АА №746-078"},
        {key:"time_from",label:"Время начала действия",type:"text",default:"16 часов 45 минут по московскому времени 17 апреля 2026 года"},
        {key:"time_to",label:"Время окончания действия",type:"text",default:"01 час 00 минут по московскому времени 20 апреля 2026 года"},
        {key:"sig_role1",label:"Подпись №1 — должность строка 1",type:"text",default:"Военный комендант"},
        {key:"sig_role2",label:"Подпись №1 — должность строка 2",type:"text",default:"гарнизона"},
        {key:"sig_rank",label:"Подпись №1 — звание",type:"text",default:"Подполковник"},
        {key:"sig_name",label:"Подпись №1 — ФИО с инициалами",type:"text",default:"Монтерро Р.В."}
      ])
    },
    letter:{
      name:"Официальное письмо / ответ",
      description:"Служебное письмо (например, ответ прокурору)",
      fields:withCommon([
        {key:"unit_name",label:"Название части (левый блок)",type:"text",default:"Войсковая часть 12132"},
        {key:"unit_city",label:"Город",type:"text",default:"г. Москва, Россия"},
        {key:"date",label:"Дата",type:"text",default:"17.04.2026"},
        {key:"number",label:"Исходящий номер",type:"text",default:"№103"},
        {key:"addressee_line1",label:"Адресат — строка 1",type:"text",default:"Старшему прокурору города Москвы"},
        {key:"addressee_line2",label:"Адресат — строка 2",type:"text",default:"и Московской области"},
        {key:"addressee_rank",label:"Адресат — звание",type:"text",default:"Юрист 2-го класса"},
        {key:"addressee_name",label:"Адресат — ФИО",type:"text",default:"Мокрушин Н.С."},
        {key:"greeting",label:"Обращение",type:"text",default:"Уважаемый Николай Сергеевич!"},
        {key:"body_1",label:"Абзац 1",type:"textarea",default:"Настоящим сообщаю, что постановление «О запросе необходимых сведений» №1408 от 17.04.2026 г. было получено и надлежащим образом рассмотрено в установленный законом срок."},
        {key:"body_2",label:"Абзац 2",type:"textarea",default:"Все необходимые данные и выписки из служебных документов были подготовлены и направлены на указанный электронный адрес прокуратуры в полном объёме."},
        {key:"body_3_bold",label:"Абзац 3 (жирный)",type:"textarea",default:"Довожу до Вашего сведения плачевную обстановку с большим количеством криминальных элементов в чёрном одеянии в подведомственной зоне ответственности. Весь состав Вооружённых Сил РФ с 21:00 до глубокой ночи находился в прямом руководстве лично подписанта. Обращаю внимание на человеческий фактор и невнимательность, обусловленные усталостью личного состава."},
        {key:"sig_role1",label:"Подпись №1 — должность",type:"text",default:"Командир Бригады"},
        {key:"sig_rank",label:"Подпись №1 — звание",type:"text",default:"Генерал-лейтенант"},
        {key:"sig_name",label:"Подпись №1 — ФИО",type:"text",default:"В.В. Прайд"}
      ])
    },
    prikaz_kadr:{
      name:"Приказ (кадровый)",
      description:"Приказ о кадровых перестановках, назначениях, присвоении званий",
      fields:withCommon([
        {key:"ministry_line1",label:"Шапка — строка 1",type:"text",default:"МИНИСТЕРСТВО ОБОРОНЫ РОССИЙСКОЙ ФЕДЕРАЦИИ"},
        {key:"ministry_line2",label:"Шапка — строка 2",type:"text",default:"ПЕРВАЯ ПАТРИАРШАЯ МОТОСТРЕЛКОВАЯ БРИГАДА"},
        {key:"ministry_line3",label:"Шапка — строка 3",type:"text",default:"ВОИНСКАЯ ЧАСТЬ №12132"},
        {key:"date",label:"Дата",type:"text",default:"23 Июля 2026"},
        {key:"title",label:"Наименование приказа",type:"textarea",default:"О кадровых перестановках"},
        {key:"city",label:"Город",type:"text",default:"г. Москва"},
        {key:"number",label:"Номер приказа",type:"text",default:"№227"},
        {key:"preamble",label:"Преамбула",type:"textarea",default:"В соответствии с частью «1» статьи «10» Федерального закона «Об Обороне» №52-ФЗ, ПРИКАЗЫВАЮ:"},
        {key:"items",label:"Пункты приказа (каждый с новой строки, нумерация автоматическая)",type:"textarea",default:"Назначить на должность Заместителя Начальника отдела Кадров военного комиссариата Льва Волкова с личным номером 790-004.\nВ связи с назначением на должность присвоить Льву Волкову воинское звание Капитан.\nНастоящий Приказ вступает в законную силу с момента его подписания и опубликования."},
        {key:"sig_role1",label:"Подпись №1 — должность строка 1",type:"text",default:"Командир Бригады"},
        {key:"sig_role2",label:"Подпись №1 — должность строка 2",type:"text",default:""},
        {key:"sig_rank",label:"Подпись №1 — звание",type:"text",default:"Генерал-лейтенант"},
        {key:"sig_name",label:"Подпись №1 — ФИО с инициалами",type:"text",default:"В.В. Прайд"}
      ])
    },
    ukaz:{
      name:"Указ",
      description:"Указ / распоряжение",
      fields:withCommon([
        {key:"title",label:"Наименование указа",type:"textarea",default:"О назначении на должность"},
        {key:"date",label:"Дата",type:"text",default:"17 апреля 2026 г."},
        {key:"city",label:"Город",type:"text",default:"Москва"},
        {key:"number",label:"Номер",type:"text",default:"№45"},
        {key:"body",label:"Основной текст",type:"textarea",default:"На основании представления командования и результатов аттестации, —\n\nПОСТАНОВЛЯЮ:\n\n1. Назначить на должность заместителя командира батальона военной полиции войсковой части 12132 капитана Иванова Ивана Ивановича, удостоверение АА №000-000.\n\n2. Настоящий Указ вступает в силу с момента подписания.\n\n3. Контроль за исполнением настоящего Указа возложить на начальника штаба."},
        {key:"sig_role1",label:"Подпись №1 — должность",type:"text",default:"Командир Бригады"},
        {key:"sig_rank",label:"Подпись №1 — звание",type:"text",default:"Генерал-лейтенант"},
        {key:"sig_name",label:"Подпись №1 — ФИО",type:"text",default:"В.В. Прайд"}
      ])
    }
  };

  function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
  function nl2br(s){return esc(s).replace(/\n/g,"<br>")}
  function paragraphs(s){return String(s||"").split(/\n{2,}/).map(p=>p.trim()).filter(Boolean).map(p=>`<p class="doc-p">${esc(p).replace(/\n/g,"<br>")}</p>`).join("")}
  function truthy(v){const s=String(v==null?"":v).toLowerCase().trim();return s==="1"||s==="true"||s==="on"||s==="yes"||s==="да"}

  function sealBlock(sealUrl,show){
    if(!show) return `<div class="doc-seal doc-seal-hidden"></div>`;
    if(sealUrl&&sealUrl.trim()){
      return `<div class="doc-seal"><img src="${esc(sealUrl.trim())}" alt="Печать" crossorigin="anonymous"></div>`;
    }
    return `<div class="doc-seal doc-seal-empty" title="Печать не загружена"><div class="doc-seal-empty-inner">Печать<br>не загружена</div></div>`;
  }

  function signatureImg(name,sigUrl){
    if(sigUrl&&sigUrl.trim()){
      return `<div class="doc-signature doc-signature-img"><img src="${esc(sigUrl.trim())}" alt="Подпись" crossorigin="anonymous"></div>`;
    }
    const initials=(name||"").match(/[А-ЯЁA-Z]/g)||["V"];
    const seed=initials.slice(0,2).join("").charCodeAt(0)%3;
    const paths=[
      `M 12,42 Q 22,10 40,32 T 70,28 Q 84,18 96,40 T 130,22 Q 148,14 168,36`,
      `M 10,38 C 30,10 55,50 80,28 S 130,50 168,20`,
      `M 14,40 Q 40,8 60,34 T 100,26 Q 130,22 168,38`
    ];
    return `<div class="doc-signature"><svg viewBox="0 0 180 60" width="180" height="60">
      <path d="${paths[seed]}" stroke="#12327b" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <path d="M 40,44 L 130,44" stroke="#12327b" stroke-width="1.1" fill="none" opacity=".7"/>
    </svg></div>`;
  }

  function signSet(role1,role2,rank,name,sigUrl,sealUrl,showSig,showSeal){
    if(!name&&!role1&&!rank) return "";
    const rows=[];
    if(role1) rows.push(`<div>${esc(role1)}</div>`);
    if(role2) rows.push(`<div>${esc(role2)}</div>`);
    if(rank) rows.push(`<div>${esc(rank)}</div>`);
    const sigHtml=showSig?signatureImg(name,sigUrl):`<div class="doc-signature doc-signature-hidden"></div>`;
    const sealHtml=sealBlock(sealUrl,showSeal);
    return `<div class="doc-sign-set">
      <div class="doc-sign-set-left">${rows.join("")}</div>
      <div class="doc-sign-set-center">${sigHtml}</div>
      <div class="doc-sign-set-right">${esc(name||"")}</div>
      <div class="doc-sign-set-seal">${sealHtml}</div>
    </div>`;
  }

  function renderSignBlock(v){
    const showSig=truthy(v.show_sig==null?"1":v.show_sig);
    const showSeal=truthy(v.show_seal==null?"1":v.show_seal);
    const showSig2=truthy(v.show_sig2==null?"0":v.show_sig2);
    const showSeal2=truthy(v.show_seal2==null?"0":v.show_seal2);
    const pos=v.sig2_position||"right";
    const has2=(showSig2||showSeal2)&&(v.sig2_name||v.sig2_role1||v.sig2_rank||showSeal2);
    const set1=signSet(v.sig_role1,v.sig_role2,v.sig_rank,v.sig_name,v.sig_url,v.seal_url,showSig,showSeal);
    const set2=has2?signSet(v.sig2_role1,v.sig2_role2,v.sig2_rank,v.sig2_name,v.sig2_url,v.seal2_url,showSig2,showSeal2):"";
    if(!has2){
      return `<div class="doc-sign-block-wrap doc-sb-single">${set1}</div>`;
    }
    if(pos==="below"){
      return `<div class="doc-sign-block-wrap doc-sb-stacked">
        ${set1}
        <div class="doc-sb-sep"></div>
        ${set2}
      </div>`;
    }
    if(pos==="left"){
      return `<div class="doc-sign-block-wrap doc-sb-side">
        ${set2}
        ${set1}
      </div>`;
    }
    return `<div class="doc-sign-block-wrap doc-sb-side">
      ${set1}
      ${set2}
    </div>`;
  }

  function paginate(items,firstPageMax,otherPageMax){
    const pages=[];let i=0;
    while(i<items.length){
      const cap=pages.length===0?firstPageMax:otherPageMax;
      pages.push(items.slice(i,i+cap));i+=cap;
    }
    return pages.length?pages:[[]];
  }

  function renderPrikaz(v){
    const membersArr=String(v.members||"").split("\n").map(m=>m.trim()).filter(Boolean);
    const memberPages=paginate(membersArr,5,10);
    const totalPages=memberPages.length+1;
    const pages=[];
    memberPages.forEach((mems,idx)=>{
      const isFirst=idx===0;
      const list=mems.map(m=>`<li>— ${esc(m)}${m.endsWith(";")||m.endsWith(".")?"":";"}</li>`).join("");
      const pageNum=idx+1;
      const head=isFirst?`
        <div class="doc-emblem-wrap"><img src="${EMBLEM}" alt="" crossorigin="anonymous"></div>
        <div class="doc-ministry">
          МИНИСТЕРСТВО ОБОРОНЫ РОССИЙСКОЙ ФЕДЕРАЦИИ<br>
          МОСКОВСКИЙ ВОЕННЫЙ ОКРУГ ВООРУЖЁННЫХ СИЛ<br>
          РОССИЙСКОЙ ФЕДЕРАЦИИ
        </div>
        <div class="doc-title-word">ПРИКАЗ</div>
        <div class="doc-title-sub">${nl2br(v.title)}</div>
        <div class="doc-reqs">
          <span>${esc(v.date)}</span><span>${esc(v.city)}</span><span>${esc(v.number)}</span>
        </div>
        <div class="doc-p doc-preamble">${nl2br(v.preamble)}</div>
        <div class="doc-word">ПРИКАЗЫВАЮ:</div>
        <div class="doc-p"><b>1.</b> Сформировать оперативную группу из числа военнослужащих органов военной полиции 1-й Мотострелковой бригады Московской области в следующем составе:</div>`:`<div class="doc-pagenum">${pageNum}</div>
        <div class="doc-p"><i>(продолжение списка личного состава)</i></div>`;
      pages.push(`<div class="doc-page a4" data-page-idx="${pageNum}">
        <div class="doc-inner">
          ${head}
          <ul class="doc-members">${list}</ul>
        </div>
      </div>`);
    });
    const lastNum=totalPages;
    pages.push(`<div class="doc-page a4" data-page-idx="${lastNum}">
      <div class="doc-inner">
        <div class="doc-pagenum">${lastNum}</div>
        <div class="doc-p"><b>2.</b> Установить время действия сформированной оперативной группы: с ${esc(v.time_from)} до ${esc(v.time_to)}.</div>
        <div class="doc-p"><b>3.</b> Контроль за исполнением настоящего Приказа оставляю за собой.</div>
        <div class="doc-p"><b>4.</b> Настоящий Приказ вступает в законную силу с момента его официального опубликования.</div>
        ${renderSignBlock(v)}
      </div>
    </div>`);
    return pages.join("");
  }

  function renderLetter(v){
    return `<div class="doc-page a4" data-page-idx="1">
      <div class="doc-inner doc-inner-boxed">
        <div class="doc-letter-head">
          <div class="doc-letter-head-left">
            <img src="${EMBLEM}" alt="" class="doc-letter-emblem" crossorigin="anonymous">
            <div class="doc-letter-info">
              <div><b>Министерство обороны</b></div>
              <div><b>Российской Федерации</b></div>
              <div>Московский военный округ</div>
              <div>Вооружённых сил Российской Федерации</div>
              <div class="doc-strong">${esc(v.unit_name)}</div>
              <div>${esc(v.unit_city)}</div>
              <div class="doc-mono">${esc(v.date)} &nbsp; ${esc(v.number)}</div>
            </div>
          </div>
          <div class="doc-letter-head-right">
            <div>${esc(v.addressee_line1)}</div>
            <div>${esc(v.addressee_line2)}</div>
            <div style="height:14px"></div>
            <div>${esc(v.addressee_rank)}</div>
            <div>${esc(v.addressee_name)}</div>
          </div>
        </div>
        <div class="doc-greeting"><b>${esc(v.greeting)}</b></div>
        <div class="doc-p">${nl2br(v.body_1)}</div>
        <div class="doc-p">${nl2br(v.body_2)}</div>
        <div class="doc-p"><b>${nl2br(v.body_3_bold)}</b></div>
        ${renderSignBlock(v)}
      </div>
    </div>`;
  }

  function renderUkaz(v){
    return `<div class="doc-page a4" data-page-idx="1">
      <div class="doc-inner">
        <div class="doc-emblem-wrap"><img src="${EMBLEM}" alt="" crossorigin="anonymous"></div>
        <div class="doc-ministry">
          МИНИСТЕРСТВО ОБОРОНЫ РОССИЙСКОЙ ФЕДЕРАЦИИ<br>
          МОСКОВСКИЙ ВОЕННЫЙ ОКРУГ ВООРУЖЁННЫХ СИЛ<br>
          РОССИЙСКОЙ ФЕДЕРАЦИИ
        </div>
        <div class="doc-title-word">УКАЗ</div>
        <div class="doc-title-sub">${nl2br(v.title)}</div>
        <div class="doc-reqs">
          <span>${esc(v.date)}</span><span>${esc(v.city)}</span><span>${esc(v.number)}</span>
        </div>
        <div>${paragraphs(v.body)}</div>
        ${renderSignBlock(v)}
      </div>
    </div>`;
  }

  function renderPrikazKadr(v){
    const itemsArr=String(v.items||"").split("\n").map(m=>m.trim()).filter(Boolean);
    const items=itemsArr.map((it,i)=>`<div class="doc-p doc-p-item"><b>${i+1}.</b> ${nl2br(it)}</div>`).join("");
    const ministry=[v.ministry_line1,v.ministry_line2,v.ministry_line3].filter(Boolean).map(esc).join("<br>");
    return `<div class="doc-page a4" data-page-idx="1">
      <div class="doc-inner">
        <div class="doc-emblem-wrap"><img src="${EMBLEM}" alt="" crossorigin="anonymous"></div>
        <div class="doc-ministry">${ministry}</div>
        <div class="doc-title-word">ПРИКАЗ</div>
        <div class="doc-title-sub">${nl2br(v.title)}</div>
        <div class="doc-reqs">
          <span>${esc(v.date)}</span><span>${esc(v.city)}</span><span>${esc(v.number)}</span>
        </div>
        <div class="doc-p doc-preamble">${nl2br(v.preamble)}</div>
        ${items}
        ${renderSignBlock(v)}
      </div>
    </div>`;
  }

  function render(templateId,values){
    if(templateId==="prikaz") return renderPrikaz(values);
    if(templateId==="prikaz_kadr") return renderPrikazKadr(values);
    if(templateId==="letter") return renderLetter(values);
    if(templateId==="ukaz") return renderUkaz(values);
    return "<div>Неизвестный шаблон</div>";
  }

  function defaults(templateId){
    const t=TEMPLATES[templateId];if(!t) return {};
    const o={};t.fields.forEach(f=>o[f.key]=f.default||"");return o;
  }

  return {TEMPLATES,render,defaults,esc};
})();
