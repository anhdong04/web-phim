'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const originalCreateServer = http.createServer;
const STORE_PATH = process.env.WEBPHIM_CONFIG_STORE || path.join(process.env.WEBPHIM_DATA_DIR || '/tmp', 'webphim-multiuser.json');
const SESSION_TTL_MS = Math.max(3600000, Number(process.env.WEBPHIM_SESSION_TTL_MS || 30 * 24 * 3600000));
const MAX_BODY = 64 * 1024;
const PUBLIC_ID_BYTES = 16;
const SESSION_BYTES = 32;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMITS = Object.freeze({
  auth: 20,
  config: 30,
  public: 120,
  stream: 60,
});
const rateBuckets = new Map();

function nowIso() { return new Date().toISOString(); }
function randomId(prefix, bytes = 16) { return prefix + crypto.randomBytes(bytes).toString('base64url'); }
function sha256(value) { return crypto.createHash('sha256').update(String(value || '')).digest('hex'); }
function safeEqual(a, b) {
  const aa = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

function parseMasterKey() {
  const raw = String(process.env.CONFIG_ENCRYPTION_KEY || '').trim();
  if (!raw) return null;
  let key;
  if (/^[a-f0-9]{64}$/i.test(raw)) key = Buffer.from(raw, 'hex');
  else {
    try { key = Buffer.from(raw, 'base64'); } catch { key = null; }
  }
  return key && key.length === 32 ? key : null;
}
const MASTER_KEY = parseMasterKey();

function encryptSecret(value) {
  if (!MASTER_KEY) throw new Error('CONFIG_ENCRYPTION_KEY is not configured');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', MASTER_KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: tag.toString('base64'),
    keyVersion: Number(process.env.CONFIG_ENCRYPTION_KEY_VERSION || 1),
  };
}
function decryptSecret(record) {
  if (!MASTER_KEY) throw new Error('CONFIG_ENCRYPTION_KEY is not configured');
  const decipher = crypto.createDecipheriv('aes-256-gcm', MASTER_KEY, Buffer.from(record.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(record.authTag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(record.ciphertext, 'base64')),
    decipher.final()
  ]).toString('utf8');
}

function emptyDb() {
  return { version: 1, users: [], sessions: [], configs: [], secrets: [], audit: [] };
}
function ensureStoreDir() {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true, mode: 0o700 });
}
function loadDb() {
  try {
    const parsed = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
    return { ...emptyDb(), ...parsed };
  } catch {
    return emptyDb();
  }
}
function saveDb(db) {
  ensureStoreDir();
  const tmp = STORE_PATH + '.' + process.pid + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db), { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(tmp, STORE_PATH);
}
function mutateDb(fn) {
  const db = loadDb();
  const result = fn(db);
  saveDb(db);
  return result;
}
function audit(db, event, userId, configId, req) {
  db.audit.push({
    id: randomId('evt_', 12),
    event,
    userId: userId || null,
    configId: configId || null,
    ipHash: sha256(req?.socket?.remoteAddress || '').slice(0, 24),
    userAgentHash: sha256(req?.headers?.['user-agent'] || '').slice(0, 24),
    createdAt: nowIso(),
  });
  if (db.audit.length > 5000) db.audit.splice(0, db.audit.length - 5000);
}

function json(req, res, status, body, extra = {}) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(data),
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'permissions-policy': 'geolocation=(), microphone=(), camera=()',
    ...extra,
  });
  if (req.method === 'HEAD') return res.end();
  res.end(data);
}
function html(req, res, status, body) {
  res.writeHead(status, {
    'content-type': 'text/html; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
    'content-security-policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data: https:; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'permissions-policy': 'geolocation=(), microphone=(), camera=()',
  });
  if (req.method === 'HEAD') return res.end();
  res.end(body);
}

async function readJsonBody(req) {
  let total = 0;
  const chunks = [];
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_BODY) {
      const e = new Error('Request body too large');
      e.status = 413;
      throw e;
    }
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch {
    const e = new Error('Invalid JSON');
    e.status = 400;
    throw e;
  }
}
function cookies(req) {
  const out = {};
  for (const pair of String(req.headers.cookie || '').split(';')) {
    const i = pair.indexOf('=');
    if (i <= 0) continue;
    out[pair.slice(0, i).trim()] = decodeURIComponent(pair.slice(i + 1).trim());
  }
  return out;
}
function sessionFor(req) {
  const token = cookies(req).webphim_session;
  if (!token) return null;
  const db = loadDb();
  const digest = sha256(token);
  const session = db.sessions.find(s => safeEqual(s.tokenHash, digest) && Date.parse(s.expiresAt) > Date.now());
  if (!session) return null;
  const user = db.users.find(u => u.id === session.userId && u.status === 'active');
  return user ? { user, session } : null;
}
function setSessionCookie(res, token) {
  const secure = String(process.env.NODE_ENV || 'production') !== 'development';
  res.setHeader('set-cookie', [
    `webphim_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL_MS/1000)}${secure ? '; Secure' : ''}`
  ]);
}
function clearSessionCookie(res) {
  res.setHeader('set-cookie', 'webphim_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure');
}
function sameOrigin(req) {
  const origin = String(req.headers.origin || '');
  if (!origin) return true;
  try {
    const u = new URL(origin);
    return u.host === String(req.headers.host || '');
  } catch { return false; }
}
function requireMutationOrigin(req) {
  return ['POST','PATCH','PUT','DELETE'].includes(req.method) ? sameOrigin(req) : true;
}
function rateLimit(req, kind, keyExtra = '') {
  const limit = RATE_LIMITS[kind] || 60;
  const key = `${kind}:${sha256(req.socket.remoteAddress || '').slice(0,16)}:${keyExtra}`;
  const now = Date.now();
  let b = rateBuckets.get(key);
  if (!b || b.reset <= now) b = { count: 0, reset: now + RATE_WINDOW_MS };
  b.count += 1;
  rateBuckets.set(key, b);
  if (rateBuckets.size > 5000) {
    for (const [k,v] of rateBuckets) if (v.reset <= now) rateBuckets.delete(k);
  }
  return b.count <= limit;
}
function normalizeEmail(value) { return String(value || '').trim().toLowerCase().slice(0, 254); }
function validEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
function passwordHash(password, salt) {
  return crypto.scryptSync(String(password), Buffer.from(salt, 'base64'), 64).toString('base64');
}
function publicConfig(config) {
  return {
    id: config.id,
    publicId: config.publicId,
    name: config.name,
    enabledSources: config.enabledSources,
    metadataLanguage: config.metadataLanguage,
    preferredQuality: config.preferredQuality,
    subtitles: config.subtitles,
    revision: config.revision,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
    revokedAt: config.revokedAt || null,
    providers: {
      torboxConfigured: !!config.torboxConfigured,
    }
  };
}
function sanitizeSources(value) {
  const allowed = new Set(['tmdb','kkphim','hh3d','yanhh3d','hh4k','iptv','torbox','upstream']);
  const list = Array.isArray(value) ? value : [];
  const out = [...new Set(list.map(x => String(x).toLowerCase()).filter(x => allowed.has(x)))];
  return out.length ? out : ['tmdb','kkphim','hh3d','yanhh3d','upstream'];
}
function sanitizeConfigInput(raw = {}, previous = null) {
  const langs = Array.isArray(raw?.subtitles?.languages)
    ? raw.subtitles.languages.map(x => String(x).toLowerCase()).filter(Boolean).slice(0, 8)
    : (previous?.subtitles?.languages || ['vi','en']);
  return {
    name: String(raw.name ?? previous?.name ?? 'Web Phim').trim().slice(0, 80) || 'Web Phim',
    enabledSources: sanitizeSources(raw.enabledSources ?? previous?.enabledSources),
    metadataLanguage: ['vi-VN','en-US'].includes(raw.metadataLanguage) ? raw.metadataLanguage : (previous?.metadataLanguage || 'vi-VN'),
    preferredQuality: ['auto','4k','1080p','720p'].includes(String(raw.preferredQuality || '').toLowerCase())
      ? String(raw.preferredQuality).toLowerCase()
      : (previous?.preferredQuality || 'auto'),
    subtitles: {
      enabled: typeof raw?.subtitles?.enabled === 'boolean' ? raw.subtitles.enabled : (previous?.subtitles?.enabled ?? true),
      languages: langs,
      aiFallback: typeof raw?.subtitles?.aiFallback === 'boolean' ? raw.subtitles.aiFallback : (previous?.subtitles?.aiFallback ?? true),
    }
  };
}
function providerSecret(db, configId, provider) {
  const row = db.secrets.find(s => s.configId === configId && s.provider === provider);
  return row ? decryptSecret(row) : null;
}

async function torboxTest(apiKey) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const r = await fetch('https://api.torbox.app/v1/api/user/me', {
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${String(apiKey || '').trim()}`,
        'user-agent': 'WebPhim/secure-addon-builder'
      },
      signal: controller.signal
    });
    if (!r.ok) return { ok: false, status: r.status };
    const data = await r.json().catch(() => ({}));
    return { ok: true, status: r.status, user: { plan: data?.data?.plan_name || data?.data?.plan || undefined } };
  } catch (e) {
    return { ok: false, status: 0, error: e.name === 'AbortError' ? 'timeout' : 'network_error' };
  } finally { clearTimeout(timer); }
}

function manifestFor(config) {
  const prefix = sha256(config.publicId).slice(0, 12);
  const catalogs = [];
  if (config.enabledSources.includes('tmdb') || config.enabledSources.includes('kkphim')) {
    catalogs.push(
      { type: 'movie', id: 'home-hot', name: '🔥 Hot rần rần', extra: [{ name: 'skip', isRequired: false }] },
      { type: 'movie', id: 'home-new-movies', name: '🆕 Phim lẻ mới cập nhật', extra: [{ name: 'skip', isRequired: false }] },
      { type: 'series', id: 'home-new-series', name: '📺 Phim bộ mới nhất', extra: [{ name: 'skip', isRequired: false }] }
    );
  }
  if (config.enabledSources.includes('hh3d')) catalogs.unshift({ type:'series', id:'hh3d', name:'🐉 HH3D', extra:[{name:'skip',isRequired:false}] });
  if (config.enabledSources.includes('iptv')) {
    catalogs.push(
      { type:'movie', id:'iptv-vn', name:'🇻🇳 IPTV • Việt Nam', extra:[{name:'search',isRequired:false},{name:'skip',isRequired:false}] },
      { type:'movie', id:'iptv-kids', name:'🧒 IPTV • Hoạt hình & Trẻ em', extra:[{name:'search',isRequired:false},{name:'skip',isRequired:false}] },
      { type:'movie', id:'iptv-football', name:'⚽ IPTV • Bóng đá', extra:[{name:'search',isRequired:false},{name:'skip',isRequired:false}] }
    );
  }
  return {
    id: `vn.webphim.cfg.${prefix}`,
    version: '7.0.0',
    name: config.name || 'Web Phim',
    description: 'Web Phim multi-user configuration',
    resources: [
      'catalog',
      { name: 'meta', types: ['movie','series'], idPrefixes: ['tmdb:','tt','hh3d:','iptv:'] },
      { name: 'stream', types: ['movie','series'], idPrefixes: ['tmdb:','tt','hh3d:','iptv:'] },
      { name: 'subtitles', types: ['movie','series'], idPrefixes: ['tmdb:','tt'] }
    ],
    types: ['movie','series'],
    catalogs,
    behaviorHints: { configurable: false, configurationRequired: false, adult: false, p2p: false }
  };
}

function providerOfStream(stream) {
  const text = [stream?.name, stream?.title, stream?.description].filter(Boolean).join(' ').toLowerCase();
  if (text.includes('yanhh3d')) return 'yanhh3d';
  if (text.includes('hh4k')) return 'hh4k';
  if (text.includes('hh3d')) return 'hh3d';
  if (text.includes('kkphim') || text.includes('kk phim')) return 'kkphim';
  if (text.includes('torbox')) return 'torbox';
  return 'upstream';
}
function filterStreams(streams, config) {
  const enabled = new Set(config.enabledSources || []);
  return (Array.isArray(streams) ? streams : []).filter(stream => enabled.has(providerOfStream(stream)));
}
function captureLegacy(legacyHandler, req) {
  return new Promise((resolve, reject) => {
    const headers = {};
    const chunks = [];
    let statusCode = 200;
    let done = false;
    const finish = body => {
      if (done) return;
      done = true;
      if (body !== undefined && body !== null) chunks.push(Buffer.isBuffer(body) ? body : Buffer.from(String(body)));
      resolve({ statusCode, headers, body: Buffer.concat(chunks) });
    };
    const fakeRes = {
      headersSent: false,
      writeHead(status, hdrs = {}) {
        statusCode = Number(status) || 200;
        Object.assign(headers, hdrs || {});
        this.headersSent = true;
        return this;
      },
      setHeader(name, value) { headers[String(name).toLowerCase()] = value; },
      getHeader(name) { return headers[String(name).toLowerCase()]; },
      getHeaders() { return { ...headers }; },
      removeHeader(name) { delete headers[String(name).toLowerCase()]; },
      write(chunk) {
        if (chunk !== undefined && chunk !== null) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
        return true;
      },
      end: finish,
      on() { return this; },
      once() { return this; },
      emit() { return false; }
    };
    try {
      const maybe = legacyHandler(req, fakeRes);
      if (maybe && typeof maybe.then === 'function') maybe.catch(reject);
    } catch (e) { reject(e); }
    setTimeout(() => {
      if (!done) reject(new Error('Legacy handler timeout'));
    }, 20_000).unref?.();
  });
}
async function torboxAddonStreams(apiKey, type, id) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const encodedKey = encodeURIComponent(String(apiKey || '').trim());
    const encodedId = encodeURIComponent(String(id || ''));
    const url = `https://stremio.torbox.app/${encodedKey}/stream/${encodeURIComponent(type)}/${encodedId}.json`;
    const r = await fetch(url, {
      headers: { accept:'application/json', 'user-agent':'WebPhim/secure-addon-builder' },
      signal: controller.signal
    });
    if (!r.ok) return [];
    const body = await r.json().catch(() => ({}));
    return (Array.isArray(body.streams) ? body.streams : []).map(stream => ({
      ...stream,
      name: stream.name || 'TorBox',
      title: stream.title ? `TorBox • ${stream.title}` : 'TorBox'
    }));
  } catch {
    return [];
  } finally { clearTimeout(timer); }
}
function routeDisabled(config, rest) {
  if (/^\/catalog\/series\/hh3d(?:\/|\.json)/.test(rest) && !config.enabledSources.includes('hh3d')) return true;
  if (/^\/(?:catalog|meta|stream)\/movie\/iptv[-:]/.test(rest) && !config.enabledSources.includes('iptv')) return true;
  return false;
}

function rewriteAddonUrl(req, config, pathname, search) {
  const m = pathname.match(/^\/a\/(cfg_[A-Za-z0-9_-]+)(\/.*)$/);
  if (!m) return false;
  const rest = m[2];
  // IPTV is a standalone addon base. Everything else reuses the already-tested Full addon.
  const target = rest.startsWith('/catalog/movie/iptv-') || rest.includes('/meta/movie/iptv:') || rest.includes('/stream/movie/iptv:')
    ? '/iptv' + rest
    : '/full' + rest;
  req.url = target + (search || '');
  req.webPhimConfig = config;
  return true;
}

function configFromPublicId(publicId) {
  const db = loadDb();
  const config = db.configs.find(c => c.publicId === publicId);
  if (!config) return { db, config: null };
  return { db, config };
}

function configurePage() {
  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Web Phim Addon Builder</title>
<style>body{font-family:system-ui,sans-serif;max-width:820px;margin:40px auto;padding:0 16px;line-height:1.5}fieldset{margin:16px 0;padding:16px}input,select,button{padding:10px;margin:4px 0}input[type=text],input[type=email],input[type=password]{width:min(100%,520px)}pre{white-space:pre-wrap;background:#f4f4f4;padding:12px}.row{display:flex;gap:8px;flex-wrap:wrap}.muted{opacity:.7}</style></head>
<body><h1>Web Phim — Addon Builder</h1>
<p class="muted">API key được gửi qua HTTPS, mã hóa phía server và không xuất hiện trong manifest URL.</p>
<div id="auth">
<fieldset><legend>Tài khoản</legend>
<input id="email" type="email" placeholder="Email"><br><input id="password" type="password" placeholder="Mật khẩu (>= 10 ký tự)">
<div class="row"><button onclick="auth('register')">Đăng ký</button><button onclick="auth('login')">Đăng nhập</button><button onclick="logout()">Đăng xuất</button></div></fieldset>
</div>
<fieldset><legend>Tạo addon</legend>
<input id="name" type="text" value="Web Phim" placeholder="Tên addon">
<p>Nguồn: <label><input type="checkbox" class="src" value="tmdb" checked> TMDB</label> <label><input type="checkbox" class="src" value="kkphim" checked> KKPhim</label> <label><input type="checkbox" class="src" value="hh3d" checked> HH3D</label> <label><input type="checkbox" class="src" value="yanhh3d" checked> YanHH3D</label> <label><input type="checkbox" class="src" value="hh4k"> HH4K</label> <label><input type="checkbox" class="src" value="iptv"> IPTV</label></p>
<select id="quality"><option value="auto">Auto</option><option value="4k">4K</option><option value="1080p">1080p</option><option value="720p">720p</option></select><br>
<input id="torbox" type="password" placeholder="TorBox API key (không bắt buộc)"><button onclick="testTorbox()">Test connection</button><br>
<button onclick="createConfig()">Save & tạo manifest</button></fieldset>
<h2>Addon của tôi</h2><button onclick="loadConfigs()">Tải lại</button><pre id="out">Chưa đăng nhập.</pre>
<script>
const out=x=>document.getElementById('out').textContent=typeof x==='string'?x:JSON.stringify(x,null,2);
async function api(url,opt={}){const r=await fetch(url,{credentials:'same-origin',headers:{'content-type':'application/json',...(opt.headers||{})},...opt});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||('HTTP '+r.status));return j}
async function auth(mode){try{await api('/api/auth/'+mode,{method:'POST',body:JSON.stringify({email:email.value,password:password.value})});await loadConfigs()}catch(e){out(e.message)}}
async function logout(){try{await api('/api/auth/logout',{method:'POST',body:'{}'});out('Đã đăng xuất')}catch(e){out(e.message)}}
async function testTorbox(){try{out(await api('/api/providers/torbox/test',{method:'POST',body:JSON.stringify({apiKey:torbox.value})}))}catch(e){out(e.message)}}
async function createConfig(){try{const enabledSources=[...document.querySelectorAll('.src:checked')].map(x=>x.value);const body={name:name.value,enabledSources,preferredQuality:quality.value,subtitles:{enabled:true,languages:['vi','en'],aiFallback:true},torboxApiKey:torbox.value||undefined};const j=await api('/api/configs',{method:'POST',body:JSON.stringify(body)});torbox.value='';out(j);await loadConfigs()}catch(e){out(e.message)}}
async function loadConfigs(){try{const j=await api('/api/configs');out(j)}catch(e){out(e.message)}}
</script></body></html>`;
}

async function handleManaged(req, res, legacyHandler) {
  let u;
  try { u = new URL(req.url, `http://${req.headers.host || 'localhost'}`); }
  catch { return json(req,res,400,{error:'Invalid URL'}); }
  const pathname = u.pathname;

  if (pathname === '/configure' || pathname === '/configure/') {
    return html(req, res, 200, configurePage());
  }
  if (pathname === '/api/security/status') {
    return json(req,res,200,{
      multiUser: true,
      encryptionConfigured: !!MASTER_KEY,
      store: path.basename(STORE_PATH),
      publicRepoWarning: true
    });
  }

  if (pathname.startsWith('/api/')) {
    if (!requireMutationOrigin(req)) return json(req,res,403,{error:'Invalid origin'});
    const kind = pathname.startsWith('/api/auth/') ? 'auth' : 'config';
    if (!rateLimit(req, kind)) return json(req,res,429,{error:'Too many requests'});

    try {
      if (pathname === '/api/auth/register' && req.method === 'POST') {
        if (!MASTER_KEY) return json(req,res,503,{error:'Secure storage is not configured'});
        const body = await readJsonBody(req);
        const email = normalizeEmail(body.email);
        const password = String(body.password || '');
        if (!validEmail(email) || password.length < 10) return json(req,res,400,{error:'Email hoặc mật khẩu không hợp lệ'});
        let rawSession;
        mutateDb(db => {
          if (db.users.some(x => x.email === email)) {
            const e = new Error('Email đã tồn tại'); e.status = 409; throw e;
          }
          const salt = crypto.randomBytes(16).toString('base64');
          const user = { id: randomId('usr_',12), email, salt, passwordHash: passwordHash(password,salt), status:'active', createdAt:nowIso() };
          db.users.push(user);
          rawSession = randomId('', SESSION_BYTES);
          db.sessions.push({ id:randomId('ses_',12), userId:user.id, tokenHash:sha256(rawSession), expiresAt:new Date(Date.now()+SESSION_TTL_MS).toISOString(), createdAt:nowIso() });
          audit(db,'auth.register',user.id,null,req);
        });
        setSessionCookie(res, rawSession);
        return json(req,res,201,{ok:true});
      }

      if (pathname === '/api/auth/login' && req.method === 'POST') {
        const body = await readJsonBody(req);
        const email = normalizeEmail(body.email);
        const password = String(body.password || '');
        let rawSession = null;
        mutateDb(db => {
          const user = db.users.find(x => x.email === email && x.status === 'active');
          if (!user || !safeEqual(user.passwordHash, passwordHash(password,user.salt))) {
            const e = new Error('Sai email hoặc mật khẩu'); e.status = 401; throw e;
          }
          rawSession = randomId('', SESSION_BYTES);
          db.sessions.push({ id:randomId('ses_',12), userId:user.id, tokenHash:sha256(rawSession), expiresAt:new Date(Date.now()+SESSION_TTL_MS).toISOString(), createdAt:nowIso() });
          audit(db,'auth.login',user.id,null,req);
        });
        setSessionCookie(res, rawSession);
        return json(req,res,200,{ok:true});
      }

      if (pathname === '/api/auth/logout' && req.method === 'POST') {
        const token = cookies(req).webphim_session;
        if (token) mutateDb(db => { db.sessions = db.sessions.filter(s => !safeEqual(s.tokenHash,sha256(token))); });
        clearSessionCookie(res);
        return json(req,res,200,{ok:true});
      }

      const auth = sessionFor(req);
      if (!auth) return json(req,res,401,{error:'Authentication required'});

      if (pathname === '/api/providers/torbox/test' && req.method === 'POST') {
        const body = await readJsonBody(req);
        const apiKey = String(body.apiKey || '').trim();
        if (apiKey.length < 16) return json(req,res,400,{error:'API key không hợp lệ'});
        const result = await torboxTest(apiKey);
        if (!result.ok) return json(req,res,401,{error:'Provider authentication failed', provider:'torbox'});
        return json(req,res,200,{ok:true, provider:'torbox', plan:result.user?.plan});
      }

      if (pathname === '/api/configs' && req.method === 'GET') {
        const db = loadDb();
        return json(req,res,200,{configs:db.configs.filter(c=>c.userId===auth.user.id).map(c=>({
          ...publicConfig(c),
          manifestUrl:`${u.protocol}//${req.headers.host}/a/${c.publicId}/manifest.json`
        }))});
      }

      if (pathname === '/api/configs' && req.method === 'POST') {
        if (!MASTER_KEY) return json(req,res,503,{error:'Secure storage is not configured'});
        const body = await readJsonBody(req);
        const clean = sanitizeConfigInput(body);
        const torboxApiKey = String(body.torboxApiKey || '').trim();
        const created = mutateDb(db => {
          const config = {
            id: randomId('conf_',12), userId:auth.user.id, publicId:randomId('cfg_',PUBLIC_ID_BYTES),
            ...clean, revision:1, torboxConfigured:false, createdAt:nowIso(), updatedAt:nowIso(), revokedAt:null
          };
          db.configs.push(config);
          if (torboxApiKey) {
            const enc = encryptSecret(torboxApiKey);
            db.secrets.push({ id:randomId('sec_',12), configId:config.id, provider:'torbox', ...enc, createdAt:nowIso(), updatedAt:nowIso() });
            config.torboxConfigured = true;
          }
          audit(db,'config.create',auth.user.id,config.id,req);
          return config;
        });
        return json(req,res,201,{config:publicConfig(created),manifestUrl:`${u.protocol}//${req.headers.host}/a/${created.publicId}/manifest.json`});
      }

      let m = pathname.match(/^\/api\/configs\/([^/]+)$/);
      if (m && req.method === 'GET') {
        const db = loadDb();
        const config = db.configs.find(c=>c.id===m[1] && c.userId===auth.user.id);
        if (!config) return json(req,res,404,{error:'Config not found'});
        return json(req,res,200,{config:publicConfig(config),manifestUrl:`${u.protocol}//${req.headers.host}/a/${config.publicId}/manifest.json`});
      }

      if (m && req.method === 'PATCH') {
        const body = await readJsonBody(req);
        const updated = mutateDb(db => {
          const config = db.configs.find(c=>c.id===m[1] && c.userId===auth.user.id);
          if (!config) { const e=new Error('Config not found');e.status=404;throw e; }
          Object.assign(config,sanitizeConfigInput(body,config),{revision:config.revision+1,updatedAt:nowIso()});
          if (Object.prototype.hasOwnProperty.call(body,'torboxApiKey')) {
            db.secrets = db.secrets.filter(s=>!(s.configId===config.id && s.provider==='torbox'));
            const apiKey=String(body.torboxApiKey||'').trim();
            if (apiKey) {
              const enc=encryptSecret(apiKey);
              db.secrets.push({id:randomId('sec_',12),configId:config.id,provider:'torbox',...enc,createdAt:nowIso(),updatedAt:nowIso()});
              config.torboxConfigured=true;
            } else config.torboxConfigured=false;
          }
          audit(db,'config.update',auth.user.id,config.id,req);
          return config;
        });
        return json(req,res,200,{config:publicConfig(updated)});
      }

      m = pathname.match(/^\/api\/configs\/([^/]+)\/rotate$/);
      if (m && req.method === 'POST') {
        const updated = mutateDb(db => {
          const config = db.configs.find(c=>c.id===m[1] && c.userId===auth.user.id);
          if (!config) { const e=new Error('Config not found');e.status=404;throw e; }
          config.publicId=randomId('cfg_',PUBLIC_ID_BYTES);config.revision+=1;config.updatedAt=nowIso();config.revokedAt=null;
          audit(db,'config.rotate',auth.user.id,config.id,req);
          return config;
        });
        return json(req,res,200,{config:publicConfig(updated),manifestUrl:`${u.protocol}//${req.headers.host}/a/${updated.publicId}/manifest.json`});
      }

      m = pathname.match(/^\/api\/configs\/([^/]+)\/revoke$/);
      if (m && req.method === 'POST') {
        mutateDb(db => {
          const config = db.configs.find(c=>c.id===m[1] && c.userId===auth.user.id);
          if (!config) { const e=new Error('Config not found');e.status=404;throw e; }
          config.revokedAt=nowIso();config.revision+=1;config.updatedAt=nowIso();
          audit(db,'config.revoke',auth.user.id,config.id,req);
        });
        return json(req,res,200,{ok:true});
      }

      m = pathname.match(/^\/api\/configs\/([^/]+)$/);
      if (m && req.method === 'DELETE') {
        mutateDb(db => {
          const config = db.configs.find(c=>c.id===m[1] && c.userId===auth.user.id);
          if (!config) { const e=new Error('Config not found');e.status=404;throw e; }
          db.configs=db.configs.filter(c=>c.id!==config.id);
          db.secrets=db.secrets.filter(s=>s.configId!==config.id);
          audit(db,'config.delete',auth.user.id,config.id,req);
        });
        return json(req,res,200,{ok:true});
      }

      return json(req,res,404,{error:'API route not found'});
    } catch (e) {
      console.error('[multiuser] request failed', { path: pathname, status: e.status || 500, message: String(e.message || 'error').slice(0,160) });
      return json(req,res,e.status||500,{error:e.status&&e.status<500?e.message:'Internal server error',requestId:randomId('req_',8)});
    }
  }

  let m = pathname.match(/^\/a\/(cfg_[A-Za-z0-9_-]+)\/manifest\.json$/);
  if (m) {
    if (!rateLimit(req,'public',m[1])) return json(req,res,429,{error:'Too many requests'});
    const {config}=configFromPublicId(m[1]);
    if (!config) return json(req,res,404,{error:'Addon config not found'});
    if (config.revokedAt) return json(req,res,410,{error:'Addon config revoked'});
    return json(req,res,200,manifestFor(config),{'access-control-allow-origin':'*'});
  }

  m = pathname.match(/^\/a\/(cfg_[A-Za-z0-9_-]+)(\/(?:catalog|meta|stream|subtitles)\/.*\.json)$/);
  if (m) {
    const kind = m[2].startsWith('/stream/') ? 'stream' : 'public';
    if (!rateLimit(req,kind,m[1])) return json(req,res,429,{error:'Too many requests'});
    const {db,config}=configFromPublicId(m[1]);
    if (!config) return json(req,res,404,{error:'Addon config not found'});
    if (config.revokedAt) return json(req,res,410,{error:'Addon config revoked'});
    const rest = m[2];
    if (routeDisabled(config, rest)) {
      if (rest.startsWith('/meta/')) return json(req,res,200,{meta:null},{'access-control-allow-origin':'*'});
      if (rest.startsWith('/stream/')) return json(req,res,200,{streams:[]},{'access-control-allow-origin':'*'});
      return json(req,res,200,{metas:[]},{'access-control-allow-origin':'*'});
    }

    // Expose config only in memory for provider adapters that opt in; never serialize secrets.
    req.webPhimConfig = config;
    let torboxApiKey = null;
    if (config.torboxConfigured) {
      try {
        torboxApiKey = providerSecret(db,config.id,'torbox');
        req.webPhimSecrets = { torboxApiKey };
      } catch {
        return json(req,res,500,{error:'Provider secret unavailable',requestId:randomId('req_',8)});
      }
    }
    rewriteAddonUrl(req,config,pathname,u.search);

    if (kind === 'stream') {
      try {
        const legacy = await captureLegacy(legacyHandler, req);
        let body = {};
        try { body = JSON.parse(legacy.body.toString('utf8') || '{}'); } catch {}
        const streamMatch = rest.match(/^\/stream\/(movie|series)\/(.+)\.json$/);
        let streams = filterStreams(body.streams, config);
        if (torboxApiKey && config.enabledSources.includes('torbox') && streamMatch) {
          const tb = await torboxAddonStreams(torboxApiKey, streamMatch[1], decodeURIComponent(streamMatch[2]));
          const seen = new Set(streams.map(x => String(x.url || x.infoHash || '') + '|' + String(x.title || '')));
          for (const stream of tb) {
            const key = String(stream.url || stream.infoHash || '') + '|' + String(stream.title || '');
            if (!seen.has(key)) { seen.add(key); streams.push(stream); }
          }
        }
        return json(req,res,200,{...body,streams},{'access-control-allow-origin':'*'});
      } catch (e) {
        console.error('[multiuser] stream aggregation failed', { message:String(e.message||e).slice(0,160) });
        return json(req,res,200,{streams:[]},{'access-control-allow-origin':'*'});
      }
    }
    return legacyHandler(req,res);
  }

  return false;
}

http.createServer = function patchedCreateServer(...args) {
  if (typeof args[0] !== 'function') return originalCreateServer.apply(http,args);
  const legacyHandler = args[0];
  args[0] = function multiUserWrapped(req,res) {
    Promise.resolve(handleManaged(req,res,legacyHandler)).then(handled => {
      if (handled === false) return legacyHandler(req,res);
    }).catch(err => {
      console.error('[multiuser] unhandled', { message:String(err?.message||err).slice(0,160) });
      if (!res.headersSent) json(req,res,500,{error:'Internal server error',requestId:randomId('req_',8)});
      else res.end();
    });
  };
  return originalCreateServer.apply(http,args);
};

module.exports = {
  encryptSecret,
  decryptSecret,
  sanitizeConfigInput,
  manifestFor,
  _test: { loadDb, saveDb, passwordHash, parseMasterKey, configFromPublicId }
};
