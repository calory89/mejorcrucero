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

const dataSize = fs.statSync(process.env.SAILINGS || 'src/data/sailings.json').size; if (dataSize > 25e6) fails.push(`el fichero de salidas pesa ${Math.round(dataSize / 1e6)} MB (máximo 25)`); else if (dataSize > 15e6) console.warn(`⚠ El fichero de salidas pesa ${Math.round(dataSize / 1e6)} MB`);
// Páginas clave
must('index.html', '<title>', 'Chollos de cruceros de hoy');
const of = must('ofertas/index.html', 'id="offer-grid"', 'class="hub-sum"');
must('metodologia/index.html', 'MejorCrucero Score');
must('404.html', 'class="next-sail"');
must('datos/index.html', 'observatorio.csv');
must('sitemap.xml', '<sitemapindex');
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

// SEO básico en todas las páginas indexables: título y descripción únicos y de longitud razonable (avisos, no bloquean)
const warns = [];
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(dir, e.name)) : e.name === 'index.html' ? [path.join(dir, e.name)] : []);
const titles = new Map(), descs = new Map(); let pages = 0, longT = 0, longD = 0;
for (const f of walk(D)) {
  const t = fs.readFileSync(f, 'utf8'); if (t.length > 400000) warns.push(`${f}: pesa ${Math.round(t.length / 1024)} KB (más de 400 KB)`); if (/name="robots" content="noindex/.test(t)) continue; pages++;
  const ti = /<title>([^<]*)<\/title>/.exec(t)?.[1] || ''; const de = /<meta name="description" content="([^"]*)"/.exec(t)?.[1] || '';
  if (!ti) fails.push(`${f}: sin título`); if (!de) warns.push(`${f}: sin descripción`);
  if (ti.length > 75) longT++; if (de.length > 170) longD++;
  titles.set(ti, [...(titles.get(ti) || []), f]); descs.set(de, [...(descs.get(de) || []), f]);
  // Accesibilidad básica: idioma, imágenes con alt, botones con nombre, campos con etiqueta
  if (!/<html lang="es/.test(t)) warns.push(`${f}: sin idioma declarado`);
  for (const m of t.matchAll(/<img\b(?![^>]*\balt=)[^>]*>/g)) { warns.push(`${f}: imagen sin alt`); break; }
  for (const m of t.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)) { const txt = m[2].replace(/<[^>]+>/g, '').trim(); if (!txt && !/aria-label=/.test(m[1])) { warns.push(`${f}: botón sin nombre`); break; } }
  for (const m of t.matchAll(/<(input|select|textarea)\b([^>]*)>/g)) { const a = m[2]; if (/type="(hidden|submit|button|checkbox|radio)"|class="hp"|aria-label=|aria-hidden/.test(a)) continue; const id = /id="([^"]+)"/.exec(a)?.[1]; if (id && t.includes(`for="${id}"`)) continue; const before = t.slice(Math.max(0, m.index - 400), m.index); if (/<label\b[^>]*>(?:(?!<\/label>)[\s\S])*$/.test(before)) continue; warns.push(`${f}: campo sin etiqueta (${(/name="([^"]+)"/.exec(a) || [])[1] || m[1]})`); break; }
  const vis = t.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<option[^>]*>—<\/option>/g, '');
  if (/—/.test(vis.replace(/<[^>]+>/g, ' '))) warns.push(`${f}: raya larga en el texto`);
}
const dupT = [...titles].filter(([k, v]) => k && v.length > 1), dupD = [...descs].filter(([k, v]) => k && v.length > 1);
if (dupT.length) warns.push(`${dupT.length} títulos repetidos (p. ej. "${dupT[0][0].slice(0, 60)}" en ${dupT[0][1].length} páginas)`);
if (dupD.length) warns.push(`${dupD.length} descripciones repetidas`);
if (longT) warns.push(`${longT} títulos de más de 75 caracteres`); if (longD) warns.push(`${longD} descripciones de más de 170 caracteres`);
// El sitemap solo debe listar páginas que existen
const smIndex = read('sitemap.xml'); const smFiles = [...smIndex.matchAll(/<loc>https?:\/\/[^/]+\/([^<]*\.xml)<\/loc>/g)].map((m) => m[1]); if (!smFiles.length) fails.push('sitemap.xml no es un índice de sitemaps');
const locs = smFiles.flatMap((f) => [...read(f).matchAll(/<loc>https?:\/\/[^/]+(\/[^<]*)<\/loc>/g)].map((m) => m[1]));
const missingSm = locs.filter((u) => !fs.existsSync(path.join(D, decodeURIComponent(u), u.endsWith('/') ? 'index.html' : ''))).slice(0, 10);
if (missingSm.length) fails.push(`sitemap con páginas que no existen: ${missingSm.join(', ')}`);
// Enlaces internos de una muestra de páginas
const linkMiss = new Set();
for (const p of sample.slice(0, 40)) { const t = read(p); for (const m of t.matchAll(/href="(\/[^"#?]*)"/g)) { const B = (process.env.BASE || '/').replace(/\/$/, ''); const u = B && m[1].startsWith(B + '/') ? m[1].slice(B.length) : m[1]; if (/^\/(data|assets|og|img)\//.test(u) || /\.[a-z0-9]{2,5}$/.test(u)) continue; if (!fs.existsSync(path.join(D, u, 'index.html')) && !fs.existsSync(path.join(D, u))) linkMiss.add(`${u} (en ${p})`); } }
if (linkMiss.size) fails.push(`enlaces internos rotos: ${[...linkMiss].slice(0, 10).join(', ')}`);
if (warns.length) console.warn(`⚠ Avisos (${warns.length}):\n- ` + warns.slice(0, 15).join('\n- '));
console.log(`SEO: ${pages} páginas indexables, ${locs.length} URL en el sitemap`);
if (fails.length) { console.error(`✖ Prueba rápida: ${fails.length} fallos\n- ` + fails.slice(0, 40).join('\n- ')); process.exit(1); }
console.log(`✔ Prueba rápida OK: ${sailings.length} salidas, ${sample.length} páginas revisadas, ${all.length} tarjetas en el listado`);
