module.exports = function applyV635(source) {
  const streamRe = /function v625YanStreamObject\(link, title = ''\) \{[\s\S]*?\n\}/;
  if (!streamRe.test(source)) throw new Error('v6.3.5 patch target missing: YanHH3D stream object');
  source = source.replace(streamRe, String.raw`function v635YanDelivery(link) {
  const src = [link?.sourceUrl, link?.url, link?.serverName].filter(Boolean).join(' ').toLowerCase();
  // Dailymotion HLS is already a normal signed CDN stream. Relaying it through the
  // FB-CDN compatibility proxy adds latency and can make libmpv stall before loadfile.
  if (/dailymotion\.com|dailymotion\.net|dmcdn\.net/.test(src)) return 'direct';
  return V626_YANHH3D_MEDIA_RELAY ? 'relay' : 'direct';
}
function v625YanStreamObject(link, title = '') {
  const fmt = link.isM3u8 ? 'HLS' : 'MP4';
  const delivery = v635YanDelivery(link);
  const url = delivery === 'relay' ? v626RelayUrl(link.url, link.headers || {}, Boolean(link.isM3u8)) : link.url;
  return {
    name: '🐲 YanHH3D',
    title: [link.serverName, fmt, title].filter(Boolean).join(' • '),
    url,
    mimeType: link.isM3u8 ? 'application/vnd.apple.mpegurl' : 'video/mp4',
    sourceType: link.isM3u8 ? 'hls' : 'video/mp4',
    type: link.isM3u8 ? 'hls' : 'mp4',
    _provider: 'YanHH3D',
    _rawText: [link.serverName, title, link.url, delivery].filter(Boolean).join(' '),
    behaviorHints: delivery === 'relay'
      ? { notWebReady:false, bingeGroup:'webphim-yanhh3d-relay-r3' }
      : { notWebReady:false, bingeGroup:'webphim-yanhh3d-direct-r3' }
  };
}`);

  const videosR2 = "  const videos = nums.map(n => ({ id: 'yanhh3d:' + m[1] + ':r2:' + n, title: 'Tập ' + n, season: 1, episode: n }));";
  if (!source.includes(videosR2)) throw new Error('v6.3.5 patch target missing: r2 video ids');
  source = source.replace(videosR2,
    "  const videos = nums.map(n => ({ id: 'yanhh3d:' + m[1] + ':r3:' + n, title: 'Tập ' + n, season: 1, episode: n }));"
  );

  const idR2 = "const m = String(id).match(/^yanhh3d:([A-Za-z0-9_-]+)(?::(?:r2:)?(\\d+(?:\\.\\d+)?))?$/);";
  if (!source.includes(idR2)) throw new Error('v6.3.5 patch target missing: r2 id parser');
  source = source.replace(idR2,
    "const m = String(id).match(/^yanhh3d:([A-Za-z0-9_-]+)(?::(?:(?:r2|r3):)?(\\d+(?:\\.\\d+)?))?$/);"
  );

  const diag = "return sendJson(res, 200, { version:'6.3.4', ok:Boolean(d || r), decision:d, resolution:r }, 0);";
  if (!source.includes(diag)) throw new Error('v6.3.5 patch target missing: source diag version');
  source = source.replace(diag,
    "return sendJson(res, 200, { version:'6.3.5', ok:Boolean(d || r), decision:d, resolution:r, deliveryPolicy:{ dailymotion:'direct', fbcdn:'relay-only-if-compatible', playbackIdentity:'r3' } }, 0);"
  );

  source = source.replace("version: '1.1.4', name: '🐲 YanHH3D'", "version: '1.1.5', name: '🐲 YanHH3D'");
  source = source.replace("description: 'YanHH3D 1.1.4 • compatible-server priority • Dailymotion fallback • Thuyết minh/Vietsub streams'", "description: 'YanHH3D 1.1.5 • direct Dailymotion playback • fresh r3 playback identity • compatible server fallback'");
  source = source.replaceAll('6.3.4', '6.3.5');
  source = source.replaceAll('single-process-v6.3.4', 'single-process-v6.3.5');
  return source;
};
