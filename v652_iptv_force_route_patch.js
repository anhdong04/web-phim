module.exports = function applyV652IptvForceRoute(source) {
  const rootManifest = "  if (path === '/manifest.json') return sendJson(res, 200, buildManifest(), 300);";
  if (!source.includes(rootManifest)) throw new Error('v6.5.2 IPTV force-route patch target missing: root manifest');

  const forced = [
    "  if (path === '/iptv/manifest.json') return sendJson(res, 200, v650IptvManifest(), 60);",
    rootManifest
  ].join('\n');

  source = source.replace(rootManifest, forced);
  return source;
};
