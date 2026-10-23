// Ofertas: una página por salida (como los chollos de Happy Low Cost), nota del precio 0-100,
// precio real (tarifa + tasas + cuota de servicio) y páginas de ofertas por destino, puerto, mes y naviera.
import { SITE, esc, eur, fmt, slugify, cap, layout, shipCard, shareBar, leadForm, cj, tripBox, scoreBadge, ICON, forumBlock } from './lib.js';

// Coordenadas aproximadas de puertos frecuentes (solo para dibujar el mapa del itinerario)
const MORE_COORDS = [['Savona', 44.31, 8.48], ['Guadalupe', 16.24, -61.53], ['La Romana / Santo Domingo', 18.42, -68.96], ['Bari', 41.13, 16.87], ['San Cristóbal', 17.3, -62.72], ['Lanzarote', 28.96, -13.55], ['Palermo', 38.13, 13.36], ['Tórtola', 18.42, -64.62], ['Atenas', 37.94, 23.64], ['Madeira', 32.64, -16.91], ['Fuerteventura', 28.5, -13.86], ['Cefalonia', 38.18, 20.49], ['Nueva York', 40.77, -74.0], ['Santo Domingo', 18.47, -69.88], ['Corfú', 39.62, 19.92], ['Tánger', 35.79, -5.81], ['Martinica', 14.6, -61.07], ['San Martín', 18.02, -63.05], ['Port Everglades', 26.09, -80.12], ['Río de Janeiro', -22.89, -43.18], ['Creta', 35.34, 25.13], ['Azores', 37.74, -25.66], ['Antigua', 17.12, -61.85], ['Saint-Tropez', 43.27, 6.64], ['Ibiza', 38.91, 1.44], ['Túnez', 36.82, 10.31], ['Barbados', 13.1, -59.62], ['Cagliari', 39.21, 9.11], ['Split', 43.5, 16.44], ['Taormina', 37.85, 15.29], ['Catania', 37.5, 15.09], ['La Valeta', 35.9, 14.51], ['Hamburgo', 53.54, 9.97], ['Santa Lucia', 14.01, -61.0], ['Zadar', 44.12, 15.23], ['Gibraltar', 36.14, -5.35], ['Costa Amalfitana', 40.63, 14.6], ['Florencia', 43.55, 10.3], ['Santa Cruz de la Palma', 28.68, -17.76], ['El Havre', 49.49, 0.11], ['Agadir', 30.42, -9.62], ['Trieste', 45.65, 13.76], ['Córcega', 41.92, 8.74], ['Rodas', 36.45, 28.23], ['Zakynthos', 37.78, 20.9], ['Taranto', 40.47, 17.23], ['Montevideo', -34.9, -56.21], ['Salvador', -12.97, -38.51], ['Colón', 9.36, -79.9], ['Cabo Rojo', 17.95, -71.65], ['Arroyo Barril (Samaná)', 19.2, -69.43], ['Half Moon Cay', 24.58, -75.95], ['Gran Turca', 21.46, -71.14], ['Londres', 51.5, -0.12]];
const EXTRA_DEST = { 'vuelta-al-mundo': 'Vuelta al mundo', sudamerica: 'Sudamérica', especiales: 'Cruceros especiales' };
const CABIN = { interior: 'Camarote interior', exterior: 'Camarote exterior', balcon: 'Camarote con balcón', suite: 'Suite' };
const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const fdate = (d, o = { day: 'numeric', month: 'long', year: 'numeric' }) => new Date(d + 'T12:00:00').toLocaleDateString('es-ES', o);
const bucket = (n) => (n <= 4 ? 'mini' : n <= 8 ? 'semana' : n <= 14 ? 'dos' : 'larga');

export function makeOffers({ sailings, bySlug, LINES, DESTINATIONS, forWhom, allPorts, BUILD_DATE, PORT_COORDS = [], portPhotos = {} }) {
  // Coordenadas de los puertos conocidos para dibujar el mapa del itinerario
  const coord = Object.fromEntries([...PORT_COORDS, ...MORE_COORDS].map(([n, a, b]) => [n.split(' (')[0].toLowerCase(), [a, b]]));
  for (const x of sailings) for (const p of x.itinerary?.ports || []) { const c = coord[p.name.split(' (')[0].toLowerCase()] || coord[p.name.toLowerCase()]; if (c && !p.lat) { p.lat = c[0]; p.lon = c[1]; } }
  const destName = (slug, x) => DESTINATIONS.find((d) => d.slug === slug)?.name || EXTRA_DEST[slug] || x?.dest_name || 'Crucero';
  const minPrice = (x) => Math.min(...Object.values(x.prices || {}).filter((v) => v > 0));
  const cabinOf = (x) => Object.keys(x.prices || {}).find((k) => x.prices[k] === minPrice(x)) || 'interior';
  const real = (x) => {
    const p = minPrice(x), tasas = x.port_charges || 0, svc = x.service_included ? 0 : Math.round((x.service_night || 0) * x.nights);
    return { tarifa: p, tasas, svc, total: p + tasas + svc };
  };
  const ppn = (x) => Math.round(real(x).total / x.nights);
  // Nota del precio: precio real por noche frente a cruceros parecidos (mismo destino y duración, salidas a ±60 días),
  // más el descuento sobre el precio de catálogo y si está en su mínimo histórico.
  const peersOf = (x) => {
    const t = new Date(x.date).getTime();
    let peers = sailings.filter((o) => o.destination === x.destination && bucket(o.nights) === bucket(x.nights) && Math.abs(new Date(o.date).getTime() - t) <= 60 * 864e5);
    if (peers.length < 6) peers = sailings.filter((o) => o.destination === x.destination && bucket(o.nights) === bucket(x.nights));
    if (peers.length < 6) peers = sailings.filter((o) => bucket(o.nights) === bucket(x.nights));
    return peers;
  };
  const cache = new Map();
  const deal = (x) => {
    if (cache.has(x.id)) return cache.get(x.id);
    const peers = peersOf(x), v = ppn(x);
    const vals = peers.map(ppn).sort((a, b) => a - b);
    const below = vals.filter((p) => p > v).length, pct = vals.length > 1 ? below / (vals.length - 1) : 0.5;
    const median = vals[Math.floor(vals.length / 2)] || v;
    const disc = x.base_price ? Math.round((1 - minPrice(x) / x.base_price) * 100) : 0;
    const hist = x.history || [];
    const atMin = hist.length > 1 && minPrice(x) <= Math.min(...hist.map((h) => h.price));
    const drop = hist.length > 1 ? Math.round((1 - minPrice(x) / Math.max(...hist.map((h) => h.price))) * 100) : 0;
    let score = Math.round(Math.min(100, pct * 75 + Math.min(15, Math.max(0, disc) * 0.4) + (atMin ? 10 : 0) + (drop >= 5 ? 5 : 0)));
    const vsMedian = Math.round((1 - v / median) * 100);
    const label = score >= 85 ? 'Chollo' : score >= 70 ? 'Buen precio' : score >= 45 ? 'Precio normal' : 'Caro para lo que es';
    const anomaly = vals.length >= 6 && v < median * 0.5;
    // ¿Reservar ya o esperar? Reglas simples y explicadas con el histórico y los días que faltan
    const days = Math.round((new Date(x.date) - new Date()) / 864e5);
    const verdict = anomaly ? ['ya', 'Precio anormalmente bajo frente a cruceros parecidos: si te encaja, confírmalo cuanto antes (puede ser un error o una promo flash).']
      : atMin && score >= 70 ? ['ya', 'Está en su mínimo desde que lo seguimos y por debajo de cruceros parecidos: buen momento para reservar.']
      : days <= 45 ? ['ya', 'Falta poco para la salida: a estas alturas los precios suelen moverse poco y quedan menos camarotes.']
      : score < 45 && days > 120 ? ['espera', 'Es caro frente a cruceros parecidos y queda margen: crea una alerta y espera una bajada o una promo.']
      : ['alerta', 'Precio razonable. Si no tienes prisa, crea una alerta: te avisamos si baja.'];
    const r = { score, label, vsMedian, median, peers: peers.length, disc, atMin, drop, anomaly, verdict, days };
    cache.set(x.id, r); return r;
  };
  // Dos notas distintas: la del precio (esta salida frente a otras parecidas) y la del barco (MejorCrucero Score)
  const shipNoteLine = (s, d) => {
    const parts = s.score?.parts || [];
    const weak = [...parts].sort((a, b) => a.pts / a.max - b.pts / b.max)[0];
    const strong = [...parts].sort((a, b) => b.pts / b.max - a.pts / a.max)[0];
    const what = d.score >= 70 && s.sc < 50 ? 'Buen precio para un barco con nota baja' : d.score < 45 && s.sc >= 75 ? 'Barco muy bien valorado, pero el precio no es de oferta' : 'Son dos notas distintas';
    return `<b>${what}:</b> la nota del precio (${d.score}/100) compara esta salida con cruceros parecidos; la del barco (<a href="/barcos/${s.slug}/#nota">${s.sc}/100</a>) mide el barco${weak && strong && weak !== strong ? `: flojo en ${esc(weak.label.toLowerCase())}, mejor en ${esc(strong.label.toLowerCase())}` : ''}.`;
  };
  const dcls = (n) => (n >= 85 ? 'sc-a' : n >= 70 ? 'sc-b' : n >= 45 ? 'sc-c' : 'sc-e');
  const url = (x) => `/salidas/${x.id}/`;
  const shipName = (x) => bySlug[x.ship]?.name || x.ship_name || x.ship;
  const titleOf = (x) => `Crucero ${destName(x.destination, x)} de ${x.nights} noches desde ${x.depart_port} en el ${shipName(x)}`;
  // Itinerario normalizado: un registro por día (los días que la naviera no lista son de navegación),
  // sin "Navegación" en días que ya tienen escala y con los puertos de varios días seguidos fusionados ("Cabo Norte · días 6-7").
  const isSea = (n) => /navegaci/i.test(n);
  const dayCache = new Map();
  const daysOf = (x) => {
    if (dayCache.has(x.id)) return dayCache.get(x.id);
    const raw = x.itinerary?.ports || [];
    const last = Math.max(x.nights + 1, ...raw.map((p) => p.day || 1));
    const byDay = {};
    for (const p of raw) { const d = p.day || 1; (byDay[d] = byDay[d] || []); if (!isSea(p.name) && !byDay[d].some((q) => q.name === p.name)) byDay[d].push(p); }
    const out = [];
    for (let d = 1; d <= last; d++) {
      const l = byDay[d] || [];
      if (!l.length) { const prev = out[out.length - 1]; if (prev && prev.sea) prev.to = d; else out.push({ day: d, to: d, name: 'Navegación', sea: true }); continue; }
      for (const p of l) { const prev = out[out.length - 1]; if (prev && !prev.sea && prev.name === p.name && prev.to === d - 1) prev.to = d; else out.push({ ...p, day: d, to: d, sea: false }); }
    }
    dayCache.set(x.id, out); return out;
  };
  const dayLabel = (e) => (e.to > e.day ? `Días ${e.day}-${e.to}` : `Día ${e.day}`);
  const seaCount = (x) => daysOf(x).filter((e) => e.sea).reduce((a, e) => a + e.to - e.day + 1, 0);
  const portsOf = (x) => daysOf(x).filter((e) => !e.sea);
  const photoOf = (x) => bySlug[x.ship]?.photo || null;
  // Resumen único por oferta, escrito solo con los datos de la propia salida (nada inventado)
  const SEASON = ['invierno', 'invierno', 'primavera', 'primavera', 'primavera', 'verano', 'verano', 'verano', 'otoño', 'otoño', 'otoño', 'invierno'];
  function summary(x, { s, d, r, stops, seaDays, dn, sn }) {
    const h = [...x.id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
    const pick = (arr) => arr[h % arr.length];
    const m = new Date(x.date + 'T12:00:00').getMonth();
    const names = [...new Set(stops.map((p) => p.name).filter((n) => n !== x.depart_port))];
    const top = names.slice(0, 3);
    const list = top.length > 1 ? `${top.slice(0, -1).join(', ')} y ${top[top.length - 1]}` : top[0] || '';
    const parts = [];
    parts.push(pick([`Crucero de ${x.nights} noches por ${dn} que sale de ${x.depart_port} en ${SEASON[m]}`, `${cap(dn)} en ${x.nights} noches, con salida desde ${x.depart_port} en ${MES[m]}`, `Salida de ${MES[m]} desde ${x.depart_port}: ${x.nights} noches por ${dn}`]) + (list ? `, con escalas en ${list}${names.length > 3 ? ` y ${names.length - 3} puerto${names.length - 3 > 1 ? 's' : ''} más` : ''}.` : '.'));
    if (seaDays) parts.push(seaDays >= Math.ceil(x.nights / 3) ? `Tiene ${seaDays} días de navegación, así que el barco pesa mucho en el viaje.` : `Solo ${seaDays} día${seaDays > 1 ? 's' : ''} de navegación: casi cada día hay escala.`);
    if (s) { const age = new Date().getFullYear() - s.year; parts.push(`El ${sn} ${age <= 3 ? `es un barco reciente (${s.year})` : `navega desde ${s.year}`}${s.sc != null ? ` y tiene una nota MejorCrucero de ${s.sc}/100` : ''}.`); }
    parts.push(d.vsMedian >= 10 ? `Su precio real por noche (${eur(ppn(x))}) está un ${d.vsMedian}% por debajo de la media de cruceros parecidos.` : d.vsMedian <= -10 ? `Su precio real por noche (${eur(ppn(x))}) está un ${-d.vsMedian}% por encima de la media de cruceros parecidos.` : `Su precio real por noche (${eur(ppn(x))}) está en la media de cruceros parecidos.`);
    if (x.allinc && x.allinc - r.tarifa > 0) parts.push(`Con bebidas incluidas cuesta ${eur(x.allinc - r.tarifa)} más por persona.`);
    return parts.join(' ');
  }

  function card(x) {
    const s = bySlug[x.ship], d = deal(x), r = real(x), ph = photoOf(x);
    return `<a class="card sail-card offer-card" href="${url(x)}">${ph ? `<div class="ship-art has-photo"><img src="${esc(ph.thumb)}" alt="${esc(shipName(x))}" loading="lazy" decoding="async" width="640" height="${Math.round(640 / (ph.ratio || 1.6))}" class="ship-photo"><span class="scb ${dcls(d.score)}" title="Nota del precio ${d.score}/100"><b>${d.score}</b></span></div>` : ''}<div class="card-body"><span class="eyebrow">${esc(s?.lineShort || '')} · ${esc(shipName(x))}</span><h3>${esc(destName(x.destination, x))} · ${x.nights} noches</h3>
    <p class="muted small">${fdate(x.date, { day: 'numeric', month: 'short', year: 'numeric' })} · desde ${esc(x.depart_port)}${sameCount(x) ? ` · <span class="more-d">+${sameCount(x)} fecha${sameCount(x) > 1 ? 's' : ''}</span>` : ''}</p>
    <p class="muted small ports-line">${esc(portsOf(x).slice(1, 5).map((p) => p.name).join(' · '))}${portsOf(x).length > 5 ? ` <span class="more-p">+${portsOf(x).length - 5}</span>` : ''}</p>
    <p class="card-tags">${s?.sc != null ? `<span class="t-ship" title="Nota del barco (MejorCrucero Score)">Barco ${s.sc}/100</span>` : ''}${fromSpain(x) ? '<span class="t-noplane" title="Sale de un puerto español">Sin avión desde España</span>' : ''}${seaCount(x) ? `<span>${seaCount(x)} día${seaCount(x) > 1 ? 's' : ''} de mar</span>` : ''}</p>
    <p class="price">desde <b>${eur(r.tarifa)}</b> <span class="muted small">p.p. · real ${eur(r.total)}</span>${d.disc >= 10 ? ` <span class="badge-drop">−${d.disc}%</span>` : ''}<span class="ppn-v"><b>${eur(ppn(x))}</b> por noche</span></p>${lowAvail(x) ? '<p class="low-av">Quedan pocas plazas, según la naviera</p>' : ''}
    <p class="deal-l ${dcls(d.score)}-t">${esc(d.label)}${d.anomaly ? ' · ⚡ precio anómalo' : ''}${d.drop >= 3 ? ` · 📉 bajó ${d.drop}%` : ''}${spark(x.history || [])}</p>${x.updated ? `<p class="checked muted small">Precio comprobado el ${fdate(x.updated.slice(0, 10), { day: 'numeric', month: 'short' })}</p>` : ''}</div></a>`;
  }

  // Solo si la propia naviera marca la salida con disponibilidad baja (Costa: availabilityStatus distinto de GREEN)
  const itinKey = (x) => x.ship + '|' + (x.itinerary?.name || '') + '|' + x.nights;
  const itinCount = {}; for (const x of sailings) itinCount[itinKey(x)] = (itinCount[itinKey(x)] || 0) + 1;
  const sameCount = (x) => itinCount[itinKey(x)] - 1;
  const ABROAD = ['buenos-aires', 'miami', 'fort-lauderdale', 'port-canaveral', 'san-juan'];
  const fromSpain = (x) => !!x.depart_port_slug && !ABROAD.includes(x.depart_port_slug);
  const lowAvail = (x) => x.availability && !/^green$/i.test(x.availability);
  function spark(h) {
    if (h.length < 3) return '';
    const min = Math.min(...h.map((z) => z.price)), max = Math.max(...h.map((z) => z.price));
    const pts = h.map((z, i) => `${Math.round((i / (h.length - 1)) * 60)},${Math.round(14 - ((z.price - min) / (max - min || 1)) * 12)}`).join(' ');
    return ` <svg class="spark" viewBox="0 0 60 16" width="60" height="16" aria-hidden="true"><polyline fill="none" stroke="currentColor" stroke-width="1.5" points="${pts}"/></svg>`;
  }
  function chart(hist) {
    if (hist.length < 2) return '';
    const W = 600, H = 160, min = Math.min(...hist.map((h) => h.price)), max = Math.max(...hist.map((h) => h.price));
    const pts = hist.map((h, i) => [20 + (i / (hist.length - 1)) * (W - 40), H - 20 - ((h.price - min) / (max - min || 1)) * (H - 40)]);
    return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Histórico de precio"><polyline fill="none" stroke="currentColor" stroke-width="3" points="${pts.map((p) => p.join(',')).join(' ')}"/>${pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="4"><title>${hist[i].date}: ${eur(hist[i].price)}</title></circle>`).join('')}<text x="20" y="14" class="ct">${eur(max)}</text><text x="20" y="${H - 4}" class="ct">${eur(min)}</text></svg>`;
  }

  function page(x) {
    const s = bySlug[x.ship], L = s ? LINES[s.line] : null, d = deal(x), r = real(x), ph = photoOf(x);
    const ports = daysOf(x), stops = portsOf(x), seaDays = seaCount(x);
    const dn = destName(x.destination, x), sn = shipName(x);
    const hist = x.history || [];
    const sameItin = sailings.filter((o) => o.ship === x.ship && o.id !== x.id && o.itinerary?.name === x.itinerary?.name).slice(0, 24);
    const similar = sailings.filter((o) => o.id !== x.id && o.destination === x.destination && Math.abs(new Date(o.date) - new Date(x.date)) <= 75 * 864e5).sort((a, b) => deal(b).score - deal(a).score).slice(0, 6);
    const official = (x.sources || []).find((z) => z.official) || (x.sources || [])[0];
    const portSlug = (n) => allPorts.find((p) => p.name === n || p.name.startsWith(n))?.slug;
    const fw = s ? forWhom(s) : { yes: [], no: [] };
    const title = `${titleOf(x)} · ${fdate(x.date, { day: 'numeric', month: 'short', year: 'numeric' })} desde ${eur(r.tarifa)}`;
    const faqs = [
      ['¿Qué incluye el precio?', `El precio desde ${eur(r.tarifa)} por persona es la tarifa de la web oficial de ${L?.short || 'la naviera'} para un ${CABIN[cabinOf(x)].toLowerCase()} en ocupación doble. ${x.port_charges ? `Las tasas portuarias (${eur(x.port_charges)} por adulto) se pagan aparte. ` : ''}${x.service_included ? 'La cuota de servicio está incluida en esta tarifa.' : x.service_night ? `La cuota de servicio (${String(x.service_night).replace('.', ',')} € por adulto y noche) no está incluida.` : ''} Bebidas, excursiones y restaurantes de pago van aparte salvo que elijas un paquete.`],
      ['¿Cuánto cuesta en total para dos personas?', `Unos ${eur(r.total * 2)} para dos adultos (tarifa + tasas${r.svc ? ' + cuota de servicio' : ''}), sin vuelos ni extras. Calcula tu caso en la calculadora de precio real.`],
      ...(x.allinc ? [['¿Hay opción con bebidas incluidas?', `Sí: la tarifa "todo incluido" con paquete de bebidas sale desde ${eur(x.allinc)} por persona en esta salida.`]] : []),
      ['¿Qué documentación necesito?', x.documents?.length ? `Según la naviera, para este itinerario: ${x.documents.join(' o ')}. Comprueba siempre los requisitos de cada país que visitas.` : 'Depende de los países que visites: consulta nuestra guía de documentación.'],
      ['¿Por qué tiene esta nota de oferta?', `Porque el precio real por noche (${eur(ppn(x))}) está ${d.vsMedian >= 0 ? `un ${d.vsMedian}% por debajo` : `un ${-d.vsMedian}% por encima`} de la media de ${d.peers} cruceros parecidos (mismo destino y duración)${d.disc >= 5 ? `, tiene un ${d.disc}% de descuento sobre el precio de catálogo` : ''}${d.atMin ? ' y está en su precio más bajo registrado' : ''}.`],
    ];
    const body = `<article class="offer">
<section class="ship-hero offer-hero" style="--c:${s?.color || '#0b2540'}"><div class="wrap ship-hero-in">
  <div>
    <a class="eyebrow eyebrow-l" href="/ofertas/${x.destination || ''}/">${esc(dn)} · Oferta de crucero</a>
    <h1>${esc(dn)}: ${x.nights} noches en el ${esc(sn)} desde ${esc(x.depart_port)}</h1>
    <a class="hero-score" href="#nota-oferta"><span class="scb scb-big ${dcls(d.score)}"><b>${d.score}</b><small>/100</small></span><span><b>${esc(d.label)}</b><small>Nota del precio</small></span></a>
    ${s?.sc != null ? `<p class="two-scores small">${shipNoteLine(s, d)}</p>` : ''}
    <p class="match-box" data-slug="${x.ship}" hidden></p><p class="price-change" data-id="${x.id}" data-price="${r.tarifa}" hidden></p>
    ${d.anomaly ? '<p class="tip tip-hot">⚡ <b>Precio anormalmente bajo</b> frente a cruceros parecidos. Compruébalo en la web de la naviera cuanto antes.</p>' : ''}
    <p class="lead-p">${cap(fdate(x.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))} · ${stops.length - 2 > 0 ? `${stops.length - 2} escala${stops.length - 2 > 1 ? 's' : ''}` : 'sin escalas'}${seaDays ? ` · ${seaDays} día${seaDays > 1 ? 's' : ''} de navegación` : ''}${x.countries ? ` · ${esc(x.countries)}` : ''}</p>
    ${lowAvail(x) ? '<p class="low-av">Quedan pocas plazas en esta salida, según la naviera</p>' : ''}
    <p class="offer-sum">${esc(summary(x, { s, d, r, stops, seaDays, dn, sn }))}</p>
    <div class="stats"><div><b>${eur(r.tarifa)}</b><span>Desde, por persona</span></div><div><b>${eur(r.total)}</b><span>Precio real p.p.</span></div><div><b>${eur(ppn(x))}</b><span>Real por noche</span></div><div><b>${s?.sc ?? '—'}${s?.sc != null ? '<small>/100</small>' : ''}</b><span>Nota del barco</span></div></div>
    <div class="actions">${official ? `<a class="btn" href="${esc(official.url)}" target="_blank" rel="noopener" data-aff="${esc(official.partner)}" data-page="${url(x)}">Ver en ${esc(official.partner.replace(' (web oficial)', ''))} →</a>` : ''}<a class="btn btn-ghost" href="/herramientas/alerta-precio/?barco=${x.ship}&amp;fecha=${x.date}">🔔 Avísame si baja</a><button class="btn btn-ghost fav-inline js-save-offer" type="button" data-offer='${esc(JSON.stringify({ id: x.id, t: `${dn} · ${x.nights} noches · ${sn}`, d: x.date, p: r.tarifa }))}' aria-pressed="false">${ICON.heart} Guardar oferta</button></div>
  </div>
  <div class="ship-hero-art">${ph ? `<img src="${esc(ph.thumb)}"${ph.hi ? ` srcset="${esc(ph.thumb)} 640w, ${esc(ph.large)} 1280w" sizes="(max-width: 900px) 100vw, 560px"` : ''} alt="${esc(sn)}" width="640" height="${Math.round(640 / (ph.ratio || 1.6))}" fetchpriority="high" decoding="async" class="ship-photo">` : ''}</div>
</div></section>

<div class="wrap ship-grid"><div class="ship-main">
  <section class="block" id="precio"><h2>Precio real de este crucero</h2>
  <div class="table-wrap"><table class="spec"><tbody>
    <tr><th scope="row">Tarifa (${esc(CABIN[cabinOf(x)].toLowerCase())}, por persona)</th><td>${eur(r.tarifa)}${x.base_price ? ` <s class="muted">${eur(x.base_price)}</s> <span class="badge-drop">−${d.disc}%</span>` : ''}</td></tr>
    <tr><th scope="row">Tasas portuarias</th><td>${x.port_charges ? eur(x.port_charges) : 'Consultar'}</td></tr>
    <tr><th scope="row">Cuota de servicio (${x.nights} noches)</th><td>${x.service_included ? 'Incluida' : r.svc ? eur(r.svc) : 'Consultar'}</td></tr>
    <tr class="tot"><th scope="row">Precio real por persona</th><td><b>${eur(r.total)}</b></td></tr>
    <tr><th scope="row">Para dos personas</th><td><b>${eur(r.total * 2)}</b></td></tr>
    ${x.allinc ? `<tr><th scope="row">Opción "todo incluido" (con bebidas)</th><td>desde ${eur(x.allinc)} p.p.</td></tr>` : ''}
  </tbody></table></div>
  ${x.offers?.length ? `<p class="small">Promociones activas: ${x.offers.map(esc).join(' · ')}</p>` : ''}
  <p class="muted small">✔️ Precio de la web oficial de ${esc(L?.short || 'la naviera')} comprobado el <time datetime="${x.updated || BUILD_DATE}">${fdate((x.updated || BUILD_DATE).slice(0, 10))}${x.updated ? ` a las ${new Date(x.updated).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' })}` : ''}</time> (hora de España). Los precios cambian: confírmalo antes de reservar.</p></section>

  <section class="block" id="nota-oferta"><h2>Nota del precio: ${d.score}/100 · ${esc(d.label)}</h2><p class="muted small">Mide si esta salida está barata frente a cruceros parecidos. No valora el barco: para eso está la nota del barco${s?.sc != null ? ` (${s.sc}/100)` : ''}.</p>
  <ul class="bars"><li><span class="bar-l">Frente a cruceros parecidos</span><span class="bar"><i style="width:${Math.max(4, Math.min(100, 50 + d.vsMedian))}%"></i></span><b>${d.vsMedian >= 0 ? '−' : '+'}${Math.abs(d.vsMedian)}%</b><small>Media de ${d.peers} cruceros de ${esc(dn)} de duración parecida: ${eur(d.median)} reales por noche; este, ${eur(ppn(x))}.</small></li>
  ${d.disc ? `<li><span class="bar-l">Descuento de la naviera</span><span class="bar"><i style="width:${Math.min(100, d.disc * 2)}%"></i></span><b>−${d.disc}%</b><small>Sobre el precio de catálogo.</small></li>` : ''}
  <li><span class="bar-l">Histórico</span><span class="bar"><i style="width:${d.atMin ? 100 : 40}%"></i></span><b>${d.atMin ? 'Mínimo' : hist.length > 1 ? 'Ha estado más barato' : 'Nuevo'}</b><small>${hist.length > 1 ? `Seguimos este precio desde el ${fdate(hist[0].date)}.` : 'Empezamos a seguir este precio hoy: crea una alerta y te avisamos si baja.'}</small></li></ul>
  ${chart(hist)}
  <div class="verdict verdict-${d.verdict[0]}"><b>${d.verdict[0] === 'ya' ? '✅ Reservar ya' : d.verdict[0] === 'espera' ? '⏳ Mejor esperar' : '🔔 Vigila el precio'}</b><p>${esc(d.verdict[1])}</p></div>
  <p class="small"><a href="/metodologia/#ofertas">Cómo calculamos la nota del precio</a></p></section>

  <section class="block" id="itinerario"><h2>Itinerario día a día</h2><ol class="itin">${ports.map((p) => { const ps = !p.sea && portSlug(p.name); return `<li${p.sea ? ' class="sea"' : ''}><b>${dayLabel(p)}</b> ${ps ? `<a href="/puertos/${ps}/">${esc(p.name)}</a>` : esc(p.sea ? '🌊 Navegación' : p.name)}${p.to > p.day && !p.sea ? ` <span class="muted small">(${p.to - p.day + 1} días)</span>` : ''}${p.sea ? '' : ` <a class="small" href="${cj('attr', null, 'itin-' + slugify(p.name))}" target="_blank" rel="sponsored noopener" data-aff="cj-attr">excursiones →</a>`}${p.lat ? ` · <a class="small" href="/herramientas/tiempo-puerto/?lat=${p.lat}&amp;lon=${p.lon}&amp;n=${encodeURIComponent(p.name)}">tiempo</a>` : ''}</li>`; }).join('')}</ol>
  <p class="muted small">Termina en ${esc(x.arrive_port || x.depart_port)}. Horarios exactos en la web de la naviera.</p>
  ${stops.length && stops.filter((p) => p.lat).length / stops.length >= 0.7 && stops.filter((p) => p.lat).length >= 2 ? `<div class="map" data-ports='${esc(JSON.stringify(ports.filter((p) => p.lat).map((p) => [p.lat, p.lon, p.name])))}'><button class="btn btn-ghost js-map" type="button">🗺️ Ver mapa del itinerario</button></div>` : ''}</section>

  ${(() => { const pp = [...new Set(stops.map((p) => p.name))].map((n) => [n, portPhotos[n]]).filter(([, v]) => v).slice(0, 6); return pp.length >= 2 ? `<section class="block"><h2>Lo que vas a ver</h2><div class="port-strip">${pp.map(([n, v]) => `<figure><img src="${v.thumb}" alt="${esc(n)}" loading="lazy" decoding="async" width="640" height="${Math.round(640 / (v.ratio || 1.5))}"><figcaption><b>${esc(n)}</b><small>Foto: <a href="${esc(v.page)}" target="_blank" rel="noopener">${esc(v.author)}</a> · ${esc(v.license)}</small></figcaption></figure>`).join('')}</div></section>` : ''; })()}
  ${s ? `<section class="block"><h2>El barco: ${esc(sn)}</h2><div class="score-top">${s.sc != null ? scoreBadge(s.sc, true) : ''}<p>${esc(s.lineShort)} · en servicio desde ${s.year} · ${fmt(s.gt)} GT${s.pax ? ` · ${fmt(s.pax)} pasajeros` : ''}. ${s.sc != null ? `Nota MejorCrucero ${s.sc}/100.` : ''} <a href="/barcos/${s.slug}/">Ficha completa, vídeos y opiniones →</a></p></div>
  ${fw.yes.length ? `<div class="fw"><div><h3 class="h-sm">👍 Ideal para</h3><ul>${fw.yes.map((t) => `<li>${esc(cap(t))}</li>`).join('')}</ul></div>${fw.no.length ? `<div><h3 class="h-sm">👎 Mejor no si…</h3><ul>${fw.no.map((t) => `<li>${esc(cap(t))}</li>`).join('')}</ul></div>` : ''}</div>` : ''}</section>` : ''}

  ${tripBox(x.depart_port.split(' (')[0], { date: x.date, sid: 'oferta-' + x.id, title: `Llega a ${x.depart_port} sin estrés` })}

  <section class="block offer-tools"><h2>Prepara el viaje</h2><div class="chips">
    <a class="chip" href="/herramientas/cuenta-atras/?barco=${encodeURIComponent(sn)}&amp;fecha=${x.date}&amp;puerto=${encodeURIComponent(x.depart_port)}">⏳ Cuenta atrás</a>
    <a class="chip" href="/herramientas/checklist/?${[(x.documents || []).some((z) => /pasaporte/i.test(z)) ? 'nonEU=1' : '', ['caribe', 'canarias-y-madeira'].includes(x.destination) || [5, 6, 7, 8, 9].includes(new Date(x.date).getMonth()) ? 'hot=1' : '', ['fiordos-noruegos', 'capitales-balticas'].includes(x.destination) ? 'cold=1' : ''].filter(Boolean).join('&amp;')}">✅ Checklist de este viaje</a>
    <a class="chip" href="/herramientas/presupuesto-compartido/">🧮 Dividir gastos</a>
    <button class="chip js-cmp-offer" type="button" data-id="${x.id}">⚖️ Comparar con otra oferta</button>
    <button class="chip js-offer-img" type="button" data-t="${esc(`${dn} · ${x.nights} noches`)}" data-s="${esc(sn)}" data-d="${esc(fdate(x.date, { day: 'numeric', month: 'short', year: 'numeric' }))}" data-p="${esc(x.depart_port)}" data-pr="${r.tarifa}" data-sc="${d.score}" data-l="${esc(d.label)}">📸 Imagen para compartir</button>
    <button class="chip js-print" type="button">🖨️ Imprimir o PDF</button>
  </div><p class="muted small">¿Dudas con algún término (tasas, cuota de servicio, tender…)? <a href="/herramientas/glosario/">Glosario del crucerista</a>.</p></section>
  <section class="block"><h2>Compara antes de reservar</h2><p class="muted">El mismo crucero puede costar distinto en la naviera y en las agencias. Busca esta fecha y barco en:</p>
  <div class="partners">${[['Logitravel', 'https://www.logitravel.com/cruceros/'], ['Crucerosnet', 'https://www.crucerosnet.com/'], ['VayaCruceros', 'https://www.vayacruceros.com/']].map(([n, u]) => `<a class="partner" href="${u}" target="_blank" rel="noopener" data-aff="${slugify(n)}" data-page="${url(x)}"><b>${n}</b><span>${esc(sn)} · ${fdate(x.date, { day: 'numeric', month: 'short' })}</span><span class="go">Comparar →</span></a>`).join('')}</div></section>

  ${sameItin.length ? `<section class="block"><h2>Otras fechas de este itinerario</h2><div class="cal">${sameItin.concat([x]).sort((a, b) => a.date.localeCompare(b.date)).map((o) => `<a href="${url(o)}" class="cal-d${o.id === x.id ? ' on' : ''}"><b>${fdate(o.date, { day: 'numeric', month: 'short' })}</b><span>${eur(minPrice(o))}</span></a>`).join('')}</div></section>` : ''}

  <section class="block faq"><h2>Preguntas frecuentes</h2>${faqs.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</section>
  ${forumBlock(`salida:${x.ship}:${x.date}`, `¿Vas en esta salida? Habla con otros pasajeros`, { tabs: [['question', 'Preguntas'], ['comment', 'Comentarios'], ['excursion', 'Excursiones']] })}
</div>
<aside class="ship-side">
  <div class="side-card sticky-price"><p class="muted small">Desde, por persona</p><p class="big-num">${eur(r.tarifa)}</p><p class="small">Precio real ${eur(r.total)} · ${x.nights} noches</p>${official ? `<a class="btn btn-block" href="${esc(official.url)}" target="_blank" rel="noopener" data-aff="${esc(official.partner)}" data-page="${url(x)}">Ver disponibilidad →</a>` : ''}<a class="btn btn-ghost btn-block" href="/herramientas/precio-real/?linea=${s?.lineSlug || ''}&amp;precio=${r.tarifa}&amp;noches=${x.nights}">Calcular mi precio</a></div>
  <div class="side-card"><h2>Comparte esta oferta</h2>${shareBar(`${dn} ${x.nights} noches en el ${sn} desde ${eur(r.tarifa)}:`, url(x))}</div>
  ${similar.length ? `<div class="side-card"><h2>Ofertas parecidas</h2><ul class="mini">${similar.map((o) => `<li><a href="${url(o)}"><b>${esc(shipName(o))} · ${eur(minPrice(o))}</b><span>${fdate(o.date, { day: 'numeric', month: 'short' })} · ${o.nights} noches · nota ${deal(o).score}</span></a></li>`).join('')}</ul></div>` : ''}
  <div class="side-card"><h2>¿No te convence?</h2><ul class="mini"><li><a href="/ofertas/${x.destination || ''}/"><b>Más ofertas de ${esc(dn)}</b><span>Ordenadas por nota</span></a></li>${x.depart_port_slug ? `<li><a href="/ofertas/desde-${x.depart_port_slug}/"><b>Cruceros desde ${esc(x.depart_port)}</b><span>Todas las fechas</span></a></li>` : ''}<li><a href="/ofertas/${MES[new Date(x.date).getMonth()]}-${x.date.slice(0, 4)}/"><b>Cruceros en ${MES[new Date(x.date).getMonth()]}</b><span>Todas las navieras</span></a></li></ul></div>
</aside></div>
<div class="m-cta"><div><b>${eur(r.tarifa)}</b><small>real ${eur(r.total)} p.p.</small></div>${official ? `<a class="btn btn-sm" href="${esc(official.url)}" target="_blank" rel="noopener" data-aff="${esc(official.partner)}" data-page="${url(x)}">Ver disponibilidad</a>` : ''}</div></article>`;
    return layout({
      title, desc: `${x.nights} noches desde ${x.depart_port} el ${fdate(x.date)} en el ${sn}: ${stops.slice(1, 6).map((p) => p.name).join(', ')}. Desde ${eur(r.tarifa)} (precio real ${eur(r.total)} con tasas). Nota del precio ${d.score}/100.`,
      url: url(x), body, ogType: 'product', og: ph ? `/og/${x.ship}.png` : '/og.png', preload: ph ? ph.thumb : null,
      crumbs: [['Inicio', '/'], ['Ofertas', '/ofertas/'], [dn, `/ofertas/${x.destination || ''}/`], [`${sn} ${x.date}`, url(x)]],
      schema: [
        { '@context': 'https://schema.org', '@type': 'Product', name: `${titleOf(x)} (${x.date})`, brand: { '@type': 'Brand', name: L?.short || '' }, image: ph ? SITE + ph.thumb : undefined, description: `${x.nights} noches: ${stops.map((p) => p.name).join(', ')}`,
          offers: { '@type': 'Offer', price: r.tarifa, priceCurrency: 'EUR', availability: 'https://schema.org/InStock', url: official?.url, validFrom: (x.updated || BUILD_DATE).slice(0, 10), seller: { '@type': 'Organization', name: official?.partner || L?.short } } },
        { '@context': 'https://schema.org', '@type': 'Trip', name: titleOf(x), departureTime: x.date, itinerary: { '@type': 'ItemList', itemListElement: stops.map((p, i) => ({ '@type': 'ListItem', position: i + 1, item: { '@type': 'Place', name: p.name, ...(p.lat ? { geo: { '@type': 'GeoCoordinates', latitude: p.lat, longitude: p.lon } } : {}) } })) }, offers: { '@type': 'Offer', price: r.tarifa, priceCurrency: 'EUR', url: SITE + url(x) } },
        { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
      ],
    });
  }

  // Páginas de listado: destino, puerto, mes, naviera y las mejores (por nota)
  function monthTable(list) {
    const by = {}; for (const x of list) { const k = x.date.slice(0, 7); (by[k] = by[k] || []).push(x); }
    const rows = Object.entries(by).sort().map(([k, l]) => { const v = l.map(ppn).sort((a, b) => a - b); return [k, l.length, v[Math.floor(v.length / 2)], Math.min(...l.map(minPrice))]; });
    return rows.length > 1 ? `<h2>Precio por mes</h2><div class="table-wrap"><table class="rank-t sortable"><thead><tr><th>Mes</th><th>Salidas</th><th>Precio real medio por noche</th><th>Desde</th></tr></thead><tbody>${rows.map(([k, n, med, min]) => `<tr><td>${cap(MES[+k.slice(5) - 1])} ${k.slice(0, 4)}</td><td>${n}</td><td data-v="${med}">${eur(med)}</td><td data-v="${min}">${eur(min)}</td></tr>`).join('')}</tbody></table></div><p class="muted small">Mediana del precio real por persona y noche (tasas y cuota incluidas).</p>` : '';
  }
  function hubFaq(list, what) {
    if (!list.length) return '';
    const cheap = [...list].sort((a, b) => minPrice(a) - minPrice(b))[0];
    const nights = list.map((x) => x.nights).sort((a, b) => a - b); const medN = nights[Math.floor(nights.length / 2)];
    const ports = {}; list.forEach((x) => { ports[x.depart_port] = (ports[x.depart_port] || 0) + 1; });
    const topP = Object.entries(ports).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([p]) => p);
    const qa = [[`¿Cuál es el crucero más barato${what ? ' ' + what : ''}?`, `Ahora mismo, el ${shipName(cheap)} del ${fdate(cheap.date)} (${cheap.nights} noches desde ${cheap.depart_port}) desde ${eur(minPrice(cheap))} por persona; con tasas y cuota, unos ${eur(real(cheap).total)}.`],
      [`¿Cuántas noches suelen durar${what ? ' los cruceros ' + what : ''}?`, `La duración más habitual entre las ${list.length} salidas es de ${medN} noches.`],
      [`¿Desde qué puertos salen?`, `Sobre todo desde ${topP.join(', ')}.`]];
    return `<section class="wrap block faq"><h2>Preguntas frecuentes</h2>${qa.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</section>`;
  }
  const lineOpts = (list) => { const l = [...new Set(list.map((x) => x.line).filter(Boolean))]; return l.length > 1 ? `<label><span>Naviera</span><select name="nv"><option value="">Todas</option>${l.map((k) => `<option value="${esc(k)}">${esc(Object.values(LINES).find((z) => z.slug === k)?.short || k)}</option>`).join('')}</select></label>` : ''; };
  const shipOpts = (list) => { const l = [...new Set(list.map((x) => x.ship))].sort((a, b) => shipName({ ship: a }).localeCompare(shipName({ ship: b }))); return l.length > 1 ? `<label><span>Barco</span><select name="sh"><option value="">Todos</option>${l.map((k) => `<option value="${esc(k)}">${esc(shipName({ ship: k }))}</option>`).join('')}</select></label>` : ''; };
  // Resumen del listado (rango, mediana, navieras y barcos) y leyenda de las etiquetas de precio
  function hubSummary(list) {
    const pr = list.map(minPrice).sort((a, b) => a - b), pp = list.map(ppn).sort((a, b) => a - b);
    const nl = new Set(list.map((x) => x.line)).size, ns = new Set(list.map((x) => x.ship)).size;
    const ch = list.filter((x) => deal(x).score >= 85).length;
    return `<div class="hub-sum"><div><b>${list.length}</b><span>salidas</span></div><div><b>${eur(pr[0])}–${eur(pr[pr.length - 1])}</b><span>rango por persona</span></div><div><b>${eur(pp[Math.floor(pp.length / 2)])}</b><span>mediana real por noche</span></div><div><b>${ns}</b><span>barco${ns > 1 ? 's' : ''} de ${nl} naviera${nl > 1 ? 's' : ''}</span></div><div><b>${ch}</b><span>chollo${ch === 1 ? '' : 's'} (85+)</span></div></div>
    <details class="legend small"><summary>¿Qué significan las etiquetas?</summary><ul><li><span class="sc-a-t">Chollo</span>: nota del precio de 85 o más, mucho más barato que cruceros parecidos.</li><li><span class="sc-b-t">Buen precio</span>: de 70 a 84.</li><li><span class="sc-c-t">Precio normal</span>: de 45 a 69, en la media.</li><li><span class="sc-e-t">Caro para lo que es</span>: menos de 45.</li><li><b>Barco N/100</b>: nota del barco (higiene, espacio, tripulación, modernidad y opiniones). <a href="/metodologia/">Metodología</a>.</li></ul></details>`;
  }
  // Tarjeta con los datos para filtrar en el navegador; el listado pinta 48 y el resto llega de /data/cards.json
  const cardFull = (x) => card(x).replace('<a class="card sail-card offer-card"', `<a data-score="${deal(x).score}" data-price="${minPrice(x)}" data-real="${real(x).total}" data-ppn="${ppn(x)}" data-date="${x.date}" data-m="${x.date.slice(0, 7)}" data-n="${bucket(x.nights)}" data-nights="${x.nights}" data-q="${esc([destName(x.destination, x), shipName(x), x.depart_port, ...portsOf(x).map((q) => q.name), x.countries, MES[new Date(x.date).getMonth()]].join(' ').toLowerCase())}" data-es="${fromSpain(x) ? 1 : 0}" data-line="${esc(x.line || '')}" data-ship="${esc(x.ship)}" data-ssc="${bySlug[x.ship]?.sc ?? 0}" data-drop="${deal(x).drop}" data-id="${x.id}" class="card sail-card offer-card"`);
  function hub({ url: u, title, h1, intro, list, crumbs, sortBy = 'score', extra = '', what = '', after = '' }) {
    const sorted = [...list].sort(sortBy === 'date' ? (a, b) => a.date.localeCompare(b.date) : (a, b) => deal(b).score - deal(a).score || minPrice(a) - minPrice(b));
    const cheapest = [...list].sort((a, b) => minPrice(a) - minPrice(b))[0];
    const body = `<section class="wrap block page-h"><h1>${esc(h1 || title)}</h1><p class="lead-p">${intro} ${list.length ? `${list.length} salidas${cheapest ? `, desde ${eur(minPrice(cheapest))} por persona` : ''}.` : ''}</p>
    <form class="filters filters-inline offer-filter" data-target="#offer-grid"><label class="f-wide"><span>Busca como hablas</span><input name="q" type="search" placeholder="Ej.: islas griegas en junio desde Barcelona por menos de 900" autocomplete="off"></label><label><span>Ordenar</span><select name="o"><option value="score">Mejor oferta</option><option value="price">Más barato</option><option value="ppn">Precio por noche</option><option value="date">Fecha</option><option value="real">Precio real total</option><option value="nights">Noches</option><option value="ssc">Nota del barco</option><option value="drop">Mayor bajada</option></select></label><details class="more-f" data-open-wide><summary>Filtros <span class="f-n"></span></summary><div class="more-f-in"><label><span>Noches</span><select name="n"><option value="">Todas</option><option value="mini">2-4</option><option value="semana">5-8</option><option value="dos">9-14</option><option value="larga">15+</option></select></label><label><span>Presupuesto p.p.</span><select name="b"><option value="">Cualquiera</option><option value="300">Hasta 300 €</option><option value="500">Hasta 500 €</option><option value="800">Hasta 800 €</option><option value="1200">Hasta 1.200 €</option><option value="2000">Hasta 2.000 €</option></select></label><label><span>Mes</span><select name="m"><option value="">Todos</option>${[...new Set(list.map((x) => x.date.slice(0, 7)))].sort().map((ym) => `<option value="${ym}">${cap(MES[+ym.slice(5) - 1])} ${ym.slice(0, 4)}</option>`).join('')}</select></label><label><span>Salida</span><select name="es"><option value="">Cualquier puerto</option><option value="1">Solo desde España</option></select></label>${lineOpts(list)}${shipOpts(list)}<label><span>Nota del barco</span><select name="ssc"><option value="">Cualquiera</option><option value="50">50 o más</option><option value="65">65 o más</option><option value="75">75 o más</option><option value="85">85 o más</option></select></label><label><span>Nota del precio</span><select name="dsc"><option value="">Cualquiera</option><option value="70">Buen precio (70+)</option><option value="85">Solo chollos (85+)</option></select></label><label class="f-check"><input type="checkbox" name="hv" value="1"> <span>Ocultar las que ya he visto</span></label></div></details></form>
    ${list.length ? hubSummary(list) : ''}
    <p class="small"><button class="btn btn-ghost btn-sm js-save-search" type="button">⭐ Guardar esta búsqueda</button> <button class="btn btn-ghost btn-sm js-share-search" type="button">📤 Compartir esta búsqueda</button> <button class="btn btn-ghost btn-sm js-reset-filters" type="button" hidden>✖ Quitar filtros</button> <button class="btn btn-ghost btn-sm js-surprise-offer" type="button">🎲 Sorpréndeme con un chollo</button></p>
    ${extra}</section>
    <section class="wrap block"><h2 class="sr">Listado de ofertas</h2>${list.length ? `<div class="grid" id="offer-grid" data-all="${sorted.map((x) => x.id).join(',')}">${sorted.slice(0, 48).map(cardFull).join('')}</div>` : `<div class="tip">No hay salidas con precio ahora mismo. Crea una alerta y te avisamos.</div>${leadForm('ofertas-vacio', 'Avisadme')}`}</section>
    ${list.length > 5 ? `<section class="wrap block">${monthTable(list)}</section>` : ''}${after}${hubFaq(list, what)}
    <section class="wrap block"><p class="muted small">Precios por persona de las webs oficiales de las navieras, actualizados dos veces al día. Precio real = tarifa + tasas + cuota de servicio. <a href="/metodologia/#ofertas">Cómo calculamos la nota del precio</a>.</p></section>`;
    return layout({ title, desc: `${title}: ${list.length} salidas comparadas con precio real (tasas incluidas) y nota de 0 a 100. Elige tu mejor crucero al mejor precio.`, url: u, body, crumbs,
      schema: [{ '@context': 'https://schema.org', '@type': 'ItemList', name: title, itemListElement: sorted.slice(0, 20).map((x, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE + url(x), name: titleOf(x) })) }] });
  }
  function hubs() {
    const out = [];
    const y = new Date().getFullYear();
    out.push(['ofertas/index.html', hub({ url: '/ofertas/', title: `Ofertas de cruceros ${y}: los mejores precios comparados`, h1: 'Ofertas de cruceros: compara y elige tu mejor crucero al mejor precio', intro: 'Todas las salidas con su precio real (tasas y cuota de servicio incluidas) y una nota de 0 a 100 que dice si es un chollo frente a cruceros parecidos.', list: sailings, crumbs: [['Inicio', '/'], ['Ofertas', '/ofertas/']],
      extra: `<div class="chips">${[...new Set(sailings.map((x) => x.destination).filter(Boolean))].map((d) => `<a class="chip" href="/ofertas/${d}/">${esc(destName(d))}</a>`).join('')}</div>` })]);
    const dests = [...new Set(sailings.map((x) => x.destination).filter(Boolean))];
    for (const d of dests) { const n = destName(d); const D = DESTINATIONS.find((z) => z.slug === d);
      out.push([`ofertas/${d}/index.html`, hub({ url: `/ofertas/${d}/`, title: `Ofertas de cruceros por ${n} ${y}`, h1: `Cruceros por ${n}: ofertas y precios`, intro: `Las mejores salidas por ${n}, comparadas por precio real y nota del precio.`, what: `por ${n}`, list: sailings.filter((x) => x.destination === d), crumbs: [['Inicio', '/'], ['Ofertas', '/ofertas/'], [n, `/ofertas/${d}/`]],
        after: D ? `<section class="wrap block"><h2>Cuándo ir y consejos</h2><p>${esc(D.intro || D.text || '')}</p>${D.tips ? `<ul>${D.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}<p><a href="/destinos/${d}/">Guía completa de ${esc(n)} →</a></p></section>` : '' })]); }
    for (const p of allPorts) { const l = sailings.filter((x) => x.depart_port_slug === p.slug); if (!l.length) continue; const c = p.name.split(' (')[0]; out.push([`ofertas/desde-${p.slug}/index.html`, hub({ url: `/ofertas/desde-${p.slug}/`, title: `Cruceros desde ${c} ${y}: ofertas y precios`, h1: `Cruceros desde ${c}`, intro: `Salidas desde el puerto de ${c} ordenadas por la mejor oferta.`, list: l, crumbs: [['Inicio', '/'], ['Ofertas', '/ofertas/'], [`Desde ${c}`, `/ofertas/desde-${p.slug}/`]], extra: tripBox(c, { sid: 'hub-' + p.slug, title: `Hotel, traslado y vuelo a ${c}` }) })]); }
    for (const p of allPorts) { const l = sailings.filter((x) => x.depart_port_slug === p.slug); const by = {}; l.forEach((x) => { const k = x.date.slice(0, 7); (by[k] = by[k] || []).push(x); });
      for (const [ym, ll] of Object.entries(by)) { if (ll.length < 4) continue; const c = p.name.split(' (')[0], m = MES[+ym.slice(5) - 1], yy = ym.slice(0, 4);
        out.push([`ofertas/desde-${p.slug}/${m}-${yy}/index.html`, hub({ url: `/ofertas/desde-${p.slug}/${m}-${yy}/`, title: `Cruceros desde ${c} en ${m} de ${yy}`, h1: `Cruceros desde ${c} en ${m} de ${yy}`, intro: `Salidas desde ${c} en ${m} de ${yy}, de la mejor oferta a la peor.`, what: `desde ${c} en ${m}`, list: ll, crumbs: [['Inicio', '/'], ['Ofertas', '/ofertas/'], [`Desde ${c}`, `/ofertas/desde-${p.slug}/`], [`${cap(m)} ${yy}`, `/ofertas/desde-${p.slug}/${m}-${yy}/`]] })]); } }
    const months = [...new Set(sailings.map((x) => x.date.slice(0, 7)))].sort();
    for (const ym of months) { const [yy, mm] = ym.split('-'); const m = MES[+mm - 1]; out.push([`ofertas/${m}-${yy}/index.html`, hub({ url: `/ofertas/${m}-${yy}/`, title: `Cruceros en ${m} de ${yy}: ofertas y precios`, h1: `Cruceros en ${m} de ${yy}`, intro: `Todas las salidas de ${m} de ${yy} con precio real.`, list: sailings.filter((x) => x.date.startsWith(ym)), crumbs: [['Inicio', '/'], ['Ofertas', '/ofertas/'], [`${cap(m)} ${yy}`, `/ofertas/${m}-${yy}/`]] })]); }
    const lines = [...new Set(sailings.map((x) => x.line).filter(Boolean))];
    for (const l of lines) { const L = Object.values(LINES).find((z) => z.slug === l); if (!L) continue; out.push([`ofertas/naviera-${l}/index.html`, hub({ url: `/ofertas/naviera-${l}/`, title: `Ofertas de ${L.short} ${y}: todas las salidas comparadas`, h1: `Ofertas de ${L.short}`, intro: `Todas las salidas de ${L.short} con precio de su web oficial, tasas incluidas.`, list: sailings.filter((x) => x.line === l), crumbs: [['Inicio', '/'], ['Ofertas', '/ofertas/'], [L.short, `/ofertas/naviera-${l}/`]] })]); }
    const now = Date.now();
    out.push(['ultima-hora/index.html', hub({ url: '/ultima-hora/', title: 'Cruceros de última hora: salidas en los próximos 60 días', h1: 'Cruceros de última hora', intro: 'Salidas en los próximos 60 días, ordenadas por la mejor oferta.', list: sailings.filter((x) => new Date(x.date) - now <= 60 * 864e5), crumbs: [['Inicio', '/'], ['Última hora', '/ultima-hora/']] })]);
    out.push(['ofertas/chollos/index.html', hub({ url: '/ofertas/chollos/', title: 'Chollos de cruceros: las ofertas con nota de 85 o más', h1: 'Chollos de cruceros', intro: 'Solo las salidas con nota de oferta de 85 o más: mucho más baratas que cruceros parecidos.', list: sailings.filter((x) => deal(x).score >= 85), crumbs: [['Inicio', '/'], ['Ofertas', '/ofertas/'], ['Chollos', '/ofertas/chollos/']] })]);
    out.push(['ofertas/minicruceros/index.html', hub({ url: '/ofertas/minicruceros/', title: 'Minicruceros de 2 a 4 noches: ofertas para un fin de semana', h1: 'Minicruceros: 2 a 4 noches', intro: 'Escapadas cortas en barco para un fin de semana o un puente.', what: 'de 2 a 4 noches', list: sailings.filter((x) => x.nights <= 4), crumbs: [['Inicio', '/'], ['Ofertas', '/ofertas/'], ['Minicruceros', '/ofertas/minicruceros/']] })]);
    const byN = {}; sailings.forEach((x) => { (byN[x.nights] = byN[x.nights] || []).push(x); });
    for (const [n, l] of Object.entries(byN)) { if (l.length < 8) continue; out.push([`ofertas/${n}-noches/index.html`, hub({ url: `/ofertas/${n}-noches/`, title: `Cruceros de ${n} noches: ofertas y precios`, h1: `Cruceros de ${n} noches`, intro: `Todas las salidas de ${n} noches comparadas.`, what: `de ${n} noches`, list: l, crumbs: [['Inicio', '/'], ['Ofertas', '/ofertas/'], [`${n} noches`, `/ofertas/${n}-noches/`]] })]); }
    const byC = {}; sailings.forEach((x) => String(x.countries || '').split(',').map((c) => c.trim()).filter(Boolean).forEach((c) => { (byC[c] = byC[c] || []).push(x); }));
    for (const [c, l] of Object.entries(byC)) { if (l.length < 8) continue; const sl = slugify(c); out.push([`ofertas/pais-${sl}/index.html`, hub({ url: `/ofertas/pais-${sl}/`, title: `Cruceros por ${c}: ofertas con escala en ${c}`, h1: `Cruceros con escala en ${c}`, intro: `Salidas que hacen escala en ${c}.`, what: `con escala en ${c}`, list: l, crumbs: [['Inicio', '/'], ['Ofertas', '/ofertas/'], [c, `/ofertas/pais-${sl}/`]] })]); }
    const today = new Date().toISOString().slice(0, 10);
    const drops = sailings.filter((x) => (x.history || []).length > 1 && minPrice(x) < Math.max(...x.history.map((h) => h.price)));
    out.push(['ofertas/bajadas/index.html', hub({ url: '/ofertas/bajadas/', title: 'Cruceros que han bajado de precio', h1: 'Bajadas de precio de cruceros', intro: 'Salidas cuyo precio ha bajado desde que empezamos a seguirlas.', list: drops, crumbs: [['Inicio', '/'], ['Ofertas', '/ofertas/'], ['Bajadas de precio', '/ofertas/bajadas/']] })]);
    const fresh = sailings.filter((x) => x.first_seen && (new Date(today) - new Date(x.first_seen)) / 864e5 <= 3);
    out.push(['ofertas/nuevas/index.html', hub({ url: '/ofertas/nuevas/', title: 'Nuevas ofertas de cruceros (últimos 3 días)', h1: 'Ofertas nuevas', intro: 'Salidas que han aparecido en los últimos 3 días.', list: fresh, sortBy: 'score', crumbs: [['Inicio', '/'], ['Ofertas', '/ofertas/'], ['Nuevas', '/ofertas/nuevas/']] })]);
    out.push(['ofertas/observatorio/index.html', observatory(drops)]);
    return out;
  }
  // Observatorio de precios: cifras calculadas con las salidas publicadas (se actualiza en cada compilación)
  function observatory(drops) {
    const med = (a) => { const v = [...a].sort((x, y) => x - y); return v.length ? v[Math.floor(v.length / 2)] : 0; };
    const rows = [...new Set(sailings.map((x) => x.destination).filter(Boolean))].map((d) => { const l = sailings.filter((x) => x.destination === d); return { d, n: l.length, ppn: med(l.map(ppn)), min: Math.min(...l.map(minPrice)), chollos: l.filter((x) => deal(x).score >= 85).length }; }).sort((a, b) => a.ppn - b.ppn);
    const months = [...new Set(sailings.map((x) => x.date.slice(0, 7)))].sort().map((ym) => { const l = sailings.filter((x) => x.date.startsWith(ym)); return { ym, n: l.length, ppn: med(l.map(ppn)) }; });
    const maxM = Math.max(1, ...months.map((m) => m.ppn));
    const ups = sailings.filter((x) => (x.history || []).length > 1 && minPrice(x) > Math.min(...x.history.map((h) => h.price))).length;
    const body = `<section class="wrap block page-h"><h1>Observatorio de precios de cruceros</h1><p class="lead-p">Cómo están los precios hoy, con las ${sailings.length} salidas que seguimos dos veces al día en las webs oficiales de las navieras. Precio real = tarifa + tasas + cuota de servicio.</p>
    <div class="stats stats-light"><div><b>${sailings.length}</b><span>Salidas seguidas</span></div><div><b>${eur(med(sailings.map(ppn)))}</b><span>Mediana real por noche</span></div><div><b>${drops.length}</b><span>Han bajado de precio</span></div><div><b>${ups}</b><span>Han subido</span></div></div></section>
    <section class="wrap block"><h2>Precio real por noche según el destino</h2><div class="table-wrap"><table class="rank-t"><thead><tr><th>Destino</th><th>Salidas</th><th>Mediana por noche</th><th>Desde</th><th>Chollos (85+)</th></tr></thead><tbody>${rows.map((r) => `<tr><td><a href="/ofertas/${r.d}/">${esc(destName(r.d))}</a></td><td>${r.n}</td><td>${eur(r.ppn)}</td><td>${eur(r.min)}</td><td>${r.chollos}</td></tr>`).join('')}</tbody></table></div></section>
    <section class="wrap block"><h2>¿Qué mes sale más barato?</h2><p class="muted small">Mediana del precio real por noche de las salidas de cada mes.</p><ul class="bars">${months.map((m) => `<li><span class="bar-l"><a href="/ofertas/${MES[+m.ym.slice(5) - 1]}-${m.ym.slice(0, 4)}/">${cap(MES[+m.ym.slice(5) - 1])} ${m.ym.slice(0, 4)}</a></span><span class="bar"><i style="width:${Math.round((m.ppn / maxM) * 100)}%"></i></span><b>${eur(m.ppn)}</b><small>${m.n} salidas</small></li>`).join('')}</ul></section>
    <section class="wrap block"><p class="muted small">Datos: precios públicos de la web oficial de cada naviera, comprobados el ${fdate(BUILD_DATE.slice(0, 10))}. Puedes reutilizarlos citando a MejorCrucero con un enlace. <a href="/ofertas/bajadas/">Ver todas las bajadas</a> · <a href="/metodologia/#ofertas">Metodología</a>.</p></section>`;
    return layout({ title: 'Observatorio de precios de cruceros: cuánto cuesta un crucero hoy', desc: `Precio real por noche de ${sailings.length} salidas de crucero por destino y mes, actualizado dos veces al día con datos de las navieras.`, url: '/ofertas/observatorio/', body, crumbs: [['Inicio', '/'], ['Ofertas', '/ofertas/'], ['Observatorio', '/ofertas/observatorio/']],
      schema: [{ '@context': 'https://schema.org', '@type': 'Dataset', name: 'Observatorio de precios de cruceros MejorCrucero', description: 'Precio real por noche de las salidas de crucero publicadas en las webs oficiales de las navieras, por destino y mes.', url: SITE + '/ofertas/observatorio/', creator: { '@type': 'Organization', name: 'MejorCrucero', url: SITE }, dateModified: BUILD_DATE.slice(0, 10), inLanguage: 'es-ES', isAccessibleForFree: true, distribution: [{ '@type': 'DataDownload', encodingFormat: 'application/json', contentUrl: SITE + '/data/ofertas.json' }] }] });
  }
  // Feeds: RSS de chollos y JSON para reutilizar (p. ej. Happy Low Cost)
  function feeds() {
    const top = sailings.filter((x) => new Date(x.date) > new Date()).sort((a, b) => deal(b).score - deal(a).score).slice(0, 50);
    const item = (x) => `<item><title>${esc(titleOf(x))} · ${x.date} · ${eur(minPrice(x))}</title><link>${SITE}${url(x)}</link><guid isPermaLink="true">${SITE}${url(x)}</guid><description>${esc(`Nota del precio ${deal(x).score}/100 (${deal(x).label}). Precio real ${eur(real(x).total)} por persona con tasas.`)}</description><pubDate>${new Date(x.first_seen || BUILD_DATE).toUTCString()}</pubDate></item>`;
    const rss = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Chollos de cruceros · MejorCrucero</title><link>${SITE}/ofertas/</link><description>Las mejores ofertas de cruceros con precio real y nota de 0 a 100</description><language>es-ES</language>${top.map(item).join('')}</channel></rss>`;
    const json = top.map((x) => ({ id: x.id, title: titleOf(x), url: SITE + url(x), date: x.date, nights: x.nights, depart_port: x.depart_port, ship: shipName(x), price: minPrice(x), real_price: real(x).total, score: deal(x).score, label: deal(x).label, image: photoOf(x) ? SITE + photoOf(x).thumb : null }));
    const lite = sailings.filter((x) => new Date(x.date) > new Date()).map((x) => ({ i: x.id, t: `${destName(x.destination, x)} · ${x.nights} noches`, s: x.ship, sn: shipName(x), d: x.date, n: x.nights, p: x.depart_port, ps: x.depart_port_slug, dst: x.destination, pr: minPrice(x), r: real(x).total, sc: deal(x).score, dis: deal(x).disc, pts: portsOf(x).map((q) => q.name), img: photoOf(x)?.thumb || null }));
    const cards = Object.fromEntries(sailings.map((x) => [x.id, cardFull(x)]));
    return [['ofertas/feed.xml', rss], ['data/chollos.json', JSON.stringify(json)], ['data/ofertas.json', JSON.stringify(lite)], ['data/cards.json', JSON.stringify(cards)]];
  }
  return { feeds, card, page, hubs, deal, real, minPrice, ppn, destName, url };
}
