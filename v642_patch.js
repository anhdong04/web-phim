module.exports = function applyV642(source) {
  const mutableMarker = "  const parsedBase = v500Resolved.parsedBase, cfg = parsedBase.config; let path = parsedBase.rest;";
  if (!source.includes(mutableMarker)) throw new Error('v6.4.2 patch target missing: mutable request path');

  const vnRoute = String.raw`
  // v6.4.2 parallel Vietnamese-source bridge. This is isolated under /vn
  // so the existing root and /full addons keep their current behavior.
  const V642_K20_BASE = String(process.env.K20_VN_BASE_URL || 'https://sc.k-20.xyz').replace(/\\/+$/, '');
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

  // Keep the Stremio route exactly as received and only remove the /vn base.
  // This preserves K20's search/skip/genre extra syntax and episode ids.
  if (path.startsWith('/vn/catalog/') || path.startsWith('/vn/meta/') || path.startsWith('/vn/stream/')) {
    const upstreamPath = path.slice('/vn'.length);

    const cat = upstreamPath.match(/^\\/catalog\\/(movie|series)\\/([^/]+)(?:\\/[^/]+)?\\.json$/);
    if (cat && !V642_CATALOGS.has(decodeURIComponent(cat[2]))) {
      return sendJson(res, 200, { metas: [] }, 30);
    }

    const media = upstreamPath.match(/^\\/(meta|stream)\\/(movie|series)\\/([^/]+)\\.json$/);
    if (media) {
      const mediaId = decodeURIComponent(media[3]);
      if (!V642_PREFIXES.some(prefix => mediaId.startsWith(prefix))) {
        return sendJson(res, 200, media[1] === 'stream' ? { streams: [] } : { meta: null }, 30);
      }
    }

    try {
      const data = await fetchJson(V642_K20_BASE + upstreamPath, 'K20-VN');
      return sendJson(res, 200, data, upstreamPath.startsWith('/stream/') ? 0 : 30);
    } catch (e) {
      console.error('v6.4.2 VN bridge failed:', e.message);
      if (upstreamPath.startsWith('/catalog/')) return sendJson(res, 200, { metas: [] }, 0);
      if (upstreamPath.startsWith('/stream/')) return sendJson(res, 200, { streams: [] }, 0);
      return sendJson(res, 200, { meta: null }, 0);
    }
  }
`;

  source = source.replace(mutableMarker, mutableMarker + vnRoute);
  source = source.replaceAll('6.4.1', '6.4.2');
  source = source.replaceAll('single-process-v6.4.1', 'single-process-v6.4.2');
  return source;
};
