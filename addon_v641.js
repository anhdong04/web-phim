'use strict';

// Keep the existing v6.4.1 addon server intact, but intercept /iptv/*
// before the legacy request handler can fall through to its 404 response.
const http = require('node:http');
const crypto = require('node:crypto');

const originalCreateServer = http.createServer;
const PLAYLIST_URL = String(process.env.IPTV_M3U_URL || 'https://iptv-org.github.io/iptv/index.m3u').trim();
const CACHE_MS = Math.max(60_000, Number(process.env.IPTV_CACHE_SECONDS || 900) * 1000);
const PAGE_SIZE = Math.max(20, Math.min(250, Number(process.env.IPTV_PAGE_SIZE || 100)));
let iptvCache = { at: 0, channels: [], byId: new Map() };

function sendJson(req, res, status, body, maxAge = 0) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(data),
    'access-control-allow-origin': '*',
    'access-control-allow-headers': '*',
    'access-control-allow-methods': 'GET,HEAD,OPTIONS',
    'cache-control': maxAge ? `public, max-age=${maxAge}` : 'no-store',
    'x-web-phim-iptv': 'intercept-v1'
  });
  if (req.method === 'HEAD') return res.end();
  res.end(data);
}

function manifest() {
  return {
    id: 'vn.webphim.iptvorg',
    version: '1.2.0',
    name: 'IPTV-org Live TV',
    description: 'Live TV từ playlist IPTV-org',
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

function entity(s) {
  return String(s || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function attr(line, name) {
  const m = String(line || '').match(new RegExp('(?:^|\\s)' + name + '="([^"]*)"', 'i'));
  return m ? entity(m[1].trim()) : '';
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
        name: entity(attr(line, 'tvg-name') || (comma >= 0 ? line.slice(comma + 1).trim() : '') || 'Live TV'),
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

async function getChannels() {
  const now = Date.now();
  if (iptvCache.channels.length && now - iptvCache.at < CACHE_MS) return iptvCache;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const r = await fetch(PLAYLIST_URL, {
      headers: {
        accept: 'application/x-mpegURL,audio/x-mpegurl,text/plain,*/*',
        'user-agent': 'WebPhim-IPTV/1.2'
      },
      signal: controller.signal
    });
    if (!r.ok) throw new Error('playlist HTTP ' + r.status);
    const channels = parseM3u(await r.text());
    if (!channels.length) throw new Error('playlist parsed 0 channels');
    iptvCache = { at: now, channels, byId: new Map(channels.map(c => [c.id, c])) };
    console.log('[iptv-intercept] loaded ' + channels.length + ' channels');
    return iptvCache;
  } finally {
    clearTimeout(timer);
  }
}

function preview(c) {
  const meta = {
    id: c.id,
    type: 'movie',
    name: c.name,
    description: [c.group, c.country, c.tvgId].filter(Boolean).join(' • ') || 'Live TV',
    releaseInfo: 'LIVE',
    behaviorHints: { defaultVideoId: c.id }
  };
  if (/^https?:\/\//i.test(c.logo || '')) {
    meta.poster = c.logo;
    meta.logo = c.logo;
    meta.posterShape = 'square';
  }
  return meta;
}

function parseExtra(raw) {
  const out = { search: '', skip: 0 };
  if (!raw) return out;
  let value = raw;
  try { value = decodeURIComponent(raw); } catch {}
  const p = new URLSearchParams(value);
  out.search = String(p.get('search') || '').trim().toLowerCase();
  out.skip = Math.max(0, Number(p.get('skip') || 0) || 0);
  return out;
}

async function handleIptv(req, res, pathname) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': 'GET,HEAD,OPTIONS'
    });
    return res.end();
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return sendJson(req, res, 405, { error: 'Method not allowed' });

  if (pathname === '/iptv/manifest.json') return sendJson(req, res, 200, manifest(), 60);
  if (pathname === '/iptv' || pathname === '/iptv/') return sendJson(req, res, 200, { manifest: '/iptv/manifest.json', version: '1.2.0' });

  let m = pathname.match(/^\/iptv\/catalog\/movie\/iptvorg(?:\/([^/]+))?\.json$/);
  if (m) {
    try {
      const data = await getChannels();
      const extra = parseExtra(m[1] || '');
      let list = data.channels;
      if (extra.search) list = list.filter(c => `${c.name} ${c.group} ${c.country} ${c.tvgId}`.toLowerCase().includes(extra.search));
      return sendJson(req, res, 200, { metas: list.slice(extra.skip, extra.skip + PAGE_SIZE).map(preview) }, 60);
    } catch (e) {
      console.error('[iptv-intercept] catalog:', e.message);
      return sendJson(req, res, 200, { metas: [] });
    }
  }

  m = pathname.match(/^\/iptv\/meta\/movie\/(iptv:[a-f0-9]{20})\.json$/i);
  if (m) {
    try {
      const data = await getChannels();
      const c = data.byId.get(m[1]);
      return sendJson(req, res, 200, { meta: c ? preview(c) : null }, 60);
    } catch (e) {
      return sendJson(req, res, 200, { meta: null });
    }
  }

  m = pathname.match(/^\/iptv\/stream\/movie\/(iptv:[a-f0-9]{20})\.json$/i);
  if (m) {
    try {
      const data = await getChannels();
      const c = data.byId.get(m[1]);
      if (!c) return sendJson(req, res, 200, { streams: [] });
      return sendJson(req, res, 200, {
        streams: [{ name: 'IPTV-org', title: c.name, url: c.url, behaviorHints: { notWebReady: false } }]
      });
    } catch (e) {
      return sendJson(req, res, 200, { streams: [] });
    }
  }

  return sendJson(req, res, 404, { error: 'IPTV route not found' });
}

http.createServer = function patchedCreateServer(options, listener) {
  let opts = options;
  let legacyHandler = listener;
  if (typeof options === 'function') {
    legacyHandler = options;
    opts = undefined;
  }
  const wrapped = function wrappedRequest(req, res) {
    let pathname = '/';
    try { pathname = new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname; } catch {}
    if (pathname === '/iptv' || pathname.startsWith('/iptv/')) {
      Promise.resolve(handleIptv(req, res, pathname)).catch(err => {
        console.error('[iptv-intercept] request:', err.message);
        if (!res.headersSent) sendJson(req, res, 500, { error: 'IPTV internal error' });
        else res.end();
      });
      return;
    }
    return legacyHandler(req, res);
  };
  return opts === undefined
    ? originalCreateServer.call(http, wrapped)
    : originalCreateServer.call(http, opts, wrapped);
};

console.log('[iptv-intercept] enabled /iptv/* before legacy handler');
require('./addon_v641_legacy.js');
http.createServer = originalCreateServer;
