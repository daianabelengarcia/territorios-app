import { GeoJSONFeatureCollection, GeoFeature, GeoJSONPolygon, GeoJSONMultiPolygon } from '../types';

interface Bounds {
  minLon: number;
  maxLon: number;
  minLat: number;
  maxLat: number;
}

// Compute bounding box from a FeatureCollection
export function computeBounds(geojson: GeoJSONFeatureCollection): Bounds {
  let minLon = Infinity, maxLon = -Infinity;
  let minLat = Infinity, maxLat = -Infinity;

  for (const feature of geojson.features) {
    if (!feature.geometry) continue;
    const coords = flattenCoords(feature.geometry);
    for (const [lon, lat] of coords) {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  }
  return { minLon, maxLon, minLat, maxLat };
}

function isPolygonGeometry(geometry: any): boolean {
  return geometry && (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon');
}

function flattenCoords(geometry: GeoJSONPolygon | GeoJSONMultiPolygon): number[][] {
  if (!geometry || !isPolygonGeometry(geometry)) return [];
  if (geometry.type === 'Polygon') {
    return geometry.coordinates[0] ?? [];
  } else {
    return geometry.coordinates.flatMap(poly => poly[0] ?? []);
  }
}

// Project [lon, lat] to SVG [x, y] given bounds and viewport size
function project(
  lon: number,
  lat: number,
  bounds: Bounds,
  width: number,
  height: number,
  padding: number
): [number, number] {
  const w = width - padding * 2;
  const h = height - padding * 2;
  const lonRange = bounds.maxLon - bounds.minLon;
  const latRange = bounds.maxLat - bounds.minLat;

  // Keep aspect ratio
  const scaleX = w / lonRange;
  const scaleY = h / latRange;
  const scale = Math.min(scaleX, scaleY);

  const offsetX = padding + (w - lonRange * scale) / 2;
  const offsetY = padding + (h - latRange * scale) / 2;

  const x = offsetX + (lon - bounds.minLon) * scale;
  const y = offsetY + (bounds.maxLat - lat) * scale; // flip Y axis
  return [x, y];
}

function ringToPath(
  ring: number[][],
  bounds: Bounds,
  width: number,
  height: number,
  padding: number
): string {
  return ring.map(([lon, lat], i) => {
    const [x, y] = project(lon, lat, bounds, width, height, padding);
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ') + ' Z';
}

function geometryToPath(
  geometry: GeoJSONPolygon | GeoJSONMultiPolygon,
  bounds: Bounds,
  width: number,
  height: number,
  padding: number
): string {
  if (!geometry || !isPolygonGeometry(geometry)) return '';
  if (geometry.type === 'Polygon') {
    return ringToPath(geometry.coordinates[0], bounds, width, height, padding);
  } else {
    return geometry.coordinates
      .map(poly => ringToPath(poly[0], bounds, width, height, padding))
      .join(' ');
  }
}

function computeCentroid(
  ring: number[][],
  bounds: Bounds,
  width: number,
  height: number,
  padding: number
): [number, number] {
  const points = ring.map(([lon, lat]) =>
    project(lon, lat, bounds, width, height, padding)
  );
  const cx = points.reduce((s, p) => s + p[0], 0) / points.length;
  const cy = points.reduce((s, p) => s + p[1], 0) / points.length;
  return [cx, cy];
}

// Project a single ring of geo coords → SVG [x, y] points
function projectRing(
  ring: number[][],
  bounds: Bounds,
  width: number,
  height: number,
  padding: number
): number[][] {
  return ring.map(([lon, lat]) => {
    const [x, y] = project(lon, lat, bounds, width, height, padding);
    return [x, y];
  });
}

// Return all outer rings projected to SVG coords (for hit testing)
function geometryToSvgRings(
  geometry: GeoJSONPolygon | GeoJSONMultiPolygon,
  bounds: Bounds,
  width: number,
  height: number,
  padding: number
): number[][][] {
  if (!geometry || !isPolygonGeometry(geometry)) return [];
  if (geometry.type === 'Polygon') {
    return [projectRing(geometry.coordinates[0], bounds, width, height, padding)];
  }
  return geometry.coordinates.map(poly =>
    projectRing(poly[0], bounds, width, height, padding)
  );
}

// Main export: convert a FeatureCollection to a list of GeoFeature ready for SVG rendering
export function projectFeatureCollection(
  geojson: GeoJSONFeatureCollection,
  width: number,
  height: number,
  padding = 12
): GeoFeature[] {
  const bounds = computeBounds(geojson);

  return geojson.features
    .filter(feature => isPolygonGeometry(feature.geometry))
    .map(feature => {
      const { id, name } = feature.properties as { id: string; name: string };
      const path = geometryToPath(feature.geometry, bounds, width, height, padding);
      const firstRing =
        feature.geometry.type === 'Polygon'
          ? feature.geometry.coordinates[0]
          : feature.geometry.coordinates[0][0];
      const centroid = computeCentroid(firstRing ?? [], bounds, width, height, padding);
      const svgRings = geometryToSvgRings(feature.geometry, bounds, width, height, padding);

      return { id, name, path, centroid, svgRings };
    });
}
