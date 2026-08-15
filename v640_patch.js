module.exports = function applyV640(source) {
  const streamFnMarker = "async function v625YanStreamsForDetail(detailUrl, episode = 1, title = '') {";
  if (!source.includes(streamFnMarker)) throw new Error('v6.4.0 patch target missing: YanHH3D streams function');

  const vlcHelper = String.raw`function v640YanVlcExternalStream(stream, title = '') {
  const target = String(stream?.url || '').trim();
  if (!/^https?:\/\//i.test(target)) return null;
  const displayTitle = String(title || stream?.title || 'YanHH3D').trim();
  const externalUrl = 'webphim-vlc://play?url=' + encodeURIComponent(target) + '&title=' + encodeURIComponent(displayTitle);
  return {
    name:'🟠 YanHH3D • VLC Windows',
    title:['VLC Windows', stream?.title || displayTitle].filter(Boolean).join(' • '),
    externalUrl,
    _provider:'YanHH3D-VLC',
    _rawText:['YanHH3D', 'VLC', 'Windows', displayTitle].filter(Boolean).join(' '),
    behaviorHints:{ notWebReady:true, bingeGroup:'webphim-yanhh3d-vlc-r7' }
  };
}
`;
  source = source.replace(streamFnMarker, vlcHelper + streamFnMarker);

  const loopOld = "  const links = batches.flat(); const seen = new Set(), out = []; for (const link of links) { if (!link?.url || seen.has(link.url)) continue; seen.add(link.url); out.push(v625YanStreamObject(link, title || d.title)); if (out.length >= V625_YANHH3D_MAX_STREAMS) break; } return out;";
  if (!source.includes(loopOld)) throw new Error('v6.4.0 patch target missing: YanHH3D stream loop');
  const loopNew = "  const links = batches.flat(); const seen = new Set(), out = []; let mediaCount = 0; for (const link of links) { if (!link?.url || seen.has(link.url)) continue; seen.add(link.url); const normal = v625YanStreamObject(link, title || d.title); out.push(normal); const vlc = v640YanVlcExternalStream(normal, title || d.title); if (vlc) out.push(vlc); mediaCount++; if (mediaCount >= V625_YANHH3D_MAX_STREAMS) break; } return out;";
  source = source.replace(loopOld, loopNew);

  const videosR6 = "  const videos = nums.map(n => ({ id: 'yanhh3d:' + m[1] + ':r6:' + n, title: 'Tập ' + n, season: 1, episode: n }));";
  if (!source.includes(videosR6)) throw new Error('v6.4.0 patch target missing: r6 video ids');
  source = source.replace(videosR6,
    "  const videos = nums.map(n => ({ id: 'yanhh3d:' + m[1] + ':r7:' + n, title: 'Tập ' + n, season: 1, episode: n }));"
  );

  const idR6 = "const m = String(id).match(/^yanhh3d:([A-Za-z0-9_-]+)(?::(?:(?:r2|r3|r4|r5|r6):)?(\\d+(?:\\.\\d+)?))?$/);";
  if (!source.includes(idR6)) throw new Error('v6.4.0 patch target missing: r6 id parser');
  source = source.replace(idR6,
    "const m = String(id).match(/^yanhh3d:([A-Za-z0-9_-]+)(?::(?:(?:r2|r3|r4|r5|r6|r7):)?(\\d+(?:\\.\\d+)?))?$/);"
  );

  const requestMarker = "  const parsedBase = v500Resolved.parsedBase, path = parsedBase.rest, cfg = parsedBase.config;";
  if (!source.includes(requestMarker)) throw new Error('v6.4.0 patch target missing: request marker');
  const installerRoute = String.raw`
  if (path === '/yanhh3d/vlc/install.ps1') {
    try {
      const installer = require('node:fs').readFileSync(require.resolve('./tools/windows/install-webphim-vlc.ps1'), 'utf8');
      res.writeHead(200, {
        'content-type':'text/plain; charset=utf-8',
        'content-disposition':'attachment; filename="install-webphim-vlc.ps1"',
        'cache-control':'public, max-age=300'
      });
      res.end(installer);
    } catch (e) {
      sendJson(res, 500, { error:'VLC installer unavailable', detail:String(e?.message || e).slice(0,180) }, 0);
    }
    return;
  }
`;
  source = source.replace(requestMarker, requestMarker + installerRoute);

  const diagOld = "return sendJson(res, 200, { version:'6.3.9', ok:Boolean(d || r || dm), decision:d, resolution:r, dailymotionMatch:dm, deliveryPolicy:{ dailymotion:'progressive-mp4-bridge', fbcdn:'relay-only-if-compatible', playbackIdentity:'r6' } }, 0);";
  if (source.includes(diagOld)) {
    source = source.replace(diagOld,
      "return sendJson(res, 200, { version:'6.4.0', ok:Boolean(d || r || dm), decision:d, resolution:r, dailymotionMatch:dm, deliveryPolicy:{ dailymotion:'progressive-mp4-bridge', fbcdn:'relay-only-if-compatible', vlcWindows:'externalUrl-webphim-vlc', playbackIdentity:'r7' } }, 0);"
    );
  }

  source = source.replace("version: '1.1.9', name: '🐲 YanHH3D'", "version: '1.2.0', name: '🐲 YanHH3D'");
  source = source.replace("description: 'YanHH3D 1.1.9 • progressive Dailymotion MP4 bridge for Nuvio Desktop • strict matching • r6 identity'", "description: 'YanHH3D 1.2.0 • normal playback + VLC Windows external fallback • r7 identity'");
  source = source.replaceAll('6.3.9', '6.4.0');
  source = source.replaceAll('single-process-v6.3.9', 'single-process-v6.4.0');
  return source;
};
