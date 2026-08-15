module.exports = function applyV632(source) {
  const statsMarker = 'const v631RelayStats = {';
  if (!source.includes(statsMarker)) throw new Error('v6.3.2 patch target missing: relay stats');

  const helpers = String.raw`const v632Fs = require('node:fs');
const v632Os = require('node:os');
const v632Path = require('node:path');
const v632Child = require('node:child_process');
let v632LastMpvPlaylist = null;

function v632FirstUri(text = '') {
  for (const line of String(text || '').replace(/\r/g, '').split('\n')) {
    const s = line.trim();
    if (s && !s.startsWith('#')) return s;
  }
  return '';
}
function v632TsSyncInfo(buf) {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf || []);
  let offset = -1;
  for (let i = 0; i < Math.min(188, b.length); i++) {
    if (b[i] !== 0x47) continue;
    if (i + 188 < b.length && b[i + 188] !== 0x47) continue;
    if (i + 376 < b.length && b[i + 376] !== 0x47) continue;
    offset = i; break;
  }
  if (offset < 0) return { detected:false, packetSize:null, syncOffset:null, checkedPackets:0, syncErrors:null };
  const packets = Math.min(4000, Math.floor((b.length - offset) / 188));
  let errors = 0;
  for (let n = 0; n < packets; n++) if (b[offset + n * 188] !== 0x47) errors++;
  return { detected:true, packetSize:188, syncOffset:offset, checkedPackets:packets, syncErrors:errors };
}
async function v632ReadLimitedResponse(response, maxBytes = 8388608) {
  if (!response.body) return Buffer.alloc(0);
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (total < maxBytes) {
      const part = await reader.read();
      if (part.done) break;
      let chunk = Buffer.from(part.value);
      if (total + chunk.length > maxBytes) chunk = chunk.subarray(0, maxBytes - total);
      chunks.push(chunk); total += chunk.length;
      if (total >= maxBytes) break;
    }
  } finally {
    try { await reader.cancel(); } catch {}
  }
  return Buffer.concat(chunks, total);
}
async function v632FetchPlaylist(url, headers = {}) {
  const h = { ...(headers || {}), 'Accept-Encoding':'identity', Accept:'application/vnd.apple.mpegurl,application/x-mpegURL,text/plain,*/*' };
  const r = await v631FetchUpstream(url, { method:'GET', headers:h }, 15000);
  if (!r.ok) throw new Error('playlist HTTP ' + r.status);
  const text = await r.text();
  if (!/#EXTM3U/i.test(text)) throw new Error('not an HLS playlist');
  return { url:r.url || url, text };
}
async function v632ResolveMediaPlaylist(startUrl, headers = {}) {
  let currentUrl = startUrl, currentText = '';
  for (let depth = 0; depth < 3; depth++) {
    const p = await v632FetchPlaylist(currentUrl, headers);
    currentUrl = p.url; currentText = p.text;
    if (!/#EXT-X-STREAM-INF/i.test(currentText)) return { url:currentUrl, text:currentText, depth };
    const child = v632FirstUri(currentText);
    const abs = v626AbsChild(child, currentUrl);
    if (!abs) throw new Error('invalid HLS variant URL');
    currentUrl = abs;
  }
  return { url:currentUrl, text:currentText, depth:3 };
}
async function v632FetchSegment(url, headers = {}, maxBytes = 8388608) {
  const h = { ...(headers || {}), 'Accept-Encoding':'identity', Range:'bytes=0-' + (maxBytes - 1) };
  const r = await v631FetchUpstream(url, { method:'GET', headers:h }, 20000);
  if (!r.ok && r.status !== 206) throw new Error('segment HTTP ' + r.status);
  const bytes = await v632ReadLimitedResponse(r, maxBytes);
  return {
    bytes,
    status:r.status,
    contentType:String(r.headers.get('content-type') || ''),
    contentRange:String(r.headers.get('content-range') || ''),
    contentLength:String(r.headers.get('content-length') || ''),
    url:r.url || url
  };
}
function v632SanitizeFfprobe(raw = {}) {
  const streams = Array.isArray(raw.streams) ? raw.streams.map(s => ({
    index:s.index,
    codecType:s.codec_type || null,
    codecName:s.codec_name || null,
    codecLongName:s.codec_long_name || null,
    profile:s.profile || null,
    level:s.level ?? null,
    pixFmt:s.pix_fmt || null,
    width:s.width ?? null,
    height:s.height ?? null,
    rFrameRate:s.r_frame_rate || null,
    avgFrameRate:s.avg_frame_rate || null,
    sampleRate:s.sample_rate || null,
    channels:s.channels ?? null,
    channelLayout:s.channel_layout || null,
    bitRate:s.bit_rate || null
  })) : [];
  const programs = Array.isArray(raw.programs) ? raw.programs.map(p => ({
    programId:p.program_id ?? null,
    programNum:p.program_num ?? null,
    pmtPid:p.pmt_pid ?? null,
    pcrPid:p.pcr_pid ?? null,
    streamIndexes:Array.isArray(p.streams) ? p.streams.map(s => s.index).filter(x => x !== undefined) : []
  })) : [];
  const f = raw.format || {};
  return {
    format:{ name:f.format_name || null, longName:f.format_long_name || null, duration:f.duration || null, size:f.size || null, bitRate:f.bit_rate || null },
    programs,
    streams
  };
}
function v632Diagnosis(probe) {
  const streams = probe?.ffprobe?.streams || [];
  const video = streams.find(s => s.codecType === 'video');
  const audio = streams.find(s => s.codecType === 'audio');
  if (!video) return { code:'no-video-stream', summary:'Không tìm thấy video stream trong segment đầu tiên.' };
  const codec = String(video.codecName || '').toLowerCase();
  const pix = String(video.pixFmt || '').toLowerCase();
  if (codec === 'hevc' || codec === 'h265') {
    return {
      code:pix.includes('10') || /p010|yuv420p10/.test(pix) ? 'hevc-10bit' : 'hevc',
      summary:'Video dùng HEVC/H.265' + (pix ? ' (' + pix + ')' : '') + '. Nếu HTTP đã ổn mà Nuvio Windows vẫn dừng sau segment đầu, bước kế tiếp là remux/compatibility path cho libmpv Windows.',
      videoCodec:codec,
      audioCodec:audio?.codecName || null
    };
  }
  if (codec === 'h264') {
    return {
      code:'h264-ts',
      summary:'Video dùng H.264 trong MPEG-TS. Nếu Nuvio Windows vẫn dừng sau segment đầu thì khả năng cao là vấn đề demux/timestamp/TS compatibility, không phải thiếu codec.',
      videoCodec:codec,
      audioCodec:audio?.codecName || null
    };
  }
  return { code:'other-codec', summary:'Codec video là ' + (video.codecName || 'unknown') + '; cần xử lý tương thích riêng cho libmpv Windows.', videoCodec:video.codecName || null, audioCodec:audio?.codecName || null };
}
async function v632ProbeLastMpv() {
  const last = v632LastMpvPlaylist;
  if (!last) return { version:'6.3.2', ok:false, stage:'no-mpv-playlist', error:'Chưa thấy request playlist từ MPV kể từ khi server khởi động.' };
  const started = Date.now();
  let temp = '';
  try {
    const mediaPlaylist = await v632ResolveMediaPlaylist(last.url, last.headers || {});
    const firstRaw = v632FirstUri(mediaPlaylist.text);
    const mediaUrl = v626AbsChild(firstRaw, mediaPlaylist.url);
    if (!mediaUrl) return { version:'6.3.2', ok:false, stage:'media-url', error:'Không tìm thấy segment đầu tiên.', elapsedMs:Date.now()-started };
    const seg = await v632FetchSegment(mediaUrl, last.headers || {});
    if (!seg.bytes.length) return { version:'6.3.2', ok:false, stage:'segment-empty', elapsedMs:Date.now()-started };
    const ts = v632TsSyncInfo(seg.bytes);
    temp = v632Path.join(v632Os.tmpdir(), 'yanhh3d-probe-' + process.pid + '-' + Date.now() + '.ts');
    v632Fs.writeFileSync(temp, seg.bytes);
    let ff = null, ffError = null;
    try {
      const out = v632Child.execFileSync('ffprobe', ['-v','error','-show_programs','-show_streams','-show_format','-of','json',temp], { encoding:'utf8', timeout:12000, maxBuffer:2*1024*1024 });
      ff = v632SanitizeFfprobe(JSON.parse(out));
    } catch (e) {
      ffError = String(e?.stderr || e?.message || e).slice(0, 600);
    }
    const result = {
      version:'6.3.2',
      ok:Boolean(ff && ff.streams?.length),
      stage:ff ? 'ffprobe' : 'ffprobe-failed',
      capturedAt:new Date(last.at).toISOString(),
      playlistDepth:mediaPlaylist.depth,
      playlistBytes:Buffer.byteLength(mediaPlaylist.text,'utf8'),
      segment:{ status:seg.status, bytes:seg.bytes.length, contentType:seg.contentType, contentRange:seg.contentRange, contentLength:seg.contentLength },
      transportStream:ts,
      ffprobe:ff,
      ffprobeError:ffError,
      elapsedMs:Date.now()-started
    };
    result.diagnosis = v632Diagnosis(result);
    return result;
  } catch (e) {
    return { version:'6.3.2', ok:false, stage:'exception', error:String(e?.message || e).slice(0,500), elapsedMs:Date.now()-started };
  } finally {
    if (temp) try { v632Fs.unlinkSync(temp); } catch {}
  }
}

${statsMarker}`;
  source = source.replace(statsMarker, helpers);

  const playlistHintLine = "  const playlistHint = Boolean(data.p) || /\\.m3u8(?:$|[?#])/i.test(String(data.u || ''));";
  if (!source.includes(playlistHintLine)) throw new Error('v6.3.2 patch target missing: playlist hint');
  source = source.replace(playlistHintLine, playlistHintLine + String.raw`
  if (playlistHint && v631ClientFamily(req.headers['user-agent']) === 'mpv') {
    v632LastMpvPlaylist = { url:String(data.u || ''), headers:{ ...(data.h || {}) }, at:Date.now() };
  }`);

  const rangeBool = "    range: Boolean(req.headers.range),";
  if (!source.includes(rangeBool)) throw new Error('v6.3.2 patch target missing: relay range stat');
  source = source.replace(rangeBool, rangeBool + "\n    rangeSpec: String(req.headers.range || '').slice(0,64),");

  const manifestRoute = "  if (path === '/yanhh3d/manifest.json') return sendJson(res, 200, v625YanManifest(), 0);";
  if (!source.includes(manifestRoute)) throw new Error('v6.3.2 patch target missing: manifest route');
  source = source.replace(manifestRoute, manifestRoute + String.raw`
  if (path === '/yanhh3d/codec-probe') {
    const result = await v632ProbeLastMpv();
    return sendJson(res, 200, result, 0);
  }`);

  source = source.replace("version: '1.1.1', name: '🐲 YanHH3D'", "version: '1.1.2', name: '🐲 YanHH3D'");
  source = source.replace("description: 'YanHH3D 1.1.1 • MPV-safe HEAD/Range relay • Thuyết minh/Vietsub streams'", "description: 'YanHH3D 1.1.2 • MPV codec/TS probe • Thuyết minh/Vietsub streams'");
  source = source.replaceAll('6.3.1', '6.3.2');
  source = source.replaceAll('single-process-v6.3.1', 'single-process-v6.3.2');
  return source;
};
