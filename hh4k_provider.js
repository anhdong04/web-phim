'use strict';

// Port of the uploaded PhimHhtqProvider.kt for the standalone Nuvio HH4K addon.
// Source flow: phimhhtq.com -> list -> detail -> Halim AJAX player -> m3u8/mp4.

const DEFAULT_UA = 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const DEFAULT_BASE = 'https://phimhhtq.com';

function uniq(items, key = x => x) {
  const seen = new Set();
  return (items || []).filter(item => {
    const k = key(item);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function decodeHtml(value = '') {
  return String(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function stripTags(value = '') {
  return decodeHtml(String(value)
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim());
}

function attr(tag = '', name = '') {
  const safe = String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = String(tag).match(new RegExp('\\b' + safe + '\\s*=\\s*(?:"([^"]*)"|\\'([^\\']*)\\'|([^\\s>]+))', 'i'));
  return decodeHtml(m ? (m[1] ?? m[2] ?? m[3] ?? '') : '');
}

function normalizeBase(url = '') {
  const value = String(url || '').trim().replace(/\/+$/, '');
  if (!value) return DEFAULT_BASE;
  return /^https?:\/\//i.test(value) ? value : 'https://' + value;
}

function fixUrl(raw, baseUrl) {
  const value = decodeHtml(String(raw || '').trim()).replace(/\\\//g, '/');
  if (!value) return null;
  try {
    if (/^https?:\/\//i.test(value)) return value;
    if (value.startsWith('//')) return 'https:' + value;
    if (value.startsWith('/')) return String(baseUrl).replace(/\/+$/, '') + value;
    return String(baseUrl).replace(/\/+$/, '') + '/' + value;
  } catch {
    return null;
  }
}

function metaContent(html, key) {
  for (const m of String(html || '').matchAll(/<meta\b[^>]*>/gi)) {
    const tag = m[0];
    const k = attr(tag, 'property') || attr(tag, 'name');
    if (String(k).toLowerCase() === String(key).toLowerCase()) return attr(tag, 'content') || null;
  }
  return null;
}

function classHas(tag, token) {
  return new RegExp('(?:^|\\s)' + token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:\\s|$)', 'i')
    .test(attr(tag, 'class'));
}

function firstTag(html, tagName, classToken) {
  const re = new RegExp('<' + tagName + '\\b[^>]*>[\\s\\S]*?<\\/' + tagName + '>', 'gi');
  for (const m of String(html || '').matchAll(re)) {
    const open = m[0].match(new RegExp('^<' + tagName + '\\b[^>]*>', 'i'))?.[0] || '';
    if (!classToken || classHas(open, classToken)) return m[0];
  }
  return '';
}

function episodeNumber(text = '') {
  const m = String(text).replace(',', '.').match(/\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}

function parseListItem(block, baseUrl) {
  const h2 = firstTag(block, 'h2', 'entry-title');
  const title = stripTags(h2);
  if (!title) return null;

  let linkTag = '';
  for (const m of String(block).matchAll(/<a\b[^>]*>/gi)) {
    if (classHas(m[0], 'halim-thumb')) { linkTag = m[0]; break; }
  }
  if (!linkTag) return null;
  const detailUrl = fixUrl(attr(linkTag, 'href'), baseUrl);
  if (!detailUrl) return null;

  let imgTag = '';
  const figure = firstTag(block, 'figure');
  imgTag = String(figure || block).match(/<img\b[^>]*>/i)?.[0] || '';
  const posterUrl = fixUrl(attr(imgTag, 'src') || attr(imgTag, 'data-src'), baseUrl);

  let episodeLabel = null;
  for (const m of String(block).matchAll(/<span\b[^>]*>[\s\S]*?<\/span>/gi)) {
    const open = m[0].match(/^<span\b[^>]*>/i)?.[0] || '';
    if (classHas(open, 'episode')) { episodeLabel = stripTags(m[0]) || null; break; }
  }

  return { title, detailUrl, posterUrl, episodeLabel, qualityLabel: null };
}

function parseListItems(html, baseUrl) {
  const out = [];
  for (const m of String(html || '').matchAll(/<article\b[^>]*>[\s\S]*?<\/article>/gi)) {
    const open = m[0].match(/^<article\b[^>]*>/i)?.[0] || '';
    if (!classHas(open, 'thumb')) continue;
    const item = parseListItem(m[0], baseUrl);
    if (item) out.push(item);
  }
  return uniq(out, x => x.detailUrl);
}

function findImgWithClass(html, classToken) {
  for (const m of String(html || '').matchAll(/<img\b[^>]*>/gi)) {
    if (classHas(m[0], classToken)) return m[0];
  }
  return '';
}

function parseEpisodes(html, baseUrl) {
  const out = [];
  let listHtml = String(html || '');
  const ulMatch = [...listHtml.matchAll(/<ul\b[^>]*>[\s\S]*?<\/ul>/gi)]
    .find(m => classHas(m[0].match(/^<ul\b[^>]*>/i)?.[0] || '', 'halim-list-eps'));
  if (ulMatch) listHtml = ulMatch[0];

  for (const m of listHtml.matchAll(/<li\b[^>]*>[\s\S]*?<\/li>/gi)) {
    const openLi = m[0].match(/^<li\b[^>]*>/i)?.[0] || '';
    if (ulMatch && !classHas(openLi, 'halim-episode')) continue;
    const a = m[0].match(/<a\b[^>]*>[\s\S]*?<\/a>/i)?.[0] || '';
    if (!a) continue;
    const openA = a.match(/^<a\b[^>]*>/i)?.[0] || '';
    const label = stripTags(a).trim();
    const watchUrl = fixUrl(attr(openA, 'href'), baseUrl);
    if (!label || !watchUrl) continue;
    out.push({
      name: 'Tập ' + label,
      number: episodeNumber(label),
      watchUrl,
      serverName: 'Halim',
      vip: false
    });
  }
  return uniq(out, x => x.watchUrl);
}

function parseOverview(html) {
  const entry = [...String(html || '').matchAll(/<div\b[^>]*>[\s\S]*?<\/div>/gi)]
    .find(m => classHas(m[0].match(/^<div\b[^>]*>/i)?.[0] || '', 'entry-content'));
  if (entry) {
    const article = entry[0].match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1] || entry[0];
    const text = stripTags(article);
    if (text) return text.slice(0, 3000);
  }
  return metaContent(html, 'description') || null;
}

function parseDetail(html, detailUrl, baseUrl) {
  const title = stripTags(firstTag(html, 'h1', 'entry-title'))
    || stripTags(metaContent(html, 'og:title') || '').split('|')[0].trim();
  if (!title) throw new Error('PhimHHTQ: không đọc được tên phim');

  const movieThumb = findImgWithClass(html, 'movie-thumb');
  const posterUrl = fixUrl(attr(movieThumb, 'src'), baseUrl)
    || fixUrl(metaContent(html, 'og:image'), baseUrl);
  const ogImage = fixUrl(metaContent(html, 'og:image'), baseUrl);
  const ogWidth = Number(metaContent(html, 'og:image:width') || 0);
  const ogHeight = Number(metaContent(html, 'og:image:height') || 0);
  const bannerUrl = ogImage && ogWidth > ogHeight ? ogImage : (ogImage && ogImage !== posterUrl ? ogImage : null);

  let moreInfo = '';
  for (const m of String(html || '').matchAll(/<div\b[^>]*>[\s\S]*?<\/div>/gi)) {
    const open = m[0].match(/^<div\b[^>]*>/i)?.[0] || '';
    if (classHas(open, 'more-info')) { moreInfo = stripTags(m[0]); break; }
  }
  const yearText = moreInfo.match(/(?:19|20)\d{2}/)?.[0];

  return {
    title,
    detailUrl,
    posterUrl,
    bannerUrl,
    overview: parseOverview(html),
    year: yearText ? Number(yearText) : null,
    genres: ['Hoạt hình Trung Quốc'],
    episodes: parseEpisodes(html, baseUrl),
    recommendations: parseListItems(html, baseUrl).filter(x => x.detailUrl !== detailUrl)
  };
}

function parseHalimWatchPageParams(html, watchUrl) {
  const cfgBlock = String(html || '').match(/var\s+halim_cfg\s*=\s*\{([^}]+)\}/i)?.[1] || '';
  const postId = cfgBlock.match(/post_id\s*:\s*(\d+)/i)?.[1]
    || String(html || '').match(/postid-(\d+)/i)?.[1]
    || String(html || '').match(/post_id\s*:\s*(\d+)/i)?.[1];
  if (!postId) throw new Error('PhimHHTQ: không tìm thấy post_id');

  const nonce = String(html || '').match(/ajax_player\s*=\s*\{[^}]*["']nonce["']\s*:\s*["']([a-zA-Z0-9]+)["']/i)?.[1];
  if (!nonce) throw new Error('PhimHHTQ: không tìm thấy nonce (ajax_player)');

  const epMatch = String(watchUrl || '').match(/-tap-(\d+)-sv-(\d+)/i);
  const episode = cfgBlock.match(/episode\s*:\s*(\d+)/i)?.[1] || epMatch?.[1] || '1';
  const server = cfgBlock.match(/server\s*:\s*(\d+)/i)?.[1] || epMatch?.[2] || '1';
  return { postId: String(postId).trim(), nonce: String(nonce).trim(), episode, server };
}

function normalizePlayerFileUrl(raw = '') {
  return String(raw).trim().replace(/\\\//g, '/').replace(/\\/g, '');
}

function extractStreamUrlFromPlayerResponse(response = '') {
  for (const m of String(response).matchAll(/["']file["']\s*:\s*["']([^"']+)["']/gi)) {
    const url = normalizePlayerFileUrl(m[1]);
    if (/^https?:\/\//i.test(url)) return url;
  }
  const m3u8 = String(response).match(/https?:\/\/[^\s"'\\]+?\.m3u8[^\s"'\\]*/i)?.[0];
  return m3u8 ? normalizePlayerFileUrl(m3u8) : null;
}

class HH4KProvider {
  constructor(opts = {}) {
    this.mainUrl = normalizeBase(opts.mainUrl || process.env.HH4K_MAIN_URL || DEFAULT_BASE);
    this.timeoutMs = Math.max(2500, Math.min(30000, Number(opts.timeoutMs || 12000)));
    this.cacheTtlMs = Math.max(30000, Math.min(3600000, Number(opts.cacheTtlMs || 300000)));
    this.categoryCache = new Map();
    this.searchCache = new Map();
    this.detailCache = new Map();
    this.streamCache = new Map();
  }

  getBaseUrl() { return this.mainUrl.replace(/\/+$/, ''); }

  headers(referer, accept = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8') {
    const h = { 'User-Agent': DEFAULT_UA, Accept: accept };
    if (referer) h.Referer = referer;
    return h;
  }

  playbackHeaders(referer) {
    return { Referer: referer, 'User-Agent': DEFAULT_UA };
  }

  async rawFetch(url, opts = {}) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), this.timeoutMs);
    try {
      return await fetch(url, { redirect: 'follow', ...opts, signal: ctl.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  async fetchText(url, referer) {
    const response = await this.rawFetch(url, { headers: this.headers(referer) });
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
    return await response.text();
  }

  async fetchCategoryPage(categoryPath = 'moi-cap-nhat', page = 1) {
    const base = this.getBaseUrl();
    let path = String(categoryPath || 'moi-cap-nhat').trim().replace(/^\/+|\/+$/g, '');
    // Accept the old bridge path too, but map it to the path from the uploaded provider.
    if (/^(?:the-loai\/)?moi-cap-nhap$/i.test(path)) path = 'moi-cap-nhat';
    const pageNo = Math.max(1, Number(page || 1));
    const key = `${path}:${pageNo}`;
    const cached = this.categoryCache.get(key);
    if (cached && cached.exp > Date.now()) return cached.value;
    const url = pageNo <= 1 ? `${base}/${path}/` : `${base}/${path}/page/${pageNo}/`;
    const html = await this.fetchText(url, base);
    const items = parseListItems(html, base);
    const value = { items, hasMore: items.length > 0, baseUrl: base };
    this.categoryCache.set(key, { value, exp: Date.now() + this.cacheTtlMs });
    return value;
  }

  async search(query) {
    const q = String(query || '').trim();
    if (!q) return [];
    const key = q.toLowerCase();
    const cached = this.searchCache.get(key);
    if (cached && cached.exp > Date.now()) return cached.value;
    const base = this.getBaseUrl();
    const url = `${base}/?s=${encodeURIComponent(q)}`;
    const html = await this.fetchText(url, base);
    const value = parseListItems(html, base);
    this.searchCache.set(key, { value, exp: Date.now() + this.cacheTtlMs });
    return value;
  }

  async loadDetail(detailUrl) {
    const url = String(detailUrl || '').trim();
    const cached = this.detailCache.get(url);
    if (cached && cached.exp > Date.now()) return cached.value;
    const base = this.getBaseUrl();
    const html = await this.fetchText(url, base);
    const value = parseDetail(html, url, base);
    this.detailCache.set(url, { value, exp: Date.now() + this.cacheTtlMs });
    return value;
  }

  async resolveStreamLinks(watchPageUrl) {
    const watchUrl = String(watchPageUrl || '').trim();
    const cached = this.streamCache.get(watchUrl);
    if (cached && cached.exp > Date.now()) return cached.value;

    const base = this.getBaseUrl();
    const pageHtml = await this.fetchText(watchUrl, base);
    const params = parseHalimWatchPageParams(pageHtml, watchUrl);
    const ajaxUrl = `${base}/wp-admin/admin-ajax.php`;
    const body = new URLSearchParams({
      action: 'halim_ajax_player',
      nonce: params.nonce,
      postid: params.postId,
      episode: params.episode,
      server: params.server
    });
    const response = await this.rawFetch(ajaxUrl, {
      method: 'POST',
      headers: {
        'User-Agent': DEFAULT_UA,
        Referer: watchUrl,
        Origin: base,
        Accept: '*/*',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
      },
      body: body.toString()
    });
    if (!response.ok) throw new Error(`PhimHHTQ AJAX HTTP ${response.status}`);
    const ajaxText = await response.text();
    const streamUrl = extractStreamUrlFromPlayerResponse(ajaxText);
    if (!streamUrl) throw new Error('PhimHHTQ: không tìm thấy file stream');

    const value = [{
      serverName: `Server ${params.server}`,
      url: streamUrl,
      isM3u8: /\.m3u8(?:$|\?)/i.test(streamUrl),
      headers: this.playbackHeaders(watchUrl),
      sourceUrl: watchUrl
    }];
    this.streamCache.set(watchUrl, { value, exp: Date.now() + Math.min(this.cacheTtlMs, 300000) });
    return value;
  }
}

module.exports = {
  HH4KProvider,
  parseListItems,
  parseEpisodes,
  parseDetail,
  parseHalimWatchPageParams,
  extractStreamUrlFromPlayerResponse,
  DEFAULT_BASE
};
