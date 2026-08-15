module.exports = function applyV641(source) {
  const manifestRoute = "if (path === '/manifest.json') return sendJson(res, 200, buildManifest(), 300);";
  if (!source.includes(manifestRoute)) throw new Error('v6.4.1 patch target missing: root manifest route');
  source = source.replace(
    manifestRoute,
    "if (path === '/manifest.json' || path === '/full/manifest.json') return sendJson(res, 200, buildManifest(), 300);"
  );

  // Give the already-unified root addon a clear one-install identity.
  source = source.replace("name: 'Phim Việt + TorBox'", "name: '🎬 Web Phim Full'");
  source = source.replace(
    "description: 'TMDB Việt + KKPhim + smart-ranked debrid streams + multi-source subtitles'",
    "description: 'Một addon duy nhất: TMDB Việt + KKPhim + HH3D + YanHH3D + debrid streams + phụ đề đa nguồn'"
  );

  // Expose the full manifest in the landing/status hints when those strings are present.
  source = source.replaceAll('6.4.0', '6.4.1');
  source = source.replaceAll('single-process-v6.4.0', 'single-process-v6.4.1');
  return source;
};
