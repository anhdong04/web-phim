module.exports = function applyV626(source) {
  const defaultsMarker = "const v625YanModule = require('./v625_yanhh3d');";
  if (!source.includes(defaultsMarker)) throw new Error('v6.2.6 patch target missing: YanHH3D defaults');
  const defaults = [
    "const v626Crypto = require('node:crypto');",
    "const V626_YANHH3D_MEDIA_RELAY = String(process.env.YANHH3D_MEDIA_RELAY || 'true').toLowerCase() !== 'false';",
    "const V626_YANHH3D_RELAY_TTL_MS = Math.max(60000, Math.min(86400000, Number(process.env.YANHH3D_RELAY_TTL_MS || 14400000)));",
    "const V626_YANHH3D_RELAY_SECRET = String(process.env.YANHH3D_RELAY_SECRET || process.env.AI_SUB_SIGNING_SECRET || process.env.ADMIN_TOKEN || v626Crypto.randomBytes(32).toString('hex'));",
    "const V626_PUBLIC_BASE = String(process.env.PUBLIC_BASE_URL || process.env.RENDER_EXTERNAL_URL || 'https://web-phim-zwsx.onrender.com').replace(/\\/+$/, '');",
    defaultsMarker
  ].join('\n');
  source = source.replace(defaultsMarker, defaults);

  const streamRe = /function v625YanStreamObject\(link, title = ''\) \{[\s\S]*?\n\}\nasync function v625YanStreamsForDetail/;
  if (!streamRe.test(source)) throw new Error('v6.2.6 patch target missing: YanHH3D stream object');
  const streamReplacement = String.raw`function v626RelaySign(payload) {
  return v626Crypto.createHmac('sha256', V626_YANHH3D_RELAY_SECRET).update(payload).digest('base64url');
}
function v626RelayToken(url, headers = {}, playlist = false) {
  const body = Buffer.from(JSON.stringify({ u: String(url || ''), h: headers || {}, p: Boolean(playlist), e: Date.now() + V626_YANHH3D_RELAY_TTL_MS }), 'utf8').toString('base64url');
  return body + '.' + v626RelaySign(body);
}
function v626RelayDecode(payload, sig) {
  try {
    const expected = v626RelaySign(payload), a = Buffer.from(expected), b = Buffer.from(String(sig || ''));
    if (a.length !== b.length || !v626Crypto.timingSafeEqual(a, b)) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data || Number(data.e || 0) < Date.now() || !/^https:\/\//i.test(String(data.u || ''))) return null;
    return data;
  } catch { return null; }
}
function v626RelayUrl(url, headers, playlist = false) {
  return V626_PUBLIC_BASE + '/yanhh3d/relay/' + v626RelayToken(url, headers, playlist);
}
function v626AbsChild(raw, parent) {
  try { return new URL(String(raw || ''), parent).toString(); } catch { return null; }
}
function v626RewriteHls(text, sourceUrl, headers) {
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  let nextIsPlaylist = false;
  return lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return line;
    if (trimmed.startsWith('#')) {
      const attrPlaylist = /^#EXT-X-(?:MEDIA|I-FRAME-STREAM-INF)/i.test(trimmed);
      const rewritten = line.replace(/URI=("([^"]+)"|'([^']+)')/gi, (all, quoted, dq, sq) => {
        const raw = dq || sq || '', abs = v626AbsChild(raw, sourceUrl); if (!abs) return all;
        const playlist = attrPlaylist || /\.m3u8(?:$|[?#])/i.test(abs);
        const q = quoted[0] === "'" ? "'" : '"';
        return 'URI=' + q + v626RelayUrl(abs, headers, playlist) + q;
      });
      nextIsPlaylist = /^#EXT-X-STREAM-INF/i.test(trimmed);
      return rewritten;
    }
    const abs = v626AbsChild(trimmed, sourceUrl); if (!abs) return line;
    const playlist = nextIsPlaylist || /\.m3u8(?:$|[?#])/i.test(abs);
    nextIsPlaylist = false;
    return v626RelayUrl(abs, headers, playlist);
  }).join('\n');
}
async function v626RelayResponse(req, res, payload, sig) {
  const data = v626RelayDecode(payload, sig);
  if (!data) return sendJson(res, 403, { error: 'invalid or expired YanHH3D relay token' }, 0);
  const headers = { ...(data.h || {}), 'Accept-Encoding': 'identity' };
  if (req.headers.range) headers.Range = req.headers.range;
  let upstream;
  try {
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 15000);
    try { upstream = await fetch(data.u, { headers, redirect: 'follow', signal: ctl.signal }); }
    finally { clearTimeout(timer); }
  } catch (e) {
    return sendJson(res, 502, { error: 'YanHH3D relay fetch failed', detail: String(e?.message || e).slice(0, 180) }, 0);
  }
  if (!upstream.ok && upstream.status !== 206) return sendJson(res, upstream.status || 502, { error: 'YanHH3D upstream HTTP ' + upstream.status }, 0);
  const ctype = String(upstream.headers.get('content-type') || '');
  const isPlaylist = Boolean(data.p) || /mpegurl|m3u8/i.test(ctype) || /\.m3u8(?:$|[?#])/i.test(data.u);
  if (isPlaylist) {
    const body = await upstream.text();
    if (!/#EXTM3U/i.test(body)) return sendJson(res, 502, { error: 'YanHH3D relay expected HLS playlist' }, 0);
    const rewritten = v626RewriteHls(body, upstream.url || data.u, data.h || {});
    res.writeHead(200, { 'content-type': 'application/vnd.apple.mpegurl; charset=utf-8', 'cache-control': 'no-store', 'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-length,content-range,accept-ranges' });
    if (req.method !== 'HEAD') res.end(rewritten); else res.end();
    return;
  }
  const outHeaders = { 'content-type': ctype || 'application/octet-stream', 'cache-control': 'public, max-age=300', 'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-length,content-range,accept-ranges', 'accept-ranges': upstream.headers.get('accept-ranges') || 'bytes' };
  for (const h of ['content-length','content-range','etag','last-modified']) { const v = upstream.headers.get(h); if (v) outHeaders[h] = v; }
  res.writeHead(upstream.status, outHeaders);
  if (req.method === 'HEAD' || !upstream.body) { res.end(); return; }
  try { for await (const chunk of upstream.body) { if (!res.write(chunk)) await new Promise(resolve => res.once('drain', resolve)); } res.end(); }
  catch { try { res.destroy(); } catch {} }
}
function v625YanStreamObject(link, title = '') {
  const fmt = link.isM3u8 ? 'HLS' : 'MP4';
  const relay = V626_YANHH3D_MEDIA_RELAY ? v626RelayUrl(link.url, link.headers || {}, Boolean(link.isM3u8)) : link.url;
  return { name: '🐲 YanHH3D', title: [link.serverName, fmt, title].filter(Boolean).join(' • '), url: relay, _provider: 'YanHH3D', _rawText: [link.serverName, title, link.url].filter(Boolean).join(' '), behaviorHints: V626_YANHH3D_MEDIA_RELAY ? { notWebReady: false, bingeGroup: 'webphim-yanhh3d-relay' } : { notWebReady: true, proxyHeaders: { request: link.headers || {} }, bingeGroup: 'webphim-yanhh3d' } };
}
async function v625YanStreamsForDetail`;
  source = source.replace(streamRe, streamReplacement);

  const routeMarker = "  if (path === '/yanhh3d/manifest.json') return sendJson(res, 200, v625YanManifest(), 0);";
  if (!source.includes(routeMarker)) throw new Error('v6.2.6 patch target missing: YanHH3D route');
  source = source.replace(routeMarker, [
    routeMarker,
    "  let v626RelayMatch = path.match(/^\\/yanhh3d\\/relay\\/([A-Za-z0-9_-]+)\\.([A-Za-z0-9_-]+)$/);",
    "  if (v626RelayMatch) { await v626RelayResponse(req, res, v626RelayMatch[1], v626RelayMatch[2]); return; }"
  ].join('\n'));

  source = source.replace("version: '1.0.0', name: '🐲 YanHH3D'", "version: '1.0.1', name: '🐲 YanHH3D'");
  source = source.replace("description: 'YanHH3D • catalog, metadata, Thuyết minh/Vietsub streams'", "description: 'YanHH3D 1.0.1 • signed media relay • Thuyết minh/Vietsub streams'");
  source = source.replaceAll('6.2.5', '6.2.6');
  source = source.replaceAll('single-process-v6.2.5', 'single-process-v6.2.6');
  return source;
};
