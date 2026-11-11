const CACHE_NAME = 'hokuriku-trip-v8';
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

  // Stale-While-Revalidate：秒開快取，同時於背景靜默檢查更新（山區弱訊號不卡白畫面）
  const networkFetch = fetch(e.request)
    .then(res => {
      if (res && res.ok) {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, resClone));
      }
      return res;
    })
    .catch(() => null);

  e.respondWith(
    caches.match(e.request).then(cachedRes => {
      if (cachedRes) {
        e.waitUntil(networkFetch);
        return cachedRes;
      }
      return networkFetch.then(res => {
        if (res) return res;
        if (e.request.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      });
    })
  );
});