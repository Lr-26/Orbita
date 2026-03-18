const CACHE_NAME = 'orbita-app-v2';
const TILE_CACHE_NAME = 'orbita-tiles-v1';

const ASSETS = [
    '/',
    '/index.html',
    '/main.js',
    'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&family=Inter:wght@400;500&display=swap',
    'https://unpkg.com/maplibre-gl@latest/dist/maplibre-gl.css'
];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(caches.keys().then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME && k !== TILE_CACHE_NAME).map(k => caches.delete(k))
    )));
});

self.addEventListener('fetch', e => {
    const url = new URL(e.request.url);

    // Tile Caching: Cache-First
    if (url.hostname.includes('tiles.openfreemap.org') || url.hostname.includes('tile')) {
        e.respondWith(
            caches.open(TILE_CACHE_NAME).then(cache => 
                cache.match(e.request).then(res => 
                    res || fetch(e.request).then(netRes => {
                        cache.put(e.request, netRes.clone());
                        return netRes;
                    })
                )
            )
        );
        return;
    }

    // App Shell: Stale-While-Revalidate
    e.respondWith(
        caches.match(e.request).then(cachedRes => {
            const fetchPromise = fetch(e.request).then(netRes => {
                const clone = netRes.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
                return netRes;
            }).catch(() => cachedRes);
            return cachedRes || fetchPromise;
        })
    );
});
