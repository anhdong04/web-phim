const DEFAULT_UA = 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const FALLBACK_BASES = ['https://yanhh3d.im', 'https://yanhh3d.mx'];
const BLOCKED = ['short.icu', 'streamc.xyz', 'freeplayervideo.com', 'abysscdn.com'];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function uniq(items, key = x => x) { const seen = new Set(); return items.filter(x => { const k = key(x); if (seen.has(k)) return false; seen.add(k); return true; }); }
function decodeHtml(s = '') {
  return String(s)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}
function stripTags(s = '') { return decodeHtml(String(s).replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()); }
function attr(tag = '', name = '') {
  const m = String(tag).match(new RegExp('\\b' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i'));
  return decodeHtml(m ? (m[1] ?? m[2] ?? m[3] ?? '') : '');
}
function classes(tag = '') { return attr(tag, 'class').toLowerCase().split(/\s+/).filter(Boolean); }
function absUrl(raw, base) {
  const v = String(raw || '').trim(); if (!v) return null;
  try { if (v.startsWith('//')) return 'https:' + v; return new URL(v, String(base || '').replace(/\/+$/, '') + '/').toString(); } catch { return null; }
}
function ensureHttps(url = '') { return String(url).replace(/^http:\/\//i, 'https://'); }
function originOf(url = '') { try { const u = new URL(url); return u.origin; } catch { return ''; } }
function epNum(text = '') { const m = String(text).match(/\d+(?:\.\d+)?/); return m ? Number(m[0]) : null; }
function normalizeBase(url = '') { const s = String(url).trim().replace(/\/+$/, ''); return /^https?:\/\//i.test(s) ? s : 'https://' + s; }
function parseJsonSafe(s) { try { return JSON.parse(s); } catch { return null; } }

function parseListItems(html, baseUrl) {
  const out = [];
  const heads = [...String(html).matchAll(/<h3\b[^>]*class=(?:"[^"]*film-name[^"]*"|'[^']*film-name[^']*')[^>]*>[\s\S]*?<\/h3>/gi)];
  for (let i = 0; i < heads.length; i++) {
    const h = heads[i], h3 = h[0];
    const a = h3.match(/<a\b[^>]*>[\s\S]*?<\/a>/i)?.[0]; if (!a) continue;
    const title = stripTags(a); const detailUrl = absUrl(attr(a, 'href'), baseUrl); if (!title || !detailUrl) continue;
    const backStart = Math.max(0, h.index - 3500), pre = html.slice(backStart, h.index);
    const marker = Math.max(pre.toLowerCase().lastIndexOf('flw-item'), pre.toLowerCase().lastIndexOf('film-poster'));
    const start = marker >= 0 ? Math.max(backStart, backStart + marker - 300) : Math.max(0, h.index - 1600);
    const end = i + 1 < heads.length ? heads[i + 1].index : Math.min(html.length, h.index + h3.length + 1800);
    const block = html.slice(start, end);
    const imgs = [...block.matchAll(/<img\b[^>]*>/gi)].map(x => x[0]);
    let posterUrl = null;
    for (const img of imgs) {
      if (!classes(img).includes('film-poster-img') && !/film-poster/i.test(img)) continue;
      const raw = attr(img, 'data-src') || attr(img, 'data-original') || attr(img, 'src');
      if (raw && !/^data:image/i.test(raw)) { posterUrl = absUrl(raw, baseUrl); if (posterUrl) break; }
    }
    const tickRate = block.match(/<div\b[^>]*class=(?:"[^"]*tick-rate[^"]*"|'[^']*tick-rate[^']*')[^>]*>([\s\S]*?)<\/div>/i)?.[1];
    const qualityBlock = block.match(/<(?:div|span)\b[^>]*class=(?:"[^"]*(?:tick-quality|quality)[^"]*"|'[^']*(?:tick-quality|quality)[^']*')[^>]*>([\s\S]*?)<\/(?:div|span)>/i)?.[1]
      || block.match(/<(?:div|span)\b[^>]*class=(?:"[^"]*(?:tick-dub|tick-sub)[^"]*"|'[^']*(?:tick-dub|tick-sub)[^']*')[^>]*>([\s\S]*?)<\/(?:div|span)>/i)?.[1];
    out.push({ title, detailUrl, posterUrl, episodeCount: epNum(stripTags(tickRate || '')), qualityLabel: stripTags(qualityBlock || '') || null });
  }
  return uniq(out, x => x.detailUrl);
}

function firstTagText(html, tags, classNeedle) {
  for (const tag of tags) {
    const re = new RegExp('<' + tag + '\\b[^>]*class=(?:"[^"]*' + classNeedle + '[^"]*"|\'[^\']*' + classNeedle + '[^\']*\')[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 'i');
    const m = String(html).match(re); if (m) { const t = stripTags(m[1]); if (t) return t; }
  }
  return null;
}
function metaContent(html, prop) {
  for (const m of String(html).matchAll(/<meta\b[^>]*>/gi)) {
    const tag = m[0]; if ((attr(tag, 'property') || attr(tag, 'name')).toLowerCase() === String(prop).toLowerCase()) return attr(tag, 'content') || null;
  }
  return null;
}
function parseEpisodePairs(html, baseUrl) {
  const out = [];
  for (const m of String(html).matchAll(/<a\b[^>]*class=(?:"[^"]*ssl-item[^"]*"|'[^']*ssl-item[^']*')[^>]*>[\s\S]*?<\/a>/gi)) {
    const tag = m[0], open = tag.match(/^<a\b[^>]*>/i)?.[0] || '';
    const href = absUrl(attr(open, 'href'), baseUrl); if (!href) continue;
    const order = attr(open, 'title') || stripTags(tag.match(/<[^>]*class=(?:"[^"]*ssli-order[^"]*"|'[^']*ssli-order[^']*')[^>]*>([\s\S]*?)<\//i)?.[1] || '') || String(epNum(stripTags(tag)) || '');
    const num = epNum(order || stripTags(tag)); if (num == null) continue;
    out.push({ number: num, url: href });
  }
  return uniq(out, x => x.url);
}

class YanHH3DProvider {
  constructor(opts = {}) {
    this.mainUrl = normalizeBase(opts.mainUrl || 'https://yanhh3d.im');
    this.timeoutMs = Math.max(2500, Math.min(20000, Number(opts.timeoutMs || 8000)));
    this.cacheTtlMs = Math.max(30000, Math.min(3600000, Number(opts.cacheTtlMs || 600000)));
    this.minIntervalMs = Math.max(100, Number(opts.minIntervalMs || 450));
    this.cachedBase = null; this.cachedBaseAt = 0; this.lastHtmlAt = 0; this.queue = Promise.resolve();
    this.categoryCache = new Map(); this.searchCache = new Map(); this.detailCache = new Map(); this.streamCache = new Map();
  }
  headers(referer, accept = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8') {
    const h = { 'User-Agent': DEFAULT_UA, Accept: accept };
    if (referer) h.Referer = referer;
    return h;
  }
  playbackHeaders(referer) {
    const ref = String(referer || this.mainUrl).trim();
    return { 'User-Agent': DEFAULT_UA, Referer: ref, Origin: originOf(ref), Accept: '*/*' };
  }
  async rawFetch(url, opts = {}, timeout = this.timeoutMs) {
    const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), timeout);
    try { return await fetch(url, { redirect: 'follow', ...opts, signal: ctl.signal }); } finally { clearTimeout(timer); }
  }
  async fetchHtmlOnce(url, referer) {
    const r = await this.rawFetch(url, { headers: this.headers(referer) });
    if (!r.ok) { const e = new Error('HTTP ' + r.status + ' for ' + url); e.status = r.status; throw e; }
    return await r.text();
  }
  async fetchHtml(url, referer) {
    const job = this.queue.then(async () => {
      const wait = this.minIntervalMs - (Date.now() - this.lastHtmlAt); if (wait > 0) await sleep(wait); this.lastHtmlAt = Date.now();
      let backoff = 1200, last;
      for (let attempt = 0; attempt < 4; attempt++) {
        try { return await this.fetchHtmlOnce(url, referer); }
        catch (e) { last = e; if (e.status !== 429 || attempt === 3) throw e; await sleep(backoff); backoff = Math.min(8000, backoff * 2); }
      }
      throw last || new Error('YanHH3D fetch failed');
    });
    this.queue = job.catch(() => {}); return job;
  }
  isCatalogHtml(html) { return /film_list-wrap|flw-item/i.test(String(html)); }
  announcementCandidates(html) {
    const out = [];
    for (const m of String(html).matchAll(/https?:\/\/(?:www\.)?yanhh3d\.[a-z]{2,}(?:\/[^\s"'<>]*)?/gi)) out.push(normalizeBase(m[0].replace(/[),.;]+$/, '')));
    const dm = String(html).match(/domainNow\s*:\s*["']([^"']+)/i)?.[1];
    const sm = String(html).match(/scheme\s*:\s*["']([^"']+)/i)?.[1] || 'https://';
    if (dm) out.push(normalizeBase((sm.endsWith('://') ? sm : sm + '://') + dm.replace(/^\/+/, '')));
    return uniq(out);
  }
  async probeBase(base) {
    try { const r = await this.rawFetch(normalizeBase(base) + '/moi-cap-nhat?page=1', { headers: this.headers() }, 5000); if (r.status === 429) return true; return r.ok && this.isCatalogHtml(await r.text()); } catch { return false; }
  }
  async getBaseUrl(force = false) {
    if (!force && this.cachedBase && Date.now() - this.cachedBaseAt < this.cacheTtlMs) return this.cachedBase;
    const candidates = [this.mainUrl];
    try { candidates.push(...this.announcementCandidates(await this.fetchHtml(this.mainUrl))); } catch {}
    candidates.push(...FALLBACK_BASES);
    for (const c of uniq(candidates.map(normalizeBase))) if (await this.probeBase(c)) { this.cachedBase = c; this.cachedBaseAt = Date.now(); return c; }
    this.cachedBase = normalizeBase(FALLBACK_BASES[0]); this.cachedBaseAt = Date.now(); return this.cachedBase;
  }
  async fetchCategoryPage(categoryPath = '/moi-cap-nhat', page = 1) {
    const base = await this.getBaseUrl(), path = '/' + String(categoryPath || 'moi-cap-nhat').replace(/^\/+/, ''), key = path + ':' + page;
    const cached = this.categoryCache.get(key); if (cached && cached.exp > Date.now()) return cached.value;
    const html = await this.fetchHtml(base + path + '?page=' + Math.max(1, Number(page || 1)));
    const items = parseListItems(html, base), value = { items, hasMore: items.length > 0, baseUrl: base };
    this.categoryCache.set(key, { value, exp: Date.now() + this.cacheTtlMs }); return value;
  }
  async search(query) {
    const q = String(query || '').trim(); if (!q) return [];
    const key = q.toLowerCase(), c = this.searchCache.get(key); if (c && c.exp > Date.now()) return c.value;
    const base = await this.getBaseUrl(), html = await this.fetchHtml(base + '/search?keysearch=' + encodeURIComponent(q));
    const value = parseListItems(html, base); this.searchCache.set(key, { value, exp: Date.now() + this.cacheTtlMs }); return value;
  }
  async loadDetail(detailUrl) {
    const key = String(detailUrl), c = this.detailCache.get(key); if (c && c.exp > Date.now()) return c.value;
    const base = await this.getBaseUrl(), html = await this.fetchHtml(key, base);
    const title = firstTagText(html, ['h1', 'h2'], 'film-name') || metaContent(html, 'og:title') || stripTags(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').split('|')[0].trim();
    if (!title) throw new Error('không đọc được tên phim');
    let posterUrl = null;
    for (const m of html.matchAll(/<img\b[^>]*>/gi)) { const tag = m[0]; if (!/film-poster-img|anisc-poster/i.test(tag)) continue; const raw = attr(tag, 'src') || attr(tag, 'data-src'); if (raw && !/^data:/i.test(raw)) { posterUrl = absUrl(raw, base); if (posterUrl) break; } }
    posterUrl ||= absUrl(metaContent(html, 'og:image'), base);
    let bannerUrl = null;
    const cover = html.match(/<div\b[^>]*class=(?:"[^"]*anis-cover[^"]*"|'[^']*anis-cover[^']*')[^>]*>/i)?.[0] || '';
    const bg = attr(cover, 'style').match(/background-image\s*:\s*url\(\s*["']?([^"')]+)["']?\s*\)/i)?.[1]; if (bg) bannerUrl = absUrl(bg, base);
    const ow = Number(metaContent(html, 'og:image:width') || 0), oh = Number(metaContent(html, 'og:image:height') || 0); if (!bannerUrl && ow > oh) bannerUrl = posterUrl;
    const overview = stripTags(html.match(/film-description[\s\S]{0,1000}?<div\b[^>]*class=(?:"[^"]*\btext\b[^"]*"|'[^']*\btext\b[^']*')[^>]*>([\s\S]*?)<\/div>/i)?.[1] || '') || null;
    const genres = uniq([...html.matchAll(/<a\b[^>]*class=(?:"[^"]*\bgenre\b[^"]*"|'[^']*\bgenre\b[^']*')[^>]*>([\s\S]*?)<\/a>/gi)].map(m => stripTags(m[1])).filter(Boolean));
    const year = Number(stripTags(html.match(/Năm\s*:\s*<\/[^>]+>\s*<span\b[^>]*class=(?:"[^"]*name[^"]*"|'[^']*name[^']*')[^>]*>([\s\S]*?)<\/span>/i)?.[1] || '').match(/(?:19|20)\d{2}/)?.[0] || 0) || null;
    let dubWatchUrl = null, subWatchUrl = null;
    for (const m of html.matchAll(/<a\b[^>]*class=(?:"[^"]*btn-play[^"]*"|'[^']*btn-play[^']*')[^>]*>/gi)) { const tag = m[0], href = absUrl(attr(tag, 'href'), base); if (!href) continue; if (classes(tag).includes('custom-button-sub')) subWatchUrl ||= href; else dubWatchUrl ||= href; }
    const seasonLinks = uniq([...html.matchAll(/<a\b[^>]*class=(?:"[^"]*os-item[^"]*"|'[^']*os-item[^']*')[^>]*>/gi)].map(m => absUrl(attr(m[0], 'href'), base)).filter(Boolean).filter(x => x.replace(/\/$/, '') !== key.replace(/\/$/, '')));
    const load = async (url, serverName) => { if (!url) return []; try { return parseEpisodePairs(await this.fetchHtml(url, base), base).map(x => ({ name: 'Tập ' + x.number, number: x.number, watchUrl: x.url, serverName })); } catch { return []; } };
    const [tm, vs] = await Promise.all([load(dubWatchUrl, 'Thuyết minh'), load(subWatchUrl, 'Vietsub')]);
    const episodes = [...vs, ...tm].sort((a,b) => (a.serverName === 'Vietsub' ? 0 : 1) - (b.serverName === 'Vietsub' ? 0 : 1) || a.number - b.number);
    const value = { title, detailUrl: key, posterUrl, bannerUrl, overview, year, genres: genres.length ? genres : ['Hoạt hình 3D'], episodes, defaultWatchUrl: dubWatchUrl || subWatchUrl, recommendations: parseListItems(html, base), seasonLinks };
    this.detailCache.set(key, { value, exp: Date.now() + this.cacheTtlMs }); return value;
  }
  async probeStream(url, referer, expectM3u8) {
    try {
      const headers = this.playbackHeaders(referer); if (!expectM3u8) headers.Range = 'bytes=0-512'; else headers.Accept = 'application/vnd.apple.mpegurl,application/x-mpegURL,text/plain,*/*';
      const r = await this.rawFetch(url, { headers }, 6000); if (!r.ok) return null; const text = await r.text();
      if (expectM3u8) { if (!/#EXTM3U/i.test(text) || /#ENC-AESGCM/i.test(text) || /^\s*</.test(text)) return null; }
      else if (/^\s*</.test(text)) return null;
      return { url, isM3u8: expectM3u8, headers: this.playbackHeaders(referer) };
    } catch { return null; }
  }
  findStreamInJson(obj) {
    if (!obj || typeof obj !== 'object') return null;
    for (const key of ['pU','pUR','plainUrl','plain']) { const v = obj[key]; if (typeof v === 'string' && (/\/stream/i.test(v) || /\.m3u8/i.test(v))) return v.replace('https_//','https://'); }
    const urls = [];
    const walk = v => { if (typeof v === 'string') { if (/m3u8|\.mp4|\/stream/i.test(v)) urls.push(v.replace('https_//','https://')); } else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
    walk(obj); return urls.find(x => /stream-plain/i.test(x)) || urls.find(x => !/\/stream\?/i.test(x)) || urls[0] || null;
  }
  async resolveFbPage(url, name, referer) {
    try {
      const html = await this.fetchHtml(url, referer); const obf = html.match(/data-obf\s*=\s*["']([^"']+)/i)?.[1];
      if (obf) { const json = parseJsonSafe(Buffer.from(decodeHtml(obf), 'base64').toString('utf8')); const found = ensureHttps(this.findStreamInJson(json) || ''); if (found) { const p = await this.probeStream(found, url, /m3u8|\/stream/i.test(found)); if (p) return { serverName: name, ...p, sourceUrl: url }; } }
      const found = html.match(/https?:\/\/[^\s"'`]+\/file\/[^/"'`]+\/master\.m3u8(?:\?[^\s"'`]*)?/i)?.[0]
        || html.match(/https?:\/\/[^\s"']+(?:fbcdn|scontent)[^\s"']*\/stream-plain\?t=[^\s"']+/i)?.[0]
        || html.match(/https?:\/\/[^\s"']+\/stream\/m3u8\/[^\s"']+/i)?.[0];
      if (found) { const p = await this.probeStream(ensureHttps(found), url, true); if (p) return { serverName: name, ...p, sourceUrl: url }; }
    } catch {}
    return null;
  }
  async resolveFbEmbed(url, name, referer) {
    const direct = await this.resolveFbPage(url, name, referer); if (direct) return direct;
    try { const u = new URL(url), id = u.pathname.match(/\/embed\/([^/?#]+)/i)?.[1]; if (!id) return null; for (const storage of ['drive','gphotos']) { const cand = u.origin + '/file/' + id + '/master.m3u8?storage=' + storage; const p = await this.probeStream(cand, url, true); if (p) return { serverName: name, ...p, sourceUrl: url }; } } catch {}
    return null;
  }
  async resolveDailymotion(url, name) {
    try { const id = url.match(/dailymotion\.com\/(?:embed\/)?video\/([^/?#]+)/i)?.[1]; if (!id) return null; const ref = 'https://www.dailymotion.com/'; const r = await this.rawFetch('https://www.dailymotion.com/player/metadata/video/' + id, { headers: { 'User-Agent': DEFAULT_UA, Referer: ref, Origin: ref.replace(/\/$/,'') } }, 6000); if (!r.ok) return null; const q = (await r.json())?.qualities || {}; for (const k of ['1080','720','480','380','auto']) { const a = Array.isArray(q[k]) ? q[k] : q[k] ? [q[k]] : []; for (const x of a) if (x?.url && /\.m3u8/i.test(x.url)) return { serverName: name, url: x.url, isM3u8: true, headers: this.playbackHeaders(ref), sourceUrl: url }; } } catch {}
    return null;
  }
  decodeAbyssDomain(encoded) { if (!encoded) return ''; if (/^[a-z0-9][a-z0-9-]{0,61}[a-z0-9](?:\.[a-z]{2,})+$/i.test(encoded)) return encoded; try { const rotated = encoded.slice(-1) + encoded.slice(0,-1); return Buffer.from(rotated, 'base64').toString('utf8'); } catch { return encoded; } }
  async resolveAbyss(url, name) {
    let slug = null; try { const u = new URL(url); slug = u.searchParams.get('v') || u.pathname.replace(/\/$/,'').split('/').pop(); } catch {} if (!slug) return null;
    for (const host of ['https://ping.idocdn.com/','https://ping.euocdn.com/']) { try { const body = 'slug=' + encodeURIComponent(slug), r = await this.rawFetch(host, { method:'POST', headers:{...this.headers(url,'*/*'),'Content-Type':'application/x-www-form-urlencoded','x-referer':url}, body }, 3000); if (!r.ok) continue; const j = await r.json(), domain = this.decodeAbyssDomain(j.url); if (!domain) continue; const sources = Array.isArray(j.sources) && j.sources.length ? j.sources : ['fullhd','hd','mhd','sd','origin']; const pick = sources.find(x => /^(fullhd|hd)$/i.test(x)) || sources[0]; const stream = 'https://' + (/^hd$/i.test(pick) ? 'www.' : '') + slug.toLowerCase() + '.' + domain; const p = await this.probeStream(stream, url, /m3u8/i.test(stream)); if (p) return { serverName:name, ...p, sourceUrl:url }; } catch {} }
    return null;
  }
  async resolveSource(sourceUrl, name, watchReferer) {
    const url = ensureHttps(sourceUrl); const low = url.toLowerCase(); if (!url || BLOCKED.some(x => low.includes(x))) return null;
    if (low.includes('dailymotion.com/')) return this.resolveDailymotion(url, name);
    if (low.includes('abyssplayer.com')) return this.resolveAbyss(url, name);
    if (low.includes('cloudbeta.win/')) { const stream = url.replace('player.cloudbeta.win/','play.cloudbeta.win/file/play/') + '.m3u8'; const p = await this.probeStream(stream, watchReferer, true); return p ? { serverName:name, ...p, sourceUrl:url } : null; }
    if (low.includes('helvid.net/')) { try { const html = await this.fetchHtml(url, watchReferer), file = html.match(/["']file["']\s*:\s*["']([^"']+)["']/i)?.[1]?.replace('https_//','https://'); if (file) { const p = await this.probeStream(file, url, /\.m3u8/i.test(file)); if (p) return { serverName:name, ...p, sourceUrl:url }; } } catch {} return null; }
    if (low.includes('short-cdn.ink/video/')) { const stream = url.replace(/\/$/,'') + '/master.m3u8'; const p = await this.probeStream(stream, watchReferer, true); return p ? { serverName:name, ...p, sourceUrl:url } : null; }
    const isFb = /fbcdn|scontent/i.test(url); if (isFb && /\/embed\//i.test(url)) return this.resolveFbEmbed(url, name, watchReferer); if (isFb) return this.resolveFbPage(url, name, watchReferer);
    if (/play-fb-v/i.test(url)) { try { const html = await this.fetchHtml(url, watchReferer), open = html.match(/<[^>]*id=["']player["'][^>]*>/i)?.[0], video = (open ? attr(open,'data-stream-url') : '') || html.match(/var\s+cccc\s*=\s*["']([^"']+)/i)?.[1]; if (video) { const p = await this.probeStream(ensureHttps(video), url, /\.m3u8/i.test(video)); if (p) return { serverName:name, ...p, sourceUrl:url }; } } catch {} return null; }
    if (/\.m3u8(?:$|\?)/i.test(url)) { const p = await this.probeStream(url, watchReferer, true); return p ? { serverName:name, ...p, sourceUrl:url } : null; }
    if (/\.mp4(?:$|\?)/i.test(url)) { const p = await this.probeStream(url, watchReferer, false); return p ? { serverName:name, ...p, sourceUrl:url } : null; }
    return null;
  }
  async resolveStreamLinks(watchPageUrl) {
    const key = String(watchPageUrl), c = this.streamCache.get(key); if (c && c.exp > Date.now()) return c.value;
    const base = await this.getBaseUrl(), prefix = /\/sever2\//i.test(key) ? 'VS' : 'TM'; let page = key, html = await this.fetchHtml(page, base);
    if (!/btn3dsv/i.test(html)) { const a = html.match(/<a\b[^>]*class=(?:"[^"]*(?:btn-play|custom-button-sub)[^"]*"|'[^']*(?:btn-play|custom-button-sub)[^']*')[^>]*>/i)?.[0], next = a && absUrl(attr(a,'href'),base); if (next && next.replace(/\/$/,'') !== page.replace(/\/$/,'')) { page = next; html = await this.fetchHtml(page, base); } }
    const jobs = [];
    for (const m of html.matchAll(/<a\b[^>]*class=(?:"[^"]*btn3dsv[^"]*"|'[^']*btn3dsv[^']*')[^>]*>[\s\S]*?<\/a>/gi)) { const tag = m[0], open = tag.match(/^<a\b[^>]*>/i)?.[0] || '', raw = attr(open,'data-src'); if (!raw) continue; const link = ensureHttps(absUrl(raw,base) || raw), label = stripTags(tag) || 'Server'; jobs.push(this.resolveSource(link, prefix + ' - ' + label, page)); }
    const value = uniq((await Promise.all(jobs)).filter(Boolean), x => x.url).slice(0,8); this.streamCache.set(key,{value,exp:Date.now()+Math.min(this.cacheTtlMs,120000)}); return value;
  }
}

module.exports = { createProvider: opts => new YanHH3DProvider(opts), YanHH3DProvider, parseListItems, parseEpisodePairs, DEFAULT_UA };
