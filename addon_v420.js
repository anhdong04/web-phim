// Web Phim v4.2.0 launcher.
// Extends v4.1 in the same Node process with stream scoring v2,
// provider-specific timeouts, and Configure v2 device/codec/audio profiles.
const fs = require('node:fs');

let launcher = fs.readFileSync(require.resolve('./addon_v410.js'), 'utf8');

const finalEval = 'eval(source);';
if (!launcher.includes(finalEval)) {
  console.error('v4.2 patch target missing: v4.1 final eval');
  process.exit(1);
}

launcher = launcher.replace(finalEval, String.raw`
// ---------------- v4.2 patches applied to generated v4.1 source ----------------

// New configurable defaults.
const defaultsMarker = "  subtitlePreferNonHI: String(process.env.SUBTITLE_PREFER_NON_HI || 'true').toLowerCase() !== 'false'";
if (!source.includes(defaultsMarker)) {
  console.error('v4.2 patch target missing: DEFAULTS');
  process.exit(1);
}
source = source.replace(defaultsMarker, defaultsMarker + ",\n  deviceProfile: String(process.env.DEVICE_PROFILE || 'auto').toLowerCase(),\n  preferredCodec: String(process.env.PREFERRED_CODEC || 'auto').toLowerCase(),\n  preferredAudio: String(process.env.PREFERRED_AUDIO || 'auto').toLowerCase()");

const sanitizeMarker = "    maxSizeGB: clampNumber(raw.maxSizeGB, DEFAULTS.maxSizeGB, 0, 500),";
if (!source.includes(sanitizeMarker)) {
  console.error('v4.2 patch target missing: sanitizeConfig');
  process.exit(1);
}
source = source.replace(sanitizeMarker, sanitizeMarker + "\n    deviceProfile: ['auto','4k-tv','1080p-quality','1080p-balanced','mobile','low-bandwidth'].includes(String(raw.deviceProfile || '').toLowerCase()) ? String(raw.deviceProfile).toLowerCase() : DEFAULTS.deviceProfile,\n    preferredCodec: ['auto','hevc','av1','h264'].includes(String(raw.preferredCodec || '').toLowerCase()) ? String(raw.preferredCodec).toLowerCase() : DEFAULTS.preferredCodec,\n    preferredAudio: ['auto','premium','compatible','small'].includes(String(raw.preferredAudio || '').toLowerCase()) ? String(raw.preferredAudio).toLowerCase() : DEFAULTS.preferredAudio,");

// Provider-specific request timeouts.
const fetchMarker = "async function fetchJson(url, label = 'upstream') {";
if (!source.includes(fetchMarker)) {
  console.error('v4.2 patch target missing: fetchJson marker');
  process.exit(1);
}
source = source.replace(fetchMarker, String.raw`function v420ProviderTimeout(provider) {
  const name = String(provider || '').toLowerCase();
  if (name === 'tmdb') return Number(process.env.TMDB_TIMEOUT_MS || 4500);
  if (name.includes('kkphim')) return Number(process.env.KKPHIM_TIMEOUT_MS || 5000);
  if (name.includes('comet') || name.includes('torbox') || name.includes('aiostreams') || name.includes('mediafusion') || name.includes('torrentio')) return Number(process.env.STREAM_PROVIDER_TIMEOUT_MS || 6500);
  if (name.includes('subsense')) return Number(process.env.SUBSENSE_TIMEOUT_MS || 6500);
  if (name.includes('opensubtitles')) return Number(process.env.OPENSUBTITLES_TIMEOUT_MS || 4500);
  return Number(process.env.OTHER_PROVIDER_TIMEOUT_MS || REQUEST_TIMEOUT_MS);
}

async function fetchJson(url, label = 'upstream') {`);

const requestTimer = "  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);";
if (!source.includes(requestTimer)) {
  console.error('v4.2 patch target missing: fetch timeout');
  process.exit(1);
}
source = source.replace(requestTimer, "  const timeoutMs = v420ProviderTimeout(provider);\n  const timer = setTimeout(() => controller.abort(), timeoutMs);");

// Stream scoring v2 helpers + replacement scorer.
const scorerRe = /function streamScore\(s, cfg\) \{[\s\S]*?\n\}/;
if (!scorerRe.test(source)) {
  console.error('v4.2 patch target missing: streamScore');
  process.exit(1);
}
source = source.replace(scorerRe, String.raw`function v420Codec(s) {
  const t = streamText(s).toLowerCase();
  if (/\b(av1)\b/.test(t)) return 'av1';
  if (/\b(x265|h265|hevc)\b/.test(t)) return 'hevc';
  if (/\b(x264|h264|avc)\b/.test(t)) return 'h264';
  return 'unknown';
}
function v420AudioClass(s) {
  const t = streamText(s).toLowerCase();
  if (/\b(atmos|truehd|dts[- .]?hd|dts:x|7\.1)\b/.test(t)) return 'premium';
  if (/\b(eac3|e-ac-3|ddp|ac3|dts|5\.1)\b/.test(t)) return 'compatible';
  if (/\b(aac|mp3|opus|2\.0|stereo)\b/.test(t)) return 'small';
  return 'unknown';
}
function v420ProfileScore(s, cfg) {
  const r = streamResolution(s), gb = sizeGB(s), codec = v420Codec(s), audio = v420AudioClass(s);
  let score = 0;
  switch (cfg.deviceProfile) {
    case '4k-tv':
      score += r === 2160 ? 9000 : r === 1080 ? 2500 : -2500;
      score += /\b(dv|dolby vision|hdr10\+|hdr10|hdr)\b/i.test(streamText(s)) ? 2200 : 0;
      score += audio === 'premium' ? 1800 : 0;
      break;
    case '1080p-quality':
      score += r === 1080 ? 9000 : r === 2160 ? 1000 : r === 720 ? 2500 : 0;
      score -= gb > 35 ? (gb - 35) * 120 : 0;
      break;
    case '1080p-balanced':
      score += r === 1080 ? 9500 : r === 720 ? 3500 : r === 2160 ? -1500 : 0;
      score -= gb > 18 ? (gb - 18) * 220 : 0;
      break;
    case 'mobile':
      score += r === 1080 ? 6500 : r === 720 ? 8500 : r === 480 ? 4500 : r === 2160 ? -7000 : 0;
      score -= gb * 450;
      score += audio === 'small' ? 900 : 0;
      break;
    case 'low-bandwidth':
      score += r === 720 ? 9000 : r === 480 ? 8000 : r === 1080 ? 2000 : r === 2160 ? -9000 : 0;
      score -= gb * 800;
      break;
  }
  if (cfg.preferredCodec !== 'auto') {
    score += codec === cfg.preferredCodec ? 1800 : codec === 'unknown' ? 0 : -900;
  } else if (cfg.deviceProfile === 'mobile' || cfg.deviceProfile === 'low-bandwidth') {
    if (codec === 'hevc' || codec === 'av1') score += 500;
  }
  if (cfg.preferredAudio !== 'auto') score += audio === cfg.preferredAudio ? 1200 : audio === 'unknown' ? 0 : -500;
  return score;
}
function streamScore(s, cfg) {
  if (isKK(s)) return 100000;
  const r = streamResolution(s), gb = sizeGB(s), cached = isCachedHint(s);
  const hdr = hasFeature(s, /\b(dv|dolby vision|hdr10\+|hdr10|hdr)\b/);
  const premiumAudio = hasFeature(s, /\b(atmos|truehd|dts[- .]?hd|7\.1)\b/);
  const premiumSource = hasFeature(s, /\b(remux|blu.?ray|web[- .]?dl)\b/);
  let score = 0;
  if (cfg.streamPreset === 'best') score = r * 20 + (hdr ? 8000 : 0) + (premiumAudio ? 4000 : 0) + (premiumSource ? 2500 : 0) + Math.min(gb, 100) * 4;
  else if (cfg.streamPreset === 'data-saver') {
    const rp = r === 1080 ? 15000 : r === 720 ? 12000 : r === 480 ? 9000 : r === 2160 ? 3000 : 5000;
    score = rp + (premiumSource ? 500 : 0) - gb * 700;
  } else {
    const rp = r === 1080 ? 20000 : r === 2160 ? 18000 : r === 1440 ? 16000 : r === 720 ? 12000 : 7000;
    const penalty = gb > 25 ? (gb - 25) * 180 : 0;
    score = rp + (hdr ? 1800 : 0) + (premiumSource ? 1400 : 0) + (premiumAudio ? 700 : 0) - penalty;
  }
  if (cfg.preferCached && cached) score += 6000;
  score += v420ProfileScore(s, cfg);
  return score;
}`);

// Configure v2 UI.
const presetHtml = '<div><label>Preset</label><select id="streamPreset"><option value="best">Best</option><option value="balanced">Balanced</option><option value="data-saver">Data Saver</option></select></div>';
if (!source.includes(presetHtml)) {
  console.error('v4.2 patch target missing: configure preset HTML');
  process.exit(1);
}
source = source.replace(presetHtml, '<div><label>Device / Quality profile</label><select id="deviceProfile"><option value="auto">Auto</option><option value="4k-tv">4K TV</option><option value="1080p-quality">1080p Quality</option><option value="1080p-balanced">1080p Balanced</option><option value="mobile">Mobile</option><option value="low-bandwidth">Low Bandwidth</option></select></div>' + presetHtml + '<div><label>Preferred codec</label><select id="preferredCodec"><option value="auto">Auto</option><option value="hevc">HEVC / x265</option><option value="av1">AV1</option><option value="h264">H.264 / x264</option></select></div><div><label>Preferred audio</label><select id="preferredAudio"><option value="auto">Auto</option><option value="premium">Atmos / TrueHD / DTS-HD</option><option value="compatible">EAC3 / AC3 / DTS</option><option value="small">AAC / Stereo</option></select></div>');

const configObjectMarker = "const c={streamPreset:g('streamPreset').value,";
if (!source.includes(configObjectMarker)) {
  console.error('v4.2 patch target missing: configure JS object');
  process.exit(1);
}
source = source.replace(configObjectMarker, "const c={deviceProfile:g('deviceProfile').value,preferredCodec:g('preferredCodec').value,preferredAudio:g('preferredAudio').value,streamPreset:g('streamPreset').value,");

// Status visibility.
source = source.replace(
  "configureSupported: true, healthSupported: true, tmdbMemoryCache: true, circuitBreaker: true, configuredManifest: configured, streamPreset:",
  "configureSupported: true, configureVersion: 2, scoringVersion: 2, providerSpecificTimeouts: true, healthSupported: true, tmdbMemoryCache: true, circuitBreaker: true, configuredManifest: configured, deviceProfile: cfg.deviceProfile, preferredCodec: cfg.preferredCodec, preferredAudio: cfg.preferredAudio, streamPreset:"
);

source = source.replaceAll('4.1.0', '4.2.0');
source = source.replace("architecture: 'single-process-v4.1'", "architecture: 'single-process-v4.2'");

eval(source);
`);

eval(launcher);
