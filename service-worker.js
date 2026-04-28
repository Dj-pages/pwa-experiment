const CACHE_NAME = 'pwa-cache-v1';
const CACHED_URLS = [
  '/',
  '/index.html',
  '/app.js',
  '/manifest.json'
];


self.addEventListener('install', event => {
  console.log('[SW] Install event fired');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching all files for offline use');
      return cache.addAll(CACHED_URLS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('[SW] Activate event fired');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  console.log('[SW] Fetch intercepted for:', event.request.url);
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        console.log('[SW] Serving from cache:', event.request.url);
        return cachedResponse;
      }
      console.log('[SW] Fetching from network:', event.request.url);
      return fetch(event.request).then(networkResponse => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      }).catch(() => {
        // Network failed AND not in cache
        return new Response(
          '<h2>You are offline and this page is not cached.</h2>',
          { headers: { 'Content-Type': 'text/html' } }
        );
      });
    })
  );
});


self.addEventListener('sync', event => {
  console.log('[SW] Sync event fired! Tag:', event.tag);
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

// Simulates syncing pending messages to server
async function syncMessages() {
  console.log('[SW] Syncing pending messages to server...');
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log('[SW] Sync complete! All messages sent.');
  
  // ── Tell all open tabs that sync is done! ──
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type: 'SYNC_COMPLETE' });
  });
}
