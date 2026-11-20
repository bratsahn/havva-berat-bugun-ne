// Havva & Berat — Web Push Service Worker
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Havva & Berat', body: event.data ? event.data.text() : 'Yeni bir bildirim var!' };
  }

  const title = data.title || 'Havva & Berat — Bugün Ne?';
  const options = {
    body: data.body || 'Yeni bir bildirim geldi!',
    icon: data.icon || '/icon.png',
    badge: '/icon.png',
    vibrate: [140, 60, 140],
    data: { url: data.url || '/' }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
