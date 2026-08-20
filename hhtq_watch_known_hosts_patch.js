'use strict';

const { HHTQProvider, DEFAULT_UA } = require('./hhtq_provider');
const {
  resolveEmbedCliphub,
  resolveVipCliphub,
  resolveHelvid
} = require('./hhtq_exact_patch');

const previousStreams = HHTQProvider.prototype.streams;

function normalizeEmbeddedHtml(html) {
  return String(html || '')
    .replace(/&amp;/gi, '&')
    .replace(/\\u0026/gi, '&')
    .replace(/\\\//g, '/')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'");
}

function knownHostUrls(html) {
  const text = normalizeEmbeddedHtml(html);
  const re = /(?:https?:)?\/\/(?:embed\.cliphub\.tv|vip\.cliphub\.tv|(?:[a-z0-9.-]*\.)?helvid[a-z0-9.-]*|rumble\.com|(?:www\.)?ok\.ru|(?:www\.)?dailymotion\.com|q8y5z\.com)[^\s"'<>`\\]*/gi;
  const out = [];
  for (const m of text.matchAll(re)) {
    let value = String(m[0] || '').replace(/[),;]+$/g, '');
    if (value.startsWith('//')) value = 'https:' + value;
    try {
      const u = new URL(value);
      if (/^https?:$/.test(u.protocol)) out.push(u.toString());
    } catch {}
  }
  return [...new Set(out)];
}

function directRow(url, name, referer) {
  try {
    const u = new URL(String(url)).toString();
    return {
      serverName: name,
      url: u,
      externalUrl: null,
      isM3u8: /\.m3u8(?:$|[?#])/i.test(u),
      headers: { Referer: referer || u, 'User-Agent': DEFAULT_UA }
    };
  } catch { return null; }
}

async function resolveKnownHost(provider, url, referer) {
  if (/embed\.cliphub\.tv/i.test(url)) return resolveEmbedCliphub(provider, url, referer);
  if (/vip\.cliphub\.tv/i.test(url)) return resolveVipCliphub(provider, url, referer);
  if (/^https?:\/\/(?:[^/]+\.)?helvid/i.test(url)) return resolveHelvid(provider, url, referer);

  const rumble = String(url).match(/rumble\.com\/embed\/v([^/?#]+)/i);
  if (rumble) {
    const row = directRow(`https://rumble.com/hls-vod/${rumble[1]}/playlist.m3u8?u=0&b=0`, 'HHTQ • Rumble', url);
    return row ? [row] : [];
  }

  // OK.ru, Dailymotion and q8y5z are fallback-only here. Some pages expose a
  // direct media URL in their HTML even when the regular HHTQ parser misses it.
  try {
    const html = await provider.fetchText(url, referer || provider.mainUrl);
    const text = normalizeEmbeddedHtml(html);
    const media = [...text.matchAll(/https?:\/\/[^\s"'<>]+?\.(?:m3u8|mp4)(?:\?[^\s"'<>]*)?/gi)]
      .map(x => x[0]);
    const rows = [...new Set(media)].slice(0, 3)
      .map(x => directRow(x, 'HHTQ • Direct', url))
      .filter(Boolean);
    if (rows.length) return rows;
  } catch {}
  return [];
}

HHTQProvider.prototype.streams = async function watchKnownHostStreams(watchUrl) {
  const prior = await previousStreams.call(this, watchUrl).catch(() => []);
  const direct = (prior || []).filter(x => x?.url && /^https?:\/\//i.test(x.url));
  if (direct.length) return direct;

  let html = '';
  try { html = await this.fetchText(watchUrl, this.mainUrl); } catch {}
  const candidates = knownHostUrls(html).slice(0, 12);
  for (const candidate of candidates) {
    try {
      const rows = await resolveKnownHost(this, candidate, watchUrl);
      if (rows.length) return rows;
    } catch (e) {
      console.warn('[hhtq] watch known-host resolver failed:', String(e?.message || e).slice(0, 180));
    }
  }
  return [];
};

console.log('[hhtq] watch-page known-host scanner enabled');
module.exports = { normalizeEmbeddedHtml, knownHostUrls, resolveKnownHost };
