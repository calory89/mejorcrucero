// Importa salidas y precios de Celestyal (web oficial, precios en euros) a src/data/sailings.json.
// Fuentes públicas que usa su propio buscador: el fichero de disponibilidad y precios (mercado GRC, en EUR)
// y la lista de itinerarios en español (escalas día a día). Sin servicios de terceros.
// El fichero de precios da, por itinerario y mes, el precio más bajo de cada tipo de camarote y la fecha de esa salida:
// cada salida que importamos lleva solo los camarotes cuyo precio corresponde de verdad a esa fecha.
// Uso: node tools/celestyal.js [ruta_salida]   ·   Si la fuente falla, NO toca el fichero.
import fs from 'node:fs';
import { destFromName } from './dest.js';

const OUT = process.argv[2] || 'src/data/sailings.json';
const H = 'https://celestyal.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const slugify = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const CAB = { INSIDE: 'interior', OUTSIDE: 'exterior', BALCONY: 'balcon', DELUXE: 'suite', SUITE: 'suite' };
const PORT_SLUG = { Tarragona: 'tarragona', Málaga: 'malaga', Valencia: 'valencia', Barcelona: 'barcelona', 'Palma de Mallorca': 'palma', Cádiz: 'cadiz' };

async function get(path) {
  for (let i = 0; i < 3; i++) {
    try { const r = await fetch(H + path, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(45000) }); if (r.ok) return await r.json(); } catch {}
    await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
  }
  return null;
}
const hm = (t) => (t ? String(t).slice(0, 5) : null);
// "Días 3 y 4 - Lunes y Martes" -> 3 ; "Día 1 - Sábado" -> 1
const dayOf = (s) => +(/\d+/.exec(String(s || ''))?.[0] || 0);

async function main() {
  const [pr, il, idx] = await Promise.all([get('/scripts/flat-files/GRC/availability/Availability-Pricing.json'), get('/graphql/execute.json/celestyal/ItineraryList;locale=es;variant=es'), get('/es/itineraries-index.json')]);
  const items = il?.data?.itineraryList?.items || [];
  if (!pr?.itineraries?.length || pr.currency !== 'EUR' || !items.length) { console.error('Celestyal no disponible: se mantienen los datos anteriores'); process.exit(0); }
  const page = {}; for (const r of idx?.data || []) { const h = r['cf-reference']?.properties?.href; if (h && !page[h]) page[h] = r.path; }
  const itin = Object.fromEntries(items.map((x) => [x.code, x]));
  const today = new Date().toISOString().slice(0, 10), now = new Date().toISOString();
  const prev = (() => { try { return JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch { return []; } })();
  const prevById = Object.fromEntries(prev.map((x) => [x.id, x]));
  const out = [];
  for (const it of pr.itineraries) {
    const g = itin[it.code]; if (!g?.itinerarySteps?.length) continue;
    const ports = g.itinerarySteps.map((s) => { const n = String(s.location?.title || '').trim(); const sea = /navegaci/i.test(n); return sea ? { day: dayOf(s.day), name: 'Navegación' } : { day: dayOf(s.day), name: n, ...(hm(s.arrivalTime) ? { arrive: hm(s.arrivalTime) } : {}), ...(hm(s.departureTime) ? { depart: hm(s.departureTime) } : {}) }; }).filter((p) => p.day && p.name);
    const names = ports.filter((p) => p.name !== 'Navegación').map((p) => p.name); if (names.length < 2) continue;
    const shipName = pr.ships?.[it.ship] || g.ship; if (!shipName) continue;
    let title = `${String(g.title || it.name).trim()} ${String(g.subTitle || '').trim()}`.trim();
    title = title.replace(/\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)(?:\s*(?:,|y)\s*(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre))*(?=\s|$)/gi, '').replace(/\s*:\s*salidas\b.*$/i, '').replace(/\s{2,}/g, ' ').trim();
    const url = page[g._path] ? H + page[g._path] : H + '/es/search';
    const byDate = {};
    for (const m of it.prices || []) for (const c of m.categories || []) {
      const cab = CAB[c.category]; const d = String(c.departureDate || '').slice(0, 10);
      if (!cab || !(c.price > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(d) || d < today) continue;
      const p = (byDate[d] = byDate[d] || {}); p[cab] = Math.min(p[cab] || Infinity, Math.round(c.price));
    }
    for (const [date, prices] of Object.entries(byDate)) {
      const id = 'celestyal-' + slugify(`${it.code}-${date}`);
      const price = Math.min(...Object.values(prices));
      const x = {
        id, line: 'celestyal', ship: slugify(shipName), ship_name: shipName,
        destination: destFromName(`${it.name} ${title}`, names), dest_name: title,
        date, nights: +it.nights, depart_port: names[0], depart_port_slug: PORT_SLUG[names[0]] || null, arrive_port: names[names.length - 1],
        itinerary: { name: title, ports },
        prices, port_charges: null, service_night: null, service_included: null,
        sources: [{ partner: 'Celestyal (web oficial)', url, prices, official: true }],
      };
      const old = prevById[id]; const history = [...(old?.history || [])];
      if (!history.length || history[history.length - 1].price !== price) history.push({ date: today, price });
      x.history = history.slice(-90); x.first_seen = old?.first_seen || today; x.updated = now;
      out.push(x);
    }
  }
  if (out.length < 30) { console.error(`Solo ${out.length} salidas válidas de Celestyal: no se toca nada`); process.exit(0); }
  const others = prev.filter((x) => !String(x.id).startsWith('celestyal-') && x.date >= today);
  fs.writeFileSync(OUT, JSON.stringify([...others, ...out].sort((a, b) => a.date.localeCompare(b.date))));
  console.log(`Celestyal: ${out.length} salidas de ${pr.itineraries.length} itinerarios (precios del ${pr.info || '?'}). Otras fuentes: ${others.length}.`);
}
main();
