// StudyBuddy Service Worker — Offline-first caching
// Caches the shell (HTML/CSS/JS) so the UI loads without internet.
// API calls (Ollama) go through as normal — they hit localhost anyway.

const CACHE_NAME = 'studybuddy-v1';
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// On install: cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

// On activate: delete old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - API routes (/chat, /agent, /socratic, etc.) → network only (they call localhost Ollama)
// - Shell assets → cache first, fall back to network
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API calls and dev routes — always go to network
  const apiPaths = ['/chat', '/agent', '/socratic', '/quiz', '/progress',
                    '/concept-map', '/due-reviews', '/streak', '/srs',
                    '/estimate', '/cache', '/dev'];
  if (apiPaths.some(p => url.pathname.startsWith(p))) {
    return; // let browser handle normally
  }

  // Shell assets — cache first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        // Cache successful GET responses for shell assets
        if (event.request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    }).catch(() => {
      // If both cache and network fail, return the cached root page
      return caches.match('/');
    })
  );
});
