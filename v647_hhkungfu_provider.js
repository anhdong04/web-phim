const base = require('./v645_hhkungfu');
const native = require('./v647_hhkungfu_resolver');

async function streams(id) {
  const parsed = base.slugFromId(id);
  if (!parsed?.slug || !parsed?.chapter) return [];

  const watchUrl = `${base.BASE}/watch-${parsed.slug}/${parsed.chapter}-sv1.html`;

  // Native first: when Streamfree/Helvid can be resolved, Nuvio gets a real HLS URL.
  try {
    const hls = await native.resolveHls(watchUrl, `${parsed.slug}|${parsed.chapter}|1`);
    if (hls) {
      return [{
        name: '🐉 HHKungfu • Vietsub',
        title: '1080P HLS • Vietsub',
        url: hls,
        description: 'HHKungfu • native HLS',
        behaviorHints: {
          bingeGroup: 'hhkungfu-native-1',
          notWebReady: false,
          proxyHeaders: { request: { Referer: 'https://streamfree.vip/' } }
        }
      }];
    }
  } catch (e) {
    console.error('HHKungfu native resolver failed; using fallback:', e.message);
  }

  // Never turn a valid HHKungfu episode into "No sources found" just because
  // Streamfree anti-bot blocks the native extractor. Keep the canonical watch
  // page as an explicit fallback while the native resolver is being improved.
  return [{
    name: '🐉 HHKungfu • Fallback',
    title: 'Vietsub • HHKungfu',
    externalUrl: watchUrl,
    description: 'Nguồn dự phòng HHKungfu • native HLS tạm thời chưa resolve được',
    behaviorHints: {
      bingeGroup: 'hhkungfu-fallback-1',
      notWebReady: true
    }
  }];
}

module.exports = {
  ...base,
  streams,
  resolveHls: native.resolveHls
};
