'use strict';

const http = require('node:http');
const { HHTQProvider } = require('./hhtq_provider');
const { playerAaaaUrls } = require('./hhtq_exact_patch');
const { resolveFallback } = require('./hhtq_hh4k_fallback');

const originalCreateServer = http.createServer;
const provider = new HHTQProvider();

function hostOf(value) {
  try { return new URL(String(value || '')).host || null; } catch { return null; }
}
function summarizeLinks(rows) {
  return (rows || []).slice(0, 12).map(x => ({
    serverName: x?.serverName || null,
    hasUrl: !!x?.url,
    urlHost: hostOf(x?.url),
    isM3u8: !!x?.isM3u8,
    hasExternalUrl: !!x?.externalUrl,
    externalHost: hostOf(x?.externalUrl || x?.embedUrl)
  }));
}
async function diagnoseMovie185() {
  const started = Date.now();
  const detailUrl = `${String(provider.mainUrl || 'https://hhhtq.team').replace(/\/+$/, '')}/phim/185/`;
  const out = {
    ok: false,
    diagnostic: 'hhtq-movie-185-v1',
    detailUrl,
    baseUrl: provider.mainUrl,
    steps: {}
  };

  let html = '';
  try {
    html = await provider.fetchText(detailUrl, provider.mainUrl);
    out.steps.fetchDetailHtml = { ok: true, bytes: Buffer.byteLength(html), playerAaaaCount: playerAaaaUrls(html, detailUrl).length, playerHosts: playerAaaaUrls(html, detailUrl).map(hostOf) };
  } catch (e) {
    out.steps.fetchDetailHtml = { ok: false, error: String(e?.message || e).slice(0, 300) };
  }

  let detail = null;
  try {
    detail = await provider.detail(detailUrl);
    out.steps.detail = {
      ok: true,
      title: detail?.title || null,
      type: detail?.type || null,
      episodeCount: Array.isArray(detail?.episodes) ? detail.episodes.length : 0,
      episodes: (detail?.episodes || []).slice(0, 6).map(ep => ({ name: ep?.name || null, number: ep?.number ?? null, watchUrl: ep?.watchUrl || null }))
    };
  } catch (e) {
    out.steps.detail = { ok: false, error: String(e?.message || e).slice(0, 300) };
  }

  const ep = detail?.episodes?.[0] || { name: 'FULL', number: 1, watchUrl: detailUrl };
  let exact = [];
  try {
    exact = await provider.streams(ep.watchUrl || detailUrl);
    out.steps.exactResolver = { ok: true, count: exact.length, links: summarizeLinks(exact) };
  } catch (e) {
    out.steps.exactResolver = { ok: false, error: String(e?.message || e).slice(0, 300) };
  }

  let fallback = [];
  try {
    fallback = await resolveFallback(detail?.title || 'Tây Hành Kỷ Ám Ảnh Ma Thành', ep);
    out.steps.hh4kFallback = { ok: true, count: fallback.length, links: summarizeLinks(fallback) };
  } catch (e) {
    out.steps.hh4kFallback = { ok: false, error: String(e?.message || e).slice(0, 300) };
  }

  out.ok = exact.some(x => x?.url) || fallback.some(x => x?.url);
  out.finalDirectCount = [...exact, ...fallback].filter(x => x?.url).length;
  out.elapsedMs = Date.now() - started;
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
    if (pathname === '/hhtq/diag/movie-185') {
      if (req.method !== 'GET' && req.method !== 'HEAD') return sendJson(req, res, 405, { error: 'Method not allowed' });
      Promise.resolve(diagnoseMovie185())
        .then(body => sendJson(req, res, 200, body))
        .catch(err => sendJson(req, res, 200, { ok: false, diagnostic: 'hhtq-movie-185-v1', error: String(err?.message || err).slice(0, 400) }));
      return;
    }
    return downstream(req, res);
  };
  return originalCreateServer.apply(http, args);
};

console.log('[hhtq] movie 185 diagnostic enabled');
module.exports = { diagnoseMovie185 };
