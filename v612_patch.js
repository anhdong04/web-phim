module.exports = function applyV612(source) {
  const manifestRoute = "if (path === '/manifest.json') return sendJson(res, 200, buildManifest(cfg), 0);";
  if (!source.includes(manifestRoute)) throw new Error('v6.1.2 patch target missing: v6.1.1 manifest route');

  const serverMarker = 'const server = http.createServer(async (req, res) => {';
  if (!source.includes(serverMarker)) throw new Error('v6.1.2 patch target missing: server marker');

  const helpers = [
    "function v612Manifest(cfg, share = null) {",
    "  const manifest = buildManifest(cfg);",
    "  const rawShareId = String(share?.id || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24);",
    "  manifest.id = rawShareId ? ('vn.webphim.share.' + rawShareId + '.v612') : 'vn.webphim.nuvio.v612';",
    "  manifest.version = '6.1.2';",
    "  manifest.name = share?.name ? ('Web Phim • ' + String(share.name).slice(0, 48)) : 'Web Phim';",
    "  manifest.description = 'Web Phim 6.1.2 • TMDB Việt • KKPhim • HH3D/PikPak • debrid streams • subtitles';",
    "  manifest.behaviorHints = { ...(manifest.behaviorHints || {}), webPhimRevision: '6.1.2-hh3d-share-manifest' };",
    "  return manifest;",
    "}",
    "",
    serverMarker
  ].join('\n');
  source = source.replace(serverMarker, helpers);

  source = source.replace(
    manifestRoute,
    "if (path === '/manifest.json') return sendJson(res, 200, v612Manifest(cfg, v500Resolved.share || null), 0);"
  );

  const statusRoute = "if (path === '/hh3d/status') return sendJson(res, 200, { version: '6.1.1', enabled: V610_HH3D_ENABLED, configured: Boolean(V610_HH3D_SHARE_URL), providerReady: Boolean(v610Hh3d), catalogAdvertised: Boolean(V610_HH3D_ENABLED && V610_HH3D_SHARE_URL) }, 0);";
  if (source.includes(statusRoute)) {
    source = source.replace(
      statusRoute,
      "if (path === '/hh3d/status') return sendJson(res, 200, { version: '6.1.2', enabled: V610_HH3D_ENABLED, configured: Boolean(V610_HH3D_SHARE_URL), providerReady: Boolean(v610Hh3d), catalogAdvertised: Boolean(V610_HH3D_ENABLED && V610_HH3D_SHARE_URL), shareId: v500Resolved.share?.id || null, addonId: v612Manifest(cfg, v500Resolved.share || null).id }, 0);"
    );
  }

  source = source.replaceAll('6.1.1', '6.1.2');
  source = source.replaceAll('single-process-v6.1.1', 'single-process-v6.1.2');
  return source;
};
