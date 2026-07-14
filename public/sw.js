const CACHE_NAME = 'ilac-takip-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      if (clientList.length > 0) {
        clientList[0].focus();
      } else {
        self.clients.openWindow('/');
      }
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SCHEDULE_NOTIFICATION') {
    const { medicationId, medicationName, delay, dosage } = event.data;
    
    setTimeout(() => {
      self.registration.showNotification('İlaç Hatırlatması', {
        body: `${medicationName} (${dosage}) ilacınızı alma zamanı geldi!`,
        icon: '/icon-192.svg',
        badge: '/icon-192.svg',
        tag: `med-${medicationId}`,
        requireInteraction: true,
        actions: [
          { action: 'taken', title: 'Alındı' },
          { action: 'snooze', title: '10 dk Ertele' }
        ],
        data: { medicationId, medicationName, dosage }
      });
    }, delay);
  }
});
