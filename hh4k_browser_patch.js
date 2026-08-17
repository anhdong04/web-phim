'use strict';

const fs = require('node:fs');
const puppeteer = require('puppeteer-core');
const { HH4KProvider } = require('./hh4k_provider');

const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36';
let browserPromise = null;

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
        '--disable-blink-features=AutomationControlled'
      ]
    });
    browser.on('disconnected', () => { browserPromise = null; });
    return browser;
  })().catch(error => { browserPromise = null; throw error; });
  return browserPromise;
}
function looksBlocked(html = '') {
  const s = String(html);
  return /Just a moment|cf-chl-|challenge-platform|Checking your browser|Attention Required|Cloudflare Ray ID|Access denied/i.test(s);
}
async function fetchWithBrowser(url, referer, timeoutMs) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setUserAgent(DESKTOP_UA);
    await page.setViewport({ width: 1365, height: 768 });
    if (referer) await page.setExtraHTTPHeaders({ Referer: String(referer) });
    await page.evaluateOnNewDocument(() => {
      try { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); } catch {}
      try { Object.defineProperty(navigator, 'languages', { get: () => ['vi-VN', 'vi', 'en-US', 'en'] }); } catch {}
      try { Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] }); } catch {}
    });
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: Math.max(12_000, timeoutMs || 15_000) });
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

if (!HH4KProvider.prototype.__hh4kBrowserPatched) {
  const originalFetchText = HH4KProvider.prototype.fetchText;
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
  Object.defineProperty(HH4KProvider.prototype, '__hh4kBrowserPatched', { value: true });
}

module.exports = { fetchWithBrowser, looksBlocked, browserPath };
