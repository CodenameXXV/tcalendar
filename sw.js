// ── Service Worker: Календар для вчителя ──
const CACHE_NAME = 'teacher-calendar-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-512.jpg'
];

// ── Install — кешуємо ресурси ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// ── Activate — чистимо старий кеш ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch — Network-first з fallback на кеш ──
self.addEventListener('fetch', event => {
  // Ігноруємо non-GET та зовнішні запити до Firebase тощо
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Кешуємо свіжу копію
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ── Notification scheduling via postMessage ──
let _notifTimer = null;

self.addEventListener('message', event => {
  const data = event.data;
  if (!data || data.type !== 'SCHEDULE_NOTIFICATION') return;

  // Скасовуємо попередній таймер
  if (_notifTimer) {
    clearTimeout(_notifTimer);
    _notifTimer = null;
  }

  const { delayMs, title, body, tag } = data;

  if (delayMs <= 0) return;

  _notifTimer = setTimeout(() => {
    self.registration.showNotification(title, {
      body: body,
      icon: './icons/icon.svg',
      badge: './icons/icon.svg',
      tag: tag || 'lesson-reminder',
      vibrate: [200, 100, 200],
      requireInteraction: false,
      data: { url: './' }
    });
    _notifTimer = null;

    // Повідомляємо клієнта, що сповіщення показано — він запланує наступне
    self.clients.matchAll({ type: 'window' }).then(clients => {
      clients.forEach(client => {
        client.postMessage({ type: 'NOTIFICATION_FIRED', tag: tag });
      });
    });
  }, delayMs);
});

// ── Клік по сповіщенню — фокус на вкладку ──
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      // Фокусуємо існуючу вкладку
      for (const client of clients) {
        if (client.url.includes('index.html') || client.url.endsWith('/')) {
          return client.focus();
        }
      }
      // Або відкриваємо нову
      return self.clients.openWindow('./');
    })
  );
});
