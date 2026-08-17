'use strict';

const fs = require('node:fs');
const puppeteer = require('puppeteer-core');
const { HH4KProvider } = require('./hh4k_provider');

let browserPromise = null;
const directCache = new Map();
const directInflight = new Map();

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function browserPath() {
  const preferred = [
    process.env.HH4K_CHROMIUM_PATH,
    process.env.HHKUNGFU_CHROMIUM_PATH,
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable'
  ].map(x => String(x || '').trim()).filter(Boolean);
  return preferred.find(p => fs.existsSync(p)) || '';
}

async function getBrowser() {
  if (browserPromise) {
    try {
      const browser = await browserPromise;
      if (browser.connected) return browser;
    } catch {}
    browserPromise = null;
  }
  browserPromise = (async () => {
    const executablePath = browserPath();
    if (!executablePath) throw new Error('HH4K Chromium executable not found');
    const browser = await puppeteer.launch({
      headless: true,
      executablePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--autoplay-policy=no-user-gesture-required'
      ]
    });
    browser.on('disconnected', () => { browserPromise = null; });
    return browser;
  })().catch(error => {
    browserPromise = null;
    throw error;
  });
  return browserPromise;
}

function looksBlocked(html = '') {
  const s = String(html);
  return /Just a moment|cf-chl-|challenge-platform|Checking your browser|Attention Required|Cloudflare Ray ID|Access denied/i.test(s);
}

async function applyStealth(page) {
  await page.setViewport({ width: 1365, height: 768 });
  await page.evaluateOnNewDocument(() => {
    try { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); } catch {}
    try { Object.defineProperty(navigator, 'languages', { get: () => ['vi-VN', 'vi', 'en-US', 'en'] }); } catch {}
    try { Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] }); } catch {}
    try { if (!window.chrome) window.chrome = { runtime: {} }; } catch {}
  });
}

async function fetchWithBrowser(url, referer, timeoutMs) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    // Keep Chromium's native UA. Streamfree includes browser fingerprint data
    // in its signed player request and breaks when a mismatched UA is forced.
    await applyStealth(page);
    if (referer) await page.setExtraHTTPHeaders({ Referer: String(referer) });
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: Math.max(12_000, timeoutMs || 15_000)
    });
    const status = response?.status?.() || 0;
    let html = await page.content();
    for (let i = 0; i < 8 && looksBlocked(html); i++) {
      await sleep(1000);
      html = await page.content();
    }
    if (status >= 400 && status !== 403 && status !== 429 && status !== 503) {
      throw new Error(`HH4K browser HTTP ${status} for ${url}`);
    }
    if (looksBlocked(html)) throw new Error(`HH4K browser challenge not cleared for ${url}`);
    return html;
  } finally {
    try { await page.close(); } catch {}
  }
}

function patchStreamfreeApp(body = '') {
  let text = String(body || '');
  const re = /var (_0x[a-f0-9]+)=new (_0x[a-f0-9]+)\((_0x[a-f0-9]+)\);/g;
  for (const m of text.matchAll(re)) {
    const variable = m[1];
    const escaped = variable.replace(/[$]/g, '\\$&');
    const co = (text.match(new RegExp(escaped + "\\['co'\\]\\(\\)", 'g')) || []).length;
    const al = (text.match(new RegExp(escaped + "\\['al'\\]\\(", 'g')) || []).length;
    const load = (text.match(new RegExp(escaped + "\\['l'\\]\\(\\)", 'g')) || []).length;
    if (co === 2 && al === 1 && load === 1) {
      return text.replace(
        m[0],
        `${m[0]}${variable}['co']=function(){return Promise.resolve(false);};${variable}['al']=function(){};`
      );
    }
  }
  return text;
}

function streamfreeVideoId(embedUrl = '') {
  try {
    const u = new URL(String(embedUrl));
    const m = u.pathname.match(/^\/embed\/(?:v|vt)\/([^/?#]+)/i);
    return m?.[1] || '';
  } catch {
    return '';
  }
}

function hlsMatchesVideo(rawUrl, videoId) {
  try {
    const u = new URL(String(rawUrl));
    return /\/hls\/[^/]+\.m3u8$/i.test(u.pathname) && (!videoId || u.searchParams.get('vid') === videoId);
  } catch {
    return false;
  }
}

function playableM3u8(body = '') {
  const text = String(body || '').replace(/^\uFEFF/, '').trimStart();
  return /^#EXTM3U(?:\r?\n|$)/.test(text) && !/404 page not found/i.test(text.slice(0, 300));
}

function requestHeadersForClient(headers = {}, embedUrl = '') {
  const source = {};
  for (const [key, value] of Object.entries(headers || {})) {
    const name = String(key || '').toLowerCase();
    if ([
      'accept',
      'origin',
      'referer',
      'user-agent',
      'sec-ch-ua',
      'sec-ch-ua-mobile',
      'sec-ch-ua-platform'
    ].includes(name) && value != null) {
      source[key] = String(value);
    }
  }
  if (!Object.keys(source).some(k => k.toLowerCase() === 'referer') && embedUrl) {
    source.Referer = String(embedUrl);
  }
  return source;
}

async function probeStreamfreeEmbed(watchUrl, embedUrl, timeoutMs) {
  const videoId = streamfreeVideoId(embedUrl);
  if (!videoId) return null;

  const browser = await getBrowser();
  const page = await browser.newPage();
  let settled = false;
  let resolveHealthy;
  const healthy = new Promise(resolve => { resolveHealthy = resolve; });

  const finish = value => {
    if (settled) return;
    settled = true;
    resolveHealthy(value);
  };

  try {
    await applyStealth(page);
    try { await page.setCacheEnabled(false); } catch {}
    await page.setRequestInterception(true);

    page.on('request', async req => {
      const requestUrl = req.url();
      try {
        if (/streamfree\.vip\/public\/static\/app\.[a-f0-9]+\.js/i.test(requestUrl)) {
          const r = await fetch(requestUrl, {
            headers: {
              ...req.headers(),
              referer: 'https://streamfree.vip/'
            }
          });
          if (r.ok) {
            const body = patchStreamfreeApp(await r.text());
            return req.respond({
              status: 200,
              contentType: 'application/javascript; charset=utf-8',
              body
            });
          }
        }
        return req.continue();
      } catch {
        try { return req.continue(); } catch {}
      }
    });

    page.on('response', async response => {
      const responseUrl = response.url();
      if (!hlsMatchesVideo(responseUrl, videoId)) return;
      const status = response.status();
      if (status < 200 || status >= 300) {
        finish(null);
        return;
      }
      try {
        const body = await response.text();
        if (!playableM3u8(body)) {
          finish(null);
          return;
        }
        const requestHeaders = response.request()?.headers?.() || {};
        finish({
          videoId,
          url: responseUrl,
          isM3u8: true,
          headers: requestHeadersForClient(requestHeaders, embedUrl),
          embedUrl,
          status
        });
      } catch {}
    });

    await page.goto(watchUrl, {
      waitUntil: 'domcontentloaded',
      timeout: Math.max(12_000, Math.min(30_000, Number(timeoutMs || 15_000)))
    });

    // Keep Streamfree under the HHTQ parent page. Opening /embed directly does
    // not reproduce the same player/referrer context.
    await sleep(350);
    await page.evaluate(src => {
      let frame = [...document.querySelectorAll('iframe')].find(x => /streamfree\.vip/i.test(x.src || ''));
      if (!frame) frame = document.querySelector('iframe.metaframe, iframe');
      if (!frame) {
        frame = document.createElement('iframe');
        frame.style.cssText = 'position:fixed;width:1px;height:1px;left:-9999px;top:-9999px;border:0';
        document.body.appendChild(frame);
      }
      if (frame.src !== src) frame.src = src;
      return true;
    }, embedUrl).catch(() => false);

    const maxWait = Math.max(4500, Math.min(12_000, Number(timeoutMs || 12_000)));
    return await Promise.race([
      healthy,
      sleep(maxWait).then(() => null)
    ]);
  } finally {
    finish(null);
    try { await page.close(); } catch {}
  }
}

async function resolveDirectStreams(watchUrl, links, timeoutMs) {
  const candidates = [];
  const seenVideoIds = new Set();

  for (const link of links || []) {
    if (link?.url || !/streamfree\.vip/i.test(String(link?.embedUrl || link?.externalUrl || ''))) continue;
    const embedUrl = String(link.embedUrl || link.externalUrl || '');
    const videoId = streamfreeVideoId(embedUrl);
    if (!videoId || seenVideoIds.has(videoId)) continue;
    seenVideoIds.add(videoId);
    candidates.push({ videoId, embedUrl });
  }

  if (!candidates.length) return new Map();

  const result = new Map();
  // Probe one source at a time to avoid Streamfree rate/fingerprint collisions.
  for (const candidate of candidates.slice(0, 4)) {
    try {
      const direct = await probeStreamfreeEmbed(watchUrl, candidate.embedUrl, timeoutMs);
      if (direct?.url) result.set(candidate.videoId, direct);
    } catch (error) {
      console.warn('[hh4k] Streamfree direct probe failed:', String(error?.message || error).slice(0, 240));
    }
  }
  return result;
}

function directTtlMs() {
  return Math.max(5_000, Math.min(60_000, Number(process.env.HH4K_DIRECT_TTL_MS || 20_000)));
}

async function cachedDirectStreams(watchUrl, links, timeoutMs) {
  const key = String(watchUrl || '');
  const cached = directCache.get(key);
  if (cached && cached.exp > Date.now()) return cached.value;
  if (directInflight.has(key)) return directInflight.get(key);

  const work = resolveDirectStreams(key, links, timeoutMs)
    .then(value => {
      directCache.set(key, { value, exp: Date.now() + directTtlMs() });
      return value;
    })
    .catch(error => {
      const empty = new Map();
      directCache.set(key, { value: empty, exp: Date.now() + 10_000 });
      throw error;
    })
    .finally(() => directInflight.delete(key));

  directInflight.set(key, work);
  return work;
}

if (!HH4KProvider.prototype.__hh4kBrowserPatched) {
  const originalFetchText = HH4KProvider.prototype.fetchText;
  const originalResolveStreamLinks = HH4KProvider.prototype.resolveStreamLinks;

  HH4KProvider.prototype.fetchText = async function patchedFetchText(url, referer) {
    try {
      const html = await originalFetchText.call(this, url, referer);
      if (!looksBlocked(html)) return html;
    } catch (error) {
      const msg = String(error?.message || error);
      if (!/HTTP\s+(?:403|429|503)\b/i.test(msg) && !/fetch failed|aborted|timeout/i.test(msg)) throw error;
    }
    return fetchWithBrowser(url, referer, this.timeoutMs);
  };

  HH4KProvider.prototype.resolveStreamLinks = async function patchedResolveStreamLinks(watchUrl) {
    const links = await originalResolveStreamLinks.call(this, watchUrl);
    if (!Array.isArray(links) || !links.length || !browserPath()) return links;

    let directByVideo = new Map();
    try {
      directByVideo = await cachedDirectStreams(watchUrl, links, this.timeoutMs);
    } catch (error) {
      console.warn('[hh4k] browser stream fallback:', String(error?.message || error).slice(0, 240));
      return links;
    }

    return links.map(link => {
      if (link?.url) return link;
      const embedUrl = String(link?.embedUrl || link?.externalUrl || '');
      const videoId = streamfreeVideoId(embedUrl);
      const direct = videoId ? directByVideo.get(videoId) : null;
      if (!direct?.url) return link;

      return {
        ...link,
        url: direct.url,
        externalUrl: null,
        isM3u8: true,
        headers: direct.headers || link.headers || {},
        embedUrl
      };
    });
  };

  Object.defineProperty(HH4KProvider.prototype, '__hh4kBrowserPatched', { value: true });
}

module.exports = {
  fetchWithBrowser,
  looksBlocked,
  browserPath,
  patchStreamfreeApp,
  probeStreamfreeEmbed,
  streamfreeVideoId
};
