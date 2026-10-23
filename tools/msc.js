// Importa salidas y precios de MSC Cruceros (mercado España, EUR) a src/data/sailings.json.
// Fuente: actor de Apify "sercul/msc-cruises-scraper", que lee la web oficial de MSC con los precios que ve cualquier visitante.
// Requiere el secreto APIFY_TOKEN (cuenta de Apify del propietario; coste orientativo según Apify: desde 2 $ por 1.000 resultados + proxy).
// Uso: APIFY_TOKEN=… node tools/msc.js [ruta_salida]   ·   Si algo falla, NO toca el fichero (se mantienen los datos anteriores).
import fs from 'node:fs';

const OUT = process.argv[2] || 'src/data/sailings.json';
const TOKEN = process.env.APIFY_TOKEN;
const ACTOR = process.env.MSC_ACTOR || 'sercul~msc-cruises-scraper';
const MAX = +(process.env.MSC_MAX || 1500);
const slugify = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const num = (v) => { const n = parseFloat(typeof v === 'object' && v ? v.amount : v); return Number.isFinite(n) && n > 0 ? Math.round(n) : null; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Zonas de MSC -> destinos de MejorCrucero (por código o por palabras del título)
const DEST_CODE = { MED: null, CAR: 'caribe', NOR: 'fiordos-noruegos', NEU: 'capitales-balticas', BAL: 'capitales-balticas', CAN: 'canarias-y-madeira', TRA: 'transatlanticos', WOR: 'vuelta-al-mundo', SAM: 'sudamerica', SOA: 'sudamerica' };
const EAST = /grecia|greek|islas griegas|adri|croac|turqu|santorin|mykonos|atenas|pireo|corfu|corfú|kotor|dubrovnik|venecia|trieste|bari|estambul/i;
const destOf = (c, names) => {
  const t = [c.title, ...(c.destinations || []), ...(c.destinationIds || [])].join(' ');
  for (const [k, v] of Object.entries(DEST_CODE)) if (v && new RegExp(`\\b${k}\\b`).test(t)) return v;
  if (/fiordo|noruega|norway/i.test(t)) return 'fiordos-noruegos';
  if (/b[aá]ltic|norte de europa|northern europe/i.test(t)) return 'capitales-balticas';
  if (/canari|madeira/i.test(t)) return 'canarias-y-madeira';
  if (/caribe|caribbean|antillas|bahamas/i.test(t)) return 'caribe';
  if (/transatl|crossing/i.test(t)) return 'transatlanticos';
  if (/sudam[eé]rica|south america|brasil|argentin/i.test(t)) return 'sudamerica';
  if (/vuelta al mundo|world cruise/i.test(t)) return 'vuelta-al-mundo';
  if (/medit/i.test(t) || /\bMED\b/.test(t)) return EAST.test(t + ' ' + names.join(' ')) ? 'mediterraneo-oriental' : 'mediterraneo-occidental';
  return null;
};
const PORT_SLUG = { Barcelona: 'barcelona', 'Palma de Mallorca': 'palma', Palma: 'palma', Valencia: 'valencia', 'Málaga': 'malaga', Malaga: 'malaga', Alicante: 'alicante', 'Cádiz': 'cadiz', Cadiz: 'cadiz', Tarragona: 'tarragona', Bilbao: 'bilbao', Vigo: 'vigo', 'Santa Cruz de Tenerife': 'tenerife', Tenerife: 'tenerife', 'Las Palmas de Gran Canaria': 'gran-canaria', 'Gran Canaria': 'gran-canaria', 'Buenos Aires': 'buenos-aires', Miami: 'miami' };
const CAB = { INTERIOR: 'interior', INSIDE: 'interior', OCEANVIEW: 'exterior', OUTSIDE: 'exterior', BALCONY: 'balcon', SUITE: 'suite' };

async function apify(path, opts = {}) {
  const r = await fetch(`${process.env.APIFY_API || 'https://api.apify.com/v2'}${path}${path.includes('?') ? '&' : '?'}token=${TOKEN}`, { ...opts, headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(60000) });
  if (!r.ok) throw new Error(`Apify HTTP ${r.status}`);
  return r.json();
}

async function main() {
  if (!TOKEN) { console.error('Falta APIFY_TOKEN: no se importa MSC'); process.exit(0); }
  let items;
  try {
    const run = (await apify(`/acts/${ACTOR}/runs`, { method: 'POST', body: JSON.stringify({ region: 'es_ES', maxRows: MAX, enrichCabinPrices: true, tailRotationNearWeeks: 8, tailCursorNamespace: 'mejorcrucero-es' }) })).data;
    let st = run;
    for (let i = 0; i < 90 && ['READY', 'RUNNING'].includes(st.status); i++) { await sleep(20000); st = (await apify(`/actor-runs/${run.id}`)).data; }
    if (st.status !== 'SUCCEEDED') throw new Error('ejecución ' + st.status);
    items = await apify(`/datasets/${st.defaultDatasetId}/items?clean=true&format=json`);
  } catch (e) { console.error('MSC no disponible:', e.message, '— se mantienen los datos anteriores'); process.exit(0); }
  if (!Array.isArray(items) || items.length < 20) { console.error(`Respuesta sospechosa de MSC (${items?.length || 0} salidas): no se toca nada`); process.exit(0); }
  try { fs.writeFileSync('tools/msc-sample.json', JSON.stringify(items.slice(0, 2), null, 1)); } catch {}

  const prev = (() => { try { return JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch { return []; } })();
  const prevById = Object.fromEntries(prev.map((x) => [x.id, x]));
  const today = new Date().toISOString().slice(0, 10), now = new Date().toISOString();
  const out = [], seen = new Set();
  for (const c of items) {
    if (String(c.currency || 'EUR').toUpperCase() !== 'EUR') continue;
    const date = String(c.departure_date || c.departureDate || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today) continue;
    const prices = {};
    for (const [k, v] of Object.entries(c.pricing_tiers || {})) { const cab = CAB[String(k).toUpperCase()]; const n = num(v); if (cab && n && (!prices[cab] || n < prices[cab])) prices[cab] = n; }
    const from = num(c.price); if (from && !Object.keys(prices).length) prices.interior = from;
    if (!Object.keys(prices).length) continue;
    const nights = parseInt(c.duration) || null; if (!nights) continue;
    const rawPorts = c.portsList || c.ports_list || [];
    const ports = rawPorts.map((p, i) => (typeof p === 'string' ? { day: i + 1, name: p } : { day: +(p.dayIndicator || p.day || i + 1), name: p.isSeaDestination ? 'Navegación' : String(p.portName || p.name || '') })).filter((p) => p.name);
    // Con una lista plana no sabemos el día real de cada escala: guardamos el orden sin inventar días
    const flat = rawPorts.length && typeof rawPorts[0] === 'string';
    const names = ports.map((p) => p.name);
    const depart = names[0] || '';
    const ship = slugify(c.ship_name || '');
    const id = 'msc-' + slugify(c.cruise_id || c.itinerary_id + '-' + date);
    if (!ship || seen.has(id)) continue; seen.add(id);
    const x = {
      id, line: 'msc', ship, ship_name: c.ship_name, destination: destOf(c, names), dest_name: (c.destinations || [])[0] || null,
      date, nights, depart_port: depart, depart_port_slug: PORT_SLUG[depart] || null, arrive_port: names[names.length - 1] || depart,
      itinerary: { name: String(c.title || ''), ports: flat ? ports.map((p) => ({ name: p.name, order: p.day })) : ports, flat },
      prices, port_charges: num(c.portCharges || c.port_charges), service_night: num(c.serviceCharges || c.service_charges), service_included: false,
      sources: [{ partner: 'MSC Cruceros (web oficial)', url: c.source_url || 'https://www.msccruceros.es/', prices, official: true }],
    };
    const price = Math.min(...Object.values(prices));
    const old = prevById[id]; const history = [...(old?.history || [])];
    if (!history.length || history[history.length - 1].price !== price) history.push({ date: today, price });
    x.history = history.slice(-90); x.first_seen = old?.first_seen || today; x.updated = now;
    out.push(x);
  }
  if (out.length < 20) { console.error(`Solo ${out.length} salidas válidas de MSC: no se toca nada`); process.exit(0); }
  const others = prev.filter((x) => !String(x.id).startsWith('msc-') && x.date >= today);
  fs.writeFileSync(OUT, JSON.stringify([...others, ...out].sort((a, b) => a.date.localeCompare(b.date))));
  console.log(`MSC: ${out.length} salidas importadas (${items.length} en la fuente). Otras fuentes: ${others.length}.`);
}
main();
