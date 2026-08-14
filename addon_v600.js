// Web Phim v6.0.0 launcher.
// Builds on v5.4 and adds AI Vietnamese subtitles + per-share Personal Home.
const fs = require('node:fs');
const applyV420 = require('./v420_patch');
const applyV430 = require('./v430_patch');
const applyV440 = require('./v440_patch');
const applyV500 = require('./v500_patch');
const applyV510 = require('./v510_patch');
const applyV520 = require('./v520_patch');
const applyV530 = require('./v530_patch');
const applyV540 = require('./v540_patch');
const applyV600 = require('./v600_patch');

let launcher = fs.readFileSync(require.resolve('./addon_v410.js'), 'utf8');
const finalEval = 'eval(source);';

if (!launcher.includes(finalEval)) {
  console.error('v6 patch target missing: v4.1 final eval');
  process.exit(1);
}

launcher = launcher.replace(finalEval, 'source = applyV420(source); source = applyV430(source); source = applyV440(source); source = applyV500(source); source = applyV510(source); source = applyV520(source); source = applyV530(source); source = applyV540(source); source = applyV600(source); eval(source);');

eval(launcher);
