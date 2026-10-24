// Prueba rápida tras el build: comprueba que las páginas clave existen y no llevan valores rotos.
// Uso: node test/smoke.mjs   (después de node src/build.js). Sale con código 1 si algo falla.
import fs from 'node:fs';
import path from 'node:path';

const D = 'dist';
const fails = [];
const read = (p) => { try { return fs.readFileSync(path.join(D, p), 'utf8'); } catch { fails.push(`falta ${p}`); return ''; } };
const must = (p, ...needles) => { const t = read(p); for (const n of needles) if (t && !t.includes(n)) fails.push(`${p}: no contiene "${n}"`); return t; };

// Datos de salidas: forma mínima
const sailings = JSON.parse(fs.readFileSync(process.env.SAILINGS || 'src/data/sailings.json', 'utf8'));
for (const x of sailings) {
  if (!x.id || !x.ship || !/^\d{4}-\d{2}-\d{2}$/.test(x.date) || !(x.nights > 0) || !x.prices || !Object.values(x.prices).some((v) => v > 0)) fails.push(`salida mal formada: ${x.id || JSON.stringify(x).slice(0, 80)}`);
}
const ids = new Set(); for (const x of sailings) { if (ids.has(x.id)) fails.push(`salida duplicada: ${x.id}`); ids.add(x.id); }

// Páginas clave
must('index.html', '<title>', 'Chollos de cruceros de hoy');
const of = must('ofertas/index.html', 'id="offer-grid"', 'class="hub-sum"');
must('metodologia/index.html', 'MejorCrucero Score');
must('404.html', 'class="next-sail"');
must('datos/index.html', 'observatorio.csv');
must('sitemap.xml', '<urlset');
must('robots.txt', 'Sitemap:');

// El listado declara todas las salidas y cards.json tiene una tarjeta por cada una
const all = /data-all="([^"]*)"/.exec(of)?.[1]?.split(',').filter(Boolean) || [];
let cards = {}; try { cards = JSON.parse(read('data/cards.json') || '{}'); } catch { fails.push('cards.json no es JSON válido'); }
const missing = all.filter((id) => !cards[id]); if (missing.length) fails.push(`${missing.length} salidas del listado sin tarjeta en cards.json`);
for (const f of ['data/ofertas.json', 'data/chollos.json']) { try { JSON.parse(read(f)); } catch { fails.push(`${f} no es JSON válido`); } }

// Muestra de fichas de salida y de barco: sin "undefined", "NaN" ni "null €" visibles
const bad = /(>[^<]*\b(undefined|NaN)\b[^<]*<)|null\s?€|€\s?null/;
const pick = (dir, n) => { try { return fs.readdirSync(path.join(D, dir)).slice(0, n).map((d) => `${dir}/${d}/index.html`); } catch { return []; } };
const sample = [...pick('salidas', 60), ...pick('barcos', 40), ...pick('ofertas', 20).filter((p) => fs.existsSync(path.join(D, p)))];
for (const p of sample) { const t = read(p); const m = bad.exec(t); if (m) fails.push(`${p}: valor roto cerca de "${m[0].slice(0, 60)}"`); }
const anySailing = pick('salidas', 1)[0]; if (anySailing) must(anySailing, 'Itinerario día a día', 'Nota del precio', 'id="vigilar"');

if (fails.length) { console.error(`✖ Prueba rápida: ${fails.length} fallos\n- ` + fails.slice(0, 40).join('\n- ')); process.exit(1); }
console.log(`✔ Prueba rápida OK: ${sailings.length} salidas, ${sample.length} páginas revisadas, ${all.length} tarjetas en el listado`);
