module.exports = function applyV642(source) {
  const mutableMarker = "  const parsedBase = v500Resolved.parsedBase, cfg = parsedBase.config; let path = parsedBase.rest;";
  if (!source.includes(mutableMarker)) throw new Error('v6.4.2 patch target missing: mutable request path');

  const vnRoute = String.raw`
  // v6.4.2 parallel Vietnamese-source bridge. Isolated under /vn.
  // Manifest and resource behavior are mirrored from the K20 upstream instead of
  // re-declaring HH3D/STP/CLBPX by hand. This keeps catalog extras/search syntax exact.
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

  async function v642Manifest() {
    const upstream = await fetchJson(V642_K20_BASE + '/manifest.json', 'K20-VN manifest');
    return {
      ...upstream,
      id: 'community.webphim.vn-sources',
      version: '6.4.3',
      name: '🇻🇳 Web Phim • Nguồn Việt',
      description: 'Mirror trực tiếp các nguồn STP + HH3D + CLB Phim Xưa từ K20',
      idPrefixes: Array.isArray(upstream?.idPrefixes)
        ? upstream.idPrefixes.filter(v642KeepIdPrefix)
        : V642_PREFIXES,
      catalogs: Array.isArray(upstream?.catalogs)
        ? upstream.catalogs.filter(v642KeepCatalog)
        : []
    };
  }

  if (path === '/vn/manifest.json') {
    try {
      return sendJson(res, 200, await v642Manifest(), 60);
    } catch (e) {
      console.error('v6.4.3 VN manifest failed:', e.message);
      return sendJson(res, 502, { error: 'K20 manifest unavailable' }, 0);
    }
  }

  if (path.startsWith('/vn/catalog/') || path.startsWith('/vn/meta/') || path.startsWith('/vn/stream/')) {
    const upstreamPath = path.slice('/vn'.length);
    const parts = upstreamPath.split('/').filter(Boolean);
    const resource = parts[0] || '';
    const thirdRaw = parts[2] || '';
    const third = decodeURIComponent(thirdRaw.replace(/\.json$/i, ''));

    if (resource === 'catalog') {
      if (!V642_CATALOG_PREFIXES.some(prefix => third.startsWith(prefix))) {
        return sendJson(res, 200, { metas: [] }, 30);
      }
    }

    if (resource === 'meta' || resource === 'stream') {
      if (!V642_PREFIXES.some(prefix => third.startsWith(prefix))) {
        return sendJson(res, 200, resource === 'stream' ? { streams: [] } : { meta: null }, 30);
      }
    }

    try {
      // Preserve the exact Stremio path after /vn, including catalog extra segments
      // such as /search=...&skip=...&genre=....json.
      const data = await fetchJson(V642_K20_BASE + upstreamPath, 'K20-VN');
      return sendJson(res, 200, data, resource === 'stream' ? 0 : 30);
    } catch (e) {
      console.error('v6.4.3 VN bridge failed:', e.message);
      if (resource === 'catalog') return sendJson(res, 200, { metas: [] }, 0);
      if (resource === 'stream') return sendJson(res, 200, { streams: [] }, 0);
      return sendJson(res, 200, { meta: null }, 0);
    }
  }
`;

  source = source.replace(mutableMarker, mutableMarker + vnRoute);
  return source;
};
