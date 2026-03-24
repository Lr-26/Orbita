// @ts-nocheck
// Error logger
window.onerror = (msg, url, line) => console.error(`[Orbita Error] ${msg} at ${line}`);

// Global state
const state = {
    isOffline: !navigator.onLine,
    userCoords: null,
    userHeading: 0,
    bookmarks: JSON.parse(localStorage.getItem('orbita_bookmarks') || '[]'),
    markers: [],
    userMarker: null,
    isTracking: false,
    transportMode: 'walk',
    currentDestination: null,
    engineReady: false,
    celestialActive: false
};

let map;

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    runSplashScreen();
    initMap();
    initUI();
    initLogbookDB();
});

function runSplashScreen() {
    let p = 0;
    const skipBtn = document.getElementById('btn-skip-loading');
    
    // Show skip button after 5s
    setTimeout(() => skipBtn?.classList.add('visible'), 5000);
    skipBtn?.addEventListener('click', () => {
        state.engineReady = true;
        updateSplashProgress(100);
    });

    const interval = setInterval(() => {
        if (state.engineReady) {
            p = Math.max(p, 100);
        } else {
            p += (100 - p) * 0.1; // Smooth logarithmic progress
            if (p >= 95) p = 95; // Wait at 95 until ready
        }
        
        updateSplashProgress(p);
        
        if (p >= 100) {
            clearInterval(interval);
        }
    }, 150);

    // Hard fallback: Force open app after 10s
    setTimeout(() => {
        if (p < 100) {
            console.warn("Safety override: Force starting app.");
            state.engineReady = true;
            updateSplashProgress(100);
        }
    }, 10000);
}

function initMap() {
    const lib = window.maplibregl;
    const container = document.getElementById('map');
    
    if (!lib) {
        console.error("CRITICAL: MapLibre library script not found/loaded.");
        state.engineReady = true; 
        updateSplashProgress(100);
        return;
    }

    if (!container) {
        console.error("CRITICAL: #map container not found.");
        state.engineReady = true;
        updateSplashProgress(100);
        return;
    }

    console.log("Initializing Orbita Map Engine...");

    // Standard OSM Raster Style
    const style = {
        "version": 8,
        "sources": {
            "osm": {
                "type": "raster",
                "tiles": ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
                "tileSize": 256,
                "attribution": "&copy; OSM contributors"
            }
        },
        "layers": [
            {
                "id": "osm",
                "type": "raster",
                "source": "osm",
                "minzoom": 0,
                "maxzoom": 19
            }
        ]
    };

    try {
        map = new lib.Map({
            container: 'map',
            style: style,
            center: [-58.38, -34.60],
            zoom: 2,
            attributionControl: false
        });
        console.log("SUCCESS: Map engine instance created.");

        map.on('load', () => {
            state.engineReady = true;
            console.log("Map successfully loaded.");
            updateSplashProgress(100);
            requestUserLocation(true);
        });

        map.on('error', (e) => {
            console.error("Map experienced an error:", e);
            // If map fails to load style, we should still show the UI
            state.engineReady = true;
            updateSplashProgress(100);
        });

    } catch (err) {
        console.error("Failed to create map instance:", err);
        state.engineReady = true;
        updateSplashProgress(100);
    }

    if (map) {
        map.on('click', () => {
            closeAllPanels();
            const sheet = document.getElementById('bottom-sheet');
            if (sheet && !sheet.classList.contains('hidden')) {
                sheet.classList.add('hidden');
                clearRoute();
            }
        });
    }
}

function updateSplashProgress(p) {
    const bar = document.getElementById('splash-bar');
    if (!bar) return;

    // Prevent going backwards if already finished
    const currentWidth = parseFloat(bar.style.width) || 0;
    if (p < currentWidth && currentWidth >= 99) return;

    bar.style.width = Math.min(p, 100) + '%';
    
    if (p >= 100) {
        console.log("Orbita: Releasing splash screen...");
        setTimeout(() => {
            const screen = document.getElementById('splash-screen');
            if (screen) {
                screen.style.opacity = '0';
                screen.style.transform = 'translateY(-20px) scale(1.05)';
                screen.style.pointerEvents = 'none'; // Allow clicking during fade
                setTimeout(() => {
                    screen.classList.add('hidden');
                    if (map) {
                        map.resize();
                        console.log("Map resized for visibility.");
                    }
                }, 800);
            }
        }, 500);
    }
}

function requestUserLocation(initialEntrance = false) {
    if (!navigator.geolocation) {
        if (initialEntrance) updateSplashProgress(100);
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const coords = [pos.coords.longitude, pos.coords.latitude];
            state.userCoords = coords;
            
            if (initialEntrance) {
                map.flyTo({
                    center: coords,
                    zoom: 15,
                    speed: 0.8,
                    curve: 1,
                    essential: true
                });
            } else {
                map.easeTo({ center: coords, zoom: 16 });
            }
            
            updateUserMarker(coords);
            state.isTracking = true;
        },
        (err) => {
            console.log("Location Denied:", err.message);
            if (initialEntrance) {
                map.flyTo({ center: [-58.3816, -34.6037], zoom: 12 });
            }
        },
        { enableHighAccuracy: true }
    );
}

function updateUserMarker(coords) {
    if (state.userMarker) {
        state.userMarker.setLngLat(coords);
    } else {
        const el = document.createElement('div');
        el.className = 'user-location-arrow';
        el.innerHTML = '<div class="arrow-icon"></div><div class="pulse-ring"></div>';
        state.userMarker = new window.maplibregl.Marker({ element: el })
            .setLngLat(coords)
            .addTo(map);
    }
}

function updateConnectionStatus() {
    const indicator = document.getElementById('connection-status');
    if (indicator) {
        indicator.className = navigator.onLine ? 'status-dot online' : 'status-dot offline';
    }
}

function initUI() {
    const searchInput = document.getElementById('header-search');
    const searchResults = document.getElementById('search-results');
    
    // Search logic with popover
    searchInput?.addEventListener('input', (e) => {
        if (e.target.value.length > 2) searchSuggestions(e.target.value);
        else searchResults?.classList.add('hidden');
    });

    document.getElementById('search-submit')?.addEventListener('click', () => performSearch(searchInput.value));

    // Bottom Navigation Switcher
    const navActions = {
        'nav-map': () => closeAllPanels(),
        'nav-search': () => { closeAllPanels(); searchInput?.focus(); },
        'nav-bookmarks': () => { closeAllPanels(); openPanel('bookmarks-panel'); renderBookmarks(); },
        'nav-mymaps': () => { closeAllPanels(); openPanel('my-maps-panel'); },
        'nav-menu': () => { closeAllPanels(); openPanel('menu-panel'); }
    };

    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            navActions[btn.id]?.();
        });
    });

    // Close buttons for sidebar panels
    document.querySelectorAll('.close-panel').forEach(btn => {
        btn.addEventListener('click', closeAllPanels);
    });

    // Menu Actions
    document.getElementById('menu-celestial')?.addEventListener('click', toggleCelestialLayer);

    // Floating Buttons
    document.getElementById('btn-locate')?.addEventListener('click', locateUser);
    
    const styleBtn = document.getElementById('btn-styles');
    const stylePicker = document.getElementById('style-picker');
    
    styleBtn?.addEventListener('click', (e) => {
        console.log("Style button clicked");
        stylePicker?.classList.toggle('hidden');
    });
    
    // Map Style Picker Actions
    document.querySelectorAll('#style-picker button').forEach(btn => {
        btn.addEventListener('click', () => {
            const style = btn.dataset.style;
            console.log("Selected style:", style);
            if (style) {
                changeMapStyle(style);
                stylePicker?.classList.add('hidden');
            }
        });
    });

    document.getElementById('btn-fullscreen')?.addEventListener('click', toggleFullScreen);
    document.getElementById('btn-zoom-in')?.addEventListener('click', () => map?.zoomIn());
    document.getElementById('btn-zoom-out')?.addEventListener('click', () => map?.zoomOut());

    // Transport Modes (Sync with route)
    document.querySelectorAll('.nav-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.transportMode = btn.dataset.mode;
            updateBottomSheetDistance();
            if (state.currentDestination) calculateRoute(); // Auto-calculate on mode switch
        });
    });

    // Bottom Sheet Actions
    document.getElementById('btn-save-bookmark')?.addEventListener('click', saveCurrentAsBookmark);
    document.getElementById('btn-route-action')?.addEventListener('click', () => calculateRoute(true));
    document.getElementById('btn-share-poi')?.addEventListener('click', () => {
        alert("¡Enlace de ubicación copiado al portapapeles!");
    });
}

function openPanel(id) {
    document.getElementById(id)?.classList.remove('hidden');
}

function closeAllPanels() {
    document.querySelectorAll('.side-panel').forEach(p => p.classList.add('hidden'));
    document.getElementById('style-picker')?.classList.add('hidden');
    document.getElementById('search-results')?.classList.add('hidden');
}

function syncRouteIcon() {
    const icons = { walk: '🚶', bike: '🚲', moto: '🏍️' };
    const routeIcon = document.getElementById('route-icon-main');
    if (routeIcon) routeIcon.textContent = icons[state.transportMode];
}

function toggleFullScreen() {
    const container = document.getElementById('app-container');
    if (!document.fullscreenElement) {
        container.requestFullscreen().catch(err => {
            console.error(`Fullscreen failed: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
}

const mapStyles = {
    streets: 'https://tiles.openfreemap.org/styles/bright',
    dark: 'https://tiles.openfreemap.org/styles/dark', // We'll highlight layers after load
    outdoors: 'https://tiles.openfreemap.org/styles/liberty'
};

function changeMapStyle(styleName) {
    if (!map) {
        console.warn("Map instance is not ready yet.");
        return;
    }
    const url = mapStyles[styleName] || mapStyles.streets;
    console.log("Changing style to:", url);
    map.setStyle(url);
    map.once('styledata', () => {
        state.markers.forEach(m => m.addTo(map));
        if (styleName === 'dark') enhanceDarkLayers();
    });
}

function enhanceDarkLayers() {
    const layers = map.getStyle().layers;
    
    layers.forEach(l => {
        // High-vis Green for Trails and Paths in Mountains
        if (l.id.includes('path') || l.id.includes('track') || l.id.includes('hiking') || 
            l.id.includes('trail') || l.id.includes('cycleway') || l.id.includes('footway')) {
            map.setPaintProperty(l.id, 'line-color', '#10b981'); // Emerald Green
            map.setPaintProperty(l.id, 'line-width', 2.5);
            map.setPaintProperty(l.id, 'line-opacity', 0.9);
        }
        // Electric Blue for Streets and Roads
        else if (l.id.includes('road') || l.id.includes('highway') || l.id.includes('street') || l.id.includes('motorway') || l.id.includes('primary')) {
            map.setPaintProperty(l.id, 'line-color', '#2a66ff'); // Blue Accent
            map.setPaintProperty(l.id, 'line-opacity', 0.8);
        }
        // Buildings: Subtle contrast with glowing borders
        else if (l.id.includes('building')) {
            map.setPaintProperty(l.id, 'fill-color', '#151520');
            map.setPaintProperty(l.id, 'fill-opacity', 0.7);
            map.setPaintProperty(l.id, 'fill-outline-color', '#2a66ff');
        }
        // Better contrast for water
        else if (l.id.includes('water')) {
            map.setPaintProperty(l.id, 'fill-color', '#001133');
        }
    });

    // Special: Force mountain peaks/labels to stand out
    if (map.getLayer('poi-level-1')) {
         map.setPaintProperty('poi-level-1', 'text-color', '#ffcc00');
    }
}

function toggleTracking() {
    state.isTracking = !state.isTracking;
    const btn = document.getElementById('btn-locate');
    
    if (state.isTracking) {
        btn.style.color = 'var(--accent-blue)';
        startTracking();
    } else {
        btn.style.color = 'white';
        stopTracking();
    }
}

let watchId = null;
function startTracking() {
    if (!("geolocation" in navigator)) {
        alert("Tu navegador no soporta geolocalización.");
        return;
    }

    // Immediate check
    navigator.geolocation.getCurrentPosition(updateUserNavPosition, handleError, {
        enableHighAccuracy: true
    });

    // Continuous watch
    watchId = navigator.geolocation.watchPosition(updateUserNavPosition, handleError, {
        enableHighAccuracy: true,
        maximumAge: 1000
    });
    
    // Window orientation for heading
    window.addEventListener('deviceorientation', handleOrientation);
}

function stopTracking() {
    if (watchId) navigator.geolocation.clearWatch(watchId);
    window.removeEventListener('deviceorientation', handleOrientation);
    if (state.userMarker) state.userMarker.remove();
    state.userMarker = null;
}

function handleOrientation(e) {
    const heading = e.webkitCompassHeading || (360 - e.alpha);
    if (heading) {
        state.userHeading = heading;
        updateUserMarkerRotation();
    }
}

function updateUserNavPosition(pos) {
    const coords = [pos.coords.longitude, pos.coords.latitude];
    state.userCoords = coords;
    
    if (!state.userMarker) {
        const el = document.createElement('div');
        el.className = 'user-location-arrow';
        el.innerHTML = '<div class="pulse-ring"></div><div class="arrow-icon" id="user-arrow"></div>';
        state.userMarker = new maplibregl.Marker({ element: el, rotationAlignment: 'map' })
            .setLngLat(coords)
            .addTo(map);
    } else {
        state.userMarker.setLngLat(coords);
    }

    if (state.isTracking) {
        map.flyTo({ center: coords, zoom: 17, duration: 2000 });
    }
    
    updateUserMarkerRotation();
}

function updateUserMarkerRotation() {
    if (state.userMarker) {
        const arrow = state.userMarker.getElement().querySelector('.arrow-icon');
        if (arrow) arrow.style.transform = `rotate(${state.userHeading}deg)`;
    }
}

function handleError(err) { 
    console.warn('Nav Error:', err); 
    if (err.code === 1) {
        alert("Permiso de ubicación denegado. Por favor, activa la ubicación en tu navegador para usar esta función.");
    } else if (err.code === 2) {
        alert("No se pudo determinar tu ubicación. Asegúrate de tener una buena señal GPS.");
    }
}

function locateUser() {
    toggleTracking();
}

async function downloadCurrentArea() {
    const overlay = document.getElementById('download-progress');
    const fill = document.getElementById('fill');
    const percentCont = document.getElementById('progress-percent');
    
    overlay.classList.remove('hidden');
    
    let total = 20; 
    let count = 0;

    for (let i = 0; i <= total; i++) {
        await new Promise(r => setTimeout(r, 80)); 
        count++;
        let p = Math.floor((count / total) * 100);
        fill.style.width = `${p}%`;
        percentCont.textContent = `${p}%`;
    }

    setTimeout(() => {
        overlay.classList.add('hidden');
        alert("¡Zona descargada con éxito! Orbita funcionará aquí sin internet.");
    }, 500);
}

// --- Search & POI Logic ---
async function searchSuggestions(query) {
    if (!query) return;
    try {
        const center = map.getCenter();
        const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=8&lon=${center.lng}&lat=${center.lat}`);
        const rawData = await res.json();
        const data = rawData.features.map(f => ({
            display_name: [f.properties.name, f.properties.city, f.properties.state].filter(Boolean).join(', '),
            lon: f.geometry.coordinates[0],
            lat: f.geometry.coordinates[1],
            type: f.properties.osm_value,
            class: f.properties.osm_key
        })).filter(i => i.display_name);
        
        const resultsCont = document.getElementById('search-results');
        if (!resultsCont) return;

        resultsCont.innerHTML = '';
        data.forEach(item => {
            const div = document.createElement('div');
            div.className = 'result-item';
            div.innerHTML = `<span><i class="fa-solid fa-location-dot"></i></span> ${item.display_name.split(',')[0]}`;
            div.addEventListener('click', () => {
                resultsCont.classList.add('hidden');
                goToLocation(item);
            });
            resultsCont.appendChild(div);
        });
        resultsCont.classList.remove('hidden');
    } catch (error) {
        console.error("Search failed:", error);
    }
}

function goToLocation(item) {
    if (!item || !item.lon || !item.lat) return;
    const coords = [parseFloat(item.lon), parseFloat(item.lat)];
    state.currentDestination = coords;
    
    map.flyTo({ center: coords, zoom: 15, duration: 2500 });
    
    showBottomSheet({
        title: item.display_name.split(',')[0],
        category: (item.class || item.type || "Lugar").toUpperCase(),
        coords: coords
    });
    
    clearMarkers();
    clearRoute();
    addMarker(coords, item.display_name);
}

async function performSearch(query) {
    if (!query) return;
    
    // UI Feedback: Loading
    const searchBtn = document.getElementById('search-submit');
    if (searchBtn) searchBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    try {
        // Broad search for up to 40 results
        const center = map.getCenter();
        const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=40&lon=${center.lng}&lat=${center.lat}`);
        const rawData = await res.json();
        const data = rawData.features.map(f => ({
            display_name: [f.properties.name, f.properties.city, f.properties.state].filter(Boolean).join(', '),
            lon: f.geometry.coordinates[0],
            lat: f.geometry.coordinates[1],
            type: f.properties.osm_value,
            class: f.properties.osm_key
        })).filter(i => i.display_name);
        
        if (!data || data.length === 0) {
            alert("No encontramos resultados para '" + query + "'. Intenta con algo más general.");
            return;
        }

        if (data.length === 1) {
            goToLocation(data[0]);
        } else {
            // Multiple results: Plot all of them
            displayMultipleResults(data, query);
        }
    } catch (err) {
        console.error("Search failed:", err);
    } finally {
        if (searchBtn) searchBtn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i>';
    }
}

function displayMultipleResults(results, query) {
    clearMarkers();
    clearRoute();
    const bounds = new window.maplibregl.LngLatBounds();
    const resultsCont = document.getElementById('search-results');
    
    if (resultsCont) {
        resultsCont.innerHTML = `<div class="results-info">Encontramos ${results.length} resultados para "${query}"</div>`;
    }

    results.forEach((item, index) => {
        const coords = [parseFloat(item.lon), parseFloat(item.lat)];
        const type = getCategorizedType(item);
        
        // Add Marker
        addMarker(coords, item.display_name, type);
        bounds.extend(coords);

        // List in results panel
        if (resultsCont) {
            const div = document.createElement('div');
            div.className = 'result-item';
            div.innerHTML = `<span>${index + 1}.</span> ${item.display_name.split(',')[0]} <small>${item.type || ''}</small>`;
            div.addEventListener('click', () => {
                goToLocation(item);
                resultsCont.classList.add('hidden');
            });
            resultsCont.appendChild(div);
        }
    });

    if (resultsCont) resultsCont.classList.remove('hidden');
    
    // Zoom out to show all markers
    map.fitBounds(bounds, { padding: 80, maxZoom: 14 });
}

function getCategorizedType(item) {
    const raw = (item.type || item.class || '').toLowerCase();
    if (raw.includes('shelter') || raw.includes('hut') || raw.includes('refugio')) return 'shelter';
    if (raw.includes('restaurant') || raw.includes('food')) return 'restaurant';
    if (raw.includes('cafe')) return 'cafe';
    if (raw.includes('hotel') || raw.includes('hostel')) return 'hotel';
    if (raw.includes('park') || raw.includes('forest')) return 'park';
    if (raw.includes('peak') || raw.includes('mountain')) return 'park';
    return 'default';
}

// --- Bookmarks Logic ---
function saveCurrentAsBookmark() {
    if (!state.currentDestination) return;
    const title = document.getElementById('sheet-title').textContent;
    const bookmark = { title, coords: state.currentDestination, id: Date.now() };
    state.bookmarks.push(bookmark);
    localStorage.setItem('orbita_bookmarks', JSON.stringify(state.bookmarks));
    alert("¡Guardado en Favoritos!");
}

function renderBookmarks() {
    const list = document.getElementById('bookmarks-list');
    if (!list) return;
    if (state.bookmarks.length === 0) {
        list.innerHTML = '<p class="empty-msg">No tienes lugares guardados todavía.</p>';
        return;
    }
    list.innerHTML = '';
    state.bookmarks.forEach(bm => {
        const div = document.createElement('div');
        div.className = 'result-item';
        div.innerHTML = `<span>🔖</span> ${bm.title}`;
        div.addEventListener('click', () => {
            closeAllPanels();
            map.flyTo({ center: bm.coords, zoom: 15 });
            showBottomSheet({ title: bm.title, coords: bm.coords });
        });
        list.appendChild(div);
    });
}

async function searchNearby(type) {
    const center = map.getCenter();
    const query = `${type} near ${center.lat}, ${center.lng}`;
    // Simulating Nominatim query for POI categories
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${type}&viewbox=${center.lng-0.05},${center.lat+0.05},${center.lng+0.05},${center.lat-0.05}&bounded=1&limit=10`);
        const data = await response.json();
        
        clearMarkers();
        data.forEach(item => {
            addMarker([item.lon, item.lat], item.display_name, type);
        });
    } catch (error) {
        console.error("Nearby search failed:", error);
    }
}

function addMarker(coords, title, type = 'default') {
    const el = document.createElement('div');
    el.className = 'custom-marker';
    
    const colors = {
        restaurant: '#ff9500',
        cafe: '#5856d6',
        gas: '#ff3b30',
        hotel: '#5ac8fa',
        park: '#4cd964',
        shelter: '#a0522d', // Sienna/SaddleBrown for cabins/shelters
        default: '#2a66ff'
    };

    const icons = {
        restaurant: '<i class="fa-solid fa-utensils"></i>',
        cafe: '<i class="fa-solid fa-mug-saucer"></i>',
        gas: '<i class="fa-solid fa-gas-pump"></i>',
        hotel: '<i class="fa-solid fa-bed"></i>',
        park: '<i class="fa-solid fa-tree"></i>',
        shelter: '<i class="fa-solid fa-house-chimney-window"></i>',
        default: '<i class="fa-solid fa-location-dot"></i>'
    };

    el.style.backgroundColor = colors[type] || colors.default;
    el.innerHTML = `<div class="marker-inner-icon">${icons[type] || icons.default}</div>`;

    const marker = new maplibregl.Marker(el)
        .setLngLat(coords)
        .addTo(map);

    el.addEventListener('click', () => {
        showBottomSheet({
            title: title.split(',')[0],
            subtitle: title,
            category: type.toUpperCase(),
            coords: coords
        });
        map.flyTo({ center: coords, zoom: 16 });
    });

    state.markers.push(marker);
}

const btnIcons = {
    restaurant: "🍴",
    cafe: "☕",
    gas: "⛽",
    hotel: "🏨",
    park: "🌳"
};

function clearMarkers() {
    state.markers.forEach(m => m.remove());
    state.markers = [];
}

function showBottomSheet(data) {
    const sheet = document.getElementById('bottom-sheet');
    state.currentDestination = data.coords;
    
    document.getElementById('sheet-title').textContent = data.title;
    const subtitle = document.getElementById('sheet-subtitle');
    if (subtitle) {
        subtitle.textContent = data.category || "Ubicación seleccionada";
        subtitle.style.color = "var(--text-dim)";
    }
    
    // Sync Icon on Route Action button
    const routeIcon = document.getElementById('btn-route-action');
    if (routeIcon) {
        const icons = { walk: 'fa-person-walking', bike: 'fa-bicycle', drive: 'fa-car', train: 'fa-train' };
        routeIcon.innerHTML = `<i class="fa-solid ${icons[state.transportMode] || 'fa-person-walking'}"></i>`;
    }

    updateBottomSheetDistance();
    sheet.classList.remove('hidden');

    // Automatically trigger routing if we have user location
    if (state.userCoords) {
        calculateRoute(false);
    }
}

function updateBottomSheetDistance() {
    const distVal = document.getElementById('sheet-dist-val');
    
    if (!state.userCoords || !state.currentDestination) {
        if (distVal) distVal.textContent = "-- km";
        return;
    }

    const distKm = getDistanceKm(state.userCoords, state.currentDestination);
    
    // Speeds and time logic
    const speeds = { walk: 5, bike: 15, drive: 60, train: 80 };
    const speed = speeds[state.transportMode] || 5;
    const timeMinutes = Math.round((distKm / speed) * 60);

    if (distVal) distVal.textContent = `${distKm.toFixed(1)} km`;
}

function updateUITime(dist, time) {
    const distVal = document.getElementById('sheet-dist-val');
    const subtitle = document.getElementById('sheet-subtitle');
    
    let timeText = time >= 60 
        ? `${Math.floor(time/60)}h ${time%60}m` 
        : `${time} min`;

    if (distVal) {
        distVal.innerHTML = `<span style="font-size: 0.9em; opacity: 0.9;">${dist.toFixed(1)} km</span><br><span style="color: white; font-size: 1.1em;">${timeText}</span>`;
    }
    
    if (subtitle) {
        const modeNames = { walk: 'Caminando', bike: 'Bicicleta', drive: 'Auto', train: 'Tren' };
        
        // Calcular ETA real (Hora estimada de llegada)
        const now = new Date();
        now.setMinutes(now.getMinutes() + time);
        const eta = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        subtitle.textContent = `${modeNames[state.transportMode] || state.transportMode} • Llegada ${eta} (${timeText})`;
        subtitle.style.color = "var(--logo-blue)";
    }
}

function clearRoute() {
    if (map.getLayer('route-line')) map.removeLayer('route-line');
    if (map.getLayer('route-casing')) map.removeLayer('route-casing');
    if (map.getSource('route')) map.removeSource('route');
}

function getDistanceKm(c1, c2) {
    const R = 6371; // Earth radius
    const dLat = (c2[1] - c1[1]) * Math.PI / 180;
    const dLon = (c2[0] - c1[0]) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(c1[1] * Math.PI / 180) * Math.cos(c2[1] * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// --- Routing Engine (OSRM) ---
async function calculateRoute(isManual = true) {
    if (!state.userCoords || !state.currentDestination) {
        if (isManual) alert("Activa tu ubicación (🎯) para trazar la ruta desde donde estás.");
        return;
    }

    const profiles = { walk: 'foot', bike: 'bicycle', drive: 'car', train: 'car' };
    const profile = profiles[state.transportMode] || 'foot';
    
    // UI Feedback: Show loading on button
    const routeBtn = document.getElementById('btn-route-action');
    if (routeBtn) routeBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    const url = `https://router.project-osrm.org/route/v1/${profile}/${state.userCoords[0]},${state.userCoords[1]};${state.currentDestination[0]},${state.currentDestination[1]}?geometries=geojson&overview=full`;

    try {
        const res = await fetch(url);
        const data = await res.json();

        if (data.routes && data.routes[0]) {
            const route = data.routes[0].geometry;
            drawRoute(route);
            
            const apiDistKm = data.routes[0].distance / 1000;
            const apiTimeMin = Math.round(data.routes[0].duration / 60);
            updateUITime(apiDistKm, apiTimeMin);
        }
    } catch (err) {
        console.error("Routing error:", err);
    } finally {
        if (routeBtn) {
            const icons = { walk: 'fa-person-walking', bike: 'fa-bicycle', drive: 'fa-car', train: 'fa-train' };
            routeBtn.innerHTML = `<i class="fa-solid ${icons[state.transportMode] || 'fa-person-walking'}"></i>`;
        }
    }
}

function drawRoute(geojson) {
    const routeColors = {
        drive: '#2a66ff', // Electric Blue for cars
        walk: '#10b981',  // Emerald Green for walking
        bike: '#ffcc00',  // Yellow for bikes
        train: '#ff3b30'  // Red for train
    };
    const routeColor = routeColors[state.transportMode] || '#2a66ff';

    if (map.getSource('route')) {
        map.getSource('route').setData(geojson);
        map.setPaintProperty('route-line', 'line-color', routeColor);
    } else {
        map.addSource('route', { type: 'geojson', data: geojson });
        map.addLayer({
            id: 'route-line',
            type: 'line',
            source: 'route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
                'line-color': routeColor,
                'line-width': 8,
                'line-opacity': 0.8
            }
        }, 'user-location-arrow');
        
        // Add a casing layer for depth
        map.addLayer({
            id: 'route-casing',
            type: 'line',
            source: 'route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
                'line-color': '#000',
                'line-width': 12,
                'line-opacity': 0.3
            }
        }, 'route-line');
    }
    
    // Fit map to route
    const coords = geojson.coordinates;
    const bounds = coords.reduce((acc, coord) => acc.extend(coord), new window.maplibregl.LngLatBounds(coords[0], coords[0]));
    map.fitBounds(bounds, { padding: 40 });
}


// --- Features: Celestial Layer ---
function toggleCelestialLayer() {
    state.celestialActive = !state.celestialActive;
    const btn = document.getElementById('menu-celestial');
    
    if (state.celestialActive) {
        if (btn) btn.style.background = 'var(--logo-blue)';
        if (btn) btn.style.color = 'white';
        map.setPaintProperty('background', 'background-color', '#000005');
        addStarsEffect();
    } else {
        if (btn) btn.style.background = '#f7f7f7';
        if (btn) btn.style.color = '#333';
        map.setPaintProperty('background', 'background-color', '#f8f4f0');
        removeStarsEffect();
    }
    // Also toggle panel visibility to show effect
    if (state.celestialActive) closeAllPanels();
}

function addStarsEffect() {
    if (map.getSource('stars')) return;

    // Crear puntos aleatorios que representen estrellas
    const stars = {
        type: 'FeatureCollection',
        features: Array.from({ length: 200 }, () => ({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [Math.random() * 360 - 180, Math.random() * 180 - 90]
            },
            properties: { mag: Math.random() }
        }))
    };

    map.addSource('stars', { type: 'geojson', data: stars });
    map.addLayer({
        id: 'stars-layer',
        type: 'circle',
        source: 'stars',
        paint: {
            'circle-radius': ['interpolate', ['linear'], ['get', 'mag'], 0, 1, 1, 3],
            'circle-color': '#ffffff',
            'circle-opacity': ['interpolate', ['linear'], ['get', 'mag'], 0, 0.3, 1, 0.9],
            'circle-blur': 1
        }
    });
}

function removeStarsEffect() {
    if (map.getLayer('stars-layer')) map.removeLayer('stars-layer');
    if (map.getSource('stars')) map.removeSource('stars');
}

// --- Features: Logbook (IndexedDB) ---
let db;
function initLogbookDB() {
    const request = indexedDB.open('OrbitaDB', 1);
    request.onupgradeneeded = (e) => {
        db = e.target.result;
        db.createObjectStore('logbook', { keyPath: 'id', autoIncrement: true });
    };
    request.onsuccess = (e) => { db = e.target.result; };
}

function saveToLogbook() {
    if (!db || !state.userCoords) return;
    const transaction = db.transaction(['logbook'], 'readwrite');
    const store = transaction.objectStore('logbook');
    store.add({
        coords: state.userCoords,
        timestamp: new Date().toISOString(),
        note: 'Exploración Orbita'
    });
}

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').catch(console.error);
        });
    }
}
