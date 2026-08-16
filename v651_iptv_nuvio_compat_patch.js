module.exports = function applyV651IptvNuvioCompat(source) {
  const manifestTypes = "      types: ['tv'],";
  const manifestCatalog = "        { type: 'tv', id: 'iptvorg', name: 'IPTV-org Live TV', extra }";
  const catalogHead = "  if (path.startsWith('/iptv/catalog/tv/iptvorg')) {\n    let tail = path.slice('/iptv/catalog/tv/iptvorg'.length);";
  const catalogPage = "      const page = channels.slice(extra.skip, extra.skip + V650_IPTV_PAGE).map(v650IptvCatalogMeta);";
  const metaHead = "  if (path.startsWith('/iptv/meta/tv/')) {\n    const id = decodeURIComponent(path.slice('/iptv/meta/tv/'.length).replace(/\\.json$/i, ''));";
  const metaReturn = "    return sendJson(res, 200, { meta: v650IptvIdMeta(channel) }, 60);";
  const streamHead = "  if (path.startsWith('/iptv/stream/tv/')) {\n    const id = decodeURIComponent(path.slice('/iptv/stream/tv/'.length).replace(/\\.json$/i, ''));";

  for (const marker of [manifestTypes, manifestCatalog, catalogHead, catalogPage, metaHead, metaReturn, streamHead]) {
    if (!source.includes(marker)) throw new Error('v6.5.1 IPTV compatibility patch target missing');
  }

  source = source.replace(manifestTypes, "      types: ['tv', 'movie'],");
  source = source.replace(
    manifestCatalog,
    "        { type: 'tv', id: 'iptvorg', name: 'IPTV-org Live TV', extra },\n        { type: 'movie', id: 'iptvorg', name: 'IPTV-org Live TV (Compatible)', extra }"
  );
  source = source.replace(
    catalogHead,
    "  if (path.startsWith('/iptv/catalog/tv/iptvorg') || path.startsWith('/iptv/catalog/movie/iptvorg')) {\n    const v650CatalogPrefix = path.startsWith('/iptv/catalog/movie/') ? '/iptv/catalog/movie/iptvorg' : '/iptv/catalog/tv/iptvorg';\n    let tail = path.slice(v650CatalogPrefix.length);"
  );
  source = source.replace(
    catalogPage,
    "      const v650OutType = path.startsWith('/iptv/catalog/movie/') ? 'movie' : 'tv';\n      const page = channels.slice(extra.skip, extra.skip + V650_IPTV_PAGE).map(c => { const m = v650IptvCatalogMeta(c); m.type = v650OutType; return m; });"
  );
  source = source.replace(
    metaHead,
    "  if (path.startsWith('/iptv/meta/tv/') || path.startsWith('/iptv/meta/movie/')) {\n    const v650MetaPrefix = path.startsWith('/iptv/meta/movie/') ? '/iptv/meta/movie/' : '/iptv/meta/tv/';\n    const id = decodeURIComponent(path.slice(v650MetaPrefix.length).replace(/\\.json$/i, ''));"
  );
  source = source.replace(
    metaReturn,
    "    const v650Meta = v650IptvIdMeta(channel);\n    v650Meta.type = path.startsWith('/iptv/meta/movie/') ? 'movie' : 'tv';\n    return sendJson(res, 200, { meta: v650Meta }, 60);"
  );
  source = source.replace(
    streamHead,
    "  if (path.startsWith('/iptv/stream/tv/') || path.startsWith('/iptv/stream/movie/')) {\n    const v650StreamPrefix = path.startsWith('/iptv/stream/movie/') ? '/iptv/stream/movie/' : '/iptv/stream/tv/';\n    const id = decodeURIComponent(path.slice(v650StreamPrefix.length).replace(/\\.json$/i, ''));"
  );
  source = source.replace("      version: '1.0.1',", "      version: '1.0.2',");
  return source;
};
