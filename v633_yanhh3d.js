const base = require('./v625_yanhh3d');

function decodeHtml(s = '') {
  return String(s)
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}
function ensureHttps(url = '') { return String(url || '').replace(/^http:\/\//i, 'https://').replace(/^https_\/\//i, 'https://'); }
function absUrl(raw, parent) { try { return new URL(String(raw || ''), parent).toString(); } catch { return null; } }
function firstUri(text = '') {
  for (const line of String(text || '').replace(/\r/g, '').split('\n')) {
    const s = line.trim();
    if (s && !s.startsWith('#')) return s;
  }
  return '';
}
function isPng(buf) { return buf?.length >= 8 && Buffer.from(buf).subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])); }
function isHtml(buf) { const s = Buffer.from(buf || []).subarray(0, 128).toString('utf8').trimStart().toLowerCase(); return s.startsWith('<!doctype') || s.startsWith('<html') || s.startsWith('<'); }
function mediaMagic(buf) {
  const b = Buffer.from(buf || []);
  if (isPng(b)) return 'png';
  if (isHtml(b)) return 'html';
  for (let off = 0; off < Math.min(188, b.length); off++) {
    if (b[off] === 0x47 && (off + 188 >= b.length || b[off + 188] === 0x47) && (off + 376 >= b.length || b[off + 376] === 0x47)) return 'mpegts';
  }
  if (b.length >= 8 && ['ftyp','styp','moof'].includes(b.subarray(4,8).toString('ascii'))) return 'isobmff';
  if (b.length >= 2 && b[0] === 0xff && (b[1] & 0xf0) === 0xf0) return 'aac';
  return 'other';
}
function normalizeCandidate(v, parent = '') {
  if (typeof v !== 'string') return null;
  let s = decodeHtml(v.trim()).replace(/https_\/\//g, 'https://');
  if (!s || !(/m3u8|\.mp4|\/stream/i.test(s))) return null;
  if (parent && !/^https?:\/\//i.test(s)) s = absUrl(s, parent) || s;
  return ensureHttps(s);
}
function collectCandidates(obj, parent = '') {
  const out = [];
  const add = (value, key = '', path = '') => {
    const url = normalizeCandidate(value, parent); if (!url) return;
    const low = url.toLowerCase(), k = String(key || '').toLowerCase();
    let rank = 50;
    if (['pu','pur','plainurl','plain'].includes(k)) rank = 0;
    if (low.includes('/stream-plain')) rank = Math.min(rank, 1);
    if (/\/file\/[^/]+\/master\.m3u8/i.test(low)) rank = Math.min(rank, 2);
    if (low.includes('/stream/m3u8')) rank = Math.max(rank, 20);
    if (low.includes('/stream?')) rank = Math.max(rank, 40);
    out.push({ url, rank, key:k, path });
  };
  const walk = (v, path = '') => {
    if (typeof v === 'string') { add(v, path.split('.').pop() || '', path); return; }
    if (Array.isArray(v)) { v.forEach((x,i) => walk(x, path + '[' + i + ']')); return; }
    if (v && typeof v === 'object') for (const [k,val] of Object.entries(v)) walk(val, path ? path + '.' + k : k);
  };
  walk(obj);
  const seen = new Set();
  return out.sort((a,b) => a.rank - b.rank).filter(x => { if (seen.has(x.url)) return false; seen.add(x.url); return true; });
}

class YanHH3DProvider633 extends base.YanHH3DProvider {
  constructor(opts = {}) {
    super(opts);
    this.lastFbDecision = null;
  }
  async readProbeBytes(response, max = 4096) {
    if (!response.body) return Buffer.alloc(0);
    const reader = response.body.getReader(); const chunks = []; let total = 0;
    try {
      while (total < max) {
        const p = await reader.read(); if (p.done) break;
        let c = Buffer.from(p.value); if (total + c.length > max) c = c.subarray(0, max - total);
        chunks.push(c); total += c.length; if (total >= max) break;
      }
    } finally { try { await reader.cancel(); } catch {} }
    return Buffer.concat(chunks, total);
  }
  async deepProbeHls(url, referer, depth = 0) {
    const headers = this.playbackHeaders(referer);
    headers.Accept = 'application/vnd.apple.mpegurl,application/x-mpegURL,text/plain,*/*';
    const r = await this.rawFetch(url, { headers }, 8000);
    if (!r.ok) return { ok:false, reason:'playlist-http-' + r.status };
    const text = await r.text();
    if (!/#EXTM3U/i.test(text) || /^\s*</.test(text)) return { ok:false, reason:'not-hls' };
    if (/#ENC-AESGCM/i.test(text)) return { ok:false, reason:'enc-aesgcm' };
    if (depth < 2 && /#EXT-X-STREAM-INF/i.test(text)) {
      const child = firstUri(text), next = absUrl(child, r.url || url);
      if (!next) return { ok:false, reason:'variant-url' };
      return this.deepProbeHls(next, referer, depth + 1);
    }
    const raw = firstUri(text), media = absUrl(raw, r.url || url);
    if (!media) return { ok:false, reason:'no-media-uri' };
    const mh = this.playbackHeaders(referer); mh.Range = 'bytes=0-4095'; mh.Accept = '*/*';
    const mr = await this.rawFetch(media, { headers: mh }, 8000);
    if (!mr.ok && mr.status !== 206) return { ok:false, reason:'media-http-' + mr.status };
    const bytes = await this.readProbeBytes(mr, 4096), magic = mediaMagic(bytes);
    if (magic === 'png') return { ok:false, reason:'png-carrier', magic };
    if (magic === 'html') return { ok:false, reason:'html-media', magic };
    return { ok:true, reason:'playable', magic, playlistUrl:url, mediaContentType:String(mr.headers.get('content-type') || '') };
  }
  async tryFbCandidate(candidate, name, playerReferer) {
    try {
      const url = ensureHttps(candidate.url || candidate), isHls = /m3u8|\/stream/i.test(url);
      if (!isHls) {
        const p = await this.probeStream(url, playerReferer, false);
        return p ? { serverName:name, ...p, sourceUrl:playerReferer } : null;
      }
      const deep = await this.deepProbeHls(url, playerReferer);
      if (!deep.ok) return null;
      return { serverName:name, url, isM3u8:true, headers:this.playbackHeaders(playerReferer), sourceUrl:playerReferer, _probe:deep };
    } catch { return null; }
  }
  async resolveFbPage(url, name, referer) {
    const started = Date.now();
    try {
      const html = await this.fetchHtml(url, referer);
      // Some fbcdn URLs are already HLS. Accept only if the first real media object is not a PNG carrier.
      if (/^\s*#EXTM3U/i.test(html)) {
        const deep = await this.deepProbeHls(url, url);
        this.lastFbDecision = { at:Date.now(), direct:true, accepted:deep.ok, reason:deep.reason, magic:deep.magic || null, ms:Date.now()-started };
        if (deep.ok) return { serverName:name, url, isM3u8:true, headers:this.playbackHeaders(url), sourceUrl:url, _probe:deep };
        return null;
      }

      const obfRaw = html.match(/data-obf\s*=\s*["']([^"']+)/i)?.[1] || '';
      const candidates = [];
      if (obfRaw) {
        try {
          const clean = decodeHtml(obfRaw).replace(/-/g,'+').replace(/_/g,'/');
          const padded = clean + '='.repeat((4 - clean.length % 4) % 4);
          const obj = JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
          candidates.push(...collectCandidates(obj, url));
        } catch {}
      }
      const regexCandidates = [
        html.match(/https?:\/\/[^\s"'`]+\/file\/[^/"'`]+\/master\.m3u8(?:\?[^\s"'`]*)?/i)?.[0],
        html.match(/https?:\/\/[^\s"']+(?:fbcdn|scontent)[^\s"']*\/stream-plain(?:\?[^\s"']*)?/i)?.[0],
        html.match(/https?:\/\/[^\s"']+\/stream\/m3u8\/[^\s"']+/i)?.[0]
      ].filter(Boolean).map((x,i) => ({ url:ensureHttps(x), rank:10+i, key:'html', path:'html' }));
      for (const x of regexCandidates) if (!candidates.some(c => c.url === x.url)) candidates.push(x);
      candidates.sort((a,b) => a.rank - b.rank);

      const attempts = [];
      for (const c of candidates.slice(0, 12)) {
        let deep = null;
        try { deep = await this.deepProbeHls(c.url, url); } catch {}
        attempts.push({ rank:c.rank, kind:c.url.includes('/stream-plain')?'stream-plain':c.url.includes('/stream/m3u8')?'stream-m3u8':c.url.includes('/stream?')?'stream-encrypted':'other', ok:Boolean(deep?.ok), reason:deep?.reason || 'probe-failed', magic:deep?.magic || null });
        if (deep?.ok) {
          this.lastFbDecision = { at:Date.now(), direct:false, chosen:attempts[attempts.length-1].kind, attempts, ms:Date.now()-started };
          return { serverName:name, url:c.url, isM3u8:true, headers:this.playbackHeaders(url), sourceUrl:url, _probe:deep };
        }
      }
      this.lastFbDecision = { at:Date.now(), direct:false, chosen:null, attempts, ms:Date.now()-started };
    } catch (e) {
      this.lastFbDecision = { at:Date.now(), error:String(e?.message || e).slice(0,160), ms:Date.now()-started };
    }
    return null;
  }
  getFbDecision() { return this.lastFbDecision; }
}

module.exports = {
  ...base,
  YanHH3DProvider: YanHH3DProvider633,
  createProvider: opts => new YanHH3DProvider633(opts)
};
