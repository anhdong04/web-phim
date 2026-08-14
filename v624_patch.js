module.exports = function applyV624(source) {
  const lookupRe = /async function v610Hh3dLookupTmdb\(group\) \{[\s\S]*?\n\}\nasync function v610Hh3dCatalog\(type, extra = \{\}\) \{/;
  if (!lookupRe.test(source)) throw new Error('v6.2.4 patch target missing: HH3D TMDB lookup');

  const replacement = String.raw`function v624NormTitle(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function v624TitleVariants(value) {
  const raw = String(value || '').normalize('NFKC').replace(/\s+/g, ' ').trim();
  if (!raw) return [];
  let clean = raw
    .replace(/^\s*(?:2D|3D)\s+/i, '')
    .replace(/\b(?:4K|UHD|2160P|1080P|720P|60FPS|120FPS|HDR10?|HEVC|X265|H265|H\.265|VIETSUB)\b/gi, ' ')
    .replace(/\b(?:SUB\s*VIỆT|THUYẾT\s*MINH)\b/gi, ' ')
    .replace(/#+/g, ' ')
    .replace(/[|_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const withoutYear = clean.replace(/\s*[\[(]?(?:19|20)\d{2}[\])]?\s*$/i, '').trim();
  const withoutDashSuffix = clean.replace(/\s+[-–—]\s+[^-–—]{2,40}$/u, '').trim();
  const withoutSeason = clean.replace(/\s+(?:PHẦN|SEASON|SS)\s*\d+\s*$/i, '').trim();
  const rawClean = raw.replace(/#+/g, ' ').replace(/\s+/g, ' ').trim();
  return [...new Set([clean, withoutYear, withoutDashSuffix, withoutSeason, rawClean, raw].filter(x => x && x.length >= 2))].slice(0, 5);
}
function v624Similarity(a, b) {
  const x = v624NormTitle(a), y = v624NormTitle(b);
  if (!x || !y) return 0;
  if (x === y) return 100;
  if (x.includes(y) || y.includes(x)) {
    const ratio = Math.min(x.length, y.length) / Math.max(x.length, y.length);
    return 82 + Math.round(ratio * 12);
  }
  const xa = [...new Set(x.split(' ').filter(Boolean))], ya = [...new Set(y.split(' ').filter(Boolean))];
  const ys = new Set(ya), overlap = xa.filter(t => ys.has(t)).length;
  if (!overlap) return 0;
  const coverage = overlap / Math.max(xa.length, ya.length);
  const containment = overlap / Math.min(xa.length, ya.length);
  let score = coverage * 68 + containment * 22;
  if (x.split(' ')[0] === y.split(' ')[0]) score += 6;
  return Math.min(99, Math.round(score));
}
function v624CandidateScore(hit, variants) {
  const names = [hit?.name, hit?.original_name].filter(Boolean);
  let score = 0;
  for (const q of variants) for (const name of names) score = Math.max(score, v624Similarity(q, name));
  if (hit?.poster_path) score += 3;
  else if (hit?.backdrop_path) score += 1;
  return Math.min(103, score);
}
async function v624SearchTv(query) {
  try {
    const p = await fetchJson(tmdbUrl('/search/tv', { query, page: 1, include_adult: 'false' }), 'TMDB HH3D artwork');
    return Array.isArray(p?.results) ? p.results : [];
  } catch { return []; }
}
function v624FallbackPosterUrl(title) {
  const origin = String(process.env.PUBLIC_BASE_URL || process.env.RENDER_EXTERNAL_URL || 'https://web-phim-zwsx.onrender.com').replace(/\/+$/, '');
  return origin + '/hh3d/poster/' + v622Enc(title) + '.svg';
}
function v624Xml(value) {
  return String(value || '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;' }[ch]));
}
function v624PosterSvg(title) {
  const raw = String(title || 'HH3D').trim(), words = raw.split(/\s+/), lines = [];
  let line = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length > 18 && line) { lines.push(line); line = word; }
    else line = (line + ' ' + word).trim();
  }
  if (line) lines.push(line);
  const shown = lines.slice(0, 4);
  const text = shown.map((x, i) => '<text x="300" y="' + (500 + i * 70) + '" text-anchor="middle" font-family="Arial, sans-serif" font-size="42" font-weight="700" fill="white">' + v624Xml(x) + '</text>').join('');
  return '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 600 900"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#111827"/><stop offset="1" stop-color="#4c1d95"/></linearGradient></defs><rect width="600" height="900" rx="28" fill="url(#g)"/><text x="300" y="250" text-anchor="middle" font-family="Arial, sans-serif" font-size="92">🐉</text><text x="300" y="350" text-anchor="middle" font-family="Arial, sans-serif" font-size="48" font-weight="800" fill="#f5d0fe">HH3D</text>' + text + '</svg>';
}
async function v610Hh3dLookupTmdb(group) {
  if (!group?.id) return null;
  if (v610Hh3dTmdbCache.has(group.id)) return v610Hh3dTmdbCache.get(group.id);
  const variants = v624TitleVariants(group.title);
  let best = null, bestScore = 0;
  for (const query of variants.slice(0, 3)) {
    const results = await v624SearchTv(query);
    for (const hit of results.slice(0, 12)) {
      const score = v624CandidateScore(hit, variants);
      if (score > bestScore) { best = hit; bestScore = score; }
    }
    if (bestScore >= 98 && (best?.poster_path || best?.backdrop_path)) break;
  }
  if (bestScore < 58) best = null;
  if (best && !best.poster_path && best.backdrop_path) best = { ...best, poster_path: best.backdrop_path, _hh3dBackdropAsPoster: true };
  if (best) best = { ...best, _hh3dMatchScore: bestScore, _hh3dQuery: variants[0] || group.title };
  v610Hh3dTmdbCache.set(group.id, best);
  return best;
}
async function v610Hh3dCatalog(type, extra = {}) {`;
  source = source.replace(lookupRe, replacement);

  const catalogHit = "if (hit) { const p = toPreview(hit, 'series'); return { ...p, id, type: 'series', name: p.name || item.name, description: p.description || '🐉 HH3D / PikPak' }; }";
  const catalogFallback = "return { id, type: 'series', name: item.name, description: '🐉 HH3D / PikPak' };";
  if (!source.includes(catalogHit) || !source.includes(catalogFallback)) throw new Error('v6.2.4 patch target missing: standalone catalog artwork');
  source = source.replace(catalogHit, "if (hit) { const p = toPreview(hit, 'series'); return { ...p, poster: p.poster || v624FallbackPosterUrl(item.name), background: p.background || p.poster || v624FallbackPosterUrl(item.name), id, type: 'series', name: p.name || item.name, description: p.description || '🐉 HH3D / PikPak' }; }");
  source = source.replace(catalogFallback, "return { id, type: 'series', name: item.name, poster: v624FallbackPosterUrl(item.name), background: v624FallbackPosterUrl(item.name), description: '🐉 HH3D / PikPak' };");

  source = source.replace(
    "return { meta: { ...(base || {}), id: 'hh3d:f:' + m[1], type: 'series', name: base?.name || item.name, description: base?.description || ('Nguồn HH3D từ PikPak • ' + files.length + ' video'), videos, behaviorHints: { ...(base?.behaviorHints || {}), defaultVideoId: videos[0]?.id } } };",
    "return { meta: { ...(base || {}), id: 'hh3d:f:' + m[1], type: 'series', name: base?.name || item.name, poster: base?.poster || v624FallbackPosterUrl(item.name), background: base?.background || base?.poster || v624FallbackPosterUrl(item.name), description: base?.description || ('Nguồn HH3D từ PikPak • ' + files.length + ' video'), videos, behaviorHints: { ...(base?.behaviorHints || {}), defaultVideoId: videos[0]?.id } } };"
  );
  source = source.replace(
    "return { meta: { ...(base || {}), id: 'hh3d:r:' + m[1], type: 'series', name: base?.name || title, description: base?.description || ('Nguồn HH3D từ PikPak • ' + files.length + ' video'), videos, behaviorHints: { ...(base?.behaviorHints || {}), defaultVideoId: videos[0]?.id } } };",
    "return { meta: { ...(base || {}), id: 'hh3d:r:' + m[1], type: 'series', name: base?.name || title, poster: base?.poster || v624FallbackPosterUrl(title), background: base?.background || base?.poster || v624FallbackPosterUrl(title), description: base?.description || ('Nguồn HH3D từ PikPak • ' + files.length + ' video'), videos, behaviorHints: { ...(base?.behaviorHints || {}), defaultVideoId: videos[0]?.id } } };"
  );

  const manifestRoute = "  if (path === '/hh3d/manifest.json') return sendJson(res, 200, v620Hh3dStandaloneManifest(), 0);";
  if (!source.includes(manifestRoute)) throw new Error('v6.2.4 patch target missing: HH3D manifest route');
  source = source.replace(manifestRoute, [
    manifestRoute,
    "  let v624PosterMatch = path.match(/^\\/hh3d\\/poster\\/([A-Za-z0-9_-]+)\\.svg$/);",
    "  if (v624PosterMatch) { const title = v622Dec(v624PosterMatch[1]) || 'HH3D'; const body = v624PosterSvg(title); res.writeHead(200, { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': 'public, max-age=86400', 'access-control-allow-origin': '*' }); res.end(body); return; }"
  ].join('\n'));

  source = source.replace("version: '1.0.3',", "version: '1.0.4',");
  source = source.replace("description: 'HH3D standalone addon 1.0.3 • PikPak root-first catalog + direct streams',", "description: 'HH3D standalone addon 1.0.4 • Smart TMDB artwork matching + PikPak streams',");
  source = source.replaceAll('6.2.3', '6.2.4');
  source = source.replaceAll('single-process-v6.2.3', 'single-process-v6.2.4');
  return source;
};
