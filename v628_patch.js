module.exports = function applyV628(source) {
  const relayFn = 'async function v626RelayResponse(req, res, payload, sig) {';
  if (!source.includes(relayFn)) throw new Error('v6.2.8 patch target missing: relay response');
  const helpers = String.raw`function v628CorsHeaders(extra = {}) {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,HEAD,OPTIONS',
    'access-control-allow-headers': 'Range,Accept,Content-Type,If-Range,If-None-Match',
    'access-control-expose-headers': 'content-length,content-range,accept-ranges,content-type,etag,last-modified',
    'access-control-max-age': '86400',
    'cross-origin-resource-policy': 'cross-origin',
    ...extra
  };
}
function v628FirstUri(text = '') {
  for (const line of String(text || '').replace(/\r/g, '').split('\n')) {
    const s = line.trim();
    if (s && !s.startsWith('#')) return s;
  }
  return '';
}
function v628KeyUri(text = '') {
  const m = String(text || '').match(/^#EXT-X-KEY:[^\n]*URI=(?:"([^"]+)"|'([^']+)'|([^,\s]+))/im);
  return m ? (m[1] || m[2] || m[3] || '') : '';
}
async function v628FetchProbe(url, headers = {}, range = '') {
  const h = { ...(headers || {}), 'Accept-Encoding':'identity' };
  if (range) h.Range = range;
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 10000);
  try {
    const r = await fetch(url, { headers:h, redirect:'follow', signal:ctl.signal });
    const ctype = String(r.headers.get('content-type') || '');
    let body = '';
    if (/mpegurl|m3u8|text|json/i.test(ctype) || /\.m3u8(?:$|[?#])/i.test(url)) body = await r.text();
    else {
      const ab = await r.arrayBuffer();
      body = Buffer.from(ab).subarray(0, 64).toString('latin1');
    }
    return { ok:r.ok || r.status === 206, status:r.status, url:r.url || url, ctype, body };
  } finally { clearTimeout(timer); }
}
${relayFn}`;
  source = source.replace(relayFn, helpers);

  const decodeLine = "  const data = v626RelayDecode(payload, sig);\n  if (!data) return sendJson(res, 403, { error: 'invalid or expired YanHH3D relay token' }, 0);";
  if (!source.includes(decodeLine)) throw new Error('v6.2.8 patch target missing: relay decode');
  source = source.replace(decodeLine, decodeLine + "\n  if (req.method === 'OPTIONS') { res.writeHead(204, v628CorsHeaders({ 'cache-control':'public, max-age=86400' })); res.end(); return; }");

  const playlistHeaders = "res.writeHead(200, { 'content-type': 'application/vnd.apple.mpegurl; charset=utf-8', 'cache-control': 'no-store', 'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-length,content-range,accept-ranges' });";
  if (!source.includes(playlistHeaders)) throw new Error('v6.2.8 patch target missing: playlist CORS');
  source = source.replace(playlistHeaders, "res.writeHead(200, v628CorsHeaders({ 'content-type':'application/vnd.apple.mpegurl; charset=utf-8', 'cache-control':'no-store' }));");

  const binaryHeaders = "const outHeaders = { 'content-type': ctype || 'application/octet-stream', 'cache-control': 'public, max-age=300', 'access-control-allow-origin': '*', 'access-control-expose-headers': 'content-length,content-range,accept-ranges', 'accept-ranges': upstream.headers.get('accept-ranges') || 'bytes' };";
  if (!source.includes(binaryHeaders)) throw new Error('v6.2.8 patch target missing: binary CORS');
  source = source.replace(binaryHeaders, "const outHeaders = v628CorsHeaders({ 'content-type':ctype || 'application/octet-stream', 'cache-control':'public, max-age=300', 'accept-ranges':upstream.headers.get('accept-ranges') || 'bytes' });");

  const rangeLine = "  if (req.headers.range) headers.Range = req.headers.range;";
  if (!source.includes(rangeLine)) throw new Error('v6.2.8 patch target missing: range forwarding');
  source = source.replace(rangeLine, rangeLine + "\n  if (req.headers['if-range']) headers['If-Range'] = req.headers['if-range'];\n  if (req.headers['if-none-match']) headers['If-None-Match'] = req.headers['if-none-match'];");

  const diagRoute = "  let v627DiagMatch = path.match(/^\\/yanhh3d\\/relay-diag\\/([A-Za-z0-9_-]+)\\.([A-Za-z0-9_-]+)(?:\\.[A-Za-z0-9]{1,10})?$/);";
  if (!source.includes(diagRoute)) throw new Error('v6.2.8 patch target missing: diag route');
  const deepRoute = String.raw`  let v628DeepMatch = path.match(/^\/yanhh3d\/relay-check\/([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)(?:\.[A-Za-z0-9]{1,10})?$/);
  if (v628DeepMatch) {
    const data = v626RelayDecode(v628DeepMatch[1], v628DeepMatch[2]);
    if (!data) return sendJson(res,403,{version:'6.2.8',ok:false,error:'invalid-or-expired-token'},0);
    const started = Date.now();
    try {
      const headers = { ...(data.h || {}) };
      if (data.p) headers.Accept = 'application/vnd.apple.mpegurl,application/x-mpegURL,text/plain,*/*';
      const p1 = await v628FetchProbe(data.u, headers);
      if (!p1.ok || !/#EXTM3U/i.test(p1.body)) return sendJson(res,200,{version:'6.2.8',ok:false,stage:'playlist',status:p1.status,contentType:p1.ctype,elapsedMs:Date.now()-started},0);
      let playlistUrl = p1.url, playlistText = p1.body;
      if (/#EXT-X-STREAM-INF/i.test(playlistText)) {
        const child = v628FirstUri(playlistText), abs = v626AbsChild(child, playlistUrl);
        if (!abs) return sendJson(res,200,{version:'6.2.8',ok:false,stage:'variant-url',elapsedMs:Date.now()-started},0);
        const pv = await v628FetchProbe(abs, headers);
        if (!pv.ok || !/#EXTM3U/i.test(pv.body)) return sendJson(res,200,{version:'6.2.8',ok:false,stage:'variant',status:pv.status,contentType:pv.ctype,elapsedMs:Date.now()-started},0);
        playlistUrl = pv.url; playlistText = pv.body;
      }
      const keyRaw = v628KeyUri(playlistText), mediaRaw = v628FirstUri(playlistText);
      let key = null, media = null;
      if (keyRaw) {
        const ku = v626AbsChild(keyRaw, playlistUrl); if (ku) { const kr = await v628FetchProbe(ku, headers); key = { ok:kr.ok,status:kr.status,contentType:kr.ctype }; }
      }
      if (mediaRaw) {
        const mu = v626AbsChild(mediaRaw, playlistUrl); if (mu) { const mr = await v628FetchProbe(mu, headers, 'bytes=0-1023'); media = { ok:mr.ok,status:mr.status,contentType:mr.ctype,html:/^\s*</.test(mr.body) }; }
      }
      const ok = Boolean(media?.ok) && !media?.html && (!key || key.ok);
      return sendJson(res,200,{version:'6.2.8',ok,stage:ok?'media':'media-failed',playlistStatus:p1.status,key,media,elapsedMs:Date.now()-started},0);
    } catch(e) { return sendJson(res,200,{version:'6.2.8',ok:false,stage:'exception',elapsedMs:Date.now()-started,error:String(e?.message||e).slice(0,240)},0); }
  }
`;
  source = source.replace(diagRoute, deepRoute + diagRoute);

  source = source.replace("version: '1.0.2', name: '🐲 YanHH3D'", "version: '1.0.3', name: '🐲 YanHH3D'");
  source = source.replace("description: 'YanHH3D 1.0.2 • HLS-aware signed relay • Thuyết minh/Vietsub streams'", "description: 'YanHH3D 1.0.3 • browser-safe HLS relay • Thuyết minh/Vietsub streams'");
  source = source.replaceAll('6.2.7', '6.2.8');
  source = source.replaceAll('single-process-v6.2.7', 'single-process-v6.2.8');
  return source;
};
