const http = require('node:http');
const { spawn } = require('node:child_process');

const PORT = Number(process.env.PORT || 7000);
const INNER_PORT = Number(process.env.INNER_PORT || 7001);
const SUBTITLE_LANGUAGES = String(process.env.SUBTITLE_LANGUAGES || 'vie,vi,eng,en')
  .split(',')
  .map(x => x.trim().toLowerCase())
  .filter(Boolean);
const SUBTITLE_FALLBACK_ALL = String(process.env.SUBTITLE_FALLBACK_ALL || 'false').toLowerCase() === 'true';

const childEnv = { ...process.env, PORT: String(INNER_PORT) };
const child = spawn(process.execPath, ['addon_v33.js'], {
  env: childEnv,
  stdio: ['ignore', 'inherit', 'inherit']
});

child.on('exit', (code, signal) => {
  console.error(`addon_v33 child exited: code=${code} signal=${signal}`);
  process.exit(code || 1);
});

function subtitlePriority(lang) {
  const l = String(lang || '').toLowerCase();
  if (l === 'vie' || l === 'vi') return 0;
  if (l === 'eng' || l === 'en') return 1;
  return 10;
}

function filterSubtitlePayload(payload) {
  const all = Array.isArray(payload?.subtitles) ? payload.subtitles : [];
  const filtered = all.filter(s => SUBTITLE_LANGUAGES.includes(String(s?.lang || '').toLowerCase()));
  const chosen = filtered.length || !SUBTITLE_FALLBACK_ALL ? filtered : all;
  chosen.sort((a, b) => subtitlePriority(a.lang) - subtitlePriority(b.lang));
  return { ...payload, subtitles: chosen };
}

function proxyRequest(req, res) {
  const options = {
    hostname: '127.0.0.1',
    port: INNER_PORT,
    path: req.url,
    method: req.method,
    headers: req.headers
  };

  const upstream = http.request(options, upstreamRes => {
    const chunks = [];
    upstreamRes.on('data', chunk => chunks.push(chunk));
    upstreamRes.on('end', () => {
      const body = Buffer.concat(chunks);
      const contentType = String(upstreamRes.headers['content-type'] || '');
      const isJson = contentType.includes('application/json');
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

      if (!isJson) {
        res.writeHead(upstreamRes.statusCode || 200, upstreamRes.headers);
        return res.end(body);
      }

      try {
        let payload = JSON.parse(body.toString('utf8'));

        if (url.pathname.startsWith('/subtitles/')) {
          payload = filterSubtitlePayload(payload);
        } else if (url.pathname === '/manifest.json') {
          payload.version = '3.3.1';
        } else if (url.pathname === '/') {
          payload.version = '3.3.1';
          payload.subtitleLanguages = SUBTITLE_LANGUAGES;
          payload.subtitleFallbackAll = SUBTITLE_FALLBACK_ALL;
        }

        const json = JSON.stringify(payload);
        const headers = {
          ...upstreamRes.headers,
          'content-length': Buffer.byteLength(json),
          'content-type': 'application/json; charset=utf-8'
        };
        delete headers['transfer-encoding'];
        res.writeHead(upstreamRes.statusCode || 200, headers);
        res.end(json);
      } catch {
        res.writeHead(upstreamRes.statusCode || 200, upstreamRes.headers);
        res.end(body);
      }
    });
  });

  upstream.on('error', err => {
    console.error('proxy error:', err.message);
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

const server = http.createServer((req, res) => proxyRequest(req, res));

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Phim Việt + TorBox v3.3.1 listening on ${PORT}; core on ${INNER_PORT}`);
  console.log(`Subtitle languages: ${SUBTITLE_LANGUAGES.join(', ')}`);
});

function shutdown(signal) {
  try { child.kill(signal); } catch {}
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
