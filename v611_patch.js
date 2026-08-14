module.exports = function applyV611(source) {
  const hh3dCatalog = "  if (v610Hh3d) catalogs.unshift({ type: 'series', id: 'hh3d', name: '🐉 HH3D', extra: homeExtra });";
  if (!source.includes(hh3dCatalog)) throw new Error('v6.1.1 patch target missing: HH3D catalog line');
  source = source.replace(
    hh3dCatalog,
    "  if (V610_HH3D_ENABLED && V610_HH3D_SHARE_URL) catalogs.unshift({ type: 'series', id: 'hh3d', name: '🐉 HH3D', extra: homeExtra });"
  );

  const manifestRoute = "if (path === '/manifest.json') return sendJson(res, 200, buildManifest(cfg), 300);";
  if (!source.includes(manifestRoute)) throw new Error('v6.1.1 patch target missing: manifest route');
  source = source.replace(
    manifestRoute,
    "if (path === '/manifest.json') return sendJson(res, 200, buildManifest(cfg), 0);"
  );

  const catalogRouteMarker = "let aiMatch = path.match(/^\\/ai-sub\\/([A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+)\\.vtt$/);";
  if (!source.includes(catalogRouteMarker)) throw new Error('v6.1.1 patch target missing: route marker');
  source = source.replace(
    catalogRouteMarker,
    "if (path === '/hh3d/status') return sendJson(res, 200, { version: '6.1.1', enabled: V610_HH3D_ENABLED, configured: Boolean(V610_HH3D_SHARE_URL), providerReady: Boolean(v610Hh3d), catalogAdvertised: Boolean(V610_HH3D_ENABLED && V610_HH3D_SHARE_URL) }, 0);\n  " + catalogRouteMarker
  );

  source = source.replaceAll('6.1.0', '6.1.1');
  source = source.replaceAll('single-process-v6.1', 'single-process-v6.1.1');
  return source;
};
