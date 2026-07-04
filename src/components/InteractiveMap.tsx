import React, { useState, useEffect, useRef } from 'react';
import {
  View, StyleSheet, ActivityIndicator, Text,
  PanResponder, TouchableOpacity,
} from 'react-native';
import Svg, { Path, G, Text as SvgText } from 'react-native-svg';
import { GeoJSONFeatureCollection, GeoFeature, VisitEntry, Category, CATEGORY_COLORS } from '../types';
import { projectFeatureCollection } from '../utils/geoProjection';

const NO_DATA   = { fill: '#D4E4F7', stroke: '#88AACC' };
const FILTERED_OUT = { fill: '#E8EFF6', stroke: '#C0CDD8' }; // gris suave = "no tiene esta categoría"

interface Props {
  geojson: GeoJSONFeatureCollection;
  width: number;
  height: number;
  entries: Record<string, VisitEntry[]>;
  activeFilter: Category | null;
  onFeaturePress: (feature: GeoFeature) => void;
  showLabels?: boolean;
}

// ─── Colores ──────────────────────────────────────────────────────────────────
function getFeatureColor(
  id: string,
  entries: Record<string, VisitEntry[]>,
  activeFilter: Category | null
): { fill: string; stroke: string } {
  const list = entries[id] ?? [];
  if (list.length === 0) return NO_DATA;

  if (activeFilter) {
    const match = list.filter(e => e.category === activeFilter);
    return match.length > 0
      ? { fill: CATEGORY_COLORS[activeFilter].fill, stroke: CATEGORY_COLORS[activeFilter].stroke }
      : FILTERED_OUT;
  }

  // Sin filtro: color de la entrada más reciente
  const latest = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const col = CATEGORY_COLORS[latest.category];
  return { fill: col.fill, stroke: col.stroke };
}

// ─── Hit testing ──────────────────────────────────────────────────────────────
function pointInRing(px: number, py: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function ringArea(ring: number[][]): number {
  let s = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++)
    s += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  return Math.abs(s) / 2;
}

function findFeatureAt(px: number, py: number, features: GeoFeature[]) {
  const hits = features.filter(f => f.svgRings?.some(r => pointInRing(px, py, r)));
  if (!hits.length) return undefined;
  return hits.sort((a, b) => ringArea(a.svgRings?.[0] ?? []) - ringArea(b.svgRings?.[0] ?? []))[0];
}

// ─── ViewBox ──────────────────────────────────────────────────────────────────
interface VB { x: number; y: number; w: number; h: number }

// ─── Component ────────────────────────────────────────────────────────────────
export default function InteractiveMap({
  geojson, width, height, entries, activeFilter, onFeaturePress, showLabels = false,
}: Props) {
  const [features, setFeatures] = useState<GeoFeature[]>([]);
  const [loading, setLoading]   = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [vb, setVb]             = useState<VB>({ x: 0, y: 0, w: width, h: height });

  // Refs for PanResponder (avoids stale closures)
  const vbRef       = useRef<VB>(vb);
  const featuresRef = useRef<GeoFeature[]>([]);
  const onPressRef  = useRef(onFeaturePress);
  const widthRef    = useRef(width);
  const heightRef   = useRef(height);

  useEffect(() => { featuresRef.current = features; }, [features]);
  useEffect(() => { onPressRef.current  = onFeaturePress; }, [onFeaturePress]);
  useEffect(() => {
    widthRef.current  = width;
    heightRef.current = height;
    const nv: VB = { x: 0, y: 0, w: width, h: height };
    vbRef.current = nv;
    setVb(nv);
  }, [width, height]);

  // Load features
  const geojsonRef = useRef(geojson);
  useEffect(() => {
    if (!width || !height) return;
    geojsonRef.current = geojson;
    setLoading(true);
    setErrorMsg(null);
    const t = setTimeout(() => {
      try {
        const result = projectFeatureCollection(geojsonRef.current, width, height, 16);
        if (!result?.length) setErrorMsg('No se encontraron territorios en los datos.');
        else setFeatures(result);
      } catch (e: any) { setErrorMsg(String(e?.message ?? e)); }
      setLoading(false);
    }, 50);
    return () => clearTimeout(t);
  }, [geojson, width, height]);

  // ─── Gesture refs ────────────────────────────────────────────────────────────
  const pinch = useRef({ dist: 0, wasActive: false });
  const pan   = useRef({ lastX: 0, lastY: 0 });
  const tap   = useRef({ startX: 0, startY: 0, startTime: 0 });

  const pr = useRef(PanResponder.create({
    onStartShouldSetPanResponder:  () => true,
    onMoveShouldSetPanResponder:   () => true,
    onShouldBlockNativeResponder:  () => true,

    onPanResponderGrant: (e) => {
      const ts = e.nativeEvent.touches;
      // Reset para nuevo gesto
      pinch.current = { dist: 0, wasActive: false };
      tap.current = {
        startX: ts[0]?.locationX ?? 0,
        startY: ts[0]?.locationY ?? 0,
        startTime: Date.now(),
      };
      if (ts.length >= 2) {
        pinch.current.dist = Math.hypot(ts[1].pageX - ts[0].pageX, ts[1].pageY - ts[0].pageY);
        pinch.current.wasActive = true;
      } else {
        pan.current = { lastX: ts[0].pageX, lastY: ts[0].pageY };
      }
    },

    onPanResponderMove: (e) => {
      const ts = e.nativeEvent.touches;
      const W  = widthRef.current, H = heightRef.current;
      const cv = vbRef.current;

      if (ts.length >= 2) {
        pinch.current.wasActive = true;
        const newDist = Math.hypot(ts[1].pageX - ts[0].pageX, ts[1].pageY - ts[0].pageY);
        const s = pinch.current.dist > 0 ? newDist / pinch.current.dist : 1;
        pinch.current.dist = newDist;

        const midSX = (ts[0].locationX + ts[1].locationX) / 2;
        const midSY = (ts[0].locationY + ts[1].locationY) / 2;
        const midVX = cv.x + (midSX / W) * cv.w;
        const midVY = cv.y + (midSY / H) * cv.h;

        const newW = Math.max(W / 10, Math.min(W, cv.w / s));
        const newH = newW * (H / W);
        let newX   = Math.max(0, Math.min(W - newW, midVX - (midSX / W) * newW));
        let newY   = Math.max(0, Math.min(H - newH, midVY - (midSY / H) * newH));

        const nv: VB = { x: newX, y: newY, w: newW, h: newH };
        vbRef.current = nv;
        setVb(nv);
        pan.current = { lastX: ts[0].pageX, lastY: ts[0].pageY };

      } else if (ts.length === 1 && !pinch.current.wasActive) {
        const dx = ts[0].pageX - pan.current.lastX;
        const dy = ts[0].pageY - pan.current.lastY;
        pan.current = { lastX: ts[0].pageX, lastY: ts[0].pageY };
        if (cv.w < W * 0.99) {
          const nv: VB = {
            ...cv,
            x: Math.max(0, Math.min(W - cv.w, cv.x - (dx / W) * cv.w)),
            y: Math.max(0, Math.min(H - cv.h, cv.y - (dy / H) * cv.h)),
          };
          vbRef.current = nv;
          setVb(nv);
        }
      }
    },

    onPanResponderRelease: (e) => {
      const elapsed = Date.now() - tap.current.startTime;
      const ct = e.nativeEvent.changedTouches;

      // ⚠️ No registrar tap si hubo pinch en algún momento del gesto
      if (pinch.current.wasActive) return;

      if (ct.length === 1 && elapsed < 400) {
        const { locationX, locationY } = ct[0];
        const dX = Math.abs(locationX - tap.current.startX);
        const dY = Math.abs(locationY - tap.current.startY);
        if (dX < 14 && dY < 14) {
          const W  = widthRef.current, H = heightRef.current;
          const cv = vbRef.current;
          const svgX = cv.x + (locationX / W) * cv.w;
          const svgY = cv.y + (locationY / H) * cv.h;
          const hit  = findFeatureAt(svgX, svgY, featuresRef.current);
          if (hit) onPressRef.current(hit);
        }
      }
    },
  })).current;

  // ─── Render ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.center, { width, height }]}>
        <ActivityIndicator size="large" color="#003366" />
        <Text style={styles.loadingText}>Cargando mapa…</Text>
      </View>
    );
  }
  if (errorMsg || !features.length) {
    return (
      <View style={[styles.center, { width, height }]}>
        <Text style={styles.errorText}>⚠️ {errorMsg ?? 'Sin datos de mapa.'}</Text>
      </View>
    );
  }

  const isZoomed = vb.w < width * 0.95;

  return (
    <View
      style={{ width, height, backgroundColor: '#EEF4FB', borderRadius: 12 }}
      {...pr.panHandlers}
    >
      <Svg width={width} height={height} viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}>
        {features.map((feature, idx) => {
          const { fill, stroke } = getFeatureColor(feature.id, entries, activeFilter);
          return (
            <G key={`${feature.id}-${idx}`}>
              <Path
                d={feature.path}
                fill={fill}
                stroke={stroke}
                strokeWidth={isZoomed ? 0.6 : 1.2}
                strokeLinejoin="round"
              />
              {showLabels && (
                <SvgText
                  x={feature.centroid[0]}
                  y={feature.centroid[1]}
                  fontSize={isZoomed ? 5 : 7}
                  fill="#1A2C45"
                  textAnchor="middle"
                  alignmentBaseline="middle"
                  fontWeight="500"
                  pointerEvents="none"
                >
                  {feature.name.length > 12 ? feature.name.substring(0, 11) + '…' : feature.name}
                </SvgText>
              )}
            </G>
          );
        })}
      </Svg>

      {isZoomed && (
        <TouchableOpacity
          style={styles.resetBtn}
          onPress={() => {
            const nv: VB = { x: 0, y: 0, w: widthRef.current, h: heightRef.current };
            vbRef.current = nv;
            setVb(nv);
          }}
        >
          <Text style={styles.resetBtnText}>⊙</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────
import { Text as RNText } from 'react-native';
import { CATEGORIES } from '../types';

export function MapLegendNative() {
  return (
    <View style={styles.legend}>
      <View style={styles.legendItem}>
        <View style={[styles.legendSwatch, { backgroundColor: NO_DATA.fill, borderColor: NO_DATA.stroke }]} />
        <RNText style={styles.legendLabel}>Sin actividades</RNText>
      </View>
      {CATEGORIES.map(cat => {
        const col = CATEGORY_COLORS[cat];
        return (
          <View key={cat} style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: col.fill, borderColor: col.stroke }]} />
            <RNText style={styles.legendLabel}>{cat}</RNText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF4FB', borderRadius: 12 },
  loadingText: { marginTop: 10, fontSize: 13, color: '#003366' },
  errorText: { fontSize: 13, color: '#CC0000', textAlign: 'center', paddingHorizontal: 16 },
  resetBtn: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 20,
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
  },
  resetBtnText: { color: '#FFF', fontSize: 20, lineHeight: 22 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendSwatch: { width: 14, height: 14, borderRadius: 3, borderWidth: 1.5 },
  legendLabel: { fontSize: 11, color: '#1A2C45', fontWeight: '500' },
});
