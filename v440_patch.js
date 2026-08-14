module.exports = function applyV440(source) {
  // v4.4 Admin Dashboard + runtime metrics + protected control API.
  const httpMarker = "const http = require('node:http');";
  if (!source.includes(httpMarker)) throw new Error('v4.4 patch target missing: http require');
  source = source.replace(httpMarker, httpMarker + "\nconst crypto = require('node:crypto');\nconst v440AdminPage = require('./v440_admin_page');");

  const v430Marker = "const V430_DEFAULT_HOME_ROWS = ['home-hot','home-top10','home-new-movies','home-new-series','home-animation','home-korean','home-horror','home-action'];";
  if (!source.includes(v430Marker)) throw new Error('v4.4 patch target missing: v4.3 constants');
  const adminConstants = [
    "const ADMIN_TOKEN = String(process.env.ADMIN_TOKEN || '');",
    "const V440_STARTED_AT = Date.now();",
    "const v440Metrics = {",
    "  total: 0,",
    "  methods: { GET: 0, POST: 0, OTHER: 0 },",
    "  routes: { root: 0, configure: 0, catalog: 0, meta: 0, stream: 0, subtitles: 0, status: 0, admin: 0, manifest: 0, other: 0 },",
    "  errors: { catalog: 0, meta: 0, stream: 0, subtitles: 0, admin: 0 },",
    "  lastAction: null",
    "};",
    "const v440ProviderCounters = new Map();",
    "",
    v430Marker
  ].join('\n');
  source = source.replace(v430Marker, adminConstants);

  // Track provider calls/timeouts from the common fetch path.
  const fetchSuccess = "    const data = await r.json();\n    v410Record(provider, true, Date.now() - start);";
  if (!source.includes(fetchSuccess)) throw new Error('v4.4 patch target missing: fetch success');
  source = source.replace(fetchSuccess, "    const data = await r.json();\n    const latencyMs = Date.now() - start;\n    v410Record(provider, true, latencyMs);\n    v440ProviderSuccess(provider, latencyMs);");

  const fetchFailure = "    v410Record(provider, false, Date.now() - start, e.message);\n    throw e;";
  if (!source.includes(fetchFailure)) throw new Error('v4.4 patch target missing: fetch failure');
  source = source.replace(fetchFailure, "    v440ProviderFailure(provider, e);\n    v410Record(provider, false, Date.now() - start, e.message);\n    throw e;");

  // Route-level error counters.
  for (const kind of ['catalog', 'meta', 'stream', 'subtitles']) {
    const oldText = `console.error('${kind}:', e.message);`;
    if (!source.includes(oldText)) throw new Error(`v4.4 patch target missing: ${kind} error`);
    source = source.replace(oldText, `v440RouteError('${kind}', e); ${oldText}`);
  }

  // Runtime/admin helpers are injected immediately before the HTTP server.
  const serverMarker = 'const server = http.createServer(async (req, res) => {';
  if (!source.includes(serverMarker)) throw new Error('v4.4 patch target missing: server');
  const helpers = [
    "function v440ProviderCounter(name) {",
    "  if (!v440ProviderCounters.has(name)) v440ProviderCounters.set(name, { calls: 0, successes: 0, errors: 0, timeouts: 0, lastLatencyMs: null, totalLatencyMs: 0 });",
    "  return v440ProviderCounters.get(name);",
    "}",
    "function v440ProviderSuccess(name, latencyMs) {",
    "  const s = v440ProviderCounter(name); s.calls += 1; s.successes += 1; s.lastLatencyMs = latencyMs; s.totalLatencyMs += Number(latencyMs || 0);",
    "}",
    "function v440ProviderFailure(name, error) {",
    "  const s = v440ProviderCounter(name); s.calls += 1; s.errors += 1; if (error?.name === 'AbortError' || /timeout|aborted/i.test(String(error?.message || ''))) s.timeouts += 1;",
    "}",
    "function v440RouteName(path) {",
    "  if (path === '/') return 'root'; if (path === '/configure') return 'configure'; if (path === '/manifest.json') return 'manifest';",
    "  if (path.startsWith('/catalog/')) return 'catalog'; if (path.startsWith('/meta/')) return 'meta'; if (path.startsWith('/stream/')) return 'stream'; if (path.startsWith('/subtitles/')) return 'subtitles';",
    "  if (path.startsWith('/status')) return 'status'; if (path.startsWith('/admin')) return 'admin'; return 'other';",
    "}",
    "function v440TrackRequest(path, method) {",
    "  v440Metrics.total += 1; const m = method === 'GET' || method === 'POST' ? method : 'OTHER'; v440Metrics.methods[m] += 1; const r = v440RouteName(path); v440Metrics.routes[r] = (v440Metrics.routes[r] || 0) + 1;",
    "}",
    "function v440RouteError(kind) { if (Object.prototype.hasOwnProperty.call(v440Metrics.errors, kind)) v440Metrics.errors[kind] += 1; }",
    "function v440CachePayload(cache, stats, ttlMs) { return { entries: cache.size, ttlMs, hits: stats.hits || 0, misses: stats.misses || 0, stores: stats.stores || 0 }; }",
    "function v440AdminSnapshot() {",
    "  const mem = process.memoryUsage(), names = new Set(['TMDB','KKPhim']);",
    "  for (const x of configuredUpstreams()) names.add(x.name); for (const x of configuredSubtitleSources()) names.add(x.name); for (const k of v410Stats.keys()) names.add(k); for (const k of v440ProviderCounters.keys()) names.add(k);",
    "  const providers = [...names].map(name => { const runtime = v410Stats.get(name) || {}, circuit = v410Circuit(name), calls = v440ProviderCounters.get(name) || {}; return { name, ok: runtime.ok, latencyMs: runtime.latencyMs ?? calls.lastLatencyMs ?? null, calls: calls.calls || 0, successes: calls.successes || 0, errors: calls.errors || 0, timeouts: calls.timeouts || 0, failures: circuit.failures || 0, circuitOpen: circuit.openUntil > Date.now(), retryAfterMs: Math.max(0, circuit.openUntil - Date.now()), checkedAt: runtime.checkedAt }; });",
    "  return {",
    "    version: '4.4.0', architecture: 'single-process-v4.4', startedAt: new Date(V440_STARTED_AT).toISOString(), uptimeSeconds: Math.floor(process.uptime()),",
    "    node: process.version, platform: process.platform, memory: { rss: mem.rss, heapUsed: mem.heapUsed, heapTotal: mem.heapTotal, external: mem.external },",
    "    requests: { total: v440Metrics.total, methods: { ...v440Metrics.methods }, routes: { ...v440Metrics.routes } }, errors: { ...v440Metrics.errors }, providers,",
    "    caches: { tmdb: v440CachePayload(v410TmdbCache, v410CacheStats, TMDB_CACHE_TTL_MS), identity: v440CachePayload(v430IdentityCache, v430IdentityStats, IDENTITY_CACHE_TTL_MS) },",
    "    circuits: [...v410Circuits.entries()].map(([name,c]) => ({ name, failures: c.failures || 0, circuitOpen: c.openUntil > Date.now(), retryAfterMs: Math.max(0, c.openUntil - Date.now()) })),",
    "    streamLoading: { budgetMs: STREAM_RESPONSE_BUDGET_MS, earlyResultCount: STREAM_EARLY_RESULT_COUNT },",
    "    admin: { writeEnabled: Boolean(ADMIN_TOKEN), lastAction: v440Metrics.lastAction }",
    "  };",
    "}",
    "function v440TokenOk(value) {",
    "  if (!ADMIN_TOKEN) return false; const expected = Buffer.from(ADMIN_TOKEN), actual = Buffer.from(String(value || '')); return expected.length === actual.length && expected.length > 0 && crypto.timingSafeEqual(expected, actual);",
    "}",
    "async function v440ReadJson(req) {",
    "  let body = ''; for await (const chunk of req) { body += chunk.toString('utf8'); if (Buffer.byteLength(body) > 8192) throw new Error('Request body too large'); } if (!body) return {}; try { return JSON.parse(body); } catch { throw new Error('Invalid JSON'); }",
    "}",
    "function v440SetLastAction(action) { v440Metrics.lastAction = { action, at: new Date().toISOString() }; }",
    "function v440ResetCircuits() {",
    "  for (const c of v410Circuits.values()) { c.failures = 0; c.openUntil = 0; } for (const [name,s] of v410Stats.entries()) v410Stats.set(name, { ...s, failures: 0, circuitOpen: false, retryAfterMs: 0 });",
    "}",
    "function v440ResetMetrics() {",
    "  v440Metrics.total = 0; v440Metrics.methods = { GET: 0, POST: 0, OTHER: 0 }; v440Metrics.routes = { root: 0, configure: 0, catalog: 0, meta: 0, stream: 0, subtitles: 0, status: 0, admin: 0, manifest: 0, other: 0 }; v440Metrics.errors = { catalog: 0, meta: 0, stream: 0, subtitles: 0, admin: 0 }; v440ProviderCounters.clear();",
    "}",
    "async function v440HandleAdminAction(req, res) {",
    "  if (!ADMIN_TOKEN) return sendJson(res, 503, { error: 'ADMIN_TOKEN is not configured' }, 0);",
    "  if (!v440TokenOk(req.headers['x-admin-token'])) { v440Metrics.errors.admin += 1; return sendJson(res, 401, { error: 'Invalid admin token' }, 0); }",
    "  let data; try { data = await v440ReadJson(req); } catch (e) { v440Metrics.errors.admin += 1; return sendJson(res, 400, { error: e.message }, 0); }",
    "  const action = String(data.action || '');",
    "  try {",
    "    if (action === 'clear-tmdb-cache') { const count = v410TmdbCache.size; v410TmdbCache.clear(); v440SetLastAction(action); return sendJson(res, 200, { ok: true, message: 'Đã xóa ' + count + ' TMDB cache entries' }, 0); }",
    "    if (action === 'clear-identity-cache') { const count = v430IdentityCache.size; v430IdentityCache.clear(); v440SetLastAction(action); return sendJson(res, 200, { ok: true, message: 'Đã xóa ' + count + ' identity cache entries' }, 0); }",
    "    if (action === 'clear-all-cache') { const count = v410TmdbCache.size + v430IdentityCache.size; v410TmdbCache.clear(); v430IdentityCache.clear(); v440SetLastAction(action); return sendJson(res, 200, { ok: true, message: 'Đã xóa ' + count + ' cache entries' }, 0); }",
    "    if (action === 'reset-circuits') { v440ResetCircuits(); v440SetLastAction(action); return sendJson(res, 200, { ok: true, message: 'Đã reset toàn bộ circuit breaker' }, 0); }",
    "    if (action === 'refresh-health') { const health = await v410HealthSnapshot(); v440SetLastAction(action); return sendJson(res, 200, { ok: true, message: 'Health check hoàn tất', health }, 0); }",
    "    if (action === 'reset-metrics') { v440ResetMetrics(); v440SetLastAction(action); return sendJson(res, 200, { ok: true, message: 'Đã reset request/provider metrics' }, 0); }",
    "    v440Metrics.errors.admin += 1; return sendJson(res, 400, { error: 'Unknown admin action' }, 0);",
    "  } catch (e) { v440Metrics.errors.admin += 1; return sendJson(res, 500, { error: String(e.message || e) }, 0); }",
    "}",
    "",
    serverMarker
  ].join('\n');
  source = source.replace(serverMarker, helpers);

  // CORS preflight must allow the protected POST action endpoint.
  const methodsOld = "'access-control-allow-methods': 'GET,OPTIONS'";
  if (!source.includes(methodsOld)) throw new Error('v4.4 patch target missing: OPTIONS methods');
  source = source.replace(methodsOld, "'access-control-allow-methods': 'GET,POST,OPTIONS'");

  // Add routes after path/cfg/origin have been resolved.
  const manifestRoute = "if (path === '/manifest.json') return sendJson(res, 200, buildManifest(cfg), 300);";
  if (!source.includes(manifestRoute)) throw new Error('v4.4 patch target missing: manifest route');
  const adminRoutes = [
    "v440TrackRequest(path, req.method);",
    "  if (path === '/admin') return sendHtml(res, v440AdminPage());",
    "  if (path === '/admin/api') return sendJson(res, 200, v440AdminSnapshot(), 0);",
    "  if (path === '/admin/action') { if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' }, 0, { allow: 'POST' }); return v440HandleAdminAction(req, res); }",
    "  " + manifestRoute
  ].join('\n  ');
  source = source.replace(manifestRoute, adminRoutes);

  // Advertise the feature in the root status payload without exposing the token.
  const statusFeature = "metadataEnrichment: true, statusUI: true,";
  if (!source.includes(statusFeature)) throw new Error('v4.4 patch target missing: status feature marker');
  source = source.replace(statusFeature, "metadataEnrichment: true, statusUI: true, adminDashboard: true, adminWriteEnabled: Boolean(ADMIN_TOKEN), runtimeMetrics: true,");

  source = source.replaceAll('4.3.0', '4.4.0');
  source = source.replace("architecture: 'single-process-v4.3'", "architecture: 'single-process-v4.4'");
  return source;
};
