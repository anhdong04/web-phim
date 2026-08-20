'use strict';

const { HH4KProvider } = require('./hh4k_provider');

const fallbackProvider = new HH4KProvider({
  mainUrl: process.env.HH4K_MAIN_URL || 'https://hhtq.sh',
  timeoutMs: Math.min(12000, Math.max(4000, Number(process.env.HHTQ_FALLBACK_TIMEOUT_MS || 9000))),
  cacheTtlMs: 180000
});

function normTitle(value) {
  return String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(?:movie|ova|vietsub|thuyet minh|long tieng|4k|1080p?)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function titleScore(query, candidate) {
  const a = normTitle(query), b = normTitle(candidate);
  if (!a || !b) return 0;
  if (a === b) return 100;
  if (a.includes(b) || b.includes(a)) return 85;
  const aa = new Set(a.split(' ')), bb = new Set(b.split(' '));
  let common = 0;
  for (const x of aa) if (bb.has(x)) common += 1;
  return Math.round((common / Math.max(aa.size, bb.size, 1)) * 70);
}
function pickBest(query, items) {
  return (items || [])
    .map(item => ({ item, score: titleScore(query, item?.title) }))
    .sort((x, y) => y.score - x.score)[0] || null;
}
function episodeIndexFor(sourceEpisode, fallbackEpisodes) {
  const episodes = fallbackEpisodes || [];
  if (!episodes.length) return -1;
  const n = Number(sourceEpisode?.number);
  if (Number.isFinite(n)) {
    const exact = episodes.findIndex(ep => Number(ep?.number) === n);
    if (exact >= 0) return exact;
  }
  const label = normTitle(sourceEpisode?.name || '');
  if (label) {
    const exact = episodes.findIndex(ep => normTitle(ep?.name || '') === label);
    if (exact >= 0) return exact;
  }
  return 0;
}
async function resolveFallback(title, sourceEpisode) {
  const q = String(title || '').trim();
  if (!q) return [];
  try {
    const items = await fallbackProvider.search(q);
    const best = pickBest(q, items);
    if (!best || best.score < 55 || !best.item?.detailUrl) return [];
    const detail = await fallbackProvider.loadDetail(best.item.detailUrl);
    const idx = episodeIndexFor(sourceEpisode, detail?.episodes || []);
    const ep = (detail?.episodes || [])[idx];
    if (!ep?.watchUrl) return [];
    const links = await fallbackProvider.resolveStreamLinks(ep.watchUrl);
    return (links || [])
      .filter(link => link?.url && /^https?:\/\//i.test(link.url))
      .map(link => ({
        ...link,
        externalUrl: null,
        serverName: `HHTQ • Fallback ${link.serverName || '4K'}`
      }))
      .slice(0, 6);
  } catch (error) {
    console.warn('[hhtq] HH4K fallback failed:', String(error?.message || error).slice(0, 220));
    return [];
  }
}

module.exports = { normTitle, titleScore, pickBest, episodeIndexFor, resolveFallback };
