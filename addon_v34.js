const http = require('node:http');
const { spawn } = require('node:child_process');

const PORT = Number(process.env.PORT || 7000);
const INNER_PORT = Number(process.env.INNER_PORT || 7002);
const SUBSENSE_MANIFEST_URL = String(process.env.SUBSENSE_MANIFEST_URL || '').trim();

function splitSubtitleAddonEntries(value) {
  return String(value || '')
    .split(/[\n,]/)
    .map(x => x.trim())
    .filter(Boolean);
}

function entryUrl(entry) {
  const i = String(entry || '').indexOf('|');
  return (i >= 0 ? entry.slice(i + 1) : entry).trim();
}

function uniqueSubtitleEntries(entries) {
  const seen = new Set();
  const out = [];
  for (const entry of entries) {
    const url = entryUrl(entry);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(entry);
  }
  return out;
}

let subtitleAddonEntries = uniqueSubtitleEntries(
  splitSubtitleAddonEntries(process.env.SUBTITLE_ADDON_URLS)
);

if (
  SUBSENSE_MANIFEST_URL &&
  !subtitleAddonEntries.some(entry => entryUrl(entry) === SUBSENSE_MANIFEST_URL)
) {
  subtitleAddonEntries.unshift(`SubSense|${SUBSENSE_MANIFEST_URL}`);
}

subtitleAddonEntries = uniqueSubtitleEntries(subtitleAddonEntries);

const childEnv = {
  ...process.env,
  PORT: String(INNER_PORT),
  SUBTITLE_ADDON_URLS: subtitleAddonEntries.join('\n')
};

const child = spawn(process.execPath, ['addon_v331.js'], {
  env: childEnv,
  stdio: ['ignore', 'inherit', 'inherit']
});

child.on('exit', (code, signal) => {
  console.error(`addon_v331 child exited: code=${code} signal=${signal}`);
  process.exit(code || 1);
});

function proxyRequest(req, res) {
  const upstream = http.request({
    hostname: '127.0.0.1',
    port: INNER_PORT,
    path: req.url,
    method: req.method,
    headers: req.headers
  }, upstreamRes => {
    const chunks = [];
    upstreamRes.on('data', chunk => chunks.push(chunk));
    upstreamRes.on('end', () => {
      const body = Buffer.concat(chunks);
      const contentType = String(upstreamRes.headers['content-type'] || '');
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

      if (!contentType.includes('application/json')) {
        res.writeHead(upstreamRes.statusCode || 200, upstreamRes.headers);
        return res.end(body);
      }

      try {
        const payload = JSON.parse(body.toString('utf8'));
        if (url.pathname === '/manifest.json') {
          payload.version = '3.4.0';
        } else if (url.pathname === '/') {
          payload.version = '3.4.0';
          payload.subSenseConfigured = Boolean(SUBSENSE_MANIFEST_URL);
          payload.subtitleSources = [
            ...new Set((payload.subtitleSources || []).filter(Boolean))
          ];
        }

        const json = JSON.stringify(payload);
        const headers = {
          ...upstreamRes.headers,
          'content-length': Buffer.byteLength(json),
          'content-type': 'application/json; charset=utf-8'
        };
        delete headers['transfer-encoding'];
        res.writeHead(upstreamRes.statusCode || 200, headers);
        return res.end(json);
      } catch {
        res.writeHead(upstreamRes.statusCode || 200, upstreamRes.headers);
        return res.end(body);
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

const server = http.createServer(proxyRequest);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Phim Việt + TorBox v3.4.0 listening on ${PORT}; core on ${INNER_PORT}`);
  console.log(`SubSense configured: ${Boolean(SUBSENSE_MANIFEST_URL)}`);
});

function shutdown(signal) {
  try { child.kill(signal); } catch {}
  process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
