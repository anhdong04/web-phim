// Hotfix launcher for Web Phim v4.0.1.
// Keeps the v4 single-process server while fixing the /configure inline-script escaping issue.
const fs = require('node:fs');

let source = fs.readFileSync(require.resolve('./addon_v4.js'), 'utf8');

const broken = "btoa(bin).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,'')";
const fixed = "btoa(bin).split('+').join('-').split('/').join('_').replace(/=+$/,'')";

if (!source.includes(broken)) {
  console.error('v4.0.1 hotfix target not found; refusing to start with an unknown configure-page version');
  process.exit(1);
}

source = source.replace(broken, fixed);
source = source.replaceAll('4.0.0', '4.0.1');
source = source.replace(
  "architecture: 'single-process-v4'",
  "architecture: 'single-process-v4.0.1'"
);

// Execute the corrected v4 source in this same Node process.
eval(source);
