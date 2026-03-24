import { useState } from 'react';
import { getDistanceKm, calculateETA, formatTimeText } from '../utils/math';

export type TransportMode = 'walk' | 'bike' | 'drive' | 'train';

export function useRouting() {
  const [routeGeoJSON, setRouteGeoJSON] = useState<any>(null);
  const [routeStats, setRouteStats] = useState<{ dist: string, time: string, eta: string } | null>(null);

  const calculateRoute = async (
    start: [number, number],
    end: [number, number],
    mode: TransportMode
  ) => {
    const profiles = { walk: 'foot', bike: 'bicycle', drive: 'car', train: 'car' };
    const profile = profiles[mode] || 'foot';
    
    const url = `https://router.project-osrm.org/route/v1/${profile}/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&overview=full`;

    try {
        const res = await fetch(url);
        const data = await res.json();

        if (data.routes && data.routes[0]) {
            const route = data.routes[0].geometry;
            setRouteGeoJSON(route);
            
            const apiDistKm = data.routes[0].distance / 1000;
            const apiTimeMin = Math.round(data.routes[0].duration / 60);

            setRouteStats({
                dist: apiDistKm.toFixed(1),
                time: formatTimeText(apiTimeMin),
                eta: calculateETA(apiTimeMin)
            });
        }
    } catch (err) {
        console.error("Routing error:", err);
    }
  };

  const clearRoute = () => {
      setRouteGeoJSON(null);
      setRouteStats(null);
  };

  return { routeGeoJSON, routeStats, calculateRoute, clearRoute };
}
