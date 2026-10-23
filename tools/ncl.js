// Importa salidas y precios de Norwegian Cruise Line (web oficial en España, EUR) a src/data/sailings.json.
// Fuente: la misma API pública que usa el buscador de ncl.com/es/es (búsqueda, fechas por itinerario y escalas con horario).
// Sin servicios de terceros. Uso: node tools/ncl.js [ruta_salida]   ·   NCL_MAX=40 limita los itinerarios (para pruebas).
// Si la fuente no responde o devuelve poco, NO toca el fichero (se mantienen los datos anteriores).
import fs from 'node:fs';

const OUT = process.argv[2] || 'src/data/sailings.json';
const MAX = +(process.env.NCL_MAX || 0);
const BASE = 'https://www.ncl.com/es/es';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const slugify = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) && n > 0 ? Math.round(n) : null; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(path, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(BASE + path, { headers: { 'User-Agent': UA, Accept: 'application/json', 'Accept-Language': 'es-ES,es;q=0.9' }, signal: AbortSignal.timeout(30000) });
      if (r.status === 429 || r.status >= 500) { await sleep(2000 * (i + 1)); continue; }
      if (!r.ok) return null;
      return await r.json();
    } catch { await sleep(1500 * (i + 1)); }
  }
  return null;
}
// Varias peticiones a la vez, sin pasarse (cortesía con la web de la naviera)
async function pool(items, n, fn) { const out = []; let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); await sleep(250); } })); return out; }

// Nombre de puerto limpio: "Barcelona, España" -> "Barcelona"; "Orlando (Port Canaveral), Florida" -> "Port Canaveral"
const PORT = (t) => { const s = String(t || '').split(',')[0].trim(); const m = /\(([^)]+)\)/.exec(s); return m && /port|puerto/i.test(m[1]) ? m[1] : s.replace(/\s*\(.*\)$/, ''); };
const PORT_SLUG = { Barcelona: 'barcelona', 'Palma de Mallorca': 'palma', Palma: 'palma', Valencia: 'valencia', 'Málaga': 'malaga', Alicante: 'alicante', 'Cádiz': 'cadiz', Tarragona: 'tarragona', Bilbao: 'bilbao', Vigo: 'vigo', 'Santa Cruz de Tenerife': 'tenerife', Tenerife: 'tenerife', 'Las Palmas de Gran Canaria': 'gran-canaria', 'Gran Canaria': 'gran-canaria', 'Buenos Aires': 'buenos-aires', Miami: 'miami', 'Port Canaveral': 'port-canaveral', 'Fort Lauderdale': 'fort-lauderdale', 'Port Everglades': 'fort-lauderdale', 'San Juan': 'san-juan' };
const EAST = /grecia|greece|croacia|croatia|turqu|turkey|santorin|mykonos|atenas|athens|pireo|piraeus|corf|kotor|dubrovnik|venecia|venice|trieste|bari|estambul|istanbul|split|zadar|rodas|rhodes|creta|crete|chania|heraklion|katakolon|argostoli/i;
const FJORD = /noruega|norway|bergen|geiranger|stavanger|flaam|flåm|hellesylt|alesund|ålesund|olden|kristiansand/i;
function destOf(it, names) {
  const codes = (it.destinations || []).map((d) => String(d.code).toUpperCase()).join(' ');
  const all = names.join(' ');
  if (/ALASKA/.test(codes)) return 'alaska';
  if (/CARIBBEAN|BAHAMAS/.test(codes)) return 'caribe';
  if (/TRANSATLANTIC|TRANSOCEANIC/.test(codes)) return 'transatlanticos';
  if (/CANARY|CANARIAS/.test(codes)) return 'canarias-y-madeira';
  if (/NORTHERN|SCANDINAVIA|BALTIC|NORDIC/.test(codes)) return FJORD.test(all) ? 'fiordos-noruegos' : 'capitales-balticas';
  if (/MEDITERRANEAN|EUROPE|GREEK/.test(codes)) return EAST.test(all) ? 'mediterraneo-oriental' : 'mediterraneo-occidental';
  if (/SOUTH.?AMERICA/.test(codes)) return 'sudamerica';
  return null;
}
// Categorías de camarote de NCL -> las nuestras (las dudosas se ignoran)
const CAB = (code, title) => { const t = `${code} ${title}`.toUpperCase(); if (/HAVEN|SUITE/.test(t) && !/MINI/.test(t)) return 'suite'; if (/BALCON|BALCONY|MINI/.test(t)) return 'balcon'; if (/OCEANVIEW|OCEAN VIEW|EXTERIOR|VISTA/.test(t)) return 'exterior'; if (/INSIDE|INTERIOR/.test(t)) return 'interior'; return null; };
const h24 = (s) => { const m = /(\d{1,2}):(\d{2})\s*([AP]M)?/i.exec(String(s || '')); if (!m) return null; let h = +m[1]; if (m[3]) { if (/PM/i.test(m[3]) && h < 12) h += 12; if (/AM/i.test(m[3]) && h === 12) h = 0; } return `${String(h).padStart(2, '0')}:${m[2]}`; };

async function main() {
  // 1) Todos los itinerarios del buscador
  const first = await get('/api/v2/vacations/search?filterConfig=search-filters-configuration&limit=50&offset=0');
  if (!first?.itineraries?.length) { console.error('NCL no disponible — se mantienen los datos anteriores'); process.exit(0); }
  let its = [...first.itineraries];
  const total = Math.min(first.total || its.length, MAX || Infinity);
  for (let off = 50; off < total; off += 50) { const p = await get(`/api/v2/vacations/search?filterConfig=search-filters-configuration&limit=50&offset=${off}`); if (p?.itineraries) its.push(...p.itineraries); await sleep(300); }
  const seenCode = new Set(); its = its.filter((x) => x.code && !seenCode.has(x.code) && seenCode.add(x.code));
  if (MAX) its = its.slice(0, MAX);
  // 2) Fechas y precios por itinerario, y escalas (una vez por itinerario)
  const today = new Date().toISOString().slice(0, 10), now = new Date().toISOString();
  const prev = (() => { try { return JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch { return []; } })();
  const prevById = Object.fromEntries(prev.map((x) => [x.id, x]));
  const out = []; const unknownCabins = new Set(); let sample = null;
  await pool(its, 3, async (it) => {
    const s = await get(`/api/vacation-builder/v2/itinerary/${encodeURIComponent(it.code)}/sailings?numberOfGuests=2`);
    const results = s?.results || []; if (!results.length) return;
    const ev = await get(`/api/vacation-builder/itinerary/${encodeURIComponent(it.code)}/package/${encodeURIComponent(results[0].sailing.packageId)}/events`);
    if (!sample) sample = { itinerary: it, sailing: { ...results[0], stateroomTypesPricing: (results[0].stateroomTypesPricing || []).map(({ offerGroups, ...r }) => r) }, events: (ev || []).slice(0, 3) };
    const ports = []; let tender = new Set();
    for (const d of ev || []) for (const e of d.events || []) {
      if (String(e.eventType).toUpperCase() !== 'PORT') continue;
      const sched = String(e.portInfo?.dailySchedule || ''); const [a, b] = sched.split('-').map((z) => z.trim());
      const o = { day: +d.day, name: PORT(e.title), code: e.portInfo?.code || null };
      if (e.portInfo?.isEmbarkation) { const t = h24(a); if (t) o.depart = t; } else if (e.portInfo?.isDisembarkation) { const t = h24(a); if (t) o.arrive = t; } else { const ta = h24(a), td = h24(b); if (ta) o.arrive = ta; if (td) o.depart = td; }
      if (e.portInfo?.isTender) o.tender = true;
      ports.push(o);
    }
    const names = ports.map((p) => p.name).length ? ports.map((p) => p.name) : [PORT(it.embarkationPort?.title), ...(it.portsOfCall || []).map((p) => PORT(p.title)), PORT(it.disembarkationPort?.title)];
    const depart = PORT(it.embarkationPort?.title), arrive = PORT(it.disembarkationPort?.title);
    const destination = destOf(it, names);
    for (const r of results) {
      const date = String(r.sailing?.sailStartDate || '').slice(0, 10), end = String(r.sailing?.sailEndDate || '').slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today) continue;
      const nights = Math.round((new Date(end) - new Date(date)) / 864e5); if (!(nights > 0)) continue;
      const prices = {}; let base = null;
      for (const c of r.stateroomTypesPricing || []) {
        if (String(c.status).toUpperCase() !== 'AVAILABLE') continue;
        const cab = CAB(c.code, c.title); if (!cab) { unknownCabins.add(`${c.code}|${c.title}`); continue; }
        const p = num(c.combinedPrice); if (p && (!prices[cab] || p < prices[cab])) { prices[cab] = p; if (cab === 'interior' || !base) base = num(c.basePrice); }
      }
      if (!Object.keys(prices).length) continue;
      const price = Math.min(...Object.values(prices));
      const id = 'ncl-' + slugify(`${it.code}-${r.sailing.sailingId || date}`);
      const urlB = `https://www.ncl.com/es/es/vacation-builder?itineraryCode=${encodeURIComponent(it.code)}`;
      const x = {
        id, line: 'norwegian', ship: slugify(it.ship?.title || ''), ship_name: it.ship?.title, destination, dest_name: (it.destinations || [])[0]?.title || null,
        date, nights, depart_port: depart, depart_port_slug: PORT_SLUG[depart] || null, arrive_port: arrive,
        itinerary: { name: String(it.title || ''), ports: ports.length ? ports : names.map((n, i) => ({ name: n, order: i + 1 })), flat: !ports.length },
        prices, base_price: base && base > price ? base : null, port_charges: null, service_night: null, service_included: false,
        offers: (it.deals || []).map((d) => d.title).filter(Boolean).slice(0, 3),
        sources: [{ partner: 'Norwegian Cruise Line (web oficial)', url: urlB, prices, official: true }],
      };
      const old = prevById[id]; const history = [...(old?.history || [])];
      if (!history.length || history[history.length - 1].price !== price) history.push({ date: today, price });
      x.history = history.slice(-90); x.first_seen = old?.first_seen || today; x.updated = now;
      out.push(x);
    }
  });
  try { fs.writeFileSync('tools/ncl-sample.json', JSON.stringify({ sample, unknownCabins: [...unknownCabins].slice(0, 40) }, null, 1)); } catch {}
  if (out.length < (MAX ? 5 : 100)) { console.error(`Solo ${out.length} salidas válidas de NCL (${its.length} itinerarios): no se toca nada`); process.exit(0); }
  const others = prev.filter((x) => !String(x.id).startsWith('ncl-') && x.date >= today);
  fs.writeFileSync(OUT, JSON.stringify([...others, ...out].sort((a, b) => a.date.localeCompare(b.date))));
  console.log(`NCL: ${out.length} salidas importadas de ${its.length} itinerarios. Otras fuentes: ${others.length}. Camarotes sin mapear: ${unknownCabins.size}.`);
}
main();
