// Web Phim v6.1.0 launcher.
// Builds on v6.0 and adds the HH3D PikPak catalog + stream provider.
const fs = require('node:fs');
const vm = require('node:vm');
const applyV420 = require('./v420_patch');
const applyV430 = require('./v430_patch');
const applyV440 = require('./v440_patch');
const applyV500 = require('./v500_patch');
const applyV510 = require('./v510_patch');
const applyV520 = require('./v520_patch');
const applyV530 = require('./v530_patch');
const applyV540 = require('./v540_patch');
const applyV600 = require('./v600_patch');
const applyV610 = require('./v610_patch');

let launcher = fs.readFileSync(require.resolve('./addon_v410.js'), 'utf8');
const finalEval = 'eval(source);';

if (!launcher.includes(finalEval)) {
  console.error('v6.1 patch target missing: v4.1 final eval');
  process.exit(1);
}

const runV610 = [
  'source = applyV420(source);',
  'source = applyV430(source);',
  'source = applyV440(source);',
  'source = applyV500(source);',
  'source = applyV510(source);',
  'source = applyV520(source);',
  'source = applyV530(source);',
  'source = applyV540(source);',
  'source = applyV600(source);',
  'source = applyV610(source);',
  "try { new vm.Script(source, { filename: 'web-phim-generated.js' }); } catch (e) { const m = String(e.stack || e).match(/web-phim-generated\\.js:(\\d+)/); const n = m ? Number(m[1]) : 0; const lines = source.split('\\n'); if (n) console.error(lines.slice(Math.max(0,n-6),Math.min(lines.length,n+5)).map((x,i)=>(Math.max(0,n-6)+i+1)+': '+x).join('\\n')); throw e; }",
  'eval(source);'
].join(' ');

launcher = launcher.replace(finalEval, runV610);

eval(launcher);
