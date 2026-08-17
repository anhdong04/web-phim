'use strict';

// HH4K/HHTQ provider. Parser follows the uploaded HaLim provider flow,
// using an accessible HHTQ 4K mirror for server-side Nuvio deployment.
const DEFAULT_UA = 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const DEFAULT_BASE = 'https://hhtq.sh';
const PLAYER_TYPES = [
  ['vip4k_v2', 'Vietsub 4K V2'],
  ['vip4k', 'Vietsub 4K V1'],
  ['pro', 'Vietsub 1080 V2'],
  ['tiktik', 'Vietsub 1080 V1'],
  ['vip4ktm_v2', 'Thuyết minh 4K V2'],
  ['vip4ktm', 'Thuyết minh 4K V1'],
  ['pro_tm', 'Thuyết minh 1080 V2'],
  ['tiktm', 'Thuyết minh 1080 V1']
];

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
const classHas = (tag, token) => new RegExp(`(?:^|\\s)${String(token).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?:\\s|$)`, 'i').test(attr(tag, 'class'));
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
  return { title, detailUrl, posterUrl, episodeLabel, qualityLabel: episodeLabel?.match(/\[(?:4K|HD|1080P?)\]/i)?.[0] || null };
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
  const full = String(html);
  const ul = [...full.matchAll(/<ul\b[^>]*>[\s\S]*?<\/ul>/gi)].find(m => classHas(m[0].match(/^<ul\b[^>]*>/i)?.[0] || '', 'halim-list-eps'))?.[0] || full;
  for (const m of ul.matchAll(/<li\b[^>]*>[\s\S]*?<\/li>/gi)) {
    const liOpen = m[0].match(/^<li\b[^>]*>/i)?.[0] || '';
    if (ul !== full && !classHas(liOpen, 'halim-episode')) continue;
    const a = m[0].match(/<a\b[^>]*>[\s\S]*?<\/a>/i)?.[0] || '';
    const aOpen = a.match(/^<a\b[^>]*>/i)?.[0] || '';
    const rawLabel = strip(a).trim();
    const watchUrl = fixUrl(attr(aOpen,'href'), base);
    if (!rawLabel || !watchUrl) continue;
    const cleanLabel = rawLabel.replace(/^Tập\s+/i, '').trim();
    const n = cleanLabel.match(/\d+(?:\.\d+)?/)?.[0];
    out.push({
      name: `Tập ${cleanLabel}`,
      number: n ? Number(n) : null,
      watchUrl,
      serverName: 'HHTQ',
      vip: false,
      postId: attr(aOpen, 'data-post-id') || null,
      chapter: attr(aOpen, 'data-ep') || null,
      server: attr(aOpen, 'data-sv') || '1'
    });
  }
  return uniq(out, x => x.watchUrl);
}
function parseDetail(html, detailUrl, base) {
  const title = strip(tagged(html, 'h1', 'entry-title')) || strip(metaContent(html,'og:title') || '').split('|')[0].trim();
  if (!title) throw new Error('HH4K: không đọc được tên phim');
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
  return { title, detailUrl, posterUrl, bannerUrl, overview, year: year ? Number(year) : null, genres: ['Hoạt hình Trung Quốc', '4K'], episodes: parseEpisodes(html, base), recommendations: [] };
}
function activePlayerParams(html, watchUrl) {
  const full = String(html);
  let selected = '';
  for (const m of full.matchAll(/<a\b[^>]*data-post-id=[^>]*>/gi)) {
    const href = fixUrl(attr(m[0], 'href'), DEFAULT_BASE);
    if (href === watchUrl || /\bactive\b/i.test(full.slice(Math.max(0,m.index-160),m.index))) { selected = m[0]; break; }
    if (!selected) selected = m[0];
  }
  const postId = attr(selected,'data-post-id') || full.match(/var\s+DoPostInfo\s*=\s*\{[\s\S]*?\bid\s*:\s*(\d+)/i)?.[1] || full.match(/data-id=["'](\d+)["']/i)?.[1];
  const chapter = attr(selected,'data-ep') || String(watchUrl).match(/\/(tap-[^/.]+)\.html/i)?.[1];
  const server = attr(selected,'data-sv') || '1';
  if (!postId || !chapter) throw new Error('HH4K: thiếu tham số player');
  return { postId, chapter, server };
}
function iframeUrl(html, base) {
  const iframe = String(html).match(/<iframe\b[^>]*>/i)?.[0] || '';
  return fixUrl(attr(iframe,'src') || attr(iframe,'data-src'), base);
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
      const base=this.getBaseUrl();
      const html=await this.fetchText(watchUrl,base);
      const p=activePlayerParams(html,watchUrl);
      const out=[];
      for (const [type,label] of PLAYER_TYPES) {
        try {
          const q=new URLSearchParams({action:'dox_ajax_player',post_id:p.postId,chapter_st:p.chapter,type,sv:p.server});
          const r=await this.rawFetch(`${base}/player/player.php?${q.toString()}`,{headers:{'User-Agent':DEFAULT_UA,Referer:watchUrl,Accept:'text/html,*/*'}});
          if(!r.ok) continue;
          const embed=iframeUrl(await r.text(),base);
          if(!embed) continue;
          out.push({serverName:label,externalUrl:embed,url:null,isM3u8:false,headers:{Referer:watchUrl,'User-Agent':DEFAULT_UA},sourceUrl:watchUrl,embedUrl:embed});
        } catch {}
      }
      if(!out.length) throw new Error('HH4K: player không trả nguồn');
      return uniq(out,x=>x.embedUrl);
    },300000);
  }
}
module.exports={HH4KProvider,parseListItems,parseEpisodes,parseDetail,activePlayerParams,iframeUrl,DEFAULT_BASE,PLAYER_TYPES};
