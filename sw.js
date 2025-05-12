// sw.js - Service Worker

const CACHE_NAME = 'doodle-pad-cache-v1'; // Increment version if you change cached files
const urlsToCache = [
  './', // This will cache the root (usually your index or main page)
  './doodle_app.html',
  './manifest.json', // Cache the manifest file too
  // Add paths to any other local CSS or JS files you might have.
  // For external resources like Tailwind CDN and Google Fonts, they are handled by the fetch strategy.
];

// Install event: Cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache and caching core assets');
        // Add external CDN resources directly to cache if critical for offline first
        // Be mindful of CORS issues with cache.addAll for opaque responses from CDNs.
        // It's often better to cache them on first fetch.
        const criticalExternalAssets = [
          'https://cdn.tailwindcss.com',
          'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
        ];
        return cache.addAll(urlsToCache.concat(criticalExternalAssets))
                 .catch(error => console.error('Failed to cache some critical assets during install:', error));
      })
      .catch(err => {
        console.error('Failed to open cache during install:', err);
      })
  );
  self.skipWaiting();
});

// Activate event: Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event: Serve cached content when offline, or fetch from network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Cache hit - return response
        if (cachedResponse) {
          return cachedResponse;
        }

        // Not in cache - fetch from network
        return fetch(event.request).then(
          networkResponse => {
            // Check if we received a valid response
            if (!networkResponse || networkResponse.status !== 200) {
                // For 'opaque' responses (like from CDNs with no CORS), we can't check status.
                // We still cache them but can't verify success.
                if (networkResponse.type === 'opaque') {
                    // Opaque responses can be cached but not inspected
                } else {
                    return networkResponse; // Return non-200 responses as is, don't cache.
                }
            }

            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            return networkResponse;
          }
        ).catch(error => {
          console.error('Fetching failed:', event.request.url, error);
          // Optionally, return a fallback offline page if specific assets fail
          // if (event.request.mode === 'navigate') {
          //   return caches.match('./offline.html'); // You'd need to create and cache an offline.html
          // }
        });
      })
  );
});