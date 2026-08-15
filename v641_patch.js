module.exports = function applyV641(source) {
  const requestMarker = "  const parsedBase = v500Resolved.parsedBase, path = parsedBase.rest, cfg = parsedBase.config;";
  if (!source.includes(requestMarker)) throw new Error('v6.4.1 patch target missing: v5 request marker');

  // /full is a real addon base path, so its child routes must be able to remap.
  source = source.replace(
    requestMarker,
    "  const parsedBase = v500Resolved.parsedBase, cfg = parsedBase.config; let path = parsedBase.rest;"
  );

  const mutableMarker = "  const parsedBase = v500Resolved.parsedBase, cfg = parsedBase.config; let path = parsedBase.rest;";
  const fullRoute = String.raw`
  if (path === '/full/manifest.json') {
    const fullManifest = buildManifest(cfg);
    const hhCatalog = { type: 'series', id: 'hh3d', name: '🐉 HH3D', extra: homeExtra };
    const catalogs = Array.isArray(fullManifest.catalogs) ? [...fullManifest.catalogs] : [];
    if (!catalogs.some(c => c && c.type === 'series' && c.id === 'hh3d')) catalogs.unshift(hhCatalog);

    const resources = Array.isArray(fullManifest.resources) ? [...fullManifest.resources] : [];
    const ensurePrefix = (name, prefix) => {
      const r = resources.find(x => x && typeof x === 'object' && x.name === name);
      if (r) {
        r.idPrefixes = Array.from(new Set([...(r.idPrefixes || []), prefix]));
      } else {
        resources.push({ name, types: ['series'], idPrefixes: [prefix] });
      }
    };
    ensurePrefix('meta', 'hh3d:');
    ensurePrefix('stream', 'hh3d:');

    return sendJson(res, 200, {
      ...fullManifest,
      version: '6.4.1',
      name: '🎬 Web Phim Full',
      description: 'Một addon duy nhất: TMDB Việt + KKPhim + HH3D + YanHH3D + debrid streams + phụ đề đa nguồn',
      catalogs,
      resources,
      behaviorHints: { ...(fullManifest.behaviorHints || {}), configurable: false, configurationRequired: false }
    }, 0);
  }

  // Use the already-tested standalone HH3D implementation directly inside Full.
  let v641m = path.match(/^\/full\/catalog\/series\/hh3d(?:\/([^/]+))?\.json$/);
  if (v641m) return sendJson(res, 200, await v620Hh3dStandaloneCatalog(parseExtra(v641m[1])), 30);

  v641m = path.match(/^\/full\/meta\/series\/([^/]+)\.json$/);
  if (v641m && decodeURIComponent(v641m[1]).startsWith('hh3d:')) {
    return sendJson(res, 200, await v620Hh3dStandaloneMeta(decodeURIComponent(v641m[1])), 300);
  }

  v641m = path.match(/^\/full\/stream\/series\/([^/]+)\.json$/);
  if (v641m && decodeURIComponent(v641m[1]).startsWith('hh3d:')) {
    return sendJson(res, 200, await v620Hh3dStandaloneStreams(decodeURIComponent(v641m[1])), 0);
  }

  // All other Full routes reuse the root unified addon handlers.
  if (path === '/full') path = '/';
  else if (path.startsWith('/full/')) path = path.slice('/full'.length);
`;
  source = source.replace(mutableMarker, mutableMarker + fullRoute);

  source = source.replaceAll('6.4.0', '6.4.1');
  source = source.replaceAll('single-process-v6.4.0', 'single-process-v6.4.1');
  return source;
};
