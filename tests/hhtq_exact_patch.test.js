'use strict';

const assert = require('node:assert');
const { deobfuscateVipPl, playerAaaaUrls, registerPlaylist, getPlaylist } = require('../hhtq_exact_patch');
const { rewritePlaylist } = require('../hhtq_relay');

const original = '#EXTM3U\n#EXT-X-TARGETDURATION:6\nseg-1.ts\nseg-2.ts';
const b64 = Buffer.from(original, 'utf8').toString('base64');
const obfuscated = b64.charAt(0) + [...b64.slice(1)].reverse().join('');
const wrapped = JSON.stringify({ pl: obfuscated });
assert.equal(deobfuscateVipPl(wrapped), original);

const scriptHtml = `<script>var player_aaaa={"url":"https:\\/\\/vip.cliphub.tv\\/embed\\/abc123"};</script>`;
assert.deepEqual(playerAaaaUrls(scriptHtml, 'https://hhhtq.team/xem/1/'), ['https://vip.cliphub.tv/embed/abc123']);

const relayUrl = registerPlaylist(original, 'https://storage.googleapis.com/bucket/path/master.m3u8', 'https://vip.cliphub.tv/videos/abc123/');
assert.ok(relayUrl && relayUrl.includes('/hhtq/relay/'));
const token = relayUrl.match(/\/relay\/([A-Za-z0-9_-]+)\.m3u8$/)[1];
const row = getPlaylist(token);
assert.ok(row);
const rewritten = rewritePlaylist(row.body, row.baseUrl);
assert.ok(rewritten.includes('https://storage.googleapis.com/bucket/path/seg-1.ts'));
assert.ok(rewritten.includes('https://storage.googleapis.com/bucket/path/seg-2.ts'));

console.log('hhtq exact resolver tests: PASS');
