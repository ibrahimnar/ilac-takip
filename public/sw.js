const CACHE_NAME = 'ilac-takip-v3';
const BASE_PATH = '/ilac-takip/';
const urlsToCache = [
  BASE_PATH,
  BASE_PATH + 'index.html',
  BASE_PATH + 'manifest.json'
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

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});

// Oturum boyunca tetiklenen bildirim etiketleri (tekrarı engeller)
const firedTags = new Set();
const scheduledTags = new Set();

function buildOptions({ tag, label, time, medList }) {
  const body = medList && medList.length
    ? `${medList} ilaç(lar)ınızı alma zamanı!`
    : 'İlaç alma zamanı geldi!';
  return {
    title: `💊 ${label} İlaç Hatırlatması (${time})`,
    body,
    icon: BASE_PATH + 'icon-192.png',
    badge: BASE_PATH + 'icon-192.png',
    tag,
    renotify: true,
    requireInteraction: true,
    actions: [
      { action: 'taken', title: 'Alındı' },
      { action: 'snooze', title: '10 dk Ertele' }
    ],
    data: { tag, groupId: tag.split('-')[2], dateKey: tag.split('-')[1], label, time }
  };
}

async function showGroupNotif(payload) {
  if (firedTags.has(payload.tag)) return;
  firedTags.add(payload.tag);
  const opts = buildOptions(payload);
  await self.registration.showNotification(opts.title, opts);
}

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;

  if (data.type === 'SCHEDULE_GROUP_NOTIFICATION') {
    // Zaten planlandıysa atla
    if (scheduledTags.has(data.tag)) return;
    scheduledTags.add(data.tag);

    const fireAt = Date.now() + data.delay;
    if ('TimestampTrigger' in self && self.registration.showNotification) {
      try {
        self.registration.showNotification('', {
          showTrigger: new self.TimestampTrigger(fireAt),
          tag: data.tag,
          title: `💊 ${data.label} İlaç Hatırlatması (${data.time})`,
          body: data.medList || 'İlaç alma zamanı geldi!',
          icon: BASE_PATH + 'icon-192.png',
          badge: BASE_PATH + 'icon-192.png',
          renotify: true,
          requireInteraction: true,
          actions: [
            { action: 'taken', title: 'Alındı' },
            { action: 'snooze', title: '10 dk Ertele' }
          ],
          data: { tag: data.tag, groupId: data.groupId, dateKey: data.dateKey, label: data.label, time: data.time }
        });
        return;
      } catch (e) {
        console.warn('TimestampTrigger desteklenmiyor, setTimeout kullanılıyor', e);
      }
    }
    // Yedek: SW içi zamanlayıcı
    setTimeout(() => showGroupNotif(data), data.delay);
  }

  if (data.type === 'SHOW_GROUP_NOTIFICATION') {
    showGroupNotif(data);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};

  if (event.action === 'taken' && data.groupId && data.dateKey) {
    // Uygulamaya onay mesajı gönder
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((c) => c.postMessage({ type: 'ACK_GROUP', groupId: data.groupId, dateKey: data.dateKey }));
        if (clients.length > 0) clients[0].focus();
        else self.clients.openWindow(BASE_PATH);
      })
    );
    return;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      if (clients.length > 0) clients[0].focus();
      else self.clients.openWindow(BASE_PATH);
    })
  );
});
