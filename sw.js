const CACHE_NAME = 'hokuriku-trip-v13';
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
  if (e.request.method !== 'GET') return;
  const reqUrl = new URL(e.request.url);
  // 僅快取同源應用資源，排除氣象 API、擴充套件等外部請求
  if (reqUrl.origin !== self.location.origin) return;

  // 頁面導覽改用網路優先（短逾時降級快取），確保推版後一次載入即為最新 HTML
  if (e.request.mode === 'navigate') {
    e.respondWith((async () => {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 2000);
      try {
        const res = await fetch(e.request, { signal: ctl.signal });
        clearTimeout(timer);
        if (res && res.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put('./index.html', res.clone());
        }
        return res;
      } catch (err) {
        clearTimeout(timer);
        return (await caches.match(e.request, { ignoreSearch: true }))
          || (await caches.match('./index.html'))
          || Response.error();
      }
    })());
    return;
  }

  // 其餘靜態資源採 Stale-While-Revalidate：秒開快取並於背景更新
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
    caches.match(e.request, { ignoreSearch: true }).then(cachedRes => {
      if (cachedRes) {
        e.waitUntil(networkFetch);
        return cachedRes;
      }
      return networkFetch.then(res => res || Response.error());
    })
  );
});