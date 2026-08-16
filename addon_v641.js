'use strict';

// IPTV interceptor for Nuvio/Stremio. Existing Web Phim v6.4.1 routes remain untouched.
const http = require('node:http');
const crypto = require('node:crypto');

const originalCreateServer = http.createServer;
const IPTV_ROOT = String(process.env.IPTV_M3U_ROOT || 'https://iptv-org.github.io/iptv').replace(/\/$/, '');
const CACHE_MS = Math.max(60_000, Number(process.env.IPTV_CACHE_SECONDS || 900) * 1000);
const PAGE_SIZE = Math.max(20, Math.min(250, Number(process.env.IPTV_PAGE_SIZE || 100)));

const IPTV_CATEGORIES = Object.freeze([
  { id: 'all', label: '📺 IPTV • Tất cả', file: 'index.m3u' },
  { id: 'news', label: '📰 IPTV • Tin tức', file: 'categories/news.m3u' },
  { id: 'sports', label: '⚽ IPTV • Thể thao', file: 'categories/sports.m3u' },
  { id: 'movies', label: '🎬 IPTV • Phim', file: 'categories/movies.m3u' },
  { id: 'entertainment', label: '🎭 IPTV • Giải trí', file: 'categories/entertainment.m3u' },
  { id: 'music', label: '🎵 IPTV • Âm nhạc', file: 'categories/music.m3u' },
  { id: 'kids', label: '🧒 IPTV • Trẻ em', file: 'categories/kids.m3u' },
  { id: 'animation', label: '🎨 IPTV • Hoạt hình', file: 'categories/animation.m3u' },
  { id: 'documentary', label: '🌍 IPTV • Tài liệu', file: 'categories/documentary.m3u' },
  { id: 'education', label: '🎓 IPTV • Giáo dục', file: 'categories/education.m3u' },
  { id: 'cooking', label: '🍳 IPTV • Ẩm thực', file: 'categories/cooking.m3u' },
  { id: 'lifestyle', label: '🏡 IPTV • Đời sống', file: 'categories/lifestyle.m3u' },
  { id: 'comedy', label: '😂 IPTV • Hài', file: 'categories/comedy.m3u' },
  { id: 'travel', label: '✈️ IPTV • Du lịch', file: 'categories/travel.m3u' },
  { id: 'business', label: '💼 IPTV • Kinh doanh', file: 'categories/business.m3u' },
  { id: 'science', label: '🔬 IPTV • Khoa học', file: 'categories/science.m3u' },
  { id: 'family', label: '👨‍👩‍👧 IPTV • Gia đình', file: 'categories/family.m3u' },
  { id: 'series', label: '📺 IPTV • Series', file: 'categories/series.m3u' },
  { id: 'general', label: '🌐 IPTV • Tổng hợp', file: 'categories/general.m3u' }
]);
const CATEGORY_BY_ID = new Map(IPTV_CATEGORIES.map(x => [x.id, x]));
const playlistCache = new Map();

function sendJson(req, res, status, body, maxAge = 0) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(data),
    'access-control-allow-origin': '*',
    'access-control-allow-headers': '*',
    'access-control-allow-methods': 'GET,HEAD,OPTIONS',
    'cache-control': maxAge ? `public, max-age=${maxAge}` : 'no-store',
    'x-web-phim-iptv': 'intercept-v2'
  });
  if (req.method === 'HEAD') return res.end();
  res.end(data);
}

function manifest() {
  const extra = [
    { name: 'search', isRequired: false },
    { name: 'skip', isRequired: false }
  ];
  return {
    id: 'vn.webphim.iptvorg',
    version: '1.3.0',
    name: 'IPTV-org Live TV',
    description: 'Live TV IPTV-org • phân theo thể loại • hỗ trợ header stream cho Nuvio',
    resources: [
      'catalog',
      { name: 'meta', types: ['movie'], idPrefixes: ['iptv:'] },
      { name: 'stream', types: ['movie'], idPrefixes: ['iptv:'] }
    ],
    types: ['movie'],
    idPrefixes: ['iptv:'],
    catalogs: IPTV_CATEGORIES.map(category => ({
      type: 'movie',
      id: `iptv-${category.id}`,
      name: category.label,
      extra
    })),
    behaviorHints: { configurable: false, configurationRequired: false, adult: false, p2p: false }
  };
}

function decodeEntities(s) {
  return String(s || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function attr(line, name) {
  const m = String(line || '').match(new RegExp('(?:^|\\s)' + name + '="([^"]*)"', 'i'));
  return m ? decodeEntities(m[1].trim()) : '';
}

function safeDecode(value) {
  try { return decodeURIComponent(String(value || '')); }
  catch { return String(value || ''); }
}

function streamHash(name, url) {
  return crypto.createHash('sha1').update(String(name) + '\n' + String(url)).digest('hex').slice(0, 20);
}

function makeChannelId(categoryId, channel) {
  return `iptv:${categoryId}:${streamHash(channel.name, channel.url)}`;
}

function parseChannelId(id) {
  const value = safeDecode(id);
  let m = value.match(/^iptv:([a-z0-9_-]+):([a-f0-9]{20})$/i);
  if (m) return { categoryId: m[1].toLowerCase(), hash: m[2].toLowerCase(), raw: value };
  // Backward compatibility with v1.0-v1.2 cached catalog IDs.
  m = value.match(/^iptv:([a-f0-9]{20})$/i);
  if (m) return { categoryId: 'all', hash: m[1].toLowerCase(), raw: value };
  return null;
}

function normalizeHeaderName(name) {
  const n = String(name || '').trim().toLowerCase();
  if (n === 'user-agent' || n === 'http-user-agent') return 'User-Agent';
  if (n === 'referer' || n === 'referrer' || n === 'http-referrer' || n === 'http-referer') return 'Referer';
  if (n === 'origin' || n === 'http-origin') return 'Origin';
  if (n === 'cookie') return 'Cookie';
  return String(name || '').trim();
}

function setHeader(headers, name, value) {
  const key = normalizeHeaderName(name);
  const val = safeDecode(String(value || '').trim());
  if (key && val) headers[key] = val;
}

function parseHeaderParams(raw, headers) {
  const text = String(raw || '').trim().replace(/^\?/, '');
  if (!text) return;
  for (const part of text.split('&')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    setHeader(headers, safeDecode(part.slice(0, idx)), safeDecode(part.slice(idx + 1)));
  }
}

function splitUrlHeaders(rawUrl, headers) {
  const raw = String(rawUrl || '').trim();
  const pipe = raw.indexOf('|');
  if (pipe < 0) return raw;
  parseHeaderParams(raw.slice(pipe + 1), headers);
  return raw.slice(0, pipe).trim();
}

function parseM3u(text, categoryId) {
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  const out = [];
  let pending = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      const comma = line.indexOf(',');
      const headers = {};
      setHeader(headers, 'User-Agent', attr(line, 'http-user-agent') || attr(line, 'user-agent'));
      setHeader(headers, 'Referer', attr(line, 'http-referrer') || attr(line, 'http-referer') || attr(line, 'referrer'));
      setHeader(headers, 'Origin', attr(line, 'http-origin') || attr(line, 'origin'));
      pending = {
        name: decodeEntities(attr(line, 'tvg-name') || (comma >= 0 ? line.slice(comma + 1).trim() : '') || 'Live TV'),
        logo: attr(line, 'tvg-logo'),
        group: attr(line, 'group-title'),
        country: attr(line, 'tvg-country') || attr(line, 'country'),
        tvgId: attr(line, 'tvg-id'),
        headers,
        url: ''
      };
      continue;
    }

    if (!pending) continue;

    if (/^#EXTVLCOPT:http-user-agent=/i.test(line)) {
      setHeader(pending.headers, 'User-Agent', line.split('=').slice(1).join('='));
      continue;
    }
    if (/^#EXTVLCOPT:http-(?:referrer|referer)=/i.test(line)) {
      setHeader(pending.headers, 'Referer', line.split('=').slice(1).join('='));
      continue;
    }
    if (/^#EXTVLCOPT:http-origin=/i.test(line)) {
      setHeader(pending.headers, 'Origin', line.split('=').slice(1).join('='));
      continue;
    }
    if (/^#EXTHTTP:/i.test(line)) {
      try {
        const obj = JSON.parse(line.slice(line.indexOf(':') + 1));
        for (const [k, v] of Object.entries(obj || {})) setHeader(pending.headers, k, v);
      } catch {}
      continue;
    }
    if (/^#KODIPROP:inputstream\.adaptive\.stream_headers=/i.test(line)) {
      parseHeaderParams(line.split('=').slice(1).join('='), pending.headers);
      continue;
    }
    if (line.startsWith('#')) continue;

    if (/^https?:\/\//i.test(line)) {
      pending.url = splitUrlHeaders(line, pending.headers);
      if (pending.url) {
        pending.hash = streamHash(pending.name, pending.url);
        pending.id = makeChannelId(categoryId, pending);
        out.push(pending);
      }
      pending = null;
    }
  }
  return out;
}

function playlistUrl(categoryId) {
  const category = CATEGORY_BY_ID.get(categoryId) || CATEGORY_BY_ID.get('all');
  return `${IPTV_ROOT}/${category.file}`;
}

async function loadCategory(categoryId) {
  const id = CATEGORY_BY_ID.has(categoryId) ? categoryId : 'all';
  const now = Date.now();
  const cached = playlistCache.get(id);
  if (cached && cached.channels.length && now - cached.at < CACHE_MS) return cached;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const response = await fetch(playlistUrl(id), {
      headers: {
        'user-agent': 'WebPhim-IPTV/1.3',
        accept: 'application/x-mpegURL, audio/x-mpegurl, text/plain, */*'
      },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`playlist ${id} HTTP ${response.status}`);
    const channels = parseM3u(await response.text(), id);
    if (!channels.length) throw new Error(`playlist ${id} parsed 0 channels`);
    const value = {
      at: now,
      channels,
      byHash: new Map(channels.map(channel => [channel.hash, channel]))
    };
    playlistCache.set(id, value);
    console.log(`[iptv-intercept] loaded ${id}: ${channels.length} channels`);
    return value;
  } finally {
    clearTimeout(timer);
  }
}

function categoryLabel(categoryId) {
  return CATEGORY_BY_ID.get(categoryId)?.label.replace(/^\S+\s+IPTV\s+•\s+/, '') || 'Live TV';
}

function preview(channel, categoryId) {
  const meta = {
    id: channel.id,
    type: 'movie',
    name: channel.name,
    description: [categoryLabel(categoryId), channel.group, channel.country, channel.tvgId].filter(Boolean).join(' • ') || 'Live TV',
    releaseInfo: 'LIVE',
    genres: [categoryLabel(categoryId)],
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
  const value = safeDecode(raw);
  const params = new URLSearchParams(value);
  out.search = String(params.get('search') || '').trim().toLowerCase();
  out.skip = Math.max(0, Number(params.get('skip') || 0) || 0);
  return out;
}

async function findChannelByParsedId(parsed) {
  if (!parsed) return null;
  const data = await loadCategory(parsed.categoryId);
  let channel = data.byHash.get(parsed.hash) || null;
  if (channel) return { channel, categoryId: parsed.categoryId };

  if (parsed.categoryId !== 'all') {
    const all = await loadCategory('all');
    channel = all.byHash.get(parsed.hash) || null;
    if (channel) return { channel, categoryId: 'all' };
  }
  return null;
}

function streamFor(channel) {
  const stream = {
    name: 'IPTV-org',
    title: channel.name,
    url: channel.url,
    behaviorHints: { notWebReady: false }
  };
  if (/\.m3u8(?:$|\?)/i.test(channel.url)) stream.type = 'hls';
  const headers = channel.headers && Object.keys(channel.headers).length ? channel.headers : null;
  if (headers) {
    stream.behaviorHints.proxyHeaders = { request: headers };
    stream.behaviorHints.notWebReady = true;
  }
  return stream;
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

  if (pathname === '/iptv/manifest.json') return sendJson(req, res, 200, manifest(), 30);
  if (pathname === '/iptv' || pathname === '/iptv/') return sendJson(req, res, 200, { manifest: '/iptv/manifest.json', version: '1.3.0' });

  let m = pathname.match(/^\/iptv\/catalog\/movie\/([^/.]+)(?:\/([^/]+))?\.json$/i);
  if (m) {
    const catalogId = safeDecode(m[1]);
    const categoryId = catalogId.startsWith('iptv-') ? catalogId.slice(5).toLowerCase() : '';
    if (!CATEGORY_BY_ID.has(categoryId)) return sendJson(req, res, 200, { metas: [] }, 10);
    try {
      const data = await loadCategory(categoryId);
      const extra = parseExtra(m[2] || '');
      let channels = data.channels;
      if (extra.search) {
        channels = channels.filter(c => `${c.name} ${c.group} ${c.country} ${c.tvgId}`.toLowerCase().includes(extra.search));
      }
      return sendJson(req, res, 200, { metas: channels.slice(extra.skip, extra.skip + PAGE_SIZE).map(c => preview(c, categoryId)) }, 30);
    } catch (e) {
      console.error('[iptv-intercept] catalog:', e.message);
      return sendJson(req, res, 200, { metas: [] });
    }
  }

  m = pathname.match(/^\/iptv\/meta\/movie\/(.+)\.json$/i);
  if (m) {
    try {
      const parsed = parseChannelId(m[1]);
      const found = await findChannelByParsedId(parsed);
      return sendJson(req, res, 200, { meta: found ? preview(found.channel, found.categoryId) : null }, 30);
    } catch (e) {
      console.error('[iptv-intercept] meta:', e.message);
      return sendJson(req, res, 200, { meta: null });
    }
  }

  m = pathname.match(/^\/iptv\/stream\/movie\/(.+)\.json$/i);
  if (m) {
    try {
      const parsed = parseChannelId(m[1]);
      const found = await findChannelByParsedId(parsed);
      if (!found) return sendJson(req, res, 200, { streams: [] });
      return sendJson(req, res, 200, { streams: [streamFor(found.channel)] });
    } catch (e) {
      console.error('[iptv-intercept] stream:', e.message);
      return sendJson(req, res, 200, { streams: [] });
    }
  }

  return sendJson(req, res, 404, { error: 'IPTV route not found' });
}

http.createServer = function patchedCreateServer(...args) {
  if (typeof args[0] !== 'function') return originalCreateServer.apply(http, args);
  const legacyHandler = args[0];
  args[0] = function wrappedRequest(req, res) {
    let pathname = '/';
    try { pathname = new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname; } catch {}
    if (pathname === '/iptv' || pathname.startsWith('/iptv/')) {
      Promise.resolve(handleIptv(req, res, pathname)).catch(err => {
        console.error('[iptv-intercept] unhandled:', err);
        if (!res.headersSent) sendJson(req, res, 500, { error: 'IPTV internal error' });
        else res.end();
      });
      return;
    }
    return legacyHandler(req, res);
  };
  return originalCreateServer.apply(http, args);
};

console.log('[iptv-intercept] v1.3 enabled: encoded IDs + categories + proxyHeaders');
require('./addon_v641_legacy');
