const fs = require('node:fs');
const puppeteer = require('puppeteer-core');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36';
const TIMEOUT_MS = Math.max(25_000, Number(process.env.HHKUNGFU_HLS_TIMEOUT_MS || 45_000));
const TTL_MS = Math.max(60_000, Number(process.env.HHKUNGFU_HLS_TTL_MS || 15 * 60_000));
const MAX_ATTEMPTS = Math.max(1, Math.min(4, Number(process.env.HHKUNGFU_HLS_ATTEMPTS || 3)));
const cache = new Map();
let browserPromise = null;
const sleep = ms => new Promise(r => setTimeout(r, ms));

function browserPath() {
  const preferred = String(process.env.HHKUNGFU_CHROMIUM_PATH || '').trim();
  return [preferred, '/usr/bin/chromium-browser', '/usr/bin/chromium', '/usr/bin/google-chrome']
    .filter(Boolean)
    .find(p => fs.existsSync(p)) || '';
}

async function getBrowser() {
  if (browserPromise) {
    try {
      const b = await browserPromise;
      if (b.connected) return b;
    } catch {}
    browserPromise = null;
  }
  browserPromise = (async () => {
    const executablePath = browserPath();
    if (!executablePath) throw new Error('Chromium executable not found');
    const browser = await puppeteer.launch({
      headless: true,
      executablePath,
      args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required']
    });
    browser.on('disconnected', () => { browserPromise = null; });
    return browser;
  })().catch(e => { browserPromise = null; throw e; });
  return browserPromise;
}

function fromPlaylist(items) {
  for (const item of Array.isArray(items) ? items : []) {
    const direct = String(item?.file || '');
    if (/master\.m3u8(?:\?|$)/i.test(direct)) return direct;
    for (const src of Array.isArray(item?.sources) ? item.sources : []) {
      const file = String(src?.file || '');
      if (/master\.m3u8(?:\?|$)/i.test(file)) return file;
    }
  }
  return '';
}

function validHls(url) {
  return /^https:\/\/[^/]*helvid\.net\/api\/v1\/cdn\/stream\/.+\/master\.m3u8(?:\?|$)/i.test(String(url || ''));
}

async function playlistFromFrame(frame) {
  try {
    const items = await frame.evaluate(() => {
      try {
        if (typeof jwplayer !== 'function') return [];
        return jwplayer().getPlaylist?.() || [];
      } catch { return []; }
    });
    return fromPlaylist(items);
  } catch { return ''; }
}

async function oneAttempt(watchUrl, attempt) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  let captured = '';
  try {
    await page.setUserAgent(UA);
    await page.evaluateOnNewDocument(() => {
      try { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); } catch {}
      try { Object.defineProperty(window, 'outerWidth', { get: () => window.innerWidth }); } catch {}
      try { Object.defineProperty(window, 'outerHeight', { get: () => window.innerHeight }); } catch {}
      for (const k of ['log','table','clear','debug','dir','dirxml','profile','profileEnd']) {
        try { Object.defineProperty(console, k, { value: function(){}, writable: false, configurable: false }); } catch {}
      }
    });

    page.on('request', req => {
      const url = req.url();
      if (!captured && validHls(url)) captured = url;
    });

    await page.goto(watchUrl, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });

    let frame = null;
    for (let i = 0; i < 32; i++) {
      frame = page.frames().find(f => /streamfree\.vip\/embed\//i.test(f.url()));
      if (frame) break;
      await sleep(400);
    }
    if (!frame) throw new Error(`attempt ${attempt}: Streamfree iframe missing`);

    // The bytecode VM needs a few seconds to initialize JWPlayer.
    await sleep(6500);

    const body = await frame.evaluate(() => document.body?.innerText?.slice(0, 800) || '').catch(() => '');
    if (/\(-3\)|công cụ nhà phát triển|developer tools/i.test(body)) {
      throw new Error(`attempt ${attempt}: Streamfree anti-devtools (-3)`);
    }

    let hls = captured || await playlistFromFrame(frame);
    if (validHls(hls)) return hls;

    try {
      await frame.evaluate(() => {
        try {
          if (typeof jwplayer === 'function') {
            const p = jwplayer();
            p.setMute?.(true);
            p.play?.(true);
          }
        } catch {}
      });
    } catch {}

    for (let i = 0; i < 24; i++) {
      await sleep(500);
      hls = captured || await playlistFromFrame(frame);
      if (validHls(hls)) return hls;
      const text = await frame.evaluate(() => document.body?.innerText?.slice(0, 500) || '').catch(() => '');
      if (/\(-3\)|công cụ nhà phát triển|developer tools/i.test(text)) {
        throw new Error(`attempt ${attempt}: anti-devtools after play`);
      }
    }
    throw new Error(`attempt ${attempt}: JWPlayer produced no HLS`);
  } finally {
    try { await page.close(); } catch {}
  }
}

async function resolveHls(watchUrl, cacheKey) {
  const key = String(cacheKey || watchUrl);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.url;

  let lastError = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const url = await oneAttempt(watchUrl, attempt);
      if (!validHls(url)) throw new Error('unexpected HLS host');
      cache.set(key, { url, expiresAt: Date.now() + TTL_MS });
      return url;
    } catch (e) {
      lastError = e;
      if (attempt < MAX_ATTEMPTS) await sleep(700 + Math.floor(Math.random() * 700));
    }
  }
  throw lastError || new Error('HHKungfu HLS resolution failed');
}

module.exports = { resolveHls, validHls };
