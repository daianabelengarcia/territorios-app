/**
 * check-gadm.js — Diagnóstico: muestra los valores únicos de NAME_1 en el archivo ARG_2
 * Uso: node scripts/check-gadm.js
 */
const https = require('https');

function download(url) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    function get(currentUrl) {
      https.get(currentUrl, { headers: { 'User-Agent': 'territorios-app/1.0' } }, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          get(res.headers.location); return;
        }
        if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
        let downloaded = 0;
        res.on('data', chunk => { chunks.push(chunk); downloaded += chunk.length; process.stdout.write(`\r  ${(downloaded/1024/1024).toFixed(2)} MB`); });
        res.on('end', () => { console.log(''); resolve(Buffer.concat(chunks).toString('utf8')); });
        res.on('error', reject);
      }).on('error', reject);
    }
    get(url);
  });
}

async function main() {
  console.log('Descargando gadm41_ARG_2.json...');
  const raw = JSON.parse(await download('https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_ARG_2.json'));

  const features = raw.features || [];
  console.log(`Total features: ${features.length}`);

  // Mostrar primeras 3 features completas para ver la estructura
  console.log('\n--- Propiedades de las primeras 3 features ---');
  features.slice(0, 3).forEach((f, i) => {
    console.log(`\nFeature ${i}:`, JSON.stringify(f.properties, null, 2));
  });

  // Valores únicos de NAME_1
  const names1 = [...new Set(features.map(f => f.properties?.NAME_1))].sort();
  console.log('\n--- Valores únicos de NAME_1 ---');
  names1.forEach(n => console.log(' ', n));
}

main().catch(e => console.error('Error:', e.message));
