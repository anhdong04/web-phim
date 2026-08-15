const base = require('./v634_yanhh3d');

function normCore(s = '') {
  return String(s)
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d')
    .toLowerCase()
    .replace(/\[[^\]]*\]|\([^)]*\)/g,' ')
    .replace(/\b(?:yanhh3d|hhdragon|vietsub|thuyet minh|thuyết minh|long tieng|lồng tiếng|4k|2160p|1440p|1080p|720p|fullhd|full hd|episode|ep|tap|tập)\b/gi,' ')
    .replace(/\b\d+(?:\.\d+)?\b/g,' ')
    .replace(/[^a-z0-9]+/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}
function tokens(s='') { return normCore(s).split(' ').filter(Boolean); }
function setMetrics(a='', b='') {
  const aa = new Set(tokens(a)), bb = new Set(tokens(b));
  if (!aa.size || !bb.size) return { overlap:0, coverageA:0, coverageB:0, dice:0 };
  let same = 0; for (const x of aa) if (bb.has(x)) same++;
  return {
    overlap:same,
    coverageA:same/aa.size,
    coverageB:same/bb.size,
    dice:(2*same)/(aa.size+bb.size)
  };
}
function episodeNum(s='') {
  const m = String(s).match(/(?:tập|tap|episode|ep)\s*[-:#.]?\s*(\d+(?:\.\d+)?)/i);
  return m ? Number(m[1]) : null;
}
function strongTitleMatch(target='', candidate='') {
  const a = normCore(target), b = normCore(candidate), m = setMetrics(a,b);
  if (!a || !b) return { ok:false, score:0, ...m, targetCore:a, candidateCore:b };
  const exact = a === b;
  const contains = a.length >= 8 && b.length >= 8 && (a.includes(b) || b.includes(a));
  // Require the actual series/movie name to match. Generic words such as episode number,
  // Vietsub/Thuyet minh and YanHH3D have already been removed above.
  const enough = exact || contains || (m.coverageA >= 0.75 && m.dice >= 0.70) || (m.coverageA >= 0.67 && m.coverageB >= 0.67 && m.overlap >= 3);
  const score = Math.round((m.dice*55 + m.coverageA*30 + m.coverageB*15) * 100) / 100;
  return { ok:enough, score, exact, contains, ...m, targetCore:a, candidateCore:b };
}

class YanHH3DProvider636 extends base.YanHH3DProvider {
  constructor(opts={}) {
    super(opts);
    this.lastDmMatch = null;
  }
  async searchDailymotionFallback(title, prefix='TM') {
    const target = String(title || '').trim();
    if (!target) return null;
    const targetEp = episodeNum(target);
    const targetCore = normCore(target);
    const query = [targetCore || target, targetEp != null ? 'Tập ' + targetEp : '', 'YanHH3D'].filter(Boolean).join(' ');
    let items = await this.dailymotionCandidatesFromApi(query);
    let method = 'api';
    if (!items.length) { items = await this.dailymotionCandidatesFromWeb(query); method = 'web'; }

    const evaluated = items.map(x => {
      const match = strongTitleMatch(target, x.title || '');
      const ep = episodeNum(x.title || '');
      const episodeOk = targetEp == null ? true : ep === targetEp;
      const ownerHint = /yan\s*hh\s*3d/i.test(String(x.owner || '')) || /yanhh3d|hhdragon/i.test(String(x.title || ''));
      const score = match.score + (episodeOk ? 25 : -100) + (ownerHint ? 8 : 0);
      return { ...x, match, ep, episodeOk, ownerHint, score };
    }).sort((a,b)=>b.score-a.score);

    const eligible = evaluated.filter(x => x.match.ok && x.episodeOk).slice(0,6);
    for (const x of eligible) {
      const link = await this.resolveDailymotion(x.url, prefix + ' - Dailymotion fallback');
      if (link) {
        this.lastDmMatch = {
          ok:true, method, target, targetCore, targetEpisode:targetEp,
          matchedTitle:x.title, candidateCore:x.match.candidateCore,
          titleScore:x.match.score, episode:x.ep, owner:x.owner || null
        };
        return { link, method, matchedTitle:x.title, score:Math.round(x.score), strictMatch:this.lastDmMatch };
      }
    }

    this.lastDmMatch = {
      ok:false, method, target, targetCore, targetEpisode:targetEp,
      rejected:evaluated.slice(0,5).map(x=>({ title:x.title, candidateCore:x.match.candidateCore, titleOk:x.match.ok, titleScore:x.match.score, episode:x.ep, episodeOk:x.episodeOk }))
    };
    return { link:null, method, candidates:this.lastDmMatch.rejected, strictMatch:this.lastDmMatch };
  }
  getDailymotionMatch() { return this.lastDmMatch; }
}

module.exports = {
  ...base,
  YanHH3DProvider:YanHH3DProvider636,
  createProvider:opts=>new YanHH3DProvider636(opts),
  normCore,
  strongTitleMatch
};
