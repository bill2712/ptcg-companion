// PTCG Companion offline support.
// Pages: network first, fall back to cache. Hashed assets: cache first.
const CACHE = 'ptcg-companion-v2';
const PRECACHE = ['/', '/manifest.json', '/favicon.svg', '/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'cache' || !Array.isArray(event.data.urls)) return;
  event.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.all(event.data.urls.map((u) => c.add(u).catch(() => {}))),
    ),
  );
});

const put = (req, res) => {
  if (res && res.ok && res.type === 'basic') {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copy));
  }
  return res;
};

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => put(req, res)).catch(() =>
        caches.match(req).then((hit) => hit || caches.match('/')),
      ),
    );
    return;
  }

  if (url.pathname.startsWith('/_astro/')) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => put(req, res))));
    return;
  }

  // Everything else: serve from cache, refresh in the background.
  event.respondWith(
    caches.match(req).then((hit) => {
      const network = fetch(req).then((res) => put(req, res)).catch(() => hit);
      return hit || network;
    }),
  );
});
