module.exports = function applyV630(source) {
  const videoIds = "  const videos = nums.map(n => ({ id: 'yanhh3d:' + m[1] + ':' + n, title: 'Tập ' + n, season: 1, episode: n }));";
  if (!source.includes(videoIds)) throw new Error('v6.3.0 patch target missing: YanHH3D video ids');
  source = source.replace(videoIds,
    "  const videos = nums.map(n => ({ id: 'yanhh3d:' + m[1] + ':r2:' + n, title: 'Tập ' + n, season: 1, episode: n }));"
  );

  const customRe = /async function v625YanCustomStreams\(type, id\) \{[\s\S]*?\n\}/;
  const customMatch = source.match(customRe)?.[0];
  if (!customMatch) throw new Error('v6.3.0 patch target missing: YanHH3D custom stream parser');
  const customNew = customMatch.replace(
    /\^yanhh3d:\(\[A-Za-z0-9_-\]\+\)\(\?:\:\(\\d\+\(\?:\\\.\\d\+\)\?\)\)\?\$/,
    '^yanhh3d:([A-Za-z0-9_-]+)(?::(?:r2:)?(\\d+(?:\\.\\d+)?))?$'
  );
  if (customNew === customMatch) {
    const oldLiteral = "const m = String(id).match(/^yanhh3d:([A-Za-z0-9_-]+)(?::(\\d+(?:\\.\\d+)?))?$/);";
    if (!customMatch.includes(oldLiteral)) throw new Error('v6.3.0 patch target missing: YanHH3D id regex');
    source = source.replace(customMatch, customMatch.replace(oldLiteral,
      "const m = String(id).match(/^yanhh3d:([A-Za-z0-9_-]+)(?::(?:r2:)?(\\d+(?:\\.\\d+)?))?$/);"
    ));
  } else {
    source = source.replace(customMatch, customNew);
  }

  const sourceType = "sourceType: link.isM3u8 ? 'hls' : 'video/mp4',";
  if (!source.includes(sourceType)) throw new Error('v6.3.0 patch target missing: YanHH3D source type');
  source = source.replace(sourceType,
    "sourceType: link.isM3u8 ? 'hls' : 'video/mp4', type: link.isM3u8 ? 'hls' : 'mp4',"
  );

  source = source.replaceAll("bingeGroup: 'webphim-yanhh3d-relay'", "bingeGroup: 'webphim-yanhh3d-relay-r2'");
  source = source.replace("version: '1.0.4', name: '🐲 YanHH3D'", "version: '1.1.0', name: '🐲 YanHH3D'");
  source = source.replace("description: 'YanHH3D 1.0.4 • FB-CDN HLS media normalization • Thuyết minh/Vietsub streams'", "description: 'YanHH3D 1.1.0 • Nuvio Desktop compatibility • fresh playback identity • Thuyết minh/Vietsub streams'");
  source = source.replaceAll('6.2.9', '6.3.0');
  source = source.replaceAll('single-process-v6.2.9', 'single-process-v6.3.0');
  return source;
};
