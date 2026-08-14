module.exports = function v500AdminPage() {
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Web Phim Admin v5</title>
<style>
:root{color-scheme:dark;--bg:#0a0e14;--panel:#121923;--border:#293345;--text:#edf2f8;--muted:#94a3b8;--blue:#6ea8ff;--green:#62d99b;--yellow:#f4c95d;--red:#ff7474}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 20% 0,#17233a,#0a0e14 42%);color:var(--text);font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif}.wrap{max-width:1220px;margin:0 auto;padding:28px 18px 60px}.top{display:flex;justify-content:space-between;gap:15px;align-items:flex-start;flex-wrap:wrap}h1{margin:0}.muted{color:var(--muted)}.badge{display:inline-flex;border:1px solid var(--border);border-radius:99px;padding:7px 11px;background:#111822}.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:11px;margin:20px 0}.card{background:linear-gradient(180deg,#151d28,#10161e);border:1px solid var(--border);border-radius:14px;padding:16px}.metric{font-size:26px;font-weight:800;margin-top:7px}.section{margin-top:20px}.section h2{font-size:19px}.controls{display:grid;grid-template-columns:1.2fr 2fr;gap:12px}.tokenrow{display:grid;grid-template-columns:1fr auto auto;gap:8px;margin-top:10px}.tokenrow input,.field input,.field select{width:100%;background:#0b1119;color:var(--text);border:1px solid var(--border);border-radius:9px;padding:10px}.buttons{display:flex;gap:7px;flex-wrap:wrap}.btn,button{border:1px solid #344158;background:#182133;color:var(--text);padding:9px 11px;border-radius:8px;font-weight:700;cursor:pointer}.danger{border-color:#653a42;background:#26171b}.green{border-color:#2e6b50;background:#12271e}.btn:disabled,button:disabled{opacity:.45;cursor:not-allowed}.ok{color:var(--green)}.warn{color:var(--yellow)}.bad{color:var(--red)}.providergrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(215px,1fr));gap:10px}.line{display:flex;justify-content:space-between;gap:12px;margin:6px 0;color:var(--muted)}.line b{color:var(--text)}.sharetable{width:100%;border-collapse:collapse}.sharetable th,.sharetable td{text-align:left;padding:10px 8px;border-bottom:1px solid var(--border);vertical-align:top}.sharetable th{color:var(--muted);font-size:13px}.shareid{font-family:ui-monospace,SFMono-Regular,monospace;color:var(--blue)}.actions{display:flex;gap:5px;flex-wrap:wrap}.actions button{padding:6px 8px;font-size:12px}.formrow{display:grid;grid-template-columns:1.4fr .8fr .8fr auto;gap:8px;align-items:end}.field label{display:block;font-size:13px;font-weight:700;margin-bottom:5px}.notice{min-height:22px;margin-top:8px}.cachegrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.modal{position:fixed;inset:0;background:#0009;display:none;align-items:center;justify-content:center;padding:18px;z-index:20}.modal.open{display:flex}.modalbox{width:min(560px,100%);background:#121923;border:1px solid var(--border);border-radius:15px;padding:20px}.modalgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.storage{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:9px}.toplinks a{color:var(--blue);margin-left:12px;text-decoration:none}.hidden{display:none!important}@media(max-width:850px){.grid4{grid-template-columns:1fr 1fr}.controls{grid-template-columns:1fr}.formrow{grid-template-columns:1fr 1fr}}@media(max-width:600px){.tokenrow{grid-template-columns:1fr}.sharetable{display:block;overflow:auto}}@media(max-width:520px){.grid4,.cachegrid,.modalgrid,.formrow{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="wrap">
  <div class="top"><div><h1>Web Phim Admin v5</h1><div class="muted">Server · Shared links · Invite codes · Runtime controls</div><div class="toplinks" style="margin-top:8px"><a href="/">Public Configurator</a><a href="/status/ui">Status</a></div></div><span class="badge" id="version">Đang tải…</span></div>

  <div class="grid4"><div class="card"><div class="muted">Shared links</div><div class="metric" id="shareCount">—</div></div><div class="card"><div class="muted">Requests</div><div class="metric" id="requests">—</div></div><div class="card"><div class="muted">Errors</div><div class="metric" id="errors">—</div></div><div class="card"><div class="muted">RAM</div><div class="metric" id="ram">—</div></div></div>

  <div class="section controls">
    <div class="card"><h2 style="margin-top:0">Admin access</h2><div class="muted" id="adminState">Chưa đăng nhập.</div><div class="tokenrow"><input id="token" type="password" autocomplete="current-password" placeholder="Nhập ADMIN_TOKEN"><button class="green" id="loginBtn" type="button">Đăng nhập</button><button id="logoutBtn" type="button">Đăng xuất</button></div><div class="storage" id="storage"></div><div class="notice" id="notice"></div></div>
    <div class="card"><h2 style="margin-top:0">Runtime controls</h2><div class="buttons"><button type="button" data-runtime="refresh-health">Refresh Health</button><button type="button" data-runtime="clear-tmdb-cache">Clear TMDB Cache</button><button type="button" data-runtime="clear-identity-cache">Clear Identity Cache</button><button type="button" class="danger" data-runtime="clear-all-cache">Clear All Cache</button><button type="button" class="danger" data-runtime="reset-circuits">Reset Circuits</button><button type="button" class="danger" data-runtime="reset-metrics">Reset Metrics</button></div></div>
  </div>

  <div class="section"><h2>Shared links</h2><div class="card"><table class="sharetable"><thead><tr><th>Link</th><th>Profile</th><th>Usage</th><th>Status</th><th>Actions</th></tr></thead><tbody id="shares"><tr><td colspan="5" class="muted">Đăng nhập để xem shared links.</td></tr></tbody></table></div></div>

  <div class="section"><h2>Invite codes</h2><div class="card"><div class="formrow"><div class="field"><label>Code</label><input id="inviteCode" placeholder="WEBPHIM2026"></div><div class="field"><label>Max uses (0 = ∞)</label><input id="inviteMax" type="number" min="0" value="20"></div><div class="field"><label>Expires (days)</label><input id="inviteDays" type="number" min="0" value="30"></div><button class="green" id="createInvite" type="button">Create</button></div><div style="margin-top:14px" id="invites" class="muted">Đăng nhập để xem invite codes.</div><div style="margin-top:12px"><label><input id="publicSignup" type="checkbox"> Cho phép tạo link không cần invite code</label> <button id="saveSignup" type="button">Save</button></div></div></div>

  <div class="section"><h2>Cache</h2><div class="cachegrid" id="caches"></div></div>
  <div class="section"><h2>Providers</h2><div class="providergrid" id="providers"></div></div>
</div>

<div class="modal" id="editModal"><div class="modalbox"><h2>Edit shared link</h2><div class="modalgrid"><div class="field"><label>Name</label><input id="editName"></div><div class="field"><label>Device profile</label><select id="editProfile"><option value="auto">Auto</option><option value="4k-tv">4K TV</option><option value="1080p-quality">1080p Quality</option><option value="1080p-balanced">1080p Balanced</option><option value="mobile">Mobile</option><option value="low-bandwidth">Low bandwidth</option></select></div><div class="field"><label>Preset</label><select id="editPreset"><option value="best">Best</option><option value="balanced">Balanced</option><option value="data-saver">Data Saver</option></select></div><div class="field"><label>Provider priority</label><select id="editPriority"><option value="kkphim-first">KKPhim first</option><option value="cached-first">Cached first</option><option value="quality-first">Quality first</option><option value="small-first">Small first</option><option value="balanced">Balanced</option></select></div></div><div class="buttons" style="margin-top:16px"><button class="green" id="saveEdit" type="button">Save</button><button id="closeEdit" type="button">Cancel</button></div></div></div>

<script>
(function(){
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const mb = n => (Number(n || 0) / 1048576).toFixed(1) + ' MB';
  let data = null;
  let authorized = false;
  let editId = null;
  let refreshTimer = null;
  const tokenEl = $('token');

  function readSavedToken(){ try { return sessionStorage.getItem('webphim-admin-token') || ''; } catch (_) { return ''; } }
  function saveToken(value){ try { if(value) sessionStorage.setItem('webphim-admin-token', value); else sessionStorage.removeItem('webphim-admin-token'); } catch (_) {} }
  function authHeaders(){ const t = tokenEl.value.trim(); return t ? {'x-admin-token': t} : {}; }
  function setNotice(message, kind){ $('notice').innerHTML = message ? '<span class="' + (kind || '') + '">' + esc(message) + '</span>' : ''; }
  function setControlsEnabled(on){ document.querySelectorAll('[data-runtime],#createInvite,#saveSignup').forEach(el => { el.disabled = !on; }); }

  function cacheCard(name,c){ return '<div class="card"><div class="line"><b>'+esc(name)+'</b><span>'+esc(c && c.entries || 0)+' entries</span></div><div class="line"><span>Hits / misses</span><b>'+esc(c && c.hits || 0)+' / '+esc(c && c.misses || 0)+'</b></div></div>'; }
  function providerCard(p){ const state=p.circuitOpen?'OPEN':p.ok===false?'ERROR':'OK'; const cls=p.circuitOpen?'warn':p.ok===false?'bad':'ok'; return '<div class="card"><div class="'+cls+'">● '+state+'</div><h3>'+esc(p.name)+'</h3><div class="line"><span>Latency</span><b>'+esc(p.latencyMs == null ? '—' : p.latencyMs)+' ms</b></div><div class="line"><span>Calls</span><b>'+esc(p.calls||0)+'</b></div><div class="line"><span>Errors</span><b>'+esc(p.errors||0)+'</b></div></div>'; }
  function shareRow(s){ const cfg=s.config||{}; const status=s.enabled?(s.expired?'Expired':'Active'):'Disabled'; const cls=s.enabled&&!s.expired?'ok':s.expired?'warn':'bad'; return '<tr data-share="'+esc(s.id)+'"><td><div class="shareid">'+esc(s.id)+'</div><b>'+esc(s.name||'Untitled')+'</b><div><a style="color:var(--blue)" target="_blank" rel="noopener" href="'+esc(s.manifestUrl)+'">manifest</a></div></td><td>'+esc(cfg.deviceProfile||'auto')+'<br><span class="muted">'+esc(cfg.streamPreset||'balanced')+' · '+esc(cfg.providerPriority||'balanced')+'</span></td><td>'+esc(s.requests||0)+' req<br><span class="muted">'+esc(s.lastUsedAt?new Date(s.lastUsedAt).toLocaleString():'Never')+'</span></td><td><span class="'+cls+'">'+status+'</span><br><span class="muted">'+esc(s.expiresAt?new Date(s.expiresAt).toLocaleDateString():'No expiry')+'</span></td><td><div class="actions"><button type="button" data-share-action="toggle" data-id="'+esc(s.id)+'">'+(s.enabled?'Disable':'Enable')+'</button><button type="button" data-share-action="edit" data-id="'+esc(s.id)+'">Edit</button><button type="button" data-share-action="clone" data-id="'+esc(s.id)+'">Clone</button><button type="button" class="danger" data-share-action="delete" data-id="'+esc(s.id)+'">Delete</button></div></td></tr>'; }

  function render(){
    if(!data) return;
    $('version').textContent = 'v' + (data.version || '5') + ' · ' + (data.architecture || '');
    $('shareCount').textContent = data.shareService && data.shareService.count != null ? data.shareService.count : 0;
    $('requests').textContent = data.requests && data.requests.total != null ? data.requests.total : 0;
    $('errors').textContent = Object.values(data.errors || {}).reduce((a,b)=>a+Number(b||0),0);
    $('ram').textContent = mb(data.memory && data.memory.rss);
    $('storage').innerHTML = '<span class="badge '+(data.shareService && data.shareService.persistent?'ok':'warn')+'">Storage: '+esc(data.shareService && data.shareService.mode || 'memory')+'</span>' + (data.shareService && data.shareService.persistent ? '' : '<span class="warn">Memory mode sẽ mất link khi restart.</span>');
    authorized = data.authorized === true;
    $('adminState').innerHTML = authorized ? '<span class="ok">✓ Đã đăng nhập Admin</span>' : (data.admin && data.admin.writeEnabled ? '<span class="muted">Nhập ADMIN_TOKEN rồi bấm Đăng nhập.</span>' : '<span class="bad">ADMIN_TOKEN chưa được cấu hình trên Render.</span>');
    setControlsEnabled(authorized);
    $('caches').innerHTML = cacheCard('TMDB',data.caches && data.caches.tmdb || {}) + cacheCard('Identity',data.caches && data.caches.identity || {});
    $('providers').innerHTML = (data.providers || []).map(providerCard).join('') || '<div class="muted">Chưa có provider data.</div>';
    $('shares').innerHTML = authorized ? ((data.shares || []).map(shareRow).join('') || '<tr><td colspan="5" class="muted">Chưa có shared link.</td></tr>') : '<tr><td colspan="5" class="muted">Đăng nhập để xem shared links.</td></tr>';
    $('publicSignup').checked = !!(data.shareService && data.shareService.publicSignup);
    $('invites').innerHTML = authorized ? (((data.invites || []).map(i => '<span class="badge" style="margin:4px">'+esc(i.code)+' · '+esc(i.used||0)+'/'+(i.maxUses||'∞')+' <button type="button" class="danger" data-invite-delete="'+esc(i.code)+'" style="padding:3px 6px">×</button></span>').join('')) || '<span class="muted">Chưa có invite code.</span>') : '<span class="muted">Đăng nhập để xem invite codes.</span>';
  }

  async function fetchAdmin(useToken){
    const headers = useToken ? authHeaders() : {};
    const r = await fetch('/admin/api',{headers,cache:'no-store'});
    const payload = await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(payload.error || ('HTTP ' + r.status));
    return payload;
  }

  async function load(silent){
    try {
      const payload = await fetchAdmin(authorized && !!tokenEl.value.trim());
      data = payload;
      render();
      if(!silent && authorized) setNotice('Đã cập nhật dữ liệu Admin.','ok');
    } catch (e) {
      if(!silent) setNotice(e.message || String(e),'bad');
    }
  }

  async function login(){
    const token = tokenEl.value.trim();
    if(!token){ setNotice('Nhập ADMIN_TOKEN trước.','warn'); return; }
    $('loginBtn').disabled = true;
    setNotice('Đang xác thực…','');
    try {
      const payload = await fetchAdmin(true);
      if(payload.authorized !== true){ authorized = false; saveToken(''); setControlsEnabled(false); setNotice('ADMIN_TOKEN không đúng.','bad'); return; }
      authorized = true; saveToken(token); data = payload; render(); setNotice('Đăng nhập thành công.','ok');
    } catch(e) {
      authorized = false; setControlsEnabled(false); setNotice(e.message || String(e),'bad');
    } finally { $('loginBtn').disabled = false; }
  }

  function logout(){ authorized=false; tokenEl.value=''; saveToken(''); setControlsEnabled(false); setNotice('Đã đăng xuất.',''); load(true); }

  async function action(actionName,payload){
    if(!authorized || !tokenEl.value.trim()){ setNotice('Bạn chưa đăng nhập Admin.','warn'); return null; }
    try {
      const r = await fetch('/admin/action',{method:'POST',headers:Object.assign({'content-type':'application/json'},authHeaders()),body:JSON.stringify(Object.assign({action:actionName},payload||{}))});
      const result = await r.json().catch(()=>({}));
      if(!r.ok) throw new Error(result.error || ('HTTP ' + r.status));
      setNotice(result.message || 'Hoàn tất.','ok');
      const next = await fetchAdmin(true); data=next; render();
      return result;
    } catch(e){ setNotice(e.message || String(e),'bad'); return null; }
  }

  $('loginBtn').addEventListener('click',login);
  $('logoutBtn').addEventListener('click',logout);
  tokenEl.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); login(); } });
  document.querySelectorAll('[data-runtime]').forEach(btn=>btn.addEventListener('click',()=>action(btn.dataset.runtime)));
  $('createInvite').addEventListener('click',()=>action('invite-create',{code:$('inviteCode').value.trim(),maxUses:Number($('inviteMax').value||0),expiresInDays:Number($('inviteDays').value||0)}));
  $('saveSignup').addEventListener('click',()=>action('setting-public-signup',{enabled:$('publicSignup').checked}));
  $('closeEdit').addEventListener('click',()=>$('editModal').classList.remove('open'));
  $('saveEdit').addEventListener('click',async()=>{ if(!editId)return; const ok=await action('share-update',{id:editId,patch:{name:$('editName').value.trim(),config:{deviceProfile:$('editProfile').value,streamPreset:$('editPreset').value,providerPriority:$('editPriority').value}}}); if(ok)$('editModal').classList.remove('open'); });

  $('shares').addEventListener('click',async e=>{
    const btn=e.target.closest('button[data-share-action]'); if(!btn)return; const id=btn.dataset.id; const kind=btn.dataset.shareAction;
    if(kind==='toggle') return action('share-toggle',{id});
    if(kind==='clone') return action('share-clone',{id});
    if(kind==='delete'){ if(confirm('Delete shared link '+id+'?')) return action('share-delete',{id}); return; }
    if(kind==='edit'){ const s=(data.shares||[]).find(x=>x.id===id); if(!s)return; editId=id; $('editName').value=s.name||''; $('editProfile').value=s.config&&s.config.deviceProfile||'auto'; $('editPreset').value=s.config&&s.config.streamPreset||'balanced'; $('editPriority').value=s.config&&s.config.providerPriority||'balanced'; $('editModal').classList.add('open'); }
  });
  $('invites').addEventListener('click',e=>{ const btn=e.target.closest('button[data-invite-delete]'); if(!btn)return; const code=btn.dataset.inviteDelete; if(confirm('Delete invite '+code+'?')) action('invite-delete',{code}); });

  tokenEl.value = readSavedToken();
  setControlsEnabled(false);
  if(tokenEl.value.trim()) login(); else load(true);
  refreshTimer = setInterval(()=>{ if(authorized) load(true); },15000);
  window.addEventListener('beforeunload',()=>{ if(refreshTimer) clearInterval(refreshTimer); });
})();
</script>
</body>
</html>`;
};
