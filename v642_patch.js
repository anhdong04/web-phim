module.exports = function applyV642(source) {
  // Fix the existing HH3D/PikPak catalog from v6.1: it previously ignored extra.search
  // and exposed the catalog with homeExtra, so clients could not search it properly.
  const hh3dCatalogMarker = "  const skip = Math.max(0, Number(extra?.skip || 0)), page = groups.slice(skip, skip + 20);";
  if (!source.includes(hh3dCatalogMarker)) throw new Error('v6.4.2 patch target missing: HH3D catalog pagination');
  const hh3dSearchLogic = [
    "  const q = String(extra?.search || '').trim().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase();",
    "  if (q) groups = groups.filter(group => String(group?.title || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().includes(q));",
    "  const skip = Math.max(0, Number(extra?.skip || 0)), page = groups.slice(skip, skip + 20);"
  ].join('\n');
  source = source.replace(hh3dCatalogMarker, hh3dSearchLogic);

  const hh3dManifestHome = "catalogs.unshift({ type: 'series', id: 'hh3d', name: '🐉 HH3D', extra: homeExtra });";
  if (source.includes(hh3dManifestHome)) {
    source = source.replace(hh3dManifestHome, "catalogs.unshift({ type: 'series', id: 'hh3d', name: '🐉 HH3D', extra: searchExtra });");
  }

  const mutableMarker = "  const parsedBase = v500Resolved.parsedBase, cfg = parsedBase.config; let path = parsedBase.rest;";
  if (!source.includes(mutableMarker)) throw new Error('v6.4.2 patch target missing: mutable request path');

  const vnRoute = String.raw`
  // v6.4.2 parallel Vietnamese-source bridge. Isolated under /vn.
  let V642_K20_BASE = String(process.env.K20_VN_BASE_URL || 'https://sc.k-20.xyz');
  while (V642_K20_BASE.endsWith('/')) V642_K20_BASE = V642_K20_BASE.slice(0, -1);
  const V642_PREFIXES = ['stp:', 'hh3d:', 'clbpx:'];
  const V642_CATALOGS = new Set(['stp-movie', 'stp-series', 'hh3d-movie', 'hh3d-series', 'clbpx-movie', 'clbpx-series']);

  function v642Manifest() {
    const extra = [
      { name: 'search', isRequired: false },
      { name: 'skip', isRequired: false },
      { name: 'genre', isRequired: false }
    ];
    return {
      id: 'community.webphim.vn-sources',
      version: '6.4.2',
      name: '🇻🇳 Web Phim • Nguồn Việt',
      description: 'Addon thử nghiệm chạy song song: Siêu Tầm Phim + Hoạt Hình 3D + CLB Phim Xưa',
      resources: [
        { name: 'catalog', types: ['movie', 'series'] },
        { name: 'meta', types: ['movie', 'series'], idPrefixes: V642_PREFIXES },
        { name: 'stream', types: ['movie', 'series'], idPrefixes: V642_PREFIXES }
      ],
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
      behaviorHints: {
        adult: false,
        p2p: false,
        configurable: false,
        configurationRequired: false
      }
    };
  }

  if (path === '/vn/manifest.json') return sendJson(res, 200, v642Manifest(), 300);

  if (path.startsWith('/vn/catalog/') || path.startsWith('/vn/meta/') || path.startsWith('/vn/stream/')) {
    const upstreamPath = path.slice('/vn'.length);
    const parts = upstreamPath.split('/').filter(Boolean);
    const resource = parts[0] || '';
    const type = parts[1] || '';
    const rawThird = parts[2] || '';
    const third = decodeURIComponent(rawThird.replace('.json', ''));

    if (resource === 'catalog' && !V642_CATALOGS.has(third)) {
      return sendJson(res, 200, { metas: [] }, 30);
    }

    if ((resource === 'meta' || resource === 'stream') && !V642_PREFIXES.some(prefix => third.startsWith(prefix))) {
      return sendJson(res, 200, resource === 'stream' ? { streams: [] } : { meta: null }, 30);
    }

    try {
      const data = await fetchJson(V642_K20_BASE + upstreamPath, 'K20-VN');
      return sendJson(res, 200, data, resource === 'stream' ? 0 : 30);
    } catch (e) {
      console.error('v6.4.2 VN bridge failed:', e.message);
      if (resource === 'catalog') return sendJson(res, 200, { metas: [] }, 0);
      if (resource === 'stream') return sendJson(res, 200, { streams: [] }, 0);
      return sendJson(res, 200, { meta: null }, 0);
    }
  }
`;

  source = source.replace(mutableMarker, mutableMarker + vnRoute);
  return source;
};
