(function(){
  const root=document.documentElement;
  const saved=localStorage.getItem("vsrf-theme");
  if(saved==="light") root.setAttribute("data-theme","light");

  document.addEventListener("DOMContentLoaded",init);

  function init(){
    setupThemeToggle();
    setupBurger();
    setupReveal();
    setupBackground();
    setupTransitions();
    setupActiveNav();
    setupFab();
    setupSearch();
  }

  function setupThemeToggle(){
    const btn=document.getElementById("themeToggle");
    if(!btn) return;
    btn.addEventListener("click",()=>{
      const cur=root.getAttribute("data-theme")==="light"?"light":"dark";
      const next=cur==="light"?"dark":"light";
      if(next==="light") root.setAttribute("data-theme","light");
      else root.removeAttribute("data-theme");
      localStorage.setItem("vsrf-theme",next);
    });
  }

  function setupBurger(){
    const b=document.getElementById("burger");
    const nav=document.getElementById("mainNav");
    if(!b||!nav) return;
    if(nav.parentElement!==document.body) document.body.appendChild(nav);

    if(!nav.querySelector(".nav-header")){
      const links=window.VSRF_NAV.map(item=>{
        const a=document.createElement("a");
        a.href=item.page;a.dataset.page=item.page;a.textContent=item.label;
        a.dataset.navGroup=item.group;
        if(item.perm)a.dataset.perm=item.perm;
        if(item.group!=="public")a.setAttribute("data-loggedin","");
        return a;
      });
      const currentPage=(location.pathname.split("/").pop()||"index.html").toLowerCase();
      links.forEach(a=>{
        if(!a.dataset.page && a.getAttribute("href")) a.setAttribute("data-page",a.getAttribute("href").toLowerCase());
        if((a.dataset.page||"").toLowerCase()===currentPage) a.classList.add("active");
      });

      const publicLinks=links.filter(a=>a.dataset.navGroup==="public");
      const loggedInLinks=links.filter(a=>a.dataset.navGroup==="personal");
      const staffLinks=links.filter(a=>a.dataset.navGroup==="staff");

      nav.innerHTML="";
      const header=document.createElement("div");
      header.className="nav-header";
      header.innerHTML=`<div class="nav-header-emblem"><img src="favicon/favicon.png" alt=""></div>
        <div class="nav-header-label">В/Ч №12132</div>
        <div class="nav-header-unit">1-я МСБр</div>`;
      nav.appendChild(header);

      const scroll=document.createElement("div");
      scroll.className="nav-scroll";

      const sec1=document.createElement("div");
      sec1.className="nav-section";
      sec1.innerHTML='<div class="nav-section-title">Разделы</div>';
      const g1=document.createElement("div");
      g1.className="nav-links";
      publicLinks.forEach(a=>g1.appendChild(a));
      sec1.appendChild(g1);
      scroll.appendChild(sec1);

      if(loggedInLinks.length){
        const secL=document.createElement("div");
        secL.className="nav-section";
        secL.setAttribute("data-loggedin","");
        secL.innerHTML='<div class="nav-section-title">Мои заявки</div>';
        const gL=document.createElement("div");
        gL.className="nav-links";
        loggedInLinks.forEach(a=>gL.appendChild(a));
        secL.appendChild(gL);
        scroll.appendChild(secL);
      }
      if(staffLinks.length){
        const sec2=document.createElement("div");
        sec2.className="nav-section";
        sec2.setAttribute("data-loggedin","");
        sec2.innerHTML='<div class="nav-section-title">Служебное</div>';
        const g2=document.createElement("div");
        g2.className="nav-links";
        staffLinks.forEach(a=>g2.appendChild(a));
        sec2.appendChild(g2);
        scroll.appendChild(sec2);
      }

      nav.appendChild(scroll);

      const footer=document.createElement("div");
      footer.className="nav-footer";
      footer.innerHTML='<button class="btn btn-ghost btn-sm" data-open-settings="">Оформление сайта</button><div class="nav-footer-motto">Честь · Долг · Отвага</div><div class="nav-footer-sub">Служим Отечеству</div>';
      nav.appendChild(footer);

      if(window.VSRF_ROLES&&window.VSRF_ROLES.applyPermGates) window.VSRF_ROLES.applyPermGates();
    }

    let backdrop=document.querySelector(".nav-backdrop");
    if(!backdrop){
      backdrop=document.createElement("div");
      backdrop.className="nav-backdrop";
      document.body.appendChild(backdrop);
    }
    function open(){b.setAttribute("aria-expanded","true");b.classList.add("open");nav.classList.add("open");backdrop.classList.add("visible");document.body.style.overflow="hidden"}
    function close(){b.setAttribute("aria-expanded","false");b.classList.remove("open");nav.classList.remove("open");backdrop.classList.remove("visible");document.body.style.overflow=""}
    b.setAttribute("aria-controls","mainNav");b.setAttribute("aria-expanded","false");
    b.addEventListener("click",()=>{
      if(nav.classList.contains("open")) close();else open();
    });
    backdrop.addEventListener("click",close);
    document.addEventListener("keydown",e=>{if(e.key==="Escape") close()});
    nav.querySelectorAll("a,[data-open-settings]").forEach(a=>{
      a.addEventListener("click",close);
    });
  }

  function setupReveal(){
    const io=new IntersectionObserver(entries=>{
      entries.forEach(e=>{
        if(e.isIntersecting){
          e.target.classList.add("visible");
          io.unobserve(e.target);
        }
      });
    },{threshold:.12,rootMargin:"0px 0px -60px 0px"});
    document.querySelectorAll(".reveal,.reveal-l,.reveal-r").forEach(el=>io.observe(el));
  }

  function setupTransitions(){
    document.getElementById("overlay")?.classList.remove("active");
  }

  function setupActiveNav(){
    const p=(location.pathname.split("/").pop()||"index.html").toLowerCase();
    document.querySelectorAll(".nav a[data-page]").forEach(a=>{
      if(a.dataset.page===p||(p===""&&a.dataset.page==="index.html")) a.classList.add("active");
    });
    hideAdminNav();
    if(window.VSRF_AUTH) window.VSRF_AUTH.onChange(hideAdminNav);
    if(window.VSRF_ROLES) window.VSRF_ROLES.onChange(hideAdminNav);
  }

  function hideAdminNav(){
    const s=window.VSRF_AUTH&&window.VSRF_AUTH.state;
    if(!s||!s.ready) return;
    document.body.classList.add("auth-ready");
    const isAdmin=!!(window.VSRF_ROLES&&window.VSRF_ROLES.isAdmin());
    document.body.classList.toggle("is-admin",isAdmin);
  }

  function setupFab(){
    const stack=document.getElementById("fabStack");
    if(!stack) return;
    const upBtn=document.getElementById("fabUp");
    const printBtn=document.getElementById("fabPrint");
    if(upBtn){
      upBtn.addEventListener("click",()=>window.scrollTo({top:0,behavior:"smooth"}));
    }
    if(printBtn){
      printBtn.addEventListener("click",()=>window.print());
    }
    const upd=()=>{
      if(window.scrollY>500) stack.classList.add("visible");
      else stack.classList.remove("visible");
    };
    window.addEventListener("scroll",upd,{passive:true});
    upd();
  }

  function setupSearch(){
    const modal=document.getElementById("searchModal");
    if(!modal) return;
    const input=modal.querySelector(".search-input");
    const results=modal.querySelector(".search-results");
    const openers=document.querySelectorAll("[data-open-search]");
    const closer=modal.querySelector(".search-close-kbd");

    let DATASET=[
      {group:"Страницы",title:"Главная",hint:"Общая информация о в/ч",href:"index.html",kw:"главная home"},
      {group:"Страницы",title:"Уставы",hint:"Каталог документов",href:"ustav.html",kw:"устав документы"},
      {group:"Страницы",title:"Новости",hint:"Оперативная сводка",href:"news.html",kw:"новости"},
      {group:"Страницы",title:"Автопарк",hint:"Техника бригады",href:"autopark.html",kw:"автопарк техника"},
      {group:"Страницы",title:"Карта",hint:"Схема территории",href:"map.html",kw:"карта"},
      {group:"Страницы",title:"FAQ",hint:"Частые вопросы",href:"faq.html",kw:"faq вопросы"}
    ];

    if(window.VSRF_SEARCH){
      window.VSRF_SEARCH.build().then(d=>{DATASET=d;if(modal.classList.contains("active")) render(input.value)}).catch(()=>{});
    }
    if(window.VSRF_USTAV_TOC){
      window.VSRF_USTAV_TOC.forEach(t=>DATASET.push({group:"Разделы устава",title:t.label,hint:"Устав внутренней службы",href:"ustav.html#doc/ustav-vnutrenney-sluzhby|"+t.id,kw:t.label}));
    }

    const iconFor=g=>({
      "Страницы":`<svg viewBox="0 0 24 24"><path d="M3 3h18v18H3zm2 4v12h14V7z"/></svg>`,
      "Уставы":`<svg viewBox="0 0 24 24"><path d="M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm-1 15H7v-2h10zm0-4H7v-2h10zm0-4H7V7h10z"/></svg>`,
      "Разделы устава":`<svg viewBox="0 0 24 24"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/></svg>`,
      "Новости":`<svg viewBox="0 0 24 24"><path d="M20 3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM8 17H5v-2h3zm0-4H5v-2h3zm0-4H5V7h3zm5 8h-3v-2h3zm0-4h-3v-2h3zm0-4h-3V7h3zm6 8h-4v-2h4zm0-4h-4v-2h4zm0-4h-4V7h4z"/></svg>`,
      "Автопарк":`<svg viewBox="0 0 24 24"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>`,
      "Обучение":`<svg viewBox="0 0 24 24"><path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/></svg>`,
      "Состав":`<svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>`,
      "FAQ":`<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>`
    }[g]||`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>`);

    let selectedIdx=0;let visible=[];

    function render(q){
      q=(q||"").trim().toLowerCase();
      const list=q?DATASET.filter(d=>(d.title+" "+d.hint+" "+d.kw).toLowerCase().includes(q)):DATASET;
      visible=list;selectedIdx=0;
      if(!list.length){
        results.innerHTML=`<div class="search-empty">Ничего не найдено по запросу «${String(q).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]))}»</div>`;
        return;
      }
      const groups={};
      list.forEach(d=>{(groups[d.group]=groups[d.group]||[]).push(d)});
      let idx=0;
      results.innerHTML=Object.keys(groups).map(g=>
        `<div class="search-group">${g}</div>`+
        groups[g].map(d=>`<div class="search-result" data-idx="${idx++}" data-href="${d.href}">
          <div class="search-result-icon">${iconFor(g)}</div>
          <div class="search-result-body">
            <div class="search-result-title">${d.title}</div>
            <div class="search-result-hint">${d.hint}</div>
          </div>
          <div class="search-result-arrow">↵</div>
        </div>`).join("")
      ).join("");
      highlight();
    }

    function highlight(){
      results.querySelectorAll(".search-result").forEach(r=>{
        if(+r.dataset.idx===selectedIdx){r.classList.add("active");r.scrollIntoView({block:"nearest"})}
        else r.classList.remove("active");
      });
    }

    function open(){modal.classList.add("active");setTimeout(()=>{input.focus();input.select()},50);render("")}
    function close(){modal.classList.remove("active");input.value=""}
    function go(href){
      close();
      if(href.includes("|")){
        const [page,anchor]=href.split("|");
        const cur=location.pathname.split("/").pop()||"index.html";
        if(page.split("#")[0]===cur){
          location.hash=page.split("#")[1];
          setTimeout(()=>{const e=document.getElementById(anchor);if(e) e.scrollIntoView({behavior:"smooth"})},400);
        }else{
          sessionStorage.setItem("vsrf-scroll-to",anchor);
          location.href=page;
        }
      }else{
        location.href=href;
      }
    }

    openers.forEach(b=>b.addEventListener("click",e=>{e.preventDefault();open()}));
    if(closer) closer.addEventListener("click",close);
    modal.addEventListener("click",e=>{if(e.target===modal) close()});
    input.addEventListener("input",()=>render(input.value));
    results.addEventListener("click",e=>{
      const r=e.target.closest(".search-result");
      if(r) go(r.dataset.href);
    });
    document.addEventListener("keydown",e=>{
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();open();return}
      if(!modal.classList.contains("active")) return;
      if(e.key==="Escape") close();
      else if(e.key==="ArrowDown"){e.preventDefault();if(selectedIdx<visible.length-1) selectedIdx++;highlight()}
      else if(e.key==="ArrowUp"){e.preventDefault();if(selectedIdx>0) selectedIdx--;highlight()}
      else if(e.key==="Enter"){
        e.preventDefault();
        const r=results.querySelector(`.search-result[data-idx="${selectedIdx}"]`);
        if(r) go(r.dataset.href);
      }
    });

    const pending=sessionStorage.getItem("vsrf-scroll-to");
    if(pending){
      sessionStorage.removeItem("vsrf-scroll-to");
      setTimeout(()=>{const e=document.getElementById(pending);if(e) e.scrollIntoView({behavior:"smooth"})},600);
    }
  }

  function setupBackground(){
    const c=document.getElementById("bgCanvas");
    if(!c) return;
    const ctx=c.getContext("2d");
    if(!ctx)return;
    c.setAttribute("aria-hidden","true");
    const devicePixelRatio=Math.min(window.devicePixelRatio||1,1.5);
    const reducedMotion=matchMedia("(prefers-reduced-motion: reduce)");
    let W=0,H=0,raf=null;
    const FALL_TYPES=["star","shield","chevron","compass","tag"];
    let mode=localStorage.getItem("vsrf-bg-mode")||"falling";
    if(["grid","dots","waves","stars","radar","falling"].indexOf(mode)<0) mode="falling";
    let enabled=localStorage.getItem("vsrf-bg-enabled")!=="0";
    let parts=[],stars=[],falls=[],radarAngle=0,waveT=0;

    function resize(){
      W=c.width=window.innerWidth*devicePixelRatio;
      H=c.height=window.innerHeight*devicePixelRatio;
      c.style.width=window.innerWidth+"px";
      c.style.height=window.innerHeight+"px";
    }
    function rand(a,b){return a+Math.random()*(b-a)}
    function getColor(){return root.getAttribute("data-theme")==="light"?"61,90,73":"205,168,90"}
    function getBg(){return root.getAttribute("data-theme")==="light"?"rgba(232,226,200,":"rgba(8,15,11,"}

    function buildParts(){
      const N=Math.min(70,Math.max(30,Math.floor(window.innerWidth/24)));
      parts=[];
      for(let i=0;i<N;i++){
        parts.push({x:rand(0,W),y:rand(0,H),vx:rand(-.15,.15)*devicePixelRatio,vy:rand(-.15,.15)*devicePixelRatio,r:rand(.8,2.4)*devicePixelRatio,a:rand(.15,.55)});
      }
    }
    function buildStars(){
      const N=Math.min(180,Math.max(80,Math.floor(window.innerWidth/10)));
      stars=[];
      for(let i=0;i<N;i++){
        const isBig=Math.random()<.05;
        stars.push({
          x:rand(0,W),y:rand(0,H),
          r:isBig?rand(1.8,3.2)*devicePixelRatio:rand(.4,1.4)*devicePixelRatio,
          a:rand(.1,.75),
          tw:rand(.005,.02),
          phase:rand(0,Math.PI*2),
          isBig
        });
      }
    }

    /* ---------- «Атмосфера ВС РФ»: звёзды, щиты, шевроны и компасы ---------- */
    function fallPalettes(){
      const light=root.getAttribute("data-theme")==="light";
      return light
        ?[[61,90,73],[106,117,65],[138,106,31],[85,105,68],[128,114,63]]
        :[[205,168,90],[144,169,113],[181,153,88],[118,147,104],[227,199,136]];
    }
    function newFall(anyY){
      const dpr=devicePixelRatio;
      const depth=rand(.35,1); // глубина слоя: ближе = крупнее/быстрее
      return {
        x:rand(0,W),
        y:anyY?rand(-H,H):rand(-H*.25,-50*dpr),
        s:rand(9,30)*dpr*depth+8*dpr*0.4,
        vy:rand(.22,.75)*dpr*(0.55+depth),
        sway:rand(10,34)*dpr,
        swaySp:rand(.4,1.1),
        phase:rand(0,Math.PI*2),
        rot:rand(0,Math.PI*2),
        vr:rand(-.0045,.0045),
        a:rand(.08,.22)+depth*.08,
        col:(Math.random()*5)|0,
        type:FALL_TYPES[(Math.random()*FALL_TYPES.length)|0]
      };
    }
    function buildFalls(){
      const N=Math.min(36,Math.max(18,Math.floor(window.innerWidth/36)));
      falls=[];
      for(let i=0;i<N;i++) falls.push(newFall(true));
    }
    function drawFallShape(f,pal){
      const c=pal[f.col%pal.length];
      const s=f.s;
      ctx.save();
      ctx.translate(f.x+Math.sin(f.phase+f.y/220*f.swaySp)*f.sway,f.y);
      ctx.rotate(f.rot);
      ctx.strokeStyle=`rgba(${c[0]},${c[1]},${c[2]},${Math.min(f.a*1.35,.5)})`;
      ctx.fillStyle=`rgba(${c[0]},${c[1]},${c[2]},${Math.min(f.a,.4)})`;
      ctx.lineWidth=Math.max(1.4,s*.14);
      ctx.lineCap="round";ctx.lineJoin="round";
      switch(f.type){
        case "star":
          ctx.beginPath();
          for(let k=0;k<10;k++){
            const a=-Math.PI/2+k*Math.PI/5,r=k%2?s*.43:s;
            if(k===0)ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);else ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);
          }
          ctx.closePath();ctx.fill();ctx.stroke();break;
        case "shield":
          ctx.beginPath();ctx.moveTo(0,-s);ctx.lineTo(s*.78,-s*.65);ctx.lineTo(s*.65,s*.25);
          ctx.quadraticCurveTo(s*.45,s*.8,0,s);ctx.quadraticCurveTo(-s*.45,s*.8,-s*.65,s*.25);
          ctx.lineTo(-s*.78,-s*.65);ctx.closePath();ctx.fill();ctx.stroke();break;
        case "chevron":
          for(const y of [-.35,.35]){ctx.beginPath();ctx.moveTo(-s,y*s-s*.35);ctx.lineTo(0,y*s+s*.3);ctx.lineTo(s,y*s-s*.35);ctx.stroke();}break;
        case "compass":
          ctx.beginPath();ctx.arc(0,0,s*.85,0,Math.PI*2);ctx.stroke();
          ctx.beginPath();ctx.moveTo(0,-s*1.1);ctx.lineTo(s*.3,0);ctx.lineTo(0,s*1.1);ctx.lineTo(-s*.3,0);ctx.closePath();ctx.fill();ctx.stroke();break;
        case "tag":
          ctx.beginPath();ctx.roundRect(-s*.65,-s,s*1.3,s*2,s*.28);ctx.fill();ctx.stroke();
          ctx.beginPath();ctx.arc(0,-s*.55,s*.12,0,Math.PI*2);ctx.stroke();
          ctx.beginPath();ctx.moveTo(-s*.3,0);ctx.lineTo(s*.3,0);ctx.moveTo(-s*.3,s*.35);ctx.lineTo(s*.3,s*.35);ctx.stroke();break;
      }
      ctx.restore();
    }
    function renderFalling(){
      const pal=fallPalettes();
      // лёгкая координатная сетка
      const dpr=devicePixelRatio;
      const step=170*dpr;
      const light=root.getAttribute("data-theme")==="light";
      ctx.strokeStyle=light?"rgba(61,90,73,.05)":"rgba(205,168,90,.045)";
      ctx.lineWidth=1.2*dpr;
      const cr=7*dpr;
      for(let x=step/2;x<W;x+=step){
        for(let y=step/2;y<H;y+=step){
          ctx.beginPath();
          ctx.moveTo(x-cr,y);ctx.lineTo(x+cr,y);
          ctx.moveTo(x,y-cr);ctx.lineTo(x,y+cr);
          ctx.stroke();
        }
      }
      for(let i=0;i<falls.length;i++){
        const f=falls[i];
        f.y+=f.vy;f.rot+=f.vr;f.phase+=.006*f.swaySp;
        if(f.y-f.s*2>H){falls[i]=newFall(false);continue}
        drawFallShape(f,pal);
      }
    }

    /* ---------- Точки ---------- */
    function renderDots(){
      const dpr=devicePixelRatio;
      const step=44*dpr;
      const light=root.getAttribute("data-theme")==="light";
      const t=Date.now()/1000;
      for(let x=step/2;x<W;x+=step){
        for(let y=step/2;y<H;y+=step){
          const pulse=.5+.5*Math.sin(t*.8+(x+y)/240);
          const r=(1.1+pulse*1.3)*dpr;
          ctx.beginPath();
          ctx.fillStyle=light?`rgba(61,90,73,${.07+pulse*.08})`:`rgba(205,168,90,${.06+pulse*.09})`;
          ctx.arc(x,y,r,0,Math.PI*2);
          ctx.fill();
        }
      }
      // дрейфующие крупные точки
      const color=getColor();
      for(let i=0;i<parts.length;i++){
        const p=parts[i];
        p.x+=p.vx*.6;p.y+=p.vy*.6;
        if(p.x<0) p.x=W;if(p.x>W) p.x=0;
        if(p.y<0) p.y=H;if(p.y>H) p.y=0;
        ctx.beginPath();
        ctx.fillStyle=`rgba(${color},${p.a*.7})`;
        ctx.arc(p.x,p.y,p.r*1.4,0,Math.PI*2);
        ctx.fill();
      }
    }

    /* ---------- Волны ---------- */
    function renderWaves(){
      waveT+=.006;
      const light=root.getAttribute("data-theme")==="light";
      const dpr=devicePixelRatio;
      const layers=[
        {amp:26*dpr,len:.004/dpr*800,sp:1,al:light?.05:.055,off:.18},
        {amp:40*dpr,len:.003/dpr*800,sp:-.7,al:light?.045:.05,off:.38},
        {amp:58*dpr,len:.0022/dpr*800,sp:.45,al:light?.04:.045,off:.62}
      ];
      const color=getColor();
      for(const L of layers){
        ctx.beginPath();
        const baseY=H*L.off;
        for(let x=0;x<=W;x+=8*dpr){
          const y=baseY+Math.sin(x*L.len/2+waveT*L.sp*2)*L.amp+Math.sin(x*L.len/3.7-waveT*L.sp)*L.amp*.5;
          if(x===0) ctx.moveTo(x,y);else ctx.lineTo(x,y);
        }
        ctx.strokeStyle=`rgba(${color},${L.al*2})`;
        ctx.lineWidth=1.4*dpr;
        ctx.stroke();
      }
      // плавающие блики
      for(let i=0;i<parts.length;i++){
        const p=parts[i];
        p.x+=p.vx*.4;p.y+=p.vy*.4;
        if(p.x<0) p.x=W;if(p.x>W) p.x=0;
        if(p.y<0) p.y=H;if(p.y>H) p.y=0;
        ctx.beginPath();
        ctx.fillStyle=`rgba(${color},${p.a*.5})`;
        ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fill();
      }
    }

    function renderGrid(){
      const light=root.getAttribute("data-theme")==="light";
      const step=80*devicePixelRatio;
      ctx.strokeStyle=light?"rgba(61,90,73,.06)":"rgba(205,168,90,.045)";
      ctx.lineWidth=1;
      for(let x=0;x<W;x+=step){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
      for(let y=0;y<H;y+=step){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
      ctx.strokeStyle=light?"rgba(61,90,73,.11)":"rgba(205,168,90,.08)";
      for(let x=0;x<W;x+=step*4){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
      for(let y=0;y<H;y+=step*4){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
      const color=getColor();
      for(let i=0;i<parts.length;i++){
        const p=parts[i];
        p.x+=p.vx;p.y+=p.vy;
        if(p.x<0) p.x=W;if(p.x>W) p.x=0;
        if(p.y<0) p.y=H;if(p.y>H) p.y=0;
        for(let j=i+1;j<parts.length;j++){
          const q=parts[j];
          const dx=p.x-q.x,dy=p.y-q.y;
          const d2=dx*dx+dy*dy;
          const max=140*devicePixelRatio;
          if(d2<max*max){
            const a=(1-Math.sqrt(d2)/max)*.18;
            ctx.strokeStyle=`rgba(${color},${a})`;
            ctx.lineWidth=1;
            ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();
          }
        }
        ctx.beginPath();
        ctx.fillStyle=`rgba(${color},${p.a})`;
        ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fill();
      }
    }

    function renderStars(){
      const color=getColor();
      const light=root.getAttribute("data-theme")==="light";
      for(let i=0;i<stars.length;i++){
        const s=stars[i];
        s.phase+=s.tw;
        const alpha=s.a*(.55+Math.sin(s.phase)*.45);
        ctx.beginPath();
        ctx.fillStyle=`rgba(${color},${alpha})`;
        ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
        ctx.fill();
        if(s.isBig){
          ctx.strokeStyle=`rgba(${color},${alpha*.5})`;
          ctx.lineWidth=1;
          ctx.beginPath();
          ctx.moveTo(s.x-s.r*3,s.y);ctx.lineTo(s.x+s.r*3,s.y);
          ctx.moveTo(s.x,s.y-s.r*3);ctx.lineTo(s.x,s.y+s.r*3);
          ctx.stroke();
        }
      }
      const step=200*devicePixelRatio;
      ctx.strokeStyle=`rgba(${color},.03)`;
      ctx.lineWidth=1;
      for(let x=0;x<W;x+=step){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
      for(let y=0;y<H;y+=step){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
    }

    function renderRadar(){
      const color=getColor();
      const cx=W/2,cy=H/2;
      const R=Math.max(W,H)*.75;
      ctx.strokeStyle=`rgba(${color},.06)`;
      ctx.lineWidth=1*devicePixelRatio;
      for(let i=1;i<=6;i++){
        ctx.beginPath();
        ctx.arc(cx,cy,R*i/6,0,Math.PI*2);
        ctx.stroke();
      }
      for(let i=0;i<8;i++){
        const a=i*Math.PI/4;
        ctx.beginPath();
        ctx.moveTo(cx,cy);
        ctx.lineTo(cx+Math.cos(a)*R,cy+Math.sin(a)*R);
        ctx.stroke();
      }
      radarAngle+=.008;
      const sweepWidth=Math.PI/3;
      const grad=ctx.createLinearGradient(
        cx,cy,
        cx+Math.cos(radarAngle)*R,cy+Math.sin(radarAngle)*R
      );
      grad.addColorStop(0,`rgba(${color},.18)`);
      grad.addColorStop(1,`rgba(${color},0)`);
      ctx.fillStyle=grad;
      ctx.beginPath();
      ctx.moveTo(cx,cy);
      ctx.arc(cx,cy,R,radarAngle-sweepWidth,radarAngle);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle=`rgba(${color},.4)`;
      ctx.lineWidth=1.5*devicePixelRatio;
      ctx.beginPath();
      ctx.moveTo(cx,cy);
      ctx.lineTo(cx+Math.cos(radarAngle)*R,cy+Math.sin(radarAngle)*R);
      ctx.stroke();
      for(let i=0;i<parts.length;i++){
        const p=parts[i];
        p.x+=p.vx*.3;p.y+=p.vy*.3;
        if(p.x<0) p.x=W;if(p.x>W) p.x=0;
        if(p.y<0) p.y=H;if(p.y>H) p.y=0;
        const dx=p.x-cx,dy=p.y-cy;
        const ang=Math.atan2(dy,dx);
        const diff=((radarAngle-ang)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
        const glow=diff<sweepWidth?(1-diff/sweepWidth):0;
        ctx.beginPath();
        ctx.fillStyle=`rgba(${color},${.18+glow*.7})`;
        ctx.arc(p.x,p.y,p.r*(1+glow),0,Math.PI*2);
        ctx.fill();
      }
    }

    function draw(){
      ctx.clearRect(0,0,W,H);
      if(mode==="grid") renderGrid();
      else if(mode==="stars") renderStars();
      else if(mode==="radar") renderRadar();
      else if(mode==="dots") renderDots();
      else if(mode==="waves") renderWaves();
      else if(mode==="falling") renderFalling();
    }
    let lastFrame=0;
    function tick(time){
      raf=requestAnimationFrame(tick);
      if(time-lastFrame<1000/30)return;
      lastFrame=time;draw();
    }

    function start(){
      stop();
      if(document.hidden)return;
      c.style.opacity="1";
      if(mode==="stars"&&!stars.length) buildStars();
      if((mode==="grid"||mode==="radar"||mode==="dots"||mode==="waves")&&!parts.length) buildParts();
      if(mode==="falling"&&!falls.length) buildFalls();
      draw();
      if(enabled&&!reducedMotion.matches)raf=requestAnimationFrame(tick);
    }
    function stop(){if(raf){cancelAnimationFrame(raf);raf=null}}

    function applyMode(m){
      if(!["grid","dots","waves","stars","radar","falling"].includes(m))return;
      mode=m;localStorage.setItem("vsrf-bg-mode",m);
      parts=[];stars=[];falls=[];
      start();
    }
    function toggleEnabled(v){
      enabled=v;localStorage.setItem("vsrf-bg-enabled",v?"1":"0");
      start();
    }

    resize();
    start();

    let rt;
    window.addEventListener("resize",()=>{
      clearTimeout(rt);
      rt=setTimeout(()=>{resize();parts=[];stars=[];falls=[];start()},200);
    });
    document.addEventListener("visibilitychange",()=>{
      if(document.hidden) stop();else start();
    });

    reducedMotion.addEventListener("change",start);
    new MutationObserver(start).observe(root,{attributes:true,attributeFilter:["data-theme"]});

    window.VSRF_BG={
      setMode:applyMode,
      setEnabled:toggleEnabled,
      getMode:()=>mode,
      isEnabled:()=>enabled
    };

    document.dispatchEvent(new CustomEvent("vsrf-bg-ready"));
  }
})();

document.addEventListener("click",e=>{if(e.target.closest("[data-reload-page]"))location.reload()});

document.addEventListener('error',e=>{if(e.target instanceof HTMLImageElement){e.target.style.visibility='hidden';e.target.setAttribute('aria-label','Изображение недоступно');}},true);
