function parseNick(rawName){
  const s = String(rawName || "").trim();
  if(!s) return { dept: null, rank: null, fio: null };
  const parts = s.split("|").map(p => p.trim()).filter(Boolean);
  if(parts.length >= 3){
    return { dept: parts[0], rank: parts[1], fio: parts.slice(2).join(" | ") };
  }
  if(parts.length === 2){
    return { dept: parts[0], rank: null, fio: parts[1] };
  }
  return { dept: null, rank: null, fio: s };
}

function memberToRow(m){
  const nick = m.nickname || m.displayName || (m.user && (m.user.globalName || m.user.username)) || "";
  const parsed = parseNick(nick);
  const roleIds = [];
  const roleNames = [];
  if(m.roles && m.roles.cache){
    for(const r of m.roles.cache.values()){
      if(r.name === "@everyone") continue;
      roleIds.push(r.id);
      roleNames.push(r.name);
    }
  }
  return {
    discord_id: m.id,
    username: m.user ? m.user.username : null,
    global_name: m.user ? (m.user.globalName || null) : null,
    display_name: m.displayName || null,
    raw_nick: nick,
    parsed_dept: parsed.dept,
    parsed_fio: parsed.fio,
    parsed_static: parsed.rank,
    avatar_url: m.user && m.user.displayAvatarURL ? m.user.displayAvatarURL({ size: 128, extension: "png" }) : null,
    role_ids: roleIds,
    role_names: roleNames,
    is_bot: !!(m.user && m.user.bot),
    joined_at: m.joinedAt ? m.joinedAt.toISOString() : null,
    last_seen: new Date().toISOString(),
    active: true,
    updated_at: new Date().toISOString()
  };
}

async function syncAllRoles(supabase, guild, log){
  const roles = await guild.roles.fetch();
  const rows = [];
  for(const r of roles.values()){
    if(r.name === "@everyone") continue;
    rows.push({
      role_id: r.id,
      name: r.name,
      color: r.color || 0,
      position: r.position || 0,
      updated_at: new Date().toISOString()
    });
  }
  if(!rows.length) return 0;
  const { error } = await supabase.from("ds_roles").upsert(rows, { onConflict: "role_id" });
  if(error) log("ROLES upsert err:", error.message);
  return rows.length;
}

async function syncAllMembers(supabase, guild, log){
  log("VP-SYNC: fetching members...");
  const members = await guild.members.fetch();
  log("VP-SYNC: got", members.size, "members");

  const rows = [];
  const activeIds = [];
  for(const m of members.values()){
    if(m.user && m.user.bot) continue;
    const row = memberToRow(m);
    rows.push(row);
    activeIds.push(m.id);
  }

  const chunkSize = 200;
  for(let i = 0; i < rows.length; i += chunkSize){
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from("ds_members").upsert(chunk, { onConflict: "discord_id" });
    if(error){
      log("VP-SYNC upsert err:", error.message);
      throw new Error(error.message);
    }
  }

  if(activeIds.length){
    const { error } = await supabase.from("ds_members").update({ active: false }).not("discord_id", "in", "(" + activeIds.map(id => `"${id}"`).join(",") + ")");
    if(error) log("VP-SYNC deactivate err:", error.message);
  }

  log("VP-SYNC: done,", rows.length, "members upserted");
  return rows.length;
}

async function syncOneMember(supabase, member, log){
  if(!member || (member.user && member.user.bot)) return;
  const row = memberToRow(member);
  const { error } = await supabase.from("ds_members").upsert(row, { onConflict: "discord_id" });
  if(error) log("VP-SYNC one err:", error.message, member.id);
}

async function markMemberInactive(supabase, memberId, log){
  const { error } = await supabase.from("ds_members").update({ active: false, updated_at: new Date().toISOString() }).eq("discord_id", memberId);
  if(error) log("VP-SYNC inactive err:", error.message, memberId);
}

function setupVP({ client, supabase, guildId, log }){
  async function getGuild(){
    try{
      const g = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId);
      return g;
    }catch(e){
      log("VP get guild err:", e.message);
      return null;
    }
  }

  async function fullSync(reason){
    const guild = await getGuild();
    if(!guild) return { ok: false, error: "guild not found" };
    try{
      log("VP-SYNC start (" + (reason || "manual") + ")");
      await syncAllRoles(supabase, guild, log);
      const n = await syncAllMembers(supabase, guild, log);
      return { ok: true, count: n };
    }catch(e){
      log("VP-SYNC fail:", e.message);
      return { ok: false, error: e.message };
    }
  }

  async function initialSync(){
    return fullSync("startup");
  }

  function scheduleInterval(minutes){
    const ms = Math.max(1, minutes) * 60 * 1000;
    setInterval(() => { fullSync("interval").catch(()=>{}); }, ms);
  }

  function subscribeSyncRequests(){
    const channel = supabase.channel("ds-sync-req")
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "ds_sync_requests" },
        async (payload) => {
          const req = payload.new;
          if(!req || req.status !== "pending") return;
          log("VP-SYNC request from site id=" + req.id);
          await supabase.from("ds_sync_requests").update({ status: "running" }).eq("id", req.id);
          const r = await fullSync("site-button");
          await supabase.from("ds_sync_requests").update({
            status: r.ok ? "done" : "error",
            message: r.ok ? "OK" : r.error,
            members_scanned: r.count || null,
            finished_at: new Date().toISOString()
          }).eq("id", req.id);
        })
      .subscribe((status) => {
        log("VP-SYNC-REQ realtime:", status);
      });
    return channel;
  }

  client.on("guildMemberAdd", async (m) => {
    if(m.guild.id !== guildId) return;
    await syncOneMember(supabase, m, log);
  });
  client.on("guildMemberRemove", async (m) => {
    if(m.guild.id !== guildId) return;
    await markMemberInactive(supabase, m.id, log);
  });
  client.on("guildMemberUpdate", async (oldM, newM) => {
    if(newM.guild.id !== guildId) return;
    await syncOneMember(supabase, newM, log);
  });
  client.on("roleCreate", async (r) => {
    if(r.guild.id !== guildId) return;
    await supabase.from("ds_roles").upsert({
      role_id: r.id, name: r.name, color: r.color || 0, position: r.position || 0,
      updated_at: new Date().toISOString()
    }, { onConflict: "role_id" });
  });
  client.on("roleUpdate", async (oldR, newR) => {
    if(newR.guild.id !== guildId) return;
    await supabase.from("ds_roles").upsert({
      role_id: newR.id, name: newR.name, color: newR.color || 0, position: newR.position || 0,
      updated_at: new Date().toISOString()
    }, { onConflict: "role_id" });
  });
  client.on("roleDelete", async (r) => {
    if(r.guild.id !== guildId) return;
    await supabase.from("ds_roles").delete().eq("role_id", r.id);
    await supabase.from("vp_role_mapping").delete().eq("role_id", r.id);
  });

  return { fullSync, initialSync, scheduleInterval, subscribeSyncRequests };
}

module.exports = { setupVP, parseNick };
