'use strict';

const DEFAULT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const DEFAULT_BASE = 'https://hhhtq.team';
const CATEGORY_PATHS = Object.freeze({
  'hhtq-new': '/',
  'hhtq-costume': '/show/1--------/',
  'hhtq-modern': '/show/2--------/',
  'hhtq-fantasy': '/show/4--------/',
  'hhtq-scifi': '/show/5--------/',
  'hhtq-movies': '/show/6-----------/'
});

const uniq = (arr, key = x => x) => {
  const seen = new Set();
  return (arr || []).filter(x => { const k = key(x); if (!k || seen.has(k)) return false; seen.add(k); return true; });
};
function decodeHtml(s) {
  return String(s || '').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>');
}
function strip(s) {
  return decodeHtml(String(s || '').replace(/<script\b[\s\S]*?<\/script>/gi,' ').replace(/<style\b[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim());
}
function attr(tag, name) {
  const safe = String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let m = String(tag || '').match(new RegExp(`\\b${safe}\\s*=\\s*"([^"]*)"`, 'i'));
  if (!m) m = String(tag || '').match(new RegExp(`\\b${safe}\\s*=\\s*'([^']*)'`, 'i'));
  if (!m) m = String(tag || '').match(new RegExp(`\\b${safe}\\s*=\\s*([^\\s>]+)`, 'i'));
  return decodeHtml(m?.[1] || '');
}
function fixUrl(raw, base = DEFAULT_BASE) {
  const v = decodeHtml(String(raw || '').trim()).replace(/\\\//g, '/');
  if (!v || /^javascript:/i.test(v) || v === '#') return null;
  try { return new URL(v, base).toString(); } catch { return null; }
}
function metaContent(html, key) {
  for (const m of String(html).matchAll(/<meta\b[^>]*>/gi)) {
    const t = m[0], k = attr(t,'property') || attr(t,'name');
    if (k.toLowerCase() === String(key).toLowerCase()) return attr(t,'content') || null;
  }
  return null;
}
function pickImage(fragment, base) {
  const img = String(fragment || '').match(/<img\b[^>]*>/i)?.[0] || '';
  const raw = attr(img,'data-original') || attr(img,'data-src') || attr(img,'src');
  return fixUrl(raw, base);
}
function titleFromAnchor(a) {
  return strip(attr(a,'title') || attr(a,'data-original-title') || a.replace(/^<a\b[^>]*>/i,'').replace(/<\/a>$/i,''));
}
function itemType(title, episodeLabel, href) {
  const s = `${title || ''} ${episodeLabel || ''} ${href || ''}`;
  return /\bmovie\b|\[movie\]|\(movie\)|chiếu rạp|chieu rap/i.test(s) ? 'movie' : 'series';
}

function parseListItems(html, base = DEFAULT_BASE, forcedType = null) {
  const full = String(html || '');
  const out = [];
  const anchorRe = /<a\b[^>]*href=["'][^"']*\/phim\/[^"']+["'][^>]*>[\s\S]*?<\/a>/gi;
  for (const m of full.matchAll(anchorRe)) {
    const a = m[0], open = a.match(/^<a\b[^>]*>/i)?.[0] || '';
    const detailUrl = fixUrl(attr(open,'href'), base);
    if (!detailUrl) continue;
    const windowStart = Math.max(0, (m.index || 0) - 900);
    const windowEnd = Math.min(full.length, (m.index || 0) + a.length + 1200);
    const context = full.slice(windowStart, windowEnd);
    let title = titleFromAnchor(a);
    if (!title) title = strip(context.match(/<(?:h3|h4|h5)\b[^>]*>[\s\S]*?<\/(?:h3|h4|h5)>/i)?.[0] || '');
    if (!title) continue;
    const posterUrl = pickImage(a, base) || pickImage(context, base);
    const episodeLabel = strip(context.match(/<(?:span|p)\b[^>]*(?:pic-text|text-right|remarks|episode)[^>]*>[\s\S]*?<\/(?:span|p)>/i)?.[0] || '') || null;
    const type = forcedType || itemType(title, episodeLabel, detailUrl);
    out.push({ title, detailUrl, posterUrl, episodeLabel, type });
  }
  return uniq(out, x => x.detailUrl);
}

function parseEpisodes(html, base = DEFAULT_BASE) {
  const full = String(html || '');
  const out = [];
  const selectors = [
    /<a\b[^>]*href=["'][^"']*\/xem\/[^"']+["'][^>]*>[\s\S]*?<\/a>/gi,
    /<a\b[^>]*class=["'][^"']*episode-link[^"']*["'][^>]*>[\s\S]*?<\/a>/gi
  ];
  for (const re of selectors) {
    for (const m of full.matchAll(re)) {
      const a = m[0], open = a.match(/^<a\b[^>]*>/i)?.[0] || '';
      const watchUrl = fixUrl(attr(open,'href'), base);
      if (!watchUrl) continue;
      const label = strip(a) || attr(open,'title') || 'Tập phim';
      const num = label.match(/(?:tập|tap|episode|ep)?\s*(\d+(?:\.\d+)?)/i)?.[1];
      out.push({ name:label, number:num ? Number(num) : null, watchUrl, serverName:attr(open,'data-server') || attr(open,'data-sv') || 'HHTQ' });
    }
  }
  return uniq(out, x => x.watchUrl);
}

function parseDetail(html, detailUrl, base = DEFAULT_BASE) {
  const full = String(html || '');
  let title = strip(full.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/i)?.[0] || '');
  if (!title) title = strip(metaContent(full,'og:title') || '').split('|')[0].trim();
  if (!title) throw new Error('HHTQ: không đọc được tên phim');
  const posterUrl = fixUrl(metaContent(full,'og:image'), base) || pickImage(full.match(/myui-content__thumb[\s\S]{0,1200}/i)?.[0] || full, base);
  const background = fixUrl(metaContent(full,'og:image'), base) || posterUrl;
  const description = metaContent(full,'description') || metaContent(full,'og:description') || strip(full.match(/<(?:div|p)\b[^>]*(?:content|plot|desc|sketch)[^>]*>[\s\S]*?<\/(?:div|p)>/i)?.[0] || '') || null;
  const year = strip(full).match(/(?:19|20)\d{2}/)?.[0];
  const genres = uniq([...full.matchAll(/<a\b[^>]*href=["'][^"']*(?:the-loai|show\/)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi)].map(m => strip(m[1])).filter(Boolean));
  const episodes = parseEpisodes(full, base);
  const type = itemType(title, episodes.length === 1 ? episodes[0].name : '', detailUrl);
  return { title, detailUrl, posterUrl, background, description, year:year ? Number(year) : null, genres:genres.length ? genres : ['Hoạt hình Trung Quốc'], episodes, type:type === 'movie' || episodes.length <= 1 && /\bfull\b/i.test(strip(full)) ? 'movie' : 'series' };
}

function collectSourceCandidates(html, pageUrl, base = DEFAULT_BASE) {
  const full = String(html || '');
  const out = [];
  const add = (raw, label, headers = {}) => {
    const url = fixUrl(raw, pageUrl || base);
    if (!url || !/^https?:\/\//i.test(url)) return;
    out.push({ url, serverName:label || 'HHTQ', headers });
  };
  for (const m of full.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/gi)) {
    const a = m[0], open = a.match(/^<a\b[^>]*>/i)?.[0] || '';
    const cls = attr(open,'class'), dataPlay = attr(open,'data-play');
    const isPlayer = /episode-link/i.test(cls) || dataPlay === 'api' || /links-backup/i.test(full.slice(Math.max(0,(m.index||0)-180),(m.index||0)));
    if (!isPlayer) continue;
    add(attr(open,'href') || attr(open,'data-url') || attr(open,'data-src') || attr(open,'data-link'), strip(a) || attr(open,'title') || 'HHTQ');
  }
  for (const m of full.matchAll(/<iframe\b[^>]*>/gi)) add(attr(m[0],'src') || attr(m[0],'data-src'), 'HHTQ iframe');
  for (const m of full.matchAll(/(?:file|src|url)\s*[:=]\s*["'](https?:\\?\/\\?\/[^"']+)["']/gi)) add(m[1], 'HHTQ source');
  for (const m of full.matchAll(/["'](https?:\\?\/\\?\/[^"']+\.(?:m3u8|mp4)(?:\?[^"']*)?)["']/gi)) add(m[1], 'HHTQ direct');
  return uniq(out, x => x.url);
}
function isDirectMedia(url) { return /\.(?:m3u8|mp4)(?:$|\?)/i.test(String(url || '')); }
function isPublicHttpUrl(raw) {
  try {
    const u = new URL(raw); if (!/^https?:$/.test(u.protocol)) return false;
    const h = u.hostname.toLowerCase();
    if (h === 'localhost' || h === '0.0.0.0' || h === '::1' || /^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || /^169\.254\./.test(h)) return false;
    const m = h.match(/^172\.(\d+)\./); if (m && Number(m[1]) >= 16 && Number(m[1]) <= 31) return false;
    return true;
  } catch { return false; }
}

class HHTQProvider {
  constructor(opts = {}) {
    this.mainUrl = String(opts.mainUrl || process.env.HHTQ_MAIN_URL || DEFAULT_BASE).replace(/\/+$/,'');
    this.timeoutMs = Math.max(2500, Math.min(30000, Number(opts.timeoutMs || process.env.HHTQ_TIMEOUT_MS || 10000)));
    this.cacheTtlMs = Math.max(30000, Math.min(3600000, Number(opts.cacheTtlMs || process.env.HHTQ_CACHE_TTL_MS || 300000)));
    this.cache = new Map();
  }
  headers(referer, accept = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8') { const h={ 'User-Agent':DEFAULT_UA, Accept:accept }; if(referer) h.Referer=referer; return h; }
  async rawFetch(url, opts = {}) { if(!isPublicHttpUrl(url)) throw new Error('HHTQ: blocked non-public URL'); const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),this.timeoutMs); try{return await fetch(url,{redirect:'follow',...opts,signal:ctl.signal});}finally{clearTimeout(timer);} }
  async fetchText(url, referer) { const r=await this.rawFetch(url,{headers:this.headers(referer)}); if(!r.ok) throw new Error(`HHTQ HTTP ${r.status}`); return r.text(); }
  async cached(key, fn, ttl = this.cacheTtlMs) { const hit=this.cache.get(key); if(hit&&hit.exp>Date.now()) return hit.value; const value=await fn(); this.cache.set(key,{value,exp:Date.now()+ttl}); if(this.cache.size>800)this.cache.delete(this.cache.keys().next().value); return value; }
  categoryUrl(catalogId,page=1){const path=CATEGORY_PATHS[catalogId]||'/';const root=new URL(path,this.mainUrl+'/').toString();if(page<=1)return root;return root.replace(/\/$/,'')+`/page/${page}/`;}
  async catalog(catalogId='hhtq-new',page=1){const type=catalogId==='hhtq-movies'?'movie':'series';const url=this.categoryUrl(catalogId,Math.max(1,Number(page||1)));return this.cached(`cat:${url}`,async()=>parseListItems(await this.fetchText(url,this.mainUrl),this.mainUrl,type));}
  async search(query){const q=String(query||'').trim();if(!q)return[];const url=`${this.mainUrl}/vod/search/?wd=${encodeURIComponent(q)}`;return this.cached(`search:${q.toLowerCase()}`,async()=>parseListItems(await this.fetchText(url,this.mainUrl),this.mainUrl));}
  async detail(detailUrl){return this.cached(`detail:${detailUrl}`,async()=>parseDetail(await this.fetchText(detailUrl,this.mainUrl),detailUrl,this.mainUrl));}
  async probeCandidate(candidate,referer){const url=candidate.url;if(isDirectMedia(url))return[{...candidate,isM3u8:/\.m3u8(?:$|\?)/i.test(url),externalUrl:null}];const rumble=url.match(/rumble\.com\/(?:embed\/)?(?:v)?([a-z0-9]+)(?:[/?]|$)/i);if(rumble&&/\/embed\//i.test(url)){const hls=`https://rumble.com/hls-vod/${rumble[1]}/playlist.m3u8?u=0&b=0`;return[{...candidate,url:hls,serverName:`${candidate.serverName} • Rumble`,isM3u8:true,externalUrl:null}];}try{const html=await this.fetchText(url,referer||this.mainUrl);const nested=collectSourceCandidates(html,url,this.mainUrl).filter(x=>x.url!==url);const direct=nested.filter(x=>isDirectMedia(x.url));if(direct.length)return direct.map(x=>({...x,serverName:candidate.serverName,headers:{Referer:url,'User-Agent':DEFAULT_UA},isM3u8:/\.m3u8(?:$|\?)/i.test(x.url),externalUrl:null}));}catch{}return[{...candidate,externalUrl:url,url:null,isM3u8:false}];}
  async streams(watchUrl){return this.cached(`streams:${watchUrl}`,async()=>{const html=await this.fetchText(watchUrl,this.mainUrl);const candidates=collectSourceCandidates(html,watchUrl,this.mainUrl);const settled=await Promise.allSettled(candidates.slice(0,12).map(c=>this.probeCandidate(c,watchUrl)));const out=[];for(const r of settled)if(r.status==='fulfilled')out.push(...r.value);return uniq(out,x=>x.url||x.externalUrl).map(x=>({serverName:x.serverName||'HHTQ',url:x.url||null,externalUrl:x.externalUrl||null,isM3u8:!!x.isM3u8,headers:x.headers&&Object.keys(x.headers).length?x.headers:{Referer:watchUrl,'User-Agent':DEFAULT_UA},sourceUrl:watchUrl}));},180000);}
}

module.exports = { HHTQProvider, DEFAULT_BASE, DEFAULT_UA, CATEGORY_PATHS, parseListItems, parseEpisodes, parseDetail, collectSourceCandidates, itemType, fixUrl };
