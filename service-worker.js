const CACHE_NAME = 'peopledesk-mobile-clock-v1';
const APP_FILES = [
  './clock.html',
  './clock.css',
  './clock.js',
  './manifest.webmanifest',
  './clock-icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Serve the clock UI shell offline. This does not queue or confirm
  // attendance actions; they remain explicitly device-local previews.
  event.respondWith(
    fetch(request).catch(() => caches.match(request).then((cached) => cached || Response.error()))
  );
});
