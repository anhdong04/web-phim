module.exports = function v440AdminPage() {
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Web Phim Admin</title>
<style>
:root{color-scheme:dark;--bg:#0b0e13;--panel:#141922;--panel2:#10151d;--border:#283141;--text:#eef2f7;--muted:#94a3b8;--blue:#6ea8ff;--green:#62d99b;--yellow:#f4c95d;--red:#ff7373}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 20% 0,#172033 0,#0b0e13 38%);color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif}.wrap{max-width:1180px;margin:0 auto;padding:30px 18px 60px}.top{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;flex-wrap:wrap}.title h1{margin:0;font-size:30px}.muted{color:var(--muted)}.badge{display:inline-flex;align-items:center;gap:7px;padding:7px 11px;border:1px solid var(--border);border-radius:999px;background:#111722;font-size:13px}.dot{width:9px;height:9px;border-radius:50%;background:var(--green);box-shadow:0 0 15px #62d99b66}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:22px 0}.card{background:linear-gradient(180deg,#161c26,#11161e);border:1px solid var(--border);border-radius:15px;padding:17px;box-shadow:0 12px 35px #0003}.metric{font-size:26px;font-weight:800;margin-top:8px}.section{margin-top:20px}.section h2{font-size:18px;margin:0 0 10px}.providers{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px}.provider h3{margin:7px 0 12px;font-size:16px}.line{display:flex;justify-content:space-between;gap:12px;margin:7px 0;color:var(--muted)}.line b{color:var(--text)}.ok{color:var(--green)}.warn{color:var(--yellow)}.bad{color:var(--red)}.controls{display:grid;grid-template-columns:1.2fr 2fr;gap:12px}.tokenbox input{width:100%;background:#0b1017;color:var(--text);border:1px solid var(--border);border-radius:9px;padding:11px;margin-top:9px}.buttons{display:flex;gap:8px;flex-wrap:wrap;align-content:flex-start}.buttons button{border:1px solid #334158;background:#182133;color:var(--text);padding:10px 13px;border-radius:9px;font-weight:700;cursor:pointer}.buttons button:hover{border-color:#5076b3}.buttons button.danger{border-color:#613a40;background:#24161a}.buttons button:disabled{opacity:.45;cursor:not-allowed}.notice{margin-top:10px;min-height:22px;font-size:14px}.cachegrid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.bar{height:7px;background:#202937;border-radius:99px;overflow:hidden;margin-top:10px}.bar i{display:block;height:100%;background:linear-gradient(90deg,#5c8dff,#62d99b);width:0}.footer{margin-top:24px;font-size:13px;color:var(--muted)}@media(max-width:850px){.grid{grid-template-columns:1fr 1fr}.controls{grid-template-columns:1fr}}@media(max-width:520px){.grid,.cachegrid{grid-template-columns:1fr}.metric{font-size:23px}}
</style>
</head>
<body><div class="wrap">
<div class="top"><div class="title"><h1>Web Phim Admin</h1><div class="muted">Runtime dashboard · provider health · cache · controls</div></div><div><span class="badge"><span class="dot"></span><span id="version">Đang tải…</span></span></div></div>
<div class="grid">
  <div class="card"><div class="muted">Uptime</div><div class="metric" id="uptime">—</div></div>
  <div class="card"><div class="muted">Requests</div><div class="metric" id="requests">—</div></div>
  <div class="card"><div class="muted">Errors</div><div class="metric" id="errors">—</div></div>
  <div class="card"><div class="muted">RAM RSS</div><div class="metric" id="ram">—</div></div>
</div>
<div class="section controls">
  <div class="card tokenbox"><h2 style="margin:0">Admin access</h2><div class="muted" id="adminState">Đang kiểm tra…</div><input id="token" type="password" autocomplete="off" placeholder="ADMIN_TOKEN (chỉ lưu trong tab này)"><div class="notice" id="notice"></div></div>
  <div class="card"><h2 style="margin-top:0">Điều khiển</h2><div class="buttons">
    <button data-action="refresh-health">Refresh Health</button>
    <button data-action="clear-tmdb-cache">Clear TMDB Cache</button>
    <button data-action="clear-identity-cache">Clear Identity Cache</button>
    <button class="danger" data-action="clear-all-cache">Clear All Cache</button>
    <button class="danger" data-action="reset-circuits">Reset Circuits</button>
    <button class="danger" data-action="reset-metrics">Reset Metrics</button>
  </div></div>
</div>
<div class="section"><h2>Cache</h2><div class="cachegrid" id="caches"></div></div>
<div class="section"><h2>Providers</h2><div class="providers" id="providers"></div></div>
<div class="section"><h2>Request breakdown</h2><div class="card" id="routes">—</div></div>
<div class="footer">Tự làm mới mỗi 10 giây. Admin token không được ghi vào URL và chỉ lưu bằng sessionStorage của tab trình duyệt.</div>
</div>
<script>
const $=id=>document.getElementById(id);const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtTime=s=>{s=Math.max(0,Math.floor(Number(s)||0));const d=Math.floor(s/86400),h=Math.floor(s%86400/3600),m=Math.floor(s%3600/60);return(d?d+'d ':'')+(h?h+'h ':'')+m+'m'};
const mb=n=>(Number(n||0)/1048576).toFixed(1)+' MB';
const hitRate=c=>{const h=Number(c?.hits||0),m=Number(c?.misses||0),t=h+m;return t?Math.round(h/t*100):0};
let writeEnabled=false;const tokenEl=$('token');tokenEl.value=sessionStorage.getItem('webphim-admin-token')||'';tokenEl.oninput=()=>sessionStorage.setItem('webphim-admin-token',tokenEl.value);
function cacheCard(name,c){const rate=hitRate(c);return '<div class="card"><div class="line"><b>'+esc(name)+'</b><span>'+esc(c?.entries||0)+' entries</span></div><div class="line"><span>Hit rate</span><b>'+rate+'%</b></div><div class="line"><span>Hits / misses</span><b>'+esc(c?.hits||0)+' / '+esc(c?.misses||0)+'</b></div><div class="bar"><i style="width:'+rate+'%"></i></div></div>'}
function providerCard(p){const state=p.circuitOpen?'OPEN':(p.ok===false?'ERROR':'OK');const cls=p.circuitOpen?'warn':(p.ok===false?'bad':'ok');return '<div class="card provider"><div class="'+cls+'">● '+state+'</div><h3>'+esc(p.name)+'</h3><div class="line"><span>Latency</span><b>'+esc(p.latencyMs??'—')+' ms</b></div><div class="line"><span>Calls</span><b>'+esc(p.calls||0)+'</b></div><div class="line"><span>Errors / timeout</span><b>'+esc(p.errors||0)+' / '+esc(p.timeouts||0)+'</b></div><div class="line"><span>Circuit failures</span><b>'+esc(p.failures||0)+'</b></div></div>'}
async function load(){try{const r=await fetch('/admin/api',{cache:'no-store'});const d=await r.json();$('version').textContent='v'+d.version+' · '+d.architecture;$('uptime').textContent=fmtTime(d.uptimeSeconds);$('requests').textContent=d.requests?.total??0;const errs=Object.values(d.errors||{}).reduce((a,b)=>a+Number(b||0),0);$('errors').textContent=errs;$('ram').textContent=mb(d.memory?.rss);writeEnabled=!!d.admin?.writeEnabled;$('adminState').textContent=writeEnabled?'Control API đã bật bằng ADMIN_TOKEN.':'Read-only: chưa cấu hình ADMIN_TOKEN trên Render.';tokenEl.disabled=!writeEnabled;document.querySelectorAll('button[data-action]').forEach(b=>b.disabled=!writeEnabled);$('caches').innerHTML=cacheCard('TMDB',d.caches?.tmdb||{})+cacheCard('Identity',d.caches?.identity||{});$('providers').innerHTML=(d.providers||[]).map(providerCard).join('')||'<div class="muted">Chưa có provider runtime data.</div>';const routes=d.requests?.routes||{};$('routes').innerHTML=Object.entries(routes).map(([k,v])=>'<span class="badge" style="margin:4px">'+esc(k)+': <b>'+esc(v)+'</b></span>').join('');}catch(e){$('notice').innerHTML='<span class="bad">Không tải được admin API: '+esc(e.message)+'</span>'}}
async function action(name){const token=tokenEl.value.trim();if(!writeEnabled)return;if(!token){$('notice').innerHTML='<span class="warn">Nhập ADMIN_TOKEN trước.</span>';return}if(['clear-all-cache','reset-circuits','reset-metrics'].includes(name)&&!confirm('Thực hiện '+name+'?'))return;$('notice').textContent='Đang thực hiện '+name+'…';try{const r=await fetch('/admin/action',{method:'POST',headers:{'content-type':'application/json','x-admin-token':token},body:JSON.stringify({action:name})});const d=await r.json();if(!r.ok)throw new Error(d.error||('HTTP '+r.status));$('notice').innerHTML='<span class="ok">✓ '+esc(d.message||'Hoàn tất')+'</span>';await load();}catch(e){$('notice').innerHTML='<span class="bad">'+esc(e.message)+'</span>'}}
document.querySelectorAll('button[data-action]').forEach(b=>b.onclick=()=>action(b.dataset.action));load();setInterval(load,10000);
</script></body></html>`;
};
