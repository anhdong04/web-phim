// Web Phim v6.3.8 launcher.
// Builds on v6.3.7 and routes YanHH3D Dailymotion through a fresh server-side bridge.
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
const applyV611 = require('./v611_patch');
const applyV612 = require('./v612_patch');
const applyV620 = require('./v620_patch');
const applyV621 = require('./v621_patch');
const applyV622 = require('./v622_patch');
const applyV623 = require('./v623_patch');
const applyV624 = require('./v624_patch');
const applyV625 = require('./v625_patch');
const applyV626 = require('./v626_patch');
const applyV627 = require('./v627_patch');
const applyV628 = require('./v628_patch');
const applyV629 = require('./v629_patch');
const applyV630 = require('./v630_patch');
const applyV631 = require('./v631_patch');
const applyV632 = require('./v632_patch');
const applyV633 = require('./v633_patch');
const applyV634 = require('./v634_patch');
const applyV635 = require('./v635_patch');
const applyV636 = require('./v636_patch');
const applyV637 = require('./v637_patch');
const applyV638 = require('./v638_patch');

let launcher = fs.readFileSync(require.resolve('./addon_v410.js'), 'utf8');
const finalEval = 'eval(source);';
if (!launcher.includes(finalEval)) {
  console.error('v6.3.8 patch target missing: v4.1 final eval');
  process.exit(1);
}
const runV638 = [
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
  'source = applyV611(source);',
  'source = applyV612(source);',
  'source = applyV620(source);',
  'source = applyV621(source);',
  'source = applyV622(source);',
  'source = applyV623(source);',
  'source = applyV624(source);',
  "source = source.replace(\"if (V610_HH3D_ENABLED && V610_HH3D_SHARE_URL) catalogs.unshift({ type: 'series', id: 'hh3d', name: '🐉 HH3D', extra: homeExtra });\", \"if (v610Hh3d) catalogs.unshift({ type: 'series', id: 'hh3d', name: '🐉 HH3D', extra: homeExtra });\");",
  'source = applyV625(source);',
  "source = source.replace(\"if (v610Hh3d) catalogs.unshift({ type: 'series', id: 'hh3d', name: '🐉 HH3D', extra: homeExtra });\", \"if (V610_HH3D_ENABLED && V610_HH3D_SHARE_URL) catalogs.unshift({ type: 'series', id: 'hh3d', name: '🐉 HH3D', extra: homeExtra });\");",
  'source = applyV626(source);',
  'source = applyV627(source);',
  'source = applyV628(source);',
  'source = applyV629(source);',
  'source = applyV630(source);',
  'source = applyV631(source);',
  'source = applyV632(source);',
  'source = applyV633(source);',
  'source = applyV634(source);',
  'source = applyV635(source);',
  'source = applyV636(source);',
  'source = applyV637(source);',
  'source = applyV638(source);',
  "try { new vm.Script(source, { filename: 'web-phim-generated.js' }); } catch (e) { const m = String(e.stack || e).match(/web-phim-generated\\.js:(\\d+)/); const n = m ? Number(m[1]) : 0; const lines = source.split('\\n'); if (n) console.error(lines.slice(Math.max(0,n-6),Math.min(lines.length,n+5)).map((x,i)=>(Math.max(0,n-6)+i+1)+': '+x).join('\\n')); throw e; }",
  'eval(source);'
].join(' ');
launcher = launcher.replace(finalEval, runV638);
eval(launcher);
