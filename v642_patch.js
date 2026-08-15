module.exports = function applyV642(source) {
  const mutableMarker = "  const parsedBase = v500Resolved.parsedBase, cfg = parsedBase.config; let path = parsedBase.rest;";
  if (!source.includes(mutableMarker)) throw new Error('v6.4.4 patch target missing: mutable request path');

  const vnRoute = String.raw`
  // v6.4.4 K20 client-side bridge. Resource requests are redirected to K20 so
  // K20 sees the user's client IP instead of Render's datacenter IP (which can get 403).
  let V642_K20_BASE = String(process.env.K20_VN_BASE_URL || 'https://sc.k-20.xyz');
  while (V642_K20_BASE.endsWith('/')) V642_K20_BASE = V642_K20_BASE.slice(0, -1);
  const V642_PREFIXES = ['stp:', 'hh3d:', 'clbpx:'];
  const V642_CATALOG_PREFIXES = ['stp-', 'hh3d-', 'clbpx-'];

  function v642KeepCatalog(catalog) {
    const id = String(catalog?.id || '');
    return V642_CATALOG_PREFIXES.some(prefix => id.startsWith(prefix));
  }

  function v642KeepIdPrefix(prefix) {
    return V642_PREFIXES.includes(String(prefix || ''));
  }

  function v642FallbackManifest() {
    const extra = [
      { name: 'search', isRequired: false },
      { name: 'skip', isRequired: false },
      { name: 'genre', isRequired: false }
    ];
    return {
      id: 'community.webphim.vn-sources',
      version: '6.4.4',
      name: '🇻🇳 Web Phim • Nguồn Việt',
      description: 'STP + HH3D + CLB Phim Xưa từ K20; resource được chuyển trực tiếp tới K20',
      resources: ['catalog', 'meta', 'stream'],
      types: ['movie', 'series'],
      idPrefixes: V642_PREFIXES,
      catalogs: [
        { type: 'movie', id: 'stp-movie', name: '🇻🇳 STP • Phim Lẻ', extra },
        { type: 'series', id: 'stp-series', name: '🇻🇳 STP • Phim Bộ', extra },
        { type: 'movie', id: 'hh3d-movie', name: '🐉 HH3D • Phim Lẻ', extra },
        { type: 'series', id: 'hh3d-series', name: '🐉 HH3D • Hoạt Hình', extra },
        { type: 'movie', id: 'clbpx-movie', name: '📼 CLB Phim Xưa • Phim Lẻ', extra },
        { type: 'series', id: 'clbpx-series', name: '📼 CLB Phim Xưa • Phim Bộ', extra }
      ],
      behaviorHints: { adult: false, p2p: false, configurable: false, configurationRequired: false }
    };
  }

  async function v642Manifest() {
    const fallback = v642FallbackManifest();
    try {
      const upstream = await fetchJson(V642_K20_BASE + '/manifest.json', 'K20-VN manifest');
      return {
        ...upstream,
        ...fallback,
        catalogs: Array.isArray(upstream?.catalogs)
          ? upstream.catalogs.filter(v642KeepCatalog)
          : fallback.catalogs,
        idPrefixes: Array.isArray(upstream?.idPrefixes)
          ? upstream.idPrefixes.filter(v642KeepIdPrefix)
          : V642_PREFIXES
      };
    } catch (e) {
      console.error('v6.4.4 VN manifest upstream blocked, using fallback:', e.message);
      return fallback;
    }
  }

  if (path === '/vn/manifest.json') return sendJson(res, 200, await v642Manifest(), 60);

  if (path.startsWith('/vn/catalog/') || path.startsWith('/vn/meta/') || path.startsWith('/vn/stream/')) {
    const upstreamPath = path.slice('/vn'.length);
    const parts = upstreamPath.split('/').filter(Boolean);
    const resource = parts[0] || '';
    const thirdRaw = parts[2] || '';
    const third = decodeURIComponent(thirdRaw.replace(/\.json$/i, ''));

    if (resource === 'catalog' && !V642_CATALOG_PREFIXES.some(prefix => third.startsWith(prefix))) {
      return sendJson(res, 200, { metas: [] }, 0);
    }
    if ((resource === 'meta' || resource === 'stream') && !V642_PREFIXES.some(prefix => third.startsWith(prefix))) {
      return sendJson(res, 200, resource === 'stream' ? { streams: [] } : { meta: null }, 0);
    }

    // Important: do NOT fetch K20 from Render. K20 blocks some datacenter requests
    // with HTTP 403. Redirect the Stremio/Nuvio client to the exact K20 endpoint.
    const location = V642_K20_BASE + upstreamPath;
    res.writeHead(307, {
      location,
      'access-control-allow-origin': '*',
      'cache-control': 'no-store'
    });
    res.end();
    return;
  }
`;

  source = source.replace(mutableMarker, mutableMarker + vnRoute);
  return source;
};
