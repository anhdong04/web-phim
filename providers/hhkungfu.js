var BASE_URL = 'https://hhkungfu.ee';
var USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36';
var BLOCKED = ['short.icu', 'streamc.xyz', 'freeplayervideo.com', 'abysscdn.com'];

function originOf(url) {
  try { return new URL(url).origin; } catch (e) { return BASE_URL; }
}

function requestHeaders(referer) {
  var ref = referer || BASE_URL + '/';
  return {
    'User-Agent': USER_AGENT,
    'Referer': ref,
    'Origin': originOf(ref),
    'Accept': '*/*'
  };
}

function fetchText(url, referer) {
  return fetch(url, { headers: requestHeaders(referer) }).then(function (res) {
    if (!res.ok) throw new Error('HTTP ' + res.status + ' ' + url);
    return res.text();
  });
}

function fetchJson(url, referer) {
  return fetchText(url, referer).then(function (text) { return JSON.parse(text); });
}

function decodeHtml(text) {
  return String(text || '')
    .replace(/&#(\d+);/g, function (_, n) { return String.fromCharCode(Number(n)); })
    .replace(/&#x([0-9a-f]+);/gi, function (_, n) { return String.fromCharCode(parseInt(n, 16)); })
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

function stripHtml(text) {
  return decodeHtml(String(text || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function normalizeTitle(text) {
  return stripHtml(text)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function absoluteUrl(raw, base) {
  var value = decodeHtml(String(raw || '').trim()).replace(/\\\//g, '/');
  if (!value || value.indexOf('javascript:') === 0 || value.indexOf('data:') === 0) return '';
  if (value.indexOf('//') === 0) return 'https:' + value;
  try { return new URL(value, base || BASE_URL).href; } catch (e) { return ''; }
}

function metaContent(html, key) {
  var tags = String(html || '').match(/<meta\b[^>]*>/gi) || [];
  for (var i = 0; i < tags.length; i++) {
    var tag = tags[i];
    var prop = (tag.match(/(?:property|name)\s*=\s*["']([^"']+)["']/i) || [])[1] || '';
    if (prop.toLowerCase() !== String(key).toLowerCase()) continue;
    return decodeHtml((tag.match(/content\s*=\s*["']([^"']*)["']/i) || [])[1] || '');
  }
  return '';
}

function cleanTmdbTitle(title) {
  return String(title || '')
    .replace(/\s*[|–-]\s*The Movie Database.*$/i, '')
    .replace(/\s*\((?:TV Series|Movie|TV Mini Series)[^)]*\)\s*$/i, '')
    .trim();
}

function fetchTmdbTitle(tmdbId, mediaType, language) {
  var kind = mediaType === 'tv' ? 'tv' : 'movie';
  var url = 'https://www.themoviedb.org/' + kind + '/' + encodeURIComponent(tmdbId) + '?language=' + encodeURIComponent(language);
  return fetchText(url, 'https://www.themoviedb.org/').then(function (html) {
    var title = metaContent(html, 'og:title');
    if (!title) {
      var m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      title = m ? stripHtml(m[1]) : '';
    }
    return cleanTmdbTitle(title);
  }).catch(function () { return ''; });
}

function getTmdbTitles(tmdbId, mediaType) {
  return Promise.all([
    fetchTmdbTitle(tmdbId, mediaType, 'vi-VN'),
    fetchTmdbTitle(tmdbId, mediaType, 'en-US')
  ]).then(function (titles) {
    var out = [];
    titles.forEach(function (t) {
      if (t && out.indexOf(t) < 0) out.push(t);
      var shortTitle = String(t || '').split(/[:|–-]/)[0].trim();
      if (shortTitle && shortTitle.length >= 4 && out.indexOf(shortTitle) < 0) out.push(shortTitle);
    });
    return out;
  });
}

function searchPosts(query) {
  if (!query) return Promise.resolve([]);
  var qs = 'search=' + encodeURIComponent(query) + '&per_page=10&_embed=1&orderby=relevance';
  return fetchJson(BASE_URL + '/wp-json/wp/v2/posts?' + qs, BASE_URL + '/').then(function (posts) {
    return Array.isArray(posts) ? posts : [];
  }).catch(function () { return []; });
}

function postTitle(post) {
  return stripHtml(post && post.title && post.title.rendered || '');
}

function postScore(post, wantedTitles) {
  var p = normalizeTitle(postTitle(post));
  if (!p) return -1;
  var best = 0;
  wantedTitles.forEach(function (wanted) {
    var w = normalizeTitle(wanted);
    if (!w) return;
    if (p === w) best = Math.max(best, 1000);
    else if (p.indexOf(w) >= 0 || w.indexOf(p) >= 0) best = Math.max(best, 700 - Math.abs(p.length - w.length));
    else {
      var parts = w.split(' ').filter(function (x) { return x.length > 2; });
      var hit = 0;
      parts.forEach(function (x) { if (p.indexOf(x) >= 0) hit++; });
      best = Math.max(best, hit * 40);
    }
  });
  return best;
}

function findBestPost(titles) {
  if (!titles.length) return Promise.resolve(null);
  var jobs = titles.slice(0, 4).map(searchPosts);
  return Promise.all(jobs).then(function (groups) {
    var bySlug = {};
    groups.forEach(function (items) {
      items.forEach(function (p) { if (p && p.slug) bySlug[p.slug] = p; });
    });
    var posts = Object.keys(bySlug).map(function (k) { return bySlug[k]; });
    posts.sort(function (a, b) { return postScore(b, titles) - postScore(a, titles); });
    return posts.length && postScore(posts[0], titles) > 0 ? posts[0] : null;
  });
}

function extractCandidates(html, base) {
  var out = [];
  var seen = {};
  function add(raw) {
    var u = absoluteUrl(raw, base);
    if (!u || seen[u]) return;
    var low = u.toLowerCase();
    if (/\.(?:jpg|jpeg|png|gif|webp|svg|css|js|woff2?)(?:\?|$)/i.test(low)) return;
    if (low.indexOf('google') >= 0 || low.indexOf('facebook.com/sharer') >= 0) return;
    seen[u] = true;
    out.push(u);
  }
  var attr = /(?:src|data-src|data-url|data-link|data-file|data-embed)\s*=\s*["']([^"']+)["']/gi;
  var m;
  while ((m = attr.exec(String(html || ''))) !== null) add(m[1]);
  var urls = /https?:\\?\/\\?\/[A-Za-z0-9._~:/?#\[\]@!$&()*+,;=%-]+/gi;
  while ((m = urls.exec(String(html || ''))) !== null) add(m[0].replace(/\\\//g, '/'));
  return out;
}

function extractDirectMedia(html, base) {
  return extractCandidates(html, base).filter(function (u) {
    return /\.m3u8(?:\?|$)|\.mp4(?:\?|$)|\/stream(?:[/?]|$)|master\.m3u8/i.test(u);
  });
}

function dailymotion(url, label) {
  var m = String(url).match(/dailymotion\.com\/(?:embed\/)?video\/([^/?#]+)/i);
  if (!m) return Promise.resolve([]);
  var ref = 'https://www.dailymotion.com/';
  return fetchJson('https://www.dailymotion.com/player/metadata/video/' + m[1], ref).then(function (json) {
    var qualities = json && json.qualities || {};
    var keys = ['1080', '720', '480', '380', 'auto'];
    for (var i = 0; i < keys.length; i++) {
      var arr = qualities[keys[i]];
      if (!Array.isArray(arr)) continue;
      for (var j = 0; j < arr.length; j++) {
        if (arr[j] && /\.m3u8/i.test(arr[j].url || '')) {
          return [{ name: 'HHKungfu', title: label + ' • Dailymotion ' + keys[i] + 'p', url: arr[j].url, quality: keys[i] === 'auto' ? 'Auto' : keys[i] + 'p', headers: requestHeaders(ref) }];
        }
      }
    }
    return [];
  }).catch(function () { return []; });
}

function resolveCandidate(url, referer, label, depth) {
  var low = String(url || '').toLowerCase();
  if (!url || BLOCKED.some(function (d) { return low.indexOf(d) >= 0; })) return Promise.resolve([]);

  if (low.indexOf('dailymotion.com/') >= 0) return dailymotion(url, label);
  if (low.indexOf('player.cloudbeta.win/') >= 0) {
    var cb = url.replace('player.cloudbeta.win/', 'play.cloudbeta.win/file/play/') + '.m3u8';
    return Promise.resolve([{ name: 'HHKungfu', title: label + ' • CloudBeta', url: cb, quality: 'Auto', headers: requestHeaders(referer) }]);
  }
  if (low.indexOf('short-cdn.ink/video/') >= 0) {
    var sc = url.replace(/\/$/, '') + '/master.m3u8';
    return Promise.resolve([{ name: 'HHKungfu', title: label + ' • HLS', url: sc, quality: 'Auto', headers: requestHeaders(referer) }]);
  }
  if (/\.m3u8(?:\?|$)/i.test(url)) {
    return Promise.resolve([{ name: 'HHKungfu', title: label + ' • HLS', url: url, quality: 'Auto', headers: requestHeaders(referer) }]);
  }
  if (/\.mp4(?:\?|$)/i.test(url)) {
    return Promise.resolve([{ name: 'HHKungfu', title: label + ' • MP4', url: url, quality: 'Auto', headers: requestHeaders(referer) }]);
  }
  if ((depth || 0) >= 2) return Promise.resolve([]);
  if (low.indexOf(BASE_URL.replace(/^https?:\/\//, '')) >= 0 && low.indexOf('/watch-') < 0) return Promise.resolve([]);

  return fetchText(url, referer).then(function (html) {
    if (/helvid\.net/i.test(url)) {
      var hm = html.match(/["']file["']\s*:\s*["']([^"']+)["']/i);
      if (hm && hm[1]) {
        var hu = absoluteUrl(hm[1].replace('https_//', 'https://'), url);
        if (hu) return resolveCandidate(hu, url, label + ' • Helvid', (depth || 0) + 1);
      }
    }
    var direct = extractDirectMedia(html, url);
    var nested = direct.length ? direct : extractCandidates(html, url).filter(function (u) {
      var x = u.toLowerCase();
      return x.indexOf('streamfree.') >= 0 || x.indexOf('helvid.') >= 0 || x.indexOf('fbcdn') >= 0 || x.indexOf('scontent') >= 0 || x.indexOf('cloudbeta.') >= 0 || x.indexOf('dailymotion.com') >= 0;
    });
    return Promise.all(nested.slice(0, 8).map(function (u) {
      return resolveCandidate(u, url, label, (depth || 0) + 1);
    })).then(function (groups) {
      return [].concat.apply([], groups);
    });
  }).catch(function () { return []; });
}

function streamsForWatch(watchUrl, label) {
  return fetchText(watchUrl, BASE_URL + '/').then(function (html) {
    var candidates = extractCandidates(html, watchUrl).filter(function (u) {
      var low = u.toLowerCase();
      return low.indexOf('/watch-') < 0 && low.indexOf('/wp-') < 0 && low.indexOf('hhkungfu.ee/category/') < 0;
    });
    return Promise.all(candidates.slice(0, 16).map(function (u) {
      return resolveCandidate(u, watchUrl, label, 0);
    })).then(function (groups) { return [].concat.apply([], groups); });
  }).catch(function () { return []; });
}

function dedupe(streams) {
  var seen = {};
  return (streams || []).filter(function (s) {
    if (!s || !s.url || seen[s.url]) return false;
    seen[s.url] = true;
    return true;
  });
}

function getStreams(tmdbId, mediaType, season, episode) {
  var ep = mediaType === 'movie' ? 1 : Math.max(1, Number(episode || 1));
  return getTmdbTitles(tmdbId, mediaType).then(function (titles) {
    if (!titles.length) return [];
    return findBestPost(titles).then(function (post) {
      if (!post || !post.slug) return [];
      var base = BASE_URL + '/watch-' + post.slug + '/tap-' + ep;
      return Promise.all([
        streamsForWatch(base + '-sv1.html', 'Vietsub • Tập ' + ep),
        streamsForWatch(base + '-sv2.html', 'Thuyết minh • Tập ' + ep)
      ]).then(function (groups) { return dedupe(groups[0].concat(groups[1])); });
    });
  }).catch(function (error) {
    console.error('[HHKungfu] ' + (error && error.message || error));
    return [];
  });
}

module.exports = { getStreams: getStreams };
