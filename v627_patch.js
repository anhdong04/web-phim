module.exports = function applyV627(source) {
  const relayUrlRe = /function v626RelayUrl\(url, headers, playlist = false\) \{[\s\S]*?\n\}/;
  if (!relayUrlRe.test(source)) throw new Error('v6.2.7 patch target missing: relay URL helper');
  source = source.replace(relayUrlRe, String.raw`function v627RelaySuffix(url, playlist = false) {
  if (playlist) return '.m3u8';
  try {
    const ext = new URL(String(url || '')).pathname.match(/\.(m4s|ts|aac|mp4|key|bin|vtt|webvtt)$/i)?.[0];
    return ext || '.bin';
  } catch { return '.bin'; }
}
function v626RelayUrl(url, headers, playlist = false) {
  return V626_PUBLIC_BASE + '/yanhh3d/relay/' + v626RelayToken(url, headers, playlist) + v627RelaySuffix(url, playlist);
}`);

  const headersLine = "  const headers = { ...(data.h || {}), 'Accept-Encoding': 'identity' };";
  if (!source.includes(headersLine)) throw new Error('v6.2.7 patch target missing: relay headers');
  source = source.replace(headersLine, headersLine + "\n  if (data.p) headers.Accept = 'application/vnd.apple.mpegurl,application/x-mpegURL,text/plain,*/*';");

  const streamReturn = /return \{ name: '🐲 YanHH3D', title: \[link\.serverName, fmt, title\]\.filter\(Boolean\)\.join\(' • '\), url: relay, _provider: 'YanHH3D', _rawText: \[link\.serverName, title, link\.url\]\.filter\(Boolean\)\.join\(' '\), behaviorHints: V626_YANHH3D_MEDIA_RELAY \? \{ notWebReady: false, bingeGroup: 'webphim-yanhh3d-relay' \} : \{ notWebReady: true, proxyHeaders: \{ request: link\.headers \|\| \{\} \}, bingeGroup: 'webphim-yanhh3d' \} \};/;
  if (!streamReturn.test(source)) throw new Error('v6.2.7 patch target missing: stream return');
  source = source.replace(streamReturn, "return { name: '🐲 YanHH3D', title: [link.serverName, fmt, title].filter(Boolean).join(' • '), url: relay, mimeType: link.isM3u8 ? 'application/vnd.apple.mpegurl' : 'video/mp4', sourceType: link.isM3u8 ? 'hls' : 'video/mp4', _provider: 'YanHH3D', _rawText: [link.serverName, title, link.url].filter(Boolean).join(' '), behaviorHints: V626_YANHH3D_MEDIA_RELAY ? { notWebReady: false, bingeGroup: 'webphim-yanhh3d-relay' } : { notWebReady: true, proxyHeaders: { request: link.headers || {} }, bingeGroup: 'webphim-yanhh3d' } };");

  const relayRegex = "  let v626RelayMatch = path.match(/^\\/yanhh3d\\/relay\\/([A-Za-z0-9_-]+)\\.([A-Za-z0-9_-]+)$/);";
  if (!source.includes(relayRegex)) throw new Error('v6.2.7 patch target missing: relay route regex');
  source = source.replace(relayRegex, "  let v626RelayMatch = path.match(/^\\/yanhh3d\\/relay\\/([A-Za-z0-9_-]+)\\.([A-Za-z0-9_-]+)(?:\\.[A-Za-z0-9]{1,10})?$/);");

  const routeLine = "  if (v626RelayMatch) { await v626RelayResponse(req, res, v626RelayMatch[1], v626RelayMatch[2]); return; }";
  if (!source.includes(routeLine)) throw new Error('v6.2.7 patch target missing: relay route');
  const diag = String.raw`  let v627DiagMatch = path.match(/^\/yanhh3d\/relay-diag\/([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)(?:\.[A-Za-z0-9]{1,10})?$/);
  if (v627DiagMatch) {
    const data = v626RelayDecode(v627DiagMatch[1], v627DiagMatch[2]);
    if (!data) return sendJson(res, 403, { version:'6.2.7', ok:false, error:'invalid-or-expired-token' }, 0);
    const headers = { ...(data.h || {}), 'Accept-Encoding':'identity' };
    if (data.p) headers.Accept = 'application/vnd.apple.mpegurl,application/x-mpegURL,text/plain,*/*';
    const started = Date.now();
    try {
      const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 12000);
      let r;
      try { r = await fetch(data.u, { headers, redirect:'follow', signal:ctl.signal }); } finally { clearTimeout(timer); }
      const ctype = String(r.headers.get('content-type') || '');
      let prefix = '';
      if (/text|json|mpegurl|m3u8/i.test(ctype) || data.p) prefix = (await r.text()).slice(0,240);
      let upstreamHost = '', refererHost = '';
      try { upstreamHost = new URL(data.u).host; } catch {}
      try { refererHost = new URL(String(data.h?.Referer || '')).host; } catch {}
      return sendJson(res, 200, { version:'6.2.7', ok:r.ok, status:r.status, elapsedMs:Date.now()-started, playlist:Boolean(data.p), contentType:ctype, upstreamHost, refererHost, isHls:/#EXTM3U/i.test(prefix), prefix:prefix.replace(/[\r\n]+/g,' ').slice(0,180) }, 0);
    } catch (e) {
      return sendJson(res, 200, { version:'6.2.7', ok:false, elapsedMs:Date.now()-started, error:String(e?.message || e).slice(0,240) }, 0);
    }
  }
`;
  source = source.replace(routeLine, diag + routeLine);

  source = source.replace("version: '1.0.1', name: '🐲 YanHH3D'", "version: '1.0.2', name: '🐲 YanHH3D'");
  source = source.replace("description: 'YanHH3D 1.0.1 • signed media relay • Thuyết minh/Vietsub streams'", "description: 'YanHH3D 1.0.2 • HLS-aware signed relay • Thuyết minh/Vietsub streams'");
  source = source.replaceAll('6.2.6', '6.2.7');
  source = source.replaceAll('single-process-v6.2.6', 'single-process-v6.2.7');
  return source;
};
