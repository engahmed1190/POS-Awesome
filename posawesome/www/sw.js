// Cache version constants for easy maintenance
const CACHE_VERSION = {
  STATIC: 'static-v3',
  API: 'api-v2',
  RUNTIME: 'runtime-v1'
};

const CACHE_NAMES = Object.values(CACHE_VERSION);

// App shell resources to precache
const APP_SHELL = [
  '/app/posapp',
  '/assets/posawesome/js/posawesome.bundle.js',
  '/assets/posawesome/js/offline.js',
  '/assets/posawesome/js/cache-db.js',
  '/assets/posawesome/css/posawesome.css',
  '/manifest.json',
  '/offline.html',
  '/assets/posawesome/icons/icon-192x192.png',
  '/assets/posawesome/icons/icon-512x512.png',
  // Keep only sound files that might exist
  '/assets/frappe/sounds/email.mp3',
  '/assets/frappe/sounds/submit.mp3',
  '/assets/frappe/sounds/cancel.mp3',
  '/assets/frappe/sounds/delete.mp3',
  '/assets/frappe/sounds/click.mp3',
  '/assets/frappe/sounds/error.mp3',
  '/assets/frappe/sounds/alert.mp3',
  '/assets/erpnext/sounds/incoming-call.mp3',
  '/assets/erpnext/sounds/call-disconnect.mp3'
];

// Install event - precache app shell
self.addEventListener('install', event => {
  console.log('SW: Installing service worker');
  self.skipWaiting();

  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_VERSION.STATIC);
        console.log('SW: Precaching app shell');

        // Precache app shell with error handling for each resource
        const cachePromises = APP_SHELL.map(async url => {
          try {
            const response = await fetch(url);
            if (response && response.ok) {
              await cache.put(url, response.clone());
              console.log(`SW: Cached ${url}`);
            } else {
              console.warn(`SW: Failed to cache ${url} - ${response.status}`);
            }
          } catch (error) {
            console.warn(`SW: Failed to fetch ${url}:`, error);
          }
        });

        await Promise.allSettled(cachePromises);
        console.log('SW: App shell precaching completed');
      } catch (error) {
        console.error('SW: Install failed:', error);
      }
    })()
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('SW: Activating service worker');

  event.waitUntil(
    (async () => {
      try {
        // Clean up old caches
        const cacheNames = await caches.keys();
        const deletePromises = cacheNames
          .filter(cacheName => !CACHE_NAMES.includes(cacheName))
          .map(cacheName => {
            console.log(`SW: Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          });

        await Promise.all(deletePromises);
        console.log('SW: Cache cleanup completed');

        // Take control of all clients
        await self.clients.claim();
        console.log('SW: Claimed all clients');
      } catch (error) {
        console.error('SW: Activation failed:', error);
      }
    })()
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip non-HTTP(S) requests
  if (!['http:', 'https:'].includes(url.protocol)) return;

  // Skip socket.io requests
  if (request.url.includes('socket.io')) return;

  // Navigation requests - fallback strategy
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // API requests - network-first strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Static assets - cache-first strategy
  if (isStaticAsset(url.pathname)) {
    event.respondWith(handleStaticAsset(request));
    return;
  }

  // Default - stale-while-revalidate
  event.respondWith(handleDefault(request));
});

// Navigation request handler with offline fallback
async function handleNavigationRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      return networkResponse;
    }
  } catch (error) {
    console.log('SW: Network failed for navigation, trying cache');
  }

  try {
    // Try cache
    const cachedResponse = await caches.match(request, { ignoreSearch: true });
    if (cachedResponse) {
      return cachedResponse;
    }

    // Try app shell
    const appShellResponse = await caches.match('/app/posapp');
    if (appShellResponse) {
      return appShellResponse;
    }
  } catch (error) {
    console.error('SW: Cache lookup failed:', error);
  }

  // Final fallback to offline page
  try {
    const offlineResponse = await caches.match('/offline.html');
    return offlineResponse || new Response('Offline', { status: 503 });
  } catch (error) {
    return new Response('Service Unavailable', { status: 503 });
  }
}

// API request handler - network-first with caching
async function handleApiRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      // Cache successful API responses
      const cache = await caches.open(CACHE_VERSION.API);
      await cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    console.log('SW: Network failed for API request, trying cache');
  }

  // Fallback to cache
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Add header to indicate cached response
      const response = cachedResponse.clone();
      response.headers.set('X-Served-By', 'ServiceWorker-Cache');
      return response;
    }
  } catch (error) {
    console.error('SW: Cache lookup failed for API request:', error);
  }

  return new Response('API Unavailable', { status: 503 });
}

// Static asset handler - cache-first
async function handleStaticAsset(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
  } catch (error) {
    console.error('SW: Cache lookup failed for static asset:', error);
  }

  try {
    // Fallback to network
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      // Cache the response
      const cache = await caches.open(CACHE_VERSION.STATIC);
      await cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    console.log('SW: Network failed for static asset');
  }

  return new Response('Asset Unavailable', { status: 404 });
}

// Default handler - stale-while-revalidate
async function handleDefault(request) {
  try {
    const cachedResponse = await caches.match(request);

    // Start network request in background
    const networkPromise = fetch(request).then(response => {
      if (response && response.ok) {
        const cache = caches.open(CACHE_VERSION.RUNTIME);
        cache.then(c => c.put(request, response.clone()));
      }
      return response;
    }).catch(() => null);

    // Return cached response immediately if available
    if (cachedResponse) {
      return cachedResponse;
    }

    // Wait for network if no cache
    return await networkPromise || new Response('Unavailable', { status: 503 });
  } catch (error) {
    console.error('SW: Default handler failed:', error);
    return new Response('Service Error', { status: 500 });
  }
}

// Helper function to identify static assets
function isStaticAsset(pathname) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf'];
  return staticExtensions.some(ext => pathname.endsWith(ext)) ||
    pathname.startsWith('/assets/') ||
    pathname.startsWith('/static/');
}

// Message handler for cache management
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_VERSION.RUNTIME)
        .then(cache => cache.addAll(event.data.urls))
        .catch(error => console.error('SW: Failed to cache URLs:', error))
    );
  }
});
