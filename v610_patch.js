module.exports = function applyV610(source) {
  const defaultsMarker = "const V600_AI_TRANSLATION_ENABLED = String(process.env.AI_TRANSLATION_ENABLED || 'true').toLowerCase() !== 'false';";
  if (!source.includes(defaultsMarker)) throw new Error('v6.1 patch target missing: v6 defaults marker');

  const hh3dDefaults = [
    "const v610PikPak = require('./v610_pikpak');",
    "const V610_HH3D_ENABLED = String(process.env.HH3D_PIKPAK_ENABLED || 'true').toLowerCase() !== 'false';",
    "const V610_HH3D_SHARE_URL = String(process.env.HH3D_PIKPAK_SHARE_URL || 'https://mypikpak.com/s/VOkt2fVeAzvSKJmpotroQ8bro2/AAAGwdb3v_FOaz56vIeX6NSPo2_VOk');",
    "const V610_HH3D_PASSWORD = String(process.env.HH3D_PIKPAK_PASSWORD || '');",
    "const V610_HH3D_API_HOST = String(process.env.HH3D_PIKPAK_API_HOST || 'api-drive.mypikpak.com');",
    "const V610_HH3D_USER_HOST = String(process.env.HH3D_PIKPAK_USER_HOST || 'user.mypikpak.com');",
    "const V610_HH3D_TIMEOUT_MS = Math.max(2000, Math.min(20000, Number(process.env.HH3D_PIKPAK_TIMEOUT_MS || 9000)));",
    "const V610_HH3D_CACHE_TTL_MS = Math.max(60000, Math.min(21600000, Number(process.env.HH3D_PIKPAK_CACHE_TTL_MS || 900000)));",
    "const V610_HH3D_DIRECT_TTL_MS = Math.max(30000, Math.min(3600000, Number(process.env.HH3D_PIKPAK_DIRECT_TTL_MS || 300000)));",
    "const V610_HH3D_MAX_FILES = Math.max(50, Math.min(10000, Number(process.env.HH3D_PIKPAK_MAX_FILES || 2500)));",
    "const V610_HH3D_STREAMS_MAX = Math.max(1, Math.min(5, Number(process.env.HH3D_PIKPAK_STREAMS_MAX || 3)));",
    "const V610_HH3D_USE_TRANSCODING = String(process.env.HH3D_PIKPAK_USE_TRANSCODING || 'false').toLowerCase() === 'true';",
    "const v610Hh3dTmdbCache = new Map();",
    "let v610Hh3d = null;",
    "if (V610_HH3D_ENABLED && V610_HH3D_SHARE_URL) { try { v610Hh3d = v610PikPak.createProvider({ shareUrl: V610_HH3D_SHARE_URL, password: V610_HH3D_PASSWORD, apiHost: V610_HH3D_API_HOST, userHost: V610_HH3D_USER_HOST, timeoutMs: V610_HH3D_TIMEOUT_MS, cacheTtlMs: V610_HH3D_CACHE_TTL_MS, directTtlMs: V610_HH3D_DIRECT_TTL_MS, maxFiles: V610_HH3D_MAX_FILES, useTranscoding: V610_HH3D_USE_TRANSCODING }); } catch (e) { console.error('HH3D init:', e.message); } }",
    defaultsMarker
  ].join('\n');
  source = source.replace(defaultsMarker, hh3dDefaults);

  const serverMarker = 'const server = http.createServer(async (req, res) => {';
  if (!source.includes(serverMarker)) throw new Error('v6.1 patch target missing: server marker');
  const helpers = [
    "async function v610MapLimit(items, limit, worker) {",
    "  const out = new Array(items.length); let next = 0;",
    "  async function run() { while (true) { const i = next++; if (i >= items.length) return; try { out[i] = await worker(items[i], i); } catch { out[i] = null; } } }",
    "  await Promise.all(Array.from({ length: Math.min(Math.max(1, limit), items.length) }, () => run())); return out.filter(Boolean);",
    "}",
    "function v610Hh3dId(groupId) { return 'hh3d:' + groupId; }",
    "function v610Hh3dSize(bytes) { const n = Number(bytes || 0); if (!n) return ''; const gb = n / (1024 ** 3); return gb >= 1 ? gb.toFixed(gb >= 10 ? 0 : 1) + ' GB' : Math.round(n / (1024 ** 2)) + ' MB'; }",
    "async function v610Hh3dLookupTmdb(group) {",
    "  if (!group?.id) return null; if (v610Hh3dTmdbCache.has(group.id)) return v610Hh3dTmdbCache.get(group.id);",
    "  let hit = null; try { const p = await fetchJson(tmdbUrl('/search/tv', { query: group.title, page: 1, include_adult: 'false' }), 'TMDB HH3D match'); hit = p?.results?.[0] || null; } catch {}",
    "  v610Hh3dTmdbCache.set(group.id, hit); return hit;",
    "}",
    "async function v610Hh3dCatalog(type, extra = {}) {",
    "  if (!v610Hh3d || type !== 'series') return []; let groups; try { groups = await v610Hh3d.groups(); } catch (e) { console.error('HH3D catalog:', e.message); return []; }",
    "  const skip = Math.max(0, Number(extra?.skip || 0)), page = groups.slice(skip, skip + 20);",
    "  return v610MapLimit(page, 6, async group => {",
    "    const hit = await v610Hh3dLookupTmdb(group); if (hit) { const p = toPreview(hit, 'series'); return { ...p, id: v610Hh3dId(group.id), type: 'series', name: p.name || group.title, description: p.description || ('HH3D • ' + group.files.length + ' video'), behaviorHints: { ...(p.behaviorHints || {}), hh3dGroupId: group.id } }; }",
    "    return { id: v610Hh3dId(group.id), type: 'series', name: group.title, description: '🐉 HH3D / PikPak • ' + group.files.length + ' video', releaseInfo: undefined, behaviorHints: { hh3dGroupId: group.id } };",
    "  });",
    "}",
    "async function v610Hh3dMeta(id) {",
    "  if (!v610Hh3d) return null; const m = String(id).match(/^hh3d:([a-f0-9]{14})$/i); if (!m) return null;",
    "  const group = await v610Hh3d.getGroup(m[1]).catch(() => null); if (!group) return null; const hit = await v610Hh3dLookupTmdb(group); let base = null;",
    "  if (hit?.id) { try { base = await getMeta('series', 'tmdb:' + hit.id); } catch {} }",
    "  const episodes = v610Hh3d.episodeList(group), videos = episodes.map(e => ({ id: 'hh3d:' + group.id + ':' + e.season + ':' + e.episode, title: e.title, season: e.season, episode: e.episode }));",
    "  return { ...(base || {}), id: v610Hh3dId(group.id), type: 'series', name: base?.name || group.title, description: base?.description || ('Nguồn HH3D từ PikPak • ' + group.files.length + ' video'), videos, behaviorHints: { ...(base?.behaviorHints || {}), defaultVideoId: videos[0]?.id, hh3dGroupId: group.id } };",
    "}",
    "function v610Hh3dStreamObject(item, identityTitle = '') {",
    "  const r = resolutionFromText(item.name || ''), quality = r ? r + 'p' : 'Video', size = v610Hh3dSize(item.size);",
    "  return { name: '🐉 HH3D / PikPak', title: [quality, 'HH3D', size, identityTitle].filter(Boolean).join(' • '), description: [item.path, item.name].filter(Boolean).join(' / '), url: item.url, _provider: 'HH3D', _rawText: [identityTitle, item.path, item.name].filter(Boolean).join(' '), behaviorHints: { notWebReady: true, proxyHeaders: { request: item.headers || {} }, filename: item.name, videoSize: Number(item.size || 0), bingeGroup: 'webphim-hh3d-' + (r || 'auto') } };",
    "}",
    "async function v610Hh3dCustomStreams(type, id) {",
    "  if (!v610Hh3d || type !== 'series') return []; const m = String(id).match(/^hh3d:([a-f0-9]{14})(?::(\\d+):(\\d+))?$/i); if (!m) return [];",
    "  const group = await v610Hh3d.getGroup(m[1]).catch(() => null); if (!group) return []; const season = Number(m[2] || 1), episode = Number(m[3] || 1);",
    "  const files = await v610Hh3d.findCandidates({ groupId: group.id, season, episode }).catch(() => []), resolved = await v610Hh3d.resolveCandidates(files, V610_HH3D_STREAMS_MAX).catch(() => []);",
    "  return resolved.map(x => stripPrivate(v610Hh3dStreamObject(x, group.title)));",
    "}",
    "async function v610Hh3dIdentityStreams(type, id, identity) {",
    "  if (!v610Hh3d || !identity) return []; const files = await v610Hh3d.findCandidates({ title: identity.title, originalTitle: identity.originalTitle, season: identity.season, episode: identity.episode }).catch(() => []);",
    "  const resolved = await v610Hh3d.resolveCandidates(files, V610_HH3D_STREAMS_MAX).catch(() => []); return resolved.map(x => v610Hh3dStreamObject(x, identity.title || identity.originalTitle || ''));",
    "}",
    "",
    serverMarker
  ].join('\n');
  source = source.replace(serverMarker, helpers);

  const metaResource = "{ name: 'meta', types: ['movie', 'series'], idPrefixes: ['tmdb:', 'tt'] },";
  if (!source.includes(metaResource)) throw new Error('v6.1 patch target missing: meta resource');
  source = source.replace(metaResource, "{ name: 'meta', types: ['movie', 'series'], idPrefixes: ['tmdb:', 'tt', 'hh3d:'] },");

  const streamResource = "{ name: 'stream', types: ['movie', 'series'], idPrefixes: ['tmdb:', 'tt'] },";
  if (!source.includes(streamResource)) throw new Error('v6.1 patch target missing: stream resource');
  source = source.replace(streamResource, "{ name: 'stream', types: ['movie', 'series'], idPrefixes: ['tmdb:', 'tt', 'hh3d:'] },");

  const searchCatalogMarker = "  catalogs.push({ type: 'movie', id: 'search-movies', name: 'Tìm kiếm phim', extra: searchExtra });";
  if (!source.includes(searchCatalogMarker)) throw new Error('v6.1 patch target missing: search catalog marker');
  source = source.replace(searchCatalogMarker, "  if (v610Hh3d) catalogs.unshift({ type: 'series', id: 'hh3d', name: '🐉 HH3D', extra: homeExtra });\n" + searchCatalogMarker);

  const getCatalogDecl = 'async function getCatalog(type, id, extra = {}, shareId = null) {';
  if (!source.includes(getCatalogDecl)) throw new Error('v6.1 patch target missing: getCatalog declaration');
  source = source.replace(getCatalogDecl, getCatalogDecl + "\n  if (id === 'hh3d') return v610Hh3dCatalog(type, extra);");

  const getMetaDecl = 'async function getMeta(type, id) {';
  if (!source.includes(getMetaDecl)) throw new Error('v6.1 patch target missing: getMeta declaration');
  source = source.replace(getMetaDecl, getMetaDecl + "\n  if (type === 'series' && String(id).startsWith('hh3d:')) return v610Hh3dMeta(id);");

  const getStreamsDecl = "async function getStreams(type, id, cfg, origin = '', base = '', shareId = null) {";
  if (!source.includes(getStreamsDecl)) throw new Error('v6.1 patch target missing: getStreams declaration');
  source = source.replace(getStreamsDecl, getStreamsDecl + "\n  if (String(id).startsWith('hh3d:')) return v610Hh3dCustomStreams(type, id);");

  const tasksLine = "  const tasks = [getKKPhim(type, parsed), ...configuredUpstreams().map(s => getUpstream(s, type, upstreamId))];";
  if (!source.includes(tasksLine)) throw new Error('v6.1 patch target missing: stream tasks');
  source = source.replace(tasksLine, "  const tasks = [getKKPhim(type, parsed), v610Hh3dIdentityStreams(type, id, identity), ...configuredUpstreams().map(s => getUpstream(s, type, upstreamId))];");

  const releaseKeyMarker = 'function smartReleaseKey(s) {';
  if (!source.includes(releaseKeyMarker)) throw new Error('v6.1 patch target missing: smartReleaseKey');
  source = source.replace(releaseKeyMarker, releaseKeyMarker + "\n  if (s?._provider === 'HH3D') return 'hh3d:' + String(s?.behaviorHints?.filename || s?.url || '') + ':' + String(s?.behaviorHints?.videoSize || '');");

  const featureMarker = 'personalHome: V600_PERSONAL_HOME,';
  if (source.includes(featureMarker)) source = source.replace(featureMarker, featureMarker + ' hh3dPikPak: Boolean(v610Hh3d),');

  source = source.replaceAll('6.0.0', '6.1.0');
  source = source.replaceAll('single-process-v6', 'single-process-v6.1');
  return source;
};
