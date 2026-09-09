// ElevAI Cockpit -- service worker
// Objetivo unico: tornar o Cockpit instalavel (PWA) no Android/desktop.
// Nao faz cache de HTML, dados ou chamadas de API -- o Cockpit sempre deve
// mostrar dados atualizados. So serve do cache os assets estaticos do PWA
// (icones/manifest), como fallback quando a rede falhar.
const CACHE = 'elevai-pwa-v1';
const STATIC_ASSETS = ['/icons/icon-192.png', '/icons/icon-512.png', '/manifest.json'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(STATIC_ASSETS)).catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (!STATIC_ASSETS.includes(url.pathname)) return; // HTML/API/dados: sempre rede
  event.respondWith(
    fetch(req).then((res) => {
      caches.open(CACHE).then((c) => c.put(req, res.clone()));
      return res;
    }).catch(() => caches.match(req))
  );
});
