module.exports = function applyV634(source) {
  const oldRequire = "const v625YanModule = require('./v633_yanhh3d');";
  if (!source.includes(oldRequire)) throw new Error('v6.3.4 patch target missing: YanHH3D module require');
  source = source.replace(oldRequire, "const v625YanModule = require('./v634_yanhh3d');");

  const oldDiag = "return sendJson(res, 200, { version:'6.3.3', ok:Boolean(d), decision:d }, 0);";
  if (!source.includes(oldDiag)) throw new Error('v6.3.4 patch target missing: source diag');
  source = source.replace(oldDiag, "const r = v625Yan && typeof v625Yan.getResolveSummary === 'function' ? v625Yan.getResolveSummary() : null; return sendJson(res, 200, { version:'6.3.4', ok:Boolean(d || r), decision:d, resolution:r }, 0);");

  source = source.replace("version: '1.1.3', name: '🐲 YanHH3D'", "version: '1.1.4', name: '🐲 YanHH3D'");
  source = source.replace("description: 'YanHH3D 1.1.3 • plain-HLS preference • PNG carrier rejection • Thuyết minh/Vietsub streams'", "description: 'YanHH3D 1.1.4 • compatible-server priority • Dailymotion fallback • Thuyết minh/Vietsub streams'");
  source = source.replaceAll('6.3.3', '6.3.4');
  source = source.replaceAll('single-process-v6.3.3', 'single-process-v6.3.4');
  return source;
};
