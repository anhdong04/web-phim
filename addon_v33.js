const http = require('node:http');

const PORT = Number(process.env.PORT || 7000);
const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
const TMDB_LANGUAGE = process.env.TMDB_LANGUAGE || 'vi-VN';
const TMDB_REGION = process.env.TMDB_REGION || 'VN';
const KKPHIM_API = process.env.KKPHIM_API || 'https://phimapi.com';
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 12000);
const MAX_STREAMS_PER_RESOLUTION = Number(process.env.MAX_STREAMS_PER_RESOLUTION || 6);
const MAX_STREAMS_TOTAL = Number(process.env.MAX_STREAMS_TOTAL || 30);
const MAX_SIZE_GB = Number(process.env.MAX_SIZE_GB || 0);
const STREAM_PRESET = String(process.env.STREAM_PRESET || 'balanced').toLowerCase();
const STRICT_MATCHING = String(process.env.STRICT_MATCHING || 'true').toLowerCase() !== 'false';
const REMOVE_CAM = String(process.env.REMOVE_CAM || 'true').toLowerCase() !== 'false';
const DEFAULT_SUBTITLE_MANIFEST = process.env.DEFAULT_SUBTITLE_MANIFEST || 'https://opensubtitles-v3.strem.io/manifest.json';

const homeExtra = [{ name: 'skip', isRequired: false }];
const searchExtra = [
  { name: 'search', isRequired: true },
  { name: 'skip', isRequired: false }
];

const manifest = {
  id: 'vn.webphim.nuvio.v3',
  version: '3.3.0',
  name: 'Phim Việt + TorBox',
  description: 'Vietnamese TMDB home/search metadata, curated KKPhim + TorBox streams, and subtitles',
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
  ]
};

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

function sendJson(res, status, body, cache = 0) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(json),
    'access-control-allow-origin': '*',
    'access-control-allow-headers': '*',
    'cache-control': cache ? `public, max-age=${cache}` : 'no-store'
  });
  res.end(json);
}

async function fetchJson(url, label = 'upstream') {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      headers: { accept: 'application/json', 'user-agent': 'web-phim-v3/3.3' },
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
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, String(v));
  }
  return u.toString();
}

function img(path, size = 'w500') {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : undefined;
}

function pageFromSkip(skip) {
  return Math.floor((Number(skip) || 0) / 20) + 1;
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

function parseExtra(raw) {
  if (!raw) return {};
  const decoded = decodeURIComponent(raw);
  if (decoded.startsWith('{')) {
    try { return JSON.parse(decoded); } catch {}
  }
  return Object.fromEntries(new URLSearchParams(decoded));
}

async function getCatalog(type, id, extra = {}) {
  if (id === 'search-movies' || id === 'search-series') {
    const expectedType = id === 'search-movies' ? 'movie' : 'series';
    if (type !== expectedType || !extra.search) return [];
    const path = type === 'movie' ? '/search/movie' : '/search/tv';
    const payload = await fetchJson(
      tmdbUrl(path, {
        query: extra.search,
        page: pageFromSkip(extra.skip),
        include_adult: 'false',
        region: type === 'movie' ? TMDB_REGION : undefined
      }),
      `TMDB search ${type}`
    );
    return (payload.results || []).map(x => toPreview(x, type));
  }

  const spec = catalogSpecs[id];
  if (!spec || spec.type !== type) return [];
  const params = { ...(spec.params || {}), page: pageFromSkip(extra.skip) };
  if (spec.region) params.region = TMDB_REGION;
  const payload = await fetchJson(tmdbUrl(spec.path, params), `TMDB ${id}`);
  let results = (payload.results || []).map(x => toPreview(x, type));
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
  const settled = await Promise.allSettled(
    valid.map(s => fetchJson(tmdbUrl(`/tv/${tvId}/season/${s.season_number}`), 'TMDB season'))
  );
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
      id, type,
      name: p.title || p.original_title,
      poster: img(p.poster_path),
      background: img(p.backdrop_path, 'w1280'),
      description: p.overview || undefined,
      releaseInfo: p.release_date?.slice(0, 4),
      genres: genres(p.genres),
      cast: castNames(p.credits),
      director: directorNames(p.credits),
      runtime: p.runtime ? `${p.runtime} phút` : undefined,
      imdbRating: p.vote_average ? Number(p.vote_average).toFixed(1) : undefined,
      behaviorHints: { defaultVideoId: id }
    };
  }

  const p = await fetchJson(tmdbUrl(`/tv/${tmdbId}`, { append_to_response: 'external_ids,credits' }), 'TMDB tv');
  const videos = await fetchTvVideos(tmdbId, p.seasons);
  return {
    id, type,
    name: p.name || p.original_name,
    poster: img(p.poster_path),
    background: img(p.backdrop_path, 'w1280'),
    description: p.overview || undefined,
    releaseInfo: p.first_air_date?.slice(0, 4),
    genres: genres(p.genres),
    cast: castNames(p.credits),
    runtime: p.episode_run_time?.[0] ? `${p.episode_run_time[0]} phút/tập` : undefined,
    imdbRating: p.vote_average ? Number(p.vote_average).toFixed(1) : undefined,
    videos
  };
}

function parseId(type, id) {
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
  const p = await fetchJson(tmdbUrl(path), 'TMDB external ids');
  return p.imdb_id || null;
}

async function getMediaIdentity(type, parsed) {
  if (!parsed) return null;
  let tmdbId = parsed.tmdbId;
  if (!tmdbId && parsed.imdbId) {
    const found = await fetchJson(tmdbUrl(`/find/${parsed.imdbId}`, { external_source: 'imdb_id' }), 'TMDB find');
    const item = type === 'movie' ? found.movie_results?.[0] : found.tv_results?.[0];
    tmdbId = item?.id;
  }
  if (!tmdbId) return null;

  const path = type === 'movie' ? `/movie/${tmdbId}` : `/tv/${tmdbId}`;
  const p = await fetchJson(tmdbUrl(path), 'TMDB identity');
  const localized = type === 'movie' ? p.title : p.name;
  const original = type === 'movie' ? p.original_title : p.original_name;
  const date = type === 'movie' ? p.release_date : p.first_air_date;
  return {
    tmdbId: String(tmdbId),
    title: localized || original || '',
    originalTitle: original || localized || '',
    year: date ? Number(String(date).slice(0, 4)) : null,
    season: parsed.season,
    episode: parsed.episode
  };
}

function normalizeText(v) {
  return String(v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleTokens(v) {
  const stop = new Set(['the','a','an','and','of','in','on','to','for','part','movie','film']);
  return normalizeText(v).split(' ').filter(t => t.length > 1 && !stop.has(t));
}

function tokenCoverage(title, candidate) {
  const required = titleTokens(title);
  if (!required.length) return 0;
  const have = new Set(titleTokens(candidate));
  const matched = required.filter(t => have.has(t)).length;
  return matched / required.length;
}

function extractYears(text) {
  return [...String(text || '').matchAll(/\b(19\d{2}|20\d{2})\b/g)].map(m => Number(m[1]));
}

function episodeMatches(text, season, episode) {
  if (!season || !episode) return true;
  const t = String(text || '').toLowerCase();
  const patterns = [
    /s(\d{1,2})e(\d{1,3})/i,
    /(\d{1,2})x(\d{1,3})/i,
    /season[ ._-]?(\d{1,2}).{0,12}episode[ ._-]?(\d{1,3})/i
  ];
  for (const p of patterns) {
    const m = t.match(p);
    if (m) return Number(m[1]) === season && Number(m[2]) === episode;
  }
  return true;
}

function isCamLike(stream) {
  const t = `${stream.name || ''} ${stream.title || ''} ${stream.description || ''} ${stream?.behaviorHints?.filename || ''}`.toLowerCase();
  return /\b(cam|camrip|hdcam|telesync|telecine|tsrip|hdts)\b/.test(t);
}

function streamText(stream) {
  return `${stream?.behaviorHints?.filename || ''} ${stream.title || ''} ${stream.description || ''} ${stream.name || ''}`;
}

function isLikelyCorrectStream(stream, identity, type) {
  if (!identity || String(stream.name || '').includes('KKPhim')) return true;
  const text = streamText(stream);

  if (type === 'series' && !episodeMatches(text, identity.season, identity.episode)) return false;

  const years = extractYears(text);
  if (identity.year && years.length && !years.includes(identity.year)) return false;

  const normalizedCandidate = normalizeText(text);
  const localized = normalizeText(identity.title);
  const original = normalizeText(identity.originalTitle);
  if ((localized && normalizedCandidate.includes(localized)) || (original && normalizedCandidate.includes(original))) return true;

  const coverage = Math.max(
    tokenCoverage(identity.title, text),
    tokenCoverage(identity.originalTitle, text)
  );

  if (coverage >= 0.8) return true;
  if (!STRICT_MATCHING && coverage >= 0.55) return true;
  return false;
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
    for (const group of p.episodes || []) {
      for (const item of group.server_data || []) {
        if (!item.link_m3u8) continue;
        if (type === 'series' && parsed.episode && inferEpisode(item) !== parsed.episode) continue;
        out.push({
          name: `🇻🇳 KKPhim • ${group.server_name || 'Server'}`,
          title: [movie.quality, movie.lang, item.name].filter(Boolean).join(' • '),
          url: item.link_m3u8
        });
      }
    }
    return out;
  } catch { return []; }
}

function splitLines(value) {
  return String(value || '').split(/[\n,]/).map(x => x.trim()).filter(Boolean);
}

function configuredUpstreams() {
  const defs = [
    ['AIOStreams', 'AIOSTREAMS_MANIFEST_URL'], ['TorBox', 'TORBOX_MANIFEST_URL'], ['Comet', 'COMET_MANIFEST_URL'],
    ['MediaFusion', 'MEDIAFUSION_MANIFEST_URL'], ['Torrentio', 'TORRENTIO_MANIFEST_URL']
  ];
  const out = [];
  for (const [name, key] of defs) if (process.env[key]) out.push({ name, url: process.env[key].trim() });
  for (const raw of splitLines(process.env.UPSTREAM_ADDON_URLS)) {
    const i = raw.indexOf('|');
    out.push(i > 0 ? { name: raw.slice(0, i).trim(), url: raw.slice(i + 1).trim() } : { name: 'Upstream', url: raw });
  }
  return out;
}

function resourceEndpoint(manifestUrl, resource, type, id) {
  const u = new URL(manifestUrl);
  if (!u.pathname.endsWith('/manifest.json')) u.pathname = `${u.pathname.replace(/\/$/, '')}/manifest.json`;
  u.pathname = u.pathname.replace(/\/manifest\.json$/, `/${resource}/${type}/${encodeURIComponent(id)}.json`);
  return u.toString();
}

async function getUpstream(source, type, id) {
  try {
    const p = await fetchJson(resourceEndpoint(source.url, 'stream', type, id), source.name);
    return (p.streams || []).map(s => ({
      ...s,
      name: source.name === 'Comet' ? '⚡ Comet / TorBox' : `${source.name}${s.name ? ` • ${s.name}` : ''}`
    }));
  } catch { return []; }
}

function resolution(s) {
  const t = `${s.name || ''} ${s.title || ''} ${s.description || ''} ${s?.behaviorHints?.filename || ''}`.toLowerCase();
  if (/2160p|4k|uhd/.test(t)) return 2160;
  if (/1440p|qhd/.test(t)) return 1440;
  if (/1080p|fhd/.test(t)) return 1080;
  if (/720p|\bhd\b/.test(t)) return 720;
  if (/576p|480p|sd/.test(t)) return 480;
  return 0;
}

function sizeBytes(s) { return Number(s?.behaviorHints?.videoSize || 0); }
function sizeGB(s) { return sizeBytes(s) / (1024 ** 3); }
function streamKey(s) { return s.url || s.externalUrl || (s.infoHash ? `${s.infoHash}:${s.fileIdx ?? ''}` : JSON.stringify(s)); }

function hasFeature(s, re) {
  return re.test(`${s.title || ''} ${s.description || ''} ${s?.behaviorHints?.filename || ''}`.toLowerCase());
}

function streamScore(s) {
  if (String(s.name || '').includes('KKPhim')) return 100000;
  const r = resolution(s);
  const gb = sizeGB(s);
  const hdr = hasFeature(s, /\b(dv|dolby vision|hdr10\+|hdr10|hdr)\b/);
  const premiumAudio = hasFeature(s, /\b(atmos|truehd|dts[- .]?hd|7\.1)\b/);
  const webBluray = hasFeature(s, /\b(remux|blu.?ray|web[- .]?dl)\b/);
  const cached = /torbox|cached|tb⚡/i.test(`${s.name || ''} ${s.description || ''}`);

  if (STREAM_PRESET === 'best') {
    return r * 20 + (hdr ? 8000 : 0) + (premiumAudio ? 4000 : 0) + (webBluray ? 2500 : 0) + (cached ? 1500 : 0) + Math.min(gb, 100) * 4;
  }

  if (STREAM_PRESET === 'data-saver' || STREAM_PRESET === 'datasaver') {
    const resolutionPreference = r === 1080 ? 15000 : r === 720 ? 12000 : r === 480 ? 9000 : r === 2160 ? 3000 : 5000;
    return resolutionPreference + (cached ? 1200 : 0) + (webBluray ? 500 : 0) - gb * 700;
  }

  const resolutionPreference = r === 1080 ? 20000 : r === 2160 ? 18000 : r === 1440 ? 16000 : r === 720 ? 12000 : 7000;
  const sizePenalty = gb > 25 ? (gb - 25) * 180 : 0;
  return resolutionPreference + (hdr ? 1800 : 0) + (webBluray ? 1400 : 0) + (cached ? 1600 : 0) + (premiumAudio ? 700 : 0) - sizePenalty;
}

function curate(streams, identity, type) {
  const seen = new Set();
  let a = streams.filter(s => {
    const k = streamKey(s);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  if (REMOVE_CAM) a = a.filter(s => String(s.name || '').includes('KKPhim') || !isCamLike(s));
  a = a.filter(s => isLikelyCorrectStream(s, identity, type));

  if (MAX_SIZE_GB > 0) {
    a = a.filter(s => !sizeBytes(s) || sizeGB(s) <= MAX_SIZE_GB || String(s.name || '').includes('KKPhim'));
  }

  if (STREAM_PRESET === 'data-saver' || STREAM_PRESET === 'datasaver') {
    a = a.filter(s => String(s.name || '').includes('KKPhim') || resolution(s) <= 1080 || resolution(s) === 0);
  }

  a.sort((x, y) => streamScore(y) - streamScore(x) || sizeBytes(x) - sizeBytes(y));

  const counts = new Map();
  const out = [];
  for (const s of a) {
    if (String(s.name || '').includes('KKPhim')) {
      out.push(s);
      continue;
    }
    const r = resolution(s);
    const c = counts.get(r) || 0;
    if (c >= MAX_STREAMS_PER_RESOLUTION) continue;
    counts.set(r, c + 1);
    out.push(s);
    if (out.length >= MAX_STREAMS_TOTAL) break;
  }
  return out.slice(0, MAX_STREAMS_TOTAL);
}

async function getStreams(type, id) {
  const parsed = parseId(type, id);
  if (!parsed) return [];
  const [imdb, identity] = await Promise.all([
    resolveImdb(type, parsed).catch(() => null),
    getMediaIdentity(type, parsed).catch(() => null)
  ]);
  const upstreamId = imdb
    ? `${imdb}${type === 'series' && parsed.season ? `:${parsed.season}:${parsed.episode || 1}` : ''}`
    : id;
  const tasks = [
    getKKPhim(type, parsed),
    ...configuredUpstreams().map(s => getUpstream(s, type, upstreamId))
  ];
  const parts = await Promise.all(tasks);
  return curate(parts.flat(), identity, type);
}

function configuredSubtitleSources() {
  const out = [];
  if (DEFAULT_SUBTITLE_MANIFEST) out.push({ name: 'OpenSubtitles', url: DEFAULT_SUBTITLE_MANIFEST });
  for (const raw of splitLines(process.env.SUBTITLE_ADDON_URLS)) {
    const i = raw.indexOf('|');
    out.push(i > 0 ? { name: raw.slice(0, i).trim(), url: raw.slice(i + 1).trim() } : { name: 'Subtitles', url: raw });
  }
  const unique = new Map();
  for (const s of out) if (/^https?:\/\//i.test(s.url)) unique.set(s.url, s);
  return [...unique.values()];
}

async function getSubtitleSource(source, type, id) {
  try {
    const p = await fetchJson(resourceEndpoint(source.url, 'subtitles', type, id), source.name);
    return (p.subtitles || []).map((s, index) => ({
      ...s,
      id: `${source.name}:${s.id || index}`
    }));
  } catch {
    return [];
  }
}

function dedupeSubtitles(subtitles) {
  const seen = new Set();
  return subtitles.filter(s => {
    const k = `${s.url || ''}|${s.lang || ''}`;
    if (!s.url || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

async function getSubtitles(type, id) {
  const parsed = parseId(type, id);
  if (!parsed) return [];
  const imdb = await resolveImdb(type, parsed).catch(() => null);
  const subtitleId = imdb
    ? `${imdb}${type === 'series' && parsed.season ? `:${parsed.season}:${parsed.episode || 1}` : ''}`
    : id;
  const parts = await Promise.all(configuredSubtitleSources().map(s => getSubtitleSource(s, type, subtitleId)));
  const all = dedupeSubtitles(parts.flat());
  const priority = { vi: 0, vie: 0, eng: 1, en: 1 };
  all.sort((a, b) => (priority[String(a.lang || '').toLowerCase()] ?? 5) - (priority[String(b.lang || '').toLowerCase()] ?? 5));
  return all;
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': 'GET,OPTIONS'
    });
    return res.end();
  }

  const u = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (u.pathname === '/manifest.json') return sendJson(res, 200, manifest, 3600);
  if (u.pathname === '/') {
    return sendJson(res, 200, {
      name: manifest.name,
      version: manifest.version,
      tmdbConfigured: Boolean(TMDB_API_KEY),
      searchSupported: true,
      streamPreset: STREAM_PRESET,
      strictMatching: STRICT_MATCHING,
      subtitlesSupported: true,
      subtitleSources: configuredSubtitleSources().map(x => x.name),
      homeLayout: manifest.catalogs.filter(c => !c.id.startsWith('search-')).map(c => c.name)
    }, 60);
  }

  let m = u.pathname.match(/^\/catalog\/(movie|series)\/([^/.]+)(?:\/([^/]+))?\.json$/);
  if (m) {
    try {
      const extra = parseExtra(m[3]);
      return sendJson(res, 200, { metas: await getCatalog(m[1], m[2], extra) }, 900);
    } catch (e) {
      console.error(e);
      return sendJson(res, 200, { metas: [] }, 60);
    }
  }

  m = u.pathname.match(/^\/meta\/(movie|series)\/(.+)\.json$/);
  if (m) {
    try { return sendJson(res, 200, { meta: await getMeta(m[1], decodeURIComponent(m[2])) }, 900); }
    catch (e) { console.error(e); return sendJson(res, 200, { meta: null }, 60); }
  }

  m = u.pathname.match(/^\/stream\/(movie|series)\/(.+)\.json$/);
  if (m) {
    try { return sendJson(res, 200, { streams: await getStreams(m[1], decodeURIComponent(m[2])) }, 180); }
    catch (e) { console.error(e); return sendJson(res, 200, { streams: [] }, 60); }
  }

  m = u.pathname.match(/^\/subtitles\/(movie|series)\/(.+?)(?:\/([^/]+))?\.json$/);
  if (m) {
    try { return sendJson(res, 200, { subtitles: await getSubtitles(m[1], decodeURIComponent(m[2])) }, 300); }
    catch (e) { console.error(e); return sendJson(res, 200, { subtitles: [] }, 60); }
  }

  return sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Phim Việt + TorBox v3.3 listening on ${PORT}`);
});