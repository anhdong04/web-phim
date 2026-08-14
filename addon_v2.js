const http = require('node:http');

const PORT = Number(process.env.PORT || 7000);
const KKPHIM_API = process.env.KKPHIM_API || 'https://phimapi.com';
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 10000);
const MANIFEST_CACHE_MS = Number(process.env.MANIFEST_CACHE_MS || 15 * 60 * 1000);
const MAX_STREAMS_PER_RESOLUTION = Number(process.env.MAX_STREAMS_PER_RESOLUTION || 6);
const MAX_STREAMS_TOTAL = Number(process.env.MAX_STREAMS_TOTAL || 30);
const MAX_SIZE_GB = Number(process.env.MAX_SIZE_GB || 0);
const CATALOG_PAGE_SIZE = 24;

const manifest = {
  id: 'vn.kkphim.nuvio.streams',
  version: '2.0.0',
  name: 'KKPhim Việt + Streams',
  description: 'Vietnamese KKPhim catalogs/metadata plus optional Stremio-compatible stream addons for Nuvio',
  resources: [
    'catalog',
    { name: 'meta', types: ['movie', 'series'], idPrefixes: ['kk:', 'tt', 'tmdb'] },
    { name: 'stream', types: ['movie', 'series'], idPrefixes: ['kk:', 'tt', 'tmdb'] }
  ],
  types: ['movie', 'series'],
  catalogs: [
    { type: 'movie', id: 'kkphim-phim-le', name: '🇻🇳 KKPhim • Phim lẻ', extra: [{ name: 'skip', isRequired: false }] },
    { type: 'series', id: 'kkphim-phim-bo', name: '🇻🇳 KKPhim • Phim bộ', extra: [{ name: 'skip', isRequired: false }] },
    { type: 'series', id: 'kkphim-hoat-hinh', name: '🇻🇳 KKPhim • Hoạt hình', extra: [{ name: 'skip', isRequired: false }] },
    { type: 'movie', id: 'kkphim-chieu-rap', name: '🇻🇳 KKPhim • Chiếu rạp', extra: [{ name: 'skip', isRequired: false }] }
  ]
};

const catalogMap = {
  'kkphim-phim-le': { type: 'movie', endpoint: 'phim-le' },
  'kkphim-phim-bo': { type: 'series', endpoint: 'phim-bo' },
  'kkphim-hoat-hinh': { type: 'series', endpoint: 'hoat-hinh' },
  'kkphim-chieu-rap': { type: 'movie', endpoint: 'phim-chieu-rap' }
};

const manifestCache = new Map();

function toPositiveInt(value) {
  const n = Number.parseInt(value, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function normalizeText(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function resolveImage(value, pathImage = '') {
  if (!value) return undefined;
  const raw = String(value).trim();
  if (/^https?:\/\//i.test(raw)) return raw;
  if (pathImage) return `${String(pathImage).replace(/\/$/, '')}/${raw.replace(/^\//, '')}`;
  return `${KKPHIM_API.replace(/\/$/, '')}/uploads/movies/${raw.replace(/^\//, '')}`;
}

function parseKkId(id) {
  const match = String(id || '').match(/^kk:([^:]+)(?::(\d+))?$/i);
  if (!match) return null;
  return { slug: decodeURIComponent(match[1]), episode: toPositiveInt(match[2]) };
}

function parseVideoId(id) {
  const kk = parseKkId(id);
  if (kk) return { provider: 'kkphim', ...kk };
  const parts = String(id || '').split(':');
  if (/^tt\d+$/i.test(parts[0])) {
    return { provider: 'imdb', externalId: parts[0], season: toPositiveInt(parts[1]), episode: toPositiveInt(parts[2]) };
  }
  if (parts[0]?.toLowerCase() === 'tmdb' && /^\d+$/.test(parts[1] || '')) {
    return { provider: 'tmdb', externalId: parts[1], season: toPositiveInt(parts[2]), episode: toPositiveInt(parts[3]) };
  }
  const compact = String(id || '').match(/^tmdb(\d+)(?::(\d+))?(?::(\d+))?$/i);
  if (compact) {
    return { provider: 'tmdb', externalId: compact[1], season: toPositiveInt(compact[2]), episode: toPositiveInt(compact[3]) };
  }
  return null;
}

async function fetchJson(url, sourceName = 'upstream') {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { accept: 'application/json', 'user-agent': 'kkphim-nuvio-aggregator/2.0' },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`${sourceName} returned HTTP ${response.status}`);
    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

function fetchKKPhimTitle(type, parsed) {
  if (parsed.provider === 'kkphim') return fetchJson(`${KKPHIM_API}/phim/${encodeURIComponent(parsed.slug)}`, 'KKPhim API');
  if (parsed.provider === 'imdb') return fetchJson(`${KKPHIM_API}/imdb/title/${encodeURIComponent(parsed.externalId)}`, 'KKPhim API');
  const tmdbType = type === 'series' ? 'tv' : 'movie';
  return fetchJson(`${KKPHIM_API}/tmdb/${tmdbType}/${encodeURIComponent(parsed.externalId)}`, 'KKPhim API');
}

function normalizeImdbId(movie) {
  const candidates = [movie?.imdb?.id, movie?.imdb, movie?.imdb_id, movie?.imdbId];
  for (const value of candidates) {
    const match = String(value || '').match(/tt\d+/i);
    if (match) return match[0].toLowerCase();
  }
  return null;
}

function normalizeTmdb(movie) {
  const raw = movie?.tmdb;
  if (raw && typeof raw === 'object') {
    return { id: raw.id ? String(raw.id) : null, type: raw.type || null, season: toPositiveInt(raw.season) };
  }
  const text = String(raw || movie?.tmdb_id || '');
  const seasonMatch = text.match(/(?:tv|movie)-(\d+)(?:-s(\d+))?/i);
  if (seasonMatch) {
    return { id: seasonMatch[1], type: /^tv-/i.test(text) ? 'tv' : 'movie', season: toPositiveInt(seasonMatch[2]) };
  }
  if (/^\d+$/.test(text)) return { id: text, type: null, season: null };
  return { id: null, type: null, season: null };
}

function inferSeason(movie) {
  const tmdb = normalizeTmdb(movie);
  if (tmdb.season) return tmdb.season;
  for (const value of [movie?.name, movie?.origin_name, movie?.slug]) {
    const match = normalizeText(value).match(/(?:phan|season|s)\s*[-_. ]*(\d+)\b/i);
    if (match) return Number(match[1]);
  }
  return 1;
}

function inferEpisodeNumber(item) {
  for (const value of [item?.name, item?.slug, item?.filename].filter(Boolean)) {
    const text = normalizeText(value);
    const exact = text.match(/^0*(\d+)$/);
    if (exact) return Number(exact[1]);
    const labelled = text.match(/(?:tap|episode|ep|e)\s*[-_. ]*0*(\d+)\b/i);
    if (labelled) return Number(labelled[1]);
  }
  return null;
}

function getEpisodeItems(payload) {
  const groups = Array.isArray(payload?.episodes) ? payload.episodes : [];
  const preferred = groups.find((g) => /vietsub/i.test(String(g?.server_name || ''))) || groups[0];
  return Array.isArray(preferred?.server_data) ? preferred.server_data : [];
}

function movieTypeFromDetail(movie, fallbackType = 'movie') {
  const type = normalizeText(movie?.type);
  if (['series', 'hoathinh', 'tvshows', 'tv-shows'].includes(type)) return 'series';
  if (['single', 'movie'].includes(type)) return 'movie';
  const tmdb = normalizeTmdb(movie);
  if (tmdb.type === 'tv') return 'series';
  if (tmdb.type === 'movie') return 'movie';
  return fallbackType;
}

function buildVideos(payload, slug) {
  const movie = payload?.movie || {};
  if (movieTypeFromDetail(movie, 'series') !== 'series') return undefined;
  const season = inferSeason(movie);
  const videos = [];
  let fallbackEpisode = 1;
  for (const item of getEpisodeItems(payload)) {
    const episode = inferEpisodeNumber(item) || fallbackEpisode++;
    videos.push({
      id: `kk:${encodeURIComponent(slug)}:${episode}`,
      title: item?.name ? `Tập ${item.name}` : `Tập ${episode}`,
      season,
      episode,
      released: movie?.modified?.time || undefined
    });
  }
  return videos.length ? videos : undefined;
}

function catalogItemToMetaPreview(item, type, pathImage) {
  if (!item?.slug || !item?.name) return null;
  return {
    id: `kk:${encodeURIComponent(item.slug)}`,
    type,
    name: item.name,
    poster: resolveImage(item.poster_url || item.thumb_url, pathImage),
    background: resolveImage(item.thumb_url || item.poster_url, pathImage),
    posterShape: 'poster',
    releaseInfo: item.year ? String(item.year) : undefined,
    genres: Array.isArray(item.category) ? item.category.map((x) => x?.name).filter(Boolean) : undefined,
    description: stripHtml(item.content || '') || undefined
  };
}

async function getCatalog(type, catalogId, skip = 0) {
  const config = catalogMap[catalogId];
  if (!config || config.type !== type) return [];
  const page = Math.floor(Math.max(0, skip) / CATALOG_PAGE_SIZE) + 1;
  const payload = await fetchJson(`${KKPHIM_API}/danh-sach/${config.endpoint}?page=${page}`, 'KKPhim catalog');
  const items = Array.isArray(payload?.items) ? payload.items : [];
  return items.map((item) => catalogItemToMetaPreview(item, type, payload?.pathImage)).filter(Boolean);
}

async function getMeta(type, id) {
  const parsed = parseVideoId(id);
  if (!parsed) return null;
  const payload = await fetchKKPhimTitle(type, parsed);
  if (!payload || payload.status === false || !payload.movie) return null;
  const movie = payload.movie;
  const actualType = movieTypeFromDetail(movie, type);
  const slug = movie.slug || parsed.slug;
  if (!slug) return null;
  const genres = Array.isArray(movie.category) ? movie.category.map((x) => x?.name).filter(Boolean) : [];
  const countries = Array.isArray(movie.country) ? movie.country.map((x) => x?.name).filter(Boolean) : [];
  const cast = Array.isArray(movie.actor) ? movie.actor.filter(Boolean) : [];
  const directors = Array.isArray(movie.director) ? movie.director.filter(Boolean) : [];
  const imdbId = normalizeImdbId(movie);
  const tmdb = normalizeTmdb(movie);

  return {
    id: `kk:${encodeURIComponent(slug)}`,
    type: actualType,
    name: movie.name || movie.origin_name || slug,
    poster: resolveImage(movie.poster_url || movie.thumb_url),
    background: resolveImage(movie.thumb_url || movie.poster_url),
    description: stripHtml(movie.content || movie.description || ''),
    releaseInfo: movie.year ? String(movie.year) : undefined,
    genres: genres.length ? genres : undefined,
    country: countries.join(', ') || undefined,
    director: directors.join(', ') || undefined,
    cast: cast.length ? cast : undefined,
    runtime: movie.time || undefined,
    imdbRating: movie?.tmdb?.vote_average ? String(movie.tmdb.vote_average) : undefined,
    imdb_id: imdbId || undefined,
    moviedb_id: tmdb.id ? Number(tmdb.id) : undefined,
    videos: buildVideos(payload, slug)
  };
}

function streamKey(stream) {
  const filename = stream?.behaviorHints?.filename;
  if (filename) return `file:${normalizeText(filename)}`;
  if (stream?.url) return `url:${stream.url}`;
  if (stream?.externalUrl) return `external:${stream.externalUrl}`;
  if (stream?.infoHash) return `torrent:${String(stream.infoHash).toLowerCase()}:${stream.fileIdx ?? ''}`;
  return JSON.stringify(stream);
}

function dedupeStreams(streams) {
  const seen = new Set();
  return streams.filter((stream) => {
    const key = streamKey(stream);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function flattenKKPhimStreams(payload, requestedEpisode) {
  const movie = payload?.movie || {};
  const groups = Array.isArray(payload?.episodes) ? payload.episodes : [];
  const streams = [];
  for (const group of groups) {
    const serverName = String(group?.server_name || 'KKPhim').trim();
    const items = Array.isArray(group?.server_data) ? group.server_data : [];
    for (const item of items) {
      if (!item?.link_m3u8) continue;
      if (requestedEpisode) {
        const episodeNumber = inferEpisodeNumber(item);
        if (episodeNumber !== requestedEpisode) continue;
      }
      const details = [movie.quality, movie.lang, item.name].filter(Boolean).map((v) => String(v).trim()).join(' • ');
      streams.push({
        name: '🇻🇳 KKPhim',
        title: details || serverName,
        description: `${serverName}${details ? `\n${details}` : ''}`,
        url: item.link_m3u8
      });
    }
  }
  return dedupeStreams(streams);
}

async function getKKPhimStreams(type, id) {
  const parsed = parseVideoId(id);
  if (!parsed) return { streams: [], payload: null, parsed };
  const payload = await fetchKKPhimTitle(type, parsed);
  if (!payload || payload.status === false) return { streams: [], payload, parsed };
  const requestedEpisode = parsed.provider === 'kkphim' ? parsed.episode : (type === 'series' ? parsed.episode : null);
  return { streams: flattenKKPhimStreams(payload, requestedEpisode), payload, parsed };
}

function splitConfiguredUrls(value) {
  return String(value || '').split(/[\n,]/).map((v) => v.trim()).filter(Boolean);
}

function parseUpstreamConfig() {
  const sources = [];
  const namedEnv = [
    ['AIOStreams', 'AIOSTREAMS_MANIFEST_URL'],
    ['TorBox', 'TORBOX_MANIFEST_URL'],
    ['Comet', 'COMET_MANIFEST_URL'],
    ['MediaFusion', 'MEDIAFUSION_MANIFEST_URL'],
    ['Torrentio', 'TORRENTIO_MANIFEST_URL']
  ];
  for (const [name, envName] of namedEnv) {
    for (const url of splitConfiguredUrls(process.env[envName])) sources.push({ name, manifestUrl: url });
  }
  for (const value of splitConfiguredUrls(process.env.UPSTREAM_ADDON_URLS)) {
    const separator = value.indexOf('|');
    if (separator > 0) sources.push({ name: value.slice(0, separator).trim(), manifestUrl: value.slice(separator + 1).trim() });
    else sources.push({ name: '', manifestUrl: value });
  }
  const unique = new Map();
  for (const source of sources) {
    if (/^https?:\/\//i.test(source.manifestUrl)) unique.set(source.manifestUrl, source);
  }
  return [...unique.values()];
}

function normalizeManifestUrl(value) {
  const url = new URL(value);
  if (!url.pathname.endsWith('/manifest.json')) url.pathname = `${url.pathname.replace(/\/$/, '')}/manifest.json`;
  return url.toString();
}

function streamEndpointFromManifest(manifestUrl, type, id) {
  const url = new URL(normalizeManifestUrl(manifestUrl));
  url.pathname = url.pathname.replace(/\/manifest\.json$/, `/stream/${type}/${encodeURIComponent(id)}.json`);
  return url.toString();
}

async function getManifestInfo(source) {
  const normalizedUrl = normalizeManifestUrl(source.manifestUrl);
  const cached = manifestCache.get(normalizedUrl);
  const now = Date.now();
  if (cached && now - cached.time < MANIFEST_CACHE_MS) return cached.value;
  const payload = await fetchJson(normalizedUrl, source.name || 'addon manifest');
  const value = { name: source.name || payload?.name || 'Upstream', manifest: payload || {} };
  manifestCache.set(normalizedUrl, { time: now, value });
  return value;
}

function supportsStreamRequest(upstreamManifest, type, id) {
  const resources = Array.isArray(upstreamManifest?.resources) ? upstreamManifest.resources : [];
  const entry = resources.find((resource) => resource === 'stream' || (resource && typeof resource === 'object' && resource.name === 'stream'));
  if (!entry) return false;
  if (entry === 'stream') return true;
  if (Array.isArray(entry.types) && !entry.types.includes(type)) return false;
  if (Array.isArray(entry.idPrefixes) && entry.idPrefixes.length > 0) {
    if (!entry.idPrefixes.some((prefix) => String(id).startsWith(prefix))) return false;
  }
  return true;
}

function resolutionRank(stream) {
  const text = `${stream?.name || ''} ${stream?.title || ''} ${stream?.description || ''} ${stream?.behaviorHints?.filename || ''}`.toLowerCase();
  if (/2160p|4k|uhd/.test(text)) return { label: '4K', rank: 4 };
  if (/1440p|qhd/.test(text)) return { label: '1440p', rank: 3 };
  if (/1080p|fhd/.test(text)) return { label: '1080p', rank: 2 };
  if (/720p|hd/.test(text)) return { label: '720p', rank: 1 };
  return { label: 'Khác', rank: 0 };
}

function streamSizeGb(stream) {
  const bytes = Number(stream?.behaviorHints?.videoSize || 0);
  return bytes > 0 ? bytes / 1024 / 1024 / 1024 : 0;
}

function isDebridStream(stream) {
  const text = `${stream?.name || ''} ${stream?.title || ''} ${stream?.description || ''}`.toLowerCase();
  return /torbox|\[tb|debrid|cached|comet/.test(text);
}

function compactStream(stream, sourceName) {
  const res = resolutionRank(stream);
  const size = streamSizeGb(stream);
  const text = `${stream?.title || ''} ${stream?.description || ''} ${stream?.behaviorHints?.filename || ''}`;
  const tags = [res.label];
  if (/dolby vision|\bdv\b/i.test(text)) tags.push('DV');
  if (/hdr10\+/i.test(text)) tags.push('HDR10+');
  else if (/\bhdr\b/i.test(text)) tags.push('HDR');
  if (/atmos/i.test(text)) tags.push('Atmos');
  if (/hevc|h265|x265/i.test(text)) tags.push('HEVC');
  if (size > 0) tags.push(`${size.toFixed(size >= 10 ? 0 : 1)} GB`);
  const prettyName = sourceName === 'Comet' || /torbox|\[tb/i.test(`${stream?.name || ''} ${stream?.description || ''}`)
    ? '⚡ Comet / TorBox'
    : `🌐 ${sourceName || 'Stream'}`;
  return { ...stream, name: prettyName, title: tags.join(' • ') };
}

async function getUpstreamStreams(source, type, id) {
  const info = await getManifestInfo(source);
  if (!supportsStreamRequest(info.manifest, type, id)) return [];
  const endpoint = streamEndpointFromManifest(source.manifestUrl, type, id);
  const payload = await fetchJson(endpoint, info.name);
  return (Array.isArray(payload?.streams) ? payload.streams : [])
    .filter((stream) => stream && typeof stream === 'object')
    .map((stream) => compactStream(stream, info.name));
}

function externalIdForUpstreams(type, originalId, payload, parsed) {
  if (parsed?.provider !== 'kkphim') return originalId;
  const movie = payload?.movie || {};
  const imdb = normalizeImdbId(movie);
  if (imdb) {
    if (type === 'series' && parsed.episode) return `${imdb}:${inferSeason(movie)}:${parsed.episode}`;
    return imdb;
  }
  const tmdb = normalizeTmdb(movie);
  if (tmdb.id) {
    if (type === 'series' && parsed.episode) return `tmdb:${tmdb.id}:${inferSeason(movie)}:${parsed.episode}`;
    return `tmdb:${tmdb.id}`;
  }
  return null;
}

function sortAndLimitStreams(streams) {
  const filtered = streams.filter((stream) => {
    if (String(stream?.name || '').includes('KKPhim')) return true;
    const size = streamSizeGb(stream);
    return !(MAX_SIZE_GB > 0 && size > MAX_SIZE_GB);
  });
  const unique = dedupeStreams(filtered);
  unique.sort((a, b) => {
    const aKK = String(a?.name || '').includes('KKPhim') ? 1 : 0;
    const bKK = String(b?.name || '').includes('KKPhim') ? 1 : 0;
    if (aKK !== bKK) return bKK - aKK;
    const aDebrid = isDebridStream(a) ? 1 : 0;
    const bDebrid = isDebridStream(b) ? 1 : 0;
    if (aDebrid !== bDebrid) return bDebrid - aDebrid;
    const ar = resolutionRank(a).rank;
    const br = resolutionRank(b).rank;
    if (ar !== br) return br - ar;
    const as = streamSizeGb(a) || Number.MAX_SAFE_INTEGER;
    const bs = streamSizeGb(b) || Number.MAX_SAFE_INTEGER;
    return as - bs;
  });

  const counts = new Map();
  const result = [];
  for (const stream of unique) {
    if (String(stream?.name || '').includes('KKPhim')) result.push(stream);
    else {
      const group = resolutionRank(stream).label;
      const current = counts.get(group) || 0;
      if (MAX_STREAMS_PER_RESOLUTION > 0 && current >= MAX_STREAMS_PER_RESOLUTION) continue;
      counts.set(group, current + 1);
      result.push(stream);
    }
    if (MAX_STREAMS_TOTAL > 0 && result.length >= MAX_STREAMS_TOTAL) break;
  }
  return result;
}

async function getAllStreams(type, id) {
  const kk = await getKKPhimStreams(type, id).catch((error) => {
    console.error(`[KKPhim] ${type}/${id}: ${error?.message || error}`);
    return { streams: [], payload: null, parsed: parseVideoId(id) };
  });
  const upstreamId = externalIdForUpstreams(type, id, kk.payload, kk.parsed);
  const streams = [...kk.streams];
  if (upstreamId) {
    const upstreams = parseUpstreamConfig();
    const settled = await Promise.allSettled(upstreams.map((source) => getUpstreamStreams(source, type, upstreamId)));
    settled.forEach((result, index) => {
      const source = upstreams[index];
      if (result.status === 'fulfilled') streams.push(...result.value);
      else console.error(`[${source.name || 'Upstream'}] ${type}/${upstreamId}: ${result.reason?.message || result.reason}`);
    });
  }
  return sortAndLimitStreams(streams);
}

function parseExtraSegment(raw) {
  const extra = {};
  if (!raw) return extra;
  for (const part of String(raw).split('&')) {
    const [key, value = ''] = part.split('=');
    if (key) extra[decodeURIComponent(key)] = decodeURIComponent(value);
  }
  return extra;
}

function sendJson(res, statusCode, body, cacheSeconds = 0) {
  const json = JSON.stringify(body);
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(json),
    'access-control-allow-origin': '*',
    'access-control-allow-headers': '*',
    'cache-control': cacheSeconds > 0 ? `public, max-age=${cacheSeconds}` : 'no-store'
  });
  res.end(json);
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': 'GET, OPTIONS'
    });
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'GET' && url.pathname === '/manifest.json') return sendJson(res, 200, manifest, 3600);

  if (req.method === 'GET' && url.pathname === '/') {
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'access-control-allow-origin': '*' });
    return res.end(`KKPhim Việt + Streams v${manifest.version}\nManifest: /manifest.json\n`);
  }

  const catalogMatch = url.pathname.match(/^\/catalog\/(movie|series)\/([^/]+)(?:\/(.+))?\.json$/);
  if (req.method === 'GET' && catalogMatch) {
    const type = catalogMatch[1];
    const catalogId = decodeURIComponent(catalogMatch[2]);
    const extra = parseExtraSegment(catalogMatch[3]);
    const skip = Math.max(0, Number(extra.skip || url.searchParams.get('skip') || 0) || 0);
    try {
      const metas = await getCatalog(type, catalogId, skip);
      console.log(`[Catalog] ${catalogId} skip=${skip}: ${metas.length} item(s)`);
      return sendJson(res, 200, { metas }, 300);
    } catch (error) {
      console.error(`[Catalog] ${catalogId}: ${error?.message || error}`);
      return sendJson(res, 200, { metas: [] }, 60);
    }
  }

  const metaMatch = url.pathname.match(/^\/meta\/(movie|series)\/(.+)\.json$/);
  if (req.method === 'GET' && metaMatch) {
    const type = metaMatch[1];
    const id = decodeURIComponent(metaMatch[2]);
    try {
      const meta = await getMeta(type, id);
      return sendJson(res, 200, { meta }, 300);
    } catch (error) {
      console.error(`[Meta] ${type}/${id}: ${error?.message || error}`);
      return sendJson(res, 200, { meta: null }, 60);
    }
  }

  const streamMatch = url.pathname.match(/^\/stream\/(movie|series)\/(.+)\.json$/);
  if (req.method === 'GET' && streamMatch) {
    const type = streamMatch[1];
    const id = decodeURIComponent(streamMatch[2]);
    try {
      const streams = await getAllStreams(type, id);
      console.log(`[Aggregator] ${type}/${id}: ${streams.length} stream(s)`);
      return sendJson(res, 200, { streams }, 180);
    } catch (error) {
      console.error(`[Aggregator] ${type}/${id}: ${error?.message || error}`);
      return sendJson(res, 200, { streams: [] }, 60);
    }
  }

  return sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`KKPhim Việt + Streams v${manifest.version} listening on port ${PORT}`);
  console.log(`Manifest: http://127.0.0.1:${PORT}/manifest.json`);
  console.log(`Configured upstream addons: ${parseUpstreamConfig().length}`);
});
