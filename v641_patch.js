module.exports = function applyV641(source) {
  const requestMarker = "  const parsedBase = v500Resolved.parsedBase, path = parsedBase.rest, cfg = parsedBase.config;";
  if (!source.includes(requestMarker)) throw new Error('v6.4.1 patch target missing: v5 request marker');

  source = source.replace(
    requestMarker,
    "  const parsedBase = v500Resolved.parsedBase, cfg = parsedBase.config; let path = parsedBase.rest;"
  );

  const mutableMarker = "  const parsedBase = v500Resolved.parsedBase, cfg = parsedBase.config; let path = parsedBase.rest;";
  const fullRoute = String.raw`
  if (path === '/full/manifest.json') {
    const fullManifest = buildManifest(cfg);
    const hhCatalog = { type: 'series', id: 'hh3d', name: '🐉 HH3D', extra: homeExtra };
    const hhtqCatalogs = globalThis.__webphimHhtq && Array.isArray(globalThis.__webphimHhtq.CATALOGS)
      ? globalThis.__webphimHhtq.CATALOGS.map(c => ({ ...c, extra: [{ name: 'search', isRequired: false }, { name: 'skip', isRequired: false }] }))
      : [];
    const catalogs = Array.isArray(fullManifest.catalogs) ? [...fullManifest.catalogs] : [];
    if (!catalogs.some(c => c && c.type === 'series' && c.id === 'hh3d')) catalogs.unshift(hhCatalog);
    for (const c of hhtqCatalogs) if (!catalogs.some(x => x && x.type === c.type && x.id === c.id)) catalogs.push(c);

    const resources = Array.isArray(fullManifest.resources) ? [...fullManifest.resources] : [];
    const ensurePrefix = (name, prefix, types = ['series']) => {
      const r = resources.find(x => x && typeof x === 'object' && x.name === name);
      if (r) {
        r.idPrefixes = Array.from(new Set([...(r.idPrefixes || []), prefix]));
        r.types = Array.from(new Set([...(r.types || []), ...types]));
      } else {
        resources.push({ name, types, idPrefixes: [prefix] });
      }
    };
    ensurePrefix('meta', 'hh3d:', ['series']);
    ensurePrefix('stream', 'hh3d:', ['series']);
    ensurePrefix('meta', 'hhtq:', ['movie', 'series']);
    ensurePrefix('stream', 'hhtq:', ['movie', 'series']);

    return sendJson(res, 200, {
      ...fullManifest,
      version: '6.4.1',
      name: '🎬 Web Phim Full',
      description: 'Một addon duy nhất: TMDB Việt + KKPhim + HH3D + YanHH3D + HHTQ + debrid streams + phụ đề đa nguồn',
      catalogs,
      resources,
      behaviorHints: { ...(fullManifest.behaviorHints || {}), configurable: false, configurationRequired: false }
    }, 0);
  }

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

  v641m = path.match(/^\/full\/catalog\/(movie|series)\/(hhtq-[^/]+)(?:\/([^/]+))?\.json$/);
  if (v641m && globalThis.__webphimHhtq) {
    return sendJson(res, 200, { metas: await globalThis.__webphimHhtq.catalog(v641m[1], v641m[2], parseExtra(v641m[3] || '')) }, 30);
  }

  v641m = path.match(/^\/full\/meta\/(movie|series)\/([^/]+)\.json$/);
  if (v641m && decodeURIComponent(v641m[2]).startsWith('hhtq:') && globalThis.__webphimHhtq) {
    return sendJson(res, 200, { meta: await globalThis.__webphimHhtq.metaFor(v641m[1], decodeURIComponent(v641m[2])) }, 120);
  }

  v641m = path.match(/^\/full\/stream\/(movie|series)\/([^/]+)\.json$/);
  if (v641m && decodeURIComponent(v641m[2]).startsWith('hhtq:') && globalThis.__webphimHhtq) {
    return sendJson(res, 200, { streams: await globalThis.__webphimHhtq.streamsFor(v641m[1], decodeURIComponent(v641m[2])) }, 0);
  }

  if (path === '/full') path = '/';
  else if (path.startsWith('/full/')) path = path.slice('/full'.length);
`;
  source = source.replace(mutableMarker, mutableMarker + fullRoute);

  source = source.replaceAll('6.4.0', '6.4.1');
  source = source.replaceAll('single-process-v6.4.0', 'single-process-v6.4.1');
  return source;
};
