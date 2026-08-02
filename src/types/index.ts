export type MapType = 'argentina' | 'buenosaires' | 'amba';

// ── Categorías AMBA + Provincia de Buenos Aires ───────────────────────────────
export type AmbaCategory =
  | 'Relación política'
  | 'Relación Institucional'
  | 'Charlas/Actividades'
  | 'Centros Juveniles'
  | 'Aluvión/Periferia'
  | 'Informe';

// ── Categorías Argentina ──────────────────────────────────────────────────────
export type ArgentinaCategory =
  | 'Visitada con actividades'
  | 'Visitada con reuniones'
  | 'Relación político/institucional'
  | 'Informe';

export type Category = AmbaCategory | ArgentinaCategory;

export const AMBA_CATEGORIES: AmbaCategory[] = [
  'Relación política',
  'Relación Institucional',
  'Charlas/Actividades',
  'Centros Juveniles',
  'Aluvión/Periferia',
  'Informe',
];

export const ARGENTINA_CATEGORIES: ArgentinaCategory[] = [
  'Visitada con actividades',
  'Visitada con reuniones',
  'Relación político/institucional',
  'Informe',
];

/** Backward compat — usar AMBA_CATEGORIES o ARGENTINA_CATEGORIES cuando sea posible */
export const CATEGORIES: Category[] = AMBA_CATEGORIES;

export function getCategoriesForMap(mapType: MapType): Category[] {
  return mapType === 'argentina' ? ARGENTINA_CATEGORIES : AMBA_CATEGORIES;
}

export const CATEGORY_COLORS: Record<Category, { fill: string; stroke: string; chip: string; light: string }> = {
  'Relación política':               { fill: '#EF9A9A', stroke: '#C62828', chip: '#C62828', light: '#FFEBEE' },
  'Relación Institucional':          { fill: '#64B5F6', stroke: '#1565C0', chip: '#1565C0', light: '#E3F2FD' },
  'Charlas/Actividades':             { fill: '#FFB74D', stroke: '#E65100', chip: '#E65100', light: '#FFF3E0' },
  'Centros Juveniles':               { fill: '#81C784', stroke: '#2E7D32', chip: '#2E7D32', light: '#E8F5E9' },
  'Aluvión/Periferia':               { fill: '#CE93D8', stroke: '#6A1B9A', chip: '#6A1B9A', light: '#F3E5F5' },
  'Informe':                         { fill: '#80DEEA', stroke: '#00838F', chip: '#00838F', light: '#E0F7FA' },
  'Visitada con actividades':        { fill: '#FFD54F', stroke: '#F57F17', chip: '#F57F17', light: '#FFFDE7' },
  'Visitada con reuniones':          { fill: '#90CAF9', stroke: '#0D47A1', chip: '#0D47A1', light: '#E3F2FD' },
  'Relación político/institucional': { fill: '#FFAB91', stroke: '#BF360C', chip: '#BF360C', light: '#FBE9E7' },
};

export interface VisitEntry {
  entryId: string;
  territoryId: string;
  mapType: MapType;
  territoryName: string;
  categories: Category[];     // multi-select; codificado como CSV en Supabase
  customCategory: string;     // legacy – no se usa en UI nueva
  visitDate: string;          // 'YYYY-MM-DD' o ''
  contact: string;
  organization: string;
  notes: string;
  createdAt: string;          // ISO timestamp
}

// ── Artículos ────────────────────────────────────────────────────────────────
export interface Article {
  articleId:  string;
  title:      string;
  link:       string;   // URL opcional
  body:       string;   // texto libre
  createdAt:  string;   // ISO timestamp
}

// GeoJSON (minimal)
export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}
export interface GeoJSONMultiPolygon {
  type: 'MultiPolygon';
  coordinates: number[][][][];
}
export interface GeoJSONFeature {
  type: 'Feature';
  properties: Record<string, any>;
  geometry: GeoJSONPolygon | GeoJSONMultiPolygon;
}
export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
}

export interface GeoFeature {
  id: string;
  name: string;
  path: string;
  centroid: [number, number];
  svgRings: number[][][];
}
