'use strict';

const http = require('node:http');
const net = require('node:net');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');

const PORT = Number(process.env.PORT || 7000);
const LEGACY_PORT = Number(process.env.LEGACY_PORT || 7001);
const PLAYLIST_URL = String(process.env.IPTV_M3U_URL || 'https://iptv-org.github.io/iptv/index.m3u').trim();
const CACHE_MS = Math.max(60_000, Number(process.env.IPTV_CACHE_SECONDS || 900) * 1000);
const PAGE_SIZE = Math.max(20, Math.min(250, Number(process.env.IPTV_PAGE_SIZE || 100)));

let cache = { at: 0, channels: [], byId: new Map() };

function sendJson(res, status, body, cacheSeconds = 0) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(data),
    'access-control-allow-origin': '*',
    'access-control-allow-headers': '*',
    'access-control-allow-methods': 'GET,HEAD,OPTIONS',
    'cache-control': cacheSeconds ? `public, max-age=${cacheSeconds}` : 'no-store',
    'x-web-phim-router': 'iptv-v1'
  });
  if (res.req?.method === 'HEAD') return res.end();
  res.end(data);
}

function manifest() {
  return {
    id: 'vn.webphim.iptvorg',
    version: '1.0.0',
    name: 'IPTV-org Live TV',
    description: 'Kênh truyền hình trực tiếp từ playlist công khai IPTV-org',
    resources: [
      'catalog',
      { name: 'meta', types: ['movie'], idPrefixes: ['iptv:'] },
      { name: 'stream', types: ['movie'], idPrefixes: ['iptv:'] }
    ],
    types: ['movie'],
    catalogs: [
      {
        type: 'movie',
        id: 'iptvorg',
        name: 'IPTV-org • Live TV',
        extra: [
          { name: 'search', isRequired: false },
          { name: 'skip', isRequired: false }
        ]
      }
    ],
    behaviorHints: { configurable: false, configurationRequired: false, adult: false, p2p: false }
  };
}

function decodeEntities(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function attr(line, name) {
  const m = String(line).match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`, 'i'));
  return m ? decodeEntities(m[1].trim()) : '';
}

function makeId(name, url) {
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
      const fallbackName = comma >= 0 ? line.slice(comma + 1).trim() : '';
      pending = {
        name: decodeEntities(attr(line, 'tvg-name') || fallbackName || 'Live TV'),
        logo: attr(line, 'tvg-logo'),
        group: attr(line, 'group-title'),
        tvgId: attr(line, 'tvg-id'),
        country: attr(line, 'tvg-country') || attr(line, 'country'),
        url: ''
      };
      continue;
    }
    if (line.startsWith('#')) continue;
    if (pending && /^https?:\/\//i.test(line)) {
      pending.url = line;
      pending.id = makeId(pending.name, pending.url);
      channels.push(pending);
      pending = null;
    }
  }
  return channels;
}

async function loadChannels() {
  const now = Date.now();
  if (cache.channels.length && now - cache.at < CACHE_MS) return cache;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const response = await fetch(PLAYLIST_URL, {
      headers: {
        accept: 'application/x-mpegURL, audio/x-mpegurl, text/plain, */*',
        'user-agent': 'Mozilla/5.0 (compatible; WebPhim-IPTV/1.0)'
      },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`playlist HTTP ${response.status}`);
    const channels = parseM3u(await response.text());
    if (!channels.length) throw new Error('playlist parsed 0 channels');
    const byId = new Map(channels.map(channel => [channel.id, channel]));
    cache = { at: now, channels, byId };
    console.log(`[iptv-router] loaded ${channels.length} channels`);
    return cache;
  } finally {
    clearTimeout(timer);
  }
}

function preview(channel) {
  const meta = {
    id: channel.id,
    type: 'movie',
    name: channel.name,
    description: [channel.group, channel.country, channel.tvgId].filter(Boolean).join(' • ') || 'Live TV',
    releaseInfo: 'LIVE',
    behaviorHints: { defaultVideoId: channel.id }
  };
  if (/^https?:\/\//i.test(channel.logo || '')) {
    meta.poster = channel.logo;
    meta.logo = channel.logo;
    meta.posterShape = 'square';
  }
  return meta;
}

function parseExtra(raw) {
  const out = { search: '', skip: 0 };
  if (!raw) return out;
  let decoded = raw;
  try { decoded = decodeURIComponent(raw); } catch {}
  const params = new URLSearchParams(decoded);
  out.search = String(params.get('search') || '').trim().toLowerCase();
  out.skip = Math.max(0, Number(params.get('skip') || 0) || 0);
  return out;
}

async function handleIptv(req, res, pathname) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': 'GET,HEAD,OPTIONS'
    });
    res.end();
    return;
  }
  if (!['GET', 'HEAD'].includes(req.method)) return sendJson(res, 405, { error: 'Method not allowed' });

  if (pathname === '/iptv/manifest.json') return sendJson(res, 200, manifest(), 60);
  if (pathname === '/iptv' || pathname === '/iptv/') {
    return sendJson(res, 200, { name: 'IPTV-org Live TV', manifest: '/iptv/manifest.json' }, 0);
  }

  let m = pathname.match(/^\/iptv\/catalog\/movie\/iptvorg(?:\/([^/]+))?\.json$/);
  if (m) {
    try {
      const loaded = await loadChannels();
      const extra = parseExtra(m[1] || '');
      let channels = loaded.channels;
      if (extra.search) {
        channels = channels.filter(c => `${c.name} ${c.group} ${c.country} ${c.tvgId}`.toLowerCase().includes(extra.search));
      }
      return sendJson(res, 200, { metas: channels.slice(extra.skip, extra.skip + PAGE_SIZE).map(preview) }, 60);
    } catch (error) {
      console.error('[iptv-router] catalog:', error.message);
      return sendJson(res, 200, { metas: [] }, 0);
    }
  }

  m = pathname.match(/^\/iptv\/meta\/movie\/(iptv:[a-f0-9]{20})\.json$/i);
  if (m) {
    try {
      const loaded = await loadChannels();
      const channel = loaded.byId.get(m[1]);
      return sendJson(res, 200, { meta: channel ? preview(channel) : null }, 60);
    } catch (error) {
      console.error('[iptv-router] meta:', error.message);
      return sendJson(res, 200, { meta: null }, 0);
    }
  }

  m = pathname.match(/^\/iptv\/stream\/movie\/(iptv:[a-f0-9]{20})\.json$/i);
  if (m) {
    try {
      const loaded = await loadChannels();
      const channel = loaded.byId.get(m[1]);
      if (!channel) return sendJson(res, 200, { streams: [] }, 0);
      return sendJson(res, 200, {
        streams: [{
          name: 'IPTV-org',
          title: channel.name,
          url: channel.url,
          behaviorHints: { notWebReady: false }
        }]
      }, 0);
    } catch (error) {
      console.error('[iptv-router] stream:', error.message);
      return sendJson(res, 200, { streams: [] }, 0);
    }
  }

  return sendJson(res, 404, { error: 'IPTV route not found' }, 0);
}

function proxyLegacy(req, res) {
  const headers = { ...req.headers, host: req.headers.host || `127.0.0.1:${LEGACY_PORT}` };
  const upstream = http.request({
    hostname: '127.0.0.1',
    port: LEGACY_PORT,
    method: req.method,
    path: req.url,
    headers
  }, upstreamRes => {
    res.writeHead(upstreamRes.statusCode || 502, upstreamRes.headers);
    upstreamRes.pipe(res);
  });
  upstream.on('error', error => {
    console.error('[iptv-router] legacy proxy:', error.message);
    if (!res.headersSent) sendJson(res, 502, { error: 'Legacy addon unavailable' }, 0);
    else res.end();
  });
  req.pipe(upstream);
}

function waitForPort(port, timeoutMs = 20_000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = net.createConnection({ host: '127.0.0.1', port });
      socket.once('connect', () => { socket.destroy(); resolve(); });
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() - started >= timeoutMs) reject(new Error(`legacy port ${port} did not open`));
        else setTimeout(attempt, 200);
      });
    };
    attempt();
  });
}

const legacy = spawn(process.execPath, ['addon_v641.js'], {
  env: { ...process.env, PORT: String(LEGACY_PORT) },
  stdio: ['ignore', 'inherit', 'inherit']
});

legacy.on('exit', (code, signal) => {
  console.error(`[iptv-router] legacy exited code=${code} signal=${signal}`);
  if (!shuttingDown) process.exit(code || 1);
});

let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[iptv-router] ${signal}, stopping`);
  legacy.kill('SIGTERM');
  setTimeout(() => process.exit(0), 1000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

waitForPort(LEGACY_PORT).then(() => {
  const server = http.createServer((req, res) => {
    let pathname = '/';
    try { pathname = new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname; } catch {}
    if (pathname === '/iptv' || pathname.startsWith('/iptv/')) return handleIptv(req, res, pathname);
    return proxyLegacy(req, res);
  });
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[iptv-router] listening on ${PORT}; legacy on ${LEGACY_PORT}`);
    console.log('[iptv-router] manifest: /iptv/manifest.json');
  });
}).catch(error => {
  console.error('[iptv-router] startup failed:', error.message);
  legacy.kill('SIGTERM');
  process.exit(1);
});
