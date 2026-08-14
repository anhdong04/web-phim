module.exports = function applyV629(source) {
  const rewriteRe = /function v626RewriteHls\(text, sourceUrl, headers\) \{[\s\S]*?\n\}/;
  if (!rewriteRe.test(source)) throw new Error('v6.2.9 patch target missing: HLS rewrite');
  const rewrite = String.raw`function v629RelayMediaUrl(url, headers, kind = 'media') {
  const raw = String(url || '');
  let suffix = '.ts';
  if (kind === 'key') suffix = '.key';
  else if (kind === 'init') suffix = /\.m4s(?:$|[?#])/i.test(raw) ? '.m4s' : '.mp4';
  else if (/\.m4s(?:$|[?#])/i.test(raw)) suffix = '.m4s';
  else if (/\.aac(?:$|[?#])/i.test(raw)) suffix = '.aac';
  else if (/\.mp4(?:$|[?#])/i.test(raw)) suffix = '.mp4';
  else if (/\.vtt|\.webvtt/i.test(raw)) suffix = '.vtt';
  return V626_PUBLIC_BASE + '/yanhh3d/relay/' + v626RelayToken(raw, headers, false) + suffix;
}
function v626RewriteHls(text, sourceUrl, headers) {
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  let nextIsPlaylist = false;
  return lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return line;
    if (trimmed.startsWith('#')) {
      const tag = trimmed.split(':', 1)[0].toUpperCase();
      const playlistAttr = /^#EXT-X-(?:MEDIA|I-FRAME-STREAM-INF|RENDITION-REPORT)/i.test(trimmed);
      const keyAttr = /^#EXT-X-(?:KEY|SESSION-KEY)/i.test(trimmed);
      const initAttr = /^#EXT-X-MAP/i.test(trimmed);
      const mediaAttr = /^#EXT-X-(?:PART|PRELOAD-HINT)/i.test(trimmed);
      const rewritten = line.replace(/URI=("([^"]+)"|'([^']+)')/gi, (all, quoted, dq, sq) => {
        const raw = dq || sq || '', abs = v626AbsChild(raw, sourceUrl); if (!abs) return all;
        const isPlaylist = playlistAttr || /\.m3u8(?:$|[?#])/i.test(abs);
        const q = quoted[0] === "'" ? "'" : '"';
        let relay;
        if (isPlaylist) relay = v626RelayUrl(abs, headers, true);
        else if (keyAttr) relay = v629RelayMediaUrl(abs, headers, 'key');
        else if (initAttr) relay = v629RelayMediaUrl(abs, headers, 'init');
        else if (mediaAttr) relay = v629RelayMediaUrl(abs, headers, 'media');
        else relay = v629RelayMediaUrl(abs, headers, 'media');
        return 'URI=' + q + relay + q;
      });
      nextIsPlaylist = /^#EXT-X-STREAM-INF/i.test(trimmed);
      return rewritten;
    }
    const abs = v626AbsChild(trimmed, sourceUrl); if (!abs) return line;
    const playlist = nextIsPlaylist || /\.m3u8(?:$|[?#])/i.test(abs);
    nextIsPlaylist = false;
    return playlist ? v626RelayUrl(abs, headers, true) : v629RelayMediaUrl(abs, headers, 'media');
  }).join('\n');
}`;
  source = source.replace(rewriteRe, rewrite);

  const binaryHeadersRe = /const outHeaders = v628CorsHeaders\(\{ 'content-type':ctype \|\| 'application\/octet-stream', 'cache-control':'public, max-age=300', 'accept-ranges':upstream\.headers\.get\('accept-ranges'\) \|\| 'bytes' \}\);/;
  if (!binaryHeadersRe.test(source)) throw new Error('v6.2.9 patch target missing: binary headers');
  source = source.replace(binaryHeadersRe, String.raw`let relayContentType = ctype || 'application/octet-stream';
  const relayPath = (() => { try { return new URL(req.url, 'http://localhost').pathname.toLowerCase(); } catch { return ''; } })();
  if (relayPath.endsWith('.ts')) relayContentType = 'video/mp2t';
  else if (relayPath.endsWith('.m4s') || relayPath.endsWith('.mp4')) relayContentType = 'video/mp4';
  else if (relayPath.endsWith('.aac')) relayContentType = 'audio/aac';
  else if (relayPath.endsWith('.vtt')) relayContentType = 'text/vtt; charset=utf-8';
  else if (relayPath.endsWith('.key')) relayContentType = 'application/octet-stream';
  const outHeaders = v628CorsHeaders({ 'content-type':relayContentType, 'cache-control':'public, max-age=300', 'accept-ranges':upstream.headers.get('accept-ranges') || 'bytes', 'x-web-phim-upstream-content-type': ctype || '' });`);

  const corsExpose = "'access-control-expose-headers': 'content-length,content-range,accept-ranges,content-type,etag,last-modified',";
  if (source.includes(corsExpose)) source = source.replace(corsExpose, "'access-control-expose-headers': 'content-length,content-range,accept-ranges,content-type,etag,last-modified,x-web-phim-upstream-content-type',");

  const fetchProbeReturn = "return { ok:r.ok || r.status === 206, status:r.status, url:r.url || url, ctype, body };";
  if (!source.includes(fetchProbeReturn)) throw new Error('v6.2.9 patch target missing: probe return');
  source = source.replace(fetchProbeReturn, String.raw`const bytes = Buffer.from(body, 'latin1');
    const hex = bytes.subarray(0, 24).toString('hex');
    let magic = 'unknown';
    if (bytes.length >= 8 && hex.startsWith('89504e470d0a1a0a')) magic = 'png';
    else if (bytes.length && bytes[0] === 0x47) magic = 'mpegts';
    else if (bytes.length >= 8 && ['ftyp','styp','moof'].includes(bytes.subarray(4,8).toString('ascii'))) magic = 'isobmff';
    else if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xf0) === 0xf0) magic = 'aac';
    return { ok:r.ok || r.status === 206, status:r.status, url:r.url || url, ctype, body, magic, hex };`);

  const mediaAssignment = "media = { ok:mr.ok,status:mr.status,contentType:mr.ctype,html:/^\\s*</.test(mr.body) };";
  if (!source.includes(mediaAssignment)) throw new Error('v6.2.9 patch target missing: media diagnostic');
  source = source.replace(mediaAssignment, "media = { ok:mr.ok && mr.magic !== 'png',status:mr.status,contentType:mr.ctype,magic:mr.magic,firstBytesHex:mr.hex,html:/^\\s*</.test(mr.body) };");

  source = source.replace("version: '1.0.3', name: '🐲 YanHH3D'", "version: '1.0.4', name: '🐲 YanHH3D'");
  source = source.replace("description: 'YanHH3D 1.0.3 • browser-safe HLS relay • Thuyết minh/Vietsub streams'", "description: 'YanHH3D 1.0.4 • FB-CDN HLS media normalization • Thuyết minh/Vietsub streams'");
  source = source.replaceAll('6.2.8', '6.2.9');
  source = source.replaceAll('single-process-v6.2.8', 'single-process-v6.2.9');
  return source;
};
