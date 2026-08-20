'use strict';

const assert = require('node:assert');
const { isAllowedOkcdnUrl, rewriteOkRuPlaylist, registerOkRuUrl, extensionFor } = require('../hhtq_okru_proxy');

assert.equal(isAllowedOkcdnUrl('https://vd597.okcdn.ru/video.m3u8?x=1'), true);
assert.equal(isAllowedOkcdnUrl('https://st.okcdn.ru/path/segment.ts'), true);
assert.equal(isAllowedOkcdnUrl('https://example.com/video.m3u8'), false);
assert.equal(isAllowedOkcdnUrl('http://vd597.okcdn.ru/video.m3u8'), false);
assert.equal(extensionFor('https://vd597.okcdn.ru/video.m3u8?x=1'), '.m3u8');
assert.equal(extensionFor('https://vd597.okcdn.ru/seg-1.ts?x=1'), '.ts');
assert.equal(extensionFor('https://vd597.okcdn.ru/noext?x=1'), '');

const root = registerOkRuUrl('https://vd597.okcdn.ru/video.m3u8?x=1', 'https://ok.ru/videoembed/1');
assert.match(root, /\/hhtq\/okru\/[A-Za-z0-9_-]+\.m3u8$/);

const input = [
  '#EXTM3U',
  '#EXT-X-STREAM-INF:BANDWIDTH=1000000',
  'quality/720.m3u8?sig=abc',
  '#EXT-X-KEY:METHOD=AES-128,URI="keys/key.bin?sig=def"',
  'https://vd597.okcdn.ru/seg-1.ts?sig=ghi'
].join('\n');

const out = rewriteOkRuPlaylist(input, 'https://vd597.okcdn.ru/video/master.m3u8?root=1', 'https://ok.ru/videoembed/1');
assert.match(out, /\/hhtq\/okru\/[A-Za-z0-9_-]+\.m3u8/);
assert.match(out, /\/hhtq\/okru\/[A-Za-z0-9_-]+\.bin/);
assert.match(out, /\/hhtq\/okru\/[A-Za-z0-9_-]+\.ts/);
assert.ok(!out.includes('quality/720.m3u8'));
assert.ok(!out.includes('https://vd597.okcdn.ru/seg-1.ts'));
assert.ok(!out.includes('keys/key.bin'));

console.log('hhtq OK.ru Render proxy v2 tests: PASS');
