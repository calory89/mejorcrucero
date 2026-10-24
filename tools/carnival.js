// Importa salidas y precios de Carnival Cruise Line (web oficial, mercado EE. UU., precios en USD) a src/data/sailings.json.
// Fuente: la API pública del buscador de carnival.com (la misma que usa su web). Sin servicios de terceros.
// Los precios se guardan en dólares (price_usd) y en euros al cambio del BCE del día (src/data/fx.json o variable USD_EUR).
// Uso: node tools/carnival.js [ruta_salida]   ·   Si la fuente falla, NO toca el fichero.
import fs from 'node:fs';
import { destFromName } from './dest.js';

const OUT = process.argv[2] || 'src/data/sailings.json';
const API = 'https://www.carnival.com/cruisesearch/api/search';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const PER_ITIN = +(process.env.CARNIVAL_PER_ITIN || 3); // fechas por itinerario (las más próximas)
const slugify = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fx() {
  if (process.env.USD_EUR) return +process.env.USD_EUR;
  try { const r = await fetch('https://api.frankfurter.app/latest?from=USD&to=EUR', { signal: AbortSignal.timeout(15000) }); const j = await r.json(); if (j?.rates?.EUR) return j.rates.EUR; } catch {}
  return null;
}
async function page(n) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(`${API}?pageNumber=${n}&pageSize=100&sort=fromprice&showBest=true&async=true&currency=USD&locality=1`, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(45000) });
      if (r.ok) return await r.json();
    } catch {}
    await sleep(2000 * (i + 1));
  }
  return null;
}
// Puertos: "Miami, FL" -> "Miami"; "Port Canaveral (Orlando), FL" -> "Port Canaveral"
const PORT = (t) => String(t || '').split(',')[0].replace(/\s*\(.*\)\s*/, '').replace(/™|®/g, '').trim();
const PORT_SLUG = { Miami: 'miami', 'Port Canaveral': 'port-canaveral', 'Fort Lauderdale': 'fort-lauderdale', 'San Juan': 'san-juan', Barcelona: 'barcelona' };
const SEA = /day at sea|fun day at sea|at sea|cruising/i;
function destOf(region, names) {
  const t = `${region} ${names.join(' ')}`;
  if (/alaska/i.test(t)) return 'alaska';
  if (/caribbean|bahamas|caribe/i.test(t)) return 'caribe';
  if (/transatlantic/i.test(t)) return 'transatlanticos';
  if (/mediterr|europe/i.test(t)) return /greece|athens|santorini|mykonos|venice|dubrovnik|kotor|istanbul|corfu/i.test(t) ? 'mediterraneo-oriental' : 'mediterraneo-occidental';
  return null;
}
const h24 = (iso) => { const m = /T(\d{2}):(\d{2})/.exec(String(iso || '')); return m ? `${m[1]}:${m[2]}` : null; };
const CAB = { interior: 'interior', oceanview: 'exterior', balcony: 'balcon', suite: 'suite' };

async function main() {
  const rate = await fx();
  if (!rate) { console.error('Sin tipo de cambio USD→EUR: no se importa Carnival'); process.exit(0); }
  const first = await page(1);
  const r0 = first?.results; if (!r0?.itineraries?.length) { console.error('Carnival no disponible — se mantienen los datos anteriores'); process.exit(0); }
  const its = [...r0.itineraries];
  for (let n = 2; n <= (r0.lastPage || 1); n++) { const p = await page(n); if (p?.results?.itineraries) its.push(...p.results.itineraries); await sleep(800); }
  const today = new Date().toISOString().slice(0, 10), now = new Date().toISOString();
  const prev = (() => { try { return JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch { return []; } })();
  const prevById = Object.fromEntries(prev.map((x) => [x.id, x]));
  const out = [], seen = new Set();
  for (const it of its) {
    const sched = it.leadSailing?.schedule || [];
    const ports = sched.map((p) => (SEA.test(p.port) ? { day: +p.day, name: 'Navegación' } : { day: +p.day, name: PORT(p.port), code: p.portCode, ...(h24(p.arrive) ? { arrive: h24(p.arrive) } : {}), ...(h24(p.depart) ? { depart: h24(p.depart) } : {}) }));
    const names = ports.filter((p) => p.name !== 'Navegación').map((p) => p.name);
    const depart = PORT(it.departurePortName);
    const destination = destFromName(it.regionName, names) || destOf(it.regionName, names);
    const sailings = (it.sailings || []).filter((s) => String(s.departureDate).slice(0, 10) >= today).sort((a, b) => String(a.departureDate).localeCompare(b.departureDate)).slice(0, PER_ITIN);
    for (const s of sailings) {
      const date = String(s.departureDate).slice(0, 10), end = String(s.arrivalDate).slice(0, 10);
      const nights = Math.round((new Date(end) - new Date(date)) / 864e5) || +it.dur; if (!(nights > 0)) continue;
      const usd = {}, prices = {};
      for (const [k, v] of Object.entries(s.rooms || {})) { const cab = CAB[k]; if (!cab || v?.soldOut || !(v?.price > 0) || (v.priceCurrency && v.priceCurrency !== 'USD')) continue; usd[cab] = Math.round(v.price); prices[cab] = Math.round(v.price * rate); }
      if (!Object.keys(prices).length) continue;
      const id = 'carnival-' + slugify(`${it.code}-${it.shipCode}-${s.sailingId || date}`);
      if (seen.has(id)) continue; seen.add(id);
      const taxUsd = Object.values(s.rooms || {}).map((v) => v?.taxesAndFees).find((t) => t > 0);
      const price = Math.min(...Object.values(prices));
      const x = {
        id, line: 'carnival', ship: slugify(it.shipName), ship_name: it.shipName, destination, dest_name: it.regionName,
        date, nights, depart_port: depart, depart_port_slug: PORT_SLUG[depart] || null, arrive_port: it.roundtrip ? depart : PORT(sched[sched.length - 1]?.port) || depart,
        itinerary: { name: String(it.itineraryTitle || ''), ports },
        prices, price_usd: usd, currency_src: 'USD', fx: rate,
        port_charges: taxUsd ? Math.round(taxUsd * rate) : null, service_night: null, service_included: false,
        sources: [{ partner: 'Carnival Cruise Line (web oficial EE. UU.)', url: 'https://www.carnival.com' + s.sailingURL, prices, official: true }],
      };
      const old = prevById[id]; const history = [...(old?.history || [])];
      if (!history.length || history[history.length - 1].price !== price) history.push({ date: today, price });
      x.history = history.slice(-90); x.first_seen = old?.first_seen || today; x.updated = now;
      out.push(x);
    }
  }
  try { fs.writeFileSync('tools/carnival-sample.json', JSON.stringify({ itinerary: { ...its[0], sailings: (its[0].sailings || []).slice(0, 1) } }, null, 1)); } catch {}
  if (out.length < 100) { console.error(`Solo ${out.length} salidas válidas de Carnival: no se toca nada`); process.exit(0); }
  const others = prev.filter((x) => !String(x.id).startsWith('carnival-') && x.date >= today);
  fs.writeFileSync(OUT, JSON.stringify([...others, ...out].sort((a, b) => a.date.localeCompare(b.date))));
  console.log(`Carnival: ${out.length} salidas de ${its.length} itinerarios (1 USD = ${rate} EUR). Otras fuentes: ${others.length}.`);
}
main();
