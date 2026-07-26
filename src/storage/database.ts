import { supabase } from '../lib/supabase';
import { VisitEntry, MapType } from '../types';

export function generateEntryId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Guarda (agrega o actualiza) una entrada en Supabase */
export async function saveEntry(entry: VisitEntry): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const { error } = await supabase.from('visit_entries').upsert({
    entry_id:       entry.entryId,
    user_id:        user.id,
    territory_id:   entry.territoryId,
    map_type:       entry.mapType,
    territory_name: entry.territoryName,
    category:       entry.categories.join(','),
    custom_category: entry.customCategory,
    visit_date:     entry.visitDate,
    contact:        entry.contact,
    organization:   entry.organization,
    notes:          entry.notes,
    created_at:     entry.createdAt,
  }, { onConflict: 'entry_id' });

  if (error) throw error;
}

/** Elimina una entrada por su ID */
export async function deleteEntry(
  _mapType: MapType,
  _territoryId: string,
  entryId: string
): Promise<void> {
  const { error } = await supabase
    .from('visit_entries')
    .delete()
    .eq('entry_id', entryId);
  if (error) throw error;
}

/** Devuelve todas las entradas de un mapa, agrupadas por territorio */
export async function getAllEntries(
  mapType: MapType
): Promise<Record<string, VisitEntry[]>> {
  const { data, error } = await supabase
    .from('visit_entries')
    .select('*')
    .eq('map_type', mapType)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error al cargar entradas:', error.message);
    return {};
  }

  const result: Record<string, VisitEntry[]> = {};
  for (const row of data ?? []) {
    const entry: VisitEntry = {
      entryId:        row.entry_id,
      territoryId:    row.territory_id,
      mapType:        row.map_type,
      territoryName:  row.territory_name,
      // Decode comma-separated string → array; handle legacy single-value rows
      categories:     row.category
        ? (row.category as string).split(',').map((s: string) => s.trim()).filter(Boolean) as any
        : [],
      customCategory: row.custom_category,
      visitDate:      row.visit_date,
      contact:        row.contact,
      organization:   row.organization,
      notes:          row.notes,
      createdAt:      row.created_at,
    };
    if (!result[entry.territoryId]) result[entry.territoryId] = [];
    result[entry.territoryId].push(entry);
  }
  return result;
}
