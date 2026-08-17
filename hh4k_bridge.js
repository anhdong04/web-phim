'use strict';

const http = require('node:http');
const { HH4KProvider } = require('./hh4k_provider');

const originalCreateServer = http.createServer;
const PAGE_SIZE = Math.max(10, Math.min(50, Number(process.env.HH4K_PAGE_SIZE || 20)));
const provider = new HH4KProvider({ mainUrl: process.env.HH4K_MAIN_URL, timeoutMs: process.env.HH4K_TIMEOUT_MS, cacheTtlMs: process.env.HH4K_CACHE_TTL_MS });

function safeDecode(value) { try { return decodeURIComponent(String(value || '')); } catch { return String(value || ''); } }
function enc(value) { return Buffer.from(String(value || ''), 'utf8').toString('base64url'); }
function dec(value) { try { return Buffer.from(String(value || ''), 'base64url').toString('utf8'); } catch { return ''; } }
function idForDetail(detailUrl) { return `hh4k:${enc(detailUrl)}`; }
function parseId(raw) {
  const id = safeDecode(raw);
  let m = id.match(/^hh4k:([A-Za-z0-9_-]+)$/);
  if (m) return { id, detailUrl: dec(m[1]), detailKey: m[1], episodeIndex: null };
  m = id.match(/^hh4k:([A-Za-z0-9_-]+):r1:(\d+)$/);
  if (m) return { id, detailUrl: dec(m[1]), detailKey: m[1], episodeIndex: Number(m[2]) };
  return null;
}
function parseExtra(raw = '') {
  const out = { search: '', skip: 0 };
  if (!raw) return out;
  const params = new URLSearchParams(safeDecode(raw));
  out.search = String(params.get('search') || '').trim();
  out.skip = Math.max(0, Number(params.get('skip') || 0) || 0);
  return out;
}
function sendJson(req, res, status, body, maxAge = 0) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(data),
    'access-control-allow-origin': '*',
    'access-control-allow-headers': '*',
    'access-control-allow-methods': 'GET,HEAD,OPTIONS',
    'cache-control': maxAge ? `public, max-age=${maxAge}` : 'no-store',
    'x-web-phim-hh4k': 'bridge-v2'
  });
  if (req.method === 'HEAD') return res.end();
  res.end(data);
}
function manifest() {
  return {
    id: 'vn.webphim.hh4k.v2', version: '1.1.0', name: '🐉 HH4K',
    description: 'HH4K • nguồn PhimHHTQ • catalog, metadata, episode và Halim streams',
    resources: ['catalog', { name: 'meta', types: ['series'], idPrefixes: ['hh4k:'] }, { name: 'stream', types: ['series'], idPrefixes: ['hh4k:'] }],
    types: ['series'], idPrefixes: ['hh4k:'],
    catalogs: [{ type: 'series', id: 'hh4k', name: '🐉 HH4K - Mới cập nhật', extra: [{ name: 'search', isRequired: false }, { name: 'skip', isRequired: false }] }],
    behaviorHints: { configurable: false, configurationRequired: false, adult: false, p2p: false }
  };
}
function preview(item) {
  const description = ['🐉 HH4K', item.episodeLabel, item.qualityLabel].filter(Boolean).join(' • ');
  const meta = { id: idForDetail(item.detailUrl), type: 'series', name: item.title, description: description || 'Nguồn PhimHHTQ' };
  if (item.posterUrl) { meta.poster = item.posterUrl; meta.background = item.posterUrl; }
  return meta;
}
async function catalog(extra) {
  const search = String(extra.search || '').trim(), skip = Math.max(0, Number(extra.skip || 0));
  if (search) return (await provider.search(search)).slice(skip, skip + PAGE_SIZE).map(preview);
  const pageNo = Math.floor(skip / PAGE_SIZE) + 1;
  const page = await provider.fetchCategoryPage('moi-cap-nhat', pageNo);
  const offset = skip % PAGE_SIZE;
  return page.items.slice(offset, offset + PAGE_SIZE).map(preview);
}
async function metaFor(id) {
  const parsed = parseId(id); if (!parsed || !/^https?:\/\//i.test(parsed.detailUrl)) return null;
  const detail = await provider.loadDetail(parsed.detailUrl);
  const videos = (detail.episodes || []).map((ep, index) => ({ id: `hh4k:${parsed.detailKey}:r1:${index}`, title: [ep.name, ep.serverName].filter(Boolean).join(' • '), season: 1, episode: Number.isFinite(ep.number) ? ep.number : index + 1 }));
  const poster = detail.posterUrl || null;
  return { id: `hh4k:${parsed.detailKey}`, type: 'series', name: detail.title, poster, background: detail.bannerUrl || poster, description: detail.overview || 'Nguồn PhimHHTQ', releaseInfo: detail.year ? String(detail.year) : undefined, genres: detail.genres || ['Hoạt hình Trung Quốc'], videos, behaviorHints: videos.length ? { defaultVideoId: videos[0].id } : undefined };
}
function streamObject(link, title) {
  const fmt = link.isM3u8 ? 'HLS' : 'MP4';
  return { name: '🐉 HH4K', title: [link.serverName, fmt, title].filter(Boolean).join(' • '), url: link.url, behaviorHints: { notWebReady: true, proxyHeaders: { request: link.headers || {} }, bingeGroup: 'webphim-hh4k-r2' } };
}
async function streamsFor(id) {
  const parsed = parseId(id); if (!parsed || parsed.episodeIndex == null || !/^https?:\/\//i.test(parsed.detailUrl)) return [];
  const detail = await provider.loadDetail(parsed.detailUrl), ep = (detail.episodes || [])[parsed.episodeIndex];
  if (!ep?.watchUrl) return [];
  return (await provider.resolveStreamLinks(ep.watchUrl)).slice(0, 8).map(link => streamObject(link, detail.title));
}
async function handleHh4k(req, res, pathname) {
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,HEAD,OPTIONS' }); return res.end(); }
  if (req.method !== 'GET' && req.method !== 'HEAD') return sendJson(req, res, 405, { error: 'Method not allowed' });
  if (pathname === '/hh4k' || pathname === '/hh4k/') return sendJson(req, res, 200, { addon: 'HH4K', manifest: '/hh4k/manifest.json', version: '1.1.0' });
  if (pathname === '/hh4k/manifest.json') return sendJson(req, res, 200, manifest(), 30);
  if (pathname === '/hh4k/diag') {
    const started = Date.now();
    try {
      const baseUrl = provider.getBaseUrl();
      const page = await provider.fetchCategoryPage('moi-cap-nhat', 1);
      return sendJson(req, res, 200, { ok: true, version: '1.1.0', baseUrl, elapsedMs: Date.now() - started, itemCount: page.items.length, sample: page.items.slice(0, 5).map(x => ({ title: x.title, poster: Boolean(x.posterUrl), episode: x.episodeLabel })) });
    } catch (e) {
      return sendJson(req, res, 200, { ok: false, version: '1.1.0', elapsedMs: Date.now() - started, error: String(e?.message || e).slice(0, 500) });
    }
  }
  let m = pathname.match(/^\/hh4k\/catalog\/series\/hh4k(?:\/([^/]+))?\.json$/i);
  if (m) { try { return sendJson(req, res, 200, { metas: await catalog(parseExtra(m[1] || '')) }, 30); } catch (e) { console.error('[hh4k] catalog:', e.message); return sendJson(req, res, 200, { metas: [] }); } }
  m = pathname.match(/^\/hh4k\/meta\/series\/(.+)\.json$/i);
  if (m) { try { return sendJson(req, res, 200, { meta: await metaFor(m[1]) }, 120); } catch (e) { console.error('[hh4k] meta:', e.message); return sendJson(req, res, 200, { meta: null }); } }
  m = pathname.match(/^\/hh4k\/stream\/series\/(.+)\.json$/i);
  if (m) { try { return sendJson(req, res, 200, { streams: await streamsFor(m[1]) }); } catch (e) { console.error('[hh4k] stream:', e.message); return sendJson(req, res, 200, { streams: [] }); } }
  return sendJson(req, res, 404, { error: 'HH4K route not found' });
}

http.createServer = function patchedCreateServer(...args) {
  if (typeof args[0] !== 'function') return originalCreateServer.apply(http, args);
  const downstream = args[0];
  args[0] = function wrappedRequest(req, res) {
    let pathname = '/';
    try { pathname = new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname; } catch {}
    if (pathname === '/hh4k' || pathname.startsWith('/hh4k/')) {
      Promise.resolve(handleHh4k(req, res, pathname)).catch(err => { console.error('[hh4k] unhandled:', err); if (!res.headersSent) sendJson(req, res, 500, { error: 'HH4K internal error' }); else res.end(); });
      return;
    }
    return downstream(req, res);
  };
  return originalCreateServer.apply(http, args);
};

console.log('[hh4k] bridge v2 enabled at /hh4k/* using PhimHHTQ source');
module.exports = { manifest, handleHh4k, parseId, idForDetail, catalog, metaFor, streamsFor };
