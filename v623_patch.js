module.exports = function applyV623(source) {
  const apiCom = "const V610_HH3D_API_HOST = String(process.env.HH3D_PIKPAK_API_HOST || 'api-drive.mypikpak.com');";
  const userCom = "const V610_HH3D_USER_HOST = String(process.env.HH3D_PIKPAK_USER_HOST || 'user.mypikpak.com');";
  if (source.includes(apiCom)) source = source.replace(apiCom, "const V610_HH3D_API_HOST = String(process.env.HH3D_PIKPAK_API_HOST || 'api-drive.mypikpak.net');");
  if (source.includes(userCom)) source = source.replace(userCom, "const V610_HH3D_USER_HOST = String(process.env.HH3D_PIKPAK_USER_HOST || 'user.mypikpak.net');");

  const rootBlockRe = /async function v622RootItems\(force = false\) \{[\s\S]*?\n\}\nasync function v622CatalogEntries\(force = false\) \{/;
  if (!rootBlockRe.test(source)) throw new Error('v6.2.3 patch target missing: v622RootItems');

  const replacement = [
    "async function v623ListDir(parentId = '') {",
    "  if (!v610Hh3d) return [];",
    "  const client = v610Hh3d.newClient();",
    "  await v622Timeout(client.initShare(v610Hh3d.shareId), 4500, 'PikPak share init timeout');",
    "  let pageToken = '', pages = 0, items = [];",
    "  do {",
    "    const resp = await v622Timeout(client.getShareDetail(v610Hh3d.shareId, parentId || '', pageToken), 8000, 'PikPak share/detail timeout');",
    "    v610Hh3d.validateShareStatus(resp);",
    "    for (const f of resp.files || []) {",
    "      if (f.kind === 'drive#folder') items.push({ kind: 'folder', id: String(f.id || ''), name: String(f.name || ''), parentId: parentId || '' });",
    "      else if (v622VideoFile(f)) items.push({ kind: 'video', id: String(f.id || ''), name: String(f.name || ''), size: Number(f.size || 0), parentId: parentId || '' });",
    "    }",
    "    pageToken = resp.next_page_token || ''; pages += 1;",
    "  } while (pageToken && pages < 20);",
    "  return items;",
    "}",
    "async function v622RootItems(force = false) {",
    "  if (!v610Hh3d) return []; const now = Date.now(); if (!force && v622RootCache.value && v622RootCache.expiresAt > now) return v622RootCache.value;",
    "  let items = await v623ListDir(''); let resolvedParentId = '';",
    "  const rootFolders = items.filter(x => x.kind === 'folder'), rootVideos = items.filter(x => x.kind === 'video');",
    "  if (rootFolders.length === 1 && rootVideos.length === 0) {",
    "    try { const nested = await v623ListDir(rootFolders[0].id); if (nested.length) { items = nested; resolvedParentId = rootFolders[0].id; } } catch (e) { console.error('HH3D wrapper folder:', e.message); }",
    "  }",
    "  v622RootCache.value = items; v622RootCache.parentId = resolvedParentId; v622RootCache.ignoredUiParentId = String(v610Hh3d.rootParentId || ''); v622RootCache.expiresAt = now + V610_HH3D_CACHE_TTL_MS; return items;",
    "}",
    "async function v622CatalogEntries(force = false) {"
  ].join('\n');
  source = source.replace(rootBlockRe, replacement);

  source = source.replaceAll(
    "parentId: v610Hh3d.rootParentId || null,",
    "ignoredUiParentId: v610Hh3d.rootParentId || null, resolvedContainerParentId: v622RootCache.parentId || null,"
  );

  source = source.replace("version: '1.0.2',", "version: '1.0.3',");
  source = source.replace("description: 'HH3D standalone addon 1.0.2 • PikPak catalog + direct streams',", "description: 'HH3D standalone addon 1.0.3 • PikPak root-first catalog + direct streams',");
  source = source.replaceAll('6.2.2', '6.2.3');
  source = source.replaceAll('single-process-v6.2.2', 'single-process-v6.2.3');
  return source;
};
