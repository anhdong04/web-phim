const http = require('node:http');

// ============================================================
// Web Phim v4 - single-process Stremio/Nuvio addon
// TMDB catalogs/meta + KKPhim + stream upstreams + subtitles
// ============================================================

const PORT = Number(process.env.PORT || 7000);
const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
const TMDB_LANGUAGE = process.env.TMDB_LANGUAGE || 'vi-VN';
const TMDB_REGION = process.env.TMDB_REGION || 'VN';
const KKPHIM_API = process.env.KKPHIM_API || 'https://phimapi.com';
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 12000);
const DEFAULT_SUBTITLE_MANIFEST = process.env.DEFAULT_SUBTITLE_MANIFEST || 'https://opensubtitles-v3.strem.io/manifest.json';
const SUBSENSE_MANIFEST_URL = String(process.env.SUBSENSE_MANIFEST_URL || '').trim();

const DEFAULTS = Object.freeze({
  streamPreset: String(process.env.STREAM_PRESET || 'balanced').toLowerCase(),
  strictMatching: String(process.env.STRICT_MATCHING || 'true').toLowerCase() !== 'false',
  removeCam: String(process.env.REMOVE_CAM || 'true').toLowerCase() !== 'false',
  preferCached: String(process.env.PREFER_CACHED || 'true').toLowerCase() !== 'false',
  onlyCached: String(process.env.ONLY_CACHED || 'false').toLowerCase() === 'true',
  maxStreamsPerResolution: Number(process.env.MAX_STREAMS_PER_RESOLUTION || 6),
  maxStreamsTotal: Number(process.env.MAX_STREAMS_TOTAL || 30),
  maxSizeGB: Number(process.env.MAX_SIZE_GB || 0),
  subtitleLanguages: String(process.env.SUBTITLE_LANGUAGES || 'vie,vi,eng,en').split(',').map(x => x.trim().toLowerCase()).filter(Boolean),
  subtitleFallbackAll: String(process.env.SUBTITLE_FALLBACK_ALL || 'false').toLowerCase() === 'true',
  subtitleStrictMatching: String(process.env.SUBTITLE_STRICT_MATCHING || 'true').toLowerCase() !== 'false',
  maxSubtitlesPerLanguage: Number(process.env.MAX_SUBTITLES_PER_LANGUAGE || 8),
  subtitlePreferNonHI: String(process.env.SUBTITLE_PREFER_NON_HI || 'true').toLowerCase() !== 'false'
});

const homeExtra = [{ name: 'skip', isRequired: false }];
const searchExtra = [{ name: 'search', isRequired: true }, { name: 'skip', isRequired: false }];

const catalogSpecs = {
  'home-hot': { type: 'movie', path: '/trending/movie/week' },
  'home-top10': { type: 'movie', path: '/trending/movie/day', limit: 10 },
  'home-new-movies': { type: 'movie', path: '/movie/now_playing', region: true },
  'home-new-series': { type: 'series', path: '/tv/on_the_air' },
  'home-animation': { type: 'movie', path: '/discover/movie', params: { with_genres: '16', sort_by: 'popularity.desc', include_adult: 'false' } },
  'home-korean': { type: 'series', path: '/discover/tv', params: { with_origin_country: 'KR', sort_by: 'popularity.desc' } },
  'home-horror': { type: 'movie', path: '/discover/movie', params: { with_genres: '27', sort_by: 'popularity.desc', include_adult: 'false' } },
  'home-action': { type: 'movie', path: '/discover/movie', params: { with_genres: '28', sort_by: 'popularity.desc', include_adult: 'false' } }
};

function clampNumber(value, fallback, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function sanitizeConfig(raw = {}) {
  const preset = ['best', 'balanced', 'data-saver', 'datasaver'].includes(String(raw.streamPreset || '').toLowerCase())
    ? String(raw.streamPreset).toLowerCase()
    : DEFAULTS.streamPreset;
  const langs = Array.isArray(raw.subtitleLanguages)
    ? raw.subtitleLanguages
    : String(raw.subtitleLanguages || DEFAULTS.subtitleLanguages.join(',')).split(',');

  return {
    streamPreset: preset === 'datasaver' ? 'data-saver' : preset,
    strictMatching: typeof raw.strictMatching === 'boolean' ? raw.strictMatching : DEFAULTS.strictMatching,
    removeCam: typeof raw.removeCam === 'boolean' ? raw.removeCam : DEFAULTS.removeCam,
    preferCached: typeof raw.preferCached === 'boolean' ? raw.preferCached : DEFAULTS.preferCached,
    onlyCached: typeof raw.onlyCached === 'boolean' ? raw.onlyCached : DEFAULTS.onlyCached,
    maxStreamsPerResolution: clampNumber(raw.maxStreamsPerResolution, DEFAULTS.maxStreamsPerResolution, 1, 20),
    maxStreamsTotal: clampNumber(raw.maxStreamsTotal, DEFAULTS.maxStreamsTotal, 1, 100),
    maxSizeGB: clampNumber(raw.maxSizeGB, DEFAULTS.maxSizeGB, 0, 500),
    subtitleLanguages: langs.map(x => String(x).trim().toLowerCase()).filter(Boolean).slice(0, 12),
    subtitleFallbackAll: typeof raw.subtitleFallbackAll === 'boolean' ? raw.subtitleFallbackAll : DEFAULTS.subtitleFallbackAll,
    subtitleStrictMatching: typeof raw.subtitleStrictMatching === 'boolean' ? raw.subtitleStrictMatching : DEFAULTS.subtitleStrictMatching,
    maxSubtitlesPerLanguage: clampNumber(raw.maxSubtitlesPerLanguage, DEFAULTS.maxSubtitlesPerLanguage, 1, 30),
    subtitlePreferNonHI: typeof raw.subtitlePreferNonHI === 'boolean' ? raw.subtitlePreferNonHI : DEFAULTS.subtitlePreferNonHI
  };
}

function encodeConfig(config) {
  return Buffer.from(JSON.stringify(sanitizeConfig(config))).toString('base64url');
}

function decodeConfig(token) {
  if (!token) return sanitizeConfig(DEFAULTS);
  try {
    return sanitizeConfig(JSON.parse(Buffer.from(token, 'base64url').toString('utf8')));
  } catch {
    return sanitizeConfig(DEFAULTS);
  }
}

function parseBasePath(pathname) {
  const m = pathname.match(/^\/c\/([A-Za-z0-9_-]+)(\/.*)?$/);
  if (!m) return { base: '', rest: pathname, config: sanitizeConfig(DEFAULTS), configured: false };
  return { base: `/c/${m[1]}`, rest: m[2] || '/', config: decodeConfig(m[1]), configured: true };
}

function buildManifest(base = '') {
  return {
    id: 'vn.webphim.nuvio.v4',
    version: '4.0.0',
    name: 'Phim Việt + TorBox',
    description: 'TMDB Việt + KKPhim + smart-ranked debrid streams + multi-source subtitles',
    resources: [
      'catalog',
      { name: 'meta', types: ['movie', 'series'], idPrefixes: ['tmdb:'] },
      { name: 'stream', types: ['movie', 'series'], idPrefixes: ['tmdb:', 'tt'] },
      { name: 'subtitles', types: ['movie', 'series'], idPrefixes: ['tmdb:', 'tt'] }
    ],
    types: ['movie', 'series'],
    catalogs: [
      { type: 'movie', id: 'home-hot', name: '🔥 Hot rần rần', extra: homeExtra },
      { type: 'movie', id: 'home-top10', name: '🏆 Top 10 hôm nay', extra: homeExtra },
      { type: 'movie', id: 'home-new-movies', name: '🆕 Phim lẻ mới cập nhật', extra: homeExtra },
      { type: 'series', id: 'home-new-series', name: '📺 Phim bộ mới nhất', extra: homeExtra },
      { type: 'movie', id: 'home-animation', name: '🧸 Hoạt hình', extra: homeExtra },
      { type: 'series', id: 'home-korean', name: '🇰🇷 Phim Hàn Quốc', extra: homeExtra },
      { type: 'movie', id: 'home-horror', name: '👻 Kinh dị', extra: homeExtra },
      { type: 'movie', id: 'home-action', name: '⚔️ Hành động', extra: homeExtra },
      { type: 'movie', id: 'search-movies', name: 'Tìm kiếm phim', extra: searchExtra },
      { type: 'series', id: 'search-series', name: 'Tìm kiếm phim bộ', extra: searchExtra }
    ],
    behaviorHints: {
      configurable: true,
      configurationRequired: false
    }
  };
}

function sendJson(res, status, body, cache = 0, extraHeaders = {}) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(json),
    'access-control-allow-origin': '*',
    'access-control-allow-headers': '*',
    'cache-control': cache ? `public, max-age=${cache}` : 'no-store',
    'x-web-phim-version': '4.0.0',
    ...extraHeaders
  });
  res.end(json);
}

function sendHtml(res, html) {
  res.writeHead(200, {
    'content-type': 'text/html; charset=utf-8',
    'content-length': Buffer.byteLength(html),
    'cache-control': 'no-store'
  });
  res.end(html);
}

async function fetchJson(url, label = 'upstream') {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      headers: { accept: 'application/json', 'user-agent': 'web-phim-v4/4.0.0' },
      signal: controller.signal
    });
    if (!r.ok) throw new Error(`${label} HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

function tmdbUrl(path, params = {}) {
  if (!TMDB_API_KEY) throw new Error('TMDB_API_KEY is not configured');
  const u = new URL(`https://api.themoviedb.org/3${path}`);
  u.searchParams.set('api_key', TMDB_API_KEY);
  u.searchParams.set('language', TMDB_LANGUAGE);
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, String(v));
  return u.toString();
}

function img(path, size = 'w500') {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : undefined;
}

function pageFromSkip(skip) {
  return Math.floor((Number(skip) || 0) / 20) + 1;
}

function parseExtra(raw) {
  if (!raw) return {};
  const decoded = decodeURIComponent(raw);
  if (decoded.startsWith('{')) {
    try { return JSON.parse(decoded); } catch {}
  }
  return Object.fromEntries(new URLSearchParams(decoded));
}

function toPreview(item, type) {
  const name = type === 'movie' ? item.title : item.name;
  const date = type === 'movie' ? item.release_date : item.first_air_date;
  return {
    id: `tmdb:${item.id}`,
    type,
    name: name || item.original_title || item.original_name || `TMDB ${item.id}`,
    poster: img(item.poster_path),
    background: img(item.backdrop_path, 'w1280'),
    description: item.overview || undefined,
    releaseInfo: date ? String(date).slice(0, 4) : undefined
  };
}

async function getCatalog(type, id, extra = {}) {
  if (id === 'search-movies' || id === 'search-series') {
    const expectedType = id === 'search-movies' ? 'movie' : 'series';
    if (type !== expectedType || !extra.search) return [];
    const path = type === 'movie' ? '/search/movie' : '/search/tv';
    const p = await fetchJson(tmdbUrl(path, {
      query: extra.search,
      page: pageFromSkip(extra.skip),
      include_adult: 'false',
      region: type === 'movie' ? TMDB_REGION : undefined
    }), `TMDB search ${type}`);
    return (p.results || []).map(x => toPreview(x, type));
  }

  const spec = catalogSpecs[id];
  if (!spec || spec.type !== type) return [];
  const params = { ...(spec.params || {}), page: pageFromSkip(extra.skip) };
  if (spec.region) params.region = TMDB_REGION;
  const p = await fetchJson(tmdbUrl(spec.path, params), `TMDB ${id}`);
  let results = (p.results || []).map(x => toPreview(x, type));
  if (spec.limit) {
    if ((Number(extra.skip) || 0) > 0) return [];
    results = results.slice(0, spec.limit);
  }
  return results;
}

function genres(list) { return Array.isArray(list) ? list.map(x => x.name).filter(Boolean) : []; }
function castNames(credits) { return (credits?.cast || []).slice(0, 12).map(x => x.name).filter(Boolean); }
function directorNames(credits) { return (credits?.crew || []).filter(x => x.job === 'Director').slice(0, 5).map(x => x.name).filter(Boolean); }

async function fetchTvVideos(tvId, seasons) {
  const valid = (seasons || []).filter(s => Number(s.season_number) > 0).slice(0, 30);
  const settled = await Promise.allSettled(valid.map(s => fetchJson(tmdbUrl(`/tv/${tvId}/season/${s.season_number}`), 'TMDB season')));
  const videos = [];
  for (const r of settled) {
    if (r.status !== 'fulfilled') continue;
    for (const ep of r.value.episodes || []) {
      videos.push({
        id: `tmdb:${tvId}:${ep.season_number}:${ep.episode_number}`,
        title: ep.name ? `Tập ${ep.episode_number} • ${ep.name}` : `Tập ${ep.episode_number}`,
        season: ep.season_number,
        episode: ep.episode_number,
        released: ep.air_date ? `${ep.air_date}T00:00:00.000Z` : undefined,
        thumbnail: img(ep.still_path, 'w500'),
        overview: ep.overview || undefined
      });
    }
  }
  return videos;
}

async function getMeta(type, id) {
  const m = String(id).match(/^tmdb:(\d+)$/);
  if (!m) return null;
  const tmdbId = m[1];
  if (type === 'movie') {
    const p = await fetchJson(tmdbUrl(`/movie/${tmdbId}`, { append_to_response: 'external_ids,credits' }), 'TMDB movie');
    return {
      id, type, name: p.title || p.original_title,
      poster: img(p.poster_path), background: img(p.backdrop_path, 'w1280'),
      description: p.overview || undefined, releaseInfo: p.release_date?.slice(0, 4),
      genres: genres(p.genres), cast: castNames(p.credits), director: directorNames(p.credits),
      runtime: p.runtime ? `${p.runtime} phút` : undefined,
      imdbRating: p.vote_average ? Number(p.vote_average).toFixed(1) : undefined,
      behaviorHints: { defaultVideoId: id }
    };
  }
  const p = await fetchJson(tmdbUrl(`/tv/${tmdbId}`, { append_to_response: 'external_ids,credits' }), 'TMDB tv');
  return {
    id, type, name: p.name || p.original_name,
    poster: img(p.poster_path), background: img(p.backdrop_path, 'w1280'),
    description: p.overview || undefined, releaseInfo: p.first_air_date?.slice(0, 4),
    genres: genres(p.genres), cast: castNames(p.credits),
    runtime: p.episode_run_time?.[0] ? `${p.episode_run_time[0]} phút/tập` : undefined,
    imdbRating: p.vote_average ? Number(p.vote_average).toFixed(1) : undefined,
    videos: await fetchTvVideos(tmdbId, p.seasons)
  };
}

function parseId(id) {
  let m = String(id).match(/^tmdb:(\d+)(?::(\d+))?(?::(\d+))?$/);
  if (m) return { kind: 'tmdb', tmdbId: m[1], season: Number(m[2]) || null, episode: Number(m[3]) || null };
  m = String(id).match(/^(tt\d+)(?::(\d+))?(?::(\d+))?$/i);
  if (m) return { kind: 'imdb', imdbId: m[1], season: Number(m[2]) || null, episode: Number(m[3]) || null };
  return null;
}

async function resolveImdb(type, parsed) {
  if (parsed?.imdbId) return parsed.imdbId;
  if (!parsed?.tmdbId) return null;
  const path = type === 'movie' ? `/movie/${parsed.tmdbId}/external_ids` : `/tv/${parsed.tmdbId}/external_ids`;
  return (await fetchJson(tmdbUrl(path), 'TMDB external ids')).imdb_id || null;
}

async function getMediaIdentity(type, parsed) {
  if (!parsed) return null;
  let tmdbId = parsed.tmdbId;
  if (!tmdbId && parsed.imdbId) {
    const found = await fetchJson(tmdbUrl(`/find/${parsed.imdbId}`, { external_source: 'imdb_id' }), 'TMDB find');
    tmdbId = (type === 'movie' ? found.movie_results?.[0] : found.tv_results?.[0])?.id;
  }
  if (!tmdbId) return null;
  const p = await fetchJson(tmdbUrl(type === 'movie' ? `/movie/${tmdbId}` : `/tv/${tmdbId}`), 'TMDB identity');
  const title = type === 'movie' ? p.title : p.name;
  const original = type === 'movie' ? p.original_title : p.original_name;
  const date = type === 'movie' ? p.release_date : p.first_air_date;
  return {
    tmdbId: String(tmdbId), title: title || original || '', originalTitle: original || title || '',
    year: date ? Number(String(date).slice(0, 4)) : null, season: parsed.season, episode: parsed.episode
  };
}

function normalizeText(v) {
  return String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/&/g, ' and ')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function titleTokens(v) {
  const stop = new Set(['the','a','an','and','of','in','on','to','for','part','movie','film','sub','subtitle','vie','eng','srt']);
  return normalizeText(v).split(' ').filter(t => t.length > 1 && !stop.has(t));
}

function tokenCoverage(title, candidate) {
  const required = titleTokens(title);
  if (!required.length) return 0;
  const have = new Set(titleTokens(candidate));
  return required.filter(t => have.has(t)).length / required.length;
}

function extractYears(text) {
  return [...String(text || '').matchAll(/\b(19\d{2}|20\d{2})\b/g)].map(m => Number(m[1]));
}

function episodeMatches(text, season, episode) {
  if (!season || !episode) return true;
  for (const re of [/s(\d{1,2})e(\d{1,3})/i, /(\d{1,2})x(\d{1,3})/i, /season[ ._-]?(\d{1,2}).{0,12}episode[ ._-]?(\d{1,3})/i]) {
    const m = String(text || '').match(re);
    if (m) return Number(m[1]) === season && Number(m[2]) === episode;
  }
  return true;
}

function isLikelyCorrect(text, identity, type, strict = true) {
  if (!identity || !String(text || '').trim()) return true;
  if (type === 'series' && !episodeMatches(text, identity.season, identity.episode)) return false;
  const years = extractYears(text);
  if (identity.year && years.length && !years.includes(identity.year)) return false;
  const candidate = normalizeText(text);
  const localized = normalizeText(identity.title);
  const original = normalizeText(identity.originalTitle);
  if ((localized && candidate.includes(localized)) || (original && candidate.includes(original))) return true;
  const coverage = Math.max(tokenCoverage(identity.title, text), tokenCoverage(identity.originalTitle, text));
  return coverage >= (strict ? 0.8 : 0.55);
}

function splitLines(value) { return String(value || '').split(/[\n,]/).map(x => x.trim()).filter(Boolean); }

function configuredUpstreams() {
  const defs = [['AIOStreams','AIOSTREAMS_MANIFEST_URL'],['TorBox','TORBOX_MANIFEST_URL'],['Comet','COMET_MANIFEST_URL'],['MediaFusion','MEDIAFUSION_MANIFEST_URL'],['Torrentio','TORRENTIO_MANIFEST_URL']];
  const out = [];
  for (const [name, key] of defs) if (process.env[key]) out.push({ name, url: process.env[key].trim() });
  for (const raw of splitLines(process.env.UPSTREAM_ADDON_URLS)) {
    const i = raw.indexOf('|');
    out.push(i > 0 ? { name: raw.slice(0, i).trim(), url: raw.slice(i + 1).trim() } : { name: 'Upstream', url: raw });
  }
  const unique = new Map();
  for (const x of out) if (/^https?:\/\//i.test(x.url)) unique.set(x.url, x);
  return [...unique.values()];
}

function configuredSubtitleSources() {
  const out = [];
  if (DEFAULT_SUBTITLE_MANIFEST) out.push({ name: 'OpenSubtitles', url: DEFAULT_SUBTITLE_MANIFEST });
  if (SUBSENSE_MANIFEST_URL) out.push({ name: 'SubSense', url: SUBSENSE_MANIFEST_URL });
  for (const raw of splitLines(process.env.SUBTITLE_ADDON_URLS)) {
    const i = raw.indexOf('|');
    out.push(i > 0 ? { name: raw.slice(0, i).trim(), url: raw.slice(i + 1).trim() } : { name: 'Subtitles', url: raw });
  }
  const unique = new Map();
  for (const x of out) if (/^https?:\/\//i.test(x.url)) unique.set(x.url, x);
  return [...unique.values()];
}

function resourceEndpoint(manifestUrl, resource, type, id, extra = '') {
  const u = new URL(manifestUrl);
  if (!u.pathname.endsWith('/manifest.json')) u.pathname = `${u.pathname.replace(/\/$/, '')}/manifest.json`;
  const suffix = extra ? `/${extra}` : '';
  u.pathname = u.pathname.replace(/\/manifest\.json$/, `/${resource}/${type}/${encodeURIComponent(id)}${suffix}.json`);
  return u.toString();
}

function inferEpisode(item) {
  for (const v of [item?.name, item?.slug, item?.filename]) {
    const t = normalizeText(v);
    let m = t.match(/^0*(\d+)$/); if (m) return Number(m[1]);
    m = t.match(/(?:tap|episode|ep|e)\s*[-_. ]*0*(\d+)\b/); if (m) return Number(m[1]);
  }
  return null;
}

async function getKKPhim(type, parsed) {
  const url = parsed.kind === 'tmdb'
    ? `${KKPHIM_API}/tmdb/${type === 'series' ? 'tv' : 'movie'}/${parsed.tmdbId}`
    : `${KKPHIM_API}/imdb/title/${parsed.imdbId}`;
  try {
    const p = await fetchJson(url, 'KKPhim');
    const movie = p.movie || {};
    const out = [];
    for (const group of p.episodes || []) for (const item of group.server_data || []) {
      if (!item.link_m3u8) continue;
      if (type === 'series' && parsed.episode && inferEpisode(item) !== parsed.episode) continue;
      out.push({ name: `🇻🇳 KKPhim • ${group.server_name || 'Server'}`, title: [movie.quality, movie.lang, item.name].filter(Boolean).join(' • '), url: item.link_m3u8, _provider: 'KKPhim' });
    }
    return out;
  } catch { return []; }
}

async function getUpstream(source, type, id) {
  try {
    const p = await fetchJson(resourceEndpoint(source.url, 'stream', type, id), source.name);
    return (p.streams || []).map(s => ({
      ...s,
      name: source.name === 'Comet' ? '⚡ Comet / TorBox' : `${source.name}${s.name ? ` • ${s.name}` : ''}`,
      _provider: source.name
    }));
  } catch { return []; }
}

function streamText(s) { return `${s?.behaviorHints?.filename || ''} ${s.title || ''} ${s.description || ''} ${s.name || ''}`; }
function resolutionFromText(text) {
  const t = String(text || '').toLowerCase();
  if (/2160p|4k|uhd/.test(t)) return 2160;
  if (/1440p|qhd/.test(t)) return 1440;
  if (/1080p|fhd/.test(t)) return 1080;
  if (/720p|\bhd\b/.test(t)) return 720;
  if (/576p|480p|\bsd\b/.test(t)) return 480;
  return 0;
}
function streamResolution(s) { return resolutionFromText(streamText(s)); }
function sizeBytes(s) { return Number(s?.behaviorHints?.videoSize || 0); }
function sizeGB(s) { return sizeBytes(s) / (1024 ** 3); }
function hasFeature(s, re) { return re.test(streamText(s).toLowerCase()); }
function isKK(s) { return s._provider === 'KKPhim' || String(s.name || '').includes('KKPhim'); }
function isCamLike(s) { return /\b(cam|camrip|hdcam|telesync|telecine|tsrip|hdts)\b/i.test(streamText(s)); }
function isCachedHint(s) {
  const t = `${s.name || ''} ${s.title || ''} ${s.description || ''} ${s?.behaviorHints?.filename || ''}`;
  return /(?:\bcached\b|⚡|instant|debrid cache|torbox cached)/i.test(t) || Boolean(s?.behaviorHints?.cached);
}

function technicalFingerprint(text) {
  const t = normalizeText(text)
    .replace(/\b(?:2160p|1080p|720p|480p|4k|uhd|hdr10|hdr|dv|dolby vision|x264|x265|h264|h265|hevc|av1|aac|ac3|eac3|ddp|dts|truehd|atmos|bluray|blu ray|web dl|webrip|remux|brrip|bdrip|dvdrip|proper|rerip|internal)\b/g, ' ')
    .replace(/\s+/g, ' ').trim();
  return t;
}

function smartReleaseKey(s) {
  if (s.infoHash) return `hash:${String(s.infoHash).toLowerCase()}:${s.fileIdx ?? ''}`;
  const file = s?.behaviorHints?.filename || s.title || s.description || '';
  const base = String(file).replace(/\.(mkv|mp4|avi|mov|m4v)$/i, '');
  const core = technicalFingerprint(base);
  const res = streamResolution(s);
  const bytes = sizeBytes(s);
  const sizeBucket = bytes ? Math.round(bytes / (256 * 1024 * 1024)) : 0;
  return `rel:${core}|${res}|${sizeBucket}`;
}

function streamScore(s, cfg) {
  if (isKK(s)) return 100000;
  const r = streamResolution(s);
  const gb = sizeGB(s);
  const cached = isCachedHint(s);
  const hdr = hasFeature(s, /\b(dv|dolby vision|hdr10\+|hdr10|hdr)\b/);
  const premiumAudio = hasFeature(s, /\b(atmos|truehd|dts[- .]?hd|7\.1)\b/);
  const premiumSource = hasFeature(s, /\b(remux|blu.?ray|web[- .]?dl)\b/);
  let score = 0;
  if (cfg.streamPreset === 'best') score = r * 20 + (hdr ? 8000 : 0) + (premiumAudio ? 4000 : 0) + (premiumSource ? 2500 : 0) + Math.min(gb, 100) * 4;
  else if (cfg.streamPreset === 'data-saver') {
    const rp = r === 1080 ? 15000 : r === 720 ? 12000 : r === 480 ? 9000 : r === 2160 ? 3000 : 5000;
    score = rp + (premiumSource ? 500 : 0) - gb * 700;
  } else {
    const rp = r === 1080 ? 20000 : r === 2160 ? 18000 : r === 1440 ? 16000 : r === 720 ? 12000 : 7000;
    const penalty = gb > 25 ? (gb - 25) * 180 : 0;
    score = rp + (hdr ? 1800 : 0) + (premiumSource ? 1400 : 0) + (premiumAudio ? 700 : 0) - penalty;
  }
  if (cfg.preferCached && cached) score += 6000;
  return score;
}

function smartDedupe(streams, cfg) {
  const best = new Map();
  for (const s of streams) {
    const key = smartReleaseKey(s);
    const previous = best.get(key);
    if (!previous || streamScore(s, cfg) > streamScore(previous, cfg)) best.set(key, s);
  }
  return [...best.values()];
}

function curateStreams(streams, identity, type, cfg) {
  let a = streams.filter(Boolean);
  if (cfg.removeCam) a = a.filter(s => isKK(s) || !isCamLike(s));
  a = a.filter(s => isKK(s) || isLikelyCorrect(streamText(s), identity, type, cfg.strictMatching));
  if (cfg.maxSizeGB > 0) a = a.filter(s => isKK(s) || !sizeBytes(s) || sizeGB(s) <= cfg.maxSizeGB);
  if (cfg.streamPreset === 'data-saver') a = a.filter(s => isKK(s) || streamResolution(s) <= 1080 || streamResolution(s) === 0);
  if (cfg.onlyCached) a = a.filter(s => isKK(s) || isCachedHint(s));

  a = smartDedupe(a, cfg);
  a.sort((x, y) => streamScore(y, cfg) - streamScore(x, cfg) || sizeBytes(x) - sizeBytes(y));

  const counts = new Map();
  const out = [];
  for (const s of a) {
    if (isKK(s)) {
      out.push(stripPrivate(s));
      if (out.length >= cfg.maxStreamsTotal) break;
      continue;
    }
    const r = streamResolution(s);
    const c = counts.get(r) || 0;
    if (c >= cfg.maxStreamsPerResolution) continue;
    counts.set(r, c + 1);
    out.push(stripPrivate(s));
    if (out.length >= cfg.maxStreamsTotal) break;
  }
  return out;
}

function stripPrivate(obj) {
  const out = { ...obj };
  for (const k of Object.keys(out)) if (k.startsWith('_')) delete out[k];
  return out;
}

async function getStreams(type, id, cfg) {
  const parsed = parseId(id);
  if (!parsed) return [];
  const [imdb, identity] = await Promise.all([
    resolveImdb(type, parsed).catch(() => null),
    getMediaIdentity(type, parsed).catch(() => null)
  ]);
  const upstreamId = imdb ? `${imdb}${type === 'series' && parsed.season ? `:${parsed.season}:${parsed.episode || 1}` : ''}` : id;
  const parts = await Promise.all([getKKPhim(type, parsed), ...configuredUpstreams().map(s => getUpstream(s, type, upstreamId))]);
  return curateStreams(parts.flat(), identity, type, cfg);
}

async function getSubtitleSource(source, type, id, extra = '') {
  try {
    const p = await fetchJson(resourceEndpoint(source.url, 'subtitles', type, id, extra), source.name);
    return (p.subtitles || []).map((s, i) => ({ ...s, id: `${source.name}:${s.id || i}`, _provider: source.name }));
  } catch { return []; }
}

function subtitleText(s) { return `${s.releaseName || ''} ${s.label || ''} ${s.id || ''}`; }
function isHI(s) { return /(?:\bhi\b|hearing.?impaired|sdh)/i.test(` ${subtitleText(s)} `); }
function subtitleSourceScore(s) {
  const src = String(s.source || s._provider || s.id || '').toLowerCase();
  if (src.includes('subsource')) return 500;
  if (src.includes('subdl')) return 450;
  if (src.includes('opensubtitles')) return 350;
  if (src.includes('yify')) return 300;
  return 200;
}
function subtitleQualityScore(text) {
  const t = String(text || '').toLowerCase();
  if (/remux/.test(t)) return 500;
  if (/blu.?ray|bluray|hddvd/.test(t)) return 420;
  if (/web[- .]?dl/.test(t)) return 340;
  if (/webrip/.test(t)) return 280;
  if (/brrip|bdrip/.test(t)) return 240;
  if (/dvdrip/.test(t)) return 180;
  return 100;
}
function subtitleLangScore(lang) {
  const l = String(lang || '').toLowerCase();
  if (l === 'vie' || l === 'vi') return 2000;
  if (l === 'eng' || l === 'en') return 1000;
  return 0;
}
function overlapScore(a, b) {
  const aa = titleTokens(a);
  if (!aa.length) return 0;
  const bb = new Set(titleTokens(b));
  return aa.filter(x => bb.has(x)).length / aa.length;
}
function subtitleRankScore(s, targetFilename, cfg) {
  const text = subtitleText(s);
  let score = subtitleLangScore(s.lang) + subtitleSourceScore(s) + subtitleQualityScore(text);
  if (cfg.subtitlePreferNonHI && isHI(s)) score -= 350;
  const r = resolutionFromText(text);
  if (targetFilename) {
    score += Math.round(overlapScore(targetFilename, text) * 5000);
    const tr = resolutionFromText(targetFilename);
    if (tr && r) score += tr === r ? 1200 : -Math.min(Math.abs(tr - r), 1000);
  } else {
    if (r === 2160) score += 180;
    else if (r === 1080) score += 160;
    else if (r === 720) score += 120;
  }
  return score;
}

function filterRankSubtitles(subtitles, identity, type, targetFilename, cfg) {
  let a = subtitles.filter(s => s?.url);
  const allowed = new Set(cfg.subtitleLanguages);
  const langFiltered = a.filter(s => allowed.has(String(s.lang || '').toLowerCase()));
  a = langFiltered.length || !cfg.subtitleFallbackAll ? langFiltered : a;
  a = a.filter(s => isLikelyCorrect(subtitleText(s), identity, type, cfg.subtitleStrictMatching));

  const seenUrl = new Set();
  a = a.filter(s => {
    const k = `${s.url}|${s.lang || ''}`;
    if (seenUrl.has(k)) return false;
    seenUrl.add(k);
    return true;
  });
  a.sort((x, y) => subtitleRankScore(y, targetFilename, cfg) - subtitleRankScore(x, targetFilename, cfg));

  const counts = new Map();
  const seenRelease = new Set();
  const out = [];
  for (const s of a) {
    const lang = String(s.lang || '').toLowerCase();
    const c = counts.get(lang) || 0;
    if (c >= cfg.maxSubtitlesPerLanguage) continue;
    const releaseKey = `${lang}|${normalizeText(s.releaseName || s.label || s.url || s.id || '')}`;
    if (seenRelease.has(releaseKey)) continue;
    seenRelease.add(releaseKey);
    counts.set(lang, c + 1);
    out.push(stripPrivate(s));
  }
  return out;
}

async function getSubtitles(type, id, extra, cfg) {
  const parsed = parseId(id);
  if (!parsed) return [];
  const [imdb, identity] = await Promise.all([
    resolveImdb(type, parsed).catch(() => null),
    getMediaIdentity(type, parsed).catch(() => null)
  ]);
  const subtitleId = imdb ? `${imdb}${type === 'series' && parsed.season ? `:${parsed.season}:${parsed.episode || 1}` : ''}` : id;
  const targetFilename = parseExtra(extra).filename || parseExtra(extra).videoFilename || '';
  const parts = await Promise.all(configuredSubtitleSources().map(s => getSubtitleSource(s, type, subtitleId, extra)));
  return filterRankSubtitles(parts.flat(), identity, type, targetFilename, cfg);
}

function configPage(origin, currentCfg) {
  const d = JSON.stringify(currentCfg).replace(/</g, '\\u003c');
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Web Phim v4 Configure</title><style>
  body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#0f1115;color:#eee;max-width:760px;margin:36px auto;padding:0 18px}h1{margin-bottom:6px}.muted{color:#9aa4b2}.card{background:#181c23;border:1px solid #2b313b;border-radius:14px;padding:20px;margin:18px 0}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.row{margin:12px 0}label{display:block;margin-bottom:6px;font-weight:600}input,select{width:100%;box-sizing:border-box;background:#0f1319;color:#eee;border:1px solid #3a4350;border-radius:8px;padding:10px}input[type=checkbox]{width:auto;margin-right:8px}button{background:#4f7cff;color:white;border:0;border-radius:9px;padding:12px 18px;font-weight:700;cursor:pointer}.url{word-break:break-all;background:#0b0e12;border-radius:8px;padding:12px;margin-top:12px}a{color:#7da2ff}@media(max-width:640px){.grid{grid-template-columns:1fr}}</style></head><body>
  <h1>Web Phim v4</h1><div class="muted">Cấu hình stream và phụ đề. Các secret vẫn ở Render Environment.</div>
  <form id="f"><div class="card"><h2>Stream</h2><div class="grid">
  <div><label>Preset</label><select id="streamPreset"><option value="best">Best</option><option value="balanced">Balanced</option><option value="data-saver">Data Saver</option></select></div>
  <div><label>Max streams tổng</label><input id="maxStreamsTotal" type="number" min="1" max="100"></div>
  <div><label>Max / độ phân giải</label><input id="maxStreamsPerResolution" type="number" min="1" max="20"></div>
  <div><label>Max dung lượng (GB, 0 = không giới hạn)</label><input id="maxSizeGB" type="number" min="0" max="500" step="1"></div></div>
  <div class="row"><label><input id="strictMatching" type="checkbox">Lọc đúng title/year/tập</label></div>
  <div class="row"><label><input id="removeCam" type="checkbox">Ẩn CAM/TS</label></div>
  <div class="row"><label><input id="preferCached" type="checkbox">Ưu tiên stream có dấu hiệu cached</label></div>
  <div class="row"><label><input id="onlyCached" type="checkbox">Chỉ hiện stream có dấu hiệu cached</label></div></div>
  <div class="card"><h2>Subtitle</h2><div class="grid">
  <div><label>Ngôn ngữ</label><input id="subtitleLanguages" placeholder="vie,vi,eng,en"></div>
  <div><label>Max subtitle / ngôn ngữ</label><input id="maxSubtitlesPerLanguage" type="number" min="1" max="30"></div></div>
  <div class="row"><label><input id="subtitleStrictMatching" type="checkbox">Lọc subtitle đúng phim/tập</label></div>
  <div class="row"><label><input id="subtitlePreferNonHI" type="checkbox">Ưu tiên non-HI/SDH</label></div>
  <div class="row"><label><input id="subtitleFallbackAll" type="checkbox">Fallback tất cả ngôn ngữ nếu không có ngôn ngữ đã chọn</label></div></div>
  <button type="submit">Tạo manifest URL</button></form><div id="result"></div>
  <script>const initial=${d};for(const [k,v] of Object.entries(initial)){const e=document.getElementById(k);if(!e)continue;if(e.type==='checkbox')e.checked=!!v;else e.value=Array.isArray(v)?v.join(','):v;}document.getElementById('f').onsubmit=e=>{e.preventDefault();const c={streamPreset:streamPreset.value,strictMatching:strictMatching.checked,removeCam:removeCam.checked,preferCached:preferCached.checked,onlyCached:onlyCached.checked,maxStreamsPerResolution:+maxStreamsPerResolution.value,maxStreamsTotal:+maxStreamsTotal.value,maxSizeGB:+maxSizeGB.value,subtitleLanguages:subtitleLanguages.value.split(',').map(x=>x.trim()).filter(Boolean),subtitleFallbackAll:subtitleFallbackAll.checked,subtitleStrictMatching:subtitleStrictMatching.checked,maxSubtitlesPerLanguage:+maxSubtitlesPerLanguage.value,subtitlePreferNonHI:subtitlePreferNonHI.checked};const bytes=new TextEncoder().encode(JSON.stringify(c));let bin='';bytes.forEach(b=>bin+=String.fromCharCode(b));const token=btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');const url='${origin}/c/'+token+'/manifest.json';result.innerHTML='<div class="card"><b>Manifest URL:</b><div class="url">'+url+'</div><p><a href="'+url+'" target="_blank">Mở manifest</a></p><p class="muted">Copy URL này vào Nuvio/Stremio để dùng cấu hình vừa chọn.</p></div>';};</script></body></html>`;
}

function statusPayload(cfg, configured) {
  return {
    name: 'Phim Việt + TorBox', version: '4.0.0', architecture: 'single-process-v4',
    tmdbConfigured: Boolean(TMDB_API_KEY), searchSupported: true,
    configureSupported: true, configuredManifest: configured,
    streamPreset: cfg.streamPreset, strictMatching: cfg.strictMatching,
    smartStreamDedupe: true, preferCached: cfg.preferCached, onlyCached: cfg.onlyCached,
    subtitlesSupported: true, subtitleSources: configuredSubtitleSources().map(x => x.name),
    subtitleLanguages: cfg.subtitleLanguages, subtitleStrictMatching: cfg.subtitleStrictMatching,
    subtitleRanking: true, maxSubtitlesPerLanguage: cfg.maxSubtitlesPerLanguage,
    subSenseConfigured: Boolean(SUBSENSE_MANIFEST_URL)
  };
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,OPTIONS' });
    return res.end();
  }

  const full = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const parsedBase = parseBasePath(full.pathname);
  const path = parsedBase.rest;
  const cfg = parsedBase.config;
  const origin = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;

  if (path === '/manifest.json') return sendJson(res, 200, buildManifest(parsedBase.base), 300);
  if (path === '/configure' || (path === '/' && full.searchParams.get('configure') === '1')) return sendHtml(res, configPage(origin, cfg));
  if (path === '/') return sendJson(res, 200, statusPayload(cfg, parsedBase.configured), 30);

  let m = path.match(/^\/catalog\/(movie|series)\/([^/.]+)(?:\/([^/]+))?\.json$/);
  if (m) {
    try { return sendJson(res, 200, { metas: await getCatalog(m[1], m[2], parseExtra(m[3])) }, 900); }
    catch (e) { console.error('catalog:', e.message); return sendJson(res, 200, { metas: [] }, 60); }
  }

  m = path.match(/^\/meta\/(movie|series)\/(.+)\.json$/);
  if (m) {
    try { return sendJson(res, 200, { meta: await getMeta(m[1], decodeURIComponent(m[2])) }, 900); }
    catch (e) { console.error('meta:', e.message); return sendJson(res, 200, { meta: null }, 60); }
  }

  m = path.match(/^\/stream\/(movie|series)\/(.+)\.json$/);
  if (m) {
    try { return sendJson(res, 200, { streams: await getStreams(m[1], decodeURIComponent(m[2]), cfg) }, 120); }
    catch (e) { console.error('stream:', e.message); return sendJson(res, 200, { streams: [] }, 30); }
  }

  m = path.match(/^\/subtitles\/(movie|series)\/([^/]+)(?:\/([^/]+))?\.json$/);
  if (m) {
    try {
      return sendJson(res, 200, { subtitles: await getSubtitles(m[1], decodeURIComponent(m[2]), m[3] ? decodeURIComponent(m[3]) : '', cfg) }, 0,
        { 'cache-control': 'no-store, no-cache, must-revalidate' });
    } catch (e) { console.error('subtitles:', e.message); return sendJson(res, 200, { subtitles: [] }, 0); }
  }

  return sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Phim Việt + TorBox v4.0.0 listening on ${PORT}`);
  console.log('Architecture: single process; smart dedupe + configurable manifest enabled');
});
