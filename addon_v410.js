// Web Phim v4.1.0 launcher: keeps the v4 server single-process while adding
// provider health/latency, circuit breaker, TMDB RAM cache, and metadata fallback.
const fs = require('node:fs');

let source = fs.readFileSync(require.resolve('./addon_v4.js'), 'utf8');

// Keep the v4.0.1 configure-page fix.
const configureBroken = "btoa(bin).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,'')";
const configureFixed = "btoa(bin).split('+').join('-').split('/').join('_').replace(/=+$/,'')";
if (source.includes(configureBroken)) source = source.replace(configureBroken, configureFixed);

const envMarker = "const SUBSENSE_MANIFEST_URL = String(process.env.SUBSENSE_MANIFEST_URL || '').trim();";
if (!source.includes(envMarker)) {
  console.error('v4.1 patch target missing: environment marker');
  process.exit(1);
}
source = source.replace(envMarker, `${envMarker}

const TMDB_CACHE_TTL_MS = Number(process.env.TMDB_CACHE_TTL_MS || 1800000);
const CIRCUIT_FAILURE_THRESHOLD = Number(process.env.CIRCUIT_FAILURE_THRESHOLD || 3);
const CIRCUIT_COOLDOWN_MS = Number(process.env.CIRCUIT_COOLDOWN_MS || 300000);
const HEALTH_TIMEOUT_MS = Number(process.env.HEALTH_TIMEOUT_MS || 6000);
const v410TmdbCache = new Map();
const v410Circuits = new Map();
const v410Stats = new Map();
const v410CacheStats = { hits: 0, misses: 0, stores: 0 };

function v410ProviderKey(label, url) {
  const l = String(label || '').trim();
  if (/^TMDB/i.test(l) || String(url || '').includes('api.themoviedb.org')) return 'TMDB';
  return l || 'upstream';
}

function v410Circuit(name) {
  if (!v410Circuits.has(name)) v410Circuits.set(name, { failures: 0, openUntil: 0 });
  return v410Circuits.get(name);
}

function v410Record(name, ok, latencyMs, error) {
  const c = v410Circuit(name);
  if (ok) {
    c.failures = 0;
    c.openUntil = 0;
  } else {
    c.failures += 1;
    if (c.failures >= CIRCUIT_FAILURE_THRESHOLD) c.openUntil = Date.now() + CIRCUIT_COOLDOWN_MS;
  }
  v410Stats.set(name, {
    ok,
    latencyMs,
    failures: c.failures,
    circuitOpen: c.openUntil > Date.now(),
    retryAfterMs: Math.max(0, c.openUntil - Date.now()),
    lastError: error ? String(error).slice(0, 160) : undefined,
    checkedAt: new Date().toISOString()
  });
}

function v410CacheGet(url) {
  const entry = v410TmdbCache.get(url);
  if (!entry) { v410CacheStats.misses += 1; return null; }
  if (entry.expiresAt <= Date.now()) { v410TmdbCache.delete(url); v410CacheStats.misses += 1; return null; }
  v410CacheStats.hits += 1;
  return entry.value;
}

function v410CacheSet(url, value) {
  if (v410TmdbCache.size > 1500) {
    const first = v410TmdbCache.keys().next().value;
    if (first) v410TmdbCache.delete(first);
  }
  v410TmdbCache.set(url, { value, expiresAt: Date.now() + TMDB_CACHE_TTL_MS });
  v410CacheStats.stores += 1;
}

async function v410ProbeOne(name, url) {
  if (!url) return { name, configured: false, ok: false, status: 'not-configured' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  const start = Date.now();
  try {
    const r = await fetch(url, { headers: { accept: 'application/json', 'user-agent': 'web-phim-v4/4.1.0-health' }, signal: controller.signal });
    const latencyMs = Date.now() - start;
    const ok = r.ok;
    v410Record(name, ok, latencyMs, ok ? null : 'HTTP ' + r.status);
    return { name, configured: true, ok, status: r.status, latencyMs, circuit: v410Stats.get(name) };
  } catch (e) {
    const latencyMs = Date.now() - start;
    v410Record(name, false, latencyMs, e.message);
    return { name, configured: true, ok: false, status: e.name === 'AbortError' ? 'timeout' : 'error', latencyMs, circuit: v410Stats.get(name) };
  } finally { clearTimeout(timer); }
}

async function v410HealthSnapshot() {
  const probes = [];
  if (TMDB_API_KEY) probes.push(['TMDB', tmdbUrl('/configuration')]);
  probes.push(['KKPhim', KKPHIM_API + '/danh-sach/phim-moi-cap-nhat?page=1']);
  for (const s of configuredUpstreams()) probes.push([s.name, s.url]);
  for (const s of configuredSubtitleSources()) probes.push([s.name, s.url]);

  const unique = new Map();
  for (const [name, url] of probes) if (!unique.has(name)) unique.set(name, url);
  const providers = await Promise.all([...unique].map(([name, url]) => v410ProbeOne(name, url)));
  return {
    version: '4.1.0',
    checkedAt: new Date().toISOString(),
    providers,
    cache: { type: 'memory', entries: v410TmdbCache.size, ttlMs: TMDB_CACHE_TTL_MS, ...v410CacheStats },
    circuitBreaker: { failureThreshold: CIRCUIT_FAILURE_THRESHOLD, cooldownMs: CIRCUIT_COOLDOWN_MS }
  };
}`);

const fetchRe = /async function fetchJson\(url, label = 'upstream'\) \{[\s\S]*?\n\}\n\nfunction tmdbUrl/;
if (!fetchRe.test(source)) {
  console.error('v4.1 patch target missing: fetchJson');
  process.exit(1);
}
source = source.replace(fetchRe, `async function fetchJson(url, label = 'upstream') {
  const provider = v410ProviderKey(label, url);
  const isTmdb = provider === 'TMDB';
  if (isTmdb && TMDB_CACHE_TTL_MS > 0) {
    const cached = v410CacheGet(url);
    if (cached !== null) return cached;
  }

  const circuit = v410Circuit(provider);
  if (circuit.openUntil > Date.now()) {
    const err = new Error(provider + ' circuit open');
    err.code = 'CIRCUIT_OPEN';
    throw err;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const start = Date.now();
  try {
    const r = await fetch(url, { headers: { accept: 'application/json', 'user-agent': 'web-phim-v4/4.1.0' }, signal: controller.signal });
    if (!r.ok) throw new Error(label + ' HTTP ' + r.status);
    const data = await r.json();
    v410Record(provider, true, Date.now() - start);
    if (isTmdb && TMDB_CACHE_TTL_MS > 0) v410CacheSet(url, data);
    return data;
  } catch (e) {
    v410Record(provider, false, Date.now() - start, e.message);
    throw e;
  } finally { clearTimeout(timer); }
}

function tmdbUrl`);

const statusMarker = 'function statusPayload(cfg, configured) {';
if (!source.includes(statusMarker)) {
  console.error('v4.1 patch target missing: statusPayload');
  process.exit(1);
}
source = source.replace(statusMarker, `async function getMetaWithFallback(type, id) {
  const meta = await getMeta(type, id);
  if (!meta || (meta.name && meta.description)) return meta;
  const m = String(id).match(/^tmdb:(\\d+)$/);
  if (!m) return meta;
  try {
    const path = type === 'movie' ? '/movie/' + m[1] : '/tv/' + m[1];
    const p = await fetchJson(tmdbUrl(path, { language: 'en-US' }), 'TMDB fallback');
    if (!meta.name) meta.name = type === 'movie' ? (p.title || p.original_title) : (p.name || p.original_name);
    if (!meta.description && p.overview) meta.description = p.overview;
  } catch {}
  return meta;
}

${statusMarker}`);

const manifestRoute = "if (path === '/manifest.json') return sendJson(res, 200, buildManifest(), 300);";
if (!source.includes(manifestRoute)) {
  console.error('v4.1 patch target missing: manifest route');
  process.exit(1);
}
source = source.replace(manifestRoute, `if (path === '/status') {
    try { return sendJson(res, 200, await v410HealthSnapshot(), 0); }
    catch (e) { return sendJson(res, 200, { version: '4.1.0', error: e.message }, 0); }
  }
  ${manifestRoute}`);

const metaRouteOld = "{ meta: await getMeta(m[1], decodeURIComponent(m[2])) }";
if (!source.includes(metaRouteOld)) {
  console.error('v4.1 patch target missing: meta route');
  process.exit(1);
}
source = source.replace(metaRouteOld, "{ meta: await getMetaWithFallback(m[1], decodeURIComponent(m[2])) }");

source = source.replace(
  "configureSupported: true, configuredManifest: configured, streamPreset:",
  "configureSupported: true, healthSupported: true, tmdbMemoryCache: true, circuitBreaker: true, configuredManifest: configured, streamPreset:"
);
source = source.replaceAll('4.0.0', '4.1.0');
source = source.replace("architecture: 'single-process-v4'", "architecture: 'single-process-v4.1'");

eval(source);
