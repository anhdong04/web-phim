module.exports = function applyV621(source) {
  const apiHostOld = "const V610_HH3D_API_HOST = String(process.env.HH3D_PIKPAK_API_HOST || 'api-drive.mypikpak.com');";
  const userHostOld = "const V610_HH3D_USER_HOST = String(process.env.HH3D_PIKPAK_USER_HOST || 'user.mypikpak.com');";
  if (!source.includes(apiHostOld) || !source.includes(userHostOld)) throw new Error('v6.2.1 patch target missing: PikPak hosts');
  source = source.replace(apiHostOld, "const V610_HH3D_API_HOST = String(process.env.HH3D_PIKPAK_API_HOST || 'api-drive.mypikpak.net');");
  source = source.replace(userHostOld, "const V610_HH3D_USER_HOST = String(process.env.HH3D_PIKPAK_USER_HOST || 'user.mypikpak.net');");

  const initMarker = "if (V610_HH3D_ENABLED && V610_HH3D_SHARE_URL) { try { v610Hh3d = v610PikPak.createProvider({ shareUrl: V610_HH3D_SHARE_URL, password: V610_HH3D_PASSWORD, apiHost: V610_HH3D_API_HOST, userHost: V610_HH3D_USER_HOST, timeoutMs: V610_HH3D_TIMEOUT_MS, cacheTtlMs: V610_HH3D_CACHE_TTL_MS, directTtlMs: V610_HH3D_DIRECT_TTL_MS, maxFiles: V610_HH3D_MAX_FILES, useTranscoding: V610_HH3D_USE_TRANSCODING }); } catch (e) { console.error('HH3D init:', e.message); } }";
  if (!source.includes(initMarker)) throw new Error('v6.2.1 patch target missing: HH3D provider init');
  const initFixed = [
    initMarker,
    "if (v610Hh3d) {",
    "  const v621InitialParentId = String(v610Hh3d.rootParentId || '');",
    "  const v621OriginalScanAllFiles = v610Hh3d.scanAllFiles.bind(v610Hh3d);",
    "  v610Hh3d.scanAllFiles = async function(client) {",
    "    let rootError = null;",
    "    try { this.rootParentId = ''; const files = await v621OriginalScanAllFiles(client); if (files.length || !v621InitialParentId) return files; } catch (e) { rootError = e; }",
    "    if (v621InitialParentId) { try { this.rootParentId = v621InitialParentId; return await v621OriginalScanAllFiles(client); } catch {} finally { this.rootParentId = ''; } }",
    "    if (rootError) throw rootError; return [];",
    "  };",
    "  v610Hh3d.rootParentId = '';",
    "}"
  ].join('\n');
  source = source.replace(initMarker, initFixed);

  const requestMarker = "  if (path === '/hh3d/manifest.json') return sendJson(res, 200, v620Hh3dStandaloneManifest(), 0);";
  if (!source.includes(requestMarker)) throw new Error('v6.2.1 patch target missing: standalone manifest route');
  const diagRoute = [
    requestMarker,
    "  if (path === '/hh3d/diag') {",
    "    if (!v610Hh3d) return sendJson(res, 200, { version: '6.2.1', ok: false, stage: 'init', error: 'HH3D provider unavailable', apiHost: V610_HH3D_API_HOST, userHost: V610_HH3D_USER_HOST }, 0);",
    "    try {",
    "      const files = await v610Hh3d.listFiles(true);",
    "      const groups = await v610Hh3d.groups();",
    "      return sendJson(res, 200, { version: '6.2.1', ok: files.length > 0, stage: files.length ? 'ready' : 'scan', apiHost: V610_HH3D_API_HOST, userHost: V610_HH3D_USER_HOST, fileCount: files.length, groupCount: groups.length, sample: files.slice(0, 5).map(x => ({ name: x.name, path: x.path, size: x.size, season: x.season, episode: x.episode })) }, 0);",
    "    } catch (e) {",
    "      return sendJson(res, 200, { version: '6.2.1', ok: false, stage: 'pikpak', apiHost: V610_HH3D_API_HOST, userHost: V610_HH3D_USER_HOST, error: String(e?.message || e).slice(0, 500) }, 0);",
    "    }",
    "  }"
  ].join('\n');
  source = source.replace(requestMarker, diagRoute);

  source = source.replace("version: '1.0.0',", "version: '1.0.1',");
  source = source.replace("description: 'HH3D standalone addon • PikPak catalog + direct streams',", "description: 'HH3D standalone addon 1.0.1 • PikPak catalog + direct streams',");
  source = source.replaceAll('6.2.0', '6.2.1');
  source = source.replaceAll('single-process-v6.2', 'single-process-v6.2.1');
  return source;
};
