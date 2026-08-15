const base = require('./v645_hhkungfu');
const native = require('./v647_hhkungfu_resolver');

async function streams(id) {
  const parsed = base.slugFromId(id);
  if (!parsed?.slug || !parsed?.chapter) return [];

  // HHKungfu's canonical Vietsub watch route. Keep sv1 first for native validation;
  // thuyet-minh can be added after the native path proves stable in clients.
  const watchUrl = `${base.BASE}/watch-${parsed.slug}/${parsed.chapter}-sv1.html`;
  try {
    const hls = await native.resolveHls(watchUrl, `${parsed.slug}|${parsed.chapter}|1`);
    return [{
      name: '🐉 HHKungfu • Vietsub',
      title: '1080P HLS • Vietsub',
      url: hls,
      description: 'HHKungfu • native HLS',
      behaviorHints: {
        bingeGroup: 'hhkungfu-native-1',
        notWebReady: false,
        proxyHeaders: {
          request: {
            Referer: 'https://streamfree.vip/'
          }
        }
      }
    }];
  } catch (e) {
    console.error('HHKungfu resilient native resolver failed:', e.message);
    return [];
  }
}

module.exports = {
  ...base,
  streams,
  resolveHls: native.resolveHls
};
