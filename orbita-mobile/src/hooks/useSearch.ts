import { useState } from 'react';

export function useSearch() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const performSearch = async (query: string, lon: number, lat: number) => {
    if (!query) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=15&lon=${lon}&lat=${lat}`);
      const rawData = await res.json();
      const mapped = rawData.features.map((f: any) => ({
          display_name: [f.properties.name, f.properties.city, f.properties.state].filter(Boolean).join(', '),
          lon: f.geometry.coordinates[0],
          lat: f.geometry.coordinates[1],
          type: f.properties.osm_value,
          class: f.properties.osm_key
      })).filter((i: any) => i.display_name);
      
      setResults(mapped);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => setResults([]);

  return { results, loading, performSearch, clearSearch };
}
