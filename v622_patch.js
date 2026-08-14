module.exports = function applyV622(source) {
  const apiNet = "const V610_HH3D_API_HOST = String(process.env.HH3D_PIKPAK_API_HOST || 'api-drive.mypikpak.net');";
  const userNet = "const V610_HH3D_USER_HOST = String(process.env.HH3D_PIKPAK_USER_HOST || 'user.mypikpak.net');";
  if (!source.includes(apiNet) || !source.includes(userNet)) throw new Error('v6.2.2 patch target missing: v6.2.1 hosts');
  source = source.replace(apiNet, "const V610_HH3D_API_HOST = String(process.env.HH3D_PIKPAK_API_HOST || 'api-drive.mypikpak.com');");
  source = source.replace(userNet, "const V610_HH3D_USER_HOST = String(process.env.HH3D_PIKPAK_USER_HOST || 'user.mypikpak.com');");

  const rootReset = "  v610Hh3d.rootParentId = '';\n}";
  if (!source.includes(rootReset)) throw new Error('v6.2.2 patch target missing: v6.2.1 root override');
  source = source.replace(rootReset, "  v610Hh3d.scanAllFiles = v621OriginalScanAllFiles;\n  v610Hh3d.rootParentId = v621InitialParentId;\n}");

  const serverMarker = 'const server = http.createServer(async (req, res) => {';
  if (!source.includes(serverMarker)) throw new Error('v6.2.2 patch target missing: server marker');
  const helpers = [
    "const v622RootCache = { value: null, expiresAt: 0 };",
    "const v622FolderProviders = new Map();",
    "function v622Timeout(promise, ms, label) { let timer; return Promise.race([Promise.resolve(promise), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(label || 'timeout')), ms); })]).finally(() => clearTimeout(timer)); }",
    "function v622Enc(value) { return Buffer.from(String(value || ''), 'utf8').toString('base64url'); }",
    "function v622Dec(value) { try { return Buffer.from(String(value || ''), 'base64url').toString('utf8'); } catch { return ''; } }",
    "function v622VideoFile(f) { return /\\.(mkv|mp4|m4v|mov|webm|avi|ts|m2ts)$/i.test(String(f?.name || '')); }",
    "async function v622RootItems(force = false) {",
    "  if (!v610Hh3d) return []; const now = Date.now(); if (!force && v622RootCache.value && v622RootCache.expiresAt > now) return v622RootCache.value;",
    "  const client = v610Hh3d.newClient();",
    "  await v622Timeout(client.refreshCaptcha('GET:/drive/v1/share/detail'), 4500, 'PikPak captcha/init timeout');",
    "  let pageToken = '', pages = 0, items = [];",
    "  do {",
    "    const resp = await v622Timeout(client.getShareDetail(v610Hh3d.shareId, v610Hh3d.rootParentId || '', pageToken), 5500, 'PikPak share/detail timeout');",
    "    v610Hh3d.validateShareStatus(resp);",
    "    for (const f of resp.files || []) {",
    "      if (f.kind === 'drive#folder') items.push({ kind: 'folder', id: String(f.id || ''), name: String(f.name || '') });",
    "      else if (v622VideoFile(f)) items.push({ kind: 'video', id: String(f.id || ''), name: String(f.name || ''), size: Number(f.size || 0) });",
    "    }",
    "    pageToken = resp.next_page_token || ''; pages += 1;",
    "  } while (pageToken && pages < 20);",
    "  v622RootCache.value = items; v622RootCache.expiresAt = now + V610_HH3D_CACHE_TTL_MS; return items;",
    "}",
    "async function v622CatalogEntries(force = false) {",
    "  const items = await v622RootItems(force), folders = items.filter(x => x.kind === 'folder'); if (folders.length) return folders;",
    "  const groups = new Map();",
    "  for (const f of items.filter(x => x.kind === 'video')) { const title = v610PikPak.cleanTitle(f.name); const key = v610PikPak.normalizeText(title); if (!key) continue; if (!groups.has(key)) groups.set(key, { kind: 'rootgroup', id: key, name: title, files: [] }); groups.get(key).files.push(f); }",
    "  return [...groups.values()].sort((a,b) => a.name.localeCompare(b.name, 'vi'));",
    "}",
    "function v622CatalogId(item) { return item.kind === 'folder' ? ('hh3d:f:' + v622Enc(item.id)) : ('hh3d:r:' + v622Enc(item.name)); }",
    "async function v622StandaloneCatalog(extra = {}) {",
    "  let entries; try { entries = await v622Timeout(v622CatalogEntries(false), 7000, 'HH3D catalog timeout'); } catch (e) { console.error('HH3D fast catalog:', e.message); return { metas: [] }; }",
    "  const skip = Math.max(0, Number(extra?.skip || 0)), page = entries.slice(skip, skip + 20);",
    "  const metas = await v610MapLimit(page, 6, async item => {",
    "    const group = { id: item.kind + ':' + item.id, title: item.name, files: item.files || [] }; const hit = await v610Hh3dLookupTmdb(group); const id = v622CatalogId(item);",
    "    if (hit) { const p = toPreview(hit, 'series'); return { ...p, id, type: 'series', name: p.name || item.name, description: p.description || '🐉 HH3D / PikPak' }; }",
    "    return { id, type: 'series', name: item.name, description: '🐉 HH3D / PikPak' };",
    "  });",
    "  return { metas };",
    "}",
    "function v622FolderProvider(folderId) {",
    "  const key = String(folderId || ''); if (v622FolderProviders.has(key)) return v622FolderProviders.get(key);",
    "  const p = v610PikPak.createProvider({ shareUrl: 'https://mypikpak.com/s/' + v610Hh3d.shareId + '/' + key, password: V610_HH3D_PASSWORD, apiHost: V610_HH3D_API_HOST, userHost: V610_HH3D_USER_HOST, timeoutMs: V610_HH3D_TIMEOUT_MS, cacheTtlMs: V610_HH3D_CACHE_TTL_MS, directTtlMs: V610_HH3D_DIRECT_TTL_MS, maxFiles: V610_HH3D_MAX_FILES, useTranscoding: V610_HH3D_USE_TRANSCODING });",
    "  v622FolderProviders.set(key, p); return p;",
    "}",
    "async function v622RootGroupFiles(title) {",
    "  const items = await v622RootItems(false); return items.filter(x => x.kind === 'video' && v610PikPak.normalizeText(v610PikPak.cleanTitle(x.name)) === v610PikPak.normalizeText(title)).map(x => ({ id: x.id, name: x.name, path: '', size: x.size, season: v610PikPak.inferSeason(x.name), episode: v610PikPak.inferEpisode(x.name) }));",
    "}",
    "async function v622StandaloneMeta(id) {",
    "  let m = String(id).match(/^hh3d:f:([A-Za-z0-9_-]+)$/); if (m) {",
    "    const folderId = v622Dec(m[1]), entries = await v622CatalogEntries(false), item = entries.find(x => x.kind === 'folder' && x.id === folderId); if (!item) return { meta: null };",
    "    const p = v622FolderProvider(folderId); let files = []; try { files = await v622Timeout(p.listFiles(false), 15000, 'HH3D folder scan timeout'); } catch (e) { console.error('HH3D folder meta:', e.message); }",
    "    const group = { id: 'folder:' + folderId, title: item.name, files }, hit = await v610Hh3dLookupTmdb(group); let base = null; if (hit?.id) { try { base = await getMeta('series', 'tmdb:' + hit.id); } catch {} }",
    "    const episodes = p.episodeList(group), videos = episodes.map(e => ({ id: 'hh3d:f:' + m[1] + ':' + e.season + ':' + e.episode, title: e.title, season: e.season, episode: e.episode }));",
    "    return { meta: { ...(base || {}), id: 'hh3d:f:' + m[1], type: 'series', name: base?.name || item.name, description: base?.description || ('Nguồn HH3D từ PikPak • ' + files.length + ' video'), videos, behaviorHints: { ...(base?.behaviorHints || {}), defaultVideoId: videos[0]?.id } } };",
    "  }",
    "  m = String(id).match(/^hh3d:r:([A-Za-z0-9_-]+)$/); if (m) {",
    "    const title = v622Dec(m[1]), files = await v622RootGroupFiles(title), group = { id: 'root:' + title, title, files }, hit = await v610Hh3dLookupTmdb(group); let base = null; if (hit?.id) { try { base = await getMeta('series', 'tmdb:' + hit.id); } catch {} }",
    "    const episodes = v610Hh3d.episodeList(group), videos = episodes.map(e => ({ id: 'hh3d:r:' + m[1] + ':' + e.season + ':' + e.episode, title: e.title, season: e.season, episode: e.episode }));",
    "    return { meta: { ...(base || {}), id: 'hh3d:r:' + m[1], type: 'series', name: base?.name || title, description: base?.description || ('Nguồn HH3D từ PikPak • ' + files.length + ' video'), videos, behaviorHints: { ...(base?.behaviorHints || {}), defaultVideoId: videos[0]?.id } } };",
    "  }",
    "  return { meta: null };",
    "}",
    "function v622PickEpisode(files, season, episode) { const exact = files.filter(x => Number(x.episode) === Number(episode) && Number(x.season || 1) === Number(season || 1)); if (exact.length) return exact; const sorted = [...files].sort((a,b) => (a.season-b.season) || ((a.episode ?? 1e9)-(b.episode ?? 1e9)) || a.name.localeCompare(b.name)); return sorted[Number(episode || 1)-1] ? [sorted[Number(episode || 1)-1]] : []; }",
    "async function v622StandaloneStreams(id) {",
    "  let m = String(id).match(/^hh3d:f:([A-Za-z0-9_-]+)(?::(\\d+):(\\d+))?$/); if (m) { const folderId = v622Dec(m[1]), p = v622FolderProvider(folderId); let files; try { files = await v622Timeout(p.listFiles(false), 15000, 'HH3D folder scan timeout'); } catch { return { streams: [] }; } const picked = v622PickEpisode(files, Number(m[2] || 1), Number(m[3] || 1)); const resolved = await v622Timeout(p.resolveCandidates(picked, V610_HH3D_STREAMS_MAX), 10000, 'HH3D direct URL timeout').catch(() => []); return { streams: resolved.map(x => stripPrivate(v610Hh3dStreamObject(x, 'HH3D'))) }; }",
    "  m = String(id).match(/^hh3d:r:([A-Za-z0-9_-]+)(?::(\\d+):(\\d+))?$/); if (m) { const title = v622Dec(m[1]), files = await v622RootGroupFiles(title), picked = v622PickEpisode(files, Number(m[2] || 1), Number(m[3] || 1)); const resolved = await v622Timeout(v610Hh3d.resolveCandidates(picked, V610_HH3D_STREAMS_MAX), 10000, 'HH3D direct URL timeout').catch(() => []); return { streams: resolved.map(x => stripPrivate(v610Hh3dStreamObject(x, title))) }; }",
    "  const parsed = parseId(id); if (!parsed) return { streams: [] }; const identity = await v430GetIdentityCached('series', parsed).catch(() => null); if (!identity) return { streams: [] }; const streams = await v622Timeout(v610Hh3dIdentityStreams('series', id, identity), 10000, 'HH3D identity scan timeout').catch(() => []); return { streams: streams.map(stripPrivate) };",
    "}",
    "",
    serverMarker
  ].join('\n');
  source = source.replace(serverMarker, helpers);

  const oldCatalog = "async function v620Hh3dStandaloneCatalog(extra = {}) {\n  return { metas: await v610Hh3dCatalog('series', extra) };\n}";
  const oldMeta = "async function v620Hh3dStandaloneMeta(id) {\n  return { meta: await v610Hh3dMeta(id) };\n}";
  if (!source.includes(oldCatalog) || !source.includes(oldMeta)) throw new Error('v6.2.2 patch target missing: standalone helpers');
  source = source.replace(oldCatalog, "async function v620Hh3dStandaloneCatalog(extra = {}) { return v622StandaloneCatalog(extra); }");
  source = source.replace(oldMeta, "async function v620Hh3dStandaloneMeta(id) { return v622StandaloneMeta(id); }");

  const oldStreamsStart = "async function v620Hh3dStandaloneStreams(id) {\n  if (String(id).startsWith('hh3d:')) return { streams: await v610Hh3dCustomStreams('series', id) };";
  if (!source.includes(oldStreamsStart)) throw new Error('v6.2.2 patch target missing: standalone streams');
  source = source.replace(oldStreamsStart, "async function v620Hh3dStandaloneStreams(id) {\n  if (String(id).startsWith('hh3d:')) return v622StandaloneStreams(id);");

  const oldDiag = [
    "  if (path === '/hh3d/diag') {",
    "    if (!v610Hh3d) return sendJson(res, 200, { version: '6.2.1', ok: false, stage: 'init', error: 'HH3D provider unavailable', apiHost: V610_HH3D_API_HOST, userHost: V610_HH3D_USER_HOST }, 0);",
    "    try {",
    "      const files = await v610Hh3d.listFiles(true);",
    "      const groups = await v610Hh3d.groups();",
    "      return sendJson(res, 200, { version: '6.2.1', ok: files.length > 0, stage: files.length ? 'ready' : 'scan', apiHost: V610_HH3D_API_HOST, userHost: V610_HH3D_USER_HOST, fileCount: files.length, groupCount: groups.length, sample: files.slice(0, 5).map(x => ({ name: x.name, path: x.path, size: x.size, season: x.season, episode: x.episode })) }, 0);",
    "    } catch (e) {",
    "      return sendJson(res, 200, { version: '6.2.1', ok: false, stage: 'pikpak', apiHost: V610_HH3D_API_HOST, userHost: V610_HH3D_USER_HOST, error: String(e?.message || e).slice(0, 500) }, 0);",
    "    }",
    "  }"
  ].join('\n');
  if (!source.includes(oldDiag)) throw new Error('v6.2.2 patch target missing: diag route');
  const newDiag = [
    "  if (path === '/hh3d/diag') {",
    "    const started = Date.now(); if (!v610Hh3d) return sendJson(res, 200, { version: '6.2.2', ok: false, stage: 'init', error: 'HH3D provider unavailable' }, 0);",
    "    try {",
    "      const items = await v622RootItems(true), folders = items.filter(x => x.kind === 'folder'), videos = items.filter(x => x.kind === 'video');",
    "      return sendJson(res, 200, { version: '6.2.2', ok: true, stage: 'share-detail', apiHost: V610_HH3D_API_HOST, userHost: V610_HH3D_USER_HOST, shareId: v610Hh3d.shareId, parentId: v610Hh3d.rootParentId || null, elapsedMs: Date.now() - started, itemCount: items.length, folderCount: folders.length, videoCount: videos.length, sample: items.slice(0, 8).map(x => ({ kind: x.kind, name: x.name, size: x.size || 0 })) }, 0);",
    "    } catch (e) {",
    "      return sendJson(res, 200, { version: '6.2.2', ok: false, stage: 'share-detail', apiHost: V610_HH3D_API_HOST, userHost: V610_HH3D_USER_HOST, parentId: v610Hh3d.rootParentId || null, elapsedMs: Date.now() - started, error: String(e?.message || e).slice(0, 500) }, 0);",
    "    }",
    "  }"
  ].join('\n');
  source = source.replace(oldDiag, newDiag);

  source = source.replace("version: '1.0.1',", "version: '1.0.2',");
  source = source.replace("description: 'HH3D standalone addon 1.0.1 • PikPak catalog + direct streams',", "description: 'HH3D standalone addon 1.0.2 • fast PikPak folder catalog + direct streams',");
  source = source.replaceAll('6.2.1', '6.2.2');
  source = source.replaceAll('single-process-v6.2.1', 'single-process-v6.2.2');
  return source;
};
