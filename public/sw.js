// Сервис-воркер: нужен, чтобы сайт можно было установить на телефон как приложение. Всё берётся из сети.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
