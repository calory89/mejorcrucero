// Ofertas: una página por salida (como los chollos de Happy Low Cost), nota de la oferta 0-100,
// precio real (tarifa + tasas + cuota de servicio) y páginas de ofertas por destino, puerto, mes y naviera.
import { SITE, esc, eur, fmt, slugify, cap, layout, shipCard, shareBar, leadForm, cj, tripBox, scoreBadge, ICON, forumBlock } from './lib.js';

// Coordenadas aproximadas de puertos frecuentes (solo para dibujar el mapa del itinerario)
const MORE_COORDS = [['Savona', 44.31, 8.48], ['Guadalupe', 16.24, -61.53], ['La Romana / Santo Domingo', 18.42, -68.96], ['Bari', 41.13, 16.87], ['San Cristóbal', 17.3, -62.72], ['Lanzarote', 28.96, -13.55], ['Palermo', 38.13, 13.36], ['Tórtola', 18.42, -64.62], ['Atenas', 37.94, 23.64], ['Madeira', 32.64, -16.91], ['Fuerteventura', 28.5, -13.86], ['Cefalonia', 38.18, 20.49], ['Nueva York', 40.77, -74.0], ['Santo Domingo', 18.47, -69.88], ['Corfú', 39.62, 19.92], ['Tánger', 35.79, -5.81], ['Martinica', 14.6, -61.07], ['San Martín', 18.02, -63.05], ['Port Everglades', 26.09, -80.12], ['Río de Janeiro', -22.89, -43.18], ['Creta', 35.34, 25.13], ['Azores', 37.74, -25.66], ['Antigua', 17.12, -61.85], ['Saint-Tropez', 43.27, 6.64], ['Ibiza', 38.91, 1.44], ['Túnez', 36.82, 10.31], ['Barbados', 13.1, -59.62], ['Cagliari', 39.21, 9.11], ['Split', 43.5, 16.44], ['Taormina', 37.85, 15.29], ['Catania', 37.5, 15.09], ['La Valeta', 35.9, 14.51], ['Hamburgo', 53.54, 9.97], ['Santa Lucia', 14.01, -61.0], ['Zadar', 44.12, 15.23], ['Gibraltar', 36.14, -5.35], ['Costa Amalfitana', 40.63, 14.6], ['Florencia', 43.55, 10.3], ['Santa Cruz de la Palma', 28.68, -17.76], ['El Havre', 49.49, 0.11], ['Agadir', 30.42, -9.62], ['Trieste', 45.65, 13.76], ['Córcega', 41.92, 8.74], ['Rodas', 36.45, 28.23], ['Zakynthos', 37.78, 20.9], ['Taranto', 40.47, 17.23], ['Montevideo', -34.9, -56.21], ['Salvador', -12.97, -38.51], ['Colón', 9.36, -79.9], ['Cabo Rojo', 17.95, -71.65], ['Arroyo Barril (Samaná)', 19.2, -69.43], ['Half Moon Cay', 24.58, -75.95], ['Gran Turca', 21.46, -71.14], ['Londres', 51.5, -0.12]];
const EXTRA_DEST = { 'vuelta-al-mundo': 'Vuelta al mundo', sudamerica: 'Sudamérica', especiales: 'Cruceros especiales' };
const CABIN = { interior: 'Camarote interior', exterior: 'Camarote exterior', balcon: 'Camarote con balcón', suite: 'Suite' };
const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const fdate = (d, o = { day: 'numeric', month: 'long', year: 'numeric' }) => new Date(d + 'T12:00:00').toLocaleDateString('es-ES', o);
const bucket = (n) => (n <= 4 ? 'mini' : n <= 8 ? 'semana' : n <= 14 ? 'dos' : 'larga');

export function makeOffers({ sailings, bySlug, LINES, DESTINATIONS, forWhom, allPorts, BUILD_DATE, PORT_COORDS = [] }) {
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
  // Nota de la oferta: precio real por noche frente a cruceros parecidos (mismo destino y duración, salidas a ±60 días),
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
    const r = { score, label, vsMedian, median, peers: peers.length, disc, atMin, drop };
    cache.set(x.id, r); return r;
  };
  const dcls = (n) => (n >= 85 ? 'sc-a' : n >= 70 ? 'sc-b' : n >= 45 ? 'sc-c' : 'sc-e');
  const url = (x) => `/salidas/${x.id}/`;
  const shipName = (x) => bySlug[x.ship]?.name || x.ship_name || x.ship;
  const titleOf = (x) => `Crucero ${destName(x.destination, x)} de ${x.nights} noches desde ${x.depart_port} en el ${shipName(x)}`;
  const portsOf = (x) => (x.itinerary?.ports || []).filter((p) => !/navegaci/i.test(p.name));
  const photoOf = (x) => bySlug[x.ship]?.photo || null;

  function card(x) {
    const s = bySlug[x.ship], d = deal(x), r = real(x), ph = photoOf(x);
    return `<a class="card sail-card offer-card" href="${url(x)}">${ph ? `<div class="ship-art has-photo"><img src="${esc(ph.thumb)}" alt="${esc(shipName(x))}" loading="lazy" decoding="async" width="640" height="${Math.round(640 / (ph.ratio || 1.6))}" class="ship-photo"><span class="scb ${dcls(d.score)}" title="Nota de la oferta ${d.score}/100"><b>${d.score}</b></span></div>` : ''}<div class="card-body"><span class="eyebrow">${esc(s?.lineShort || '')} · ${esc(shipName(x))}</span><h3>${esc(destName(x.destination, x))} · ${x.nights} noches</h3>
    <p class="muted small">${fdate(x.date, { day: 'numeric', month: 'short', year: 'numeric' })} · desde ${esc(x.depart_port)}</p>
    <p class="muted small ports-line">${esc(portsOf(x).slice(1, 5).map((p) => p.name).join(' · '))}</p>
    <p class="price">desde <b>${eur(r.tarifa)}</b> <span class="muted small">p.p. · real ${eur(r.total)}</span>${d.disc >= 10 ? ` <span class="badge-drop">−${d.disc}%</span>` : ''}</p>
    <p class="deal-l ${dcls(d.score)}-t">${esc(d.label)}</p></div></a>`;
  }

  function chart(hist) {
    if (hist.length < 2) return '';
    const W = 600, H = 160, min = Math.min(...hist.map((h) => h.price)), max = Math.max(...hist.map((h) => h.price));
    const pts = hist.map((h, i) => [20 + (i / (hist.length - 1)) * (W - 40), H - 20 - ((h.price - min) / (max - min || 1)) * (H - 40)]);
    return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Histórico de precio"><polyline fill="none" stroke="currentColor" stroke-width="3" points="${pts.map((p) => p.join(',')).join(' ')}"/>${pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="4"><title>${hist[i].date}: ${eur(hist[i].price)}</title></circle>`).join('')}<text x="20" y="14" class="ct">${eur(max)}</text><text x="20" y="${H - 4}" class="ct">${eur(min)}</text></svg>`;
  }

  function page(x) {
    const s = bySlug[x.ship], L = s ? LINES[s.line] : null, d = deal(x), r = real(x), ph = photoOf(x);
    const ports = x.itinerary?.ports || [], stops = portsOf(x), seaDays = ports.filter((p) => /navegaci/i.test(p.name)).length;
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
    <a class="hero-score" href="#nota-oferta"><span class="scb scb-big ${dcls(d.score)}"><b>${d.score}</b><small>/100</small></span><span><b>${esc(d.label)}</b><small>Nota de la oferta</small></span></a>
    <p class="lead-p">${cap(fdate(x.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))} · ${stops.length} escalas${seaDays ? ` · ${seaDays} día${seaDays > 1 ? 's' : ''} de navegación` : ''}${x.countries ? ` · ${esc(x.countries)}` : ''}</p>
    <div class="stats"><div><b>${eur(r.tarifa)}</b><span>Desde, por persona</span></div><div><b>${eur(r.total)}</b><span>Precio real p.p.</span></div><div><b>${eur(ppn(x))}</b><span>Real por noche</span></div><div><b>${s?.sc ?? '—'}</b><span>Nota del barco</span></div></div>
    <div class="actions">${official ? `<a class="btn" href="${esc(official.url)}" target="_blank" rel="noopener" data-aff="${esc(official.partner)}" data-page="${url(x)}">Ver en ${esc(official.partner.replace(' (web oficial)', ''))} →</a>` : ''}<a class="btn btn-ghost" href="/herramientas/alerta-precio/?barco=${x.ship}&amp;fecha=${x.date}">🔔 Avísame si baja</a><button class="btn btn-ghost fav fav-inline" type="button" data-fav="${x.ship}" aria-pressed="false">${ICON.heart} Guardar barco</button></div>
  </div>
  <div class="ship-hero-art">${ph ? `<img src="${esc(ph.large || ph.thumb)}" alt="${esc(sn)}" width="640" height="${Math.round(640 / (ph.ratio || 1.6))}" fetchpriority="high" decoding="async" class="ship-photo">` : ''}</div>
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
  <p class="muted small">Precio de la web oficial de ${esc(L?.short || 'la naviera')} comprobado el <time datetime="${x.updated || BUILD_DATE}">${fdate((x.updated || BUILD_DATE).slice(0, 10))}</time>. Los precios cambian: confírmalo antes de reservar.</p></section>

  <section class="block" id="nota-oferta"><h2>Nota de la oferta: ${d.score}/100 · ${esc(d.label)}</h2>
  <ul class="bars"><li><span class="bar-l">Frente a cruceros parecidos</span><span class="bar"><i style="width:${Math.max(4, Math.min(100, 50 + d.vsMedian))}%"></i></span><b>${d.vsMedian >= 0 ? '−' : '+'}${Math.abs(d.vsMedian)}%</b><small>Media de ${d.peers} cruceros de ${esc(dn)} de duración parecida: ${eur(d.median)} reales por noche; este, ${eur(ppn(x))}.</small></li>
  ${d.disc ? `<li><span class="bar-l">Descuento de la naviera</span><span class="bar"><i style="width:${Math.min(100, d.disc * 2)}%"></i></span><b>−${d.disc}%</b><small>Sobre el precio de catálogo.</small></li>` : ''}
  <li><span class="bar-l">Histórico</span><span class="bar"><i style="width:${d.atMin ? 100 : 40}%"></i></span><b>${d.atMin ? 'Mínimo' : hist.length > 1 ? 'Ha estado más barato' : 'Nuevo'}</b><small>${hist.length > 1 ? `Seguimos este precio desde el ${fdate(hist[0].date)}.` : 'Empezamos a seguir este precio hoy: crea una alerta y te avisamos si baja.'}</small></li></ul>
  ${chart(hist)}<p class="small"><a href="/metodologia/#ofertas">Cómo calculamos la nota de la oferta</a></p></section>

  <section class="block" id="itinerario"><h2>Itinerario día a día</h2><ol class="itin">${ports.map((p) => { const ps = portSlug(p.name); return `<li><b>Día ${p.day}</b> ${ps ? `<a href="/puertos/${ps}/">${esc(p.name)}</a>` : esc(p.name)}${/navegaci/i.test(p.name) ? '' : ` <a class="small" href="${cj('attr', null, 'itin-' + slugify(p.name))}" target="_blank" rel="sponsored noopener" data-aff="cj-attr">excursiones →</a>`}</li>`; }).join('')}</ol>
  <p class="muted small">Termina en ${esc(x.arrive_port || x.depart_port)}. Horarios exactos en la web de la naviera.</p>
  ${stops.length && stops.filter((p) => p.lat).length / stops.length >= 0.7 && stops.filter((p) => p.lat).length >= 2 ? `<div class="map" data-ports='${esc(JSON.stringify(ports.filter((p) => p.lat).map((p) => [p.lat, p.lon, p.name])))}'><button class="btn btn-ghost js-map" type="button">🗺️ Ver mapa del itinerario</button></div>` : ''}</section>

  ${s ? `<section class="block"><h2>El barco: ${esc(sn)}</h2><div class="score-top">${s.sc != null ? scoreBadge(s.sc, true) : ''}<p>${esc(s.lineShort)} · en servicio desde ${s.year} · ${fmt(s.gt)} GT${s.pax ? ` · ${fmt(s.pax)} pasajeros` : ''}. ${s.sc != null ? `Nota MejorCrucero ${s.sc}/100.` : ''} <a href="/barcos/${s.slug}/">Ficha completa, vídeos y opiniones →</a></p></div>
  ${fw.yes.length ? `<div class="fw"><div><h3 class="h-sm">👍 Ideal para</h3><ul>${fw.yes.map((t) => `<li>${esc(cap(t))}</li>`).join('')}</ul></div>${fw.no.length ? `<div><h3 class="h-sm">👎 Mejor no si…</h3><ul>${fw.no.map((t) => `<li>${esc(cap(t))}</li>`).join('')}</ul></div>` : ''}</div>` : ''}</section>` : ''}

  ${tripBox(x.depart_port.split(' (')[0], { date: x.date, sid: 'oferta-' + x.id, title: `Llega a ${x.depart_port} sin estrés` })}

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
      title, desc: `${x.nights} noches desde ${x.depart_port} el ${fdate(x.date)} en el ${sn}: ${stops.slice(1, 6).map((p) => p.name).join(', ')}. Desde ${eur(r.tarifa)} (precio real ${eur(r.total)} con tasas). Nota de la oferta ${d.score}/100.`,
      url: url(x), body, ogType: 'product', og: ph ? `/og/${x.ship}.png` : '/og.png',
      crumbs: [['Inicio', '/'], ['Ofertas', '/ofertas/'], [dn, `/ofertas/${x.destination || ''}/`], [`${sn} ${x.date}`, url(x)]],
      schema: [
        { '@context': 'https://schema.org', '@type': 'Product', name: `${titleOf(x)} (${x.date})`, brand: { '@type': 'Brand', name: L?.short || '' }, image: ph ? SITE + ph.thumb : undefined, description: `${x.nights} noches: ${stops.map((p) => p.name).join(', ')}`,
          offers: { '@type': 'Offer', price: r.tarifa, priceCurrency: 'EUR', availability: 'https://schema.org/InStock', url: official?.url, validFrom: (x.updated || BUILD_DATE).slice(0, 10), seller: { '@type': 'Organization', name: official?.partner || L?.short } } },
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
    const qa = [[`¿Cuál es el crucero más barato ${what}?`, `Ahora mismo, el ${shipName(cheap)} del ${fdate(cheap.date)} (${cheap.nights} noches desde ${cheap.depart_port}) desde ${eur(minPrice(cheap))} por persona; con tasas y cuota, unos ${eur(real(cheap).total)}.`],
      [`¿Cuántas noches suelen durar?`, `La duración más habitual entre las ${list.length} salidas es de ${medN} noches.`],
      [`¿Desde qué puertos salen?`, `Sobre todo desde ${topP.join(', ')}.`]];
    return `<section class="wrap block faq"><h2>Preguntas frecuentes</h2>${qa.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</section>`;
  }
  function hub({ url: u, title, h1, intro, list, crumbs, sortBy = 'score', extra = '', what = '', after = '' }) {
    const sorted = [...list].sort(sortBy === 'date' ? (a, b) => a.date.localeCompare(b.date) : (a, b) => deal(b).score - deal(a).score || minPrice(a) - minPrice(b));
    const cheapest = [...list].sort((a, b) => minPrice(a) - minPrice(b))[0];
    const body = `<section class="wrap block page-h"><h1>${esc(h1 || title)}</h1><p class="lead-p">${intro} ${list.length ? `${list.length} salidas${cheapest ? `, desde ${eur(minPrice(cheapest))} por persona` : ''}.` : ''}</p>
    <form class="filters filters-inline offer-filter" data-target="#offer-grid"><label><span>Ordenar</span><select name="o"><option value="score">Mejor oferta</option><option value="price">Más barato</option><option value="ppn">Precio por noche</option><option value="date">Fecha</option></select></label><label><span>Noches</span><select name="n"><option value="">Todas</option><option value="mini">2-4</option><option value="semana">5-8</option><option value="dos">9-14</option><option value="larga">15+</option></select></label><label><span>Presupuesto p.p.</span><select name="b"><option value="">Cualquiera</option><option value="300">Hasta 300 €</option><option value="500">Hasta 500 €</option><option value="800">Hasta 800 €</option><option value="1200">Hasta 1.200 €</option><option value="2000">Hasta 2.000 €</option></select></label><label><span>Mes</span><select name="m"><option value="">Todos</option>${[...new Set(list.map((x) => x.date.slice(0, 7)))].sort().map((ym) => `<option value="${ym}">${cap(MES[+ym.slice(5) - 1])} ${ym.slice(0, 4)}</option>`).join('')}</select></label><label><span>Salida</span><select name="es"><option value="">Cualquier puerto</option><option value="1">Solo desde España</option></select></label></form>
    ${extra}</section>
    <section class="wrap block">${list.length ? `<div class="grid" id="offer-grid">${sorted.slice(0, 240).map((x) => card(x).replace('<a class="card sail-card offer-card"', `<a data-score="${deal(x).score}" data-price="${minPrice(x)}" data-real="${real(x).total}" data-ppn="${ppn(x)}" data-date="${x.date}" data-m="${x.date.slice(0, 7)}" data-n="${bucket(x.nights)}" data-es="${x.depart_port_slug && !['buenos-aires', 'miami', 'fort-lauderdale', 'port-canaveral', 'san-juan'].includes(x.depart_port_slug) ? 1 : 0}" class="card sail-card offer-card"`)).join('')}</div>` : `<div class="tip">No hay salidas con precio ahora mismo. Crea una alerta y te avisamos.</div>${leadForm('ofertas-vacio', 'Avisadme')}`}</section>
    ${list.length > 5 ? `<section class="wrap block">${monthTable(list)}</section>` : ''}${after}${hubFaq(list, what)}
    <section class="wrap block"><p class="muted small">Precios por persona de las webs oficiales de las navieras, actualizados dos veces al día. Precio real = tarifa + tasas + cuota de servicio. <a href="/metodologia/#ofertas">Cómo calculamos la nota de la oferta</a>.</p></section>`;
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
      out.push([`ofertas/${d}/index.html`, hub({ url: `/ofertas/${d}/`, title: `Ofertas de cruceros por ${n} ${y}`, h1: `Cruceros por ${n}: ofertas y precios`, intro: `Las mejores salidas por ${n}, comparadas por precio real y nota de la oferta.`, what: `por ${n}`, list: sailings.filter((x) => x.destination === d), crumbs: [['Inicio', '/'], ['Ofertas', '/ofertas/'], [n, `/ofertas/${d}/`]],
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
    const today = new Date().toISOString().slice(0, 10);
    const drops = sailings.filter((x) => (x.history || []).length > 1 && minPrice(x) < Math.max(...x.history.map((h) => h.price)));
    out.push(['ofertas/bajadas/index.html', hub({ url: '/ofertas/bajadas/', title: 'Cruceros que han bajado de precio', h1: 'Bajadas de precio de cruceros', intro: 'Salidas cuyo precio ha bajado desde que empezamos a seguirlas.', list: drops, crumbs: [['Inicio', '/'], ['Ofertas', '/ofertas/'], ['Bajadas de precio', '/ofertas/bajadas/']] })]);
    const fresh = sailings.filter((x) => x.first_seen && (new Date(today) - new Date(x.first_seen)) / 864e5 <= 3);
    out.push(['ofertas/nuevas/index.html', hub({ url: '/ofertas/nuevas/', title: 'Nuevas ofertas de cruceros (últimos 3 días)', h1: 'Ofertas nuevas', intro: 'Salidas que han aparecido en los últimos 3 días.', list: fresh, sortBy: 'score', crumbs: [['Inicio', '/'], ['Ofertas', '/ofertas/'], ['Nuevas', '/ofertas/nuevas/']] })]);
    return out;
  }
  // Feeds: RSS de chollos y JSON para reutilizar (p. ej. Happy Low Cost)
  function feeds() {
    const top = sailings.filter((x) => new Date(x.date) > new Date()).sort((a, b) => deal(b).score - deal(a).score).slice(0, 50);
    const item = (x) => `<item><title>${esc(titleOf(x))} · ${x.date} · ${eur(minPrice(x))}</title><link>${SITE}${url(x)}</link><guid isPermaLink="true">${SITE}${url(x)}</guid><description>${esc(`Nota de la oferta ${deal(x).score}/100 (${deal(x).label}). Precio real ${eur(real(x).total)} por persona con tasas.`)}</description><pubDate>${new Date(x.first_seen || BUILD_DATE).toUTCString()}</pubDate></item>`;
    const rss = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Chollos de cruceros · MejorCrucero</title><link>${SITE}/ofertas/</link><description>Las mejores ofertas de cruceros con precio real y nota de 0 a 100</description><language>es-ES</language>${top.map(item).join('')}</channel></rss>`;
    const json = top.map((x) => ({ id: x.id, title: titleOf(x), url: SITE + url(x), date: x.date, nights: x.nights, depart_port: x.depart_port, ship: shipName(x), price: minPrice(x), real_price: real(x).total, score: deal(x).score, label: deal(x).label, image: photoOf(x) ? SITE + photoOf(x).thumb : null }));
    return [['ofertas/feed.xml', rss], ['data/chollos.json', JSON.stringify(json)]];
  }
  return { feeds, card, page, hubs, deal, real, minPrice, ppn, destName, url };
}
