JavaScript
const CACHE_NAME = 'hokuriku-trip-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './apple-touch-icon.png'
  // 若後續有獨立的 CSS 檔案 (例如 style.css)，也請加到這裡
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});