const CACHE_NAME = 'teacher-calendar-v1.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-72.png',
  '/icons/icon-96.png',
  '/icons/icon-128.png',
  '/icons/icon-144.png',
  '/icons/icon-152.png',
  '/icons/icon-192.png',
  '/icons/icon-384.png',
  '/icons/icon-512.png',
  '/favicon.ico',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/apple-touch-icon.png'
];

// Встановлення Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Активація Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Обробка запитів
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Повертаємо кешовану версію, якщо вона є
        if (response) {
          return response;
        }
        
        // Клонуємо запит
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then((response) => {
          // Перевіряємо чи отримали валідну відповідь
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Клонуємо відповідь
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        }).catch(() => {
          // Офлайн fallback
          if (event.request.destination === 'document') {
            return caches.match('/index.html');
          }
        });
      })
  );
});

// Обробка повідомлень від клієнта
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Фонова синхронізація (якщо потрібно)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

function doBackgroundSync() {
  // Тут можна додати логіку для синхронізації даних
  console.log('Background sync triggered');
}

// Push-повідомлення (якщо потрібно в майбутньому)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Нове повідомлення від Календаря вчителя',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Відкрити',
        icon: '/icons/icon-96.png'
      },
      {
        action: 'close',
        title: 'Закрити',
        icon: '/icons/icon-96.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Календар вчителя', options)
  );
});

// Обробка кліків по повідомленнях
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.action === 'close') {
    // Просто закриваємо повідомлення
  } else {
    // Дія за замовчуванням - відкрити додаток
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});