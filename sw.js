const APP_VERSION = '2026.05.25.2';
const CACHE_NAME = 'taubenpro-v' + APP_VERSION;

// Kern-Assets: UI startet sofort, auch offline
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './selflearn.js',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

// Externe CDNs (Cache-First, einmalig geladen)
const CDN_CACHE = [
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/localforage/1.10.0/localforage.min.js'
];

// Install: Kern-Assets cachen, sofort aktivieren
self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache =>
            cache.addAll(ASSETS_TO_CACHE).catch(err => {
                console.warn('[SW] Teilweiser Cache-Fehler:', err);
            })
        )
    );
});

// Activate: alte Caches löschen, neue Version sofort übernehmen
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(names =>
            Promise.all(
                names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
            )
        ).then(() => self.clients.claim())
    );
});

// Fetch-Strategie
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Nur GET-Requests cachen
    if (event.request.method !== 'GET') return;

    // API-Proxy: NIEMALS cachen (RiRo-Live-Daten)
    if (url.pathname.startsWith('/api/')) return;

    // Eigene Dateien: Network-First (frisch holen, Cache als Fallback)
    if (url.origin === self.location.origin) {
        event.respondWith(
            fetch(event.request)
                .then(resp => {
                    const clone = resp.clone();
                    caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
                    return resp;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // Externe CDNs: Cache-First (Leaflet, Chart.js, Fonts)
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(resp => {
                // CDN-Responses cachen für Offline
                if (resp.ok) {
                    const clone = resp.clone();
                    caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
                }
                return resp;
            });
        })
    );
});
