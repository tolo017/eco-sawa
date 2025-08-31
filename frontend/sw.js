// sw.js - basic offline caching + push handling
const CACHE = 'eco-sawa-v1';
const FILES = [
  '/',
  '/index.html',
  '/donor.html',
  '/rescuer.html',
  '/styles.css',
  '/manifest.json'
];
self.addEventListener('install', evt => {
  evt.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
});
self.addEventListener('fetch', evt => {
  evt.respondWith(caches.match(evt.request).then(r => r || fetch(evt.request)));
});
self.addEventListener('push', function(event) {
  let payload = {};
  try { payload = event.data.json(); } catch(e) { payload = { title: 'EcoSawa', body: event.data ? event.data.text() : 'New pickup' }; }
  const title = payload.title || 'EcoSawa';
  const options = { body: payload.body || '', data: { url: payload.url || '/' } };
  event.waitUntil(self.registration.showNotification(title, options));
});
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';
  event.waitUntil(clients.openWindow(url));
});
