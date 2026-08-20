'use strict';

const crypto = require('node:crypto');
const http = require('node:http');
const { HHTQProvider, DEFAULT_UA } = require('./hhtq_provider');

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
    return /^https:$/.test(u.protocol) && /(?:^|\.)okcdn\.ru$/i.test(u.hostname);
  } catch { return false; }
}

function cleanup() {
  const now = Date.now();
  for (const [token, row] of cache) if (!row || row.exp <= now) cache.delete(token);
  while (cache.size > 2000) cache.delete(cache.keys().next().value);
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
  return `${PUBLIC_BASE}/hhtq/okru/${token}`;
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

async function proxyOkRu(req, res, token) {
  const row = getRow(token);
  if (!row) {
    res.writeHead(410, { 'content-type':'text/plain; charset=utf-8', 'access-control-allow-origin':'*', 'cache-control':'no-store' });
    return res.end('Expired OK.ru proxy URL');
  }

  const headers = {
    'User-Agent': DEFAULT_UA,
    'Referer': row.referer || 'https://ok.ru/'
  };
  if (req.headers.range) headers.Range = req.headers.range;

  let upstream;
  try {
    upstream = await fetch(row.url, { method: req.method === 'HEAD' ? 'HEAD' : 'GET', headers, redirect:'follow' });
  } catch (e) {
    res.writeHead(502, { 'content-type':'text/plain; charset=utf-8', 'access-control-allow-origin':'*', 'cache-control':'no-store' });
    return res.end(`OK.ru upstream error: ${String(e?.message || e).slice(0,160)}`);
  }

  const contentType = upstream.headers.get('content-type') || '';
  const isPlaylist = /mpegurl|m3u8/i.test(contentType) || /\.m3u8(?:$|[?#])/i.test(row.url);

  if (req.method === 'HEAD') {
    res.writeHead(upstream.status, {
      'access-control-allow-origin':'*',
      'cache-control':'no-store',
      ...copyHeader(upstream.headers, 'content-type'),
      ...copyHeader(upstream.headers, 'accept-ranges'),
      ...copyHeader(upstream.headers, 'content-range'),
      ...copyHeader(upstream.headers, 'content-length'),
      'x-web-phim-hhtq-okru-proxy':'1'
    });
    return res.end();
  }

  if (isPlaylist) {
    const text = await upstream.text();
    const body = rewriteOkRuPlaylist(text, row.url, row.referer);
    res.writeHead(upstream.status, {
      'content-type':'application/vnd.apple.mpegurl; charset=utf-8',
      'access-control-allow-origin':'*',
      'access-control-allow-headers':'*',
      'cache-control':'no-store',
      'x-web-phim-hhtq-okru-proxy':'playlist'
    });
    return res.end(body);
  }

  const body = Buffer.from(await upstream.arrayBuffer());
  res.writeHead(upstream.status, {
    'access-control-allow-origin':'*',
    'cache-control':'no-store',
    ...copyHeader(upstream.headers, 'content-type'),
    ...copyHeader(upstream.headers, 'accept-ranges'),
    ...copyHeader(upstream.headers, 'content-range'),
    'content-length': body.length,
    'x-web-phim-hhtq-okru-proxy':'media'
  });
  return res.end(body);
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

http.createServer = function patchedCreateServer(...args) {
  if (typeof args[0] !== 'function') return originalCreateServer.apply(http, args);
  const downstream = args[0];
  args[0] = function wrapped(req, res) {
    let pathname = '/';
    try { pathname = new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname; } catch {}
    const m = pathname.match(/^\/hhtq\/okru\/([A-Za-z0-9_-]+)$/);
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

console.log('[hhtq] OK.ru Render proxy enabled at /hhtq/okru/*');
module.exports = { isAllowedOkcdnUrl, registerOkRuUrl, rewriteOkRuPlaylist, proxyOkRu };
