// Web Phim v4.2.0 launcher.
// Reuses the v4.1 single-process launcher, injects v4.2 source patches,
// then starts the corrected server in the same Node process.
const fs = require('node:fs');
const applyV420 = require('./v420_patch');

let launcher = fs.readFileSync(require.resolve('./addon_v410.js'), 'utf8');
const finalEval = 'eval(source);';

if (!launcher.includes(finalEval)) {
  console.error('v4.2 patch target missing: v4.1 final eval');
  process.exit(1);
}

launcher = launcher.replace(finalEval, 'source = applyV420(source); eval(source);');

eval(launcher);
