import { Platform } from 'react-native';
import { VisitEntry, MapType } from '../types';

function esc(val: string): string {
  if (!val) return '';
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function formatDate(iso: string): string {
  if (!iso) return '';
  try {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  } catch { return iso; }
}

function categoryLabel(entry: VisitEntry): string {
  return entry.category === 'Otra' && entry.customCategory
    ? `Otra: ${entry.customCategory}`
    : entry.category;
}

function buildCSV(allEntries: Record<string, VisitEntry[]>, mapType: MapType): { csv: string; fileName: string } {
  const label = mapType === 'argentina' ? 'Argentina' : 'BuenosAires';
  const timestamp = new Date().toISOString().split('T')[0];
  const fileName = `Territorios_${label}_${timestamp}.csv`;

  const colName = mapType === 'argentina' ? 'Provincia' : 'Partido';
  const header = [colName, 'Categoría', 'Fecha', 'Contacto', 'Organización', 'Notas']
    .map(esc).join(',');

  const rows: string[] = [];
  for (const entries of Object.values(allEntries)) {
    for (const e of entries) {
      rows.push(
        [e.territoryName, categoryLabel(e), formatDate(e.visitDate), e.contact, e.organization, e.notes]
          .map(esc).join(',')
      );
    }
  }

  // BOM para que Excel abra los acentos correctamente
  const csv = '﻿' + [header, ...rows].join('\r\n');
  return { csv, fileName };
}

/** Descarga en el navegador (web) */
function downloadOnWeb(csv: string, fileName: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Comparte en móvil (iOS / Android) */
async function shareOnMobile(csv: string, fileName: string): Promise<void> {
  const FileSystem = await import('expo-file-system/legacy');
  const Sharing    = await import('expo-sharing');

  const uri = (FileSystem.cacheDirectory ?? '') + fileName;
  await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error('El dispositivo no puede compartir archivos.');

  await Sharing.shareAsync(uri, {
    mimeType: 'text/csv',
    dialogTitle: `Exportar`,
    UTI: 'public.comma-separated-values-text',
  });
}

export async function exportToExcel(
  allEntries: Record<string, VisitEntry[]>,
  mapType: MapType
): Promise<void> {
  const { csv, fileName } = buildCSV(allEntries, mapType);

  if (Platform.OS === 'web') {
    downloadOnWeb(csv, fileName);
  } else {
    await shareOnMobile(csv, fileName);
  }
}
