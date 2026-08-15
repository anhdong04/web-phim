module.exports = function applyV637(source) {
  const streamRe = /function v625YanStreamObject\(link, title = ''\) \{[\s\S]*?\n\}/;
  if (!streamRe.test(source)) throw new Error('v6.3.7 patch target missing: YanHH3D stream object');
  source = source.replace(streamRe, String.raw`function v635YanDelivery(link) {
  const src = [link?.sourceUrl, link?.url, link?.serverName].filter(Boolean).join(' ').toLowerCase();
  if (/dailymotion\.com|dailymotion\.net|dmcdn\.net/.test(src)) return 'direct';
  return V626_YANHH3D_MEDIA_RELAY ? 'relay' : 'direct';
}
function v625YanStreamObject(link, title = '') {
  const fmt = link.isM3u8 ? 'HLS' : 'MP4';
  const delivery = v635YanDelivery(link);
  const requestHeaders = link.headers && typeof link.headers === 'object' ? link.headers : {};
  const hasRequestHeaders = Object.keys(requestHeaders).length > 0;
  const url = delivery === 'relay' ? v626RelayUrl(link.url, requestHeaders, Boolean(link.isM3u8)) : link.url;
  const behaviorHints = delivery === 'relay'
    ? { notWebReady:false, bingeGroup:'webphim-yanhh3d-relay-r4' }
    : {
        notWebReady:hasRequestHeaders,
        ...(hasRequestHeaders ? { proxyHeaders:{ request:requestHeaders } } : {}),
        bingeGroup:'webphim-yanhh3d-direct-r4'
      };
  return {
    name:'🐲 YanHH3D',
    title:[link.serverName, fmt, title].filter(Boolean).join(' • '),
    url,
    mimeType:link.isM3u8 ? 'application/vnd.apple.mpegurl' : 'video/mp4',
    sourceType:link.isM3u8 ? 'hls' : 'video/mp4',
    type:link.isM3u8 ? 'hls' : 'mp4',
    _provider:'YanHH3D',
    _rawText:[link.serverName, title, link.url, delivery, hasRequestHeaders ? 'headers' : 'no-headers'].filter(Boolean).join(' '),
    behaviorHints
  };
}`);

  const videosR3 = "  const videos = nums.map(n => ({ id: 'yanhh3d:' + m[1] + ':r3:' + n, title: 'Tập ' + n, season: 1, episode: n }));";
  if (!source.includes(videosR3)) throw new Error('v6.3.7 patch target missing: r3 video ids');
  source = source.replace(videosR3,
    "  const videos = nums.map(n => ({ id: 'yanhh3d:' + m[1] + ':r4:' + n, title: 'Tập ' + n, season: 1, episode: n }));"
  );

  const idR3 = "const m = String(id).match(/^yanhh3d:([A-Za-z0-9_-]+)(?::(?:(?:r2|r3):)?(\\d+(?:\\.\\d+)?))?$/);";
  if (!source.includes(idR3)) throw new Error('v6.3.7 patch target missing: r3 id parser');
  source = source.replace(idR3,
    "const m = String(id).match(/^yanhh3d:([A-Za-z0-9_-]+)(?::(?:(?:r2|r3|r4):)?(\\d+(?:\\.\\d+)?))?$/);"
  );

  const diag = "return sendJson(res, 200, { version:'6.3.6', ok:Boolean(d || r || dm), decision:d, resolution:r, dailymotionMatch:dm, deliveryPolicy:{ dailymotion:'direct-strict-title-match', fbcdn:'relay-only-if-compatible', playbackIdentity:'r3' } }, 0);";
  if (!source.includes(diag)) throw new Error('v6.3.7 patch target missing: source diag');
  source = source.replace(diag,
    "return sendJson(res, 200, { version:'6.3.7', ok:Boolean(d || r || dm), decision:d, resolution:r, dailymotionMatch:dm, deliveryPolicy:{ dailymotion:'direct-with-proxyHeaders', fbcdn:'relay-only-if-compatible', playbackIdentity:'r4' } }, 0);"
  );

  source = source.replace("version: '1.1.6', name: '🐲 YanHH3D'", "version: '1.1.7', name: '🐲 YanHH3D'");
  source = source.replace("description: 'YanHH3D 1.1.6 • strict Dailymotion title matching • direct compatible playback • no wrong-film fallback'", "description: 'YanHH3D 1.1.7 • Dailymotion direct playback with Nuvio proxyHeaders • strict matching • r4 identity'");
  source = source.replaceAll('6.3.6', '6.3.7');
  source = source.replaceAll('single-process-v6.3.6', 'single-process-v6.3.7');
  return source;
};
