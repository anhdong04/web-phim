// v6.3.6: reject wrong-film Dailymotion fallbacks by requiring a strong core-title match.
module.exports = function applyV636(source) {
  const oldRequire = "const v625YanModule = require('./v634_yanhh3d');";
  if (!source.includes(oldRequire)) throw new Error('v6.3.6 patch target missing: YanHH3D module require');
  source = source.replace(oldRequire, "const v625YanModule = require('./v636_yanhh3d');");

  const diag = "return sendJson(res, 200, { version:'6.3.5', ok:Boolean(d || r), decision:d, resolution:r, deliveryPolicy:{ dailymotion:'direct', fbcdn:'relay-only-if-compatible', playbackIdentity:'r3' } }, 0);";
  if (!source.includes(diag)) throw new Error('v6.3.6 patch target missing: source diag');
  source = source.replace(diag,
    "const dm = v625Yan && typeof v625Yan.getDailymotionMatch === 'function' ? v625Yan.getDailymotionMatch() : null; return sendJson(res, 200, { version:'6.3.6', ok:Boolean(d || r || dm), decision:d, resolution:r, dailymotionMatch:dm, deliveryPolicy:{ dailymotion:'direct-strict-title-match', fbcdn:'relay-only-if-compatible', playbackIdentity:'r3' } }, 0);"
  );

  source = source.replace("version: '1.1.5', name: '🐲 YanHH3D'", "version: '1.1.6', name: '🐲 YanHH3D'");
  source = source.replace("description: 'YanHH3D 1.1.5 • direct Dailymotion playback • fresh r3 playback identity • compatible server fallback'", "description: 'YanHH3D 1.1.6 • strict Dailymotion title matching • direct compatible playback • no wrong-film fallback'");
  source = source.replaceAll('6.3.5', '6.3.6');
  source = source.replaceAll('single-process-v6.3.5', 'single-process-v6.3.6');
  return source;
};
