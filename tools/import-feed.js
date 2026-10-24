// Importa salidas de un feed de agencia afiliada (FEED_URL) y las MEZCLA con las de las navieras propias.
// Acepta JSON (array con el esquema de docs/feed.md, o {sailings:[...]}) o CSV con cabecera (columnas en docs/feed.md).
// Nunca borra salidas de otras fuentes: solo sustituye las suyas (id que empieza por "feed-" o el prefijo FEED_PREFIX).
// Opcional: FEED_TOKEN (Bearer), FEED_PARTNER (nombre de la agencia que se muestra), FEED_PREFIX (por defecto "feed").
// Si una salida del feed coincide con una que ya tenemos (mismo barco y fecha), se añade como otra fuente de precio
// en lugar de duplicarla: así la ficha puede mostrar el precio de la naviera y el de la agencia.
import fs from 'node:fs';
import { destFromName } from './dest.js';

const url = process.env.FEED_URL;
if (!url) { console.log('Sin FEED_URL: no se importa nada'); process.exit(0); }
const OUT = process.argv[2] || 'src/data/sailings.json';
const PREFIX = (process.env.FEED_PREFIX || 'feed').replace(/[^a-z0-9-]/gi, '').toLowerCase();
const PARTNER = process.env.FEED_PARTNER || 'Agencia';
const slugify = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const num = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) && n > 0 ? Math.round(n) : null; };

function parseCsv(t) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < t.length; i++) { const c = t[i];
    if (q) { if (c === '"' && t[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; continue; }
    if (c === '"') q = true; else if (c === ',' || c === ';') { row.push(cell); cell = ''; } else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; } else if (c !== '\r') cell += c; }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [h, ...rest] = rows; const keys = h.map((k) => k.trim().toLowerCase());
  return rest.filter((r) => r.some((c) => c.trim())).map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? '').trim()])));
}
// CSV -> esquema: line, ship, date, nights, depart_port, destination (o zona), ports ("Barcelona|Marsella|..."), interior, exterior, balcon, suite, port_charges, url
function fromCsv(r) {
  const ports = String(r.ports || r.escalas || '').split('|').map((n) => n.trim()).filter(Boolean);
  return { line: slugify(r.line || r.naviera || ''), ship: slugify(r.ship || r.barco || ''), ship_name: r.ship || r.barco, date: r.date || r.fecha, nights: +(r.nights || r.noches),
    depart_port: r.depart_port || r.puerto || ports[0], destination: r.destination || null, dest_name: r.zona || r.destination_name || '',
    itinerary: { name: r.itinerary || r.itinerario || '', ports: ports.map((n, i) => ({ name: n, order: i + 1 })), flat: true },
    prices: Object.fromEntries(['interior', 'exterior', 'balcon', 'suite'].map((k) => [k, num(r[k])]).filter(([, v]) => v)),
    port_charges: num(r.port_charges || r.tasas), url: r.url || r.enlace };
}

const prev = (() => { try { return JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch { return []; } })();
let raw;
try {
  const r = await fetch(url, { headers: process.env.FEED_TOKEN ? { Authorization: 'Bearer ' + process.env.FEED_TOKEN } : {}, signal: AbortSignal.timeout(120000) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const t = await r.text();
  raw = /^\s*[[{]/.test(t) ? JSON.parse(t) : parseCsv(t).map(fromCsv);
  if (!Array.isArray(raw)) raw = raw.sailings || raw.data || [];
} catch (e) { console.error('Feed no disponible:', e.message, '— se mantienen los datos anteriores'); process.exit(0); }

const today = new Date().toISOString().slice(0, 10), now = new Date().toISOString();
const byShipDate = new Map(prev.filter((x) => !String(x.id).startsWith(PREFIX + '-')).map((x) => [`${x.ship}|${x.date}`, x]));
const own = [], merged = new Set();
for (const x of raw) {
  if (!x.ship || !/^\d{4}-\d{2}-\d{2}$/.test(String(x.date)) || x.date < today || !(x.nights > 0) || !x.prices) continue;
  const prices = Object.fromEntries(Object.entries(x.prices).filter(([, v]) => v > 0)); if (!Object.keys(prices).length) continue;
  const ship = slugify(x.ship); const src = { partner: x.partner || PARTNER, url: x.url || (x.sources || [])[0]?.url || null, prices };
  const twin = byShipDate.get(`${ship}|${x.date}`);
  if (twin) { twin.sources = [...(twin.sources || []).filter((s) => s.partner !== src.partner), src]; merged.add(twin.id); continue; }
  const id = `${PREFIX}-${slugify(x.id || `${ship}-${x.date}`)}`;
  const old = prev.find((o) => o.id === id);
  const min = Math.min(...Object.values(prices));
  const history = [...(old?.history || [])]; if (!history.length || history[history.length - 1].price !== min) history.push({ date: today, price: min });
  own.push({ ...x, id, ship, line: x.line ? slugify(x.line) : null, destination: x.destination || destFromName(x.dest_name || '', (x.itinerary?.ports || []).map((p) => p.name)), prices,
    sources: [src], history: history.slice(-90), first_seen: old?.first_seen || today, updated: now });
}
if (own.length + merged.size < 5) { console.error(`Solo ${own.length + merged.size} salidas útiles en el feed: no se toca nada`); process.exit(0); }
const others = prev.filter((x) => !String(x.id).startsWith(PREFIX + '-') && x.date >= today);
fs.writeFileSync(OUT, JSON.stringify([...others, ...own].sort((a, b) => a.date.localeCompare(b.date))));
console.log(`Feed ${PARTNER}: ${own.length} salidas nuevas y ${merged.size} precios añadidos a salidas que ya teníamos. Otras fuentes: ${others.length}.`);
