module.exports = function applyV638(source) {
  const streamRe = /function v635YanDelivery\(link\) \{[\s\S]*?\n\}\nfunction v625YanStreamObject\(link, title = ''\) \{[\s\S]*?\n\}/;
  if (!streamRe.test(source)) throw new Error('v6.3.8 patch target missing: v6.3.7 YanHH3D stream object');

  source = source.replace(streamRe, String.raw`function v638DmId(link) {
  const src = [link?.sourceUrl, link?.url].filter(Boolean).join(' ');
  return src.match(/dailymotion\.com\/(?:embed\/)?video\/([A-Za-z0-9]+)/i)?.[1] || null;
}
function v638DmBridgeUrl(link) {
  const id = v638DmId(link);
  return id ? (V626_PUBLIC_BASE + '/yanhh3d/dm/' + encodeURIComponent(id) + '/master.m3u8') : null;
}
function v635YanDelivery(link) {
  if (v638DmId(link)) return 'dm-bridge';
  const src = [link?.sourceUrl, link?.url, link?.serverName].filter(Boolean).join(' ').toLowerCase();
  if (/dailymotion\.com|dailymotion\.net|dmcdn\.net/.test(src)) return 'dm-bridge';
  return V626_YANHH3D_MEDIA_RELAY ? 'relay' : 'direct';
}
function v625YanStreamObject(link, title = '') {
  const fmt = link.isM3u8 ? 'HLS' : 'MP4';
  const delivery = v635YanDelivery(link);
  const requestHeaders = link.headers && typeof link.headers === 'object' ? link.headers : {};
  const hasRequestHeaders = Object.keys(requestHeaders).length > 0;
  let url = link.url;
  if (delivery === 'dm-bridge') url = v638DmBridgeUrl(link) || link.url;
  else if (delivery === 'relay') url = v626RelayUrl(link.url, requestHeaders, Boolean(link.isM3u8));
  const behaviorHints = delivery === 'relay'
    ? { notWebReady:false, bingeGroup:'webphim-yanhh3d-relay-r5' }
    : delivery === 'dm-bridge'
      ? { notWebReady:false, bingeGroup:'webphim-yanhh3d-dm-bridge-r5' }
      : {
          notWebReady:hasRequestHeaders,
          ...(hasRequestHeaders ? { proxyHeaders:{ request:requestHeaders } } : {}),
          bingeGroup:'webphim-yanhh3d-direct-r5'
        };
  return {
    name:'🐲 YanHH3D',
    title:[link.serverName, fmt, title].filter(Boolean).join(' • '),
    url,
    mimeType:link.isM3u8 ? 'application/vnd.apple.mpegurl' : 'video/mp4',
    sourceType:link.isM3u8 ? 'hls' : 'video/mp4',
    type:link.isM3u8 ? 'hls' : 'mp4',
    _provider:'YanHH3D',
    _rawText:[link.serverName, title, delivery, v638DmId(link) ? 'dm-id' : '', hasRequestHeaders ? 'headers' : 'no-headers'].filter(Boolean).join(' '),
    behaviorHints
  };
}`);

  const routeMarker = "  if (path === '/yanhh3d/manifest.json') return sendJson(res, 200, v625YanManifest(), 0);";
  if (!source.includes(routeMarker)) throw new Error('v6.3.8 patch target missing: YanHH3D manifest route');
  const routeBlock = String.raw`
async function v638DmMasterResponse(req, res, id) {
  if (!/^[A-Za-z0-9]+$/.test(String(id || ''))) return sendJson(res, 400, { error:'invalid Dailymotion id' }, 0);
  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
  const ref = 'https://www.dailymotion.com/';
  const dmHeaders = { 'User-Agent':ua, Referer:ref, Origin:'https://www.dailymotion.com', Accept:'*/*', 'Accept-Encoding':'identity' };
  let metadata;
  try {
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 10000);
    try {
      const mr = await fetch('https://www.dailymotion.com/player/metadata/video/' + encodeURIComponent(id), {
        headers:{ 'User-Agent':ua, Referer:ref, Origin:'https://www.dailymotion.com', Accept:'application/json,*/*' },
        redirect:'follow', signal:ctl.signal
      });
      if (!mr.ok) return sendJson(res, mr.status || 502, { error:'Dailymotion metadata HTTP ' + mr.status }, 0);
      metadata = await mr.json();
    } finally { clearTimeout(timer); }
  } catch (e) {
    return sendJson(res, 502, { error:'Dailymotion metadata fetch failed', detail:String(e?.message || e).slice(0,160) }, 0);
  }
  const q = metadata?.qualities || {};
  let hls = null;
  for (const k of ['auto','1080','720','480','380','240']) {
    const arr = Array.isArray(q[k]) ? q[k] : q[k] ? [q[k]] : [];
    const hit = arr.find(x => x?.url && /\.m3u8(?:$|[?#])/i.test(String(x.url)));
    if (hit) { hls = String(hit.url); break; }
  }
  if (!hls) return sendJson(res, 502, { error:'Dailymotion metadata has no HLS URL' }, 0);
  let upstream;
  try {
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 12000);
    try { upstream = await fetch(hls, { headers:dmHeaders, redirect:'follow', signal:ctl.signal }); }
    finally { clearTimeout(timer); }
  } catch (e) {
    return sendJson(res, 502, { error:'Dailymotion HLS fetch failed', detail:String(e?.message || e).slice(0,160) }, 0);
  }
  if (!upstream.ok) return sendJson(res, upstream.status || 502, { error:'Dailymotion HLS HTTP ' + upstream.status }, 0);
  const body = await upstream.text();
  if (!/#EXTM3U/i.test(body)) return sendJson(res, 502, { error:'Dailymotion response is not HLS' }, 0);
  const rewritten = v626RewriteHls(body, upstream.url || hls, dmHeaders);
  const out = Buffer.from(rewritten, 'utf8');
  res.writeHead(200, {
    'content-type':'application/vnd.apple.mpegurl; charset=utf-8',
    'content-length':String(out.length),
    'cache-control':'no-store, no-transform',
    'access-control-allow-origin':'*',
    'access-control-allow-methods':'GET,HEAD,OPTIONS',
    'access-control-allow-headers':'Range,If-Range,If-None-Match',
    'access-control-expose-headers':'content-length,content-range,accept-ranges'
  });
  if (req.method === 'HEAD') return res.end();
  res.end(out);
}
`;
  source = source.replace(routeMarker, routeBlock + '\n' + routeMarker + "\n  const v638DmMatch = path.match(/^\\/yanhh3d\\/dm\\/([A-Za-z0-9]+)\\/master\\.m3u8$/);\n  if (v638DmMatch) { await v638DmMasterResponse(req, res, v638DmMatch[1]); return; }");

  const videosR4 = "  const videos = nums.map(n => ({ id: 'yanhh3d:' + m[1] + ':r4:' + n, title: 'Tập ' + n, season: 1, episode: n }));";
  if (!source.includes(videosR4)) throw new Error('v6.3.8 patch target missing: r4 video ids');
  source = source.replace(videosR4,
    "  const videos = nums.map(n => ({ id: 'yanhh3d:' + m[1] + ':r5:' + n, title: 'Tập ' + n, season: 1, episode: n }));"
  );

  const idR4 = "const m = String(id).match(/^yanhh3d:([A-Za-z0-9_-]+)(?::(?:(?:r2|r3|r4):)?(\\d+(?:\\.\\d+)?))?$/);";
  if (!source.includes(idR4)) throw new Error('v6.3.8 patch target missing: r4 id parser');
  source = source.replace(idR4,
    "const m = String(id).match(/^yanhh3d:([A-Za-z0-9_-]+)(?::(?:(?:r2|r3|r4|r5):)?(\\d+(?:\\.\\d+)?))?$/);"
  );

  const diag = "return sendJson(res, 200, { version:'6.3.7', ok:Boolean(d || r || dm), decision:d, resolution:r, dailymotionMatch:dm, deliveryPolicy:{ dailymotion:'direct-with-proxyHeaders', fbcdn:'relay-only-if-compatible', playbackIdentity:'r4' } }, 0);";
  if (!source.includes(diag)) throw new Error('v6.3.8 patch target missing: source diag');
  source = source.replace(diag,
    "return sendJson(res, 200, { version:'6.3.8', ok:Boolean(d || r || dm), decision:d, resolution:r, dailymotionMatch:dm, deliveryPolicy:{ dailymotion:'fresh-server-bridge', fbcdn:'relay-only-if-compatible', playbackIdentity:'r5' } }, 0);"
  );

  source = source.replace("version: '1.1.7', name: '🐲 YanHH3D'", "version: '1.1.8', name: '🐲 YanHH3D'");
  source = source.replace("description: 'YanHH3D 1.1.7 • Dailymotion direct playback with Nuvio proxyHeaders • strict matching • r4 identity'", "description: 'YanHH3D 1.1.8 • fresh server-side Dailymotion bridge • strict matching • r5 identity'");
  source = source.replaceAll('6.3.7', '6.3.8');
  source = source.replaceAll('single-process-v6.3.7', 'single-process-v6.3.8');
  return source;
};
