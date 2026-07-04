import AsyncStorage from '@react-native-async-storage/async-storage';
import { VisitEntry, MapType } from '../types';

function mapKey(mapType: MapType): string {
  return `entries:${mapType}`;
}

export function generateEntryId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Guarda (agrega o actualiza) una entrada */
export async function saveEntry(entry: VisitEntry): Promise<void> {
  const k = mapKey(entry.mapType);
  const raw = await AsyncStorage.getItem(k);
  const all: Record<string, VisitEntry[]> = raw ? JSON.parse(raw) : {};
  if (!all[entry.territoryId]) all[entry.territoryId] = [];
  const idx = all[entry.territoryId].findIndex(e => e.entryId === entry.entryId);
  if (idx >= 0) {
    all[entry.territoryId][idx] = entry;
  } else {
    all[entry.territoryId].push(entry);
  }
  await AsyncStorage.setItem(k, JSON.stringify(all));
}

/** Elimina una entrada por su ID */
export async function deleteEntry(
  mapType: MapType,
  territoryId: string,
  entryId: string
): Promise<void> {
  const k = mapKey(mapType);
  const raw = await AsyncStorage.getItem(k);
  if (!raw) return;
  const all: Record<string, VisitEntry[]> = JSON.parse(raw);
  if (!all[territoryId]) return;
  all[territoryId] = all[territoryId].filter(e => e.entryId !== entryId);
  if (all[territoryId].length === 0) delete all[territoryId];
  await AsyncStorage.setItem(k, JSON.stringify(all));
}

/** Devuelve todas las entradas de un mapa, agrupadas por territorio */
export async function getAllEntries(
  mapType: MapType
): Promise<Record<string, VisitEntry[]>> {
  const k = mapKey(mapType);
  const raw = await AsyncStorage.getItem(k);
  if (!raw) return {};
  return JSON.parse(raw);
}
