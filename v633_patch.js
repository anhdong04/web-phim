module.exports = function applyV633(source) {
  const oldRequire = "const v625YanModule = require('./v625_yanhh3d');";
  if (!source.includes(oldRequire)) throw new Error('v6.3.3 patch target missing: YanHH3D module require');
  source = source.replace(oldRequire, "const v625YanModule = require('./v633_yanhh3d');");

  const manifestRoute = "  if (path === '/yanhh3d/manifest.json') return sendJson(res, 200, v625YanManifest(), 0);";
  if (!source.includes(manifestRoute)) throw new Error('v6.3.3 patch target missing: YanHH3D manifest route');
  source = source.replace(manifestRoute, manifestRoute + String.raw`
  if (path === '/yanhh3d/source-diag') {
    const d = v625Yan && typeof v625Yan.getFbDecision === 'function' ? v625Yan.getFbDecision() : null;
    return sendJson(res, 200, { version:'6.3.3', ok:Boolean(d), decision:d }, 0);
  }`);

  source = source.replace("version: '1.1.2', name: '🐲 YanHH3D'", "version: '1.1.3', name: '🐲 YanHH3D'");
  source = source.replace("description: 'YanHH3D 1.1.2 • MPV codec/TS probe • Thuyết minh/Vietsub streams'", "description: 'YanHH3D 1.1.3 • plain-HLS preference • PNG carrier rejection • Thuyết minh/Vietsub streams'");
  source = source.replaceAll('6.3.2', '6.3.3');
  source = source.replaceAll('single-process-v6.3.2', 'single-process-v6.3.3');
  return source;
};
