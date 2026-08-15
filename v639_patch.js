module.exports = function applyV639(source) {
  const bridgeUrlOld = "function v638DmBridgeUrl(link) {\n  const id = v638DmId(link);\n  return id ? (V626_PUBLIC_BASE + '/yanhh3d/dm/' + encodeURIComponent(id) + '/master.m3u8') : null;\n}";
  const bridgeUrlNew = "function v638DmBridgeUrl(link) {\n  const id = v638DmId(link);\n  return id ? (V626_PUBLIC_BASE + '/yanhh3d/dm/' + encodeURIComponent(id) + '/video.mp4') : null;\n}";
  if (!source.includes(bridgeUrlOld)) throw new Error('v6.3.9 patch target missing: Dailymotion bridge URL');
  source = source.replace(bridgeUrlOld, bridgeUrlNew);

  const streamRe = /function v625YanStreamObject\(link, title = ''\) \{[\s\S]*?\n\}/;
  if (!streamRe.test(source)) throw new Error('v6.3.9 patch target missing: YanHH3D stream object');
  source = source.replace(streamRe, String.raw`function v625YanStreamObject(link, title = '') {
  const delivery = v635YanDelivery(link);
  const isDmMp4 = delivery === 'dm-bridge';
  const isHls = !isDmMp4 && Boolean(link.isM3u8);
  const fmt = isDmMp4 ? 'MP4' : (isHls ? 'HLS' : 'MP4');
  const requestHeaders = link.headers && typeof link.headers === 'object' ? link.headers : {};
  const hasRequestHeaders = Object.keys(requestHeaders).length > 0;
  let url = link.url;
  if (isDmMp4) url = v638DmBridgeUrl(link) || link.url;
  else if (delivery === 'relay') url = v626RelayUrl(link.url, requestHeaders, Boolean(link.isM3u8));
  const behaviorHints = delivery === 'relay'
    ? { notWebReady:false, bingeGroup:'webphim-yanhh3d-relay-r6' }
    : isDmMp4
      ? { notWebReady:false, bingeGroup:'webphim-yanhh3d-dm-mp4-r6' }
      : {
          notWebReady:hasRequestHeaders,
          ...(hasRequestHeaders ? { proxyHeaders:{ request:requestHeaders } } : {}),
          bingeGroup:'webphim-yanhh3d-direct-r6'
        };
  return {
    name:'🐲 YanHH3D',
    title:[link.serverName, fmt, title].filter(Boolean).join(' • '),
    url,
    mimeType:isHls ? 'application/vnd.apple.mpegurl' : 'video/mp4',
    sourceType:isHls ? 'hls' : 'video/mp4',
    type:isHls ? 'hls' : 'mp4',
    _provider:'YanHH3D',
    _rawText:[link.serverName, title, delivery, v638DmId(link) ? 'dm-id' : '', isDmMp4 ? 'progressive-mp4' : '', hasRequestHeaders ? 'headers' : 'no-headers'].filter(Boolean).join(' '),
    behaviorHints
  };
}`);

  const routeNeedle = "  const v638DmMatch = path.match(/^\\/yanhh3d\\/dm\\/([A-Za-z0-9]+)\\/master\\.m3u8$/);\n  if (v638DmMatch) { await v638DmMasterResponse(req, res, v638DmMatch[1]); return; }";
  if (!source.includes(routeNeedle)) throw new Error('v6.3.9 patch target missing: Dailymotion master route');

  const mp4Block = String.raw`
const v639DmMp4Cache = new Map();
async function v639ResolveDmMp4(id) {
  const key = String(id || '');
  const cached = v639DmMp4Cache.get(key);
  if (cached && cached.exp > Date.now()) return cached.url;
  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
  const ref = 'https://www.dailymotion.com/';
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 10000);
  try {
    const mr = await fetch('https://www.dailymotion.com/player/metadata/video/' + encodeURIComponent(key), {
      headers:{
        'User-Agent':ua,
        Referer:ref,
        Origin:'https://www.dailymotion.com',
        Accept:'application/json,*/*',
        Cookie:'family_filter=off; ff=off',
        Priority:'u=1, i'
      },
      redirect:'follow', signal:ctl.signal
    });
    if (!mr.ok) throw new Error('metadata HTTP ' + mr.status);
    const metadata = await mr.json();
    const q = metadata?.qualities || {};
    const keys = Object.keys(q).sort((a,b) => {
      const an = Number(String(a).match(/^\d+/)?.[0] || -1);
      const bn = Number(String(b).match(/^\d+/)?.[0] || -1);
      return bn - an;
    });
    let selected = null;
    for (const quality of keys) {
      const arr = Array.isArray(q[quality]) ? q[quality] : q[quality] ? [q[quality]] : [];
      const hit = arr.find(x => x?.url && (String(x.type || '').toLowerCase() === 'video/mp4' || /\.mp4(?:$|[?#])/i.test(String(x.url))));
      if (hit) { selected = String(hit.url); break; }
    }
    if (!selected) throw new Error('metadata has no progressive MP4');
    v639DmMp4Cache.set(key, { url:selected, exp:Date.now() + 120000 });
    return selected;
  } finally { clearTimeout(timer); }
}
async function v639DmMp4Response(req, res, id) {
  if (!/^[A-Za-z0-9]+$/.test(String(id || ''))) return sendJson(res, 400, { error:'invalid Dailymotion id' }, 0);
  let mp4;
  try { mp4 = await v639ResolveDmMp4(id); }
  catch (e) { return sendJson(res, 502, { error:'Dailymotion progressive MP4 resolve failed', detail:String(e?.message || e).slice(0,180) }, 0); }

  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
  const headers = {
    'User-Agent':ua,
    Referer:'https://www.dailymotion.com/',
    Origin:'https://www.dailymotion.com',
    Accept:'video/mp4,*/*',
    'Accept-Encoding':'identity',
    Cookie:'family_filter=off; ff=off',
    Priority:'u=1, i'
  };
  if (req.headers.range) headers.Range = req.headers.range;
  if (req.headers['if-range']) headers['If-Range'] = req.headers['if-range'];
  if (req.headers['if-none-match']) headers['If-None-Match'] = req.headers['if-none-match'];

  let upstream;
  try {
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 20000);
    try {
      upstream = await fetch(mp4, {
        method:req.method === 'HEAD' ? 'HEAD' : 'GET',
        headers, redirect:'follow', signal:ctl.signal
      });
    } finally { clearTimeout(timer); }
  } catch (e) {
    return sendJson(res, 502, { error:'Dailymotion MP4 fetch failed', detail:String(e?.message || e).slice(0,180) }, 0);
  }
  if (!upstream.ok && upstream.status !== 206 && upstream.status !== 304) {
    if (upstream.status === 403 || upstream.status === 410) v639DmMp4Cache.delete(String(id));
    return sendJson(res, upstream.status || 502, { error:'Dailymotion MP4 HTTP ' + upstream.status }, 0);
  }
  const outHeaders = {
    'content-type':'video/mp4',
    'cache-control':'private, max-age=60, no-transform',
    'access-control-allow-origin':'*',
    'access-control-allow-methods':'GET,HEAD,OPTIONS',
    'access-control-allow-headers':'Range,If-Range,If-None-Match',
    'access-control-expose-headers':'content-length,content-range,accept-ranges,etag,last-modified',
    'accept-ranges':upstream.headers.get('accept-ranges') || 'bytes'
  };
  for (const h of ['content-length','content-range','etag','last-modified']) {
    const v = upstream.headers.get(h); if (v) outHeaders[h] = v;
  }
  res.writeHead(upstream.status, outHeaders);
  if (req.method === 'HEAD' || upstream.status === 304 || !upstream.body) { res.end(); return; }
  try {
    for await (const chunk of upstream.body) {
      if (!res.write(chunk)) await new Promise(resolve => res.once('drain', resolve));
    }
    res.end();
  } catch { try { res.destroy(); } catch {} }
}
`;
  source = source.replace(routeNeedle, mp4Block + '\n' + routeNeedle + "\n  const v639DmMp4Match = path.match(/^\\/yanhh3d\\/dm\\/([A-Za-z0-9]+)\\/video\\.mp4$/);\n  if (v639DmMp4Match) { await v639DmMp4Response(req, res, v639DmMp4Match[1]); return; }");

  const videosR5 = "  const videos = nums.map(n => ({ id: 'yanhh3d:' + m[1] + ':r5:' + n, title: 'Tập ' + n, season: 1, episode: n }));";
  if (!source.includes(videosR5)) throw new Error('v6.3.9 patch target missing: r5 video ids');
  source = source.replace(videosR5,
    "  const videos = nums.map(n => ({ id: 'yanhh3d:' + m[1] + ':r6:' + n, title: 'Tập ' + n, season: 1, episode: n }));"
  );

  const idR5 = "const m = String(id).match(/^yanhh3d:([A-Za-z0-9_-]+)(?::(?:(?:r2|r3|r4|r5):)?(\\d+(?:\\.\\d+)?))?$/);";
  if (!source.includes(idR5)) throw new Error('v6.3.9 patch target missing: r5 id parser');
  source = source.replace(idR5,
    "const m = String(id).match(/^yanhh3d:([A-Za-z0-9_-]+)(?::(?:(?:r2|r3|r4|r5|r6):)?(\\d+(?:\\.\\d+)?))?$/);"
  );

  const diag = "return sendJson(res, 200, { version:'6.3.8', ok:Boolean(d || r || dm), decision:d, resolution:r, dailymotionMatch:dm, deliveryPolicy:{ dailymotion:'fresh-server-bridge', fbcdn:'relay-only-if-compatible', playbackIdentity:'r5' } }, 0);";
  if (!source.includes(diag)) throw new Error('v6.3.9 patch target missing: source diag');
  source = source.replace(diag,
    "return sendJson(res, 200, { version:'6.3.9', ok:Boolean(d || r || dm), decision:d, resolution:r, dailymotionMatch:dm, deliveryPolicy:{ dailymotion:'progressive-mp4-bridge', fbcdn:'relay-only-if-compatible', playbackIdentity:'r6' } }, 0);"
  );

  source = source.replace("version: '1.1.8', name: '🐲 YanHH3D'", "version: '1.1.9', name: '🐲 YanHH3D'");
  source = source.replace("description: 'YanHH3D 1.1.8 • fresh server-side Dailymotion bridge • strict matching • r5 identity'", "description: 'YanHH3D 1.1.9 • progressive Dailymotion MP4 bridge for Nuvio Desktop • strict matching • r6 identity'");
  source = source.replaceAll('6.3.8', '6.3.9');
  source = source.replaceAll('single-process-v6.3.8', 'single-process-v6.3.9');
  return source;
};
