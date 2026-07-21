export type MapType = 'argentina' | 'buenosaires' | 'amba';

export type Category = 'Charlas' | 'Centros Juveniles' | 'Reuniones' | 'Otra';

export const CATEGORIES: Category[] = ['Charlas', 'Centros Juveniles', 'Reuniones', 'Otra'];

export const CATEGORY_COLORS: Record<Category, { fill: string; stroke: string; chip: string; light: string }> = {
  'Charlas':           { fill: '#64B5F6', stroke: '#1565C0', chip: '#1565C0', light: '#E3F2FD' },
  'Centros Juveniles': { fill: '#FFB74D', stroke: '#E65100', chip: '#E65100', light: '#FFF3E0' },
  'Reuniones':         { fill: '#BA68C8', stroke: '#6A1B9A', chip: '#6A1B9A', light: '#F3E5F5' },
  'Otra':              { fill: '#81C784', stroke: '#2E7D32', chip: '#2E7D32', light: '#E8F5E9' },
};

export interface VisitEntry {
  entryId: string;        // ID único
  territoryId: string;    // slug del territorio
  mapType: MapType;
  territoryName: string;
  category: Category;
  customCategory: string; // texto cuando category === 'Otra'
  visitDate: string;      // 'YYYY-MM-DD' o ''
  contact: string;
  organization: string;
  notes: string;
  createdAt: string;      // ISO timestamp
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
