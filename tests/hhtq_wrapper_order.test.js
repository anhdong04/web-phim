'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'addon_v650.js'), 'utf8');
const pos = name => source.indexOf(`require('./${name}')`);

for (const name of ['hhtq_exact_patch','hhtq_watch_known_hosts_patch','hhtq_relay','hhtq_diag_patch','hhtq_watch_diag_patch','hhtq_bridge']) {
  assert.ok(pos(name) >= 0, `missing ${name}`);
}
assert.ok(pos('hhtq_relay') < pos('hhtq_bridge'), 'relay must register before bridge');
assert.ok(pos('hhtq_diag_patch') < pos('hhtq_bridge'), 'movie diagnostic must register before bridge');
assert.ok(pos('hhtq_watch_diag_patch') < pos('hhtq_bridge'), 'watch diagnostic must register before bridge');
console.log('hhtq wrapper order test: PASS');
