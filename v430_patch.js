module.exports = function applyV430(source) {
  // ----------------------------------------------------------
  // v4.3 defaults: configurable Home, provider priority,
  // fail-soft stream collection and shared identity cache.
  // ----------------------------------------------------------
  const defaultsStart = "const DEFAULTS = Object.freeze({";
  if (!source.includes(defaultsStart)) throw new Error('v4.3 patch target missing: DEFAULTS start');
  const preDefaults = [
    "const V430_DEFAULT_HOME_ROWS = ['home-hot','home-top10','home-new-movies','home-new-series','home-animation','home-korean','home-horror','home-action'];",
    "const V430_HOME_CATALOGS = [",
    "  { id: 'home-hot', type: 'movie', name: '🔥 Hot rần rần' },",
    "  { id: 'home-top10', type: 'movie', name: '🏆 Top 10 hôm nay' },",
    "  { id: 'home-new-movies', type: 'movie', name: '🆕 Phim lẻ mới cập nhật' },",
    "  { id: 'home-new-series', type: 'series', name: '📺 Phim bộ mới nhất' },",
    "  { id: 'home-animation', type: 'movie', name: '🧸 Hoạt hình' },",
    "  { id: 'home-korean', type: 'series', name: '🇰🇷 Phim Hàn Quốc' },",
    "  { id: 'home-horror', type: 'movie', name: '👻 Kinh dị' },",
    "  { id: 'home-action', type: 'movie', name: '⚔️ Hành động' },",
    "  { id: 'home-vietnam', type: 'movie', name: '🇻🇳 Phim Việt Nam' },",
    "  { id: 'home-china', type: 'movie', name: '🇨🇳 Phim Trung Quốc' },",
    "  { id: 'home-anime', type: 'series', name: '🇯🇵 Anime Nhật Bản' },",
    "  { id: 'home-rated', type: 'movie', name: '⭐ Đánh giá cao' },",
    "  { id: 'home-upcoming', type: 'movie', name: '🎬 Sắp chiếu' },",
    "  { id: 'home-trending-tv', type: 'series', name: '🔥 Phim bộ thịnh hành' }",
    "];",
    "const IDENTITY_CACHE_TTL_MS = Number(process.env.IDENTITY_CACHE_TTL_MS || 21600000);",
    "const STREAM_RESPONSE_BUDGET_MS = Number(process.env.STREAM_RESPONSE_BUDGET_MS || 5500);",
    "const STREAM_EARLY_RESULT_COUNT = Number(process.env.STREAM_EARLY_RESULT_COUNT || 20);",
    "const v430IdentityCache = new Map();",
    "const v430IdentityStats = { hits: 0, misses: 0, stores: 0 };",
    "",
    defaultsStart
  ].join('\n');
  source = source.replace(defaultsStart, preDefaults);

  const defaultTail = "  preferredAudio: String(process.env.PREFERRED_AUDIO || 'auto').toLowerCase()";
  if (!source.includes(defaultTail)) throw new Error('v4.3 patch target missing: v4.2 defaults');
  source = source.replace(defaultTail, defaultTail + ",\n  providerPriority: String(process.env.PROVIDER_PRIORITY || 'kkphim-first').toLowerCase(),\n  homeRows: String(process.env.HOME_ROWS || V430_DEFAULT_HOME_ROWS.join(',')).split(',').map(x => x.trim()).filter(Boolean)");

  const sanitizeStart = "function sanitizeConfig(raw = {}) {";
  if (!source.includes(sanitizeStart)) throw new Error('v4.3 patch target missing: sanitizeConfig');
  const sanitizeHelper = [
    "function v430SanitizeHomeRows(value) {",
    "  const allowed = new Set(V430_HOME_CATALOGS.map(x => x.id));",
    "  const raw = Array.isArray(value) ? value : String(value || DEFAULTS.homeRows.join(',')).split(',');",
    "  const out = [];",
    "  for (const id of raw.map(x => String(x).trim())) if (allowed.has(id) && !out.includes(id)) out.push(id);",
    "  return out.length ? out : [...V430_DEFAULT_HOME_ROWS];",
    "}",
    "",
    sanitizeStart
  ].join('\n');
  source = source.replace(sanitizeStart, sanitizeHelper);

  const sanitizeTail = "    preferredAudio: ['auto','premium','compatible','small'].includes(String(raw.preferredAudio || '').toLowerCase()) ? String(raw.preferredAudio).toLowerCase() : DEFAULTS.preferredAudio,";
  if (!source.includes(sanitizeTail)) throw new Error('v4.3 patch target missing: v4.2 sanitize tail');
  source = source.replace(sanitizeTail, sanitizeTail + "\n    providerPriority: ['kkphim-first','cached-first','quality-first','small-first','balanced'].includes(String(raw.providerPriority || '').toLowerCase()) ? String(raw.providerPriority).toLowerCase() : DEFAULTS.providerPriority,\n    homeRows: v430SanitizeHomeRows(raw.homeRows),");

  // ----------------------------------------------------------
  // New Home catalog sources.
  // ----------------------------------------------------------
  const specTail = "  'home-action': { type: 'movie', path: '/discover/movie', params: { with_genres: '28', sort_by: 'popularity.desc', include_adult: 'false' } }\n};";
  if (!source.includes(specTail)) throw new Error('v4.3 patch target missing: catalogSpecs tail');
  source = source.replace(specTail, [
    "  'home-action': { type: 'movie', path: '/discover/movie', params: { with_genres: '28', sort_by: 'popularity.desc', include_adult: 'false' } },",
    "  'home-vietnam': { type: 'movie', path: '/discover/movie', params: { with_origin_country: 'VN', sort_by: 'popularity.desc', include_adult: 'false' } },",
    "  'home-china': { type: 'movie', path: '/discover/movie', params: { with_origin_country: 'CN', sort_by: 'popularity.desc', include_adult: 'false' } },",
    "  'home-anime': { type: 'series', path: '/discover/tv', params: { with_origin_country: 'JP', with_genres: '16', sort_by: 'popularity.desc' } },",
    "  'home-rated': { type: 'movie', path: '/movie/top_rated' },",
    "  'home-upcoming': { type: 'movie', path: '/movie/upcoming', region: true },",
    "  'home-trending-tv': { type: 'series', path: '/trending/tv/week' }",
    "};"
  ].join('\n'));

  // Manifest Home rows now follow the per-manifest config.
  const buildManifestRe = /function buildManifest\(\) \{[\s\S]*?\n\}\n\nfunction sendJson/;
  if (!buildManifestRe.test(source)) throw new Error('v4.3 patch target missing: buildManifest');
  const manifestFn = [
    "function buildManifest(cfg = sanitizeConfig(DEFAULTS)) {",
    "  const byId = new Map(V430_HOME_CATALOGS.map(x => [x.id, x]));",
    "  const catalogs = v430SanitizeHomeRows(cfg.homeRows).map(id => byId.get(id)).filter(Boolean).map(x => ({ type: x.type, id: x.id, name: x.name, extra: homeExtra }));",
    "  catalogs.push({ type: 'movie', id: 'search-movies', name: 'Tìm kiếm phim', extra: searchExtra });",
    "  catalogs.push({ type: 'series', id: 'search-series', name: 'Tìm kiếm phim bộ', extra: searchExtra });",
    "  return {",
    "    id: 'vn.webphim.nuvio.v4', version: '4.3.0', name: 'Phim Việt + TorBox',",
    "    description: 'TMDB Việt + KKPhim + smart-ranked debrid streams + multi-source subtitles',",
    "    resources: ['catalog',",
    "      { name: 'meta', types: ['movie', 'series'], idPrefixes: ['tmdb:'] },",
    "      { name: 'stream', types: ['movie', 'series'], idPrefixes: ['tmdb:', 'tt'] },",
    "      { name: 'subtitles', types: ['movie', 'series'], idPrefixes: ['tmdb:', 'tt'] }],",
    "    types: ['movie', 'series'], catalogs,",
    "    behaviorHints: { configurable: true, configurationRequired: false }",
    "  };",
    "}",
    "",
    "function sendJson"
  ].join('\n');
  source = source.replace(buildManifestRe, manifestFn);
  const manifestRoute = "if (path === '/manifest.json') return sendJson(res, 200, buildManifest(), 300);";
  if (!source.includes(manifestRoute)) throw new Error('v4.3 patch target missing: manifest route');
  source = source.replace(manifestRoute, "if (path === '/manifest.json') return sendJson(res, 200, buildManifest(cfg), 300);");

  // ----------------------------------------------------------
  // Metadata enrichment: trailer, logo, certification,
  // countries, networks and exact release timestamp.
  // ----------------------------------------------------------
  const oldAppend = "{ append_to_response: 'external_ids,credits' }";
  if (!source.includes(oldAppend)) throw new Error('v4.3 patch target missing: meta append_to_response');
  source = source.replaceAll(oldAppend, "{ append_to_response: 'external_ids,credits,videos,release_dates,content_ratings,images', include_image_language: 'vi,en,null' }");

  const getMetaMarker = "async function getMeta(type, id) {";
  if (!source.includes(getMetaMarker)) throw new Error('v4.3 patch target missing: getMeta');
  const metaHelpers = [
    "function v430Certification(p, type) {",
    "  if (type === 'movie') {",
    "    const groups = p?.release_dates?.results || [];",
    "    const preferred = groups.find(x => x.iso_3166_1 === TMDB_REGION) || groups.find(x => x.iso_3166_1 === 'US') || groups[0];",
    "    return preferred?.release_dates?.map(x => x.certification).find(Boolean) || undefined;",
    "  }",
    "  const ratings = p?.content_ratings?.results || [];",
    "  return (ratings.find(x => x.iso_3166_1 === TMDB_REGION) || ratings.find(x => x.iso_3166_1 === 'US') || ratings[0])?.rating || undefined;",
    "}",
    "function v430MetaExtras(p, type) {",
    "  const trailerResults = (p?.videos?.results || []).filter(x => x.site === 'YouTube' && (x.type === 'Trailer' || x.type === 'Teaser')).slice(0, 5);",
    "  const logos = p?.images?.logos || [];",
    "  const logo = logos.find(x => x.iso_639_1 === 'vi') || logos.find(x => x.iso_639_1 === 'en') || logos.find(x => !x.iso_639_1) || logos[0];",
    "  const countries = type === 'movie' ? (p?.production_countries || []).map(x => x.name) : (p?.origin_country || []);",
    "  const networks = (p?.networks || []).map(x => x.name).filter(Boolean);",
    "  const date = type === 'movie' ? p?.release_date : p?.first_air_date;",
    "  return {",
    "    logo: logo?.file_path ? img(logo.file_path, 'w500') : undefined,",
    "    trailers: trailerResults.map(x => ({ source: x.key, type: x.type })),",
    "    certification: v430Certification(p, type),",
    "    country: countries.filter(Boolean).join(', ') || undefined,",
    "    network: networks.join(', ') || undefined,",
    "    released: date ? date + 'T00:00:00.000Z' : undefined",
    "  };",
    "}",
    "",
    getMetaMarker
  ].join('\n');
  source = source.replace(getMetaMarker, metaHelpers);

  const movieMetaTail = "      imdbRating: p.vote_average ? Number(p.vote_average).toFixed(1) : undefined, behaviorHints: { defaultVideoId: id } };";
  if (!source.includes(movieMetaTail)) throw new Error('v4.3 patch target missing: movie meta tail');
  source = source.replace(movieMetaTail, "      imdbRating: p.vote_average ? Number(p.vote_average).toFixed(1) : undefined, ...v430MetaExtras(p, 'movie'), behaviorHints: { defaultVideoId: id } };");
  const tvMetaTail = "    imdbRating: p.vote_average ? Number(p.vote_average).toFixed(1) : undefined, videos: await fetchTvVideos(tmdbId, p.seasons) };";
  if (!source.includes(tvMetaTail)) throw new Error('v4.3 patch target missing: tv meta tail');
  source = source.replace(tvMetaTail, "    imdbRating: p.vote_average ? Number(p.vote_average).toFixed(1) : undefined, ...v430MetaExtras(p, 'series'), videos: await fetchTvVideos(tmdbId, p.seasons) };");

  // ----------------------------------------------------------
  // Provider-priority scoring + clean stream labels.
  // ----------------------------------------------------------
  const streamScoreStart = "function streamScore(s, cfg) {\n  if (isKK(s)) return 100000;";
  if (!source.includes(streamScoreStart)) throw new Error('v4.3 patch target missing: streamScore start');
  const priorityScorer = [
    "function v430ProviderPriorityScore(s, cfg) {",
    "  const cached = isCachedHint(s), gb = sizeGB(s);",
    "  switch (cfg.providerPriority) {",
    "    case 'kkphim-first': return isKK(s) ? 50000 : (cached ? 3500 : 0);",
    "    case 'cached-first': return cached ? 14000 : (isKK(s) ? 1500 : 0);",
    "    case 'quality-first': return 0;",
    "    case 'small-first': return (isKK(s) ? 2500 : 0) - Math.min(gb, 120) * 350;",
    "    case 'balanced': default: return (isKK(s) ? 7000 : 0) + (cached ? 5000 : 0);",
    "  }",
    "}",
    "function streamScore(s, cfg) {",
    "  const providerBonus = v430ProviderPriorityScore(s, cfg);"
  ].join('\n');
  source = source.replace(streamScoreStart, priorityScorer);
  const scoreTail = "  score += v420ProfileScore(s, cfg);\n  return score;";
  if (!source.includes(scoreTail)) throw new Error('v4.3 patch target missing: streamScore tail');
  source = source.replace(scoreTail, "  score += v420ProfileScore(s, cfg);\n  score += providerBonus;\n  return score;");

  const dedupeMarker = "function smartDedupe(streams, cfg) {";
  if (!source.includes(dedupeMarker)) throw new Error('v4.3 patch target missing: smartDedupe');
  const labelHelpers = [
    "function v430SourceLabel(s) {",
    "  const t = streamText(s).toLowerCase();",
    "  if (/\\bremux\\b/.test(t)) return 'REMUX';",
    "  if (/blu.?ray|bluray/.test(t)) return 'BluRay';",
    "  if (/web[- .]?dl|webdl/.test(t)) return 'WEB-DL';",
    "  if (/webrip/.test(t)) return 'WEBRip';",
    "  if (/hdtv/.test(t)) return 'HDTV';",
    "  if (/brrip|bdrip/.test(t)) return 'BDRip';",
    "  if (/dvdrip|dvd/.test(t)) return 'DVDRip';",
    "  return '';",
    "}",
    "function v430CodecLabel(s) { const c = v420Codec(s); return c === 'hevc' ? 'HEVC' : c === 'av1' ? 'AV1' : c === 'h264' ? 'H.264' : ''; }",
    "function v430AudioLabel(s) {",
    "  const t = streamText(s).toLowerCase();",
    "  if (/\\batmos\\b/.test(t)) return 'Atmos';",
    "  if (/\\btruehd\\b/.test(t)) return 'TrueHD';",
    "  if (/dts[- .]?hd|dts:x/.test(t)) return 'DTS-HD';",
    "  if (/eac3|e-ac-3|ddp/.test(t)) return 'EAC3';",
    "  if (/\\bac3\\b/.test(t)) return 'AC3';",
    "  if (/\\bdts\\b/.test(t)) return 'DTS';",
    "  if (/\\baac\\b/.test(t)) return 'AAC';",
    "  return '';",
    "}",
    "function v430HdrLabel(s) {",
    "  const t = streamText(s).toLowerCase();",
    "  if (/dolby vision|\\bdv\\b/.test(t)) return 'DV';",
    "  if (/hdr10\\+/.test(t)) return 'HDR10+';",
    "  if (/hdr10/.test(t)) return 'HDR10';",
    "  if (/\\bhdr\\b/.test(t)) return 'HDR';",
    "  return '';",
    "}",
    "function v430FormatStream(s) {",
    "  if (isKK(s)) return s;",
    "  const out = { ...s };",
    "  const r = streamResolution(s), sourceLabel = v430SourceLabel(s), codec = v430CodecLabel(s);",
    "  const first = [r ? r + 'p' : '', sourceLabel, codec].filter(Boolean);",
    "  const gb = sizeGB(s), second = [isCachedHint(s) ? '⚡ Cached' : '', v430HdrLabel(s), v430AudioLabel(s), gb > 0 ? gb.toFixed(gb >= 10 ? 1 : 2) + ' GB' : ''].filter(Boolean);",
    "  if (first.length || second.length) out.title = first.join(' • ') + (second.length ? '\\n' + second.join(' • ') : '');",
    "  if (s._provider) out.name = s._provider === 'Comet' ? '⚡ Comet / TorBox' : (isCachedHint(s) ? '⚡ ' : '') + s._provider;",
    "  return out;",
    "}",
    "",
    dedupeMarker
  ].join('\n');
  source = source.replace(dedupeMarker, labelHelpers);

  const curateStart = source.indexOf('function curateStreams(streams, identity, type, cfg) {');
  const curateEnd = source.indexOf('\nasync function getStreams(type, id, cfg) {', curateStart);
  if (curateStart < 0 || curateEnd < 0) throw new Error('v4.3 patch target missing: curateStreams boundaries');
  let curateBlock = source.slice(curateStart, curateEnd);
  curateBlock = curateBlock.replaceAll('out.push(stripPrivate(s));', 'out.push(stripPrivate(v430FormatStream(s)));');
  source = source.slice(0, curateStart) + curateBlock + source.slice(curateEnd);

  // ----------------------------------------------------------
  // Shared identity cache and fail-soft upstream collection.
  // ----------------------------------------------------------
  const getStreamsStart = source.indexOf('async function getStreams(type, id, cfg) {');
  const getStreamsEnd = source.indexOf('\n\nasync function getSubtitleSource', getStreamsStart);
  if (getStreamsStart < 0 || getStreamsEnd < 0) throw new Error('v4.3 patch target missing: getStreams boundaries');
  const cacheAndStreams = [
    "function v430IdentityKey(kind, type, parsed) {",
    "  return kind + '|' + type + '|' + (parsed?.kind || '') + '|' + (parsed?.tmdbId || parsed?.imdbId || '') + '|' + (parsed?.season || '') + '|' + (parsed?.episode || '');",
    "}",
    "function v430IdentityCacheGet(key) {",
    "  const item = v430IdentityCache.get(key);",
    "  if (!item || item.expiresAt <= Date.now()) { if (item) v430IdentityCache.delete(key); v430IdentityStats.misses += 1; return { hit: false }; }",
    "  v430IdentityStats.hits += 1; return { hit: true, value: item.value };",
    "}",
    "function v430IdentityCacheSet(key, value) {",
    "  if (v430IdentityCache.size > 1000) { const first = v430IdentityCache.keys().next().value; if (first) v430IdentityCache.delete(first); }",
    "  v430IdentityCache.set(key, { value, expiresAt: Date.now() + IDENTITY_CACHE_TTL_MS }); v430IdentityStats.stores += 1; return value;",
    "}",
    "async function v430ResolveImdbCached(type, parsed) {",
    "  const key = v430IdentityKey('imdb', type, parsed), cached = v430IdentityCacheGet(key); if (cached.hit) return cached.value;",
    "  return v430IdentityCacheSet(key, await resolveImdb(type, parsed));",
    "}",
    "async function v430GetIdentityCached(type, parsed) {",
    "  const key = v430IdentityKey('identity', type, parsed), cached = v430IdentityCacheGet(key); if (cached.hit) return cached.value;",
    "  return v430IdentityCacheSet(key, await getMediaIdentity(type, parsed));",
    "}",
    "function v430CollectFailSoft(tasks, budgetMs, earlyCount) {",
    "  return new Promise(resolve => {",
    "    if (!tasks.length) return resolve([]);",
    "    const parts = []; let completed = 0, total = 0, finished = false;",
    "    const finish = () => { if (finished) return; finished = true; clearTimeout(timer); resolve(parts); };",
    "    const timer = setTimeout(finish, Math.max(500, budgetMs));",
    "    for (const task of tasks) Promise.resolve(task).then(value => {",
    "      if (finished) return; const arr = Array.isArray(value) ? value : []; parts.push(arr); total += arr.length; completed += 1;",
    "      if (completed >= tasks.length || (completed >= Math.min(2, tasks.length) && total >= earlyCount)) finish();",
    "    }).catch(() => { if (finished) return; completed += 1; if (completed >= tasks.length) finish(); });",
    "  });",
    "}",
    "async function getStreams(type, id, cfg) {",
    "  const parsed = parseId(id); if (!parsed) return [];",
    "  const [imdb, identity] = await Promise.all([v430ResolveImdbCached(type, parsed).catch(() => null), v430GetIdentityCached(type, parsed).catch(() => null)]);",
    "  const upstreamId = imdb ? `${imdb}${type === 'series' && parsed.season ? `:${parsed.season}:${parsed.episode || 1}` : ''}` : id;",
    "  const tasks = [getKKPhim(type, parsed), ...configuredUpstreams().map(s => getUpstream(s, type, upstreamId))];",
    "  const parts = await v430CollectFailSoft(tasks, STREAM_RESPONSE_BUDGET_MS, STREAM_EARLY_RESULT_COUNT);",
    "  return curateStreams(parts.flat(), identity, type, cfg);",
    "}"
  ].join('\n');
  source = source.slice(0, getStreamsStart) + cacheAndStreams + source.slice(getStreamsEnd);

  // Subtitles share the same identity cache.
  source = source.replaceAll('resolveImdb(type, parsed).catch(() => null)', 'v430ResolveImdbCached(type, parsed).catch(() => null)');
  source = source.replaceAll('getMediaIdentity(type, parsed).catch(() => null)', 'v430GetIdentityCached(type, parsed).catch(() => null)');

  // ----------------------------------------------------------
  // Configure v3: provider priority + Home rows toggle/order.
  // ----------------------------------------------------------
  const preferredAudioHtml = '<div><label>Preferred audio</label><select id="preferredAudio"><option value="auto">Auto</option><option value="premium">Atmos / TrueHD / DTS-HD</option><option value="compatible">EAC3 / AC3 / DTS</option><option value="small">AAC / Stereo</option></select></div>';
  if (!source.includes(preferredAudioHtml)) throw new Error('v4.3 patch target missing: preferred audio UI');
  source = source.replace(preferredAudioHtml, preferredAudioHtml + '<div><label>Ưu tiên nguồn</label><select id="providerPriority"><option value="kkphim-first">KKPhim trước</option><option value="cached-first">Cached debrid trước</option><option value="quality-first">Chất lượng trước</option><option value="small-first">File nhỏ trước</option><option value="balanced">Cân bằng</option></select></div>');

  const subtitleCard = '<div class="card"><h2>Subtitle</h2>';
  if (!source.includes(subtitleCard)) throw new Error('v4.3 patch target missing: subtitle card');
  source = source.replace(subtitleCard, '<div class="card"><h2>Home</h2><div class="muted">Bật/tắt và dùng ↑ ↓ để sắp xếp các hàng trên trang chủ.</div><div id="homeRowsEditor"></div></div>' + subtitleCard);
  source = source.replace('a{color:#7da2ff}', 'a{color:#7da2ff}.homeitem{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px solid #292f38}.homecheck{margin:0;font-weight:500}.smallbtn{padding:5px 9px;margin-left:5px;background:#303845}');

  const submitMarker = "}g('f').onsubmit=e=>{e.preventDefault();const c={";
  if (!source.includes(submitMarker)) throw new Error('v4.3 patch target missing: configure submit marker');
  const homeJs = [
    "}const homeOptions=[['home-hot','🔥 Hot rần rần'],['home-top10','🏆 Top 10 hôm nay'],['home-new-movies','🆕 Phim lẻ mới cập nhật'],['home-new-series','📺 Phim bộ mới nhất'],['home-animation','🧸 Hoạt hình'],['home-korean','🇰🇷 Phim Hàn Quốc'],['home-horror','👻 Kinh dị'],['home-action','⚔️ Hành động'],['home-vietnam','🇻🇳 Phim Việt Nam'],['home-china','🇨🇳 Phim Trung Quốc'],['home-anime','🇯🇵 Anime Nhật Bản'],['home-rated','⭐ Đánh giá cao'],['home-upcoming','🎬 Sắp chiếu'],['home-trending-tv','🔥 Phim bộ thịnh hành']];",
    "let homeOrder=Array.isArray(initial.homeRows)?initial.homeRows.slice():homeOptions.slice(0,8).map(x=>x[0]);",
    "function renderHome(){const all=homeOrder.map(id=>homeOptions.find(x=>x[0]===id)).filter(Boolean).concat(homeOptions.filter(x=>!homeOrder.includes(x[0])));g('homeRowsEditor').innerHTML=all.map(x=>{const id=x[0],name=x[1],on=homeOrder.includes(id);return '<div class=\"homeitem\"><label class=\"homecheck\"><input type=\"checkbox\" data-home=\"'+id+'\" '+(on?'checked':'')+'>'+name+'</label><div><button type=\"button\" class=\"smallbtn\" data-move=\"-1\" data-id=\"'+id+'\">↑</button><button type=\"button\" class=\"smallbtn\" data-move=\"1\" data-id=\"'+id+'\">↓</button></div></div>';}).join('');g('homeRowsEditor').querySelectorAll('input[data-home]').forEach(el=>el.onchange=()=>{const id=el.dataset.home;if(el.checked&&!homeOrder.includes(id))homeOrder.push(id);if(!el.checked)homeOrder=homeOrder.filter(x=>x!==id);renderHome();});g('homeRowsEditor').querySelectorAll('button[data-move]').forEach(el=>el.onclick=()=>{const id=el.dataset.id,i=homeOrder.indexOf(id),j=i+Number(el.dataset.move);if(i>=0&&j>=0&&j<homeOrder.length){const t=homeOrder[i];homeOrder[i]=homeOrder[j];homeOrder[j]=t;}renderHome();});}",
    "renderHome();g('f').onsubmit=e=>{e.preventDefault();const c={"
  ].join('');
  source = source.replace(submitMarker, homeJs);

  const configObject = "const c={deviceProfile:g('deviceProfile').value,preferredCodec:g('preferredCodec').value,preferredAudio:g('preferredAudio').value,streamPreset:g('streamPreset').value,";
  if (!source.includes(configObject)) throw new Error('v4.3 patch target missing: config object');
  source = source.replace(configObject, "const c={deviceProfile:g('deviceProfile').value,preferredCodec:g('preferredCodec').value,preferredAudio:g('preferredAudio').value,providerPriority:g('providerPriority').value,homeRows:homeOrder.slice(),streamPreset:g('streamPreset').value,");

  // ----------------------------------------------------------
  // Status UI and richer status payload.
  // ----------------------------------------------------------
  const statusFnMarker = 'function statusPayload(cfg, configured) {';
  if (!source.includes(statusFnMarker)) throw new Error('v4.3 patch target missing: statusPayload');
  const statusUi = [
    "function v430StatusPage() {",
    "  return '<!doctype html><html lang=\"vi\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Web Phim Status</title><style>body{font-family:system-ui;background:#0f1115;color:#eee;max-width:900px;margin:30px auto;padding:0 18px}h1{margin-bottom:5px}.muted{color:#9aa4b2}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;margin-top:20px}.card{background:#181c23;border:1px solid #2b313b;border-radius:13px;padding:16px}.ok{color:#6ee7a8}.bad{color:#ff8080}.warn{color:#ffd479}.big{font-size:22px;font-weight:700}</style></head><body><h1>Web Phim v4.3 Status</h1><div class=\"muted\">Provider health, latency và cache runtime</div><div id=\"summary\"></div><div id=\"grid\" class=\"grid\"></div><script>async function load(){const path=location.pathname.endsWith(\"/status/ui\")?location.pathname.slice(0,-3):\"/status\";try{const r=await fetch(path,{cache:\"no-store\"}),d=await r.json();document.getElementById(\"summary\").innerHTML=\"<p>Version <b>\"+d.version+\"</b> · TMDB cache: \"+(d.cache?.entries||0)+\" · Identity cache: \"+(d.identityCache?.entries||0)+\"</p>\";document.getElementById(\"grid\").innerHTML=(d.providers||[]).map(p=>\"<div class=\\\"card\\\"><div class=\\\"big \\\"+ (p.ok?\"ok\":\"bad\") +\\\"\\\">\"+(p.ok?\"● OK\":\"● ERROR\")+\"</div><h3>\"+p.name+\"</h3><div>Latency: <b>\"+(p.latencyMs??\"-\")+\" ms</b></div><div>Circuit: <span class=\\\"\"+(p.circuit?.circuitOpen?\"warn\":\"ok\")+\"\\\">\"+(p.circuit?.circuitOpen?\"OPEN\":\"closed\")+\"</span></div></div>\").join(\"\");}catch(e){document.getElementById(\"summary\").innerHTML=\"<p class=\\\"bad\\\">Không tải được status: \"+e.message+\"</p>\";}}load();setInterval(load,30000);</script></body></html>';",
    "}",
    "",
    statusFnMarker
  ].join('\n');
  source = source.replace(statusFnMarker, statusUi);

  const statusRoute = "if (path === '/status') {";
  if (!source.includes(statusRoute)) throw new Error('v4.3 patch target missing: status route');
  source = source.replace(statusRoute, "if (path === '/status/ui') return sendHtml(res, v430StatusPage());\n  " + statusRoute);

  const healthCacheLine = "    cache: { type: 'memory', entries: v410TmdbCache.size, ttlMs: TMDB_CACHE_TTL_MS, ...v410CacheStats },";
  if (!source.includes(healthCacheLine)) throw new Error('v4.3 patch target missing: health cache payload');
  source = source.replace(healthCacheLine, healthCacheLine + "\n    identityCache: { type: 'memory', entries: v430IdentityCache.size, ttlMs: IDENTITY_CACHE_TTL_MS, ...v430IdentityStats },\n    streamLoading: { failSoft: true, budgetMs: STREAM_RESPONSE_BUDGET_MS, earlyResultCount: STREAM_EARLY_RESULT_COUNT },");

  const statusVersionMarker = "configureSupported: true, configureVersion: 2, scoringVersion: 2, providerSpecificTimeouts: true,";
  if (!source.includes(statusVersionMarker)) throw new Error('v4.3 patch target missing: v4.2 status marker');
  source = source.replace(statusVersionMarker, "configureSupported: true, configureVersion: 3, scoringVersion: 2, streamLabelVersion: 2, providerSpecificTimeouts: true, failSoftStreams: true, identityCache: true, metadataEnrichment: true, statusUI: true,");
  source = source.replace("configuredManifest: configured, deviceProfile:", "configuredManifest: configured, providerPriority: cfg.providerPriority, homeRows: cfg.homeRows, deviceProfile:");

  // Version/architecture.
  source = source.replaceAll('4.2.0', '4.3.0');
  source = source.replace("architecture: 'single-process-v4.2'", "architecture: 'single-process-v4.3'");
  return source;
};
