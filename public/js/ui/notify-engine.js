window.VSRF_NOTIFY=(function(){
  const KEY_SEEN="vsrf-notify-seen";
  const KEY_QUEUE="vsrf-notify-queue";
  const KEY_MUTE="vsrf-notify-mute";
  const POLL_MS=5*60000;

  function readSeen(){try{return JSON.parse(localStorage.getItem(KEY_SEEN)||"{}")}catch(e){return {}}}
  function writeSeen(s){try{localStorage.setItem(KEY_SEEN,JSON.stringify(s))}catch(e){}}
  function readQueue(){try{return JSON.parse(localStorage.getItem(KEY_QUEUE)||"[]")}catch(e){return []}}
  function writeQueue(q){try{localStorage.setItem(KEY_QUEUE,JSON.stringify(q.slice(0,50)))}catch(e){}}
  function isMuted(){return localStorage.getItem(KEY_MUTE)==="1"}
  function setMuted(v){localStorage.setItem(KEY_MUTE,v?"1":"0")}

  const SOURCES={
    news:{table:"news",fields:"id,title,dept,tag,created_at",label:"Новость",href:"news.html",icon:"📰"},
    vehicles:{table:"vehicles",fields:"id,title,tag,created_at",label:"Техника",href:"autopark.html",icon:"🚛"},
    ustavy:{table:"ustavy",fields:"slug,title,updated_at",label:"Устав",href:"ustav.html",icon:"📜",pk:"slug",ts:"updated_at"},
    lessons:{table:"train_lessons",fields:"id,title,created_at",label:"Урок",href:"training.html",icon:"🎓"}
  };

  let baseline=false;
  async function poll(){
    const auth=window.VSRF_AUTH;if(!auth?.state?.client||!auth.state.user) return;
    const client=auth.state.client;
    const seen=readSeen();
    const news=[];
    for(const k of Object.keys(SOURCES)){
      const s=SOURCES[k];
      const ts=s.ts||"created_at";
      const pk=s.pk||"id";
      try{
        const {data}=await client.from(s.table).select(s.fields).order(ts,{ascending:false}).limit(5);
        if(!data||!data.length) continue;
        const seenList=seen[k]||[];
        for(const row of data){
          const id=String(row[pk]);
          const stamp=row[ts]||"";
          const key=id+"@"+stamp;
          if(seenList.indexOf(key)===-1){
            news.push({kind:k,label:s.label,icon:s.icon,href:s.href,title:row.title||id,key,ts:stamp,tag:row.tag||row.dept||""});
          }
        }
      }catch(e){}
    }
    if(!news.length) return;
    const firstRun=!baseline;baseline=true;
    const nextSeen={...seen};
    for(const k of Object.keys(SOURCES)){
      const items=news.filter(n=>n.kind===k).map(n=>n.key);
      const prev=seen[k]||[];
      nextSeen[k]=Array.from(new Set([...items,...prev])).slice(0,30);
    }
    writeSeen(nextSeen);
    if(firstRun) return;
    const q=readQueue();
    for(const n of news){
      if(!q.find(x=>x.key===n.key&&x.kind===n.kind)) q.unshift({...n,unread:true,at:Date.now()});
    }
    writeQueue(q);
    updateBadge();
    if(!isMuted()){
      for(const n of news.slice(0,3)) showToast(n);
      if(window.VSRF_SOUND) window.VSRF_SOUND.play("notify");
    }
  }

  function updateBadge(){
    const q=readQueue();
    const n=window.VSRF_AUTH?.state?.user?q.filter(x=>x.unread).length:0;
    document.querySelectorAll("[data-notify-badge]").forEach(b=>{
      b.textContent=n>0?(n>99?"99+":String(n)):"";
      b.classList.toggle("visible",n>0);
    });
  }

  function showToast(n){
    let holder=document.getElementById("vsrfToasts");
    if(!holder){
      holder=document.createElement("div");
      holder.id="vsrfToasts";holder.className="vsrf-toasts";
      document.body.appendChild(holder);
    }
    const el=document.createElement("div");
    el.className="vsrf-toast";
    el.innerHTML=`<div class="vsrf-toast-icon">${n.icon}</div>
      <div class="vsrf-toast-body">
        <div class="vsrf-toast-label">${n.label}${n.tag?" · "+esc(n.tag):""}</div>
        <div class="vsrf-toast-title">${esc(n.title)}</div>
      </div>
      <button class="vsrf-toast-close" title="Закрыть">✕</button>`;
    holder.appendChild(el);
    requestAnimationFrame(()=>el.classList.add("visible"));
    const close=()=>{el.classList.remove("visible");setTimeout(()=>el.remove(),350)};
    el.querySelector(".vsrf-toast-close").addEventListener("click",e=>{e.stopPropagation();close()});
    el.addEventListener("click",()=>{location.href=n.href});
    setTimeout(close,6500);
  }
  function esc(s){return String(s||"").replace(/[<>&"']/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;","'":"&#39;"}[c]))}

  function markPageRead(){
    const page=(location.pathname.split("/").pop()||"index.html").toLowerCase();
    const map={"news.html":"news","autopark.html":"vehicles","ustav.html":"ustavy","training.html":"lessons"};
    const kind=map[page];if(!kind) return;
    const q=readQueue();let changed=false;
    for(const x of q){if(x.kind===kind&&x.unread){x.unread=false;changed=true}}
    if(changed){writeQueue(q);updateBadge()}
  }
  function markAllRead(){
    const q=readQueue();q.forEach(x=>x.unread=false);writeQueue(q);updateBadge();
  }
  function list(){return readQueue()}
  function clear(){writeQueue([]);updateBadge()}

  function openPanel(){
    let panel=document.getElementById("vsrfNotifyPanel");
    if(panel){panel.classList.toggle("visible");if(panel.classList.contains("visible")) render();return}
    panel=document.createElement("div");
    panel.id="vsrfNotifyPanel";panel.className="vsrf-notify-panel";
    document.body.appendChild(panel);
    render();
    requestAnimationFrame(()=>panel.classList.add("visible"));
    document.addEventListener("click",closeOutside,true);
    function closeOutside(e){
      if(!panel.contains(e.target)&&!e.target.closest("[data-open-notify]")){
        panel.classList.remove("visible");
        document.removeEventListener("click",closeOutside,true);
      }
    }
    function render(){
      const q=readQueue();
      panel.innerHTML=`<div class="vsrf-np-head">
        <span class="vsrf-np-title">Уведомления</span>
        <div class="vsrf-np-actions">
          <button class="vsrf-np-btn" data-act="mute" title="${isMuted()?"Включить звуки":"Выключить звуки"}">${isMuted()?"🔕":"🔔"}</button>
          <button class="vsrf-np-btn" data-act="read" title="Прочитать всё">✓</button>
          <button class="vsrf-np-btn" data-act="clear" title="Очистить">🗑</button>
        </div>
      </div>
      <div class="vsrf-np-body">${q.length?q.map(n=>`
        <a class="vsrf-np-item ${n.unread?"unread":""}" href="${n.href}">
          <div class="vsrf-np-icon">${n.icon}</div>
          <div class="vsrf-np-content">
            <div class="vsrf-np-label">${n.label}${n.tag?" · "+esc(n.tag):""}</div>
            <div class="vsrf-np-name">${esc(n.title)}</div>
            <div class="vsrf-np-time">${timeAgo(n.at)}</div>
          </div>
        </a>`).join(""):`<div class="vsrf-np-empty">Пока новостей нет — всё тихо.</div>`}</div>`;
      panel.querySelector('[data-act="mute"]').addEventListener("click",()=>{setMuted(!isMuted());render()});
      panel.querySelector('[data-act="read"]').addEventListener("click",markAllRead);
      panel.querySelector('[data-act="clear"]').addEventListener("click",()=>{clear();render()});
    }
  }
  function timeAgo(ms){
    if(!ms) return "";
    const s=Math.floor((Date.now()-ms)/1000);
    if(s<60) return "только что";
    if(s<3600) return Math.floor(s/60)+" мин назад";
    if(s<86400) return Math.floor(s/3600)+" ч назад";
    return Math.floor(s/86400)+" дн назад";
  }

  function init(){
    updateBadge();
    document.addEventListener("click",e=>{
      const t=e.target.closest("[data-open-notify]");
      if(t){e.preventDefault();openPanel()}
    });
    const auth=window.VSRF_AUTH;
    if(auth?.onChange)auth.onChange(()=>{updateBadge();startPoll();});
    markPageRead();
  }
  let started=false;
  function startPoll(){
    if(started) return;
    const auth=window.VSRF_AUTH;
    if(!auth?.state?.available||!auth.state.user) return;
    started=true;
    setTimeout(()=>{if(!document.hidden) poll()},8000);
    let t=null;
    function schedule(){
      if(t) clearTimeout(t);
      t=setTimeout(async()=>{
        if(!document.hidden){try{await poll()}catch(e){}}
        schedule();
      },document.hidden?15*60000:POLL_MS);
    }
    schedule();
    document.addEventListener("visibilitychange",()=>{
      if(!document.hidden){try{poll()}catch(e){};schedule()}
    });
  }

  document.addEventListener("DOMContentLoaded",init);
  return {poll,list,clear,markAllRead,updateBadge,openPanel,isMuted,setMuted};
})();
