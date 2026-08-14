module.exports = function applyV520(source) {
  // Web Phim v5.2: expose canonical IMDb identity to clients/players.
  const getMetaMarker = 'async function getMeta(type, id) {';
  if (!source.includes(getMetaMarker)) throw new Error('v5.2 patch target missing: getMeta');

  const helpers = [
    "function v520ImdbFields(imdbId) {",
    "  if (!imdbId) return {};",
    "  return { imdbId, imdb_id: imdbId, imdbID: imdbId, externalIds: { imdb: imdbId, imdb_id: imdbId } };",
    "}",
    "function v520SeriesVideos(videos, imdbId) {",
    "  if (!imdbId) return videos;",
    "  return (videos || []).map(v => ({ ...v, id: `${imdbId}:${v.season}:${v.episode}`, ...v520ImdbFields(imdbId) }));",
    "}",
    "",
    getMetaMarker
  ].join('\n');
  source = source.replace(getMetaMarker, helpers);

  const movieTail = "      imdbRating: p.vote_average ? Number(p.vote_average).toFixed(1) : undefined, ...v430MetaExtras(p, 'movie'), behaviorHints: { defaultVideoId: id } };";
  if (!source.includes(movieTail)) throw new Error('v5.2 patch target missing: movie meta tail');
  source = source.replace(movieTail,
    "      imdbRating: p.vote_average ? Number(p.vote_average).toFixed(1) : undefined, ...v430MetaExtras(p, 'movie'), ...v520ImdbFields(p?.external_ids?.imdb_id), behaviorHints: { defaultVideoId: p?.external_ids?.imdb_id || id } };");

  const seriesTail = "    imdbRating: p.vote_average ? Number(p.vote_average).toFixed(1) : undefined, ...v430MetaExtras(p, 'series'), videos: await fetchTvVideos(tmdbId, p.seasons) };";
  if (!source.includes(seriesTail)) throw new Error('v5.2 patch target missing: series meta tail');
  source = source.replace(seriesTail,
    "    imdbRating: p.vote_average ? Number(p.vote_average).toFixed(1) : undefined, ...v430MetaExtras(p, 'series'), ...v520ImdbFields(p?.external_ids?.imdb_id), videos: v520SeriesVideos(await fetchTvVideos(tmdbId, p.seasons), p?.external_ids?.imdb_id) };");

  // Advertise compatibility without exposing any provider credentials.
  const featureMarker = 'persistentShareStorage: v500Persistent,';
  if (source.includes(featureMarker)) source = source.replace(featureMarker, featureMarker + ' imdbCompatibility: true,');

  source = source.replaceAll('5.1.0', '5.2.0');
  source = source.replaceAll('single-process-v5.1', 'single-process-v5.2');
  return source;
};
