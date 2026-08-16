module.exports = function applyV650IptvStandalone(source) {
  const marker = "  if (path === '/vn/manifest.json') return sendJson(res, 200, v645Manifest(), 60);";
  if (!source.includes(marker)) throw new Error('v6.5.0 IPTV standalone patch target missing');

  const standalone = String.raw`
  const V650_IPTV_PLAYLIST = process.env.IPTV_M3U_URL || 'https://iptv-org.github.io/iptv/index.m3u';
  const V650_IPTV_TTL = Math.max(60, Number(process.env.IPTV_CACHE_SECONDS || 900));
  const V650_IPTV_PAGE = Math.max(20, Math.min(500, Number(process.env.IPTV_PAGE_SIZE || 100)));
  let v650IptvCache = { at: 0, channels: [] };

  function v650IptvManifest() {
    const extra = [
      { name: 'search', isRequired: false },
      { name: 'skip', isRequired: false }
    ];
    return {
      id: 'community.iptvorg.standalone',
      version: '1.0.0',
      name: '📺 IPTV-org Live TV',
      description: 'Live TV từ playlist IPTV-org • tìm kiếm kênh • logo • phát trực tiếp',
      resources: ['catalog', 'meta', 'stream'],
      types: ['tv'],
      idPrefixes: ['iptv:'],
      catalogs: [
        { type: 'tv', id: 'iptvorg', name: '📺 IPTV-org • Live TV', extra }
      ],
      behaviorHints: { adult: false, p2p: false, configurable: false, configurationRequired: false }
    };
  }

  function v650IptvDecodeEntities(s) {
    return String(s || '')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  }

  function v650IptvAttr(line, key) {
    const re = new RegExp('(?:^|\\s)' + key + '="([^"]*)"', 'i');
    const m = String(line || '').match(re);
    return m ? v650IptvDecodeEntities(m[1].trim()) : '';
  }

  function v650IptvId(channel) {
    const payload = JSON.stringify({
      n: String(channel.name || '').slice(0, 180),
      u: String(channel.url || ''),
      l: String(channel.logo || '').slice(0, 1000),
      g: String(channel.group || '').slice(0, 180),
      c: String(channel.country || '').slice(0, 80),
      i: String(channel.tvgId || '').slice(0, 180)
    });
    return 'iptv:' + Buffer.from(payload, 'utf8').toString('base64url');
  }

  function v650IptvFromId(id) {
    if (!String(id || '').startsWith('iptv:')) return null;
    try {
      const x = JSON.parse(Buffer.from(String(id).slice(5), 'base64url').toString('utf8'));
      if (!x || !x.u) return null;
      return { name: x.n || 'Live TV', url: x.u, logo: x.l || '', group: x.g || '', country: x.c || '', tvgId: x.i || '' };
    } catch (_) { return null; }
  }

  function v650IptvParse(text) {
    const lines = String(text || '').replace(/\\r/g, '').split('\\n');
    const out = [];
    let pending = null;
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      if (line.startsWith('#EXTINF:')) {
        const comma = line.indexOf(',');
        const title = comma >= 0 ? line.slice(comma + 1).trim() : '';
        pending = {
          name: v650IptvDecodeEntities(v650IptvAttr(line, 'tvg-name') || title || 'Live TV'),
          logo: v650IptvAttr(line, 'tvg-logo'),
          group: v650IptvAttr(line, 'group-title'),
          country: v650IptvAttr(line, 'tvg-country') || v650IptvAttr(line, 'country'),
          tvgId: v650IptvAttr(line, 'tvg-id'),
          url: ''
        };
        continue;
      }
      if (line[0] === '#') continue;
      if (pending && /^https?:\\/\\//i.test(line)) {
        pending.url = line;
        out.push(pending);
        pending = null;
      }
    }
    return out;
  }

  async function v650IptvChannels() {
    const now = Date.now();
    if (v650IptvCache.channels.length && now - v650IptvCache.at < V650_IPTV_TTL * 1000) return v650IptvCache.channels;
    const r = await fetch(V650_IPTV_PLAYLIST, {
      headers: {
        'user-agent': 'Mozilla/5.0 Nuvio-IPTV/1.0',
        'accept': 'application/x-mpegURL, audio/x-mpegurl, text/plain, */*'
      },
      signal: AbortSignal.timeout(20000)
    });
    if (!r.ok) throw new Error('IPTV playlist HTTP ' + r.status);
    const channels = v650IptvParse(await r.text());
    if (!channels.length) throw new Error('IPTV playlist is empty');
    v650IptvCache = { at: now, channels };
    return channels;
  }

  function v650IptvExtra(tail) {
    const out = { search: '', skip: 0 };
    const clean = String(tail || '').replace(/^\\//, '').replace(/\\.json$/i, '');
    if (!clean) return out;
    for (const part of clean.split('&')) {
      const i = part.indexOf('=');
      if (i < 0) continue;
      let k = part.slice(0, i), v = part.slice(i + 1);
      try { k = decodeURIComponent(k); } catch (_) {}
      try { v = decodeURIComponent(v); } catch (_) {}
      if (k === 'search') out.search = String(v || '').trim().toLowerCase();
      if (k === 'skip') out.skip = Math.max(0, Number(v) || 0);
    }
    return out;
  }

  function v650IptvMeta(channel) {
    const id = v650IptvId(channel);
    const description = [channel.group, channel.country, channel.tvgId].filter(Boolean).join(' • ') || 'Live IPTV channel';
    const meta = {
      id,
      type: 'tv',
      name: channel.name || 'Live TV',
      description,
      releaseInfo: 'LIVE',
      behaviorHints: { defaultVideoId: id }
    };
    if (channel.logo && /^https?:\\/\\//i.test(channel.logo)) {
      meta.poster = channel.logo;
      meta.logo = channel.logo;
      meta.posterShape = 'square';
    }
    return meta;
  }

  if (path === '/iptv/manifest.json') return sendJson(res, 200, v650IptvManifest(), 60);

  if (path.startsWith('/iptv/catalog/tv/iptvorg')) {
    let tail = path.slice('/iptv/catalog/tv/iptvorg'.length);
    const extra = v650IptvExtra(tail);
    try {
      let channels = await v650IptvChannels();
      if (extra.search) {
        channels = channels.filter(c => [c.name, c.group, c.country, c.tvgId].join(' ').toLowerCase().includes(extra.search));
      }
      const page = channels.slice(extra.skip, extra.skip + V650_IPTV_PAGE).map(v650IptvMeta);
      return sendJson(res, 200, { metas: page }, 60);
    } catch (e) {
      console.error('IPTV standalone catalog:', e.message);
      return sendJson(res, 200, { metas: [] }, 0);
    }
  }

  if (path.startsWith('/iptv/meta/tv/')) {
    const id = decodeURIComponent(path.slice('/iptv/meta/tv/'.length).replace(/\\.json$/i, ''));
    const channel = v650IptvFromId(id);
    if (!channel) return sendJson(res, 200, { meta: null }, 0);
    return sendJson(res, 200, { meta: v650IptvMeta(channel) }, 300);
  }

  if (path.startsWith('/iptv/stream/tv/')) {
    const id = decodeURIComponent(path.slice('/iptv/stream/tv/'.length).replace(/\\.json$/i, ''));
    const channel = v650IptvFromId(id);
    if (!channel) return sendJson(res, 200, { streams: [] }, 0);
    const stream = {
      name: '📺 IPTV-org',
      title: channel.name || 'Live TV',
      url: channel.url,
      behaviorHints: { notWebReady: false }
    };
    return sendJson(res, 200, { streams: [stream] }, 0);
  }

`;

  return source.replace(marker, standalone + marker);
};
