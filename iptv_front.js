'use strict';

const http = require('node:http');
const net = require('node:net');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');

const PORT = Number(process.env.PORT || 7000);
const LEGACY_PORT = Number(process.env.LEGACY_PORT || 7001);
const PLAYLIST_URL = String(process.env.IPTV_M3U_URL || 'https://iptv-org.github.io/iptv/index.m3u').trim();
const PAGE_SIZE = Math.max(20, Math.min(250, Number(process.env.IPTV_PAGE_SIZE || 100)));
const CACHE_MS = Math.max(60000, Number(process.env.IPTV_CACHE_SECONDS || 900) * 1000);
let playlistCache = { at: 0, channels: [], byId: new Map() };

function sendJson(res, status, body, maxAge = 0) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(data),
    'access-control-allow-origin': '*',
    'access-control-allow-headers': '*',
    'access-control-allow-methods': 'GET,HEAD,OPTIONS',
    'cache-control': maxAge ? `public, max-age=${maxAge}` : 'no-store',
    'x-web-phim-router': 'iptv-front-v2'
  });
  if (res.req && res.req.method === 'HEAD') return res.end();
  res.end(data);
}

function iptvManifest() {
  return {
    id: 'vn.webphim.iptvorg',
    version: '1.1.0',
    name: 'IPTV-org Live TV',
    description: 'Live TV từ playlist công khai IPTV-org',
    resources: [
      'catalog',
      { name: 'meta', types: ['movie'], idPrefixes: ['iptv:'] },
      { name: 'stream', types: ['movie'], idPrefixes: ['iptv:'] }
    ],
    types: ['movie'],
    catalogs: [{
      type: 'movie',
      id: 'iptvorg',
      name: 'IPTV-org • Live TV',
      extra: [
        { name: 'search', isRequired: false },
        { name: 'skip', isRequired: false }
      ]
    }],
    behaviorHints: { configurable: false, configurationRequired: false, adult: false, p2p: false }
  };
}

function decodeEntities(s) {
  return String(s || '')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function attr(line, name) {
  const m = String(line).match(new RegExp('(?:^|\\s)' + name + '="([^"]*)"', 'i'));
  return m ? decodeEntities(m[1].trim()) : '';
}

function channelId(name, url) {
  return 'iptv:' + crypto.createHash('sha1').update(String(name) + '\n' + String(url)).digest('hex').slice(0, 20);
}

function parseM3u(text) {
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  const channels = [];
  let pending = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#EXTINF:')) {
      const comma = line.indexOf(',');
      pending = {
        name: decodeEntities(attr(line, 'tvg-name') || (comma >= 0 ? line.slice(comma + 1).trim() : '') || 'Live TV'),
        logo: attr(line, 'tvg-logo'),
        group: attr(line, 'group-title'),
        country: attr(line, 'tvg-country') || attr(line, 'country'),
        tvgId: attr(line, 'tvg-id'),
        url: ''
      };
      continue;
    }
    if (line.startsWith('#')) continue;
    if (pending && /^https?:\/\//i.test(line)) {
      pending.url = line;
      pending.id = channelId(pending.name, pending.url);
      channels.push(pending);
      pending = null;
    }
  }
  return channels;
}

async function channels() {
  const now = Date.now();
  if (playlistCache.channels.length && now - playlistCache.at < CACHE_MS) return playlistCache;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const r = await fetch(PLAYLIST_URL, {
      headers: { 'user-agent': 'WebPhim-IPTV/1.1', accept: 'application/x-mpegURL,text/plain,*/*' },
      signal: controller.signal
    });
    if (!r.ok) throw new Error('playlist HTTP ' + r.status);
    const list = parseM3u(await r.text());
    if (!list.length) throw new Error('playlist parsed 0 channels');
    playlistCache = { at: now, channels: list, byId: new Map(list.map(x => [x.id, x])) };
    console.log('[iptv-front] loaded ' + list.length + ' channels');
    return playlistCache;
  } finally {
    clearTimeout(timer);
  }
}

function preview(c) {
  const m = {
    id: c.id,
    type: 'movie',
    name: c.name,
    description: [c.group, c.country, c.tvgId].filter(Boolean).join(' • ') || 'Live TV',
    releaseInfo: 'LIVE',
    behaviorHints: { defaultVideoId: c.id }
  };
  if (/^https?:\/\//i.test(c.logo || '')) {
    m.poster = c.logo;
    m.logo = c.logo;
    m.posterShape = 'square';
  }
  return m;
}

function parseExtra(raw) {
  const out = { search: '', skip: 0 };
  if (!raw) return out;
  let s = raw;
  try { s = decodeURIComponent(raw); } catch {}
  const p = new URLSearchParams(s);
  out.search = String(p.get('search') || '').trim().toLowerCase();
  out.skip = Math.max(0, Number(p.get('skip') || 0) || 0);
  return out;
}

async function handleIptv(req, res, pathname) {
  if (req.method === 'OPTIONS') return sendJson(res, 204, {});
  if (req.method !== 'GET' && req.method !== 'HEAD') return sendJson(res, 405, { error: 'Method not allowed' });

  if (pathname === '/iptv/manifest.json') return sendJson(res, 200, iptvManifest(), 60);
  if (pathname === '/iptv' || pathname === '/iptv/') return sendJson(res, 200, { manifest: '/iptv/manifest.json' });

  let m = pathname.match(/^\/iptv\/catalog\/movie\/iptvorg(?:\/([^/]+))?\.json$/);
  if (m) {
    try {
      const data = await channels();
      const extra = parseExtra(m[1] || '');
      let list = data.channels;
      if (extra.search) list = list.filter(c => `${c.name} ${c.group} ${c.country} ${c.tvgId}`.toLowerCase().includes(extra.search));
      return sendJson(res, 200, { metas: list.slice(extra.skip, extra.skip + PAGE_SIZE).map(preview) }, 60);
    } catch (e) {
      console.error('[iptv-front] catalog:', e.message);
      return sendJson(res, 200, { metas: [] });
    }
  }

  m = pathname.match(/^\/iptv\/meta\/movie\/(iptv:[a-f0-9]{20})\.json$/i);
  if (m) {
    try {
      const data = await channels();
      const c = data.byId.get(m[1]);
      return sendJson(res, 200, { meta: c ? preview(c) : null }, 60);
    } catch (e) { return sendJson(res, 200, { meta: null }); }
  }

  m = pathname.match(/^\/iptv\/stream\/movie\/(iptv:[a-f0-9]{20})\.json$/i);
  if (m) {
    try {
      const data = await channels();
      const c = data.byId.get(m[1]);
      if (!c) return sendJson(res, 200, { streams: [] });
      return sendJson(res, 200, { streams: [{ name: 'IPTV-org', title: c.name, url: c.url, behaviorHints: { notWebReady: false } }] });
    } catch (e) { return sendJson(res, 200, { streams: [] }); }
  }

  return sendJson(res, 404, { error: 'IPTV route not found' });
}

function proxyLegacy(req, res) {
  const upstream = http.request({
    hostname: '127.0.0.1', port: LEGACY_PORT, method: req.method, path: req.url,
    headers: { ...req.headers }
  }, r => {
    res.writeHead(r.statusCode || 502, r.headers);
    r.pipe(res);
  });
  upstream.on('error', e => {
    console.error('[iptv-front] legacy proxy:', e.message);
    if (!res.headersSent) sendJson(res, 502, { error: 'Legacy addon unavailable' }); else res.end();
  });
  req.pipe(upstream);
}

function waitForPort(port, timeout = 20000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const ping = () => {
      const s = net.createConnection({ host: '127.0.0.1', port });
      s.once('connect', () => { s.destroy(); resolve(); });
      s.once('error', () => {
        s.destroy();
        if (Date.now() - start >= timeout) reject(new Error('legacy server did not start')); else setTimeout(ping, 200);
      });
    };
    ping();
  });
}

const legacy = spawn(process.execPath, ['addon_v641_legacy.js'], {
  env: { ...process.env, PORT: String(LEGACY_PORT) },
  stdio: ['ignore', 'inherit', 'inherit']
});
let stopping = false;
legacy.on('exit', (code, signal) => {
  console.error(`[iptv-front] legacy exited code=${code} signal=${signal}`);
  if (!stopping) process.exit(code || 1);
});
function stop(sig) {
  if (stopping) return;
  stopping = true;
  legacy.kill('SIGTERM');
  setTimeout(() => process.exit(0), 1000).unref();
}
process.on('SIGTERM', () => stop('SIGTERM'));
process.on('SIGINT', () => stop('SIGINT'));

waitForPort(LEGACY_PORT).then(() => {
  const server = http.createServer((req, res) => {
    let pathname = '/';
    try { pathname = new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname; } catch {}
    if (pathname === '/iptv' || pathname.startsWith('/iptv/')) return handleIptv(req, res, pathname);
    return proxyLegacy(req, res);
  });
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[iptv-front] READY port=${PORT} legacy=${LEGACY_PORT}`);
    console.log('[iptv-front] MANIFEST /iptv/manifest.json');
  });
}).catch(e => {
  console.error('[iptv-front] STARTUP FAILED:', e.message);
  legacy.kill('SIGTERM');
  process.exit(1);
});
