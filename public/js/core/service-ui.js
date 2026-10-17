window.ARMY_UI={
 esc:v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
 message(text){document.getElementById('serviceMessage').textContent=text;},
 async ready(){for(let n=0;n<100&&!window.VSRF_AUTH?.state?.ready;n++)await new Promise(r=>setTimeout(r,50));return window.VSRF_AUTH?.state;},
 async query(table,configure){const s=await this.ready();if(!s?.client)throw Error('Сервер недоступен');const r=await configure(s.client.from(table));if(r.error)throw Error(r.error.message);return r.data;},
 async call(path,body,method='POST'){const r=await VSRF_API.call(path,body,method);if(r.error)throw Error(r.error.message);return r.data;}
};

if(document.getElementById("year"))document.getElementById("year").textContent=new Date().getFullYear();
let serviceIdentity;
window.VSRF_AUTH?.onChange(state=>{if(!state.ready)return;const next=state.user?.id||null;if(serviceIdentity!==undefined&&serviceIdentity!==next)location.reload();serviceIdentity=next;});
