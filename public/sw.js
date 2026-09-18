// Meri Local Bazaar - Progressive Web App & Push Notification Service Worker
const CACHE_NAME = 'mlb-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Listen for direct notification requests from app client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    const notificationOptions = {
      body: options?.body || '',
      icon: options?.icon || '/app_logo.png',
      badge: options?.badge || '/app_logo.png',
      vibrate: options?.vibrate || [200, 100, 200],
      tag: options?.tag || `mlb-alert-${Date.now()}`,
      renotify: true,
      data: options?.data || { url: '/' },
      ...options,
    };

    event.waitUntil(
      self.registration.showNotification(title, notificationOptions)
    );
  }
});

// Handle push events from Web Push server / WebintoApp / FCM
self.addEventListener('push', (event) => {
  let title = 'Meri Local Bazaar 🔔';
  let body = 'Aapke account par ek naya alert aaya hai.';
  let data = { url: '/' };

  if (event.data) {
    try {
      const payload = event.data.json();
      title = payload.title || title;
      body = payload.body || payload.message || body;
      data = payload.data || data;
    } catch (e) {
      body = event.data.text() || body;
    }
  }

  const options = {
    body,
    icon: '/app_logo.png',
    badge: '/app_logo.png',
    vibrate: [200, 100, 200],
    data,
    renotify: true,
    tag: `mlb-push-${Date.now()}`,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// When user taps on system notification in status bar, open/focus app window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
