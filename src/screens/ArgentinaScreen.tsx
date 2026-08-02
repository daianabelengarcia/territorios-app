import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, useWindowDimensions, ScrollView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GeoFeature, VisitEntry, Category, ARGENTINA_CATEGORIES, CATEGORY_COLORS } from '../types';
import InteractiveMap, { MapLegendNative } from '../components/InteractiveMap';
import InfoModal from '../components/InfoModal';
import { saveEntry, deleteEntry, getAllEntries } from '../storage/database';
import { exportToExcel } from '../utils/exportExcel';
import argentinaGeoJSON from '../data/argentina-geojson';

const PRIMARY = '#003366';

export default function ArgentinaScreen() {
  const { width, height } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const [entries, setEntries]         = useState<Record<string, VisitEntry[]>>({});
  const [loadingData, setLoadingData] = useState(true);
  const [exporting, setExporting]     = useState(false);
  const [activeFilter, setActiveFilter] = useState<Category | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<GeoFeature | null>(null);
  const [mapHeight, setMapHeight]     = useState(0);
  const filterScrollRef = useRef<any>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const timer = setTimeout(() => {
      const el = filterScrollRef.current?.getScrollableNode?.();
      if (!el) return;
      const handler = (e: WheelEvent) => { e.preventDefault(); el.scrollLeft += e.deltaY * 0.7; };
      el.addEventListener('wheel', handler, { passive: false });
      return () => el.removeEventListener('wheel', handler);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

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

  const [desktopMapH, setDesktopMapH] = useState(0);
  const mapPanelWidth  = isDesktop ? Math.min(width * 0.62, 760) : width - 24;
  const mapPanelHeight = isDesktop ? (desktopMapH || height - 220) : mapHeight;

  // ── Sub-components ──────────────────────────────────────────────────────────
  const StatsBar = () => (
    <View style={[styles.statsBar, isDesktop && styles.statsBarDesktop]}>
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>25</Text>
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
  );

  const FilterBar = () => (
    <ScrollView
      ref={filterScrollRef}
      horizontal
      showsHorizontalScrollIndicator={Platform.OS === 'web'}
      style={styles.filterBar}
      contentContainerStyle={styles.filterContent}
    >
      <TouchableOpacity
        style={[styles.filterChip, !activeFilter && styles.filterChipAll]}
        onPress={() => setActiveFilter(null)}
      >
        <Text style={[styles.filterChipText, !activeFilter && styles.filterChipTextActive]}>Todas</Text>
      </TouchableOpacity>
      {ARGENTINA_CATEGORIES.map(cat => {
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
  );

  // ── Desktop layout ─────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <View style={styles.desktopRoot}>
        <StatsBar />
        <View style={styles.desktopBody}>
          <View
            style={[styles.desktopMapPanel, { width: mapPanelWidth }]}
            onLayout={(e) => setDesktopMapH(e.nativeEvent.layout.height)}
          >
            {loadingData ? (
              <ActivityIndicator size="large" color={PRIMARY} style={{ flex: 1 }} />
            ) : (
              <InteractiveMap
                geojson={argentinaGeoJSON}
                width={mapPanelWidth}
                height={mapPanelHeight}
                entries={entries}
                activeFilter={activeFilter}
                onFeaturePress={handleFeaturePress}
                showLabels={false}
              />
            )}
          </View>
          <View style={styles.desktopSidePanel}>
            <FilterBar />
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
              <MapLegendNative categories={ARGENTINA_CATEGORIES} />
              <Text style={styles.hint}>Hacé clic en una provincia del mapa para registrar actividades.</Text>
              {selectedFeature && (
                <View style={styles.desktopSelectedCard}>
                  <Text style={styles.desktopSelectedLabel}>ÚLTIMO SELECCIONADO</Text>
                  <TouchableOpacity
                    style={[styles.desktopOpenBtn, { backgroundColor: PRIMARY }]}
                    onPress={() => setModalVisible(true)}
                  >
                    <Text style={styles.desktopOpenBtnText}>{selectedFeature.name}</Text>
                    <Text style={styles.desktopOpenBtnSub}>
                      {entries[selectedFeature.id]?.length ?? 0} actividad{(entries[selectedFeature.id]?.length ?? 0) !== 1 ? 'es' : ''}  →
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
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
      </View>
    );
  }

  // ── Mobile layout ──────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatsBar />
      <FilterBar />

      <View
        style={styles.mapWrapper}
        onLayout={(e) => setMapHeight(e.nativeEvent.layout.height)}
      >
        {loadingData || mapHeight === 0 ? (
          <View style={styles.mapLoading}>
            <ActivityIndicator size="large" color={PRIMARY} />
          </View>
        ) : (
          <InteractiveMap
            geojson={argentinaGeoJSON}
            width={mapPanelWidth}
            height={mapPanelHeight}
            entries={entries}
            activeFilter={activeFilter}
            onFeaturePress={handleFeaturePress}
            showLabels={false}
          />
        )}
      </View>

      <ScrollView style={styles.bottomScroll} contentContainerStyle={{ paddingBottom: 8 }}>
        <MapLegendNative categories={ARGENTINA_CATEGORIES} />
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
  statsBarDesktop: { borderRadius: 12, marginHorizontal: 16, marginTop: 12, elevation: 0, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
  statItem:   { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 20, fontWeight: '800', color: PRIMARY },
  statLabel:  { fontSize: 9, color: '#6B87A8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 },
  statDivider: { width: 1, height: 28, backgroundColor: '#E0E7F0' },
  exportBtn: {
    backgroundColor: PRIMARY, paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 8, marginLeft: 8, minWidth: 40, alignItems: 'center',
  },
  exportBtnText: { color: '#FFF', fontSize: 16 },

  filterBar:     { maxHeight: 48, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E0E7F0' },
  filterContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8, flexDirection: 'row', alignItems: 'center' },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#C8D8EA',
    backgroundColor: '#F5F7FA',
  },
  filterChipAll:        { backgroundColor: PRIMARY, borderColor: PRIMARY },
  filterChipText:       { fontSize: 12, fontWeight: '600', color: '#6B87A8' },
  filterChipTextActive: { color: '#FFF' },

  mapWrapper:   { flex: 1, alignItems: 'center', paddingHorizontal: 12, paddingTop: 10 },
  mapLoading:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bottomScroll: { maxHeight: 90 },
  hint: { fontSize: 11, color: '#6B87A8', textAlign: 'center', marginTop: 2, marginBottom: 6, lineHeight: 16 },

  desktopRoot: { flex: 1, backgroundColor: '#F0F4FA' },
  desktopBody: { flex: 1, flexDirection: 'row', padding: 16, gap: 16 },
  desktopMapPanel: {
    borderRadius: 16, overflow: 'hidden',
    backgroundColor: '#EEF4FB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8,
  },
  desktopSidePanel: {
    flex: 1, backgroundColor: '#FFF',
    borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8,
  },
  desktopSelectedCard:  { margin: 16, marginTop: 8 },
  desktopSelectedLabel: { fontSize: 9, fontWeight: '700', color: '#6B87A8', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 },
  desktopOpenBtn:       { borderRadius: 12, padding: 14 },
  desktopOpenBtnText:   { fontSize: 16, fontWeight: '800', color: '#FFF', marginBottom: 2 },
  desktopOpenBtnSub:    { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
});
