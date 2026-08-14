const http = require('node:http');
const { spawn } = require('node:child_process');

const PORT = Number(process.env.PORT || 7000);
const INNER_PORT = Number(process.env.INNER_PORT || 7005);
const MAX_SUBTITLES_PER_LANGUAGE = Number(process.env.MAX_SUBTITLES_PER_LANGUAGE || 8);
const SUBTITLE_PREFER_NON_HI = String(process.env.SUBTITLE_PREFER_NON_HI || 'true').toLowerCase() !== 'false';

const child = spawn(process.execPath, ['addon_v342.js'], {
  env: { ...process.env, PORT: String(INNER_PORT) },
  stdio: ['ignore', 'inherit', 'inherit']
});

child.on('exit', (code, signal) => {
  console.error(`addon_v342 child exited: code=${code} signal=${signal}`);
  process.exit(code || 1);
});

function normalizeText(v) {
  return String(v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(v) {
  const stop = new Set(['the','a','an','and','of','in','on','to','for','movie','film','sub','subtitle','vie','eng','srt']);
  return normalizeText(v).split(' ').filter(x => x.length > 1 && !stop.has(x));
}

function overlapScore(a, b) {
  const aa = tokens(a);
  if (!aa.length) return 0;
  const bb = new Set(tokens(b));
  return aa.filter(x => bb.has(x)).length / aa.length;
}

function subtitleText(s) {
  return `${s.releaseName || ''} ${s.label || ''} ${s.id || ''}`;
}

function resolution(text) {
  const t = String(text || '').toLowerCase();
  if (/2160p|4k|uhd/.test(t)) return 2160;
  if (/1440p|qhd/.test(t)) return 1440;
  if (/1080p|fhd/.test(t)) return 1080;
  if (/720p/.test(t)) return 720;
  if (/576p|480p|sd/.test(t)) return 480;
  return 0;
}

function isHI(s) {
  const t = ` ${subtitleText(s).toLowerCase()} `;
  return /(?:\bhi\b|hearing.?impaired|sdh)/i.test(t);
}

function sourceScore(s) {
  const src = String(s.source || s.id || '').toLowerCase();
  if (src.includes('subsource')) return 500;
  if (src.includes('subdl')) return 450;
  if (src.includes('opensubtitles')) return 350;
  if (src.includes('yify')) return 300;
  return 200;
}

function releaseQualityScore(text) {
  const t = String(text || '').toLowerCase();
  if (/remux/.test(t)) return 500;
  if (/blu.?ray|bluray|hddvd/.test(t)) return 420;
  if (/web[- .]?dl/.test(t)) return 340;
  if (/webrip/.test(t)) return 280;
  if (/brrip|bdrip/.test(t)) return 240;
  if (/dvdrip/.test(t)) return 180;
  return 100;
}

function languagePriority(lang) {
  const l = String(lang || '').toLowerCase();
  if (l === 'vie' || l === 'vi') return 2000;
  if (l === 'eng' || l === 'en') return 1000;
  return 0;
}

function parseTargetFilename(pathname) {
  const prefix = '/subtitles/';
  if (!pathname.startsWith(prefix) || !pathname.endsWith('.json')) return '';
  const rest = pathname.slice(prefix.length, -5);
  const parts = rest.split('/');
  if (parts.length < 3) return '';
  const raw = decodeURIComponent(parts.slice(2).join('/'));
  try {
    const params = new URLSearchParams(raw);
    return params.get('filename') || params.get('videoFilename') || '';
  } catch {
    return '';
  }
}

function rankScore(s, targetFilename) {
  const text = subtitleText(s);
  let score = languagePriority(s.lang) + sourceScore(s) + releaseQualityScore(text);

  if (SUBTITLE_PREFER_NON_HI && isHI(s)) score -= 350;

  if (targetFilename) {
    const overlap = overlapScore(targetFilename, text);
    score += Math.round(overlap * 5000);
    const targetRes = resolution(targetFilename);
    const subRes = resolution(text);
    if (targetRes && subRes) score += targetRes === subRes ? 1200 : -Math.min(Math.abs(targetRes - subRes), 1000);

    const targetNorm = normalizeText(targetFilename.replace(/\.(mkv|mp4|avi|mov|m4v)$/i, ''));
    const releaseNorm = normalizeText(s.releaseName || s.label || '');
    if (targetNorm && releaseNorm && (targetNorm.includes(releaseNorm) || releaseNorm.includes(targetNorm))) score += 2500;
  } else {
    const r = resolution(text);
    if (r === 2160) score += 180;
    else if (r === 1080) score += 160;
    else if (r === 720) score += 120;
  }

  return score;
}

function compactAndRank(subtitles, targetFilename) {
  const ranked = [...subtitles].sort((a, b) => rankScore(b, targetFilename) - rankScore(a, targetFilename));
  const counts = new Map();
  const seenRelease = new Set();
  const out = [];

  for (const s of ranked) {
    const lang = String(s.lang || '').toLowerCase();
    const count = counts.get(lang) || 0;
    if (count >= MAX_SUBTITLES_PER_LANGUAGE) continue;

    const releaseKey = `${lang}|${normalizeText(s.releaseName || s.label || s.url || s.id || '')}`;
    if (seenRelease.has(releaseKey)) continue;
    seenRelease.add(releaseKey);

    counts.set(lang, count + 1);
    out.push(s);
  }
  return out;
}

function proxyRequest(req, res) {
  const upstream = http.request({
    hostname: '127.0.0.1', port: INNER_PORT, path: req.url, method: req.method, headers: req.headers
  }, upstreamRes => {
    const chunks = [];
    upstreamRes.on('data', c => chunks.push(c));
    upstreamRes.on('end', () => {
      const body = Buffer.concat(chunks);
      const contentType = String(upstreamRes.headers['content-type'] || '');
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const isSubtitles = url.pathname.startsWith('/subtitles/');

      if (!contentType.includes('application/json')) {
        res.writeHead(upstreamRes.statusCode || 200, upstreamRes.headers);
        return res.end(body);
      }

      try {
        const payload = JSON.parse(body.toString('utf8'));
        let before = null;
        let after = null;
        let targetFilename = '';

        if (url.pathname === '/manifest.json') {
          payload.version = '3.4.3';
        } else if (url.pathname === '/') {
          payload.version = '3.4.3';
          payload.subtitleRanking = true;
          payload.maxSubtitlesPerLanguage = MAX_SUBTITLES_PER_LANGUAGE;
          payload.subtitlePreferNonHI = SUBTITLE_PREFER_NON_HI;
        } else if (isSubtitles && Array.isArray(payload.subtitles)) {
          before = payload.subtitles.length;
          targetFilename = parseTargetFilename(url.pathname);
          payload.subtitles = compactAndRank(payload.subtitles, targetFilename);
          after = payload.subtitles.length;
        }

        const json = JSON.stringify(payload);
        const headers = {
          ...upstreamRes.headers,
          'content-length': Buffer.byteLength(json),
          'content-type': 'application/json; charset=utf-8',
          'x-web-phim-version': '3.4.3'
        };
        delete headers['transfer-encoding'];
        if (isSubtitles) {
          headers['cache-control'] = 'no-store, no-cache, must-revalidate';
          headers['x-subtitle-ranking-applied'] = before === null ? 'false' : 'true';
          if (before !== null) headers['x-subtitle-ranking-count'] = `${before}->${after}`;
          headers['x-subtitle-target-filename'] = targetFilename ? 'present' : 'absent';
        }
        res.writeHead(upstreamRes.statusCode || 200, headers);
        res.end(json);
      } catch (e) {
        console.error('v3.4.3 proxy transform error:', e.message);
        res.writeHead(upstreamRes.statusCode || 200, upstreamRes.headers);
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
  console.log(`Phim Việt + TorBox v3.4.3 listening on ${PORT}; core on ${INNER_PORT}`);
  console.log(`Subtitle ranking enabled; max ${MAX_SUBTITLES_PER_LANGUAGE}/language; prefer non-HI: ${SUBTITLE_PREFER_NON_HI}`);
});

function shutdown(signal) {
  try { child.kill(signal); } catch {}
  process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
