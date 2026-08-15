module.exports = function applyV649HhkungfuStandalone(source) {
  const marker = "  if (path === '/vn/manifest.json') return sendJson(res, 200, v645Manifest(), 60);";
  if (!source.includes(marker)) throw new Error('v6.4.9 HHKungfu standalone patch target missing');

  const standalone = String.raw`
  function v649HhkungfuManifest() {
    const extra = [
      { name: 'search', isRequired: false },
      { name: 'skip', isRequired: false }
    ];
    return {
      id: 'community.hhkungfu.standalone',
      version: '1.0.0',
      name: '🐉 HHKungfu',
      description: 'Hoạt hình 3D từ HHKungfu • Vietsub/Thuyết minh',
      resources: ['catalog', 'meta', 'stream'],
      types: ['series'],
      idPrefixes: ['hhu:'],
      catalogs: [
        { type: 'series', id: 'hhkungfu', name: '🐉 HHKungfu • Hoạt Hình 3D', extra }
      ],
      behaviorHints: { adult: false, p2p: false, configurable: false, configurationRequired: false }
    };
  }

  if (path === '/hhkungfu/manifest.json') return sendJson(res, 200, v649HhkungfuManifest(), 60);

  if (path.startsWith('/hhkungfu/catalog/series/hhkungfu')) {
    let tail = path.slice('/hhkungfu/catalog/series/hhkungfu'.length);
    tail = tail.replace(/^\//, '').replace(/\.json$/i, '');
    const extra = V645_HHK.parseExtra(tail);
    try { return sendJson(res, 200, { metas: await V645_HHK.catalog(extra) }, 30); }
    catch (e) { console.error('HHKungfu standalone catalog:', e.message); return sendJson(res, 200, { metas: [] }, 0); }
  }

  if (path.startsWith('/hhkungfu/meta/series/')) {
    const id = decodeURIComponent(path.slice('/hhkungfu/meta/series/'.length).replace(/\.json$/i, ''));
    if (!id.startsWith('hhu:')) return sendJson(res, 200, { meta: null }, 0);
    try { return sendJson(res, 200, { meta: await V645_HHK.meta(id) }, 60); }
    catch (e) { console.error('HHKungfu standalone meta:', e.message); return sendJson(res, 200, { meta: null }, 0); }
  }

  if (path.startsWith('/hhkungfu/stream/series/')) {
    const id = decodeURIComponent(path.slice('/hhkungfu/stream/series/'.length).replace(/\.json$/i, ''));
    if (!id.startsWith('hhu:')) return sendJson(res, 200, { streams: [] }, 0);
    try { return sendJson(res, 200, { streams: await V645_HHK.streams(id) }, 0); }
    catch (e) { console.error('HHKungfu standalone stream:', e.message); return sendJson(res, 200, { streams: [] }, 0); }
  }

`;

  return source.replace(marker, standalone + marker);
};
