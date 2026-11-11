(() => {
  'use strict';

  const CACHE_NAME = 'peopledesk-mobile-clock-v4';

  const APP_FILES = [
    './clock.html',
    './clock.css',
    './clock-menu.css',
    './clock-device-status.css',
    './hrms-config.js',
    './employee-auth.js',
    './employee-auth.css',
    './clock.js',
    './clock-device-status.js',
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
        .then((keys) => {
          return Promise.all(
            keys
              .filter((key) => (
                key.startsWith('peopledesk-mobile-clock-') &&
                key !== CACHE_NAME
              ))
              .map((key) => caches.delete(key))
          );
        })
        .then(() => self.clients.claim())
    );
  });

  self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // Never intercept authenticated API requests.
    if (
      request.method !== 'GET' ||
      url.origin !== self.location.origin ||
      url.pathname.startsWith('/v1/') ||
      url.pathname === '/health'
    ) {
      return;
    }

    event.respondWith(
      fetch(request).catch(() => {
        return caches.match(request).then((cached) => {
          return cached || Response.error();
        });
      })
    );
  });
})();
