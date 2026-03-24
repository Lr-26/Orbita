import { useState, useEffect } from 'react';
import Mapbox from '@maplibre/maplibre-react-native';

export function useOfflineMaps() {
  const [packs, setPacks] = useState<Mapbox.OfflinePack[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    loadPacks();
  }, []);

  const loadPacks = async () => {
    try {
      const offlinePacks = await Mapbox.offlineManager.getPacks();
      setPacks(offlinePacks);
    } catch (e) {
      console.error(e);
    }
  };

  const downloadRegion = async (name: string, bounds: [number, number, number, number], zoomRange: [number, number]) => {
    setDownloading(true);
    setProgress(0);
    try {
      // bounds array: [[neLng, neLat], [swLng, swLat]]
      // our bounds input: [west, south, east, north]
      const packBounds: [GeoJSON.Position, GeoJSON.Position] = [
        [bounds[2], bounds[3]], // ne (east, north)
        [bounds[0], bounds[1]]  // sw (west, south)
      ];

      const options = {
        name: name,
        styleURL: 'https://tiles.openfreemap.org/styles/bright',
        bounds: packBounds,
        minZoom: zoomRange[0],
        maxZoom: zoomRange[1],
      };

      await Mapbox.offlineManager.createPack(
        options,
        (pack, status) => {
          const pct = Math.round(status.percentage);
          setProgress(pct);
          if (status.state === Mapbox.OfflinePackDownloadState.Complete) {
            setDownloading(false);
            loadPacks();
          }
        },
        (pack, err) => {
          console.error("Offline Map Download Error:", err);
          setDownloading(false);
        }
      );
    } catch (err) {
      console.error(err);
      setDownloading(false);
    }
  };

  const deletePack = async (name: string) => {
      try {
          await Mapbox.offlineManager.deletePack(name);
          loadPacks();
      } catch(e) { console.error(e); }
  }

  return { packs, downloading, progress, downloadRegion, deletePack };
}
