'use strict';

const http = require('node:http');
const { HHTQProvider } = require('./hhtq_provider');
const { playerAaaaUrls } = require('./hhtq_exact_patch');
const { knownHostUrls } = require('./hhtq_watch_known_hosts_patch');

const originalCreateServer = http.createServer;
const provider = new HHTQProvider();

function hostPath(value) {
  try {
    const u = new URL(String(value || ''));
    return { host: u.host, path: u.pathname + u.search };
  } catch { return { host: null, path: null }; }
}

async function diagnoseWatch185() {
  const watchUrl = `${String(provider.mainUrl || 'https://hhhtq.team').replace(/\/+$/, '')}/xem/185-sv1-ep1/`;
  const out = { ok: false, diagnostic: 'hhtq-watch-185-v1', watchUrl, steps: {} };
  let html = '';
  try {
    html = await provider.fetchText(watchUrl, provider.mainUrl);
    const player = playerAaaaUrls(html, watchUrl);
    const known = knownHostUrls(html);
    out.steps.watchHtml = {
      ok: true,
      bytes: Buffer.byteLength(html),
      hasPlayerAaaaText: html.includes('player_aaaa'),
      playerAaaaCount: player.length,
      playerAaaa: player.slice(0, 12).map(hostPath),
      knownHostCount: known.length,
      knownHosts: known.slice(0, 20).map(hostPath),
      hasLinksBackup: /id=["']links-backup["']/i.test(html),
      backupApiAnchorCount: (html.match(/<a\b[^>]*data-play=["']?api["']?[^>]*>/gi) || []).length,
      episodeLinkCount: (html.match(/<a\b[^>]*class=["'][^"']*episode-link[^"']*["'][^>]*>/gi) || []).length,
      iframeCount: (html.match(/<iframe\b[^>]*>/gi) || []).length
    };
  } catch (e) {
    out.steps.watchHtml = { ok: false, error: String(e?.message || e).slice(0, 400) };
  }

  try {
    const links = await provider.streams(watchUrl);
    out.steps.resolver = {
      ok: true,
      count: links.length,
      links: links.slice(0, 12).map(x => ({
        serverName: x?.serverName || null,
        hasUrl: !!x?.url,
        media: hostPath(x?.url),
        isM3u8: !!x?.isM3u8
      }))
    };
    out.ok = links.some(x => x?.url);
  } catch (e) {
    out.steps.resolver = { ok: false, error: String(e?.message || e).slice(0, 400) };
  }
  return out;
}

function sendJson(req, res, status, body) {
  const data = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(data),
    'access-control-allow-origin': '*',
    'cache-control': 'no-store'
  });
  if (req.method === 'HEAD') return res.end();
  res.end(data);
}

http.createServer = function patchedCreateServer(...args) {
  if (typeof args[0] !== 'function') return originalCreateServer.apply(http, args);
  const downstream = args[0];
  args[0] = function wrapped(req, res) {
    let pathname = '/';
    try { pathname = new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname; } catch {}
    if (pathname === '/hhtq/diag/watch-185') {
      if (req.method !== 'GET' && req.method !== 'HEAD') return sendJson(req, res, 405, { error: 'Method not allowed' });
      Promise.resolve(diagnoseWatch185())
        .then(body => sendJson(req, res, 200, body))
        .catch(err => sendJson(req, res, 200, { ok: false, diagnostic: 'hhtq-watch-185-v1', error: String(err?.message || err).slice(0, 400) }));
      return;
    }
    return downstream(req, res);
  };
  return originalCreateServer.apply(http, args);
};

console.log('[hhtq] watch 185 diagnostic enabled');
module.exports = { diagnoseWatch185 };
