module.exports = function applyV530(source) {
  // Web Phim v5.3: make IMDb IDs the primary catalog/meta/video identity.
  // This improves compatibility with players that only inspect the catalog item ID.

  const defaultsMarker = "const V430_DEFAULT_HOME_ROWS = ['home-hot','home-top10','home-new-movies','home-new-series','home-animation','home-korean','home-horror','home-action'];";
  if (!source.includes(defaultsMarker)) throw new Error('v5.3 patch target missing: v4.3 defaults marker');
  source = source.replace(defaultsMarker, [
    "const V530_CANONICAL_IMDB_IDS = String(process.env.CANONICAL_IMDB_IDS || 'true').toLowerCase() !== 'false';",
    "const V530_IMDB_CONCURRENCY = Math.max(1, Math.min(12, Number(process.env.IMDB_CATALOG_CONCURRENCY || 6)));",
    defaultsMarker
  ].join('\n'));

  // Allow our own meta handler to serve the canonical tt... IDs returned by catalogs.
  const metaResource = "{ name: 'meta', types: ['movie', 'series'], idPrefixes: ['tmdb:'] },";
  if (!source.includes(metaResource)) throw new Error('v5.3 patch target missing: meta resource prefix');
  source = source.replace(metaResource, "{ name: 'meta', types: ['movie', 'series'], idPrefixes: ['tmdb:', 'tt'] },");

  // Canonicalize every Home/Search preview to IMDb where TMDB has an external IMDb ID.
  const catalogRe = /async function getCatalog\(type, id, extra = \{\}\) \{[\s\S]*?\n\}\n\nfunction genres/;
  if (!catalogRe.test(source)) throw new Error('v5.3 patch target missing: getCatalog');
  const catalogBlock = [
    "async function v530MapLimit(items, limit, worker) {",
    "  const out = new Array(items.length); let next = 0;",
    "  async function run() { while (true) { const i = next++; if (i >= items.length) return; try { out[i] = await worker(items[i], i); } catch { out[i] = items[i]; } } }",
    "  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run())); return out;",
    "}",
    "async function v530CanonicalizePreviews(items, type) {",
    "  if (!V530_CANONICAL_IMDB_IDS || !items.length) return items;",
    "  return v530MapLimit(items, V530_IMDB_CONCURRENCY, async item => {",
    "    const parsed = parseId(item?.id); if (!parsed?.tmdbId) return item;",
    "    const imdbId = await v430ResolveImdbCached(type, parsed).catch(() => null);",
    "    if (!/^tt\\d+$/i.test(String(imdbId || ''))) return item;",
    "    return { ...item, id: imdbId, imdbId, imdb_id: imdbId, imdbID: imdbId, externalIds: { imdb: imdbId, imdb_id: imdbId }, behaviorHints: { ...(item.behaviorHints || {}), imdbId } };",
    "  });",
    "}",
    "async function getCatalog(type, id, extra = {}) {",
    "  if (id === 'search-movies' || id === 'search-series') {",
    "    const expectedType = id === 'search-movies' ? 'movie' : 'series';",
    "    if (type !== expectedType || !extra.search) return [];",
    "    const path = type === 'movie' ? '/search/movie' : '/search/tv';",
    "    const p = await fetchJson(tmdbUrl(path, { query: extra.search, page: pageFromSkip(extra.skip), include_adult: 'false', region: type === 'movie' ? TMDB_REGION : undefined }), `TMDB search ${type}`);",
    "    return v530CanonicalizePreviews((p.results || []).map(x => toPreview(x, type)), type);",
    "  }",
    "  const spec = catalogSpecs[id]; if (!spec || spec.type !== type) return [];",
    "  const params = { ...(spec.params || {}), page: pageFromSkip(extra.skip) }; if (spec.region) params.region = TMDB_REGION;",
    "  const p = await fetchJson(tmdbUrl(spec.path, params), `TMDB ${id}`);",
    "  let results = (p.results || []).map(x => toPreview(x, type));",
    "  if (spec.limit) { if ((Number(extra.skip) || 0) > 0) return []; results = results.slice(0, spec.limit); }",
    "  return v530CanonicalizePreviews(results, type);",
    "}",
    "",
    "function genres"
  ].join('\n');
  source = source.replace(catalogRe, catalogBlock);

  // Accept /meta/.../tt123.json by resolving IMDb -> TMDB first.
  const getMetaStart = "async function getMeta(type, id) {\n  const m = String(id).match(/^tmdb:(\\d+)$/); if (!m) return null; const tmdbId = m[1];";
  if (!source.includes(getMetaStart)) throw new Error('v5.3 patch target missing: getMeta start');
  source = source.replace(getMetaStart, [
    "async function v530ResolveMetaTmdb(type, id) {",
    "  let m = String(id).match(/^tmdb:(\\d+)$/); if (m) return { tmdbId: m[1], imdbId: null };",
    "  m = String(id).match(/^(tt\\d+)$/i); if (!m) return null;",
    "  const imdbId = m[1];",
    "  const found = await fetchJson(tmdbUrl('/find/' + imdbId, { external_source: 'imdb_id' }), 'TMDB find meta');",
    "  const hit = type === 'movie' ? found.movie_results?.[0] : found.tv_results?.[0];",
    "  return hit?.id ? { tmdbId: String(hit.id), imdbId } : null;",
    "}",
    "async function getMeta(type, id) {",
    "  const resolved = await v530ResolveMetaTmdb(type, id); if (!resolved) return null; const tmdbId = resolved.tmdbId;"
  ].join('\n'));

  // Ensure the returned primary meta ID is canonical when IMDb is available,
  // while keeping aliases and default video IDs introduced in v5.2.
  const movieReturn = "    return { id, type, name: p.title || p.original_title,";
  if (!source.includes(movieReturn)) throw new Error('v5.3 patch target missing: movie return');
  source = source.replace(movieReturn, "    const canonicalId = p?.external_ids?.imdb_id || resolved.imdbId || id;\n    return { id: canonicalId, type, name: p.title || p.original_title,");

  const seriesReturn = "  return { id, type, name: p.name || p.original_name,";
  if (!source.includes(seriesReturn)) throw new Error('v5.3 patch target missing: series return');
  source = source.replace(seriesReturn, "  const canonicalId = p?.external_ids?.imdb_id || resolved.imdbId || id;\n  return { id: canonicalId, type, name: p.name || p.original_name,");

  const featureMarker = 'imdbCompatibility: true,';
  if (source.includes(featureMarker)) source = source.replace(featureMarker, featureMarker + ' canonicalImdbCatalogIds: V530_CANONICAL_IMDB_IDS,');

  source = source.replaceAll('5.2.0', '5.3.0');
  source = source.replaceAll('single-process-v5.2', 'single-process-v5.3');
  return source;
};
