// 오프라인에서도 앱 화면이 열리도록 하는 서비스워커 (네트워크 우선, 실패 시 캐시)
// 파일을 수정해 배포할 때마다 버전 숫자를 올려 주세요.
const CACHE = 'js-v3';
const ASSETS = [
  './', './index.html', './css/app.css',
  './js/i18n.js', './js/data.js', './js/app.js',
  './data/products.json', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
  );
});
