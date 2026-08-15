const base = require('./v633_yanhh3d');

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
function attr(tag = '', name = '') {
  const esc = String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = String(tag).match(new RegExp('\\b' + esc + '\\s*=\\s*(?:"([^"]*)"|\\\'([^\\\']*)\\\'|([^\\s>]+))', 'i'));
  return decodeHtml(m ? (m[1] ?? m[2] ?? m[3] ?? '') : '');
}
function stripTags(s = '') { return decodeHtml(String(s).replace(/<script\b[\s\S]*?<\/script>/gi,' ').replace(/<style\b[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()); }
function absUrl(raw, base) { try { return new URL(String(raw || ''), String(base || '').replace(/\/+$/, '') + '/').toString(); } catch { return null; } }
function ensureHttps(url = '') { return String(url || '').replace(/^http:\/\//i, 'https://'); }
function uniq(items, key = x => x) { const seen = new Set(); return items.filter(x => { const k = key(x); if (seen.has(k)) return false; seen.add(k); return true; }); }
function norm(s = '') { return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().replace(/\b(?:yanhh3d|thuyet minh|vietsub|4k|1080p|720p|full hd|fullhd)\b/g,' ').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim(); }
function epNum(s = '') { const m = String(s).match(/(?:tập|tap|episode|ep)\s*[-:#.]?\s*(\d+(?:\.\d+)?)/i); return m ? Number(m[1]) : null; }
function similarity(a = '', b = '') {
  const aa = new Set(norm(a).split(' ').filter(Boolean)), bb = new Set(norm(b).split(' ').filter(Boolean));
  if (!aa.size || !bb.size) return 0;
  let same = 0; for (const x of aa) if (bb.has(x)) same++;
  return 100 * (2 * same) / (aa.size + bb.size);
}
function classify(url = '') {
  const u = String(url).toLowerCase();
  if (u.includes('dailymotion.com/')) return { kind:'dailymotion', rank:0 };
  if (/\.mp4(?:$|[?#])/i.test(u)) return { kind:'mp4', rank:1 };
  if (/\.m3u8(?:$|[?#])/i.test(u) && !/fbcdn|scontent/i.test(u)) return { kind:'hls', rank:2 };
  if (u.includes('cloudbeta.win/')) return { kind:'cloudbeta', rank:3 };
  if (u.includes('helvid.net/')) return { kind:'helvid', rank:4 };
  if (u.includes('short-cdn.ink/video/')) return { kind:'short-cdn', rank:5 };
  if (u.includes('abyssplayer.com')) return { kind:'abyss', rank:10 };
  if (u.includes('play-fb-v')) return { kind:'play-fb', rank:40 };
  if (/fbcdn|scontent/i.test(u)) return { kind:'fbcdn', rank:50 };
  return { kind:'other', rank:20 };
}
function pageTitle(html = '') {
  const og = String(html).match(/<meta\b[^>]*(?:property|name)=["']og:title["'][^>]*>/i)?.[0];
  const ogv = og ? attr(og,'content') : '';
  const h = stripTags(String(html).match(/<h1\b[^>]*>[\s\S]*?<\/h1>/i)?.[0] || '');
  const t = stripTags(String(html).match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').split('|')[0].trim();
  return ogv || h || t || '';
}
function safeJsonString(s = '') { try { return JSON.parse('"' + String(s).replace(/"/g,'\\"') + '"'); } catch { return decodeHtml(String(s).replace(/\\u([0-9a-f]{4})/gi,(_,x)=>String.fromCharCode(parseInt(x,16)))); } }

class YanHH3DProvider634 extends base.YanHH3DProvider {
  constructor(opts = {}) {
    super(opts);
    this.lastResolveSummary = null;
  }
  parseButtons(html, baseUrl) {
    const out = [];
    for (const m of String(html).matchAll(/<a\b[^>]*class=(?:"[^"]*btn3dsv[^"]*"|'[^']*btn3dsv[^']*')[^>]*>[\s\S]*?<\/a>/gi)) {
      const tag = m[0], open = tag.match(/^<a\b[^>]*>/i)?.[0] || '';
      const raw = attr(open,'data-src'); if (!raw) continue;
      const url = ensureHttps(absUrl(raw, baseUrl) || raw), label = stripTags(tag) || 'Server', c = classify(url);
      out.push({ url, label, kind:c.kind, rank:c.rank });
    }
    return uniq(out, x => x.url).sort((a,b) => a.rank - b.rank);
  }
  async dailymotionCandidatesFromApi(query) {
    const url = 'https://api.dailymotion.com/videos?fields=id,title,owner.screenname,url&limit=20&search=' + encodeURIComponent(query);
    try {
      const r = await this.rawFetch(url, { headers:{ 'User-Agent':'Mozilla/5.0', Accept:'application/json' } }, 7000);
      if (!r.ok) return [];
      const j = await r.json(), list = Array.isArray(j?.list) ? j.list : [];
      return list.map(x => ({ id:x.id, title:x.title || '', owner:x['owner.screenname'] || '', url:x.url || (x.id ? 'https://www.dailymotion.com/video/' + x.id : '') })).filter(x => x.id && x.url);
    } catch { return []; }
  }
  async dailymotionCandidatesFromWeb(query) {
    try {
      const url = 'https://www.dailymotion.com/search/' + encodeURIComponent(query) + '/videos';
      const r = await this.rawFetch(url, { headers:{ 'User-Agent':'Mozilla/5.0', Accept:'text/html,*/*' } }, 7000);
      if (!r.ok) return [];
      const html = await r.text(), out = [];
      for (const m of html.matchAll(/"id"\s*:\s*"(x[a-z0-9]+)"[\s\S]{0,500}?"title"\s*:\s*"((?:\\.|[^"])*)"/gi)) out.push({ id:m[1], title:safeJsonString(m[2]), owner:'', url:'https://www.dailymotion.com/video/' + m[1] });
      for (const m of html.matchAll(/"title"\s*:\s*"((?:\\.|[^"])*)"[\s\S]{0,500}?"id"\s*:\s*"(x[a-z0-9]+)"/gi)) out.push({ id:m[2], title:safeJsonString(m[1]), owner:'', url:'https://www.dailymotion.com/video/' + m[2] });
      return uniq(out, x => x.id);
    } catch { return []; }
  }
  async searchDailymotionFallback(title, prefix = 'TM') {
    const target = String(title || '').trim(); if (!target) return null;
    const episode = epNum(target), query = [target, 'YanHH3D'].filter(Boolean).join(' ');
    let items = await this.dailymotionCandidatesFromApi(query);
    let method = 'api';
    if (!items.length) { items = await this.dailymotionCandidatesFromWeb(query); method = 'web'; }
    const scored = items.map(x => {
      let score = similarity(target, x.title);
      const e = epNum(x.title); if (episode != null) score += e === episode ? 50 : (e != null ? -80 : -15);
      if (/yan\s*hh\s*3d/i.test(x.owner) || /yanhh3d/i.test(x.title)) score += 20;
      return { ...x, score };
    }).filter(x => x.score >= 65).sort((a,b) => b.score - a.score).slice(0,6);
    for (const x of scored) {
      const link = await this.resolveDailymotion(x.url, prefix + ' - Dailymotion fallback');
      if (link) return { link, method, matchedTitle:x.title, score:Math.round(x.score) };
    }
    return { link:null, method, candidates:scored.slice(0,3).map(x => ({ title:x.title, score:Math.round(x.score) })) };
  }
  async resolveStreamLinks(watchPageUrl) {
    const key = String(watchPageUrl), cached = this.streamCache.get(key);
    if (cached && cached.exp > Date.now()) return cached.value;
    const started = Date.now(), baseUrl = await this.getBaseUrl(), prefix = /\/sever2\//i.test(key) ? 'VS' : 'TM';
    let page = key, html = await this.fetchHtml(page, baseUrl);
    if (!/btn3dsv/i.test(html)) {
      const a = html.match(/<a\b[^>]*class=(?:"[^"]*(?:btn-play|custom-button-sub)[^"]*"|'[^']*(?:btn-play|custom-button-sub)[^']*')[^>]*>/i)?.[0];
      const next = a && absUrl(attr(a,'href'),baseUrl);
      if (next && next.replace(/\/$/,'') !== page.replace(/\/$/,'')) { page = next; html = await this.fetchHtml(page, baseUrl); }
    }
    const title = pageTitle(html), buttons = this.parseButtons(html, baseUrl), attempts = [];
    const resolved = await Promise.all(buttons.map(async b => {
      const t0 = Date.now(); let link = null;
      try { link = await this.resolveSource(b.url, prefix + ' - ' + b.label, page); } catch {}
      attempts.push({ label:b.label, kind:b.kind, rank:b.rank, ok:Boolean(link), ms:Date.now()-t0, fb: b.kind === 'fbcdn' || b.kind === 'play-fb' ? this.getFbDecision?.() || null : undefined });
      return link ? { link, rank:b.rank } : null;
    }));
    let value = uniq(resolved.filter(Boolean).sort((a,b)=>a.rank-b.rank).map(x=>x.link), x=>x.url).slice(0,8);
    let dmFallback = null;
    if (!value.length) {
      dmFallback = await this.searchDailymotionFallback(title, prefix);
      if (dmFallback?.link) value = [dmFallback.link];
    }
    this.lastResolveSummary = {
      at:Date.now(), pageTitle:title || null, prefix, buttonCount:buttons.length,
      buttons:buttons.map(x=>({ label:x.label, kind:x.kind, rank:x.rank })),
      attempts:attempts.sort((a,b)=>a.rank-b.rank).map(x=>({ label:x.label, kind:x.kind, rank:x.rank, ok:x.ok, ms:x.ms, fb:x.fb })),
      returned:value.map(x=>({ serverName:x.serverName, kind:classify(x.sourceUrl || x.url).kind, isM3u8:Boolean(x.isM3u8) })),
      dailymotionFallback:dmFallback ? { method:dmFallback.method, matchedTitle:dmFallback.matchedTitle || null, score:dmFallback.score || null, ok:Boolean(dmFallback.link), candidates:dmFallback.candidates || undefined } : null,
      ms:Date.now()-started
    };
    this.streamCache.set(key, { value, exp:Date.now() + Math.min(this.cacheTtlMs, 90000) });
    return value;
  }
  getResolveSummary() { return this.lastResolveSummary; }
}

module.exports = { ...base, YanHH3DProvider:YanHH3DProvider634, createProvider:opts=>new YanHH3DProvider634(opts) };
