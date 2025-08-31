// sw.js - basic offline caching
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
