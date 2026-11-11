const CACHE_NAME = 'hokuriku-trip-v6';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './apple-touch-icon.png'
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
  // 排除非 GET 請求與外部氣象 API 請求（氣象由 localStorage 獨立快取）
  if (e.request.method !== 'GET' || e.request.url.includes('api.open-meteo.com')) {
    return;
  }
  e.respondWith(
    fetch(e.request)
      .then(res => {
        // 有網路時：抓取最新檔案並同步更新進快取
        const resClone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, resClone));
        return res;
      })
      .catch(() => {
        // 斷網或山區無訊號時：自動退回讀取快取檔案
        return caches.match(e.request);
      })
  );
});