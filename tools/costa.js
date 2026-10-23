// Importa las salidas y precios públicos de Costa Cruceros (web oficial en España) a src/data/sailings.json.
// Fuente: buscador oficial https://www.costacruceros.es/search/costa_es_ES/cruisesearch (los mismos datos que ve cualquier visitante).
// Uso: node tools/costa.js [ruta_salida]   ·   Si la fuente no responde, NO toca el fichero (se mantienen los datos anteriores).
import fs from 'node:fs';

const OUT = process.argv[2] || 'src/data/sailings.json';
const BASE = 'https://www.costacruceros.es';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36';
const slugify = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) && n > 0 ? Math.round(n) : null; };

// Destinos de Costa -> destinos de MejorCrucero
const DEST = { CW: 'mediterraneo-occidental', CE: 'mediterraneo-oriental', CI: 'canarias-y-madeira', CA: 'caribe', MC: 'mediterraneo-occidental', OC: 'transatlanticos', RW: 'vuelta-al-mundo', SA: 'sudamerica', SP: 'especiales' };
const FJORD = /noruega|bergen|geiranger|stavanger|flaam|flåm|hellesylt|alesund|ålesund|olden|kristiansand/i;
// Puertos: nombre limpio y slug de nuestras páginas de puertos (si existe)
const PORT = (n) => {
  const name = String(n).replace(/\s+/g, ' ').trim();
  const clean = name.includes('|') ? name.split('|').map((x) => x.trim()).pop() : name;
  const map = { Portofino: 'Génova', Tenerife: 'Santa Cruz de Tenerife', 'Gran Canaria': 'Las Palmas de Gran Canaria', Palma: 'Palma de Mallorca', Roma: 'Roma (Civitavecchia)' };
  return map[clean] || clean;
};
const PORT_SLUG = { Barcelona: 'barcelona', 'Palma de Mallorca': 'palma', Valencia: 'valencia', 'Málaga': 'malaga', Alicante: 'alicante', 'Cádiz': 'cadiz', Tarragona: 'tarragona', Bilbao: 'bilbao', Vigo: 'vigo', 'Santa Cruz de Tenerife': 'tenerife', 'Las Palmas de Gran Canaria': 'gran-canaria', 'Buenos Aires': 'buenos-aires' };
const CABIN = (t) => (/suite/i.test(t) ? 'suite' : /balc/i.test(t) ? 'balcon' : /vista|exterior/i.test(t) ? 'exterior' : 'interior');

// Precios por categoría de camarote si la fuente los publica (campos price_EUR_anonymous_<categoría>)
function cabinPrices(c) {
  const out = {};
  for (const [k, v] of Object.entries(c)) {
    const m = /^price_EUR_anonymous_(.+)$/i.exec(k); if (!m) continue;
    const t = m[1].toLowerCase(); const n = num(v); if (!n) continue;
    const cab = /suite/.test(t) ? 'suite' : /balc/.test(t) ? 'balcon' : /ocean|vista|exter|outside/.test(t) ? 'exterior' : /inside|inter|interior/.test(t) ? 'interior' : null;
    if (cab && (!out[cab] || n < out[cab])) out[cab] = n;
  }
  return out;
}

async function main() {
  const q = `${BASE}/search/costa_es_ES/cruisesearch?&fq=(price_EUR_anonymous:[1%20TO%20*])&fq=soldOut:(false)&sort=departDate%20asc&rows=2000`;
  let data;
  try {
    const r = await fetch(q, { headers: { 'User-Agent': UA, Accept: 'application/json', 'Accept-Language': 'es-ES,es;q=0.9' }, signal: AbortSignal.timeout(90000) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    data = await r.json();
  } catch (e) { console.error('Costa no disponible:', e.message, '— se mantienen los datos anteriores'); process.exit(0); }
  const rows = data.searchResults || [];
  // Muestra del esquema de la fuente (2 salidas) para poder aprovechar campos nuevos sin adivinar
  try { fs.writeFileSync('tools/costa-sample.json', JSON.stringify(rows.slice(0, 2), null, 1)); } catch {}
  if (rows.length < 50) { console.error('Respuesta sospechosa de Costa (' + rows.length + ' salidas): no se toca nada'); process.exit(0); }
  const prev = (() => { try { return JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch { return []; } })();
  const prevById = Object.fromEntries(prev.map((x) => [x.id, x]));
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();
  const out = [];
  for (const c of rows) {
    const date = String(c.departureDate || '').slice(0, 10);
    if (!date || date < today || c.isSoldOut === true || c.isSellable === false) continue;
    const price = num(c.price_EUR_anonymous);
    if (!price) continue;
    const m = /\((\d+)\s*noche/i.exec(c.dayAndNightName || '');
    const nights = m ? +m[1] : Math.max(1, (parseInt(c.duration) || 2) - 1);
    // Horas de llegada y salida si la fuente las trae (nombres de campo variables: se toman los que encajan)
    const hhmm = (v) => { const m = /(\d{1,2}):(\d{2})/.exec(String(v || '')); return m ? m[1].padStart(2, '0') + ':' + m[2] : null; };
    const pick = (p, re) => { const k = Object.keys(p).find((z) => re.test(z) && hhmm(p[z])); return k ? hhmm(p[k]) : null; };
    const ports = (c.portsList || []).map((p) => { const o = { day: +p.dayIndicator, name: p.isSeaDestination ? 'Navegación' : PORT(p.portName) }; if (!p.isSeaDestination) { const a = pick(p, /arriv/i), d = pick(p, /depart/i); if (a) o.arrive = a; if (d) o.depart = d; if (p.portCode || p.portId) o.code = String(p.portCode || p.portId); if (/tender/i.test(JSON.stringify(p))) o.tender = true; } return o; });
    // unir días de navegación repetidos y quitar duplicados del mismo día
    const seen = new Set(); const itin = ports.filter((p) => { const k = p.day + p.name; if (seen.has(k)) return false; seen.add(k); return true; });
    const ids = c.destinationIds || [];
    let destination = DEST[ids[0]] || null;
    if (ids[0] === 'NO') destination = itin.some((p) => FJORD.test(p.name)) ? 'fiordos-noruegos' : 'capitales-balticas';
    const depart = PORT(c.departurePortName);
    const svc = (c.serviceCharges || []).find((s) => s.currency === 'EUR');
    const svcIncluded = String(c.serviceChargesIncluded_EUR_anonymous) === 'true';
    const base = num(c.basePrice_EUR_anonymous);
    const allinc = num(c.price_EUR_anonymous_MYALLINC);
    const cabin = CABIN(c.roomTypeName_EUR_anonymous || '');
    const url = BASE + String(c.itineraryPath || '').replace('/content/costa/master_website/es_ES', '');
    const id = 'costa-' + slugify(c.cruiseId || (c.shipId + date));
    const offers = (c.offerNames_EUR_anonymous || []).map((o) => o.name).filter((n) => n && !/^[A-Z0-9 .]{3,}$/.test(n)).slice(0, 3);
    const x = {
      id, line: 'costa', ship: slugify(c.shipName), ship_name: c.shipName, destination, dest_name: c.destinationName,
      date, nights, depart_port: depart, depart_port_slug: PORT_SLUG[depart] || null, arrive_port: PORT(c.arrivalPortName),
      itinerary: { name: String(c.title || c.destinationName).replace(/desde (.+)$/, (m, q) => 'desde ' + PORT(q)), ports: itin },
      countries: c.visitingCountries || '',
      prices: { [cabin]: price, ...cabinPrices(c) },
      allinc, base_price: base && base > price ? base : null,
      port_charges: num(c.portCharges?.adultAmount), service_night: svc ? parseFloat(svc.adultAmount) : null, service_included: svcIncluded,
      offers, documents: c.documents || [], availability: c.availabilityStatus || null,
      sources: [{ partner: 'Costa Cruceros (web oficial)', url, prices: { [cabin]: price }, official: true }],
    };
    const old = prevById[id];
    const history = [...(old?.history || [])];
    if (!history.length || history[history.length - 1].price !== price) history.push({ date: today, price });
    x.history = history.slice(-90);
    x.first_seen = old?.first_seen || today;
    x.updated = now;
    out.push(x);
  }
  out.sort((a, b) => a.date.localeCompare(b.date));
  // Conserva salidas de otras fuentes (no Costa)
  const others = prev.filter((x) => !String(x.id).startsWith('costa-') && x.date >= today);
  fs.writeFileSync(OUT, JSON.stringify([...others, ...out]));
  console.log(`Costa: ${out.length} salidas importadas (${rows.length} en la fuente). Otras fuentes: ${others.length}.`);
}
main();
