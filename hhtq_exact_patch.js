'use strict';

const crypto = require('node:crypto');
const { HHTQProvider, DEFAULT_UA, fixUrl } = require('./hhtq_provider');

const originalStreams = HHTQProvider.prototype.streams;
const playlistCache = new Map();
const PUBLIC_BASE = String(
  process.env.WEBPHIM_PUBLIC_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  'https://web-phim-zwsx.onrender.com'
).replace(/\/+$/, '');

function cleanupPlaylists() {
  const now = Date.now();
  for (const [key, value] of playlistCache) if (!value || value.exp <= now) playlistCache.delete(key);
  while (playlistCache.size > 300) playlistCache.delete(playlistCache.keys().next().value);
}
function registerPlaylist(body, baseUrl, referer) {
  cleanupPlaylists();
  const text = String(body || '').replace(/\\n/g, '\n').trim();
  if (!/^#EXTM3U(?:\r?\n|$)/.test(text)) return null;
  const id = crypto.randomBytes(18).toString('base64url');
  playlistCache.set(id, { body: text, baseUrl: String(baseUrl || ''), referer: String(referer || ''), exp: Date.now() + 10 * 60_000 });
  return `${PUBLIC_BASE}/hhtq/relay/${id}.m3u8`;
}
function getPlaylist(id) {
  cleanupPlaylists();
  return playlistCache.get(String(id || '')) || null;
}
function deobfuscateVipPl(raw) {
  let s = String(raw || '').trim();
  if (!s) return '';
  try {
    const parsed = JSON.parse(s);
    if (parsed && typeof parsed.pl === 'string') s = parsed.pl;
  } catch {
    const m = s.match(/^\{\s*"pl"\s*:\s*"([\s\S]*)"\s*\}$/);
    if (m) s = m[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
  if (!s) return '';
  const restored = s.charAt(0) + [...s.slice(1)].reverse().join('');
  try {
    return Buffer.from(restored, 'base64').toString('utf8').replace(/"/g, '').trim().replace(/\\n/g, '\n');
  } catch { return ''; }
}
function playerAaaaUrls(html, base) {
  const out = [];
  for (const script of String(html || '').matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    const text = script[1] || '';
    if (!text.includes('player_aaaa')) continue;
    for (const m of text.matchAll(/[,\{]\s*"url"\s*:\s*"([^"]+)"/g)) {
      const raw = m[1].replace(/\\\//g, '/').replace(/\\u0026/g, '&');
      const url = fixUrl(raw, base);
      if (url) out.push(url);
    }
  }
  return [...new Set(out)];
}
function normalizeLink(url) {
  try { return new URL(String(url)).toString(); } catch { return ''; }
}
function directRow(url, name, referer) {
  const u = normalizeLink(url);
  if (!u) return null;
  return {
    serverName: name || 'HHTQ',
    url: u,
    externalUrl: null,
    isM3u8: /\.m3u8(?:$|[?#])/i.test(u),
    headers: { Referer: referer || u, 'User-Agent': DEFAULT_UA }
  };
}
async function fetchText(provider, url, referer) {
  try { return await provider.fetchText(url, referer); } catch { return ''; }
}
async function resolveEmbedCliphub(provider, url, referer) {
  const target = url.endsWith('/') ? url : url + '/';
  const text = await fetchText(provider, target, referer);
  const m = text.match(/let\s+playlist\s*=\s*`([\s\S]*?)`\s*;/i);
  const value = String(m?.[1] || '').trim().replace(/\\n/g, '\n');
  if (!value) return [];
  if (/^https?:\/\//i.test(value)) return [directRow(value, 'HHTQ • Cliphub #1', target)].filter(Boolean);
  const relay = registerPlaylist(value, target, target);
  return relay ? [directRow(relay, 'HHTQ • Cliphub #1', target)] : [];
}
async function resolveVipCliphub(provider, url, referer) {
  const videosUrl = url.replace('/embed/', '/videos/').replace(/\/?$/, '/');
  const raw = await fetchText(provider, videosUrl, referer);
  const playlist = deobfuscateVipPl(raw);
  if (!playlist) return [];
  const id = (() => {
    try {
      const u = new URL(url);
      return u.pathname.replace(/^\/embed\//, '').replace(/^\/+|\/+$/g, '');
    } catch { return ''; }
  })();
  const fakeBase = id
    ? `https://storage.googleapis.com/cloudstream-27898.appspot.com/hhtq%2Fb${id}.m3u8`
    : videosUrl;
  if (/^https?:\/\//i.test(playlist) && !playlist.includes('\n')) return [directRow(playlist, 'HHTQ • Cliphub #2', videosUrl)].filter(Boolean);
  const relay = registerPlaylist(playlist, fakeBase, videosUrl);
  return relay ? [directRow(relay, 'HHTQ • Cliphub #2', videosUrl)] : [];
}
async function resolveHelvid(provider, url, referer) {
  const text = await fetchText(provider, url, referer);
  const scripts = [...text.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(x => x[1] || '').reverse();
  for (const script of scripts) {
    if (!script.includes('playerInstance.setup({')) continue;
    const m = script.match(/file\s*:\s*['"]([^'"]+)['"]\s*,?/i);
    const direct = fixUrl(m?.[1] || '', url);
    if (direct) return [directRow(direct, 'HHTQ • Helvid', url)].filter(Boolean);
  }
  return [];
}
function resolveRumble(url) {
  const m = String(url).match(/rumble\.com\/embed\/v([^/?#]+)/i);
  if (!m) return [];
  return [directRow(`https://rumble.com/hls-vod/${m[1]}/playlist.m3u8?u=0&b=0`, 'HHTQ • Rumble', url)].filter(Boolean);
}
async function resolveGeneric(provider, url, referer) {
  if (/\.(?:m3u8|mp4)(?:$|[?#])/i.test(url)) return [directRow(url, 'HHTQ • Direct', referer)].filter(Boolean);
  if (/embed\.cliphub\.tv/i.test(url)) return resolveEmbedCliphub(provider, url, referer);
  if (/vip\.cliphub\.tv/i.test(url)) return resolveVipCliphub(provider, url, referer);
  if (/^https?:\/\/helvid/i.test(url)) return resolveHelvid(provider, url, referer);
  if (/rumble\.com/i.test(url)) return resolveRumble(url);
  const text = await fetchText(provider, url, referer);
  const matches = [...text.matchAll(/https?:\\?\/\\?\/[^\s'"<>]+?\.(?:m3u8|mp4)(?:\?[^\s'"<>]*)?/gi)]
    .map(m => m[0].replace(/\\\//g, '/'));
  return [...new Set(matches)].slice(0, 3).map(x => directRow(x, 'HHTQ • Direct', url)).filter(Boolean);
}

HHTQProvider.prototype.streams = async function exactHhtqStreams(watchUrl) {
  const raw = await originalStreams.call(this, watchUrl).catch(() => []);
  const direct = (raw || []).filter(x => x?.url && /^https?:\/\//i.test(x.url));
  if (direct.length) return direct;

  const candidates = [];
  try {
    const watchHtml = await this.fetchText(watchUrl, this.mainUrl);
    candidates.push(...playerAaaaUrls(watchHtml, watchUrl));
  } catch {}
  for (const link of raw || []) {
    const u = link?.externalUrl || link?.url;
    if (u) candidates.push(u);
  }

  const unique = [...new Set(candidates.map(normalizeLink).filter(Boolean))].slice(0, 10);
  for (const candidate of unique) {
    try {
      const rows = await resolveGeneric(this, candidate, watchUrl);
      if (rows.length) return rows;
    } catch (e) {
      console.warn('[hhtq] exact resolver failed:', String(e?.message || e).slice(0, 180));
    }
  }
  return [];
};

console.log('[hhtq] exact host resolver enabled');
module.exports = { deobfuscateVipPl, playerAaaaUrls, registerPlaylist, getPlaylist, resolveEmbedCliphub, resolveVipCliphub, resolveHelvid };
