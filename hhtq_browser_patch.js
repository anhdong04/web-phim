'use strict';

const fs = require('node:fs');
const puppeteer = require('puppeteer-core');
const { HHTQProvider, DEFAULT_UA } = require('./hhtq_provider');

let browserPromise = null;
const cache = new Map();
const inflight = new Map();

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function browserPath() {
  const candidates = [
    process.env.HHTQ_CHROMIUM_PATH,
    process.env.HH4K_CHROMIUM_PATH,
    process.env.HHKUNGFU_CHROMIUM_PATH,
    '/usr/bin/chromium-browser', '/usr/bin/chromium',
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable'
  ].map(x => String(x || '').trim()).filter(Boolean);
  return candidates.find(x => fs.existsSync(x)) || '';
}
async function getBrowser() {
  if (browserPromise) {
    try { const b = await browserPromise; if (b.connected) return b; } catch {}
    browserPromise = null;
  }
  browserPromise = (async () => {
    const executablePath = browserPath();
    if (!executablePath) throw new Error('HHTQ Chromium executable not found');
    const b = await puppeteer.launch({
      headless: true,
      executablePath,
      args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-blink-features=AutomationControlled','--autoplay-policy=no-user-gesture-required']
    });
    b.on('disconnected', () => { browserPromise = null; });
    return b;
  })().catch(e => { browserPromise = null; throw e; });
  return browserPromise;
}
function mediaKind(url, headers = {}) {
  const u = String(url || '');
  const ct = String(headers['content-type'] || headers['Content-Type'] || '').toLowerCase();
  if (/\.m3u8(?:$|[?#])/i.test(u) || /mpegurl/.test(ct)) return 'hls';
  if (/\.mp4(?:$|[?#])/i.test(u) || /^video\/mp4\b/.test(ct)) return 'mp4';
  return '';
}
function clientHeaders(headers = {}, referer = '') {
  const out = {};
  for (const [k,v] of Object.entries(headers || {})) {
    if (!v) continue;
    const n = String(k).toLowerCase();
    if (['referer','origin','user-agent','accept'].includes(n)) out[k] = String(v);
  }
  if (!Object.keys(out).some(k => k.toLowerCase() === 'referer') && referer) out.Referer = referer;
  if (!Object.keys(out).some(k => k.toLowerCase() === 'user-agent')) out['User-Agent'] = DEFAULT_UA;
  return out;
}
async function probePage(targetUrl, referer, timeoutMs = 10000) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  const found = [];
  const seen = new Set();
  try {
    await page.setViewport({ width: 1365, height: 768 });
    await page.evaluateOnNewDocument(() => {
      try { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); } catch {}
      try { Object.defineProperty(navigator, 'languages', { get: () => ['vi-VN','vi','en-US','en'] }); } catch {}
      try { if (!window.chrome) window.chrome = { runtime: {} }; } catch {}
    });
    if (referer) await page.setExtraHTTPHeaders({ Referer: String(referer) });
    page.on('response', response => {
      try {
        const status = response.status();
        if (status < 200 || status >= 400) return;
        const url = response.url();
        const kind = mediaKind(url, response.headers());
        if (!kind || seen.has(url)) return;
        seen.add(url);
        found.push({
          serverName: kind === 'hls' ? 'HHTQ • Direct HLS' : 'HHTQ • Direct MP4',
          url,
          externalUrl: null,
          isM3u8: kind === 'hls',
          headers: clientHeaders(response.request()?.headers?.() || {}, targetUrl),
          sourceUrl: referer || targetUrl
        });
      } catch {}
    });
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: Math.max(8000, Math.min(25000, Number(timeoutMs || 10000))) }).catch(() => null);
    await page.evaluate(() => {
      try {
        const v = document.querySelector('video');
        if (v) { v.muted = true; const p = v.play?.(); if (p?.catch) p.catch(() => {}); }
        for (const el of document.querySelectorAll('[data-play="api"], a.episode-link, button[class*="play"], .play')) {
          try { el.click(); } catch {}
        }
      } catch {}
    }).catch(() => {});
    const end = Date.now() + Math.max(3500, Math.min(9000, Number(timeoutMs || 8000)));
    while (Date.now() < end && found.length < 4) await sleep(350);
    return found;
  } finally {
    try { await page.close(); } catch {}
  }
}
async function resolveWithBrowser(watchUrl, links, timeoutMs) {
  const targets = [watchUrl, ...(links || []).map(x => x?.externalUrl).filter(Boolean)];
  const uniq = [...new Set(targets)].slice(0, 7);
  const out = [];
  const seen = new Set();
  for (const target of uniq) {
    try {
      const rows = await probePage(target, watchUrl, timeoutMs);
      for (const row of rows) if (row.url && !seen.has(row.url)) { seen.add(row.url); out.push(row); }
      if (out.length >= 4) break;
    } catch (e) {
      console.warn('[hhtq] browser probe failed:', String(e?.message || e).slice(0, 220));
    }
  }
  return out;
}
function directTtl() { return Math.max(5000, Math.min(60000, Number(process.env.HHTQ_DIRECT_TTL_MS || 20000))); }
async function cachedBrowserResolve(watchUrl, links, timeoutMs) {
  const key = String(watchUrl || '');
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return hit.value;
  if (inflight.has(key)) return inflight.get(key);
  const work = resolveWithBrowser(key, links, timeoutMs)
    .then(value => { cache.set(key, { value, exp: Date.now() + directTtl() }); return value; })
    .finally(() => inflight.delete(key));
  inflight.set(key, work);
  return work;
}

const originalStreams = HHTQProvider.prototype.streams;
HHTQProvider.prototype.streams = async function patchedHhtqStreams(watchUrl) {
  const links = await originalStreams.call(this, watchUrl);
  const direct = (links || []).filter(x => x?.url && /^https?:\/\//i.test(x.url));
  if (direct.length) return direct;
  try {
    const browserDirect = await cachedBrowserResolve(watchUrl, links, this.timeoutMs);
    if (browserDirect.length) return browserDirect;
  } catch (e) {
    console.warn('[hhtq] direct browser resolver failed:', String(e?.message || e).slice(0, 220));
  }
  // Never return embed/web pages as streams: Nuvio would open the browser.
  return [];
};

console.log('[hhtq] direct-media browser resolver enabled');
module.exports = { probePage, resolveWithBrowser };
