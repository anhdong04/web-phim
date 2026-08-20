'use strict';

const assert = require('node:assert/strict');
const { knownHostUrls } = require('../hhtq_watch_known_hosts_patch');

const html = `
<script>
window.player_aaaa = "{\\\"url\\\":\\\"https:\\\/\\\/vip.cliphub.tv\\\/embed\\\/abc123\\\/\\\"}";
</script>
<div id="links-backup">
  <a data-play="api" href="https://embed.cliphub.tv/xyz789/">Cliphub</a>
</div>
<script>const h='https:\\/\\/helvid.example\\/embed\\/foo';</script>
`;

const urls = knownHostUrls(html);
assert(urls.some(x => x.startsWith('https://vip.cliphub.tv/embed/abc123/')));
assert(urls.some(x => x.startsWith('https://embed.cliphub.tv/xyz789/')));
assert(urls.some(x => x.startsWith('https://helvid.example/embed/foo')));
console.log('hhtq watch known-host tests: PASS');
