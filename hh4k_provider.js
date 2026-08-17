'use strict';

// Clean JS port of the uploaded PhimHhtqProvider.kt.
const DEFAULT_UA = 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const DEFAULT_BASE = 'https://phimhhtq.com';

const uniq = (arr, key = x => x) => {
  const seen = new Set();
  return (arr || []).filter(x => { const k = key(x); if (!k || seen.has(k)) return false; seen.add(k); return true; });
};
const decodeHtml = s => String(s || '').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>');
const strip = s => decodeHtml(String(s || '').replace(/<script\b[\s\S]*?<\/script>/gi,' ').replace(/<style\b[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim());
function attr(tag, name) {
  const safe = String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let m = String(tag || '').match(new RegExp(`\\b${safe}\\s*=\\s*"([^"]*)"`, 'i'));
  if (!m) m = String(tag || '').match(new RegExp(`\\b${safe}\\s*=\\s*'([^']*)'`, 'i'));
  if (!m) m = String(tag || '').match(new RegExp(`\\b${safe}\\s*=\\s*([^\\s>]+)`, 'i'));
  return decodeHtml(m?.[1] || '');
}
const classHas = (tag, token) => new RegExp(`(?:^|\\s)${token}(?:\\s|$)`, 'i').test(attr(tag, 'class'));
function fixUrl(raw, base) {
  const v = decodeHtml(String(raw || '').trim()).replace(/\\\//g, '/');
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  if (v.startsWith('//')) return 'https:' + v;
  return String(base).replace(/\/+$/,'') + (v.startsWith('/') ? v : '/' + v);
}
function metaContent(html, key) {
  for (const m of String(html).matchAll(/<meta\b[^>]*>/gi)) {
    const t = m[0], k = attr(t,'property') || attr(t,'name');
    if (k.toLowerCase() === String(key).toLowerCase()) return attr(t,'content') || null;
  }
  return null;
}
function tagged(html, tagName, classToken) {
  const re = new RegExp(`<${tagName}\\b[^>]*>[\\s\\S]*?<\\/${tagName}>`, 'gi');
  for (const m of String(html).matchAll(re)) {
    const open = m[0].match(new RegExp(`^<${tagName}\\b[^>]*>`, 'i'))?.[0] || '';
    if (!classToken || classHas(open, classToken)) return m[0];
  }
  return '';
}
function parseListItem(block, base) {
  const title = strip(tagged(block, 'h2', 'entry-title'));
  if (!title) return null;
  let a = '';
  for (const m of String(block).matchAll(/<a\b[^>]*>/gi)) if (classHas(m[0], 'halim-thumb')) { a = m[0]; break; }
  const detailUrl = fixUrl(attr(a, 'href'), base);
  if (!detailUrl) return null;
  const figure = tagged(block, 'figure');
  const img = String(figure || block).match(/<img\b[^>]*>/i)?.[0] || '';
  const posterUrl = fixUrl(attr(img,'src') || attr(img,'data-src'), base);
  let episodeLabel = null;
  for (const m of String(block).matchAll(/<span\b[^>]*>[\s\S]*?<\/span>/gi)) {
    const open = m[0].match(/^<span\b[^>]*>/i)?.[0] || '';
    if (classHas(open, 'episode')) { episodeLabel = strip(m[0]) || null; break; }
  }
  return { title, detailUrl, posterUrl, episodeLabel, qualityLabel: null };
}
function parseListItems(html, base) {
  const out = [];
  for (const m of String(html).matchAll(/<article\b[^>]*>[\s\S]*?<\/article>/gi)) {
    const open = m[0].match(/^<article\b[^>]*>/i)?.[0] || '';
    if (!classHas(open, 'thumb')) continue;
    const item = parseListItem(m[0], base);
    if (item) out.push(item);
  }
  return uniq(out, x => x.detailUrl);
}
function parseEpisodes(html, base) {
  const out = [];
  const ul = [...String(html).matchAll(/<ul\b[^>]*>[\s\S]*?<\/ul>/gi)].find(m => classHas(m[0].match(/^<ul\b[^>]*>/i)?.[0] || '', 'halim-list-eps'))?.[0] || String(html);
  for (const m of ul.matchAll(/<li\b[^>]*>[\s\S]*?<\/li>/gi)) {
    const liOpen = m[0].match(/^<li\b[^>]*>/i)?.[0] || '';
    if (ul !== html && !classHas(liOpen, 'halim-episode')) continue;
    const a = m[0].match(/<a\b[^>]*>[\s\S]*?<\/a>/i)?.[0] || '';
    const aOpen = a.match(/^<a\b[^>]*>/i)?.[0] || '';
    const label = strip(a), watchUrl = fixUrl(attr(aOpen,'href'), base);
    if (!label || !watchUrl) continue;
    const n = label.match(/\d+(?:\.\d+)?/)?.[0];
    out.push({ name: `Tập ${label}`, number: n ? Number(n) : null, watchUrl, serverName: 'Halim', vip: false });
  }
  return uniq(out, x => x.watchUrl);
}
function parseDetail(html, detailUrl, base) {
  const title = strip(tagged(html, 'h1', 'entry-title')) || strip(metaContent(html,'og:title') || '').split('|')[0].trim();
  if (!title) throw new Error('PhimHHTQ: không đọc được tên phim');
  let movieThumb = '';
  for (const m of String(html).matchAll(/<img\b[^>]*>/gi)) if (classHas(m[0], 'movie-thumb')) { movieThumb = m[0]; break; }
  const posterUrl = fixUrl(attr(movieThumb,'src'), base) || fixUrl(metaContent(html,'og:image'), base);
  const ogImage = fixUrl(metaContent(html,'og:image'), base);
  const w = Number(metaContent(html,'og:image:width') || 0), h = Number(metaContent(html,'og:image:height') || 0);
  const bannerUrl = ogImage && w > h ? ogImage : (ogImage && ogImage !== posterUrl ? ogImage : null);
  const year = strip(html).match(/(?:19|20)\d{2}/)?.[0];
  let overview = null;
  const entry = tagged(html, 'div', 'entry-content');
  if (entry) overview = strip(entry.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1] || entry) || null;
  return { title, detailUrl, posterUrl, bannerUrl, overview, year: year ? Number(year) : null, genres: ['Hoạt hình Trung Quốc'], episodes: parseEpisodes(html, base), recommendations: [] };
}
function parseHalimWatchPageParams(html, watchUrl) {
  const cfg = String(html).match(/var\s+halim_cfg\s*=\s*\{([^}]+)\}/i)?.[1] || '';
  const postId = cfg.match(/post_id\s*:\s*(\d+)/i)?.[1] || String(html).match(/postid-(\d+)/i)?.[1] || String(html).match(/post_id\s*:\s*(\d+)/i)?.[1];
  const nonce = String(html).match(/ajax_player\s*=\s*\{[^}]*["']nonce["']\s*:\s*["']([a-zA-Z0-9]+)["']/i)?.[1];
  if (!postId) throw new Error('PhimHHTQ: không tìm thấy post_id');
  if (!nonce) throw new Error('PhimHHTQ: không tìm thấy nonce (ajax_player)');
  const ep = String(watchUrl).match(/-tap-(\d+)-sv-(\d+)/i);
  return { postId, nonce, episode: cfg.match(/episode\s*:\s*(\d+)/i)?.[1] || ep?.[1] || '1', server: cfg.match(/server\s*:\s*(\d+)/i)?.[1] || ep?.[2] || '1' };
}
function extractStreamUrlFromPlayerResponse(text) {
  for (const m of String(text).matchAll(/["']file["']\s*:\s*["']([^"']+)["']/gi)) {
    const u = m[1].trim().replace(/\\\//g,'/').replace(/\\/g,'');
    if (/^https?:\/\//i.test(u)) return u;
  }
  return String(text).match(/https?:\/\/[^\s"'\\]+?\.m3u8[^\s"'\\]*/i)?.[0]?.replace(/\\\//g,'/') || null;
}

class HH4KProvider {
  constructor(opts = {}) {
    this.mainUrl = String(opts.mainUrl || process.env.HH4K_MAIN_URL || DEFAULT_BASE).replace(/\/+$/,'');
    this.timeoutMs = Math.max(2500, Math.min(30000, Number(opts.timeoutMs || 12000)));
    this.cacheTtlMs = Math.max(30000, Math.min(3600000, Number(opts.cacheTtlMs || 300000)));
    this.cache = new Map();
  }
  getBaseUrl() { return this.mainUrl; }
  headers(referer) { const h = { 'User-Agent': DEFAULT_UA, Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' }; if (referer) h.Referer = referer; return h; }
  async rawFetch(url, opts = {}) { const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), this.timeoutMs); try { return await fetch(url, { redirect:'follow', ...opts, signal:ctl.signal }); } finally { clearTimeout(t); } }
  async fetchText(url, referer) { const r = await this.rawFetch(url, { headers:this.headers(referer) }); if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`); return r.text(); }
  async cached(key, fn, ttl = this.cacheTtlMs) { const c = this.cache.get(key); if (c && c.exp > Date.now()) return c.value; const value = await fn(); this.cache.set(key,{value,exp:Date.now()+ttl}); return value; }
  async fetchCategoryPage(categoryPath='moi-cap-nhat', page=1) {
    const base=this.getBaseUrl(); let path=String(categoryPath).trim().replace(/^\/+|\/+$/g,''); if (/^(?:the-loai\/)?moi-cap-nhap$/i.test(path)) path='moi-cap-nhat';
    const p=Math.max(1,Number(page||1)), url=p===1?`${base}/${path}/`:`${base}/${path}/page/${p}/`;
    return this.cached(`cat:${url}`, async()=>{ const html=await this.fetchText(url,base); const items=parseListItems(html,base); return {items,hasMore:items.length>0,baseUrl:base}; });
  }
  async search(query) { const q=String(query||'').trim(); if(!q)return[]; const base=this.getBaseUrl(),url=`${base}/?s=${encodeURIComponent(q)}`; return this.cached(`search:${q.toLowerCase()}`,async()=>parseListItems(await this.fetchText(url,base),base)); }
  async loadDetail(url) { const base=this.getBaseUrl(); return this.cached(`detail:${url}`,async()=>parseDetail(await this.fetchText(url,base),url,base)); }
  async resolveStreamLinks(watchUrl) {
    return this.cached(`stream:${watchUrl}`, async()=>{
      const base=this.getBaseUrl(), html=await this.fetchText(watchUrl,base), p=parseHalimWatchPageParams(html,watchUrl);
      const body=new URLSearchParams({action:'halim_ajax_player',nonce:p.nonce,postid:p.postId,episode:p.episode,server:p.server});
      const r=await this.rawFetch(`${base}/wp-admin/admin-ajax.php`,{method:'POST',headers:{'User-Agent':DEFAULT_UA,Referer:watchUrl,Origin:base,Accept:'*/*','Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'},body:body.toString()});
      if(!r.ok)throw new Error(`PhimHHTQ AJAX HTTP ${r.status}`); const url=extractStreamUrlFromPlayerResponse(await r.text()); if(!url)throw new Error('PhimHHTQ: không tìm thấy file stream');
      return [{serverName:`Server ${p.server}`,url,isM3u8:/\.m3u8(?:$|\?)/i.test(url),headers:{Referer:watchUrl,'User-Agent':DEFAULT_UA},sourceUrl:watchUrl}];
    },300000);
  }
}
module.exports={HH4KProvider,parseListItems,parseEpisodes,parseDetail,parseHalimWatchPageParams,extractStreamUrlFromPlayerResponse,DEFAULT_BASE};
