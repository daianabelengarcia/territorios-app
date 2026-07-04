import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, useWindowDimensions,
  ScrollView, TextInput, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GeoFeature, VisitEntry, Category, CATEGORIES, CATEGORY_COLORS } from '../types';
import InteractiveMap, { MapLegendNative } from '../components/InteractiveMap';
import InfoModal from '../components/InfoModal';
import { saveEntry, deleteEntry, getAllEntries } from '../storage/database';
import { exportToExcel } from '../utils/exportExcel';
import buenosAiresGeoJSON from '../data/buenosaires-geojson';

const PRIMARY = '#1A7A4A';

export default function BuenosAiresScreen() {
  const { width } = useWindowDimensions();
  const mapWidth = width - 24;

  const [entries, setEntries]           = useState<Record<string, VisitEntry[]>>({});
  const [loadingData, setLoadingData]   = useState(true);
  const [exporting, setExporting]       = useState(false);
  const [activeFilter, setActiveFilter] = useState<Category | null>(null);
  const [searchQuery, setSearchQuery]   = useState('');
  const [showList, setShowList]         = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<GeoFeature | null>(null);

  useEffect(() => {
    getAllEntries('buenosaires').then(data => {
      setEntries(data);
      setLoadingData(false);
    });
  }, []);

  const handleFeaturePress = useCallback((feature: GeoFeature) => {
    setSelectedFeature(feature);
    setModalVisible(true);
    setShowList(false);
    setSearchQuery('');
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
    await deleteEntry('buenosaires', selectedFeature.id, entryId);
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
      await exportToExcel(entries, 'buenosaires');
    } catch (e: any) {
      Alert.alert('Error al exportar', e?.message ?? 'Error inesperado.');
    } finally {
      setExporting(false);
    }
  }, [entries]);

  const searchResults = searchQuery.length > 1
    ? (buenosAiresGeoJSON.features ?? []).filter(f =>
        f.properties?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const territoriesCount = Object.keys(entries).length;
  const totalEntries     = Object.values(entries).reduce((s, arr) => s + arr.length, 0);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>

      {/* Buscador */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={t => { setSearchQuery(t); setShowList(t.length > 1); }}
          placeholder="🔍  Buscar partido…"
          placeholderTextColor="#6B8A78"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Dropdown búsqueda */}
      {showList && searchResults.length > 0 && (
        <View style={styles.searchDropdown}>
          <FlatList
            data={searchResults}
            keyExtractor={item => item.properties.id}
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: 200 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.searchResult}
                onPress={() => handleFeaturePress({
                  id: item.properties.id,
                  name: item.properties.name,
                  path: '', centroid: [0, 0], svgRings: [],
                })}
              >
                <Text style={styles.searchResultName}>{item.properties.name}</Text>
                {entries[item.properties.id] && (
                  <Text style={styles.searchResultCount}>
                    {entries[item.properties.id].length} actividad{entries[item.properties.id].length !== 1 ? 'es' : ''}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>135</Text>
          <Text style={styles.statLabel}>Partidos</Text>
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

      {/* Mapa */}
      <View style={styles.mapWrapper}>
        {loadingData ? (
          <View style={styles.mapLoading}>
            <ActivityIndicator size="large" color={PRIMARY} />
          </View>
        ) : (
          <InteractiveMap
            geojson={buenosAiresGeoJSON}
            width={mapWidth}
            height={mapWidth * 1.05}
            entries={entries}
            activeFilter={activeFilter}
            onFeaturePress={handleFeaturePress}
            showLabels={false}
          />
        )}
      </View>

      {/* Leyenda */}
      <ScrollView style={styles.bottomScroll} contentContainerStyle={{ paddingBottom: 12 }}>
        <MapLegendNative />
        <Text style={styles.hint}>Tocá un partido o buscalo por nombre.</Text>
      </ScrollView>

      {selectedFeature && (
        <InfoModal
          visible={modalVisible}
          featureId={selectedFeature.id}
          featureName={selectedFeature.name}
          mapType="buenosaires"
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
  container: { flex: 1, backgroundColor: '#F0F7F4' },
  searchContainer: {
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#D0E8DC',
  },
  searchInput: {
    backgroundColor: '#F0F7F4', borderWidth: 1.5, borderColor: '#B8D8C8',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
    fontSize: 14, color: '#1A2C1F',
  },
  searchDropdown: {
    position: 'absolute', top: 56, left: 12, right: 12,
    backgroundColor: '#FFF', borderRadius: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 12,
    elevation: 10, zIndex: 100, overflow: 'hidden',
  },
  searchResult: {
    paddingHorizontal: 16, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: '#EEF7F2',
  },
  searchResultName: { fontSize: 14, fontWeight: '600', color: '#1A2C1F' },
  searchResultCount: { fontSize: 11, color: '#6B8A78', marginTop: 1 },
  statsBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', paddingVertical: 8, paddingHorizontal: 14,
    borderBottomWidth: 1, borderBottomColor: '#D0E8DC', elevation: 2,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 18, fontWeight: '800', color: '#1A7A4A' },
  statLabel: { fontSize: 9, color: '#6B8A78', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 1 },
  statDivider: { width: 1, height: 26, backgroundColor: '#D0E8DC' },
  exportBtn: {
    backgroundColor: '#1A7A4A', paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 8, marginLeft: 6, alignItems: 'center',
  },
  exportBtnText: { color: '#FFF', fontSize: 16 },

  filterBar: { maxHeight: 48, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#D0E8DC' },
  filterContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8, flexDirection: 'row', alignItems: 'center' },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#B8D8C8',
    backgroundColor: '#F0F7F4',
  },
  filterChipAll: { backgroundColor: '#1A7A4A', borderColor: '#1A7A4A' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#6B8A78' },
  filterChipTextActive: { color: '#FFF' },

  mapWrapper: { flex: 1, alignItems: 'center', paddingHorizontal: 12, paddingTop: 8 },
  mapLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  bottomScroll: { maxHeight: 120 },
  hint: { fontSize: 11, color: '#6B8A78', textAlign: 'center', marginTop: 4, marginBottom: 6, lineHeight: 16 },
});
