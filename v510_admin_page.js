const v500AdminPage = require('./v500_admin_page');

module.exports = function v510AdminPage() {
  let html = v500AdminPage();

  html = html.replaceAll('Web Phim Admin v5', 'Web Phim Admin v5.1');

  const styleMarker = '</style>';
  if (!html.includes(styleMarker)) throw new Error('v5.1 admin patch target missing: style');
  html = html.replace(styleMarker, '.backuprow{display:grid;grid-template-columns:auto 1fr auto auto;gap:8px;align-items:center}.backuprow input[type=file]{min-width:0}.backuprow select{background:#0b1119;color:var(--text);border:1px solid var(--border);border-radius:9px;padding:10px}.backupnote{margin-top:10px;font-size:13px;color:var(--muted)}@media(max-width:760px){.backuprow{grid-template-columns:1fr}}\n' + styleMarker);

  const cacheSection = '  <div class="section"><h2>Cache</h2><div class="cachegrid" id="caches"></div></div>';
  if (!html.includes(cacheSection)) throw new Error('v5.1 admin patch target missing: cache section');
  const backupSection = [
    '  <div class="section"><h2>Backup / Restore</h2><div class="card">',
    '    <div class="backuprow"><button type="button" class="green" id="exportBackup">Export Backup</button><input id="backupFile" type="file" accept="application/json,.json"><select id="restoreMode"><option value="merge">Merge</option><option value="replace">Replace all</option></select><button type="button" class="danger" id="importBackup">Restore Backup</button></div>',
    '    <div class="backupnote">Backup gồm Shared Links, Invite Codes và Public Signup. Không chứa ADMIN_TOKEN, TMDB key, Comet/TorBox URL hay secret khác.</div>',
    '    <div class="storage" id="backupInfo"></div>',
    '  </div></div>',
    '',
    cacheSection
  ].join('\n');
  html = html.replace(cacheSection, backupSection);

  const controlsMarker = "function setControlsEnabled(on){ document.querySelectorAll('[data-runtime],#createInvite,#saveSignup').forEach(el => { el.disabled = !on; }); }";
  if (!html.includes(controlsMarker)) throw new Error('v5.1 admin patch target missing: controls');
  html = html.replace(controlsMarker, "function setControlsEnabled(on){ document.querySelectorAll('[data-runtime],#createInvite,#saveSignup,#exportBackup,#importBackup').forEach(el => { el.disabled = !on; }); }");

  const renderMarker = '    setControlsEnabled(authorized);';
  if (!html.includes(renderMarker)) throw new Error('v5.1 admin patch target missing: render controls');
  html = html.replace(renderMarker, [
    renderMarker,
    "    if($('backupInfo')){ const h=data.storageHealth; if(!authorized) $('backupInfo').innerHTML='<span class=\"muted\">Đăng nhập để kiểm tra storage.</span>'; else if(!h) $('backupInfo').innerHTML='<span class=\"warn\">Chưa có storage health.</span>'; else $('backupInfo').innerHTML='<span class=\"badge '+(h.ok?'ok':'bad')+'\">'+(h.persistent?'Upstash Redis':'Memory')+': '+(h.ok?'OK':'ERROR')+'</span>'+(h.persistent?'<span class=\"muted\">Latency '+esc(h.latencyMs||0)+' ms</span>':'<span class=\"warn\">Hãy cấu hình Upstash trước khi share rộng.</span>')+(h.error?'<span class=\"bad\">'+esc(h.error)+'</span>':''); }"
  ].join('\n'));

  const initMarker = '  tokenEl.value = readSavedToken();';
  if (!html.includes(initMarker)) throw new Error('v5.1 admin patch target missing: init');
  const backupJs = [
    "  async function exportBackup(){",
    "    if(!authorized){ setNotice('Bạn chưa đăng nhập Admin.','warn'); return; }",
    "    try { const r=await fetch('/admin/backup',{headers:authHeaders(),cache:'no-store'}); const payload=await r.json().catch(()=>({})); if(!r.ok) throw new Error(payload.error||('HTTP '+r.status)); const text=JSON.stringify(payload,null,2); const blob=new Blob([text],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='webphim-backup-'+new Date().toISOString().slice(0,10)+'.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000); setNotice('Đã export backup.','ok'); } catch(e){ setNotice(e.message||String(e),'bad'); }",
    "  }",
    "  async function importBackup(){",
    "    if(!authorized){ setNotice('Bạn chưa đăng nhập Admin.','warn'); return; } const file=$('backupFile').files&&$('backupFile').files[0]; if(!file){ setNotice('Chọn file backup JSON trước.','warn'); return; }",
    "    const mode=$('restoreMode').value==='replace'?'replace':'merge'; if(mode==='replace'&&!confirm('Replace all sẽ xóa Shared Links và Invite Codes hiện tại trước khi restore. Tiếp tục?')) return;",
    "    $('importBackup').disabled=true; setNotice('Đang restore backup…','');",
    "    try { const text=await file.text(); let backup; try{ backup=JSON.parse(text); }catch(_){ throw new Error('File JSON không hợp lệ'); } const r=await fetch('/admin/restore',{method:'POST',headers:Object.assign({'content-type':'application/json'},authHeaders()),body:JSON.stringify({mode,backup})}); const result=await r.json().catch(()=>({})); if(!r.ok) throw new Error(result.error||('HTTP '+r.status)); setNotice('Restore hoàn tất: '+(result.shares||0)+' links, '+(result.invites||0)+' invites.','ok'); data=await fetchAdmin(true); render(); } catch(e){ setNotice(e.message||String(e),'bad'); } finally { $('importBackup').disabled=!authorized; }",
    "  }",
    "  $('exportBackup').addEventListener('click',exportBackup);",
    "  $('importBackup').addEventListener('click',importBackup);",
    "",
    initMarker
  ].join('\n');
  html = html.replace(initMarker, backupJs);

  return html;
};
