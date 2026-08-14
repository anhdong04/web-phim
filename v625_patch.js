module.exports = function applyV625(source) {
  const defaultsMarker = "const V610_HH3D_ENABLED = String(process.env.HH3D_PIKPAK_ENABLED || 'true').toLowerCase() !== 'false';";
  if (!source.includes(defaultsMarker)) throw new Error('v6.2.5 patch target missing: HH3D defaults');
  const defaults = [
    "const v625YanModule = require('./v625_yanhh3d');",
    "const V625_YANHH3D_ENABLED = String(process.env.YANHH3D_ENABLED || 'true').toLowerCase() !== 'false';",
    "const V625_YANHH3D_MAIN_URL = String(process.env.YANHH3D_MAIN_URL || 'https://yanhh3d.im');",
    "const V625_YANHH3D_TIMEOUT_MS = Math.max(2500, Math.min(20000, Number(process.env.YANHH3D_TIMEOUT_MS || 8000)));",
    "const V625_YANHH3D_CACHE_TTL_MS = Math.max(30000, Math.min(3600000, Number(process.env.YANHH3D_CACHE_TTL_MS || 600000)));",
    "const V625_YANHH3D_MAX_STREAMS = Math.max(1, Math.min(10, Number(process.env.YANHH3D_MAX_STREAMS || 6)));",
    "const v625Yan = V625_YANHH3D_ENABLED ? v625YanModule.createProvider({ mainUrl: V625_YANHH3D_MAIN_URL, timeoutMs: V625_YANHH3D_TIMEOUT_MS, cacheTtlMs: V625_YANHH3D_CACHE_TTL_MS }) : null;",
    "const v625YanIdentityCache = new Map();",
    defaultsMarker
  ].join('\n');
  source = source.replace(defaultsMarker, defaults);

  const serverMarker = 'const server = http.createServer(async (req, res) => {';
  if (!source.includes(serverMarker)) throw new Error('v6.2.5 patch target missing: server marker');
  const helpers = [
    "function v625Enc(value) { return Buffer.from(String(value || ''), 'utf8').toString('base64url'); }",
    "function v625Dec(value) { try { return Buffer.from(String(value || ''), 'base64url').toString('utf8'); } catch { return ''; } }",
    "function v625EpisodeNumber(value) { const m = String(value || '').match(/\\d+(?:\\.\\d+)?/); return m ? Number(m[0]) : null; }",
    "function v625YanId(detailUrl) { return 'yanhh3d:' + v625Enc(detailUrl); }",
    "function v625YanFallbackPoster(title) { try { return v624FallbackPosterUrl(title); } catch { return null; } }",
    "function v625YanPreview(item) {",
    "  const poster = item.posterUrl || v625YanFallbackPoster(item.title);",
    "  return { id: v625YanId(item.detailUrl), type: 'series', name: item.title, poster, background: poster, description: ['🐲 YanHH3D', item.qualityLabel, item.episodeCount ? (item.episodeCount + ' tập') : ''].filter(Boolean).join(' • ') };",
    "}",
    "async function v625YanCatalog(extra = {}) {",
    "  if (!v625Yan) return []; const search = String(extra?.search || '').trim(), skip = Math.max(0, Number(extra?.skip || 0));",
    "  try {",
    "    if (search) { const items = await v622Timeout(v625Yan.search(search), 9000, 'YanHH3D search timeout'); return items.slice(skip, skip + 20).map(v625YanPreview); }",
    "    const pageNo = Math.floor(skip / 20) + 1, page = await v622Timeout(v625Yan.fetchCategoryPage('/moi-cap-nhat', pageNo), 10000, 'YanHH3D catalog timeout');",
    "    const offset = skip % 20; return page.items.slice(offset, offset + 20).map(v625YanPreview);",
    "  } catch (e) { console.error('YanHH3D catalog:', e.message); return []; }",
    "}",
    "async function v625YanMeta(id) {",
    "  if (!v625Yan) return null; const m = String(id).match(/^yanhh3d:([A-Za-z0-9_-]+)$/); if (!m) return null; const detailUrl = v625Dec(m[1]); if (!/^https?:\\/\\//i.test(detailUrl)) return null;",
    "  let d; try { d = await v622Timeout(v625Yan.loadDetail(detailUrl), 16000, 'YanHH3D detail timeout'); } catch (e) { console.error('YanHH3D meta:', e.message); return null; }",
    "  const nums = [...new Set((d.episodes || []).map(x => Number(x.number || v625EpisodeNumber(x.name))).filter(Number.isFinite))].sort((a,b) => a-b); if (!nums.length && d.defaultWatchUrl) nums.push(1);",
    "  const videos = nums.map(n => ({ id: 'yanhh3d:' + m[1] + ':' + n, title: 'Tập ' + n, season: 1, episode: n }));",
    "  const poster = d.posterUrl || v625YanFallbackPoster(d.title), background = d.bannerUrl || poster;",
    "  return { id: 'yanhh3d:' + m[1], type: 'series', name: d.title, poster, background, description: d.overview || 'Nguồn YanHH3D', releaseInfo: d.year ? String(d.year) : undefined, genres: d.genres || ['Hoạt hình 3D'], videos, behaviorHints: { defaultVideoId: videos[0]?.id } };",
    "}",
    "function v625YanStreamObject(link, title = '') {",
    "  const fmt = link.isM3u8 ? 'HLS' : 'MP4';",
    "  return { name: '🐲 YanHH3D', title: [link.serverName, fmt, title].filter(Boolean).join(' • '), url: link.url, _provider: 'YanHH3D', _rawText: [link.serverName, title, link.url].filter(Boolean).join(' '), behaviorHints: { notWebReady: true, proxyHeaders: { request: link.headers || {} }, bingeGroup: 'webphim-yanhh3d' } };",
    "}",
    "async function v625YanStreamsForDetail(detailUrl, episode = 1, title = '') {",
    "  if (!v625Yan) return []; let d; try { d = await v622Timeout(v625Yan.loadDetail(detailUrl), 15000, 'YanHH3D detail timeout'); } catch { return []; }",
    "  let watch = (d.episodes || []).filter(x => Number(x.number || v625EpisodeNumber(x.name)) === Number(episode)).map(x => x.watchUrl).filter(Boolean);",
    "  if (!watch.length && Number(episode) === 1 && d.defaultWatchUrl) watch = [d.defaultWatchUrl]; watch = [...new Set(watch)].slice(0, 2);",
    "  const batches = await Promise.all(watch.map(u => v622Timeout(v625Yan.resolveStreamLinks(u), 12000, 'YanHH3D stream timeout').catch(() => [])));",
    "  const links = batches.flat(); const seen = new Set(), out = []; for (const link of links) { if (!link?.url || seen.has(link.url)) continue; seen.add(link.url); out.push(v625YanStreamObject(link, title || d.title)); if (out.length >= V625_YANHH3D_MAX_STREAMS) break; } return out;",
    "}",
    "async function v625YanCustomStreams(type, id) {",
    "  if (type !== 'series') return []; const m = String(id).match(/^yanhh3d:([A-Za-z0-9_-]+)(?::(\\d+(?:\\.\\d+)?))?$/); if (!m) return []; const detailUrl = v625Dec(m[1]); if (!/^https?:\\/\\//i.test(detailUrl)) return []; return v625YanStreamsForDetail(detailUrl, Number(m[2] || 1));",
    "}",
    "async function v625YanBestItem(identity) {",
    "  if (!v625Yan || !identity) return null; const key = [identity.title, identity.originalTitle].filter(Boolean).join('|').toLowerCase(); const c = v625YanIdentityCache.get(key); if (c && c.exp > Date.now()) return c.value;",
    "  const queries = [...new Set([identity.title, identity.originalTitle].filter(Boolean))].slice(0, 2); let best = null, bestScore = 0;",
    "  for (const q of queries) { let items = []; try { items = await v622Timeout(v625Yan.search(q), 7000, 'YanHH3D identity search timeout'); } catch {} for (const item of items.slice(0, 12)) { let score = 0; for (const target of queries) score = Math.max(score, v624Similarity(target, item.title)); if (score > bestScore) { best = item; bestScore = score; } } if (bestScore >= 94) break; }",
    "  const value = bestScore >= 55 ? best : null; v625YanIdentityCache.set(key, { value, exp: Date.now() + V625_YANHH3D_CACHE_TTL_MS }); return value;",
    "}",
    "async function v625YanIdentityStreams(type, id, identity) {",
    "  if (type !== 'series' || !identity || !v625Yan) return []; const item = await v625YanBestItem(identity); if (!item) return []; const ep = Number(identity.episode || 1); return v625YanStreamsForDetail(item.detailUrl, ep, identity.title || item.title);",
    "}",
    "function v625YanManifest() { return { id: 'vn.webphim.yanhh3d.v1', version: '1.0.0', name: '🐲 YanHH3D', description: 'YanHH3D • catalog, metadata, Thuyết minh/Vietsub streams', resources: ['catalog', { name:'meta', types:['series'], idPrefixes:['yanhh3d:'] }, { name:'stream', types:['series'], idPrefixes:['yanhh3d:','tt','tmdb:'] }], types:['series'], catalogs:[{ type:'series', id:'yanhh3d', name:'🐲 YanHH3D - Mới cập nhật', extra:[{name:'search',isRequired:false},{name:'skip',isRequired:false}] }], behaviorHints:{ configurable:false, configurationRequired:false } }; }",
    "",
    serverMarker
  ].join('\n');
  source = source.replace(serverMarker, helpers);

  const catalogAdvertise = "if (v610Hh3d) catalogs.unshift({ type: 'series', id: 'hh3d', name: '🐉 HH3D', extra: homeExtra });";
  if (!source.includes(catalogAdvertise)) throw new Error('v6.2.5 patch target missing: catalog advertise');
  source = source.replace(catalogAdvertise, catalogAdvertise + "\n  if (v625Yan) catalogs.unshift({ type: 'series', id: 'yanhh3d', name: '🐲 YanHH3D', extra: [{ name: 'search', isRequired: false }, { name: 'skip', isRequired: false }] });");

  const metaResource = "{ name: 'meta', types: ['movie', 'series'], idPrefixes: ['tmdb:', 'tt', 'hh3d:'] },";
  if (!source.includes(metaResource)) throw new Error('v6.2.5 patch target missing: meta resource');
  source = source.replace(metaResource, "{ name: 'meta', types: ['movie', 'series'], idPrefixes: ['tmdb:', 'tt', 'hh3d:', 'yanhh3d:'] },");
  const streamResource = "{ name: 'stream', types: ['movie', 'series'], idPrefixes: ['tmdb:', 'tt', 'hh3d:'] },";
  if (!source.includes(streamResource)) throw new Error('v6.2.5 patch target missing: stream resource');
  source = source.replace(streamResource, "{ name: 'stream', types: ['movie', 'series'], idPrefixes: ['tmdb:', 'tt', 'hh3d:', 'yanhh3d:'] },");

  const catalogDecl = 'async function getCatalog(type, id, extra = {}, shareId = null) {';
  if (!source.includes(catalogDecl)) throw new Error('v6.2.5 patch target missing: getCatalog');
  source = source.replace(catalogDecl, catalogDecl + "\n  if (id === 'yanhh3d' && type === 'series') return v625YanCatalog(extra);");
  const metaDecl = 'async function getMeta(type, id) {';
  if (!source.includes(metaDecl)) throw new Error('v6.2.5 patch target missing: getMeta');
  source = source.replace(metaDecl, metaDecl + "\n  if (type === 'series' && String(id).startsWith('yanhh3d:')) return v625YanMeta(id);");
  const streamsDecl = "async function getStreams(type, id, cfg, origin = '', base = '', shareId = null) {";
  if (!source.includes(streamsDecl)) throw new Error('v6.2.5 patch target missing: getStreams');
  source = source.replace(streamsDecl, streamsDecl + "\n  if (String(id).startsWith('yanhh3d:')) return v625YanCustomStreams(type, id);");

  const tasks = "const tasks = [getKKPhim(type, parsed), v610Hh3dIdentityStreams(type, id, identity), ...configuredUpstreams().map(s => getUpstream(s, type, upstreamId))];";
  if (!source.includes(tasks)) throw new Error('v6.2.5 patch target missing: stream tasks');
  source = source.replace(tasks, "const tasks = [getKKPhim(type, parsed), v610Hh3dIdentityStreams(type, id, identity), v625YanIdentityStreams(type, id, identity), ...configuredUpstreams().map(s => getUpstream(s, type, upstreamId))];");

  const feature = 'hh3dPikPak: Boolean(v610Hh3d),';
  if (source.includes(feature)) source = source.replace(feature, feature + ' yanhh3d: Boolean(v625Yan),');

  const requestMarker = "  const parsedBase = v500Resolved.parsedBase, path = parsedBase.rest, cfg = parsedBase.config;";
  if (!source.includes(requestMarker)) throw new Error('v6.2.5 patch target missing: request marker');
  const routes = [
    requestMarker,
    "  if (path === '/yanhh3d/manifest.json') return sendJson(res, 200, v625YanManifest(), 0);",
    "  if (path === '/yanhh3d/diag') { if (!v625Yan) return sendJson(res, 200, { version:'6.2.5', ok:false, stage:'disabled' }, 0); const started=Date.now(); try { const baseUrl=await v622Timeout(v625Yan.getBaseUrl(true),8000,'YanHH3D base timeout'); const page=await v622Timeout(v625Yan.fetchCategoryPage('/moi-cap-nhat',1),10000,'YanHH3D catalog timeout'); return sendJson(res,200,{version:'6.2.5',ok:true,baseUrl,elapsedMs:Date.now()-started,itemCount:page.items.length,sample:page.items.slice(0,8).map(x=>({title:x.title,poster:Boolean(x.posterUrl),episodes:x.episodeCount,quality:x.qualityLabel}))},0); } catch(e) { return sendJson(res,200,{version:'6.2.5',ok:false,stage:'fetch',elapsedMs:Date.now()-started,error:String(e?.message||e).slice(0,500)},0); } }",
    "  let v625m = path.match(/^\\/yanhh3d\\/catalog\\/series\\/yanhh3d(?:\\/([^/]+))?\\.json$/);",
    "  if (v625m) return sendJson(res, 200, { metas: await v625YanCatalog(parseExtra(v625m[1])) }, 30);",
    "  v625m = path.match(/^\\/yanhh3d\\/meta\\/series\\/([^/]+)\\.json$/);",
    "  if (v625m) return sendJson(res, 200, { meta: await v625YanMeta(decodeURIComponent(v625m[1])) }, 300);",
    "  v625m = path.match(/^\\/yanhh3d\\/stream\\/series\\/([^/]+)\\.json$/);",
    "  if (v625m) return sendJson(res, 200, { streams: (await v625YanCustomStreams('series', decodeURIComponent(v625m[1]))).map(stripPrivate) }, 0);"
  ].join('\n');
  source = source.replace(requestMarker, routes);

  source = source.replaceAll('6.2.4', '6.2.5');
  source = source.replaceAll('single-process-v6.2.4', 'single-process-v6.2.5');
  return source;
};
