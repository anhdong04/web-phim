module.exports = function applyV642(source) {
  const mutableMarker = "  const parsedBase = v500Resolved.parsedBase, cfg = parsedBase.config; let path = parsedBase.rest;";
  if (!source.includes(mutableMarker)) throw new Error('v6.4.5 patch target missing: mutable request path');

  const vnRoute = String.raw`
  // v6.4.5: direct HHKungfu provider + existing experimental K20 bridges for STP/CLBPX.
  const V645_HHK = require('./v645_hhkungfu');
  let V642_K20_BASE = String(process.env.K20_VN_BASE_URL || 'https://sc.k-20.xyz');
  while (V642_K20_BASE.endsWith('/')) V642_K20_BASE = V642_K20_BASE.slice(0, -1);
  const V642_K20_PREFIXES = ['stp:', 'clbpx:'];
  const V642_K20_CATALOG_PREFIXES = ['stp-', 'clbpx-'];

  function v645Manifest() {
    const extra = [
      { name: 'search', isRequired: false },
      { name: 'skip', isRequired: false }
    ];
    const k20Extra = [
      { name: 'search', isRequired: false },
      { name: 'skip', isRequired: false },
      { name: 'genre', isRequired: false }
    ];
    return {
      id: 'community.webphim.vn-sources',
      version: '6.4.5',
      name: '🇻🇳 Web Phim • Nguồn Việt',
      description: 'HHKungfu trực tiếp + STP và CLB Phim Xưa thử nghiệm',
      resources: ['catalog', 'meta', 'stream'],
      types: ['movie', 'series'],
      idPrefixes: ['hhu:', ...V642_K20_PREFIXES],
      catalogs: [
        { type: 'series', id: 'hhkungfu', name: '🐉 HHKungfu • Hoạt Hình 3D', extra },
        { type: 'movie', id: 'stp-movie', name: '🇻🇳 STP • Phim Lẻ', extra: k20Extra },
        { type: 'series', id: 'stp-series', name: '🇻🇳 STP • Phim Bộ', extra: k20Extra },
        { type: 'movie', id: 'clbpx-movie', name: '📼 CLB Phim Xưa • Phim Lẻ', extra: k20Extra },
        { type: 'series', id: 'clbpx-series', name: '📼 CLB Phim Xưa • Phim Bộ', extra: k20Extra }
      ],
      behaviorHints: { adult: false, p2p: false, configurable: false, configurationRequired: false }
    };
  }

  if (path === '/vn/manifest.json') return sendJson(res, 200, v645Manifest(), 60);

  // HHKungfu catalog: /vn/catalog/series/hhkungfu[/search=...&skip=...].json
  if (path.startsWith('/vn/catalog/series/hhkungfu')) {
    let tail = path.slice('/vn/catalog/series/hhkungfu'.length);
    tail = tail.replace(/^\//, '').replace(/\.json$/i, '');
    const extra = V645_HHK.parseExtra(tail);
    try {
      return sendJson(res, 200, { metas: await V645_HHK.catalog(extra) }, 30);
    } catch (e) {
      console.error('HHKungfu catalog:', e.message);
      return sendJson(res, 200, { metas: [] }, 0);
    }
  }

  if (path.startsWith('/vn/meta/series/')) {
    const id = decodeURIComponent(path.slice('/vn/meta/series/'.length).replace(/\.json$/i, ''));
    if (id.startsWith('hhu:')) {
      try { return sendJson(res, 200, { meta: await V645_HHK.meta(id) }, 60); }
      catch (e) { console.error('HHKungfu meta:', e.message); return sendJson(res, 200, { meta: null }, 0); }
    }
  }

  if (path.startsWith('/vn/stream/series/')) {
    const id = decodeURIComponent(path.slice('/vn/stream/series/'.length).replace(/\.json$/i, ''));
    if (id.startsWith('hhu:')) {
      try { return sendJson(res, 200, { streams: await V645_HHK.streams(id) }, 0); }
      catch (e) { console.error('HHKungfu stream:', e.message); return sendJson(res, 200, { streams: [] }, 0); }
    }
  }

  // Keep STP and CLB Phim Xua isolated as K20 experiments; HHKungfu never goes through K20.
  if (path.startsWith('/vn/catalog/') || path.startsWith('/vn/meta/') || path.startsWith('/vn/stream/')) {
    const upstreamPath = path.slice('/vn'.length);
    const parts = upstreamPath.split('/').filter(Boolean);
    const resource = parts[0] || '';
    const thirdRaw = parts[2] || '';
    const third = decodeURIComponent(thirdRaw.replace(/\.json$/i, ''));
    if (resource === 'catalog' && !V642_K20_CATALOG_PREFIXES.some(prefix => third.startsWith(prefix))) return sendJson(res, 200, { metas: [] }, 0);
    if ((resource === 'meta' || resource === 'stream') && !V642_K20_PREFIXES.some(prefix => third.startsWith(prefix))) return sendJson(res, 200, resource === 'stream' ? { streams: [] } : { meta: null }, 0);
    const location = V642_K20_BASE + upstreamPath;
    res.writeHead(307, { location, 'access-control-allow-origin': '*', 'cache-control': 'no-store' });
    res.end();
    return;
  }
`;

  source = source.replace(mutableMarker, mutableMarker + vnRoute);
  return source;
};
