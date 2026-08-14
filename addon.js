const http = require('node:http');

const PORT = Number(process.env.PORT || 7000);
const KKPHIM_API = process.env.KKPHIM_API || 'https://phimapi.com';
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 10000);

const manifest = {
  id: 'vn.kkphim.nuvio.streams',
  version: '1.0.0',
  name: 'KKPhim Streams',
  description: 'Vietnamese KKPhim streams for Nuvio / Stremio-compatible clients',
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

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
        'user-agent': 'kkphim-nuvio-addon/1.0'
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`KKPhim API returned HTTP ${response.status}`);
    }

    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

function fetchKKPhimTitle(type, parsed) {
  if (parsed.provider === 'imdb') {
    return fetchJson(`${KKPHIM_API}/imdb/title/${encodeURIComponent(parsed.externalId)}`);
  }

  const tmdbType = type === 'series' ? 'tv' : 'movie';
  return fetchJson(`${KKPHIM_API}/tmdb/${tmdbType}/${encodeURIComponent(parsed.externalId)}`);
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

function dedupeByUrl(streams) {
  const seen = new Set();
  return streams.filter((stream) => {
    if (!stream.url || seen.has(stream.url)) return false;
    seen.add(stream.url);
    return true;
  });
}

function flattenStreams(payload, requestedEpisode) {
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

  return dedupeByUrl(streams);
}

async function getStreams(type, id) {
  if (!['movie', 'series'].includes(type)) return [];

  const parsed = parseVideoId(id);
  if (!parsed) return [];

  const payload = await fetchKKPhimTitle(type, parsed);
  if (!payload || payload.status === false) return [];

  const requestedEpisode = type === 'series' ? parsed.episode : null;
  return flattenStreams(payload, requestedEpisode);
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
    return res.end(`KKPhim Streams addon\nManifest: /manifest.json\n`);
  }

  const match = url.pathname.match(/^\/stream\/(movie|series)\/(.+)\.json$/);
  if (req.method === 'GET' && match) {
    const type = match[1];
    const id = decodeURIComponent(match[2]);

    try {
      const streams = await getStreams(type, id);
      console.log(`[KKPhim] ${type}/${id}: ${streams.length} stream(s)`);
      return sendJson(res, 200, { streams }, 300);
    } catch (error) {
      const message = error?.name === 'AbortError'
        ? 'upstream timeout'
        : error?.message || String(error);
      console.error(`[KKPhim] ${type}/${id}: ${message}`);
      return sendJson(res, 200, { streams: [] }, 60);
    }
  }

  return sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`KKPhim addon listening on port ${PORT}`);
  console.log(`Manifest: http://127.0.0.1:${PORT}/manifest.json`);
});
