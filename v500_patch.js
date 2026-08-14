module.exports = function applyV500(source) {
  // Web Phim v5: public configurator + managed short manifest links + invite codes.
  const adminRequire = "const v440AdminPage = require('./v440_admin_page');";
  if (!source.includes(adminRequire)) throw new Error('v5 patch target missing: admin require');
  source = source.replace(adminRequire, adminRequire + "\nconst v500PublicPage = require('./v500_public_page');\nconst v500AdminPage = require('./v500_admin_page');");

  const adminTokenMarker = "const ADMIN_TOKEN = String(process.env.ADMIN_TOKEN || '');";
  if (!source.includes(adminTokenMarker)) throw new Error('v5 patch target missing: ADMIN_TOKEN');
  const constants = [
    adminTokenMarker,
    "const UPSTASH_REDIS_REST_URL = String(process.env.UPSTASH_REDIS_REST_URL || '').replace(/\\/$/, '');",
    "const UPSTASH_REDIS_REST_TOKEN = String(process.env.UPSTASH_REDIS_REST_TOKEN || '');",
    "const V500_STORAGE_PREFIX = String(process.env.SHARE_STORAGE_PREFIX || 'webphim:v5');",
    "const V500_SHARE_ID_LENGTH = Math.max(5, Math.min(12, Number(process.env.SHARE_ID_LENGTH || 6)));",
    "const V500_PUBLIC_SIGNUP_DEFAULT = String(process.env.PUBLIC_SIGNUP || 'true').toLowerCase() !== 'false';",
    "const V500_CREATE_LIMIT_PER_HOUR = Math.max(1, Number(process.env.SHARE_CREATE_LIMIT_PER_HOUR || 20));",
    "const V500_SHARE_CACHE_TTL_MS = Math.max(1000, Number(process.env.SHARE_CACHE_TTL_MS || 30000));",
    "const v500Persistent = Boolean(UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN);",
    "const v500MemoryShares = new Map();",
    "const v500MemoryInvites = new Map();",
    "const v500ShareCache = new Map();",
    "const v500Rate = new Map();",
    "let v500MemorySettings = { publicSignup: V500_PUBLIC_SIGNUP_DEFAULT };"
  ].join('\n');
  source = source.replace(adminTokenMarker, constants);

  const serverMarker = 'const server = http.createServer(async (req, res) => {';
  if (!source.includes(serverMarker)) throw new Error('v5 patch target missing: server');
  const helpers = [
    "function v500Key(kind, id = '') { return V500_STORAGE_PREFIX + ':' + kind + (id ? ':' + id : ''); }",
    "async function v500Redis(command) {",
    "  const r = await fetch(UPSTASH_REDIS_REST_URL, { method: 'POST', headers: { authorization: 'Bearer ' + UPSTASH_REDIS_REST_TOKEN, 'content-type': 'application/json' }, body: JSON.stringify(command) });",
    "  if (!r.ok) throw new Error('Storage HTTP ' + r.status); const data = await r.json(); if (data && data.error) throw new Error(String(data.error)); return data?.result;",
    "}",
    "function v500SafeJson(value) { try { return value ? JSON.parse(value) : null; } catch { return null; } }",
    "function v500CacheShare(id, value) { if (!value) return v500ShareCache.delete(id); v500ShareCache.set(id, { value, expiresAt: Date.now() + V500_SHARE_CACHE_TTL_MS }); }",
    "async function v500GetShare(id) {",
    "  const c = v500ShareCache.get(id); if (c && c.expiresAt > Date.now()) return c.value; if (c) v500ShareCache.delete(id);",
    "  let value; if (v500Persistent) value = v500SafeJson(await v500Redis(['GET', v500Key('share', id)])); else value = v500MemoryShares.get(id) || null; v500CacheShare(id, value); return value;",
    "}",
    "async function v500SetShare(share) {",
    "  const value = { ...share, updatedAt: new Date().toISOString() }; if (v500Persistent) { await v500Redis(['SET', v500Key('share', value.id), JSON.stringify(value)]); await v500Redis(['SADD', v500Key('shares'), value.id]); } else v500MemoryShares.set(value.id, value); v500CacheShare(value.id, value); return value;",
    "}",
    "async function v500DeleteShare(id) { if (v500Persistent) { await v500Redis(['DEL', v500Key('share', id)]); await v500Redis(['SREM', v500Key('shares'), id]); } else v500MemoryShares.delete(id); v500CacheShare(id, null); }",
    "async function v500ListShares() {",
    "  let ids; if (v500Persistent) ids = (await v500Redis(['SMEMBERS', v500Key('shares')])) || []; else ids = [...v500MemoryShares.keys()]; const out = []; for (const id of ids) { const s = await v500GetShare(id); if (s) out.push(s); } return out.sort((a,b) => String(b.createdAt||'').localeCompare(String(a.createdAt||'')));",
    "}",
    "function v500InviteCode(code) { return String(code || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 64); }",
    "async function v500GetInvite(code) { const c = v500InviteCode(code); if (!c) return null; if (v500Persistent) return v500SafeJson(await v500Redis(['GET', v500Key('invite', c)])); return v500MemoryInvites.get(c) || null; }",
    "async function v500SetInvite(invite) { const c = v500InviteCode(invite.code); const v = { ...invite, code: c }; if (v500Persistent) { await v500Redis(['SET', v500Key('invite', c), JSON.stringify(v)]); await v500Redis(['SADD', v500Key('invites'), c]); } else v500MemoryInvites.set(c, v); return v; }",
    "async function v500DeleteInvite(code) { const c = v500InviteCode(code); if (v500Persistent) { await v500Redis(['DEL', v500Key('invite', c)]); await v500Redis(['SREM', v500Key('invites'), c]); } else v500MemoryInvites.delete(c); }",
    "async function v500ListInvites() { let codes; if (v500Persistent) codes = (await v500Redis(['SMEMBERS', v500Key('invites')])) || []; else codes = [...v500MemoryInvites.keys()]; const out=[]; for (const c of codes) { const i=await v500GetInvite(c); if(i) out.push(i); } return out.sort((a,b)=>String(a.code).localeCompare(String(b.code))); }",
    "async function v500GetSettings() { if (!v500Persistent) return { ...v500MemorySettings }; const s = v500SafeJson(await v500Redis(['GET', v500Key('settings')])); return { publicSignup: s?.publicSignup ?? V500_PUBLIC_SIGNUP_DEFAULT }; }",
    "async function v500SetSettings(patch) { const now = await v500GetSettings(); const next = { ...now, ...patch }; if (v500Persistent) await v500Redis(['SET', v500Key('settings'), JSON.stringify(next)]); else v500MemorySettings = next; return next; }",
    "function v500ClientIp(req) { return String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim().slice(0,100); }",
    "function v500RateOk(req) { const ip=v500ClientIp(req), now=Date.now(), old=v500Rate.get(ip); if(!old || old.resetAt<=now){v500Rate.set(ip,{count:1,resetAt:now+3600000});return true;} if(old.count>=V500_CREATE_LIMIT_PER_HOUR)return false; old.count+=1; return true; }",
    "async function v500ValidateInvite(code) {",
    "  const settings = await v500GetSettings(); if (settings.publicSignup) return { ok: true }; const invite = await v500GetInvite(code); if (!invite || invite.enabled === false) return { ok:false, error:'Invite code không hợp lệ' }; const now=Date.now(); if(invite.expiresAt && new Date(invite.expiresAt).getTime()<=now) return {ok:false,error:'Invite code đã hết hạn'}; if(Number(invite.maxUses||0)>0 && Number(invite.used||0)>=Number(invite.maxUses)) return {ok:false,error:'Invite code đã hết lượt dùng'}; invite.used=Number(invite.used||0)+1; invite.lastUsedAt=new Date().toISOString(); await v500SetInvite(invite); return {ok:true, code:invite.code};",
    "}",
    "async function v500NewId() { for(let n=0;n<20;n++){const id=crypto.randomBytes(8).toString('base64url').replace(/[^A-Za-z0-9]/g,'').slice(0,V500_SHARE_ID_LENGTH); if(id.length>=5 && !(await v500GetShare(id))) return id;} throw new Error('Không tạo được share id'); }",
    "async function v500CreateShare(raw, inviteCode) {",
    "  const check=await v500ValidateInvite(inviteCode); if(!check.ok) throw Object.assign(new Error(check.error),{statusCode:403}); const id=await v500NewId(), now=new Date(), days=Math.max(0,Math.min(3650,Number(raw.expiresInDays||0))); const share={id,name:String(raw.name||'').trim().slice(0,80)||('Web Phim '+id),enabled:true,config:sanitizeConfig(raw.config||{}),createdAt:now.toISOString(),updatedAt:now.toISOString(),lastUsedAt:null,requests:0,expiresAt:days?new Date(now.getTime()+days*86400000).toISOString():null,inviteCode:check.code||null}; return v500SetShare(share);",
    "}",
    "function v500ShareExpired(s) { return Boolean(s?.expiresAt && new Date(s.expiresAt).getTime() <= Date.now()); }",
    "async function v500TouchShare(share) { const next={...share,requests:Number(share.requests||0)+1,lastUsedAt:new Date().toISOString()}; v500CacheShare(next.id,next); v500SetShare(next).catch(e=>console.error('share touch:',e.message)); }",
    "async function v500ResolveRequest(pathname) {",
    "  const m=String(pathname).match(/^\\/u\\/([A-Za-z0-9_-]+)(\\/.*)?$/); if(!m) return { parsedBase: parseBasePath(pathname), share:null }; const share=await v500GetShare(m[1]); if(!share)return {error:'Shared link không tồn tại',status:404}; if(share.enabled===false)return {error:'Shared link đã bị tắt',status:403}; if(v500ShareExpired(share))return {error:'Shared link đã hết hạn',status:410}; return {parsedBase:{base:'/u/'+m[1],rest:m[2]||'/',config:sanitizeConfig(share.config||{}),configured:true},share};",
    "}",
    "function v500ManifestUrl(origin,id){return origin+'/u/'+id+'/manifest.json'}",
    "async function v500ShareSettingsPayload(){const s=await v500GetSettings();return{version:'5.0.0',publicSignup:!!s.publicSignup,persistent:v500Persistent,storage:v500Persistent?'upstash':'memory'}}",
    "async function v500PublicCreate(req,res,origin){",
    "  if(!v500RateOk(req))return sendJson(res,429,{error:'Tạo quá nhiều link. Thử lại sau.'},0); let data; try{data=await v440ReadJson(req)}catch(e){return sendJson(res,400,{error:e.message},0)} try{const share=await v500CreateShare(data,data.inviteCode);return sendJson(res,201,{ok:true,id:share.id,manifestUrl:v500ManifestUrl(origin,share.id),persistent:v500Persistent},0)}catch(e){return sendJson(res,e.statusCode||500,{error:String(e.message||e)},0)}",
    "}",
    "async function v500AdminSnapshot(token){",
    "  const base=v440AdminSnapshot(),settings=await v500GetSettings(),shares=await v500ListShares(); const authorized=v440TokenOk(token); const summary={...base,version:'5.0.0',architecture:'single-process-v5',authorized,shareService:{mode:v500Persistent?'upstash':'memory',persistent:v500Persistent,count:shares.length,publicSignup:!!settings.publicSignup}}; if(!authorized)return summary; const origin=''; summary.shares=shares.map(s=>({...s,expired:v500ShareExpired(s),manifestUrl:'/u/'+s.id+'/manifest.json'})); summary.invites=await v500ListInvites(); return summary;",
    "}",
    "async function v500HandleAdminAction(req,res){",
    "  if(!ADMIN_TOKEN)return sendJson(res,503,{error:'ADMIN_TOKEN is not configured'},0); if(!v440TokenOk(req.headers['x-admin-token'])){v440Metrics.errors.admin+=1;return sendJson(res,401,{error:'Invalid admin token'},0)} let data;try{data=await v440ReadJson(req)}catch(e){return sendJson(res,400,{error:e.message},0)} const action=String(data.action||''); try{",
    "    if(action==='clear-tmdb-cache'){const count=v410TmdbCache.size;v410TmdbCache.clear();return sendJson(res,200,{ok:true,message:'Đã xóa '+count+' TMDB cache entries'},0)}",
    "    if(action==='clear-identity-cache'){const count=v430IdentityCache.size;v430IdentityCache.clear();return sendJson(res,200,{ok:true,message:'Đã xóa '+count+' identity cache entries'},0)}",
    "    if(action==='clear-all-cache'){const count=v410TmdbCache.size+v430IdentityCache.size;v410TmdbCache.clear();v430IdentityCache.clear();return sendJson(res,200,{ok:true,message:'Đã xóa '+count+' cache entries'},0)}",
    "    if(action==='reset-circuits'){v440ResetCircuits();return sendJson(res,200,{ok:true,message:'Đã reset circuit breaker'},0)}",
    "    if(action==='refresh-health'){const health=await v410HealthSnapshot();return sendJson(res,200,{ok:true,message:'Health check hoàn tất',health},0)}",
    "    if(action==='reset-metrics'){v440ResetMetrics();return sendJson(res,200,{ok:true,message:'Đã reset metrics'},0)}",
    "    if(action==='share-toggle'){const s=await v500GetShare(String(data.id||''));if(!s)return sendJson(res,404,{error:'Share not found'},0);s.enabled=!s.enabled;await v500SetShare(s);return sendJson(res,200,{ok:true,message:s.enabled?'Đã enable link':'Đã disable link'},0)}",
    "    if(action==='share-delete'){const id=String(data.id||'');if(!(await v500GetShare(id)))return sendJson(res,404,{error:'Share not found'},0);await v500DeleteShare(id);return sendJson(res,200,{ok:true,message:'Đã xóa shared link '+id},0)}",
    "    if(action==='share-clone'){const s=await v500GetShare(String(data.id||''));if(!s)return sendJson(res,404,{error:'Share not found'},0);const id=await v500NewId(),now=new Date().toISOString();const clone=await v500SetShare({...s,id,name:(s.name||s.id)+' Copy',enabled:true,createdAt:now,updatedAt:now,lastUsedAt:null,requests:0,inviteCode:null});return sendJson(res,200,{ok:true,message:'Đã clone thành '+clone.id,id:clone.id},0)}",
    "    if(action==='share-update'){const s=await v500GetShare(String(data.id||''));if(!s)return sendJson(res,404,{error:'Share not found'},0);const p=data.patch||{};if(p.name!==undefined)s.name=String(p.name||'').trim().slice(0,80)||s.name;if(p.enabled!==undefined)s.enabled=!!p.enabled;if(p.config&&typeof p.config==='object')s.config=sanitizeConfig({...s.config,...p.config});if(p.expiresAt!==undefined)s.expiresAt=p.expiresAt?new Date(p.expiresAt).toISOString():null;await v500SetShare(s);return sendJson(res,200,{ok:true,message:'Đã cập nhật shared link'},0)}",
    "    if(action==='invite-create'){const code=v500InviteCode(data.code);if(!code)return sendJson(res,400,{error:'Invite code không hợp lệ'},0);const days=Math.max(0,Math.min(3650,Number(data.expiresInDays||0))),now=new Date();const inv=await v500SetInvite({code,enabled:true,maxUses:Math.max(0,Number(data.maxUses||0)),used:0,createdAt:now.toISOString(),expiresAt:days?new Date(now.getTime()+days*86400000).toISOString():null});return sendJson(res,200,{ok:true,message:'Đã tạo invite '+inv.code},0)}",
    "    if(action==='invite-delete'){await v500DeleteInvite(data.code);return sendJson(res,200,{ok:true,message:'Đã xóa invite'},0)}",
    "    if(action==='setting-public-signup'){const s=await v500SetSettings({publicSignup:!!data.enabled});return sendJson(res,200,{ok:true,message:s.publicSignup?'Public signup ON':'Public signup OFF'},0)}",
    "    return sendJson(res,400,{error:'Unknown admin action'},0);",
    "  }catch(e){v440Metrics.errors.admin+=1;return sendJson(res,500,{error:String(e.message||e)},0)}",
    "}",
    "",
    serverMarker
  ].join('\n');
  source = source.replace(serverMarker, helpers);

  const parseBlock = "const full = new URL(req.url, `http://${req.headers.host || 'localhost'}`), parsedBase = parseBasePath(full.pathname), path = parsedBase.rest, cfg = parsedBase.config,\n    origin = `${String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim()}://${req.headers.host}`;";
  if (!source.includes(parseBlock)) throw new Error('v5 patch target missing: request parse block');
  const resolvedBlock = [
    "const full = new URL(req.url, `http://${req.headers.host || 'localhost'}`), origin = `${String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim()}://${req.headers.host}`;",
    "  const v500Resolved = await v500ResolveRequest(full.pathname);",
    "  if (v500Resolved.error) return sendJson(res, v500Resolved.status || 404, { error: v500Resolved.error }, 0);",
    "  const parsedBase = v500Resolved.parsedBase, path = parsedBase.rest, cfg = parsedBase.config;",
    "  if (v500Resolved.share) v500TouchShare(v500Resolved.share);"
  ].join('\n');
  source = source.replace(parseBlock, resolvedBlock);

  const adminRoutes = [
    "if (path === '/admin') return sendHtml(res, v440AdminPage());",
    "  if (path === '/admin/api') return sendJson(res, 200, v440AdminSnapshot(), 0);",
    "  if (path === '/admin/action') { if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' }, 0, { allow: 'POST' }); return v440HandleAdminAction(req, res); }"
  ].join('\n  ');
  if (!source.includes(adminRoutes)) throw new Error('v5 patch target missing: admin routes');
  source = source.replace(adminRoutes, [
    "if (path === '/admin') return sendHtml(res, v500AdminPage());",
    "  if (path === '/admin/api') return sendJson(res, 200, await v500AdminSnapshot(req.headers['x-admin-token']), 0);",
    "  if (path === '/admin/action') { if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' }, 0, { allow: 'POST' }); return v500HandleAdminAction(req, res); }",
    "  if (path === '/api/share/settings') return sendJson(res, 200, await v500ShareSettingsPayload(), 0);",
    "  if (path === '/api/share') { if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' }, 0, { allow: 'POST' }); return v500PublicCreate(req, res, origin); }"
  ].join('\n  '));

  const rootRoute = "if (path === '/') return sendJson(res, 200, statusPayload(cfg, parsedBase.configured), 30);";
  if (!source.includes(rootRoute)) throw new Error('v5 patch target missing: root route');
  source = source.replace(rootRoute, "if (path === '/') return sendHtml(res, v500PublicPage());");

  const featureMarker = "adminDashboard: true, adminWriteEnabled: Boolean(ADMIN_TOKEN), runtimeMetrics: true,";
  if (source.includes(featureMarker)) source = source.replace(featureMarker, "adminDashboard: true, adminWriteEnabled: Boolean(ADMIN_TOKEN), runtimeMetrics: true, publicConfigurator: true, managedShareLinks: true, inviteCodes: true, persistentShareStorage: v500Persistent,");

  source = source.replaceAll('4.4.0', '5.0.0');
  source = source.replace("architecture: 'single-process-v4.4'", "architecture: 'single-process-v5'");
  return source;
};
