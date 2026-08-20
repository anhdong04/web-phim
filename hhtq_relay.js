'use strict';

const http = require('node:http');
const { getPlaylist } = require('./hhtq_exact_patch');

const originalCreateServer = http.createServer;

function absolutize(value, base) {
  const raw = String(value || '').trim();
  if (!raw || /^https?:\/\//i.test(raw) || /^data:/i.test(raw)) return raw;
  try { return new URL(raw, base).toString(); } catch { return raw; }
}
function rewritePlaylist(body, baseUrl) {
  const lines = String(body || '').replace(/\\n/g, '\n').split(/\r?\n/);
  return lines.map(line => {
    if (!line) return line;
    if (line.startsWith('#')) {
      return line.replace(/URI="([^"]+)"/g, (_, uri) => `URI="${absolutize(uri, baseUrl)}"`);
    }
    return absolutize(line, baseUrl);
  }).join('\n');
}
function send(req, res, status, headers, body = '') {
  const data = Buffer.from(String(body));
  res.writeHead(status, { 'content-length': data.length, ...headers });
  if (req.method === 'HEAD') return res.end();
  res.end(data);
}
function handleRelay(req, res, pathname) {
  const m = pathname.match(/^\/hhtq\/relay\/([A-Za-z0-9_-]+)\.m3u8$/);
  if (!m) return false;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    send(req, res, 405, { 'content-type':'text/plain; charset=utf-8', 'access-control-allow-origin':'*' }, 'Method not allowed');
    return true;
  }
  const row = getPlaylist(m[1]);
  if (!row) {
    send(req, res, 410, { 'content-type':'text/plain; charset=utf-8', 'access-control-allow-origin':'*', 'cache-control':'no-store' }, 'Expired HHTQ playlist');
    return true;
  }
  const body = rewritePlaylist(row.body, row.baseUrl);
  send(req, res, 200, {
    'content-type':'application/vnd.apple.mpegurl; charset=utf-8',
    'access-control-allow-origin':'*',
    'access-control-allow-headers':'*',
    'cache-control':'no-store',
    'x-web-phim-hhtq-relay':'1'
  }, body);
  return true;
}

http.createServer = function patchedCreateServer(...args) {
  if (typeof args[0] !== 'function') return originalCreateServer.apply(http, args);
  const downstream = args[0];
  args[0] = function wrapped(req, res) {
    let pathname = '/';
    try { pathname = new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname; } catch {}
    if (handleRelay(req, res, pathname)) return;
    return downstream(req, res);
  };
  return originalCreateServer.apply(http, args);
};

console.log('[hhtq] M3U8 relay enabled at /hhtq/relay/*');
module.exports = { rewritePlaylist, handleRelay };
