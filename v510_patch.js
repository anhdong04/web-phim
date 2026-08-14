module.exports = function applyV510(source) {
  // Web Phim v5.1: storage health + protected backup/restore.
  const adminRequire = "const v500AdminPage = require('./v500_admin_page');";
  if (!source.includes(adminRequire)) throw new Error('v5.1 patch target missing: v5 admin require');
  source = source.replace(adminRequire, adminRequire + "\nconst v510AdminPage = require('./v510_admin_page');");

  const snapshotMarker = 'async function v500AdminSnapshot(token){';
  if (!source.includes(snapshotMarker)) throw new Error('v5.1 patch target missing: v5 admin snapshot');
  const helpers = [
    "const V510_BACKUP_MAX_BYTES = Math.max(65536, Math.min(16777216, Number(process.env.BACKUP_MAX_BYTES || 4194304)));",
    "function v510Iso(value, fallback = null) { const ms = Date.parse(String(value || '')); return Number.isFinite(ms) ? new Date(ms).toISOString() : fallback; }",
    "async function v510StorageHealth() {",
    "  if (!v500Persistent) return { mode: 'memory', persistent: false, configured: false, ok: true, latencyMs: 0 };",
    "  const start = Date.now();",
    "  try { const pong = await v500Redis(['PING']); return { mode: 'upstash', persistent: true, configured: true, ok: String(pong || '').toUpperCase() === 'PONG', latencyMs: Date.now() - start }; }",
    "  catch (e) { return { mode: 'upstash', persistent: true, configured: true, ok: false, latencyMs: Date.now() - start, error: String(e?.message || e).slice(0, 180) }; }",
    "}",
    "async function v510BackupPayload() {",
    "  const [settings, shares, invites] = await Promise.all([v500GetSettings(), v500ListShares(), v500ListInvites()]);",
    "  return { format: 'webphim-backup', schemaVersion: 1, appVersion: '5.1.0', exportedAt: new Date().toISOString(), settings: { publicSignup: !!settings.publicSignup }, shares, invites };",
    "}",
    "function v510NormalizeShare(raw) {",
    "  const id = String(raw?.id || '').trim(); if (!/^[A-Za-z0-9_-]{5,32}$/.test(id)) throw new Error('Invalid shared link id: ' + id);",
    "  const now = new Date().toISOString(); const requests = Math.max(0, Math.min(1000000000000, Math.floor(Number(raw?.requests || 0))));",
    "  return { id, name: String(raw?.name || ('Web Phim ' + id)).trim().slice(0, 80) || ('Web Phim ' + id), enabled: raw?.enabled !== false, config: sanitizeConfig(raw?.config || {}), createdAt: v510Iso(raw?.createdAt, now), updatedAt: now, lastUsedAt: v510Iso(raw?.lastUsedAt, null), requests, expiresAt: v510Iso(raw?.expiresAt, null), inviteCode: raw?.inviteCode ? v500InviteCode(raw.inviteCode) : null };",
    "}",
    "function v510NormalizeInvite(raw) {",
    "  const code = v500InviteCode(raw?.code); if (!code) throw new Error('Invalid invite code'); const now = new Date().toISOString();",
    "  return { code, enabled: raw?.enabled !== false, maxUses: Math.max(0, Math.min(1000000000, Math.floor(Number(raw?.maxUses || 0)))), used: Math.max(0, Math.min(1000000000, Math.floor(Number(raw?.used || 0)))), createdAt: v510Iso(raw?.createdAt, now), lastUsedAt: v510Iso(raw?.lastUsedAt, null), expiresAt: v510Iso(raw?.expiresAt, null) };",
    "}",
    "async function v510ReadJson(req, maxBytes = V510_BACKUP_MAX_BYTES) {",
    "  let body = ''; let bytes = 0; for await (const chunk of req) { bytes += chunk.length; if (bytes > maxBytes) throw Object.assign(new Error('Backup quá lớn'), { statusCode: 413 }); body += chunk.toString('utf8'); }",
    "  if (!body) return {}; try { return JSON.parse(body); } catch { throw Object.assign(new Error('Backup JSON không hợp lệ'), { statusCode: 400 }); }",
    "}",
    "async function v510RestoreBackup(backup, mode = 'merge') {",
    "  if (!backup || backup.format !== 'webphim-backup' || Number(backup.schemaVersion) !== 1) throw Object.assign(new Error('Không đúng định dạng Web Phim backup'), { statusCode: 400 });",
    "  const rawShares = Array.isArray(backup.shares) ? backup.shares : []; const rawInvites = Array.isArray(backup.invites) ? backup.invites : [];",
    "  if (rawShares.length > 5000 || rawInvites.length > 1000) throw Object.assign(new Error('Backup chứa quá nhiều bản ghi'), { statusCode: 400 });",
    "  const shareMap = new Map(); for (const raw of rawShares) { const s = v510NormalizeShare(raw); shareMap.set(s.id, s); }",
    "  const inviteMap = new Map(); for (const raw of rawInvites) { const i = v510NormalizeInvite(raw); inviteMap.set(i.code, i); }",
    "  const restoreMode = mode === 'replace' ? 'replace' : 'merge';",
    "  if (restoreMode === 'replace') { const [oldShares, oldInvites] = await Promise.all([v500ListShares(), v500ListInvites()]); for (const s of oldShares) await v500DeleteShare(s.id); for (const i of oldInvites) await v500DeleteInvite(i.code); }",
    "  for (const s of shareMap.values()) await v500SetShare(s); for (const i of inviteMap.values()) await v500SetInvite(i);",
    "  if (backup.settings && typeof backup.settings === 'object') await v500SetSettings({ publicSignup: !!backup.settings.publicSignup });",
    "  v500ShareCache.clear();",
    "  return { mode: restoreMode, shares: shareMap.size, invites: inviteMap.size };",
    "}",
    "async function v510HandleBackup(req, res) {",
    "  if (!ADMIN_TOKEN) return sendJson(res, 503, { error: 'ADMIN_TOKEN is not configured' }, 0); if (!v440TokenOk(req.headers['x-admin-token'])) return sendJson(res, 401, { error: 'Invalid admin token' }, 0);",
    "  try { return sendJson(res, 200, await v510BackupPayload(), 0, { 'content-disposition': 'attachment; filename=webphim-backup.json' }); } catch (e) { return sendJson(res, 500, { error: String(e?.message || e) }, 0); }",
    "}",
    "async function v510HandleRestore(req, res) {",
    "  if (!ADMIN_TOKEN) return sendJson(res, 503, { error: 'ADMIN_TOKEN is not configured' }, 0); if (!v440TokenOk(req.headers['x-admin-token'])) return sendJson(res, 401, { error: 'Invalid admin token' }, 0);",
    "  try { const data = await v510ReadJson(req); const result = await v510RestoreBackup(data.backup || data, data.mode); return sendJson(res, 200, { ok: true, message: 'Restore hoàn tất', ...result }, 0); } catch (e) { return sendJson(res, e.statusCode || 500, { error: String(e?.message || e) }, 0); }",
    "}",
    "async function v510AdminSnapshot(token) { const base = await v500AdminSnapshot(token); base.version = '5.1.0'; base.architecture = 'single-process-v5.1'; base.backupSupported = true; base.backupMaxBytes = V510_BACKUP_MAX_BYTES; if (base.authorized) base.storageHealth = await v510StorageHealth(); return base; }",
    "",
    snapshotMarker
  ].join('\n');
  source = source.replace(snapshotMarker, helpers);

  const adminPageRoute = "if (path === '/admin') return sendHtml(res, v500AdminPage());";
  if (!source.includes(adminPageRoute)) throw new Error('v5.1 patch target missing: admin page route');
  source = source.replace(adminPageRoute, "if (path === '/admin') return sendHtml(res, v510AdminPage());");

  const adminApiRoute = "if (path === '/admin/api') return sendJson(res, 200, await v500AdminSnapshot(req.headers['x-admin-token']), 0);";
  if (!source.includes(adminApiRoute)) throw new Error('v5.1 patch target missing: admin api route');
  source = source.replace(adminApiRoute, "if (path === '/admin/api') return sendJson(res, 200, await v510AdminSnapshot(req.headers['x-admin-token']), 0);");

  const adminActionRoute = "if (path === '/admin/action') { if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' }, 0, { allow: 'POST' }); return v500HandleAdminAction(req, res); }";
  if (!source.includes(adminActionRoute)) throw new Error('v5.1 patch target missing: admin action route');
  source = source.replace(adminActionRoute, [
    adminActionRoute,
    "  if (path === '/admin/backup') { if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed' }, 0, { allow: 'GET' }); return v510HandleBackup(req, res); }",
    "  if (path === '/admin/restore') { if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method not allowed' }, 0, { allow: 'POST' }); return v510HandleRestore(req, res); }"
  ].join('\n  '));

  source = source.replaceAll('5.0.0', '5.1.0');
  source = source.replaceAll("single-process-v5'", "single-process-v5.1'");
  return source;
};
