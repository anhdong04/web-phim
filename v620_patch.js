module.exports = function applyV620(source) {
  const serverMarker = 'const server = http.createServer(async (req, res) => {';
  if (!source.includes(serverMarker)) throw new Error('v6.2 patch target missing: server marker');

  const helpers = [
    "function v620Hh3dStandaloneManifest() {",
    "  return {",
    "    id: 'vn.webphim.hh3d.pikpak.v1',",
    "    version: '1.0.0',",
    "    name: '🐉 HH3D',",
    "    description: 'HH3D standalone addon • PikPak catalog + direct streams',",
    "    resources: [",
    "      'catalog',",
    "      { name: 'meta', types: ['series'], idPrefixes: ['hh3d:'] },",
    "      { name: 'stream', types: ['series'], idPrefixes: ['hh3d:', 'tt', 'tmdb:'] }",
    "    ],",
    "    types: ['series'],",
    "    catalogs: [{ type: 'series', id: 'hh3d', name: '🐉 HH3D', extra: homeExtra }],",
    "    behaviorHints: { configurable: false, configurationRequired: false }",
    "  };",
    "}",
    "async function v620Hh3dStandaloneCatalog(extra = {}) {",
    "  return { metas: await v610Hh3dCatalog('series', extra) };",
    "}",
    "async function v620Hh3dStandaloneMeta(id) {",
    "  return { meta: await v610Hh3dMeta(id) };",
    "}",
    "async function v620Hh3dStandaloneStreams(id) {",
    "  if (String(id).startsWith('hh3d:')) return { streams: await v610Hh3dCustomStreams('series', id) };",
    "  const parsed = parseId(id); if (!parsed) return { streams: [] };",
    "  const identity = await v430GetIdentityCached('series', parsed).catch(() => null);",
    "  if (!identity) return { streams: [] };",
    "  const streams = await v610Hh3dIdentityStreams('series', id, identity).catch(() => []);",
    "  return { streams: streams.map(stripPrivate) };",
    "}",
    "",
    serverMarker
  ].join('\n');
  source = source.replace(serverMarker, helpers);

  const requestMarker = "  const parsedBase = v500Resolved.parsedBase, path = parsedBase.rest, cfg = parsedBase.config;";
  if (!source.includes(requestMarker)) throw new Error('v6.2 patch target missing: request marker');
  const routes = [
    requestMarker,
    "  if (path === '/hh3d/manifest.json') return sendJson(res, 200, v620Hh3dStandaloneManifest(), 0);",
    "  let v620m = path.match(/^\\/hh3d\\/catalog\\/series\\/hh3d(?:\\/([^/]+))?\\.json$/);",
    "  if (v620m) return sendJson(res, 200, await v620Hh3dStandaloneCatalog(parseExtra(v620m[1])), 30);",
    "  v620m = path.match(/^\\/hh3d\\/meta\\/series\\/([^/]+)\\.json$/);",
    "  if (v620m) return sendJson(res, 200, await v620Hh3dStandaloneMeta(decodeURIComponent(v620m[1])), 300);",
    "  v620m = path.match(/^\\/hh3d\\/stream\\/series\\/([^/]+)\\.json$/);",
    "  if (v620m) return sendJson(res, 200, await v620Hh3dStandaloneStreams(decodeURIComponent(v620m[1])), 0);"
  ].join('\n');
  source = source.replace(requestMarker, routes);

  const statusOld = "if (path === '/hh3d/status') return sendJson(res, 200, { version: '6.1.2', enabled: V610_HH3D_ENABLED, configured: Boolean(V610_HH3D_SHARE_URL), providerReady: Boolean(v610Hh3d), catalogAdvertised: Boolean(V610_HH3D_ENABLED && V610_HH3D_SHARE_URL), shareId: v500Resolved.share?.id || null, addonId: v612Manifest(cfg, v500Resolved.share || null).id }, 0);";
  if (source.includes(statusOld)) {
    source = source.replace(statusOld, "if (path === '/hh3d/status') return sendJson(res, 200, { version: '6.2.0', enabled: V610_HH3D_ENABLED, configured: Boolean(V610_HH3D_SHARE_URL), providerReady: Boolean(v610Hh3d), catalogAdvertised: Boolean(V610_HH3D_ENABLED && V610_HH3D_SHARE_URL), standaloneAddon: true, standaloneManifest: '/hh3d/manifest.json', standaloneAddonId: 'vn.webphim.hh3d.pikpak.v1', shareId: v500Resolved.share?.id || null, addonId: v612Manifest(cfg, v500Resolved.share || null).id }, 0);");
  }

  source = source.replaceAll('6.1.2', '6.2.0');
  source = source.replaceAll('single-process-v6.1.2', 'single-process-v6.2');
  return source;
};
