'use strict';

const assert = require('node:assert');
const {
  deobfuscateVipPl,
  playerAaaaUrls,
  registerPlaylist,
  getPlaylist,
  extractOkRuHls,
  saneDirectUrl
} = require('../hhtq_exact_patch');
const { rewritePlaylist } = require('../hhtq_relay');

const original = '#EXTM3U\n#EXT-X-TARGETDURATION:6\nseg-1.ts\nseg-2.ts';
const b64 = Buffer.from(original, 'utf8').toString('base64');
const obfuscated = b64.charAt(0) + [...b64.slice(1)].reverse().join('');
const wrapped = JSON.stringify({ pl: obfuscated });
assert.equal(deobfuscateVipPl(wrapped), original);

const scriptHtml = `<script>var player_aaaa={"url":"https:\\/\\/vip.cliphub.tv\\/embed\\/abc123"};</script>`;
assert.deepEqual(playerAaaaUrls(scriptHtml, 'https://hhhtq.team/xem/1/'), ['https://vip.cliphub.tv/embed/abc123']);

const okHtml = '&quot;metadata&quot;:&quot;{\\&quot;hlsManifestUrl\\&quot;:\\&quot;https://vd597.okcdn.ru/video.m3u8?cmd=videoPlayerCdn\\&amp;expires=1787337199360\\&amp;type=2\\&amp;id=3665086909070\\&quot;}&quot;';
const okHls = extractOkRuHls(okHtml);
assert.equal(okHls, 'https://vd597.okcdn.ru/video.m3u8?cmd=videoPlayerCdn&expires=1787337199360&type=2&id=3665086909070');
assert.equal(saneDirectUrl(okHls), true);
assert.equal(saneDirectUrl('https://st.okcdn.ru/vp.swf&quot;,&quot;metadata&quot;:' + 'x'.repeat(5000)), false);

const relayUrl = registerPlaylist(original, 'https://storage.googleapis.com/bucket/path/master.m3u8', 'https://vip.cliphub.tv/videos/abc123/');
assert.ok(relayUrl && relayUrl.includes('/hhtq/relay/'));
const token = relayUrl.match(/\/relay\/([A-Za-z0-9_-]+)\.m3u8$/)[1];
const row = getPlaylist(token);
assert.ok(row);
const rewritten = rewritePlaylist(row.body, row.baseUrl);
assert.ok(rewritten.includes('https://storage.googleapis.com/bucket/path/seg-1.ts'));
assert.ok(rewritten.includes('https://storage.googleapis.com/bucket/path/seg-2.ts'));

console.log('hhtq exact resolver tests: PASS');
