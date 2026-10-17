// Same-origin autonomous API. No Supabase key or external service.
window.SUPABASE_CONFIG={url:location.origin,anonKey:'local-compatibility'};

window.VSRF_SECURITY=Object.freeze({
  url(value,image=false){
    const raw=String(value??"").trim();
    if(!raw) return "";
    if(image&&/^data:image\/(?:png|jpeg|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(raw)) return raw;
    try{
      const url=new URL(raw,location.href);
      if(/^https?:$/.test(url.protocol)&&!url.username&&!url.password) return url.href;
      if(image&&url.protocol==="blob:"&&url.origin===location.origin) return url.href;
    }catch(e){}
    return "";
  },
  localUrl(value){
    try{const url=new URL(String(value??""),location.href);return /^https?:$/.test(url.protocol)&&url.origin===location.origin?url.href:"#"}catch(e){return "#"}
  }
});
