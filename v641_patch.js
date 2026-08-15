module.exports = function applyV641(source) {
  const requestMarker = "  const parsedBase = v500Resolved.parsedBase, path = parsedBase.rest, cfg = parsedBase.config;";
  if (!source.includes(requestMarker)) throw new Error('v6.4.1 patch target missing: v5 request marker');

  const mutableRequestMarker = "  const parsedBase = v500Resolved.parsedBase, cfg = parsedBase.config;\n  let path = parsedBase.rest;";
  const fullRoute = String.raw`
  let fullAddonPath = path;
  if (fullAddonPath === '/full') fullAddonPath = '/';
  if (fullAddonPath.startsWith('/full/')) fullAddonPath = fullAddonPath.slice('/full'.length);

  if (path === '/full/manifest.json') {
    const fullManifest = buildManifest();
    return sendJson(res, 200, {
      ...fullManifest,
      version: '6.4.1',
      name: '🎬 Web Phim Full',
      description: 'Một addon duy nhất: TMDB Việt + KKPhim + HH3D + YanHH3D + debrid streams + phụ đề đa nguồn',
      behaviorHints: { ...(fullManifest.behaviorHints || {}), configurable: false, configurationRequired: false }
    }, 300);
  }

  if (path.startsWith('/full/')) {
    path = fullAddonPath;
  }
`;
  source = source.replace(requestMarker, mutableRequestMarker + fullRoute);

  source = source.replaceAll('6.4.0', '6.4.1');
  source = source.replaceAll('single-process-v6.4.0', 'single-process-v6.4.1');
  return source;
};
