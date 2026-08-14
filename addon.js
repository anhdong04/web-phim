const http = require('node:http');

const PORT = Number(process.env.PORT || 7000);
const KKPHIM_API = process.env.KKPHIM_API || 'https://phimapi.com';
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 10000);
const MANIFEST_CACHE_MS = Number(process.env.MANIFEST_CACHE_MS || 15 * 60 * 1000);

const manifest = {
  id: 'vn.kkphim.nuvio.streams',
  version: '1.1.0',
  name: 'KKPhim + Streams',
  description: 'KKPhim plus optional Stremio-compatible upstream stream addons for Nuvio',
  resources: [
    {
      name: 'stream',
      types: ['movie', 'series'],
      idPrefixes: ['tt', 'tmdb']
    }
  ],
  types: ['movie', 'series'],
  catalogs: []
};

const manifestCache = new Map();

function toPositiveInt(value) {
  const n = Number.parseInt(value, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function parseVideoId(id) {
  const parts = String(id || '').split(':');

  if (/^tt\d+$/i.test(parts[0])) {
    return {
      provider: 'imdb',
      externalId: parts[0],
      season: toPositiveInt(parts[1]),
      episode: toPositiveInt(parts[2])
    };
  }

  if (parts[0]?.toLowerCase() === 'tmdb' && /^\d+$/.test(parts[1] || '')) {
    return {
      provider: 'tmdb',
      externalId: parts[1],
      season: toPositiveInt(parts[2]),
      episode: toPositiveInt(parts[3])
    };
  }

  const compact = String(id || '').match(/^tmdb(\d+)(?::(\d+))?(?::(\d+))?$/i);
  if (compact) {
    return {
      provider: 'tmdb',
      externalId: compact[1],
      season: toPositiveInt(compact[2]),
      episode: toPositiveInt(compact[3])
    };
  }

  return null;
}

async function fetchJson(url, sourceName = 'upstream') {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
        'user-agent': 'kkphim-nuvio-aggregator/1.1'
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`${sourceName} returned HTTP ${response.status}`);
    }

    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

function fetchKKPhimTitle(type, parsed) {
  if (parsed.provider === 'imdb') {
    return fetchJson(
      `${KKPHIM_API}/imdb/title/${encodeURIComponent(parsed.externalId)}`,
      'KKPhim API'
    );
  }

  const tmdbType = type === 'series' ? 'tv' : 'movie';
  return fetchJson(
    `${KKPHIM_API}/tmdb/${tmdbType}/${encodeURIComponent(parsed.externalId)}`,
    'KKPhim API'
  );
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function inferEpisodeNumber(item) {
  const candidates = [item?.name, item?.slug, item?.filename].filter(Boolean);

  for (const value of candidates) {
    const text = normalizeText(value);
    const exact = text.match(/^0*(\d+)$/);
    if (exact) return Number(exact[1]);

    const labelled = text.match(/(?:tap|episode|ep|e)\s*[-_. ]*0*(\d+)\b/i);
    if (labelled) return Number(labelled[1]);
  }

  return null;
}

function streamKey(stream) {
  if (stream?.url) return `url:${stream.url}`;
  if (stream?.externalUrl) return `external:${stream.externalUrl}`;
  if (stream?.infoHash) {
    return `torrent:${String(stream.infoHash).toLowerCase()}:${stream.fileIdx ?? ''}`;
  }
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

      const details = [movie.quality, movie.lang, item.name]
        .filter(Boolean)
        .map((v) => String(v).trim())
        .join(' • ');

      streams.push({
        name: `KKPhim • ${serverName}`,
        title: details || serverName,
        url: item.link_m3u8
      });
    }
  }

  return dedupeStreams(streams);
}

async function getKKPhimStreams(type, id) {
  if (!['movie', 'series'].includes(type)) return [];

  const parsed = parseVideoId(id);
  if (!parsed) return [];

  const payload = await fetchKKPhimTitle(type, parsed);
  if (!payload || payload.status === false) return [];

  const requestedEpisode = type === 'series' ? parsed.episode : null;
  return flattenKKPhimStreams(payload, requestedEpisode);
}

function splitConfiguredUrls(value) {
  return String(value || '')
    .split(/[\n,]/)
    .map((v) => v.trim())
    .filter(Boolean);
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
    for (const url of splitConfiguredUrls(process.env[envName])) {
      sources.push({ name, manifestUrl: url });
    }
  }

  for (const value of splitConfiguredUrls(process.env.UPSTREAM_ADDON_URLS)) {
    const separator = value.indexOf('|');
    if (separator > 0) {
      sources.push({
        name: value.slice(0, separator).trim(),
        manifestUrl: value.slice(separator + 1).trim()
      });
    } else {
      sources.push({ name: '', manifestUrl: value });
    }
  }

  const unique = new Map();
  for (const source of sources) {
    if (!/^https?:\/\//i.test(source.manifestUrl)) continue;
    unique.set(source.manifestUrl, source);
  }

  return [...unique.values()];
}

function normalizeManifestUrl(value) {
  const url = new URL(value);
  if (!url.pathname.endsWith('/manifest.json')) {
    url.pathname = `${url.pathname.replace(/\/$/, '')}/manifest.json`;
  }
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
  const value = {
    name: source.name || payload?.name || 'Upstream',
    manifest: payload || {}
  };
  manifestCache.set(normalizedUrl, { time: now, value });
  return value;
}

function supportsStreamRequest(upstreamManifest, type, id) {
  const resources = Array.isArray(upstreamManifest?.resources) ? upstreamManifest.resources : [];
  const entry = resources.find((resource) => {
    if (resource === 'stream') return true;
    return resource && typeof resource === 'object' && resource.name === 'stream';
  });

  if (!entry) return false;
  if (entry === 'stream') return true;

  if (Array.isArray(entry.types) && !entry.types.includes(type)) return false;

  if (Array.isArray(entry.idPrefixes) && entry.idPrefixes.length > 0) {
    const matchesPrefix = entry.idPrefixes.some((prefix) => String(id).startsWith(prefix));
    if (!matchesPrefix) return false;
  }

  return true;
}

function labelUpstreamStreams(streams, sourceName) {
  return (Array.isArray(streams) ? streams : [])
    .filter((stream) => stream && typeof stream === 'object')
    .map((stream) => ({
      ...stream,
      name: sourceName
        ? `${sourceName}${stream.name ? ` • ${stream.name}` : ''}`
        : stream.name
    }));
}

async function getUpstreamStreams(source, type, id) {
  const info = await getManifestInfo(source);
  if (!supportsStreamRequest(info.manifest, type, id)) return [];

  const endpoint = streamEndpointFromManifest(source.manifestUrl, type, id);
  const payload = await fetchJson(endpoint, info.name);
  return labelUpstreamStreams(payload?.streams, info.name);
}

async function getAllStreams(type, id) {
  const upstreams = parseUpstreamConfig();
  const tasks = [
    { name: 'KKPhim', promise: getKKPhimStreams(type, id) },
    ...upstreams.map((source) => ({
      name: source.name || source.manifestUrl,
      promise: getUpstreamStreams(source, type, id)
    }))
  ];

  const settled = await Promise.allSettled(tasks.map((task) => task.promise));
  const streams = [];

  settled.forEach((result, index) => {
    const task = tasks[index];
    if (result.status === 'fulfilled') {
      console.log(`[${task.name}] ${type}/${id}: ${result.value.length} stream(s)`);
      streams.push(...result.value);
      return;
    }

    const error = result.reason;
    const message = error?.name === 'AbortError'
      ? 'upstream timeout'
      : error?.message || String(error);
    console.error(`[${task.name}] ${type}/${id}: ${message}`);
  });

  return dedupeStreams(streams);
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

  if (req.method === 'GET' && url.pathname === '/manifest.json') {
    return sendJson(res, 200, manifest, 3600);
  }

  if (req.method === 'GET' && url.pathname === '/') {
    res.writeHead(200, {
      'content-type': 'text/plain; charset=utf-8',
      'access-control-allow-origin': '*'
    });
    const upstreamCount = parseUpstreamConfig().length;
    return res.end(
      `KKPhim + Streams aggregator\nManifest: /manifest.json\nConfigured upstream addons: ${upstreamCount}\n`
    );
  }

  const match = url.pathname.match(/^\/stream\/(movie|series)\/(.+)\.json$/);
  if (req.method === 'GET' && match) {
    const type = match[1];
    const id = decodeURIComponent(match[2]);

    try {
      const streams = await getAllStreams(type, id);
      console.log(`[Aggregator] ${type}/${id}: ${streams.length} unique stream(s)`);
      return sendJson(res, 200, { streams }, 180);
    } catch (error) {
      const message = error?.name === 'AbortError'
        ? 'upstream timeout'
        : error?.message || String(error);
      console.error(`[Aggregator] ${type}/${id}: ${message}`);
      return sendJson(res, 200, { streams: [] }, 60);
    }
  }

  return sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`KKPhim + Streams aggregator listening on port ${PORT}`);
  console.log(`Manifest: http://127.0.0.1:${PORT}/manifest.json`);
  console.log(`Configured upstream addons: ${parseUpstreamConfig().length}`);
});
