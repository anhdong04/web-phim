// Web Phim v4.3.0 launcher.
// Builds on v4.1 + v4.2 source patches, then applies v4.3 in the same Node process.
const fs = require('node:fs');
const applyV420 = require('./v420_patch');
const applyV430 = require('./v430_patch');

let launcher = fs.readFileSync(require.resolve('./addon_v410.js'), 'utf8');
const finalEval = 'eval(source);';

if (!launcher.includes(finalEval)) {
  console.error('v4.3 patch target missing: v4.1 final eval');
  process.exit(1);
}

launcher = launcher.replace(finalEval, 'source = applyV420(source); source = applyV430(source); eval(source);');

eval(launcher);
