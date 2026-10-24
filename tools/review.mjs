// Revisión mensual de datos: escalas con nombres casi iguales (alias que faltan), escalas sin coordenadas
// y salidas sin destino asignado. Escribe un informe en Markdown (para abrir una incidencia en GitHub).
// Uso: node tools/review.mjs > informe.md
import fs from 'node:fs';
const read = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const S = read('src/data/sailings.json', []), A = read('src/data/port_alias.json', {}), C = read('src/data/port_coords.json', {});
const offers = fs.existsSync('src/offers.js') ? fs.readFileSync('src/offers.js', 'utf8') : '';
const fixed = new Set([...offers.matchAll(/\['([^']+)',\s*-?\d/g)].map((m) => m[1].split(' (')[0]));
const norm = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const count = {};
for (const x of S) for (const p of x.itinerary?.ports || []) { const n = A[p.name] || p.name; if (!/navegaci/i.test(n)) count[n] = (count[n] || 0) + 1; }
const byNorm = {}; for (const n of Object.keys(count)) (byNorm[norm(n)] = byNorm[norm(n)] || []).push(n);
const twins = Object.values(byNorm).filter((l) => l.length > 1);
const noCoord = Object.entries(count).filter(([n]) => !C[n] && !fixed.has(n.split(' (')[0])).sort((a, b) => b[1] - a[1]);
const noDest = {}; for (const x of S) if (!x.destination) { const k = `${x.line} · ${x.dest_name || x.itinerary?.name || 'sin nombre'}`; noDest[k] = (noDest[k] || 0) + 1; }
const out = [`# Revisión mensual de datos (${new Date().toISOString().slice(0, 10)})`, '', `Salidas: ${S.length}. Escalas distintas: ${Object.keys(count).length}.`, '',
  '## Escalas con nombres casi iguales (añadir alias en src/data/port_alias.json)', twins.length ? twins.map((l) => `- ${l.map((n) => `${n} (${count[n]})`).join(' / ')}`).join('\n') : 'Ninguna.', '',
  '## Escalas sin coordenadas (las más frecuentes)', noCoord.length ? noCoord.slice(0, 40).map(([n, c]) => `- ${n} (${c})`).join('\n') : 'Ninguna.', '',
  '## Salidas sin destino asignado (revisar tools/dest.js)', Object.keys(noDest).length ? Object.entries(noDest).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, c]) => `- ${k} (${c})`).join('\n') : 'Ninguna.'];
console.log(out.join('\n'));
