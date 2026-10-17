window.VSRF_USTAV=(function(){
  const DEFAULT_EMBLEM="https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Middle_Emblem_of_the_Russian_Navy.svg/1280px-Middle_Emblem_of_the_Russian_Navy.svg.png";

  const DEFAULT_DATA=[
    {slug:"ustav-vnutrenney-sluzhby",theme:"t1",title:"Устав внутренней службы",code:"1781813401486",meta:"Министерство обороны РФ<br>в/ч №12132",emblem:DEFAULT_EMBLEM,
      full:"УСТАВ ВНУТРЕННЕЙ СЛУЖБЫ ВООРУЖЕННЫХ СИЛ РОССИЙСКОЙ ФЕДЕРАЦИИ",
      sub:"1-я мотострелковая бригада Московской области · в/ч №12132",
      preamble:"",chapters:[],
      signature:{title:"Командир 1-ой мотострелковой бригады",rank:"генерал-лейтенант",name:"Волков Р.А."}
    },
    {slug:"stroevoy-ustav",theme:"t2",title:"Строевой устав",code:"1781813453292",meta:"Строевая подготовка<br>в/ч №12132",emblem:DEFAULT_EMBLEM,
      full:"СТРОЕВОЙ УСТАВ",sub:"1-я МСБр · в/ч №12132",preamble:"",chapters:[],signature:null},
    {slug:"karaulnaya-i-garnizonnaya",theme:"t3",title:"Устав караульной и гарнизонной служб",code:"1781813512103",meta:"Караульная и гарнизонная служба<br>в/ч №12132",emblem:DEFAULT_EMBLEM,
      full:"УСТАВ КАРАУЛЬНОЙ И ГАРНИЗОННОЙ СЛУЖБ",sub:"1-я МСБр · в/ч №12132",preamble:"",chapters:[],signature:null},
    {slug:"disciplinarnyy-ustav",theme:"t4",title:"Дисциплинарный устав",code:"1781813587291",meta:"Воинская дисциплина<br>в/ч №12132",emblem:DEFAULT_EMBLEM,
      full:"ДИСЦИПЛИНАРНЫЙ УСТАВ",sub:"1-я МСБр · в/ч №12132",preamble:"",chapters:[],signature:null},
    {slug:"ustav-voennoy-politsii",theme:"t5",title:"Устав военной полиции",code:"1781813632975",meta:"Военная полиция<br>в/ч №12132",emblem:DEFAULT_EMBLEM,
      full:"УСТАВ ВОЕННОЙ ПОЛИЦИИ",sub:"1-я МСБр · в/ч №12132",preamble:"",chapters:[],signature:null}
  ];

  const THEMES=[
    {id:"t1",name:"Оливковый"},
    {id:"t2",name:"Хаки"},
    {id:"t3",name:"Синий"},
    {id:"t4",name:"Бурый"},
    {id:"t5",name:"Пурпур"}
  ];

  function esc(s){return String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
  function paragraphs(text){
    return String(text||"").split(/\n{2,}/).map(p=>p.trim()).filter(Boolean).map(p=>`<p>${esc(p).replace(/\n/g,"<br>")}</p>`).join("");
  }

  function renderArticle(a,slug,chapId){
    const anchor=`${slug}--${chapId}--${a.num.replace(/\./g,"_")}`;
    const notes=(a.notes||[]).map(n=>`<div class="note">${esc(n)}</div>`).join("");
    return `<div class="art" id="${anchor}">
      <button class="copy-link" title="Скопировать ссылку" data-copy-anchor="${anchor}"><svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.71" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
      <strong>${esc(a.num)}.</strong> ${esc(a.text).replace(/\n/g,"<br>")}
      ${notes}
    </div>`;
  }

  function renderChapter(c,slug){
    const arts=(c.articles||[]).map(a=>renderArticle(a,slug,c.id)).join("");
    return `<section class="chapter" id="${c.id}"><h2>${esc(c.title)}</h2><div class="arts">${arts||'<div class="art" style="opacity:.6">Статьи будут добавлены.</div>'}</div></section>`;
  }

  function render(doc){
    const emblem=doc.emblem||DEFAULT_EMBLEM;
    let html=`<div class="paper-head">
      <div class="paper-emblem"><img src="${esc(emblem)}" alt=""></div>
      <div class="ministry">МИНИСТЕРСТВО ОБОРОНЫ РОССИЙСКОЙ ФЕДЕРАЦИИ</div>
      <h1>${esc(doc.full||doc.title)}</h1>
      <div class="sub">${esc(doc.sub||"1-я МСБр · в/ч №12132")}</div>
    </div>
    <div class="paper-body">`;

    if(doc.preamble&&doc.preamble.trim()){
      html+=`<section class="preamble" id="preamble"><h2>ПРЕАМБУЛА</h2>${paragraphs(doc.preamble)}</section>`;
    }
    if(!doc.chapters||!doc.chapters.length){
      if(!doc.preamble||!doc.preamble.trim()){
        html+=`<div class="doc-empty"><h3>Документ пуст</h3>Здесь пока нет глав и статей. Администратор может заполнить документ через панель редактирования.</div>`;
      }
    }else{
      doc.chapters.forEach(c=>{html+=renderChapter(c,doc.slug)});
    }
    if(doc.signature){
      html+=`<section class="sig">
        <div class="sig-title">${esc(doc.signature.title||"")}</div>
        <div class="sig-rank">${esc(doc.signature.rank||"")}</div>
        <div class="sig-name">${esc(doc.signature.name||"")}</div>
      </section>`;
    }
    html+=`</div>`;
    return html;
  }

  function buildToc(doc){
    const toc=[];
    if(doc.preamble&&doc.preamble.trim()) toc.push({id:"preamble",label:"Преамбула"});
    (doc.chapters||[]).forEach(c=>toc.push({id:c.id,label:c.title}));
    return toc;
  }

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
        if(Date.now()>deadline){clearInterval(t);console.warn("[VSRF_USTAV] waitReady timeout");resolve(window.VSRF_AUTH&&window.VSRF_AUTH.state||null)}
      },80);
      if(window.VSRF_AUTH&&window.VSRF_AUTH.onChange){
        window.VSRF_AUTH.onChange(st=>{if(st&&st.ready){clearInterval(t);resolve(st)}});
      }
    });
  }

  async function loadAll(){
    const local=readLocal();
    await waitReady(5000);
    const s=window.VSRF_AUTH&&window.VSRF_AUTH.state;
    console.log("[VSRF_USTAV] loadAll: auth state =",{ready:s&&s.ready,available:s&&s.available,hasClient:!!(s&&s.client)});
    if(s&&s.available&&s.client){
      try{
        const {data,error}=await s.client.from("ustavy").select("*").order("sort_order",{ascending:true,nullsFirst:true});
        console.log("[VSRF_USTAV] Supabase запрос:",{ok:!error,rows:data?data.length:0,error:error?error.message:null});
        if(error) throw error;
        if(data){
          const mapped=data.map(row=>{
            let parsed={};
            try{parsed=typeof row.content==="string"?JSON.parse(row.content):(row.content||{})}catch(e){parsed={}}
            const sig=parsed.signature||null;
            if(sig&&sig.role&&!sig.title) sig.title=sig.role;
            return Object.assign({},parsed,{
              slug:row.slug,
              title:row.title||parsed.title||row.slug,
              theme:row.theme||parsed.theme||"t1",
              code:row.code||parsed.code||"",
              meta:row.meta||parsed.meta||"",
              emblem:row.emblem||parsed.emblem||DEFAULT_EMBLEM,
              signature:sig
            });
          });
          console.log("[VSRF_USTAV] загружено уставов:",mapped.length,mapped.map(x=>x.slug));
          return mapped;
        }
      }catch(e){console.warn("[VSRF_USTAV] Ошибка загрузки:",e.message)}
    }
    console.warn("[VSRF_USTAV] Fallback на DEFAULT_DATA (Supabase недоступен)");
    const list=DEFAULT_DATA.map(d=>Object.assign({},d,local[d.slug]||{}));
    Object.keys(local).forEach(slug=>{
      if(!list.find(x=>x.slug===slug)) list.push(local[slug]);
    });
    return list;
  }

  function readLocal(){try{return JSON.parse(localStorage.getItem("vsrf-ustavy-local")||"{}")}catch(e){return {}}}
  function writeLocal(slug,doc){
    const all=readLocal();
    all[slug]=Object.assign({},all[slug]||{},doc,{slug});
    localStorage.setItem("vsrf-ustavy-local",JSON.stringify(all));
  }
  function removeLocal(slug){
    const all=readLocal();
    delete all[slug];
    localStorage.setItem("vsrf-ustavy-local",JSON.stringify(all));
  }

  async function save(doc){
    writeLocal(doc.slug,doc);
    const s=window.VSRF_AUTH&&window.VSRF_AUTH.state;
    if(s&&s.available&&s.client){
      try{
        const row={
          slug:doc.slug,title:doc.title,theme:doc.theme,code:doc.code||"",meta:doc.meta||"",emblem:doc.emblem||DEFAULT_EMBLEM,
          content:{preamble:doc.preamble||"",chapters:doc.chapters||[],signature:doc.signature||null,full:doc.full||doc.title,sub:doc.sub||""},
          updated_at:new Date().toISOString()
        };
        const {error}=await s.client.from("ustavy").upsert(row,{onConflict:"slug"});
        if(error) throw error;
        return {ok:true,remote:true};
      }catch(e){return {ok:true,remote:false,error:e.message}}
    }
    return {ok:true,remote:false};
  }

  async function remove(slug){
    removeLocal(slug);
    const s=window.VSRF_AUTH&&window.VSRF_AUTH.state;
    if(s&&s.available&&s.client){
      try{
        const {error}=await s.client.from("ustavy").delete().eq("slug",slug);
        if(error) throw error;
        return {ok:true,remote:true};
      }catch(e){return {ok:true,remote:false,error:e.message}}
    }
    return {ok:true,remote:false};
  }

  function makeSlug(s){
    const map={а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"c",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya"," ":"-"};
    return (s||"").toLowerCase().split("").map(c=>map[c]!==undefined?map[c]:c).join("").replace(/[^a-z0-9-]/g,"").replace(/-+/g,"-").replace(/^-|-$/g,"").slice(0,50)||"ustav-"+Date.now();
  }

  return {DEFAULT_DATA,THEMES,DEFAULT_EMBLEM,render,buildToc,loadAll,save,remove,esc,paragraphs,makeSlug,waitReady};
})();
