import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import Mapbox from '@maplibre/maplibre-react-native';
import * as Location from 'expo-location';

import { useSearch } from '../hooks/useSearch';
import { useRouting, TransportMode } from '../hooks/useRouting';
import { useBookmarks } from '../hooks/useBookmarks';

import { SearchBar } from '../components/SearchBar';
import { BottomSheetUI } from '../components/BottomSheetUI';
import { OfflinePanel } from '../components/OfflinePanel';

Mapbox.setAccessToken('pk.ey');

export default function MapScreen() {
  const mapRef = useRef<Mapbox.MapView>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [userLoc, setUserLoc] = useState<[number, number] | null>(null);
  const [destination, setDestination] = useState<any>(null);
  const [transportMode, setTransportMode] = useState<TransportMode>('walk');
  const [offlineVisible, setOfflineVisible] = useState(false);
  const [boundsForOffline, setBoundsForOffline] = useState<[number, number, number, number] | null>(null);

  const { results, performSearch, clearSearch } = useSearch();
  const { routeGeoJSON, routeStats, calculateRoute, clearRoute } = useRouting();
  const { addBookmark } = useBookmarks();

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      setHasPermission(status === 'granted');
      if (status === 'granted') {
          let location = await Location.getCurrentPositionAsync({});
          setUserLoc([location.coords.longitude, location.coords.latitude]);
      }
    })();
  }, []);

  const handleSelectPlace = (item: any) => {
      clearSearch();
      setDestination({
          title: item.display_name.split(',')[0],
          category: (item.class || item.type || "Lugar").toUpperCase(),
          coords: [item.lon, item.lat]
      });
      if (userLoc) calculateRoute(userLoc, [item.lon, item.lat], transportMode);
  };

  const handleOpenOffline = async () => {
      if (mapRef.current) {
          const visibleBounds = await mapRef.current.getVisibleBounds();
          // bounds format from rnmapbox: [[neLng, neLat], [swLng, swLat]]
          // OfflinePanel expects: [west, south, east, north] (sw.lng, sw.lat, ne.lng, ne.lat)
          setBoundsForOffline([visibleBounds[1][0], visibleBounds[1][1], visibleBounds[0][0], visibleBounds[0][1]]);
          setOfflineVisible(true);
      }
  };

  return (
    <View style={styles.container}>
      <SearchBar 
        results={results} 
        onSearch={(q) => performSearch(q, userLoc?.[0] || -58.38, userLoc?.[1] || -34.6)} 
        onSelect={handleSelectPlace} 
      />

      <Mapbox.MapView ref={mapRef} style={styles.map} styleURL={'https://tiles.openfreemap.org/styles/bright'}>
        <Mapbox.Camera
          zoomLevel={12}
          centerCoordinate={destination?.coords || userLoc || [-58.3816, -34.6037]}
          animationDuration={2000}
        />
        {hasPermission && <Mapbox.UserLocation visible={true} />}
        
        {destination && (
            <Mapbox.PointAnnotation id="dest" coordinate={destination.coords}>
                <View style={styles.marker} />
            </Mapbox.PointAnnotation>
        )}

        {routeGeoJSON && (
            <Mapbox.ShapeSource id="routeSource" shape={routeGeoJSON}>
               <Mapbox.LineLayer id="routeCasing" style={{ lineColor: 'black', lineWidth: 10, lineOpacity: 0.3 }} />
               <Mapbox.LineLayer id="routeFill" style={{ lineColor: '#2a66ff', lineWidth: 6 }} />
            </Mapbox.ShapeSource>
        )}
      </Mapbox.MapView>

      {/* Floating Buttons */}
      <View style={styles.floatingRight}>
        <TouchableOpacity style={styles.fab} onPress={handleOpenOffline}>
            <Text style={styles.fabIcon}>⬇️</Text>
        </TouchableOpacity>
      </View>

      <BottomSheetUI 
        destination={destination}
        routeStats={routeStats}
        transportMode={transportMode}
        onModeChange={(m) => {
            setTransportMode(m as TransportMode);
            if (userLoc && destination) calculateRoute(userLoc, destination.coords, m as TransportMode);
        }}
        onClose={() => { setDestination(null); clearRoute(); }}
        onSaveBookmark={() => addBookmark(destination.title, destination.coords, destination.category)}
      />

      {offlineVisible && (
          <OfflinePanel 
            currentBounds={boundsForOffline} 
            onClose={() => setOfflineVisible(false)} 
          />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  map: { flex: 1 },
  marker: {
      width: 20, height: 20, borderRadius: 10,
      backgroundColor: '#ff3b30',
      borderWidth: 3, borderColor: 'white'
  },
  floatingRight: {
      position: 'absolute',
      right: 20,
      top: '40%',
      justifyContent: 'center',
      gap: 15
  },
  fab: {
      width: 50, height: 50, borderRadius: 25,
      backgroundColor: 'rgba(20, 20, 28, 0.85)',
      justifyContent: 'center', alignItems: 'center',
      borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)'
  },
  fabIcon: { fontSize: 20 }
});
