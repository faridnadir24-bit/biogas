// sw.js — Service Worker AVO-BIO
// Strategi: cache-first untuk aset statis (HTML, manifest, ikon) supaya dashboard
// tetap bisa dibuka walau tanpa koneksi internet. Chart.js CDN & endpoint API
// tetap butuh koneksi (tidak dicache) karena sifatnya dinamis/eksternal.

const CACHE_NAME = 'avobio-cache-v1';
const ASSETS_TO_CACHE = [
  './avobio.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Install: simpan aset statis ke cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

// Activate: bersihkan cache versi lama
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first untuk aset lokal, network passthrough untuk request lain (CDN/API)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isLocalAsset = ASSETS_TO_CACHE.some((asset) => url.pathname.endsWith(asset.replace('./', '')));

  if (!isLocalAsset) return; // biarkan browser tangani request eksternal (Chart.js CDN, API sensor)

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return res;
      }).catch(() => cached);
    })
  );
});
