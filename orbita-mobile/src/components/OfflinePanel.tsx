import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useOfflineMaps } from '../hooks/useOfflineMaps';

interface Props {
  currentBounds: [number, number, number, number] | null; 
  onClose: () => void;
}

export function OfflinePanel({ currentBounds, onClose }: Props) {
  const { packs, downloading, progress, downloadRegion, deletePack } = useOfflineMaps();
  const [regionName, setRegionName] = useState('Mi Zona de Exploración');

  const handleDownload = () => {
    if (!currentBounds) {
      alert("Mueve el mapa para seleccionar una zona.");
      return;
    }
    // Zoom 10 a 14 es un buen balance de peso vs calidad topográfica
    downloadRegion(regionName + ' ' + Date.now(), currentBounds, [10, 14]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mapas Offline (Sin Conexión)</Text>
        <TouchableOpacity onPress={onClose}><Text style={styles.closeBtn}>X</Text></TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.downloadBox}>
          <Text style={styles.infoText}>Esta herramienta descargará toda la topografía visible actualmente en tu pantalla para cuando vayas a la montaña sin señal.</Text>
          
          {downloading ? (
            <View style={styles.progressContainer}>
              <Text style={styles.progressLabel}>Descargando polígonos y vectores...</Text>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
              </View>
              <Text style={styles.pct}>{progress}%</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.downloadBtn} onPress={handleDownload}>
              <Text style={styles.downloadBtnText}>DESCARGAR ZONA ACTUAL</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.sectionTitle}>Tus Zonas Descargadas</Text>
        {packs.length === 0 ? (
          <Text style={styles.empty}>No tienes mapas guardados.</Text>
        ) : (
          packs.map((p: any, i) => (
            <View key={i} style={styles.packItem}>
              <Text style={styles.packName}>{p.name}</Text>
              <TouchableOpacity onPress={() => deletePack(p.name)} style={styles.delBtn}>
                <Text style={styles.delBtnText}>BORRAR</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0, top: '25%', left: 0, right: 0,
    backgroundColor: '#111',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    zIndex: 5000,
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.8,
    shadowRadius: 20
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#333'
  },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  closeBtn: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  content: { padding: 24 },
  downloadBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 20, borderRadius: 16, marginBottom: 30
  },
  infoText: { color: '#ccc', marginBottom: 20, lineHeight: 22 },
  downloadBtn: {
    backgroundColor: '#10b981', padding: 16, borderRadius: 12, alignItems: 'center'
  },
  downloadBtnText: { color: 'white', fontWeight: 'bold' },
  progressContainer: { marginTop: 10 },
  progressLabel: { color: '#bbb', marginBottom: 8 },
  progressBarBg: { height: 8, backgroundColor: '#333', borderRadius: 4 },
  progressBarFill: { height: 8, backgroundColor: '#10b981', borderRadius: 4 },
  pct: { color: 'white', textAlign: 'center', marginTop: 8, fontWeight: 'bold' },
  sectionTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  empty: { color: '#666', fontStyle: 'italic' },
  packItem: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: '#222', padding: 16, borderRadius: 12, marginBottom: 10
  },
  packName: { color: 'white', fontSize: 16 },
  delBtn: { backgroundColor: '#ff3b30', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  delBtnText: { color: 'white', fontSize: 12, fontWeight: 'bold' }
});
