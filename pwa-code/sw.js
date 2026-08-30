// Coki Gemini Code Pro Service Worker (Network-First Strategy)
const CACHE_NAME = 'coki-code-mcp-v4-live';
const STATIC_ASSETS = [
  '/pwa-code/',
  '/pwa-code/index.html',
  '/pwa-code/style.css',
  '/pwa-code/app.js',
  '/pwa-code/manifest.json',
  '/assets/auth.css',
  '/assets/google-auth.js',
  '/assets/icon-code.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Purging old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Network-First with Cache Fallback for instant updates
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Never cache API or MCP streaming requests
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/mcp/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/pwa-code/index.html');
          }
        });
      })
  );
});
