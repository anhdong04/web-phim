const crypto = require('node:crypto');

const WEB_CLIENT_ID = 'YUMx5nI8ZU8Ap8pm';
const WEB_CLIENT_VERSION = '2.0.0';
const WEB_PACKAGE_NAME = 'mypikpak.com';
const WEB_ALGORITHMS = [
  'C9qPpZLN8ucRTaTiUMWYS9cQvWOE',
  '+r6CQVxjzJV6LCV',
  'F',
  'pFJRC',
  '9WXYIDGrwTCz2OiVlgZa90qpECPD6olt',
  '/750aCr4lm/Sly/c',
  'RB+DT/gZCrbV',
  '',
  'CyLsf7hdkIRxRm215hl',
  '7xHvLi2tOYP0Y92b',
  'ZGTXXxu8E/MIWaEDB+Sm/',
  '1UI3',
  'E7fP5Pfijd+7K+t6Tg/NhuLq0eEUVChpJSkrKxpO',
  'ihtqpG6FMt65+Xk+tWUH2',
  'NhXXU9rg4XXdzo7u5o'
];
const DEFAULT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36';
const VIDEO_EXT = /\.(mkv|mp4|m4v|mov|webm|avi|ts|m2ts)$/i;

function md5(value) {
  return crypto.createHash('md5').update(String(value)).digest('hex');
}

function captchaSign(deviceId, timestamp) {
  let value = WEB_CLIENT_ID + WEB_CLIENT_VERSION + WEB_PACKAGE_NAME + deviceId + timestamp;
  for (const salt of WEB_ALGORITHMS) value = md5(value + salt);
  return '1.' + value;
}

function parseShareUrl(rawUrl) {
  const u = new URL(String(rawUrl || ''));
  if (!/mypikpak\.(com|net)$/i.test(u.hostname)) throw new Error('Invalid PikPak hostname');
  const parts = u.pathname.split('/').filter(Boolean);
  if (parts.length < 2 || parts[0] !== 's') throw new Error('Invalid PikPak share URL');
  return { shareId: parts[1], initialParentId: parts[2] || '' };
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[._]+/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanTitle(value) {
  let name = String(value || '').replace(VIDEO_EXT, '');
  name = name
    .replace(/\[[^\]]*(?:2160p|1080p|720p|4k|hevc|x26[45]|av1|web[- .]?dl|bluray|vietsub|thuyet minh)[^\]]*\]/ig, ' ')
    .replace(/\b(?:s\d{1,2}\s*e\d{1,4}|season\s*\d{1,2}|episode\s*\d{1,4}|ep\s*\d{1,4}|tap\s*\d{1,4}|tập\s*\d{1,4})\b/ig, ' ')
    .replace(/\b(?:2160p|1080p|720p|480p|4k|uhd|hdr10\+?|hdr|dv|dolby vision|hevc|x26[45]|h26[45]|av1|aac|eac3|ac3|dts|web[- .]?dl|webrip|bluray|remux)\b/ig, ' ')
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  name = name.replace(/(?:^|\s)(?:e|ep|tap|tập)?\s*0*\d{1,4}\s*$/i, '').trim();
  return name || String(value || '').replace(VIDEO_EXT, '').trim();
}

function inferSeason(text) {
  const value = String(text || '');
  let m = value.match(/\bs(?:eason)?[ ._-]*0*(\d{1,2})\b/i);
  if (m) return Math.max(1, Number(m[1]));
  m = value.match(/\bphan[ ._-]*0*(\d{1,2})\b/i) || value.match(/\bphần[ ._-]*0*(\d{1,2})\b/i);
  return m ? Math.max(1, Number(m[1])) : 1;
}

function inferEpisode(text) {
  const value = String(text || '');
  const patterns = [
    /\bs\d{1,2}[ ._-]*e(?:p)?[ ._-]*0*(\d{1,4})\b/i,
    /\b(?:episode|ep|tap|tập)[ ._-]*0*(\d{1,4})\b/i,
    /(?:^|[ ._\-\[(])e[ ._-]*0*(\d{1,4})(?=$|[ ._\-\])])/i,
    /(?:^|[ ._\-\[(])0*(\d{1,4})(?=\.(?:mkv|mp4|m4v|mov|webm|avi|ts|m2ts)$)/i
  ];
  for (const re of patterns) {
    const m = value.match(re);
    if (m) return Number(m[1]);
  }
  return null;
}

function titleTokens(value) {
  const stop = new Set(['the','a','an','and','of','in','on','to','for','season','episode','tap','tập','phan','phần','hh3d']);
  return normalizeText(value).split(' ').filter(x => x.length > 1 && !stop.has(x));
}

function coverage(title, candidate) {
  const need = titleTokens(title);
  if (!need.length) return 0;
  const have = new Set(titleTokens(candidate));
  return need.filter(x => have.has(x)).length / need.length;
}

function scoreCandidate(file, query) {
  const text = `${file.path || ''} ${file.name || ''}`;
  let score = Math.max(coverage(query.title, text), coverage(query.originalTitle, text)) * 100;
  const normText = normalizeText(text);
  for (const t of [query.title, query.originalTitle]) {
    const n = normalizeText(t);
    if (n && normText.includes(n)) score += 50;
  }
  if (query.episode) {
    if (file.episode == null) score -= 15;
    else if (Number(file.episode) === Number(query.episode)) score += 80;
    else score -= 300;
  }
  if (query.season && file.season && Number(file.season) === Number(query.season)) score += 15;
  return score;
}

function pickDownloadUrl(fileInfo, useTranscoding) {
  if (!fileInfo) return '';
  const medias = Array.isArray(fileInfo.medias) ? fileInfo.medias : [];
  if (useTranscoding && medias[1]?.link?.url) return medias[1].link.url;
  return fileInfo.web_content_link || medias[0]?.link?.url || '';
}

class PikPakClient {
  constructor(options = {}) {
    this.fetch = options.fetch || global.fetch;
    this.apiHost = options.apiHost || 'api-drive.mypikpak.com';
    this.userHost = options.userHost || 'user.mypikpak.com';
    this.password = options.password || '';
    this.useTranscoding = Boolean(options.useTranscoding);
    this.timeoutMs = Math.max(1500, Number(options.timeoutMs || 9000));
    this.deviceId = crypto.randomBytes(16).toString('hex');
    this.captchaToken = '';
    this.passCodeToken = '';
  }

  headers() {
    return {
      'User-Agent': DEFAULT_UA,
      'Content-Type': 'application/json',
      'X-Client-ID': WEB_CLIENT_ID,
      'X-Device-ID': this.deviceId,
      'X-Captcha-Token': this.captchaToken || ''
    };
  }

  async httpJson(url, init = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await this.fetch(url, { ...init, signal: controller.signal });
      const text = await res.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch {}
      return { ok: res.ok, status: res.status, text, data };
    } finally {
      clearTimeout(timer);
    }
  }

  async refreshCaptcha(action) {
    const timestamp = String(Date.now());
    const body = {
      action,
      captcha_token: this.captchaToken || '',
      client_id: WEB_CLIENT_ID,
      device_id: this.deviceId,
      meta: {
        captcha_sign: captchaSign(this.deviceId, timestamp),
        client_version: WEB_CLIENT_VERSION,
        package_name: WEB_PACKAGE_NAME,
        timestamp,
        user_id: ''
      },
      redirect_uri: ''
    };
    const r = await this.httpJson(`https://${this.userHost}/v1/shield/captcha/init`, {
      method: 'POST', headers: this.headers(), body: JSON.stringify(body)
    });
    if (!r.ok || !r.data?.captcha_token) throw new Error(`PikPak captcha/init ${r.status}: ${r.data?.error_description || r.text}`);
    this.captchaToken = r.data.captcha_token;
  }

  async request(path, query = {}) {
    const url = new URL(`https://${this.apiHost}${path}`);
    for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    const action = `GET:${path}`;
    if (!this.captchaToken) await this.refreshCaptcha(action);
    const call = () => this.httpJson(url.toString(), { method: 'GET', headers: this.headers() });
    let r = await call();
    if (r.data?.error_code === 9) {
      await this.refreshCaptcha(action);
      r = await call();
    }
    if (!r.data) throw new Error(`PikPak non-JSON response ${r.status}`);
    if (r.data.error_code) throw new Error(`PikPak ${r.data.error_code}: ${r.data.error_description || r.data.error || 'unknown error'}`);
    return r.data;
  }

  async initShare(shareId) {
    if (!this.password) return;
    const info = await this.request('/drive/v1/share', {
      share_id: shareId,
      pass_code: this.password,
      thumbnail_size: 'SIZE_LARGE',
      limit: 100
    });
    this.passCodeToken = info.pass_code_token || '';
  }

  getShareDetail(shareId, parentId, pageToken) {
    return this.request('/drive/v1/share/detail', {
      share_id: shareId,
      parent_id: parentId || '',
      pass_code_token: this.passCodeToken || '',
      thumbnail_size: 'SIZE_LARGE',
      with_audit: 'true',
      limit: 100,
      page_token: pageToken || '',
      filters: JSON.stringify({ phase: { eq: 'PHASE_TYPE_COMPLETE' }, trashed: { eq: false } })
    });
  }

  getFileInfo(shareId, fileId) {
    return this.request('/drive/v1/share/file_info', {
      share_id: shareId,
      file_id: fileId,
      pass_code_token: this.passCodeToken || ''
    });
  }
}

class PikPakShareProvider {
  constructor(options = {}) {
    const parsed = parseShareUrl(options.shareUrl);
    this.shareUrl = options.shareUrl;
    this.shareId = parsed.shareId;
    this.rootParentId = parsed.initialParentId || '';
    this.options = options;
    this.cacheTtlMs = Math.max(60000, Number(options.cacheTtlMs || 900000));
    this.directTtlMs = Math.max(30000, Number(options.directTtlMs || 300000));
    this.maxFiles = Math.max(50, Math.min(10000, Number(options.maxFiles || 2500)));
    this.maxDepth = Math.max(1, Math.min(20, Number(options.maxDepth || 10)));
    this.fileCache = null;
    this.groupCache = null;
    this.directCache = new Map();
    this.client = null;
  }

  newClient() {
    return new PikPakClient({
      fetch: this.options.fetch || global.fetch,
      apiHost: this.options.apiHost,
      userHost: this.options.userHost,
      password: this.options.password,
      useTranscoding: this.options.useTranscoding,
      timeoutMs: this.options.timeoutMs
    });
  }

  async ensureClient(force = false) {
    if (!this.client || force) {
      this.client = this.newClient();
      await this.client.initShare(this.shareId);
    }
    return this.client;
  }

  async withRetry(worker) {
    try {
      return await worker(await this.ensureClient(false));
    } catch (first) {
      this.client = null;
      try { return await worker(await this.ensureClient(true)); }
      catch { throw first; }
    }
  }

  validateShareStatus(resp) {
    if (resp?.share_status === 'PASS_CODE_EMPTY' || resp?.share_status === 'PASS_CODE_ERROR') throw new Error('PikPak share requires a password');
    if (resp?.share_status && resp.share_status !== 'OK') throw new Error(`PikPak share status ${resp.share_status}: ${resp.share_status_text || ''}`);
  }

  async scanAllFiles(client) {
    const out = [];
    const walk = async (parentId, pathPrefix, depth) => {
      if (depth > this.maxDepth || out.length >= this.maxFiles) return;
      let pageToken = '';
      const folders = [];
      do {
        const resp = await client.getShareDetail(this.shareId, parentId, pageToken);
        this.validateShareStatus(resp);
        for (const f of resp.files || []) {
          if (f.kind === 'drive#folder') folders.push(f);
          else if (VIDEO_EXT.test(String(f.name || ''))) {
            const joined = pathPrefix ? `${pathPrefix}/${f.name}` : f.name;
            out.push({
              id: String(f.id), name: String(f.name || ''), path: pathPrefix || '',
              size: Number(f.size || 0), season: inferSeason(joined), episode: inferEpisode(joined)
            });
            if (out.length >= this.maxFiles) break;
          }
        }
        pageToken = resp.next_page_token || '';
      } while (pageToken && out.length < this.maxFiles);
      for (const folder of folders) {
        if (out.length >= this.maxFiles) break;
        const sub = pathPrefix ? `${pathPrefix}/${folder.name}` : String(folder.name || '');
        await walk(folder.id, sub, depth + 1);
      }
    };
    await walk(this.rootParentId, '', 0);
    return out;
  }

  async listFiles(force = false) {
    const now = Date.now();
    if (!force && this.fileCache && this.fileCache.expiresAt > now) return this.fileCache.value;
    const files = await this.withRetry(client => this.scanAllFiles(client));
    this.fileCache = { value: files, expiresAt: now + this.cacheTtlMs };
    this.groupCache = null;
    return files;
  }

  groupFiles(files) {
    const map = new Map();
    for (const file of files) {
      const top = String(file.path || '').split('/').filter(Boolean)[0];
      const title = cleanTitle(top || file.name);
      const key = normalizeText(title) || String(file.id);
      const id = crypto.createHash('sha1').update(key).digest('hex').slice(0, 14);
      if (!map.has(id)) map.set(id, { id, key, title, files: [] });
      map.get(id).files.push(file);
    }
    const groups = [...map.values()];
    for (const group of groups) group.files.sort((a, b) => (a.season - b.season) || ((a.episode ?? 1e9) - (b.episode ?? 1e9)) || a.name.localeCompare(b.name));
    return groups.sort((a, b) => a.title.localeCompare(b.title, 'vi'));
  }

  async groups(force = false) {
    const now = Date.now();
    if (!force && this.groupCache && this.groupCache.expiresAt > now) return this.groupCache.value;
    const value = this.groupFiles(await this.listFiles(force));
    this.groupCache = { value, expiresAt: now + this.cacheTtlMs };
    return value;
  }

  async getGroup(groupId) {
    return (await this.groups()).find(x => x.id === groupId) || null;
  }

  episodeList(group) {
    const seen = new Set();
    const out = [];
    let fallback = 1;
    for (const file of group?.files || []) {
      const season = Number(file.season || 1);
      const episode = Number(file.episode || fallback++);
      const key = `${season}:${episode}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ season, episode, title: `Tập ${episode}`, filename: file.name });
    }
    return out.sort((a, b) => a.season - b.season || a.episode - b.episode);
  }

  async findCandidates(query = {}) {
    let files;
    if (query.groupId) {
      const group = await this.getGroup(query.groupId);
      files = group?.files || [];
    } else {
      files = await this.listFiles();
    }
    if (!files.length) return [];
    const scored = files.map(file => ({ file, score: query.groupId ? 100 : scoreCandidate(file, query) }));
    if (query.episode) {
      const exact = scored.filter(x => Number(x.file.episode) === Number(query.episode) && (!query.season || Number(x.file.season || 1) === Number(query.season)));
      if (exact.length) return exact.sort((a, b) => b.score - a.score).map(x => x.file).slice(0, 5);
    }
    return scored.filter(x => x.score >= (query.groupId ? 0 : 55)).sort((a, b) => b.score - a.score).map(x => x.file).slice(0, 5);
  }

  async resolveFile(file) {
    const cached = this.directCache.get(file.id);
    if (cached && cached.expiresAt > Date.now()) return { ...file, ...cached.value };
    const value = await this.withRetry(async client => {
      const response = await client.getFileInfo(this.shareId, file.id);
      const info = response.file_info || response;
      const url = pickDownloadUrl(info, Boolean(this.options.useTranscoding));
      if (!url) throw new Error(`No PikPak direct URL for ${file.name}`);
      return {
        url,
        headers: { 'User-Agent': DEFAULT_UA, Referer: 'https://mypikpak.com/' }
      };
    });
    this.directCache.set(file.id, { value, expiresAt: Date.now() + this.directTtlMs });
    return { ...file, ...value };
  }

  async resolveCandidates(files, limit = 3) {
    const out = [];
    for (const file of (files || []).slice(0, Math.max(1, limit))) {
      try { out.push(await this.resolveFile(file)); } catch {}
    }
    return out;
  }

  async health() {
    const started = Date.now();
    try {
      const files = await this.listFiles(true);
      return { ok: true, latencyMs: Date.now() - started, files: files.length, shareId: this.shareId, rootParentId: this.rootParentId || null };
    } catch (e) {
      return { ok: false, latencyMs: Date.now() - started, error: String(e.message || e), shareId: this.shareId, rootParentId: this.rootParentId || null };
    }
  }
}

function createProvider(options = {}) {
  return new PikPakShareProvider(options);
}

module.exports = {
  createProvider,
  parseShareUrl,
  cleanTitle,
  inferSeason,
  inferEpisode,
  normalizeText,
  DEFAULT_UA
};
