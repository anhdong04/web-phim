module.exports = function applyV631(source) {
  const relayRe = /async function v626RelayResponse\(req, res, payload, sig\) \{[\s\S]*?\n\}\nfunction v625YanStreamObject/;
  if (!relayRe.test(source)) throw new Error('v6.3.1 patch target missing: YanHH3D relay response');

  const replacement = String.raw`const v631RelayStats = {
  startedAt: new Date().toISOString(),
  total: 0,
  byMethod: {},
  byKind: {},
  byStatus: {},
  byClient: {},
  recent: []
};
function v631Inc(obj, key) {
  const k = String(key || 'unknown');
  obj[k] = Number(obj[k] || 0) + 1;
}
function v631ClientFamily(ua = '') {
  const s = String(ua || '').toLowerCase();
  if (s.includes('libmpv') || /(^|[^a-z])mpv([^a-z]|$)/.test(s)) return 'mpv';
  if (s.includes('lavf') || s.includes('ffmpeg')) return 'ffmpeg';
  if (s.includes('android') || s.includes('iphone') || s.includes('ipad')) return 'mobile';
  if (s.includes('mozilla') || s.includes('chrome') || s.includes('safari') || s.includes('edge')) return 'browser';
  return s ? 'other' : 'unknown';
}
function v631RelayExt(req) {
  try {
    const p = new URL(req.url, 'http://localhost').pathname.toLowerCase();
    const m = p.match(/\.([a-z0-9]{1,10})$/);
    return m ? m[1] : 'none';
  } catch { return 'none'; }
}
function v631RecordRelay(req, info = {}) {
  const method = String(req.method || 'GET').toUpperCase();
  const kind = String(info.kind || 'unknown');
  const status = Number(info.status || 0) || 0;
  const client = v631ClientFamily(req.headers['user-agent']);
  v631RelayStats.total++;
  v631Inc(v631RelayStats.byMethod, method);
  v631Inc(v631RelayStats.byKind, kind);
  v631Inc(v631RelayStats.byStatus, status || 'error');
  v631Inc(v631RelayStats.byClient, client);
  v631RelayStats.recent.push({
    at: new Date().toISOString(),
    method,
    kind,
    ext: v631RelayExt(req),
    client,
    range: Boolean(req.headers.range),
    status,
    upstreamStatus: Number(info.upstreamStatus || 0) || 0,
    contentType: String(info.contentType || '').slice(0, 80),
    contentLength: String(info.contentLength || '').slice(0, 32),
    ms: Math.max(0, Number(info.ms || 0))
  });
  if (v631RelayStats.recent.length > 80) v631RelayStats.recent.splice(0, v631RelayStats.recent.length - 80);
}
function v631NormalizedMediaType(req, upstreamType = '') {
  const ext = v631RelayExt(req);
  if (ext === 'ts') return 'video/mp2t';
  if (ext === 'm4s' || ext === 'mp4') return 'video/mp4';
  if (ext === 'aac') return 'audio/aac';
  if (ext === 'vtt' || ext === 'webvtt') return 'text/vtt; charset=utf-8';
  if (ext === 'key' || ext === 'bin') return 'application/octet-stream';
  return String(upstreamType || 'application/octet-stream');
}
async function v631FetchUpstream(url, options, timeoutMs = 15000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, redirect: 'follow', signal: ctl.signal });
  } finally {
    clearTimeout(timer);
  }
}
async function v626RelayResponse(req, res, payload, sig) {
  const started = Date.now();
  const data = v626RelayDecode(payload, sig);
  if (!data) {
    v631RecordRelay(req, { kind:'invalid', status:403, ms:Date.now()-started });
    return sendJson(res, 403, { error: 'invalid or expired YanHH3D relay token' }, 0);
  }
  if (req.method === 'OPTIONS') {
    res.writeHead(204, v628CorsHeaders({ 'cache-control':'public, max-age=86400', 'x-web-phim-relay-version':'6.3.1' }));
    res.end();
    v631RecordRelay(req, { kind:'options', status:204, ms:Date.now()-started });
    return;
  }
  const method = String(req.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    res.writeHead(405, v628CorsHeaders({ 'allow':'GET, HEAD, OPTIONS', 'content-length':'0', 'x-web-phim-relay-version':'6.3.1' }));
    res.end();
    v631RecordRelay(req, { kind:'method', status:405, ms:Date.now()-started });
    return;
  }

  const signedHeaders = { ...(data.h || {}), 'Accept-Encoding':'identity' };
  const playlistHint = Boolean(data.p) || /\.m3u8(?:$|[?#])/i.test(String(data.u || ''));
  if (playlistHint) signedHeaders.Accept = 'application/vnd.apple.mpegurl,application/x-mpegURL,text/plain,*/*';

  // A rewritten playlist has different byte offsets from the upstream playlist,
  // so never forward a player Range request to the upstream playlist.
  if (!playlistHint && req.headers.range) signedHeaders.Range = req.headers.range;
  if (!playlistHint && req.headers['if-range']) signedHeaders['If-Range'] = req.headers['if-range'];
  if (req.headers['if-none-match']) signedHeaders['If-None-Match'] = req.headers['if-none-match'];

  let upstream;
  try {
    // For playlists we intentionally GET even on HEAD so the rewritten Content-Length is exact.
    // For media, preserve HEAD instead of accidentally opening a full GET as older relay versions did.
    upstream = await v631FetchUpstream(data.u, {
      method: playlistHint ? 'GET' : method,
      headers: signedHeaders
    });

    // Some media CDNs reject HEAD. Probe a single byte and synthesize a bodyless HEAD response.
    if (!playlistHint && method === 'HEAD' && (upstream.status === 403 || upstream.status === 405 || upstream.status === 501)) {
      try { upstream.body?.cancel?.(); } catch {}
      const probeHeaders = { ...signedHeaders, Range: req.headers.range || 'bytes=0-0' };
      upstream = await v631FetchUpstream(data.u, { method:'GET', headers:probeHeaders });
    }
  } catch (e) {
    v631RecordRelay(req, { kind:playlistHint?'playlist':'media', status:502, ms:Date.now()-started });
    return sendJson(res, 502, { error:'YanHH3D relay fetch failed', detail:String(e?.message || e).slice(0,180) }, 0);
  }

  const upstreamStatus = Number(upstream.status || 0);
  const upstreamType = String(upstream.headers.get('content-type') || '');
  const isPlaylist = playlistHint || /mpegurl|m3u8/i.test(upstreamType);

  if (upstreamStatus === 304) {
    const h = v628CorsHeaders({
      'cache-control':'public, max-age=300, no-transform',
      'x-web-phim-relay-version':'6.3.1'
    });
    const etag = upstream.headers.get('etag'); if (etag) h.etag = etag;
    res.writeHead(304, h); res.end();
    v631RecordRelay(req, { kind:isPlaylist?'playlist':'media', status:304, upstreamStatus, contentType:upstreamType, ms:Date.now()-started });
    return;
  }
  if (!upstream.ok && upstreamStatus !== 206) {
    try { upstream.body?.cancel?.(); } catch {}
    v631RecordRelay(req, { kind:isPlaylist?'playlist':'media', status:upstreamStatus || 502, upstreamStatus, contentType:upstreamType, ms:Date.now()-started });
    return sendJson(res, upstreamStatus || 502, { error:'YanHH3D upstream HTTP ' + upstreamStatus }, 0);
  }

  if (isPlaylist) {
    let body;
    try { body = await upstream.text(); }
    catch (e) {
      v631RecordRelay(req, { kind:'playlist', status:502, upstreamStatus, contentType:upstreamType, ms:Date.now()-started });
      return sendJson(res, 502, { error:'YanHH3D relay playlist read failed' }, 0);
    }
    if (!/#EXTM3U/i.test(body)) {
      v631RecordRelay(req, { kind:'playlist', status:502, upstreamStatus, contentType:upstreamType, ms:Date.now()-started });
      return sendJson(res, 502, { error:'YanHH3D relay expected HLS playlist' }, 0);
    }
    const rewritten = v626RewriteHls(body, upstream.url || data.u, data.h || {});
    const bytes = Buffer.from(rewritten, 'utf8');
    const out = v628CorsHeaders({
      'content-type':'application/vnd.apple.mpegurl; charset=utf-8',
      'content-length':String(bytes.length),
      'cache-control':'no-store, no-transform',
      'accept-ranges':'none',
      'x-content-type-options':'nosniff',
      'x-web-phim-relay-version':'6.3.1'
    });
    res.writeHead(200, out);
    if (method === 'HEAD') res.end(); else res.end(bytes);
    v631RecordRelay(req, { kind:'playlist', status:200, upstreamStatus, contentType:out['content-type'], contentLength:bytes.length, ms:Date.now()-started });
    return;
  }

  const relayType = v631NormalizedMediaType(req, upstreamType);
  const outHeaders = v628CorsHeaders({
    'content-type':relayType,
    'cache-control':'public, max-age=300, no-transform',
    'accept-ranges':upstream.headers.get('accept-ranges') || 'bytes',
    'x-content-type-options':'nosniff',
    'x-web-phim-relay-version':'6.3.1',
    'x-web-phim-upstream-content-type':upstreamType
  });
  for (const h of ['content-length','content-range','etag','last-modified']) {
    const v = upstream.headers.get(h); if (v) outHeaders[h] = v;
  }

  // If HEAD had to fall back to GET bytes=0-0, expose the full object size instead of length=1.
  let responseStatus = upstreamStatus;
  if (method === 'HEAD' && !req.headers.range && upstreamStatus === 206) {
    const cr = String(upstream.headers.get('content-range') || '');
    const total = cr.match(/\/([0-9]+)$/)?.[1];
    if (total) outHeaders['content-length'] = total;
    delete outHeaders['content-range'];
    responseStatus = 200;
  }

  res.writeHead(responseStatus, outHeaders);
  if (method === 'HEAD' || !upstream.body) {
    try { upstream.body?.cancel?.(); } catch {}
    res.end();
    v631RecordRelay(req, { kind:'media', status:responseStatus, upstreamStatus, contentType:relayType, contentLength:outHeaders['content-length'], ms:Date.now()-started });
    return;
  }

  let completed = false;
  try {
    for await (const chunk of upstream.body) {
      if (!res.write(chunk)) await new Promise(resolve => res.once('drain', resolve));
    }
    completed = true;
    res.end();
  } catch {
    try { res.destroy(); } catch {}
  } finally {
    v631RecordRelay(req, { kind:'media', status:completed?responseStatus:499, upstreamStatus, contentType:relayType, contentLength:outHeaders['content-length'], ms:Date.now()-started });
  }
}
function v625YanStreamObject`;
  source = source.replace(relayRe, replacement);

  const routeMarker = "  if (path === '/yanhh3d/manifest.json') return sendJson(res, 200, v625YanManifest(), 0);";
  if (!source.includes(routeMarker)) throw new Error('v6.3.1 patch target missing: YanHH3D route marker');
  source = source.replace(routeMarker, routeMarker + String.raw`
  if (path === '/yanhh3d/relay-stats') return sendJson(res, 200, {
    version:'6.3.1',
    startedAt:v631RelayStats.startedAt,
    total:v631RelayStats.total,
    byMethod:v631RelayStats.byMethod,
    byKind:v631RelayStats.byKind,
    byStatus:v631RelayStats.byStatus,
    byClient:v631RelayStats.byClient,
    recent:v631RelayStats.recent
  }, 0);`);

  source = source.replace("version: '1.1.0', name: '🐲 YanHH3D'", "version: '1.1.1', name: '🐲 YanHH3D'");
  source = source.replace("description: 'YanHH3D 1.1.0 • Nuvio Desktop compatibility • fresh playback identity • Thuyết minh/Vietsub streams'", "description: 'YanHH3D 1.1.1 • MPV-safe HEAD/Range relay • Thuyết minh/Vietsub streams'");
  source = source.replaceAll('6.3.0', '6.3.1');
  source = source.replaceAll('single-process-v6.3.0', 'single-process-v6.3.1');
  return source;
};
