const http = require('node:http');
const { spawn } = require('node:child_process');

const PORT = Number(process.env.PORT || 7000);
const INNER_PORT = Number(process.env.INNER_PORT || 7004);
const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
const TMDB_LANGUAGE = process.env.TMDB_LANGUAGE || 'vi-VN';
const SUBTITLE_STRICT_MATCHING = String(process.env.SUBTITLE_STRICT_MATCHING || 'true').toLowerCase() !== 'false';

const child = spawn(process.execPath, ['addon_v34.js'], {
  env: { ...process.env, PORT: String(INNER_PORT) },
  stdio: ['ignore', 'inherit', 'inherit']
});

child.on('exit', (code, signal) => {
  console.error(`addon_v34 child exited: code=${code} signal=${signal}`);
  process.exit(code || 1);
});

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
  return required.filter(t => have.has(t)).length / required.length;
}

function extractYears(text) {
  return [...String(text || '').matchAll(/\b(19\d{2}|20\d{2})\b/g)].map(m => Number(m[1]));
}

async function fetchJson(url) {
  const r = await fetch(url, { headers: { accept: 'application/json', 'user-agent': 'web-phim-v3/3.4.2' } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

function tmdbUrl(path, params = {}) {
  const u = new URL(`https://api.themoviedb.org/3${path}`);
  u.searchParams.set('api_key', TMDB_API_KEY);
  u.searchParams.set('language', TMDB_LANGUAGE);
  for (const [k,v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, String(v));
  return u.toString();
}

async function getIdentity(type, id) {
  let m = String(id).match(/^tmdb:(\d+)(?::(\d+))?(?::(\d+))?$/);
  let tmdbId = m?.[1];
  let season = Number(m?.[2]) || null;
  let episode = Number(m?.[3]) || null;

  if (!tmdbId) {
    m = String(id).match(/^(tt\d+)(?::(\d+))?(?::(\d+))?$/i);
    if (!m) return null;
    season = Number(m[2]) || null;
    episode = Number(m[3]) || null;
    const found = await fetchJson(tmdbUrl(`/find/${m[1]}`, { external_source: 'imdb_id' }));
    const item = type === 'movie' ? found.movie_results?.[0] : found.tv_results?.[0];
    tmdbId = item?.id;
  }
  if (!tmdbId) return null;

  const p = await fetchJson(tmdbUrl(type === 'movie' ? `/movie/${tmdbId}` : `/tv/${tmdbId}`));
  const title = type === 'movie' ? p.title : p.name;
  const originalTitle = type === 'movie' ? p.original_title : p.original_name;
  const date = type === 'movie' ? p.release_date : p.first_air_date;
  return {
    title: title || originalTitle || '',
    originalTitle: originalTitle || title || '',
    year: date ? Number(String(date).slice(0,4)) : null,
    season,
    episode
  };
}

function subtitleText(s) {
  return `${s.releaseName || ''} ${s.label || ''} ${s.id || ''}`;
}

function episodeMatches(text, season, episode) {
  if (!season || !episode) return true;
  const patterns = [
    /s(\d{1,2})e(\d{1,3})/i,
    /(\d{1,2})x(\d{1,3})/i,
    /season[ ._-]?(\d{1,2}).{0,12}episode[ ._-]?(\d{1,3})/i
  ];
  for (const p of patterns) {
    const m = String(text || '').match(p);
    if (m) return Number(m[1]) === season && Number(m[2]) === episode;
  }
  return true;
}

function isLikelyCorrectSubtitle(s, identity, type) {
  if (!identity) return true;
  const text = subtitleText(s);
  if (!text.trim()) return true;
  if (type === 'series' && !episodeMatches(text, identity.season, identity.episode)) return false;

  const years = extractYears(text);
  if (identity.year && years.length && !years.includes(identity.year)) return false;

  const candidate = normalizeText(text);
  const localized = normalizeText(identity.title);
  const original = normalizeText(identity.originalTitle);
  if ((localized && candidate.includes(localized)) || (original && candidate.includes(original))) return true;

  const coverage = Math.max(tokenCoverage(identity.title, text), tokenCoverage(identity.originalTitle, text));
  return coverage >= (SUBTITLE_STRICT_MATCHING ? 0.8 : 0.55);
}

function dedupe(subtitles) {
  const seen = new Set();
  return subtitles.filter(s => {
    const key = `${s.url || ''}|${s.lang || ''}`;
    if (!s.url || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseSubtitlePath(pathname) {
  const prefix = '/subtitles/';
  if (!pathname.startsWith(prefix) || !pathname.endsWith('.json')) return null;
  const rest = pathname.slice(prefix.length, -5);
  const slash = rest.indexOf('/');
  if (slash < 0) return null;
  const type = rest.slice(0, slash);
  if (type !== 'movie' && type !== 'series') return null;
  const idAndMaybeExtra = rest.slice(slash + 1);
  const id = idAndMaybeExtra.split('/')[0];
  return { type, id: decodeURIComponent(id) };
}

function proxyRequest(req, res) {
  const upstream = http.request({
    hostname: '127.0.0.1', port: INNER_PORT, path: req.url, method: req.method, headers: req.headers
  }, upstreamRes => {
    const chunks = [];
    upstreamRes.on('data', c => chunks.push(c));
    upstreamRes.on('end', async () => {
      const body = Buffer.concat(chunks);
      const contentType = String(upstreamRes.headers['content-type'] || '');
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const subReq = parseSubtitlePath(url.pathname);

      if (!contentType.includes('application/json')) {
        res.writeHead(upstreamRes.statusCode || 200, upstreamRes.headers);
        return res.end(body);
      }

      try {
        const payload = JSON.parse(body.toString('utf8'));
        let before = null;
        let after = null;

        if (url.pathname === '/manifest.json') {
          payload.version = '3.4.2';
        } else if (url.pathname === '/') {
          payload.version = '3.4.2';
          payload.subtitleStrictMatching = SUBTITLE_STRICT_MATCHING;
          payload.subtitleCache = 'no-store';
        } else if (subReq && Array.isArray(payload.subtitles) && TMDB_API_KEY) {
          before = payload.subtitles.length;
          const identity = await getIdentity(subReq.type, subReq.id).catch(() => null);
          payload.subtitles = dedupe(payload.subtitles.filter(s => isLikelyCorrectSubtitle(s, identity, subReq.type)));
          after = payload.subtitles.length;
        }

        const json = JSON.stringify(payload);
        const headers = {
          ...upstreamRes.headers,
          'content-length': Buffer.byteLength(json),
          'content-type': 'application/json; charset=utf-8',
          'x-web-phim-version': '3.4.2'
        };
        delete headers['transfer-encoding'];
        if (subReq) {
          headers['cache-control'] = 'no-store, no-cache, must-revalidate';
          headers['pragma'] = 'no-cache';
          headers['expires'] = '0';
          headers['x-subtitle-filter-applied'] = before === null ? 'false' : 'true';
          if (before !== null) headers['x-subtitle-count'] = `${before}->${after}`;
        }
        res.writeHead(upstreamRes.statusCode || 200, headers);
        res.end(json);
      } catch (e) {
        console.error('v3.4.2 proxy transform error:', e.message);
        res.writeHead(upstreamRes.statusCode || 200, {
          ...upstreamRes.headers,
          'x-web-phim-version': '3.4.2',
          ...(subReq ? { 'cache-control': 'no-store, no-cache, must-revalidate' } : {})
        });
        res.end(body);
      }
    });
  });

  upstream.on('error', () => {
    const json = JSON.stringify({ error: 'Internal proxy error' });
    res.writeHead(502, {
      'content-type': 'application/json; charset=utf-8',
      'content-length': Buffer.byteLength(json),
      'access-control-allow-origin': '*'
    });
    res.end(json);
  });
  req.pipe(upstream);
}

const server = http.createServer(proxyRequest);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Phim Việt + TorBox v3.4.2 listening on ${PORT}; core on ${INNER_PORT}`);
  console.log(`Subtitle strict matching: ${SUBTITLE_STRICT_MATCHING}; subtitle cache disabled`);
});

function shutdown(signal) {
  try { child.kill(signal); } catch {}
  process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
