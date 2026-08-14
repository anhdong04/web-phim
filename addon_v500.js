// Web Phim v5.0.0 launcher.
// Builds on the stable v4 chain, then adds managed share links/public configurator.
const fs = require('node:fs');
const applyV420 = require('./v420_patch');
const applyV430 = require('./v430_patch');
const applyV440 = require('./v440_patch');
const applyV500 = require('./v500_patch');

let launcher = fs.readFileSync(require.resolve('./addon_v410.js'), 'utf8');
const finalEval = 'eval(source);';

if (!launcher.includes(finalEval)) {
  console.error('v5 patch target missing: v4.1 final eval');
  process.exit(1);
}

launcher = launcher.replace(finalEval, 'source = applyV420(source); source = applyV430(source); source = applyV440(source); source = applyV500(source); eval(source);');

eval(launcher);
