module.exports = function v500PublicPage() {
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Web Phim</title>
<style>
:root{color-scheme:dark;--bg:#0a0e14;--panel:#121923;--panel2:#0f151e;--border:#273244;--text:#eef3f8;--muted:#95a3b7;--blue:#6da5ff;--green:#5ed49a;--yellow:#f5c96b;--red:#ff7474}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 20% 0,#172440 0,#0a0e14 42%);color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif}.wrap{max-width:980px;margin:0 auto;padding:34px 18px 70px}.hero{padding:24px 0 14px}.hero h1{font-size:36px;line-height:1.05;margin:0 0 10px}.hero p{color:var(--muted);max-width:700px}.badge{display:inline-flex;border:1px solid var(--border);background:#101722;border-radius:99px;padding:6px 10px;color:var(--muted);font-size:13px}.card{background:linear-gradient(180deg,#151d28,#10161f);border:1px solid var(--border);border-radius:16px;padding:20px;margin-top:16px;box-shadow:0 16px 40px #0004}.profiles{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.profile{border:1px solid var(--border);background:#111923;color:var(--text);padding:16px 12px;border-radius:13px;cursor:pointer;text-align:left}.profile:hover,.profile.active{border-color:#5b86cc;background:#172338}.profile b{display:block;font-size:16px;margin-bottom:5px}.profile span{color:var(--muted);font-size:13px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:13px}.field label{display:block;font-weight:700;font-size:14px;margin-bottom:6px}.field input,.field select{width:100%;padding:11px 12px;border-radius:9px;border:1px solid var(--border);background:#0b1119;color:var(--text)}.checks{display:flex;gap:18px;flex-wrap:wrap;margin-top:14px}.checks label{color:var(--muted)}.checks input{margin-right:7px}.advanced summary{cursor:pointer;color:var(--blue);font-weight:700}.cta{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:18px}.cta button{border:0;background:#4f83ff;color:white;font-weight:800;border-radius:10px;padding:13px 18px;cursor:pointer}.cta button:disabled{opacity:.5;cursor:not-allowed}.result{margin-top:16px;padding:16px;border:1px solid #2d694d;background:#10251c;border-radius:12px;display:none}.url{word-break:break-all;background:#09110d;padding:11px;border-radius:8px;margin:10px 0}.muted{color:var(--muted)}.ok{color:var(--green)}.warn{color:var(--yellow)}.bad{color:var(--red)}.toplinks{display:flex;gap:10px;flex-wrap:wrap;margin-top:10px}.toplinks a{color:var(--blue);text-decoration:none}.inviteBox{display:none}.notice{min-height:22px;margin-top:10px}.storage{margin-top:12px;font-size:13px;color:var(--muted)}@media(max-width:760px){.profiles{grid-template-columns:1fr 1fr}.grid{grid-template-columns:1fr}}@media(max-width:460px){.profiles{grid-template-columns:1fr}.hero h1{font-size:31px}}
</style>
</head>
<body><div class="wrap">
  <div class="hero">
    <span class="badge">Web Phim v5</span>
    <h1>Tạo link xem phim của riêng bạn</h1>
    <p>Chọn thiết bị và chất lượng. Hệ thống sẽ tạo một manifest URL ngắn để bạn dán trực tiếp vào Nuvio/Stremio.</p>
    <div class="toplinks"><a href="/status/ui">Status</a><a href="/admin">Admin</a></div>
  </div>

  <div class="card">
    <h2>1. Chọn thiết bị</h2>
    <div class="profiles">
      <button class="profile" data-profile="4k-tv"><b>📺 TV 4K</b><span>Ưu tiên 4K, HDR, audio tốt</span></button>
      <button class="profile active" data-profile="1080p-balanced"><b>🖥 PC / Laptop</b><span>1080p cân bằng chất lượng và dung lượng</span></button>
      <button class="profile" data-profile="mobile"><b>📱 Điện thoại</b><span>Ưu tiên file nhẹ, dễ phát</span></button>
      <button class="profile" data-profile="low-bandwidth"><b>🌐 Mạng chậm</b><span>Ưu tiên 720p và dung lượng thấp</span></button>
    </div>
  </div>

  <div class="card">
    <h2>2. Tùy chọn</h2>
    <div class="grid">
      <div class="field"><label>Tên link</label><input id="name" maxlength="80" placeholder="Ví dụ: TV phòng khách"></div>
      <div class="field"><label>Thời hạn</label><select id="expires"><option value="0">Không hết hạn</option><option value="30">30 ngày</option><option value="90">90 ngày</option><option value="365">1 năm</option></select></div>
      <div class="field"><label>Subtitle</label><select id="subtitle"><option value="vie,vi,eng,en">Tiếng Việt + English</option><option value="vie,vi">Chỉ tiếng Việt</option><option value="eng,en">Chỉ English</option></select></div>
      <div class="field"><label>Ưu tiên nguồn</label><select id="priority"><option value="kkphim-first">KKPhim trước</option><option value="cached-first">Cached debrid trước</option><option value="quality-first">Chất lượng trước</option><option value="small-first">File nhỏ trước</option><option value="balanced">Cân bằng</option></select></div>
    </div>
    <div class="checks"><label><input id="preferCached" type="checkbox" checked>Ưu tiên cached</label><label><input id="removeCam" type="checkbox" checked>Ẩn CAM/TS</label></div>
    <details class="advanced" style="margin-top:16px"><summary>Nâng cao</summary><div class="grid" style="margin-top:13px">
      <div class="field"><label>Preset</label><select id="preset"><option value="balanced">Balanced</option><option value="best">Best</option><option value="data-saver">Data Saver</option></select></div>
      <div class="field"><label>Codec</label><select id="codec"><option value="auto">Auto</option><option value="hevc">HEVC / x265</option><option value="av1">AV1</option><option value="h264">H.264 / x264</option></select></div>
      <div class="field"><label>Audio</label><select id="audio"><option value="auto">Auto</option><option value="premium">Atmos / TrueHD / DTS-HD</option><option value="compatible">EAC3 / AC3 / DTS</option><option value="small">AAC / Stereo</option></select></div>
      <div class="field"><label>Max size (GB, 0 = không giới hạn)</label><input id="maxSize" type="number" min="0" max="500" value="0"></div>
    </div></details>
    <div class="inviteBox field" id="inviteBox" style="margin-top:16px"><label>Mã mời</label><input id="invite" maxlength="64" placeholder="Nhập invite code"></div>
    <div class="storage" id="storage">Đang kiểm tra dịch vụ…</div>
    <div class="cta"><button id="create">Tạo manifest URL</button><span class="notice" id="notice"></span></div>
    <div class="result" id="result"><b class="ok">✓ Đã tạo link</b><div class="url" id="url"></div><div class="cta"><button id="copy" type="button">Copy link</button><a id="open" href="#" target="_blank" style="color:var(--blue)">Mở manifest</a></div></div>
  </div>
</div>
<script>
const $=id=>document.getElementById(id);let selectedProfile='1080p-balanced';let publicSignup=true;
const profileDefaults={
 '4k-tv':{preset:'balanced',codec:'hevc',audio:'premium',priority:'cached-first',maxSize:0},
 '1080p-balanced':{preset:'balanced',codec:'auto',audio:'compatible',priority:'balanced',maxSize:25},
 'mobile':{preset:'data-saver',codec:'hevc',audio:'small',priority:'small-first',maxSize:12},
 'low-bandwidth':{preset:'data-saver',codec:'auto',audio:'small',priority:'small-first',maxSize:6}
};
function applyProfile(p){selectedProfile=p;document.querySelectorAll('.profile').forEach(b=>b.classList.toggle('active',b.dataset.profile===p));const d=profileDefaults[p]||profileDefaults['1080p-balanced'];$('preset').value=d.preset;$('codec').value=d.codec;$('audio').value=d.audio;$('priority').value=d.priority;$('maxSize').value=d.maxSize;}
document.querySelectorAll('.profile').forEach(b=>b.onclick=()=>applyProfile(b.dataset.profile));
async function loadSettings(){try{const r=await fetch('/api/share/settings',{cache:'no-store'}),d=await r.json();publicSignup=!!d.publicSignup;$('inviteBox').style.display=publicSignup?'none':'block';$('storage').textContent=d.persistent?'✓ Shared links được lưu bền bằng persistent storage.':'⚠ Đang dùng memory mode: link sẽ mất khi server restart. Cần cấu hình persistent storage trước khi share rộng.';$('storage').className='storage '+(d.persistent?'ok':'warn');}catch(e){$('storage').textContent='Không đọc được trạng thái share service.'}}
function config(){return {deviceProfile:selectedProfile,streamPreset:$('preset').value,preferredCodec:$('codec').value,preferredAudio:$('audio').value,providerPriority:$('priority').value,preferCached:$('preferCached').checked,removeCam:$('removeCam').checked,maxSizeGB:Number($('maxSize').value||0),subtitleLanguages:$('subtitle').value.split(',').filter(Boolean),strictMatching:true,onlyCached:false,maxStreamsPerResolution:6,maxStreamsTotal:30,subtitleFallbackAll:false,subtitleStrictMatching:true,maxSubtitlesPerLanguage:8,subtitlePreferNonHI:true};}
$('create').onclick=async()=>{const btn=$('create');btn.disabled=true;$('notice').className='notice';$('notice').textContent='Đang tạo…';$('result').style.display='none';try{const r=await fetch('/api/share',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:$('name').value.trim(),expiresInDays:Number($('expires').value||0),inviteCode:$('invite').value.trim(),config:config()})});const d=await r.json();if(!r.ok)throw new Error(d.error||('HTTP '+r.status));$('url').textContent=d.manifestUrl;$('open').href=d.manifestUrl;$('result').style.display='block';$('notice').innerHTML='<span class="ok">Hoàn tất</span>';}catch(e){$('notice').innerHTML='<span class="bad">'+String(e.message||e)+'</span>'}finally{btn.disabled=false}};
$('copy').onclick=async()=>{try{await navigator.clipboard.writeText($('url').textContent);$('notice').innerHTML='<span class="ok">Đã copy link.</span>'}catch{$('notice').textContent='Hãy copy thủ công URL phía trên.'}};
applyProfile(selectedProfile);loadSettings();
</script></body></html>`;
};
