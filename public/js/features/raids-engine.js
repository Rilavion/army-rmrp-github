window.VSRF_RAIDS=(function(){
  function client(){return window.VSRF_AUTH&&window.VSRF_AUTH.state&&window.VSRF_AUTH.state.client}

  async function getSettings(){
    const c=client();if(!c) return null;
    const {data}=await c.from("raids_settings").select("*").eq("id",1).maybeSingle();
    return data||{id:1};
  }
  async function saveSettings(row){
    const c=client();if(!c) return {ok:false,error:"no client"};
    row.id=1;row.updated_at=new Date().toISOString();
    const s=window.VSRF_AUTH.state;
    if(s.user) row.updated_by=s.user.id;
    const {error}=await c.from("raids_settings").upsert(row);
    if(error) return {ok:false,error:error.message};
    return {ok:true};
  }

  async function fetchEvents(fromIso,toIso){
    const c=client();if(!c) return [];
    let q=c.from("raids_events").select("id,kind,channel_name,ds_author_name,content_preview,created_at").order("created_at",{ascending:false});
    if(fromIso) q=q.gte("created_at",fromIso);
    if(toIso) q=q.lte("created_at",toIso);
    q=q.limit(2000);
    const {data,error}=await q;
    if(error){console.warn("[RAIDS] fetchEvents:",error.message);return []}
    return data||[];
  }

  async function stats(fromIso,toIso){
    const items=await fetchEvents(fromIso,toIso);
    let s=0,f=0;
    for(const e of items){
      if(e.kind==="success") s++; else if(e.kind==="fail") f++;
    }
    const total=s+f;
    return {items,success:s,fail:f,total,successRate:total?Math.round(s/total*100):0};
  }

  async function clearWeek(weekStartIso){
    const c=client();if(!c) return {ok:false,error:"no client"};
    const start=new Date(weekStartIso);
    const end=new Date(start.getTime()+7*86400000);
    const {error,count}=await c.from("raids_events").delete({count:"exact"}).gte("created_at",start.toISOString()).lt("created_at",end.toISOString());
    if(error) return {ok:false,error:error.message};
    return {ok:true,deleted:count||0};
  }
  async function clearRange(fromIso,toIso){
    const c=client();if(!c) return {ok:false,error:"no client"};
    const {error,count}=await c.from("raids_events").delete({count:"exact"}).gte("created_at",fromIso).lte("created_at",toIso);
    if(error) return {ok:false,error:error.message};
    return {ok:true,deleted:count||0};
  }

  return {getSettings,saveSettings,fetchEvents,stats,clearWeek,clearRange};
})();
