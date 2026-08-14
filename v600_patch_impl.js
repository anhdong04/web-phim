module.exports = function applyV600(source) {
  const defaultsMarker = "const V540_INLINE_STREAM_SUBTITLES = String(process.env.INLINE_STREAM_SUBTITLES || 'true').toLowerCase() !== 'false';";
  if (!source.includes(defaultsMarker)) throw new Error('v6 patch target missing: v5.4 defaults marker');
  source = source.replace(defaultsMarker, [
    "const V600_AI_TRANSLATION_ENABLED = String(process.env.AI_TRANSLATION_ENABLED || 'true').toLowerCase() !== 'false';",
    "const V600_GOOGLE_TRANSLATE_API_KEY = String(process.env.GOOGLE_TRANSLATE_API_KEY || process.env.TRANSLATION_API_KEY || '');",
    "const V600_AI_SIGNING_SECRET = String(process.env.AI_SUB_SIGNING_SECRET || ADMIN_TOKEN || '');",
    "const V600_AI_SUB_CACHE_TTL_SEC = Math.max(3600, Math.min(2592000, Number(process.env.AI_SUB_CACHE_TTL_SEC || 604800)));",
    "const V600_AI_SUB_MAX_BYTES = Math.max(65536, Math.min(4194304, Number(process.env.AI_SUB_MAX_BYTES || 1572864)));",
    "const V600_AI_SUB_MAX_CUES = Math.max(100, Math.min(4000, Number(process.env.AI_SUB_MAX_CUES || 1800)));",
    "const V600_PERSONAL_HOME = String(process.env.PERSONAL_HOME || 'true').toLowerCase() !== 'false';",
    "const V600_PERSONAL_RECENT_MAX = Math.max(5, Math.min(100, Number(process.env.PERSONAL_RECENT_MAX || 30)));",
    "const v600AiMemoryCache = new Map();",
    "const v600MemoryProfiles = new Map();",
    defaultsMarker
  ].join('\n'));

  const serverMarker = 'const server = http.createServer(async (req, res) => {';
  if (!source.includes(serverMarker)) throw new Error('v6 patch target missing: server marker');
  const helpers = [
    "function v600AiReady() { return V600_AI_TRANSLATION_ENABLED && Boolean(V600_GOOGLE_TRANSLATE_API_KEY && V600_AI_SIGNING_SECRET); }",
    "function v600AiCacheKey(sourceUrl) { return crypto.createHash('sha256').update(String(sourceUrl)).digest('hex'); }",
    "function v600AiToken(sourceUrl) {",
    "  const payload = Buffer.from(JSON.stringify({ v: 1, u: String(sourceUrl) }), 'utf8').toString('base64url');",
    "  const sig = crypto.createHmac('sha256', V600_AI_SIGNING_SECRET).update(payload).digest('base64url').slice(0, 32);",
    "  return payload + '.' + sig;",
    "}",
    "function v600AiDecodeToken(token) {",
    "  if (!v600AiReady()) return null; const parts = String(token || '').split('.'); if (parts.length !== 2) return null;",
    "  const expected = crypto.createHmac('sha256', V600_AI_SIGNING_SECRET).update(parts[0]).digest('base64url').slice(0, 32);",
    "  const a = Buffer.from(parts[1]), b = Buffer.from(expected); if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;",
    "  try { const p = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')); if (p?.v !== 1 || !/^https:\/\//i.test(String(p?.u || ''))) return null; return p; } catch { return null; }",
    "}",
    "function v600AiSubtitleUrl(origin, base, sourceUrl) { if (!v600AiReady() || !sourceUrl) return null; return origin + (base || '') + '/ai-sub/' + v600AiToken(sourceUrl) + '.vtt'; }",
    "async function v600AiCacheGet(key) {",
    "  const mem = v600AiMemoryCache.get(key); if (mem && mem.expiresAt > Date.now()) return mem.value; if (mem) v600AiMemoryCache.delete(key);",
    "  if (!v500Persistent) return null; try { return await v500Redis(['GET', v500Key('ai-sub', key)]) || null; } catch { return null; }",
    "}",
    "async function v600AiCacheSet(key, value) {",
    "  v600AiMemoryCache.set(key, { value, expiresAt: Date.now() + V600_AI_SUB_CACHE_TTL_SEC * 1000 });",
    "  if (v500Persistent) v500Redis(['SET', v500Key('ai-sub', key), value, 'EX', String(V600_AI_SUB_CACHE_TTL_SEC)]).catch(() => {});",
    "}",
    "async function v600FetchSubtitleText(url) {",
    "  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 12000);",
    "  try {",
    "    const r = await fetch(url, { headers: { accept: 'text/vtt,text/plain,application/x-subrip,*/*', 'user-agent': 'web-phim-v6-subtitle' }, signal: controller.signal });",
    "    if (!r.ok) throw new Error('Subtitle HTTP ' + r.status); const len = Number(r.headers.get('content-length') || 0); if (len > V600_AI_SUB_MAX_BYTES) throw new Error('Subtitle too large');",
    "    const text = await r.text(); if (Buffer.byteLength(text) > V600_AI_SUB_MAX_BYTES) throw new Error('Subtitle too large'); return text;",
    "  } finally { clearTimeout(timer); }",
    "}",
    "function v600ParseCues(raw) {",
    "  const text = String(raw || '').replace(/^\\uFEFF/, '').replace(/\\r\\n?/g, '\\n').replace(/^WEBVTT[^\\n]*\\n+/i, '');",
    "  const blocks = text.split(/\\n{2,}/), cues = [];",
    "  for (const block of blocks) {",
    "    const lines = block.split('\\n').map(x => x.trimEnd()); const ti = lines.findIndex(x => x.includes('-->')); if (ti < 0) continue;",
    "    const timing = lines[ti].replace(/(\\d{2}:\\d{2}:\\d{2}),(\\d{3})/g, '$1.$2').replace(/(\\d{2}:\\d{2}),(\\d{3})/g, '$1.$2');",
    "    const body = lines.slice(ti + 1).join('\\n').trim(); if (!body) continue; cues.push({ timing, text: body }); if (cues.length >= V600_AI_SUB_MAX_CUES) break;",
    "  }",
    "  return cues;",
    "}",
    "function v600DecodeHtml(s) { return String(s || '').replace(/&#(\\d+);/g, (_,n)=>String.fromCodePoint(Number(n))).replace(/&quot;/g,String.fromCharCode(34)).replace(/&#39;|&apos;/g,String.fromCharCode(39)).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&'); }",
    "async function v600TranslateTexts(texts) {",
    "  const out = [];",
    "  for (let i = 0; i < texts.length; i += 100) {",
    "    const q = texts.slice(i, i + 100); const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 20000);",
    "    try {",
    "      const r = await fetch('https://translation.googleapis.com/language/translate/v2?key=' + encodeURIComponent(V600_GOOGLE_TRANSLATE_API_KEY), { method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' }, body: JSON.stringify({ q, source: 'en', target: 'vi', format: 'text' }), signal: controller.signal });",
    "      if (!r.ok) throw new Error('Translate HTTP ' + r.status); const data = await r.json(); const translations = data?.data?.translations || []; if (translations.length !== q.length) throw new Error('Translate response mismatch');",
    "      out.push(...translations.map(x => v600DecodeHtml(x?.translatedText || '')));",
    "    } finally { clearTimeout(timer); }",
    "  }",
    "  return out;",
    "}",
    "async function v600TranslateSubtitle(sourceUrl) {",
    "  const key = v600AiCacheKey(sourceUrl), cached = await v600AiCacheGet(key); if (cached) return cached;",
    "  const raw = await v600FetchSubtitleText(sourceUrl), cues = v600ParseCues(raw); if (!cues.length) throw new Error('Cannot parse subtitle');",
    "  const translated = await v600TranslateTexts(cues.map(c => c.text));",
    "  const vtt = 'WEBVTT\\n\\n' + cues.map((c,i) => c.timing + '\\n' + (translated[i] || c.text)).join('\\n\\n') + '\\n'; await v600AiCacheSet(key, vtt); return vtt;",
    "}",
    "function v600SendVtt(res, text) { const body = String(text || ''); res.writeHead(200, { 'content-type': 'text/vtt; charset=utf-8', 'content-length': Buffer.byteLength(body), 'access-control-allow-origin': '*', 'cache-control': 'public, max-age=86400' }); res.end(body); }",
    "async function v600HandleAiSubtitle(res, token) {",
    "  const payload = v600AiDecodeToken(token); if (!payload) return sendJson(res, 404, { error: 'AI subtitle unavailable' }, 0);",
    "  try { return v600SendVtt(res, await v600TranslateSubtitle(payload.u)); } catch (e) { console.error('AI subtitle:', e.message); return sendJson(res, 502, { error: 'AI subtitle generation failed' }, 0); }",
    "}",
    "",
    "async function v600GetProfile(shareId) {",
    "  if (!shareId) return null; if (!v500Persistent) return v600MemoryProfiles.get(shareId) || null; try { return v500SafeJson(await v500Redis(['GET', v500Key('profile', shareId)])); } catch { return null; }",
    "}",
    "async function v600SetProfile(shareId, profile) {",
    "  if (!shareId) return; if (!v500Persistent) { v600MemoryProfiles.set(shareId, profile); return; } await v500Redis(['SET', v500Key('profile', shareId), JSON.stringify(profile)]);",
    "}",
    "function v600GenreScores(profile, type) { if (!profile.genreScores) profile.genreScores = {}; if (!profile.genreScores[type]) profile.genreScores[type] = {}; return profile.genreScores[type]; }",
    "async function v600RecordPlay(shareId, type, id) {",
    "  if (!V600_PERSONAL_HOME || !shareId) return; const parsed = parseId(id); if (!parsed) return; const identity = await v430GetIdentityCached(type, parsed).catch(() => null); if (!identity?.tmdbId) return;",
    "  const now = Date.now(), profile = (await v600GetProfile(shareId)) || { version: 1, recent: [], genreScores: { movie: {}, series: {} } }; const recent = Array.isArray(profile.recent) ? profile.recent : [];",
    "  const duplicate = recent.find(x => x.type === type && String(x.tmdbId) === String(identity.tmdbId) && now - Number(x.ts || 0) < 1800000); if (duplicate) { duplicate.ts = now; profile.recent = recent.sort((a,b)=>b.ts-a.ts).slice(0,V600_PERSONAL_RECENT_MAX); profile.updatedAt = new Date().toISOString(); return v600SetProfile(shareId, profile); }",
    "  let detail = null; try { detail = await fetchJson(tmdbUrl((type === 'movie' ? '/movie/' : '/tv/') + identity.tmdbId), 'TMDB personalization'); } catch {}",
    "  const scores = v600GenreScores(profile, type); for (const k of Object.keys(scores)) scores[k] = Number(scores[k] || 0) * 0.985; for (const g of (detail?.genres || [])) scores[String(g.id)] = Number(scores[String(g.id)] || 0) + 3;",
    "  const item = { type, tmdbId: String(identity.tmdbId), imdbId: parsed.imdbId || null, title: identity.title || identity.originalTitle || '', ts: now }; profile.recent = [item, ...recent.filter(x => !(x.type === type && String(x.tmdbId) === String(identity.tmdbId)))].slice(0,V600_PERSONAL_RECENT_MAX); profile.updatedAt = new Date().toISOString(); await v600SetProfile(shareId, profile);",
    "}",
    "function v600TopGenre(profile, type) { const scores = profile?.genreScores?.[type] || {}; return Object.entries(scores).sort((a,b)=>Number(b[1])-Number(a[1]))[0]?.[0] || null; }",
    "function v600RecentOfType(profile, type) { return (profile?.recent || []).filter(x => x.type === type).sort((a,b)=>Number(b.ts||0)-Number(a.ts||0))[0] || null; }",
    "async function v600PersonalCatalog(type, id, extra, shareId) {",
    "  const profile = await v600GetProfile(shareId), page = pageFromSkip(extra?.skip), watched = new Set((profile?.recent || []).filter(x=>x.type===type).map(x=>String(x.tmdbId))); let results = [];",
    "  if (id === 'personal-because') { const recent = v600RecentOfType(profile, type); if (recent?.tmdbId) { try { const p = await fetchJson(tmdbUrl((type === 'movie' ? '/movie/' : '/tv/') + recent.tmdbId + '/recommendations', { page }), 'TMDB personal recommendations'); results = p.results || []; } catch {} } }",
    "  if (!results.length) {",
    "    const genre = v600TopGenre(profile, type); try {",
    "      if (genre) { const p = await fetchJson(tmdbUrl(type === 'movie' ? '/discover/movie' : '/discover/tv', { with_genres: genre, sort_by: 'popularity.desc', include_adult: type === 'movie' ? 'false' : undefined, page, region: type === 'movie' ? TMDB_REGION : undefined }), 'TMDB personal discover'); results = p.results || []; }",
    "      else { const p = await fetchJson(tmdbUrl(type === 'movie' ? '/trending/movie/week' : '/trending/tv/week', { page }), 'TMDB personal fallback'); results = p.results || []; }",
    "    } catch {}",
    "  }",
    "  const previews = results.filter(x => !watched.has(String(x.id))).slice(0,20).map(x => toPreview(x, type)); return v530CanonicalizePreviews(previews, type);",
    "}",
    "",
    serverMarker
  ].join('\n');
  source = source.replace(serverMarker, helpers);

  const catalogLine = "  const catalogs = v430SanitizeHomeRows(cfg.homeRows).map(id => byId.get(id)).filter(Boolean).map(x => ({ type: x.type, id: x.id, name: x.name, extra: homeExtra }));";
  if (!source.includes(catalogLine)) throw new Error('v6 patch target missing: manifest catalog line');
  source = source.replace(catalogLine, catalogLine +
    "\n  if (V600_PERSONAL_HOME) catalogs.unshift({ type: 'series', id: 'personal-because', name: '🔁 Series tương tự bạn đã xem', extra: homeExtra });" +
    "\n  if (V600_PERSONAL_HOME) catalogs.unshift({ type: 'movie', id: 'personal-because', name: '🎬 Vì bạn đã xem gần đây', extra: homeExtra });" +
    "\n  if (V600_PERSONAL_HOME) catalogs.unshift({ type: 'series', id: 'personal-for-you', name: '📺 Series dành cho bạn', extra: homeExtra });" +
    "\n  if (V600_PERSONAL_HOME) catalogs.unshift({ type: 'movie', id: 'personal-for-you', name: '❤️ Dành cho bạn', extra: homeExtra });");

  const getCatalogMarker = 'async function getCatalog(type, id, extra = {}) {';
  if (!source.includes(getCatalogMarker)) throw new Error('v6 patch target missing: getCatalog marker');
  source = source.replace(getCatalogMarker, "async function getCatalog(type, id, extra = {}, shareId = null) {\n  if (V600_PERSONAL_HOME && (id === 'personal-for-you' || id === 'personal-because')) return v600PersonalCatalog(type, id, extra, shareId);");
  const catalogCall = 'await getCatalog(m[1], m[2], parseExtra(m[3]))';
  if (!source.includes(catalogCall)) throw new Error('v6 patch target missing: catalog call');
  source = source.replace(catalogCall, 'await getCatalog(m[1], m[2], parseExtra(m[3]), v500Resolved.share?.id || null)');

  const attachMarker = 'function v540AttachStreamSubtitles(streams, pool, identity, type, cfg) {';
  if (!source.includes(attachMarker)) throw new Error('v6 patch target missing: v5.4 attach function');
  source = source.replace(attachMarker, [
    "function v600AttachAiVietnamese(streams, pool, identity, type, cfg, origin, base) {",
    "  const attached = v540AttachStreamSubtitles(streams, pool, identity, type, cfg); if (!v600AiReady() || !Array.isArray(attached) || !pool.length) return attached;",
    "  return attached.map(stream => {",
    "    if (isKK(stream)) return stream; const current = Array.isArray(stream.subtitles) ? stream.subtitles : []; if (current.some(s => /^(vi|vie)$/i.test(String(s.lang || '')))) return stream;",
    "    const ranked = filterRankSubtitles(pool, identity, type, v540StreamFilename(stream), cfg); const en = ranked.find(s => /^(en|eng)$/i.test(String(s.lang || '')) && s.url); if (!en) return stream;",
    "    const url = v600AiSubtitleUrl(origin, base, en.url); if (!url) return stream; const ai = { id: 'webphim-ai-vie', lang: 'vie', url, label: '🇻🇳 Tiếng Việt AI', title: '🇻🇳 Tiếng Việt AI' }; return { ...stream, subtitles: v540MergeSubtitles(current, [ai]) };",
    "  });",
    "}",
    "",
    attachMarker
  ].join('\n'));

  const getStreamsDecl = 'async function getStreams(type, id, cfg) {';
  if (!source.includes(getStreamsDecl)) throw new Error('v6 patch target missing: getStreams declaration');
  source = source.replace(getStreamsDecl, "async function getStreams(type, id, cfg, origin = '', base = '', shareId = null) {\n  if (shareId) v600RecordPlay(shareId, type, id).catch(e => console.error('personal profile:', e.message));");
  const attachReturn = 'return v540AttachStreamSubtitles(streams, pool, identity, type, cfg);';
  if (!source.includes(attachReturn)) throw new Error('v6 patch target missing: v5.4 attach return');
  source = source.replace(attachReturn, 'return v600AttachAiVietnamese(streams, pool, identity, type, cfg, origin, base);');
  const streamCall = 'await getStreams(m[1], decodeURIComponent(m[2]), cfg)';
  if (!source.includes(streamCall)) throw new Error('v6 patch target missing: stream call');
  source = source.replace(streamCall, 'await getStreams(m[1], decodeURIComponent(m[2]), cfg, origin, parsedBase.base, v500Resolved.share?.id || null)');

  const firstRouteMarker = "let m = path.match(/^\\/catalog\\/(movie|series)\\/([^/.]+)(?:\\/([^/]+))?\\.json$/);";
  if (!source.includes(firstRouteMarker)) throw new Error('v6 patch target missing: catalog route marker');
  source = source.replace(firstRouteMarker, "let aiMatch = path.match(/^\\/ai-sub\\/([A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+)\\.vtt$/);\n  if (aiMatch) return v600HandleAiSubtitle(res, aiMatch[1]);\n  " + firstRouteMarker);

  const featureMarker = 'inlineStreamSubtitles: V540_INLINE_STREAM_SUBTITLES,';
  if (source.includes(featureMarker)) source = source.replace(featureMarker, featureMarker + ' aiVietnameseSubtitles: v600AiReady(), personalHome: V600_PERSONAL_HOME,');

  source = source.replaceAll('5.4.0', '6.0.0');
  source = source.replaceAll('single-process-v5.4', 'single-process-v6');
  return source;
};
