/**
 * update-geodata.js
 *
 * Descarga los límites reales de provincias y partidos desde GADM
 * (Global Administrative Areas Database — https://gadm.org)
 * y genera los archivos TypeScript para la app.
 *
 * Uso (desde la raíz del proyecto):
 *   node scripts/update-geodata.js
 *
 * Requiere Node.js 18+ y conexión a internet.
 */

const fs    = require('fs');
const path  = require('path');
const https = require('https');

// GADM 4.1 — licencia libre para uso no comercial
const GADM_ARG1_URL = 'https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_ARG_1.json';
const GADM_ARG2_URL = 'https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_ARG_2.json';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * GADM usa CamelCase sin espacios: "BuenosAires", "LomasdeZamora", "SantiagodelEstero".
 * Esta función los convierte a nombres legibles con espacios.
 */
function gadmNameToDisplay(s) {
  if (!s) return s;
  // 1) Insertar espacio antes de cada mayúscula precedida de minúscula
  let r = s.replace(/([a-záéíóúüñ])([A-ZÁÉÍÓÚÜÑ])/gu, '$1 $2');
  // 2) Separar preposiciones/artículos españoles que quedaron pegados al token anterior
  //    Ej: "Lomasde Zamora" → "Lomas de Zamora"
  //        "Santiamodel Estero" → "Santiago del Estero"
  r = r.replace(/(\w)(de )([A-ZÁÉÍÓÚÜÑ])/gu,  '$1 de $3');
  r = r.replace(/(\w)(del )([A-ZÁÉÍÓÚÜÑ])/gu, '$1 del $3');
  r = r.replace(/(\w)(la )([A-ZÁÉÍÓÚÜÑ])/gu,  '$1 la $3');
  r = r.replace(/(\w)(las )([A-ZÁÉÍÓÚÜÑ])/gu, '$1 las $3');
  r = r.replace(/(\w)(los )([A-ZÁÉÍÓÚÜÑ])/gu, '$1 los $3');
  return r.trim();
}

function toId(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Descarga con seguimiento de redirecciones y progreso
function download(url) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let downloaded = 0;

    function get(currentUrl) {
      https.get(currentUrl, { headers: { 'User-Agent': 'territorios-app/1.0' } }, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          get(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} para ${currentUrl}`));
          return;
        }
        const total = parseInt(res.headers['content-length'] || '0', 10);
        res.on('data', chunk => {
          chunks.push(chunk);
          downloaded += chunk.length;
          if (total > 0) {
            const pct = Math.round(downloaded / total * 100);
            process.stdout.write(`\r    ${pct}% (${(downloaded/1024/1024).toFixed(1)} MB)`);
          } else {
            process.stdout.write(`\r    ${(downloaded/1024/1024).toFixed(1)} MB descargados`);
          }
        });
        res.on('end', () => {
          console.log('');
          resolve(Buffer.concat(chunks).toString('utf8'));
        });
        res.on('error', reject);
      }).on('error', reject);
    }
    get(url);
  });
}

// Douglas-Peucker para reducir puntos
function simplifyRing(ring, tolerance = 0.01) {
  if (ring.length < 3) return ring;
  function perpendicularDist(pt, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    if (dx === 0 && dy === 0) {
      return Math.sqrt((pt[0]-a[0])**2 + (pt[1]-a[1])**2);
    }
    const t = ((pt[0]-a[0])*dx + (pt[1]-a[1])*dy) / (dx*dx+dy*dy);
    return Math.sqrt((pt[0]-a[0]-t*dx)**2 + (pt[1]-a[1]-t*dy)**2);
  }
  function dp(pts, tol) {
    if (pts.length <= 2) return pts;
    let maxD = 0, maxI = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      const d = perpendicularDist(pts[i], pts[0], pts[pts.length-1]);
      if (d > maxD) { maxD = d; maxI = i; }
    }
    if (maxD > tol) {
      const L = dp(pts.slice(0, maxI+1), tol);
      const R = dp(pts.slice(maxI), tol);
      return [...L.slice(0,-1), ...R];
    }
    return [pts[0], pts[pts.length-1]];
  }
  let s = dp(ring, tolerance);
  const first = s[0], last = s[s.length-1];
  if (first[0] !== last[0] || first[1] !== last[1]) s.push(first);
  // Redondear a 3 decimales
  return s.map(([lon, lat]) => [Math.round(lon*1000)/1000, Math.round(lat*1000)/1000]);
}

function simplifyGeometry(geometry, tolerance) {
  if (!geometry) return null;
  if (geometry.type === 'Polygon') {
    return { type: 'Polygon', coordinates: geometry.coordinates.map(r => simplifyRing(r, tolerance)) };
  }
  if (geometry.type === 'MultiPolygon') {
    return { type: 'MultiPolygon', coordinates: geometry.coordinates.map(p => p.map(r => simplifyRing(r, tolerance))) };
  }
  return null;
}

function geojsonToTS(features, description) {
  const featuresCode = features.map(f => {
    const safeName = f.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    return `  {
    type: 'Feature' as const,
    properties: { id: '${f.id}', name: '${safeName}' },
    geometry: ${JSON.stringify(f.geometry)}
  }`;
  }).join(',\n');

  return `/**
 * ${description}
 * Fuente: GADM 4.1 (https://gadm.org) — Global Administrative Areas
 * Generado por scripts/update-geodata.js
 */
import { GeoJSONFeatureCollection } from '../types';

const data: GeoJSONFeatureCollection = {
  type: 'FeatureCollection',
  features: [
${featuresCode}
  ]
};

export default data;
`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const srcData = path.join(__dirname, '..', 'src', 'data');

  console.log('\n🗺️  Territorios — Actualización de datos geográficos reales\n');
  console.log('  Fuente: GADM 4.1 (Global Administrative Areas Database)\n');

  // ── Argentina: 24 provincias ───────────────────────────────────────────────
  console.log('📍 Argentina (provincias)…');
  console.log('  Descargando…');
  try {
    const raw = JSON.parse(await download(GADM_ARG1_URL));
    const features = (raw.features || [])
      .filter(f => f.geometry)
      .map(f => {
        const props = f.properties || {};
        // Normalizar nombre: "BuenosAires" → "Buenos Aires"
        const name = gadmNameToDisplay(props.NAME_1 || props.name || 'Sin nombre');
        return {
          id:       toId(name),
          name,
          geometry: simplifyGeometry(f.geometry, 0.01)
        };
      })
      .filter(f => f.geometry);

    const ts = geojsonToTS(features, 'Provincias y CABA de la República Argentina — GADM 4.1');
    fs.writeFileSync(path.join(srcData, 'argentina-geojson.ts'), ts, 'utf8');
    console.log(`  ✅ ${features.length} provincias guardadas.`);
    console.log('  Nombres:', features.map(f => f.name).join(', '), '\n');
  } catch (e) {
    console.error(`  ❌ Error: ${e.message}\n  Se mantiene el archivo actual.\n`);
  }

  // ── Buenos Aires: 135 partidos ─────────────────────────────────────────────
  console.log('📍 Provincia de Buenos Aires (partidos)…');
  console.log('  Descargando…');
  try {
    const raw = JSON.parse(await download(GADM_ARG2_URL));
    const features = (raw.features || [])
      .filter(f => {
        const props = f.properties || {};
        // GADM guarda la provincia como "BuenosAires" (sin espacio)
        return props.NAME_1 === 'BuenosAires' && f.geometry;
      })
      .map(f => {
        const props = f.properties || {};
        // Normalizar nombre: "LaMatanza" → "La Matanza", "LomasdeZamora" → "Lomas de Zamora"
        const name = gadmNameToDisplay(props.NAME_2 || props.name || 'Sin nombre');
        return {
          id:       toId(name),
          name,
          geometry: simplifyGeometry(f.geometry, 0.005)
        };
      })
      .filter(f => f.geometry);

    const ts = geojsonToTS(features, 'Partidos de la Provincia de Buenos Aires — GADM 4.1');
    fs.writeFileSync(path.join(srcData, 'buenosaires-geojson.ts'), ts, 'utf8');
    console.log(`  ✅ ${features.length} partidos guardados.`);
    if (features.length > 0) {
      console.log('  Primeros 10:', features.slice(0, 10).map(f => f.name).join(', '));
    }
    console.log('');
  } catch (e) {
    console.error(`  ❌ Error: ${e.message}\n  Se mantiene el archivo actual.\n`);
  }

  console.log('✨ Listo. La app se recargará automáticamente.\n');
}

main().catch(err => {
  console.error('\n❌ Error fatal:', err.message);
  process.exit(1);
});
