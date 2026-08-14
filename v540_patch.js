module.exports = function applyV540(source) {
  // Web Phim v5.4: attach ranked VI/EN subtitles directly to non-KKPhim Stream Objects.
  // KKPhim is intentionally untouched because its playback source already carries subtitles.

  const defaultsMarker = "const V530_CANONICAL_IMDB_IDS = String(process.env.CANONICAL_IMDB_IDS || 'true').toLowerCase() !== 'false';";
  if (!source.includes(defaultsMarker)) throw new Error('v5.4 patch target missing: v5.3 defaults marker');
  source = source.replace(defaultsMarker, [
    "const V540_INLINE_STREAM_SUBTITLES = String(process.env.INLINE_STREAM_SUBTITLES || 'true').toLowerCase() !== 'false';",
    "const V540_INLINE_SUBTITLE_BUDGET_MS = Math.max(500, Math.min(10000, Number(process.env.INLINE_SUBTITLE_BUDGET_MS || 4200)));",
    "const V540_INLINE_SUBTITLES_MAX = Math.max(1, Math.min(12, Number(process.env.INLINE_SUBTITLES_MAX_PER_STREAM || 6)));",
    defaultsMarker
  ].join('\n'));

  const getStreamsStart = source.indexOf('async function getStreams(type, id, cfg) {');
  const getStreamsEnd = source.indexOf('\n\nasync function getSubtitleSource', getStreamsStart);
  if (getStreamsStart < 0 || getStreamsEnd < 0) throw new Error('v5.4 patch target missing: getStreams boundaries');

  const streamBlock = [
    "function v540StreamFilename(stream) {",
    "  return String(stream?.behaviorHints?.filename || stream?.filename || stream?.title || stream?.description || stream?.name || '');",
    "}",
    "function v540SubtitlePublicObject(sub, index) {",
    "  if (!sub?.url) return null;",
    "  return { id: String(sub.id || ('webphim-inline-' + index)), lang: String(sub.lang || 'und'), url: sub.url };",
    "}",
    "function v540MergeSubtitles(existing, added) {",
    "  const out = [], seen = new Set();",
    "  for (const sub of [...(Array.isArray(existing) ? existing : []), ...(Array.isArray(added) ? added : [])]) {",
    "    if (!sub?.url) continue; const key = String(sub.url) + '|' + String(sub.lang || ''); if (seen.has(key)) continue; seen.add(key); out.push(sub);",
    "  }",
    "  return out;",
    "}",
    "async function v540SubtitlePool(type, subtitleId) {",
    "  const sources = configuredSubtitleSources(); if (!sources.length || !subtitleId) return [];",
    "  const work = Promise.allSettled(sources.map(s => getSubtitleSource(s, type, subtitleId, ''))).then(results => results.flatMap(r => r.status === 'fulfilled' && Array.isArray(r.value) ? r.value : []));",
    "  let timer; const timeout = new Promise(resolve => { timer = setTimeout(() => resolve([]), V540_INLINE_SUBTITLE_BUDGET_MS); });",
    "  try { return await Promise.race([work, timeout]); } finally { if (timer) clearTimeout(timer); }",
    "}",
    "function v540RankForStream(pool, identity, type, stream, cfg) {",
    "  if (!Array.isArray(pool) || !pool.length) return [];",
    "  const ranked = filterRankSubtitles(pool, identity, type, v540StreamFilename(stream), cfg).slice(0, V540_INLINE_SUBTITLES_MAX);",
    "  return ranked.map(v540SubtitlePublicObject).filter(Boolean);",
    "}",
    "function v540AttachStreamSubtitles(streams, pool, identity, type, cfg) {",
    "  if (!V540_INLINE_STREAM_SUBTITLES || !Array.isArray(streams) || !pool.length) return streams;",
    "  return streams.map(stream => {",
    "    if (isKK(stream)) return stream;",
    "    const ranked = v540RankForStream(pool, identity, type, stream, cfg); if (!ranked.length) return stream;",
    "    return { ...stream, subtitles: v540MergeSubtitles(stream.subtitles, ranked) };",
    "  });",
    "}",
    "async function getStreams(type, id, cfg) {",
    "  const parsed = parseId(id); if (!parsed) return [];",
    "  const [imdb, identity] = await Promise.all([v430ResolveImdbCached(type, parsed).catch(() => null), v430GetIdentityCached(type, parsed).catch(() => null)]);",
    "  const upstreamId = imdb ? `${imdb}${type === 'series' && parsed.season ? `:${parsed.season}:${parsed.episode || 1}` : ''}` : id;",
    "  const inlineSubtitleTask = V540_INLINE_STREAM_SUBTITLES ? v540SubtitlePool(type, upstreamId) : Promise.resolve([]);",
    "  const tasks = [getKKPhim(type, parsed), ...configuredUpstreams().map(s => getUpstream(s, type, upstreamId))];",
    "  const parts = await v430CollectFailSoft(tasks, STREAM_RESPONSE_BUDGET_MS, STREAM_EARLY_RESULT_COUNT);",
    "  const streams = curateStreams(parts.flat(), identity, type, cfg);",
    "  if (!streams.some(s => !isKK(s))) return streams;",
    "  const pool = await inlineSubtitleTask.catch(() => []);",
    "  return v540AttachStreamSubtitles(streams, pool, identity, type, cfg);",
    "}"
  ].join('\n');

  source = source.slice(0, getStreamsStart) + streamBlock + source.slice(getStreamsEnd);

  const featureMarker = 'canonicalImdbCatalogIds: V530_CANONICAL_IMDB_IDS,';
  if (source.includes(featureMarker)) source = source.replace(featureMarker, featureMarker + ' inlineStreamSubtitles: V540_INLINE_STREAM_SUBTITLES,');

  source = source.replaceAll('5.3.0', '5.4.0');
  source = source.replaceAll('single-process-v5.3', 'single-process-v5.4');
  return source;
};
