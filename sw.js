// DOWNCINE Service Worker
const VERSION = 'v2';
const SHELL_CACHE = `downcine-shell-${VERSION}`;
const IMG_CACHE = `downcine-img-${VERSION}`;

const SHELL_URLS = [
  './',
  './index.html',
  './app.html',
  './play.html',
  './guide.html',
  './manifest.json'
];

// Install: precache shell
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(SHELL_CACHE)
      .then(cache => cache.addAll(SHELL_URLS).catch(err => console.warn('SW precache failed:', err)))
  );
});

// Activate: clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys
        .filter(k => k !== SHELL_CACHE && k !== IMG_CACHE)
        .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch strategies
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;

  // API calls: network first, no cache (SW không cache API để tránh stale data)
  if (url.hostname.includes('ophim') || url.hostname.includes('phimapi') ||
      url.hostname.includes('corsproxy') || url.hostname.includes('allorigins') ||
      url.hostname.includes('codetabs')) {
    return;
  }

  // Images: cache first, network fallback
  if (url.hostname.includes('img.ophim') || /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(url.pathname)) {
    e.respondWith(
      caches.open(IMG_CACHE).then(cache =>
        cache.match(e.request).then(hit => {
          if (hit) return hit;
          return fetch(e.request).then(res => {
            if (res.ok) cache.put(e.request, res.clone());
            return res;
          }).catch(() => hit);
        })
      )
    );
    return;
  }

  // HTML/CSS/JS shell: network first, cache fallback
  if (url.origin === self.location.origin ||
      url.hostname.includes('fonts.googleapis') ||
      url.hostname.includes('fonts.gstatic') ||
      url.hostname.includes('cdnjs.cloudflare')) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(SHELL_CACHE).then(cache => cache.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match(e.request))
    );
  }
});
