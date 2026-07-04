import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, useWindowDimensions, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GeoFeature, VisitEntry, Category, CATEGORIES, CATEGORY_COLORS } from '../types';
import InteractiveMap, { MapLegendNative } from '../components/InteractiveMap';
import InfoModal from '../components/InfoModal';
import { saveEntry, deleteEntry, getAllEntries } from '../storage/database';
import { exportToExcel } from '../utils/exportExcel';
import argentinaGeoJSON from '../data/argentina-geojson';

export default function ArgentinaScreen() {
  const { width } = useWindowDimensions();
  const mapWidth = width - 24;

  const [entries, setEntries]         = useState<Record<string, VisitEntry[]>>({});
  const [loadingData, setLoadingData] = useState(true);
  const [exporting, setExporting]     = useState(false);
  const [activeFilter, setActiveFilter] = useState<Category | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<GeoFeature | null>(null);
  const [mapHeight, setMapHeight]     = useState(0);

  useEffect(() => {
    getAllEntries('argentina').then(data => {
      setEntries(data);
      setLoadingData(false);
    });
  }, []);

  const handleFeaturePress = useCallback((feature: GeoFeature) => {
    setSelectedFeature(feature);
    setModalVisible(true);
  }, []);

  const handleSave = useCallback(async (entry: VisitEntry) => {
    await saveEntry(entry);
    setEntries(prev => {
      const list = [...(prev[entry.territoryId] ?? [])];
      const idx  = list.findIndex(e => e.entryId === entry.entryId);
      if (idx >= 0) list[idx] = entry; else list.push(entry);
      return { ...prev, [entry.territoryId]: list };
    });
  }, []);

  const handleDelete = useCallback(async (entryId: string) => {
    if (!selectedFeature) return;
    await deleteEntry('argentina', selectedFeature.id, entryId);
    setEntries(prev => {
      const list = (prev[selectedFeature.id] ?? []).filter(e => e.entryId !== entryId);
      const next = { ...prev };
      if (list.length > 0) next[selectedFeature.id] = list;
      else delete next[selectedFeature.id];
      return next;
    });
  }, [selectedFeature]);

  const handleExport = useCallback(async () => {
    const total = Object.values(entries).reduce((s, arr) => s + arr.length, 0);
    if (total === 0) {
      Alert.alert('Sin datos', 'No hay actividades guardadas para exportar.');
      return;
    }
    setExporting(true);
    try {
      await exportToExcel(entries, 'argentina');
    } catch (e: any) {
      Alert.alert('Error al exportar', e?.message ?? 'Error inesperado.');
    } finally {
      setExporting(false);
    }
  }, [entries]);

  const territoriesCount = Object.keys(entries).length;
  const totalEntries     = Object.values(entries).reduce((s, arr) => s + arr.length, 0);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>

      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>24</Text>
          <Text style={styles.statLabel}>Jurisdicciones</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#1565C0' }]}>{territoriesCount}</Text>
          <Text style={styles.statLabel}>Con actividad</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#6A1B9A' }]}>{totalEntries}</Text>
          <Text style={styles.statLabel}>Registros</Text>
        </View>
        <View style={styles.statDivider} />
        <TouchableOpacity
          style={[styles.exportBtn, exporting && { opacity: 0.6 }]}
          onPress={handleExport}
          disabled={exporting}
        >
          {exporting
            ? <ActivityIndicator size="small" color="#FFF" />
            : <Text style={styles.exportBtnText}>📤</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterContent}>
        <TouchableOpacity
          style={[styles.filterChip, !activeFilter && styles.filterChipAll]}
          onPress={() => setActiveFilter(null)}
        >
          <Text style={[styles.filterChipText, !activeFilter && styles.filterChipTextActive]}>Todas</Text>
        </TouchableOpacity>
        {CATEGORIES.map(cat => {
          const col    = CATEGORY_COLORS[cat];
          const active = activeFilter === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.filterChip, active && { backgroundColor: col.fill, borderColor: col.stroke }]}
              onPress={() => setActiveFilter(active ? null : cat)}
            >
              <Text style={[styles.filterChipText, active && { color: col.chip, fontWeight: '700' }]}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Map — FUERA del ScrollView */}
      <View
        style={styles.mapWrapper}
        onLayout={(e) => setMapHeight(e.nativeEvent.layout.height)}
      >
        {loadingData || mapHeight === 0 ? (
          <View style={styles.mapLoading}>
            <ActivityIndicator size="large" color="#003366" />
          </View>
        ) : (
          <InteractiveMap
            geojson={argentinaGeoJSON}
            width={mapWidth}
            height={mapHeight}
            entries={entries}
            activeFilter={activeFilter}
            onFeaturePress={handleFeaturePress}
            showLabels={true}
          />
        )}
      </View>

      {/* Leyenda */}
      <ScrollView style={styles.bottomScroll} contentContainerStyle={{ paddingBottom: 8 }}>
        <MapLegendNative />
        <Text style={styles.hint}>Tocá una provincia para registrar actividades.</Text>
      </ScrollView>

      {selectedFeature && (
        <InfoModal
          visible={modalVisible}
          featureId={selectedFeature.id}
          featureName={selectedFeature.name}
          mapType="argentina"
          entries={entries[selectedFeature.id] ?? []}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setModalVisible(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4FA' },
  statsBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', paddingVertical: 10, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#E0E7F0', elevation: 2,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 20, fontWeight: '800', color: '#003366' },
  statLabel: { fontSize: 9, color: '#6B87A8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 },
  statDivider: { width: 1, height: 28, backgroundColor: '#E0E7F0' },
  exportBtn: {
    backgroundColor: '#003366', paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 8, marginLeft: 8, minWidth: 40, alignItems: 'center',
  },
  exportBtnText: { color: '#FFF', fontSize: 16 },

  filterBar: { maxHeight: 48, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E0E7F0' },
  filterContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8, flexDirection: 'row', alignItems: 'center' },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#C8D8EA',
    backgroundColor: '#F5F7FA',
  },
  filterChipAll: { backgroundColor: '#003366', borderColor: '#003366' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#6B87A8' },
  filterChipTextActive: { color: '#FFF' },

  mapWrapper: { flex: 1, alignItems: 'center', paddingHorizontal: 12, paddingTop: 10 },
  mapLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  bottomScroll: { maxHeight: 90 },
  hint: { fontSize: 11, color: '#6B87A8', textAlign: 'center', marginTop: 2, marginBottom: 6, lineHeight: 16 },
});
