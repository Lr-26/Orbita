import React, { useCallback, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';

interface Props {
  destination: any;
  routeStats: any;
  transportMode: string;
  onModeChange: (mode: string) => void;
  onSaveBookmark: () => void;
  onClose: () => void;
}

export function BottomSheetUI({ destination, routeStats, transportMode, onModeChange, onSaveBookmark, onClose }: Props) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['25%', '50%'], []);

  if (!destination) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose={true}
      onClose={onClose}
      backgroundStyle={styles.bg}
    >
      <View style={styles.contentContainer}>
        <Text style={styles.title}>{destination.title}</Text>
        <Text style={styles.subtitle}>{destination.category}</Text>

        <View style={styles.modes}>
          {['walk', 'bike', 'drive'].map(m => (
            <TouchableOpacity 
              key={m} 
              style={[styles.modeBtn, transportMode === m && styles.modeBtnActive]} 
              onPress={() => onModeChange(m)}>
              <Text style={[styles.modeText, transportMode === m && styles.modeTextActive]}>{m.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {routeStats && (
          <View style={styles.statsCard}>
            <Text style={styles.dist}>{routeStats.dist} km</Text>
            <Text style={styles.eta}>Llegada {routeStats.eta} ({routeStats.time})</Text>
          </View>
        )}

        <TouchableOpacity style={styles.saveBtn} onPress={onSaveBookmark}>
          <Text style={styles.saveBtnText}>SAVE BOOKMARK</Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  bg: {
    backgroundColor: '#0a0a0c',
  },
  contentContainer: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 22,
    color: 'white',
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
    marginBottom: 16,
  },
  modes: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  modeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  modeBtnActive: {
    backgroundColor: 'white',
  },
  modeText: {
    color: '#888',
    fontWeight: 'bold',
  },
  modeTextActive: {
    color: 'black',
  },
  statsCard: {
    backgroundColor: 'rgba(42, 102, 255, 0.15)',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(42, 102, 255, 0.3)',
  },
  dist: {
    color: '#2a66ff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  eta: {
    color: 'white',
    fontSize: 16,
    marginTop: 4,
  },
  saveBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    color: 'white',
    fontWeight: 'bold',
  }
});
