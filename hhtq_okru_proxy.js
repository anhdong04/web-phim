'use strict';

const crypto = require('node:crypto');
const http = require('node:http');
const { Readable } = require('node:stream');
const { HHTQProvider, DEFAULT_UA } = require('./hhtq_provider');
const { playerAaaaUrls } = require('./hhtq_exact_patch');

const previousStreams = HHTQProvider.prototype.streams;
const originalCreateServer = http.createServer;
const cache = new Map();
const PUBLIC_BASE = String(
  process.env.WEBPHIM_PUBLIC_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  'https://web-phim-zwsx.onrender.com'
).replace(/\/+$/, '');

function isAllowedOkcdnUrl(value) {
  try {
    const u = new URL(String(value || ''));
    return u.protocol === 'https:' && /(?:^|\.)okcdn\.ru$/i.test(u.hostname);
  } catch { return false; }
}

function cleanup() {
  const now = Date.now();
  for (const [token, row] of cache) if (!row || row.exp <= now) cache.delete(token);
  while (cache.size > 3000) cache.delete(cache.keys().next().value);
}

function extensionFor(url) {
  try {
    const ext = (new URL(url).pathname.match(/\.(m3u8|ts|m4s|mp4|aac|key|bin)$/i) || [])[1];
    return ext ? `.${ext.toLowerCase()}` : '';
  } catch { return ''; }
}

function registerOkRuUrl(url, referer = 'https://ok.ru/') {
  if (!isAllowedOkcdnUrl(url)) return '';
  cleanup();
  const token = crypto.randomBytes(18).toString('base64url');
  cache.set(token, {
    url: new URL(url).toString(),
    referer: String(referer || 'https://ok.ru/'),
    exp: Date.now() + 20 * 60_000
  });
  return `${PUBLIC_BASE}/hhtq/okru/${token}${extensionFor(url)}`;
}

function getRow(token) {
  cleanup();
  return cache.get(String(token || '')) || null;
}

function absolutize(value, base) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try { return new URL(raw, base).toString(); } catch { return ''; }
}

function rewriteOkRuPlaylist(body, baseUrl, referer) {
  return String(body || '').split(/\r?\n/).map(line => {
    if (!line) return line;
    if (line.startsWith('#')) {
      return line.replace(/URI="([^"]+)"/g, (_, uri) => {
        const absolute = absolutize(uri, baseUrl);
        const proxied = registerOkRuUrl(absolute, referer);
        return `URI="${proxied || absolute}"`;
      });
    }
    const absolute = absolutize(line, baseUrl);
    return registerOkRuUrl(absolute, referer) || absolute;
  }).join('\n');
}

function copyHeader(headers, name) {
  const value = headers.get(name);
  return value ? { [name]: value } : {};
}

function upstreamHeaders(row, req = null) {
  const headers = {
    'User-Agent': DEFAULT_UA,
    'Referer': row?.referer || 'https://ok.ru/',
    'Accept': '*/*'
  };
  if (req?.headers?.range) headers.Range = req.headers.range;
  return headers;
}

async function proxyOkRu(req, res, token) {
  const row = getRow(token);
  if (!row) {
    res.writeHead(410, { 'content-type':'text/plain; charset=utf-8', 'access-control-allow-origin':'*', 'cache-control':'no-store' });
    return res.end('Expired OK.ru proxy URL');
  }

  let upstream;
  try {
    upstream = await fetch(row.url, {
      method: req.method === 'HEAD' ? 'HEAD' : 'GET',
      headers: upstreamHeaders(row, req),
      redirect:'follow'
    });
  } catch (e) {
    res.writeHead(502, { 'content-type':'text/plain; charset=utf-8', 'access-control-allow-origin':'*', 'cache-control':'no-store' });
    return res.end(`OK.ru upstream error: ${String(e?.message || e).slice(0,160)}`);
  }

  const contentType = upstream.headers.get('content-type') || '';
  const isPlaylist = /mpegurl|m3u8/i.test(contentType) || /\.m3u8(?:$|[?#])/i.test(row.url);
  const common = {
    'access-control-allow-origin':'*',
    'access-control-allow-headers':'*',
    'access-control-expose-headers':'content-length,content-range,accept-ranges,content-type',
    'cache-control':'no-store',
    'x-web-phim-hhtq-okru-proxy':'1'
  };

  if (req.method === 'HEAD') {
    res.writeHead(upstream.status, {
      ...common,
      ...copyHeader(upstream.headers, 'content-type'),
      ...copyHeader(upstream.headers, 'accept-ranges'),
      ...copyHeader(upstream.headers, 'content-range'),
      ...copyHeader(upstream.headers, 'content-length')
    });
    return res.end();
  }

  if (isPlaylist) {
    const text = await upstream.text();
    const body = rewriteOkRuPlaylist(text, row.url, row.referer);
    res.writeHead(upstream.status, {
      ...common,
      'content-type':'application/vnd.apple.mpegurl; charset=utf-8',
      'content-length':Buffer.byteLength(body),
      'x-web-phim-hhtq-okru-proxy':'playlist'
    });
    return res.end(body);
  }

  res.writeHead(upstream.status, {
    ...common,
    ...copyHeader(upstream.headers, 'content-type'),
    ...copyHeader(upstream.headers, 'accept-ranges'),
    ...copyHeader(upstream.headers, 'content-range'),
    ...copyHeader(upstream.headers, 'content-length'),
    'x-web-phim-hhtq-okru-proxy':'media'
  });
  if (!upstream.body) return res.end();
  const stream = Readable.fromWeb(upstream.body);
  stream.on('error', () => { if (!res.writableEnded) res.destroy(); });
  stream.pipe(res);
}

function hostPath(value) {
  try {
    const u = new URL(String(value || ''));
    return { host:u.host, path:u.pathname, srcIp:u.searchParams.get('srcIp') || null, type:u.searchParams.get('type') || null };
  } catch { return { host:null, path:null, srcIp:null, type:null }; }
}

function firstPlaylistUri(text, base) {
  for (const line of String(text || '').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('#')) {
      const m = trimmed.match(/URI="([^"]+)"/);
      if (m) return absolutize(m[1], base);
      continue;
    }
    return absolutize(trimmed, base);
  }
  return '';
}

async function fetchProbe(url, referer, range = '') {
  const headers = { 'User-Agent':DEFAULT_UA, 'Referer':referer || 'https://ok.ru/', 'Accept':'*/*' };
  if (range) headers.Range = range;
  const r = await fetch(url, { headers, redirect:'follow' });
  const ct = r.headers.get('content-type') || '';
  const info = {
    status:r.status,
    contentType:ct,
    contentLength:r.headers.get('content-length') || null,
    contentRange:r.headers.get('content-range') || null,
    target:hostPath(r.url)
  };
  if (/mpegurl|m3u8|text\//i.test(ct) || /\.m3u8(?:$|[?#])/i.test(url)) {
    const text = await r.text();
    info.bytes = Buffer.byteLength(text);
    info.isExtm3u = /^#EXTM3U/m.test(text);
    info.firstUri = hostPath(firstPlaylistUri(text, r.url));
    info._firstUriRaw = firstPlaylistUri(text, r.url);
  } else {
    const ab = await r.arrayBuffer();
    info.bytes = ab.byteLength;
  }
  return info;
}

async function diagnoseOkRu185() {
  const provider = new HHTQProvider();
  const watchUrl = `${String(provider.mainUrl || 'https://hhhtq.team').replace(/\/+$/,'')}/xem/185-sv1-ep1/`;
  const out = { ok:false, diagnostic:'hhtq-okru-proxy-185-v2', watchUrl, steps:{} };

  let watchHtml = '';
  try {
    watchHtml = await provider.fetchText(watchUrl, provider.mainUrl);
    const primary = playerAaaaUrls(watchHtml, watchUrl)[0] || '';
    out.steps.primary = { url:hostPath(primary) };
    if (primary) {
      try {
        const r = await fetch(primary, { headers:{'User-Agent':DEFAULT_UA,'Referer':watchUrl}, redirect:'follow' });
        const text = await r.text();
        const media = [...text.matchAll(/https?:\\?\/\\?\/[^\s'"<>]+?\.(?:m3u8|mp4)(?:\?[^\s'"<>]*)?/gi)]
          .map(x => x[0].replace(/\\\//g,'/'));
        out.steps.primary.fetch = { status:r.status, contentType:r.headers.get('content-type') || '', bytes:Buffer.byteLength(text), media:media.slice(0,5).map(hostPath) };
      } catch (e) { out.steps.primary.fetch = { error:String(e?.message || e).slice(0,240) }; }
    }
  } catch (e) { out.steps.primary = { error:String(e?.message || e).slice(0,240) }; }

  let rows = [];
  try { rows = await provider.streams(watchUrl); } catch (e) { out.steps.resolver = { error:String(e?.message || e).slice(0,240) }; }
  const proxied = rows.find(x => /\/hhtq\/okru\//.test(String(x?.url || '')));
  out.steps.resolver = { count:rows.length, links:rows.slice(0,5).map(x => ({serverName:x?.serverName||null,url:hostPath(x?.url),isM3u8:!!x?.isM3u8})) };
  if (!proxied?.url) return out;

  const tokenMatch = String(proxied.url).match(/\/hhtq\/okru\/([A-Za-z0-9_-]+)/);
  const row = tokenMatch ? getRow(tokenMatch[1]) : null;
  if (!row) { out.steps.proxyCache = { ok:false }; return out; }
  out.steps.proxyCache = { ok:true, upstream:hostPath(row.url), referer:hostPath(row.referer) };

  try {
    const master = await fetchProbe(row.url, row.referer);
    const raw1 = master._firstUriRaw || '';
    delete master._firstUriRaw;
    out.steps.master = master;
    if (raw1 && isAllowedOkcdnUrl(raw1)) {
      const child = await fetchProbe(raw1, row.referer, /\.m3u8(?:$|[?#])/i.test(raw1) ? '' : 'bytes=0-2047');
      const raw2 = child._firstUriRaw || '';
      delete child._firstUriRaw;
      out.steps.firstChild = child;
      if (raw2 && isAllowedOkcdnUrl(raw2)) {
        const media = await fetchProbe(raw2, row.referer, 'bytes=0-2047');
        delete media._firstUriRaw;
        out.steps.firstMedia = media;
      }
    }
    out.ok = master.status >= 200 && master.status < 300 && !!master.isExtm3u;
  } catch (e) { out.steps.master = { error:String(e?.message || e).slice(0,300) }; }
  return out;
}

HHTQProvider.prototype.streams = async function okRuRenderProxyStreams(watchUrl) {
  const rows = await previousStreams.call(this, watchUrl).catch(() => []);
  return (rows || []).map(row => {
    if (!row?.url || !isAllowedOkcdnUrl(row.url)) return row;
    const proxied = registerOkRuUrl(row.url, row?.headers?.Referer || 'https://ok.ru/');
    if (!proxied) return row;
    return {
      ...row,
      serverName: row.serverName || 'HHTQ • OK.ru',
      url: proxied,
      isM3u8: true,
      headers: {}
    };
  });
};

function sendJson(req, res, body) {
  const data = JSON.stringify(body, null, 2);
  res.writeHead(200, { 'content-type':'application/json; charset=utf-8', 'content-length':Buffer.byteLength(data), 'access-control-allow-origin':'*', 'cache-control':'no-store' });
  if (req.method === 'HEAD') return res.end();
  res.end(data);
}

http.createServer = function patchedCreateServer(...args) {
  if (typeof args[0] !== 'function') return originalCreateServer.apply(http, args);
  const downstream = args[0];
  args[0] = function wrapped(req, res) {
    let pathname = '/';
    try { pathname = new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname; } catch {}
    if (pathname === '/hhtq/diag/okru-185') {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { 'content-type':'text/plain; charset=utf-8', 'access-control-allow-origin':'*' });
        return res.end('Method not allowed');
      }
      Promise.resolve(diagnoseOkRu185()).then(body => sendJson(req,res,body)).catch(err => sendJson(req,res,{ok:false,diagnostic:'hhtq-okru-proxy-185-v2',error:String(err?.message||err).slice(0,300)}));
      return;
    }
    const m = pathname.match(/^\/hhtq\/okru\/([A-Za-z0-9_-]+)(?:\.[A-Za-z0-9]+)?$/);
    if (m) {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { 'content-type':'text/plain; charset=utf-8', 'access-control-allow-origin':'*' });
        return res.end('Method not allowed');
      }
      Promise.resolve(proxyOkRu(req, res, m[1])).catch(err => {
        if (!res.headersSent) res.writeHead(500, { 'content-type':'text/plain; charset=utf-8', 'access-control-allow-origin':'*' });
        if (!res.writableEnded) res.end(String(err?.message || err).slice(0,180));
      });
      return;
    }
    return downstream(req, res);
  };
  return originalCreateServer.apply(http, args);
};

console.log('[hhtq] OK.ru Render proxy v2 enabled at /hhtq/okru/*');
module.exports = { isAllowedOkcdnUrl, registerOkRuUrl, rewriteOkRuPlaylist, proxyOkRu, extensionFor, diagnoseOkRu185 };
