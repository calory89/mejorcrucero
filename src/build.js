// Generador estático de MejorCrucero.com — sin dependencias. `node src/build.js`
import fs from 'node:fs';
import path from 'node:path';
import { CONFIG, LINES, VIDEOS, VIDEO_TOPICS, HOME_PORTS, AMERICA_PORTS, SCALE_PORTS, SOURCES } from './data/content.js';
import { GUIDES } from './data/guides.js';
import { DESTINATIONS, MONTHS, COMPARISONS } from './data/destinations.js';
import { scoreShip, tagsFor, scoreLabel, scoreClass, PARTS } from './score.js';
import { scoreBadge } from './lib.js';
import { cj, tripBox, bookingHotels } from './lib.js';
import { makeOffers } from './offers.js';
import { SITE, BASE, BUILD_DATE, OUT, esc, slugify, dec, fmt, eur, cap, pages, write, ICON, shipSvg, photoCredit, shipCard, videoFacade, affLink, civLink, partnerLink, leadForm, shareBar, reportBtn, forumBlock, layout } from './lib.js';

const D = (f) => path.join(path.dirname(new URL(import.meta.url).pathname), 'data', f);
const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(D(f), 'utf8')); } catch { return d; } };

// ---------- datos ----------
function readCsv(f) {
  if (!fs.existsSync(D(f))) return [];
  const [head, ...rows] = fs.readFileSync(D(f), 'utf8').trim().split('\n');
  const cols = head.split(',');
  return rows.filter(Boolean).map((r) => {
    const v = r.match(/("([^"]|"")*"|[^,]*)(,|$)/g).map((x) => x.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"'));
    return Object.fromEntries(cols.map((c, i) => [c, (v[i] ?? '').trim()]));
  });
}
const GENERIC_LINE = (name) => ({ slug: slugify(name), short: name, web: null, tip: null, tipSuite: null, color: '#334155', es: false, tier: 'estandar', blurb: `Naviera ${name}.` });
const extraVideos = readJson('videos_extra.json', {});
const VIDEO_ALIAS = { 'scarlet-lady': 'virgin-voyages-scarlet-lady' };
const photos = readJson('photos.json', {});
const portPhotos = readJson('port_photos.json', {});
// SAILINGS=ruta permite probar el motor con un fichero de prueba local (nunca se publica)
const sailings = process.env.SAILINGS ? JSON.parse(fs.readFileSync(process.env.SAILINGS, 'utf8')) : readJson('sailings.json', []);
let fx = readJson('fx.json', null);
const vsp = readJson('vsp.json', {});
const specs = Object.fromEntries(readCsv('ships_specs.csv').map((r) => [r.name, r]));
// Opiniones de la comunidad agregadas (API en Cloudflare). Si no responde, la nota se calcula sin ellas.
let ratings = {};
if (CONFIG.api && !process.env.OFFLINE) {
  try { const r = await fetch(CONFIG.api + '/ratings', { signal: AbortSignal.timeout(8000) }); if (r.ok) ratings = await r.json(); } catch {}
}

const seen = new Set();
const ships = [...readCsv('ships.csv').map((r) => ({ ...r, source: SOURCES[0][1] })), ...readCsv('ships_extra.csv')].map((r) => {
  const L = LINES[r.line] || (LINES[r.line] = GENERIC_LINE(r.line));
  const sp = specs[r.name] || {};
  const s = { name: r.name, line: r.line, lineShort: L.short, lineSlug: L.slug, color: L.color, tier: L.tier || 'estandar', year: +r.year, gt: +r.gt, pax: (() => { const a = r.pax ? +r.pax : null, b = sp.pax ? Math.round(+sp.pax) : null; return a && b ? Math.min(a, b) : a || b; })(), slug: slugify(r.name), source: r.source || SOURCES[0][1] };
  s.crew = sp.crew ? Math.round(+sp.crew) : null; s.refit = sp.refit_year ? +sp.refit_year : null; s.length = sp.length_m ? Math.round(+sp.length_m) : null; s.decks = sp.decks ? Math.round(+sp.decks) : null; s.formerNames = sp.former_names || ''; s.paxMax = sp.pax_max ? +sp.pax_max : null; s.specSource = sp.source || null;
  s.ratio = s.pax ? Math.round((s.gt / s.pax) * 10) / 10 : null;
  s.size = s.gt >= 200000 ? 'Gigante' : s.gt >= 160000 ? 'Muy grande' : s.gt >= 100000 ? 'Grande' : s.gt >= 50000 ? 'Mediano' : 'Pequeño';
  s.age = 2026 - s.year;
  const vids = (VIDEOS[s.slug] || []).map(([id, t]) => [id, t, /español/i.test(t)]).concat(extraVideos[s.slug] || extraVideos[VIDEO_ALIAS[s.slug]] || []);
  const ids = new Set(); s.videos = vids.filter(([id]) => !ids.has(id) && ids.add(id));
  s.photo = photos[s.slug] ? { ...photos[s.slug] } : null;
  // Fotos servidas desde nuestro dominio (más rápido y sin cookies de terceros); el crédito enlaza a Commons.
  // Fotos servidas desde nuestro dominio (640 y 1280 px, sin cookies de terceros); el crédito enlaza a Commons.
  s.sailings = sailings.filter((x) => x.ship === s.slug);
  return s;
}).filter((s) => s.gt > 1000 && s.year > 1950 && !seen.has(s.slug) && seen.add(s.slug));
// Barcos gemelos (misma naviera y arqueo ±1,5%): Wikipedia mezcla a veces capacidad doble y máxima;
// usamos la cifra de doble ocupación (la menor) de la clase para que el espacio por pasajero sea comparable.
ships.forEach((s) => { const sis = ships.filter((o) => o.line === s.line && o.pax && Math.abs(o.gt - s.gt) / s.gt <= 0.015); const m = Math.min(...sis.map((o) => o.pax)); if (s.pax && m < s.pax) { s.pax = m; s.ratio = Math.round((s.gt / m) * 10) / 10; } });
ships.forEach((s) => { s.score = scoreShip(s, { vsp, community: ratings }); s.sc = s.score?.total ?? null; s.vsp = vsp[s.name] || null; s.tags = tagsFor(s, LINES[s.line]); });
const scored = ships.filter((s) => s.sc != null).sort((a, b) => b.sc - a.sc || b.gt - a.gt);
scored.forEach((s, i) => { s.rank = i + 1; });

const bySlug = Object.fromEntries(ships.map((s) => [s.slug, s]));
const lineList = Object.entries(LINES).map(([full, L]) => ({ full, ...L, ships: ships.filter((s) => s.line === full) })).filter((l) => l.ships.length);
const lineBySlug = Object.fromEntries(lineList.map((l) => [l.slug, l]));
const spaceLabel = (r) => (r == null ? 'Sin dato' : r >= 45 ? 'Muy espacioso' : r >= 38 ? 'Espacioso' : r >= 33 ? 'Estándar' : 'Concurrido');
const TIER = { estandar: 'Precio medio', premium: 'Premium', lujo: 'Lujo' };
const allPorts = [...HOME_PORTS, ...AMERICA_PORTS];

function forWhom(s) {
  const yes = [], no = [];
  if (s.gt >= 200000) { yes.push('familias y grupos que quieren atracciones y mil planes'); no.push('quien busca un barco tranquilo y sin colas'); }
  else if (s.gt >= 140000) { yes.push('quien quiere variedad de restaurantes y espectáculos'); }
  else { yes.push('quien prefiere un barco más manejable y puertos más pequeños'); no.push('quien quiere toboganes y grandes atracciones'); }
  if (s.tier === 'lujo') { yes.push('viajeros que valoran servicio y comida por encima del precio'); no.push('presupuestos ajustados'); }
  if (s.tier === 'premium') yes.push('parejas y adultos que buscan un ambiente más cuidado');
  if (LINES[s.line].es) yes.push('quien quiere oír español a bordo en el Mediterráneo');
  if (s.ratio && s.ratio < 33) no.push('quien odia las aglomeraciones (tiene poco espacio por pasajero)');
  if (s.ratio && s.ratio >= 45) yes.push('quien quiere espacio: tiene mucho sitio por pasajero');
  if (s.age <= 3) yes.push('quien quiere estrenar barco');
  if (s.age >= 18) no.push('quien busca lo último en diseño (es un barco veterano)');
  return { yes: yes.slice(0, 3), no: no.slice(0, 2) };
}

let OFF; // se crea tras definir los barcos
// ---------- salidas (feed) ----------
const sailingUrl = (x) => `/salidas/${x.id}/`;
const minPrice = (x) => Math.min(...Object.values(x.prices || {}).filter((v) => v > 0));
const ppn = (x) => Math.round(minPrice(x) / x.nights);
function sailingCard(x) { return OFF.card(x); }

function monthRange(ms) {
  let start = ms[0], end = ms[ms.length - 1];
  for (let i = 1; i < ms.length; i++) if (ms[i] !== ms[i - 1] + 1) { start = ms[i]; end = ms[i - 1]; }
  return `${MONTHS[start - 1]} a ${MONTHS[end - 1]}`;
}
const destCard = (d, extra = '') => `<a class="dest" href="/destinos/${d.slug}/"><span class="dest-e">${d.emoji}</span><b>${esc(d.name)}</b><span>Mejor época: ${monthRange(d.months)}</span>${extra}</a>`;

// ---------- páginas ----------
const featured = ['msc-world-europa', 'icon-of-the-seas', 'costa-smeralda', 'costa-toscana', 'msc-grandiosa', 'wonder-of-the-seas', 'msc-euribia', 'msc-seashore'].map((k) => bySlug[k]).filter(Boolean);
const heroShip = featured.find((s) => s.photo) || featured[0];
const totalVideos = ships.reduce((a, s) => a + s.videos.length, 0);

function home() {
  const roomiest = ships.filter((s) => s.ratio && s.pax > 1500).sort((a, b) => b.ratio - a.ratio).slice(0, 5);
  const deals = [...sailings].filter((x) => new Date(x.date) > new Date()).sort((a, b) => OFF.deal(b).score - OFF.deal(a).score || OFF.minPrice(a) - OFF.minPrice(b)).slice(0, 8);
  const body = `
<section class="hero${heroShip.photo ? ' hero-photo' : ''}"${heroShip.photo ? ` style="--hero:url('${heroShip.photo.local ? BASE.replace(/\/$/, '') : ''}${esc(heroShip.photo.large || heroShip.photo.thumb)}')"` : ''}><div class="wrap hero-in">
  <div class="hero-copy">
    <p class="kicker">El comparador de cruceros de España</p>
    <h1>Compara y elige tu mejor crucero <em>al mejor precio</em></h1>
    <p class="lead-p">${sailings.length ? `${sailings.length} ofertas con precio real (tasas incluidas) y nota de 0 a 100, ` : ''}${ships.length} barcos puntuados, ${totalVideos} vídeos y alertas si baja el precio.</p>
    <form class="search search-big" action="/buscar/" role="search">
      <label><span>Destino</span><select name="destino"><option value="">Cualquiera</option>${DESTINATIONS.map((d) => `<option value="${d.slug}">${esc(d.name)}</option>`).join('')}</select></label>
      <label><span>Mes</span><select name="mes"><option value="">Cualquiera</option>${MONTHS.map((m, i) => `<option value="${i + 1}">${cap(m)}</option>`).join('')}</select></label>
      <label><span>Salida</span><select name="puerto"><option value="">Cualquier puerto</option>${allPorts.map((p) => `<option value="${p.slug}">${esc(p.name)}</option>`).join('')}</select></label>
      <button class="btn js-ab" data-ab="heroCta" type="submit">Buscar</button>
    </form>
    <div class="chips"><a class="chip" href="/navieras/msc/">MSC</a><a class="chip" href="/navieras/costa/">Costa</a><a class="chip" href="/navieras/royal-caribbean/">Royal Caribbean</a><a class="chip" href="/puertos/barcelona/">Desde Barcelona</a><a class="chip" href="/guias/crucero-con-bebe/">Con bebé</a><a class="chip" href="/destinos/canarias-y-madeira/">Canarias en invierno</a></div>
  </div>
  <div class="hero-art" aria-hidden="true">${heroShip.photo ? '' : shipSvg(heroShip, 520)}</div>
</div>${heroShip.photo ? `<p class="credit hero-credit">${esc(heroShip.name)} · Foto: ${esc(heroShip.photo.author || '')} (${esc(heroShip.photo.license || '')}), Wikimedia Commons</p>` : ''}</section>

<section class="wrap block"><div class="sec-h"><h2>Ranking ${new Date().getFullYear()}: los mejores barcos con nota de 0 a 100</h2><a href="/rankings/">Ver ranking completo →</a></div>
<p class="muted">Higiene oficial (CDC), espacio, tripulación, modernidad y opiniones verificadas. <a href="/metodologia/">Cómo puntuamos</a> · <button class="link-btn js-surprise" type="button">🎲 Sorpréndeme</button></p>
<div class="chips">${BEST_FOR.map(([slug, , t]) => `<a class="chip" href="/rankings/${slug}/">${esc(t.replace('Los mejores ', '').replace('cruceros ', ''))}</a>`).join('')}</div>
<div class="grid">${scored.filter((s) => s.photo).slice(0, 4).map((s) => shipCard(s)).join('')}</div></section>

<section class="wrap usp" aria-label="Por qué MejorCrucero">
  <a class="usp-i" href="/herramientas/precio-real/"><span class="usp-e">💶</span><h2>Precio real</h2><p>Sumamos propinas, bebidas, excursiones y traslados. Sin sorpresas al desembarcar.</p></a>
  <a class="usp-i" href="/herramientas/alerta-precio/"><span class="usp-e">🔔</span><h2>¿Ha bajado tu crucero?</h2><p>Guarda tu reserva, vigila el precio y reclama la diferencia.</p></a>
  <a class="usp-i" href="#videos"><span class="usp-e">🎬</span><h2>Vídeos de cada barco</h2><p>${totalVideos} vídeos de camarotes, bufé, piscinas y opiniones sinceras.</p></a>
  <a class="usp-i" href="/comunidad/"><span class="usp-e">💬</span><h2>Foro por barco y salida</h2><p>Conoce a tus compañeros de viaje antes de embarcar.</p></a>
</section>

<section class="wrap block mine" hidden><div class="block-h"><h2>Tus barcos</h2><a href="/mis-cruceros/">Mis cruceros →</a></div><div class="grid mine-grid"></div></section>

${deals.length ? `<section class="wrap block"><div class="block-h"><h2>Chollos de cruceros de hoy</h2><a href="/ofertas/">Ver las ${sailings.length} ofertas →</a></div><div class="grid">${deals.map(sailingCard).join('')}</div></section>` : ''}

<section class="wrap block" id="videos"><div class="block-h"><h2>Los barcos más buscados, en vídeo</h2><a href="/barcos/">Ver los ${ships.length} barcos →</a></div>
<div class="grid">${featured.map((s) => shipCard(s)).join('')}</div></section>

<section class="wrap block"><div class="block-h"><h2>¿Adónde quieres ir?</h2><a href="/destinos/">Todos los destinos →</a></div>
<div class="dest-grid">${DESTINATIONS.map((d) => destCard(d)).join('')}</div></section>

<section class="band"><div class="wrap block tools">
  <div class="block-h"><h2>Herramientas que nadie más te da</h2><a class="on-dark" href="/herramientas/">Ver las 12 →</a></div>
  <div class="grid grid-3">
    <a class="tool" href="/herramientas/asistente/"><h3>🤖 Asistente IA</h3><p>Cuéntale cómo quieres viajar y te recomienda barcos con sus motivos.</p><span class="btn btn-sm">Preguntar →</span></a>
    <a class="tool" href="/herramientas/precio-real/"><h3>💶 Calculadora del precio real</h3><p>Compara dos ofertas con propinas, bebidas y extras, y compártelo.</p><span class="btn btn-sm">Calcular →</span></a>
    <a class="tool" href="/herramientas/mareometro/"><h3>🌊 Mareómetro</h3><p>Qué zonas y meses suelen estar más movidos, para elegir bien si te mareas.</p><span class="btn btn-sm">Consultar →</span></a>
  </div>
</div></section>

<section class="wrap block"><div class="block-h"><h2>Embarca sin salir de España</h2><a href="/puertos/">Todos los puertos →</a></div>
<div class="ports">${HOME_PORTS.map((p) => `<a class="port" href="/puertos/${p.slug}/"><b>${esc(p.name)}</b><span>${esc(p.region)}</span></a>`).join('')}</div></section>

<section class="wrap block split">
  <div><div class="block-h"><h2>Los barcos con más espacio</h2></div>
  <ol class="rank">${roomiest.map((s, i) => `<li><span class="rank-n">${i + 1}</span><a href="/barcos/${s.slug}/">${esc(s.name)}</a><span class="rank-v">${dec(s.ratio)}</span></li>`).join('')}</ol>
  <p class="muted small">Índice de espacio = arqueo bruto ÷ pasajeros (barcos de más de 1.500 pasajeros). <a href="/rankings/">Ver rankings</a>.</p></div>
  <div><div class="block-h"><h2>Comparativas</h2><a href="/comparativas/">Todas →</a></div>
  <ul class="cmp-links">${COMPARISONS.slice(0, 6).map(([a, b]) => lineBySlug[a] && lineBySlug[b] ? `<li><a href="/comparativas/${a}-vs-${b}/">${esc(lineBySlug[a].short)} <span>vs</span> ${esc(lineBySlug[b].short)}</a></li>` : '').join('')}</ul></div>
</section>

<section class="wrap block"><div class="block-h"><h2>Guías para cruceristas</h2><a href="/guias/">Todas las guías →</a></div>
<div class="grid grid-3">${GUIDES.slice(0, 6).map((g) => `<a class="card guide" href="/guias/${g.slug}/"><span class="guide-e">${g.emoji}</span><h3>${esc(g.title)}</h3><p>${esc(g.desc)}</p></a>`).join('')}</div></section>

<section class="cta-band"><div class="wrap cta-in">
  <div><h2>Chollos de cruceros en tu email</h2><p>Una selección semanal de las mejores ofertas, con el precio real calculado. <a class="on-dark" href="/newsletter/">Mira cómo es</a>.</p></div>
  ${leadForm('newsletter-home', 'Quiero los chollos')}
</div></section>`;
  return layout({
    title: 'MejorCrucero: compara y elige tu mejor crucero al mejor precio',
    desc: `El comparador de cruceros de España: ${sailings.length} ofertas con precio real y nota de 0 a 100, ${ships.length} barcos puntuados, vídeos y opiniones. Cruceros desde Barcelona, Valencia, Málaga, Palma y Canarias.`,
    url: '/', body,
    schema: [{ '@context': 'https://schema.org', '@type': 'WebSite', name: 'MejorCrucero', url: SITE, inLanguage: 'es-ES', potentialAction: { '@type': 'SearchAction', target: SITE + '/buscar/?q={q}', 'query-input': 'required name=q' } }],
  });
}

function searchPage() {
  const body = `<section class="wrap block page-h"><h1>Buscar cruceros</h1><p class="lead-p">Busca como buscas de verdad: por destino, mes, puerto de salida y duración.</p>
  <form class="filters search-form" id="sform">
    <label><span>Destino</span><select name="destino"><option value="">Cualquiera</option>${DESTINATIONS.map((d) => `<option value="${d.slug}">${esc(d.name)}</option>`).join('')}</select></label>
    <label><span>Mes</span><select name="mes"><option value="">Cualquiera</option>${MONTHS.map((m, i) => `<option value="${i + 1}">${cap(m)}</option>`).join('')}</select></label>
    <label><span>Puerto de salida</span><select name="puerto"><option value="">Cualquiera</option>${allPorts.map((p) => `<option value="${p.slug}">${esc(p.name)}</option>`).join('')}</select></label>
    <label><span>Noches</span><select name="noches"><option value="">Cualquiera</option><option value="1-5">1 a 5</option><option value="6-8">6 a 8</option><option value="9-14">9 a 14</option><option value="15-99">15 o más</option></select></label>
    <label><span>Precio máx. por persona (€)</span><input name="max" type="number" min="0" step="50" inputmode="numeric"></label>
    <label><span>Camarote</span><select name="cabina"><option value="">Cualquiera</option><option value="interior">Interior</option><option value="exterior">Exterior</option><option value="balcon">Balcón</option><option value="suite">Suite</option></select></label>
    <label><span>Viajo</span><select name="perfil"><option value="">Me da igual</option><option value="ninos">Con niños</option><option value="adultos">Solo adultos</option></select></label>
    <label><span>Ordenar</span><select name="orden"><option value="real">Precio por noche</option><option value="precio">Precio</option><option value="fecha">Fecha</option></select></label>
    <label class="span2"><span>Texto (barco, naviera, puerto)</span><input name="q" type="search" placeholder="Ej.: MSC, Santorini, Icon…"></label>
  </form>
  <p class="muted small" id="s-count" aria-live="polite"></p>
  <div class="grid" id="s-results"></div>
  <div id="s-empty">
    <div class="tip"><b>Estamos conectando los precios en directo de navieras y agencias.</b> Mientras tanto te enseñamos destinos, barcos y puertos que encajan con tu búsqueda, y te avisamos en cuanto haya salidas con esos filtros.</div>
    <div id="s-alt"><h2>Destinos que encajan</h2><div class="dest-grid">${DESTINATIONS.map((d) => `<a class="dest" href="/destinos/${d.slug}/"><span class="dest-e">${d.emoji}</span><b>${esc(d.name)}</b></a>`).join('')}</div><h2>Barcos más nuevos</h2><div class="grid">${[...ships].sort((a, b) => b.year - a.year).slice(0, 8).map((s) => shipCard(s, { compare: false })).join('')}</div></div>
    <form class="alert-crit" id="crit-form"><h2 class="h-sm">Avísame cuando haya cruceros así</h2><label><span>Tu email</span><input name="email" type="email" required autocomplete="email"></label><input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true"><button class="btn" type="submit">Crear alerta</button><p class="form-msg" role="status" aria-live="polite"></p></form>
  </div></section>
  <script type="application/json" id="search-meta">${JSON.stringify({ dest: DESTINATIONS.map((d) => ({ slug: d.slug, name: d.name, emoji: d.emoji, months: d.months, ports: d.ports })), ports: allPorts.map((p) => ({ slug: p.slug, name: p.name })) })}</script>`;
  return layout({ title: 'Buscar cruceros por destino, mes y puerto', desc: 'Busca cruceros por destino, mes, puerto de salida, duración y precio real por noche.', url: '/buscar/', body, crumbs: [['Inicio', '/'], ['Buscar', '/buscar/']] });
}

function shipsIndex() {
  const sorted = [...ships].sort((a, b) => (b.sc ?? -1) - (a.sc ?? -1) || b.gt - a.gt);
  const az = [...ships].sort((a, b) => a.name.localeCompare(b.name));
  const body = `<section class="wrap block page-h"><h1>Todos los barcos de crucero</h1><p class="lead-p">${ships.length} barcos de ${lineList.length} navieras. Filtra, guarda tus favoritos y añádelos al comparador.</p>
  <form class="filters" id="filters" role="search">
    <label class="f-wide"><span>Buscar</span><input name="q" type="search" placeholder="Ej.: familia español nuevo · MSC · Icon" autocomplete="off"></label>
    <label><span>Naviera</span><select name="linea"><option value="">Todas</option>${[...lineList].sort((a, b) => a.short.localeCompare(b.short)).map((l) => `<option value="${l.slug}">${esc(l.short)} (${l.ships.length})</option>`).join('')}</select></label>
    <label><span>Tamaño</span><select name="tam"><option value="">Todos</option><option>Gigante</option><option>Muy grande</option><option>Grande</option><option>Mediano</option><option>Pequeño</option></select></label>
    <label><span>Gama</span><select name="gama"><option value="">Todas</option><option value="estandar">Precio medio</option><option value="premium">Premium</option><option value="lujo">Lujo</option></select></label>
    <label><span>Nota mínima</span><select name="nota"><option value="">Cualquiera</option><option value="85">85+ excelente</option><option value="75">75+ muy bueno</option><option value="65">65+ bueno</option></select></label>
    <label><span>Ideal para</span><select name="tag"><option value="">Todo</option><option value="familias">Familias</option><option value="adultos">Solo adultos</option><option value="espanol">Español a bordo</option><option value="espacioso">Mucho espacio</option><option value="pequeno">Barco pequeño</option><option value="nuevo">Recién estrenado</option><option value="lujo">Lujo</option><option value="servicio">Mucha tripulación</option></select></label>
    <label><span>Ordenar</span><select name="orden"><option value="sc">Mejor nota</option><option value="m">Mi encaje</option><option value="gt">Más grandes</option><option value="year">Más nuevos</option><option value="ratio">Más espaciosos</option><option value="name">A–Z</option></select></label>
  </form><h2 class="sr">Resultados</h2><p class="muted small" id="count" aria-live="polite">${ships.length} barcos</p><p class="small"><button class="btn btn-ghost btn-sm js-surprise" type="button">🎲 Sorpréndeme</button> <a class="small" href="/metodologia/">Cómo calculamos la nota</a></p>
  <div class="grid" id="ship-grid">${sorted.slice(0, 24).map((s) => shipCard(s)).join('')}</div>
  <p class="center"><button class="btn btn-ghost" id="more" type="button">Ver más barcos</button></p>
  <p class="empty" id="empty" hidden>No hay barcos con esos filtros. <a href="/barcos/">Ver todos</a>.</p>
  <details class="az"><summary>Lista completa de barcos de la A a la Z</summary><ul class="az-list">${az.map((s) => `<li><a href="/barcos/${s.slug}/">${esc(s.name)}</a></li>`).join('')}</ul></details></section>`;
  return layout({ title: 'Todos los barcos de crucero: fichas, vídeos y comparador', desc: `Fichas de ${ships.length} barcos de crucero de MSC, Costa, Royal Caribbean, Norwegian y más: tamaño, año, pasajeros, espacio, vídeos y foro.`, url: '/barcos/', body, crumbs: [['Inicio', '/'], ['Barcos', '/barcos/']] });
}

function scoreSection(s) {
  if (s.sc == null) return `<section class="block" id="nota"><h2>MejorCrucero Score</h2><p class="muted">Todavía no tenemos datos públicos suficientes para dar una nota fiable a este barco (necesitamos al menos el espacio por pasajero y otros dos indicadores). Preferimos no inventarla. <a href="/metodologia/">Cómo se calcula</a>.</p></section>`;
  const sc = s.score;
  return `<section class="block score-sec" id="nota"><h2>MejorCrucero Score: ${s.sc}/100</h2>
  <div class="score-top">${scoreBadge(s.sc, true)}<p><b>${scoreLabel(s.sc)}</b>. Puesto <a href="/rankings/">${s.rank} de ${scored.length}</a> barcos con nota${(() => { const same = scored.filter((o) => o.line === s.line); const tier = scored.filter((o) => o.tier === s.tier); return (same.length > 1 ? `, ${same.findIndex((o) => o.slug === s.slug) + 1}º de ${same.length} en ${esc(s.lineShort)}` : '') + ` y ${tier.findIndex((o) => o.slug === s.slug) + 1}º de ${tier.length} en su gama (${TIER[s.tier].toLowerCase()})`; })()}.</p></div>
  <ul class="bars">${sc.parts.map((p) => `<li><span class="bar-l">${esc(p.label)}</span><span class="bar"><i style="width:${Math.round((p.pts / p.max) * 100)}%"></i></span><b>${String(p.pts).replace('.', ',')}/${p.max}</b><small>${esc(p.detail)}${p.source ? ` · <a href="${esc(p.source)}" target="_blank" rel="noopener">fuente</a>` : ''}</small></li>`).join('')}</ul>
  ${sc.missing.length ? `<p class="muted small">Sin datos todavía de: ${sc.missing.join(', ')}. La nota se calcula sobre el ${sc.coverage}% de los puntos posibles y se reescala a 100.</p>` : ''}
  <p class="small"><a href="/metodologia/">Cómo calculamos la nota</a> · <a href="/rankings/">Ver el ranking completo</a></p>${shareBar(`El ${s.name} tiene un ${s.sc}/100 en MejorCrucero:`, '/barcos/' + s.slug + '/')}</section>`;
}

function shipPage(s) {
  const L = LINES[s.line];
  const simD = (o) => Math.abs(o.gt - s.gt) / 20000 + (o.tier === s.tier ? 0 : 1.5) + Math.abs((o.sc ?? 60) - (s.sc ?? 60)) / 10 + Math.abs(o.year - s.year) / 8 + (o.line === s.line ? -0.5 : 0);
  const similar = ships.filter((o) => o.slug !== s.slug).sort((a, b) => simD(a) - simD(b)).slice(0, 5);
  const rankGt = [...ships].sort((a, b) => b.gt - a.gt).findIndex((o) => o.slug === s.slug) + 1;
  const ytq = (t) => `https://www.youtube.com/results?search_query=${encodeURIComponent(s.name + ' ' + t)}`;
  const fw = forWhom(s);
  const page = `/barcos/${s.slug}/`;
  const faqs = [
    [`¿Cuántos pasajeros lleva el ${s.name}?`, s.pax ? `El ${s.name} tiene capacidad para unos ${fmt(s.pax)} pasajeros según las cifras publicadas (la capacidad máxima puede ser mayor si se ocupan las terceras y cuartas camas).` : `No tenemos una cifra verificada de pasajeros para el ${s.name}.`],
    [`¿Qué tamaño tiene el ${s.name}?`, `El ${s.name} tiene un arqueo bruto de ${fmt(s.gt)} GT, lo que lo sitúa en el puesto ${rankGt} de los ${ships.length} barcos que analizamos.`],
    [`¿Cuándo empezó a navegar el ${s.name}?`, `El ${s.name} está en servicio con ${L.short} desde ${s.year}.`],
    [`¿Qué naviera opera el ${s.name}?`, `El ${s.name} pertenece a ${L.short}. ${L.blurb}`],
  ];
  if (L.es) faqs.push([`¿Se habla español a bordo del ${s.name}?`, `${L.short} trabaja mucho con el mercado español y en sus cruceros por el Mediterráneo es habitual encontrar información, anuncios y personal en español. Confirma los idiomas de tu salida concreta al reservar.`]);
  const body = `
<article class="ship" data-ship="${s.slug}" data-name="${esc(s.name)}">
<section class="ship-hero" style="--c:${s.color}"><div class="wrap ship-hero-in">
  <div>
    <a class="eyebrow eyebrow-l" href="/navieras/${s.lineSlug}/">${esc(L.short)} · ${TIER[s.tier]}</a>
    <h1>${esc(s.name)}</h1>
    ${s.sc != null ? `<a class="hero-score" href="#nota">${scoreBadge(s.sc, true)}<span><b>${scoreLabel(s.sc)}</b><small>MejorCrucero Score · nº ${s.rank} de ${scored.length}</small></span></a>` : ''}
    ${s.tags.length ? `<p class="tags">${s.tags.map(([k, t]) => `<a class="tag" href="/barcos/?tag=${k}">${esc(t)}</a>`).join('')}</p>` : ''}
    <p class="match-box" data-slug="${s.slug}" hidden></p>
    <p class="lead-p">Barco ${s.size.toLowerCase()} de ${esc(L.short)} en servicio desde ${s.year}${s.pax ? `, con capacidad para unos ${fmt(s.pax)} pasajeros` : ''}. Vídeos, ficha técnica, dónde reservar y opiniones de cruceristas.</p>
    <div class="stats">
      <div><b>${s.year}</b><span>Año</span></div>
      <div><b>${fmt(s.gt)}</b><span>Arqueo (GT)</span></div>
      <div><b>${fmt(s.pax)}</b><span>Pasajeros</span></div>
      <div><b>${dec(s.ratio)}</b><span>Espacio · ${spaceLabel(s.ratio)}</span></div>
    </div>
    <div class="actions"><a class="btn" href="#reservar">Comparar precios</a>${s.videos.length ? '<a class="btn btn-ghost" href="#videos">Ver vídeos</a>' : ''}<button class="btn btn-ghost" type="button" data-cmp="${s.slug}">+ Comparar</button><button class="btn btn-ghost fav fav-inline" type="button" data-fav="${s.slug}" aria-pressed="false" aria-label="Guardar en favoritos">${ICON.heart} Guardar</button></div>
  </div>
  <div class="ship-hero-art">${s.photo ? `<img src="${esc(s.photo.thumb)}"${s.photo.hi ? ` srcset="${esc(s.photo.thumb)} 640w, ${esc(s.photo.large)} 1280w" sizes="(max-width: 900px) 100vw, 560px"` : ''} alt="${esc(s.name)}" width="640" height="${Math.round(640 / (s.photo.ratio || 1.6))}" fetchpriority="high" decoding="async" class="ship-photo">${photoCredit(s)}` : `<div aria-hidden="true">${shipSvg(s, 460)}</div>`}</div>
</div></section>

<div class="wrap ship-grid">
<div class="ship-main">
  <section class="block forwhom"><h2>¿Es para ti?</h2><div class="fw"><div><h3 class="h-sm">👍 Ideal para</h3><ul>${fw.yes.map((x) => `<li>${esc(cap(x))}</li>`).join('')}</ul></div>${fw.no.length ? `<div><h3 class="h-sm">👎 Mejor no si…</h3><ul>${fw.no.map((x) => `<li>${esc(cap(x))}</li>`).join('')}</ul></div>` : ''}</div><p class="muted small">Orientación basada en el tamaño, la gama, la edad y el espacio del barco. Las opiniones de la comunidad, más abajo.</p></section>

  ${scoreSection(s)}

  ${s.sailings.length ? `<section class="block" id="salidas"><h2>Ofertas del ${esc(s.name)} (${s.sailings.length} salidas)</h2><div class="grid">${[...s.sailings].filter((x) => new Date(x.date) > new Date()).sort((a, b) => OFF.deal(b).score - OFF.deal(a).score).slice(0, 6).map(sailingCard).join('')}</div>${s.sailings.length > 6 ? `<details class="az"><summary>Ver todas las fechas</summary><ul class="az-list">${s.sailings.map((x) => `<li><a href="/salidas/${x.id}/">${x.date} · ${x.nights} noches · ${esc(x.depart_port)} · ${eur(OFF.minPrice(x))}</a></li>`).join('')}</ul></details>` : ''}</section>${tripBox(s.sailings[0].depart_port.split(' (')[0], { sid: 'barco-' + s.slug, title: `¿Embarcas en ${s.sailings[0].depart_port}? Hotel, traslado y vuelo` })}` : ''}

  <section id="reservar" class="block"><h2>Dónde reservar el ${esc(s.name)}</h2>
  <p class="muted">Compara la misma salida en la naviera y en las agencias.${s.sailings.length ? '' : ' Los precios en directo se están conectando: de momento te llevamos a la búsqueda de cada sitio.'}</p>
  <div class="partners">
    ${L.web ? partnerLink({ href: L.web, title: `Web oficial de ${L.short}`, sub: 'Precio de la naviera', page }) : ''}
    ${partnerLink({ href: affLink('logitravel'), key: 'logitravel', title: 'Logitravel', sub: 'Agencia online', page })}
    ${partnerLink({ href: affLink('crucerosnet'), key: 'crucerosnet', title: 'Crucerosnet', sub: 'Especialista en cruceros', page })}
    ${partnerLink({ href: affLink('vayacruceros'), key: 'vayacruceros', title: 'VayaCruceros', sub: 'Especialista en cruceros', page })}
  </div>
  <div class="tip"><b>Antes de pagar:</b> calcula el <a href="/herramientas/precio-real/?linea=${s.lineSlug}">precio real con propinas y extras</a> y guarda tu reserva en la <a href="/herramientas/alerta-precio/?barco=${s.slug}">alerta de bajada de precio</a>.</div>
  <p class="muted small">🔗 Algunos enlaces son de afiliado: si reservas, el vendedor nos paga una comisión y <b>tú pagas lo mismo</b>. La comisión nunca cambia la nota ni el orden. <a href="/afiliacion/">Más info</a>.</p>
  <details class="book-help"><summary>🙋 ¿Prefieres que te ayudemos a reservarlo?</summary><p class="small">Déjanos tu email y la fecha aproximada: te mandamos las mejores opciones de las agencias para el ${esc(s.name)}.</p>${leadForm('reserva:' + s.slug, 'Quiero ayuda', '<label class="sr" for="bh-' + s.slug + '">Fecha aproximada</label><input id="bh-' + s.slug + '" type="month" name="month">')}</details>
  <form class="follow" data-thread="barco:${s.slug}"><label><span>🔔 Avísame de ofertas del ${esc(s.name)}</span><input type="email" name="email" placeholder="tu@email.com" required autocomplete="email"></label><button class="btn btn-sm" type="submit">Seguir barco</button><p class="form-msg" role="status" aria-live="polite"></p></form>
  </section>

  <section id="videos" class="block"><h2>Vídeos del ${esc(s.name)}</h2>
  ${s.videos.length ? `<div class="videos">${s.videos.map(([id, t, es]) => videoFacade(id, t, es)).join('')}</div><p class="muted small">Vídeos públicos de YouTube de sus autores. Se cargan solo al pulsar. ES = en español.</p>` : `<p class="muted">Aún no hemos seleccionado vídeos de este barco. Mientras tanto, abre directamente lo que te interesa:</p>`}
  <h3 class="h-sm">Busca vídeos por tema</h3>
  <div class="chips">${VIDEO_TOPICS.map(([lbl, q]) => `<a class="chip" href="${ytq(q)}" target="_blank" rel="noopener">▶ ${lbl}</a>`).join('')}</div>
  </section>

  <section class="block" id="camarotes"><h2>Buscador de camarotes</h2><p>¿Tienes un número de camarote? Mira lo que cuentan otros cruceristas de ese camarote y de los de al lado.</p>
  <form class="cabin-search" data-ship="${s.slug}"><label><span>Número de camarote</span><input name="cabin" inputmode="numeric" maxlength="8" placeholder="Ej.: 12045" required></label><button class="btn btn-sm" type="submit">Buscar</button></form>
  <div class="cabin-results" aria-live="polite"></div>
  <p class="muted small">Suelen dar problemas los camarotes bajo la discoteca o el teatro, junto a zonas de servicio o con vistas tapadas por botes salvavidas. <a href="/guias/como-elegir-camarote/">Guía para elegir camarote</a>.</p></section>

  <section class="block"><h2>Ficha técnica</h2>
  <table class="spec"><tbody>
    <tr><th scope="row">Naviera</th><td><a href="/navieras/${s.lineSlug}/">${esc(L.short)}</a> · ${TIER[s.tier]}</td></tr>
    <tr><th scope="row">En servicio desde</th><td>${s.year} (${s.age <= 0 ? 'nuevo' : s.age === 1 ? '1 año' : s.age + ' años'})</td></tr>
    <tr><th scope="row">Arqueo bruto</th><td>${fmt(s.gt)} GT · puesto ${rankGt} de ${ships.length}</td></tr>
    <tr><th scope="row">Pasajeros</th><td>${fmt(s.pax)}</td></tr>
    ${s.crew ? `<tr><th scope="row">Tripulación</th><td>${fmt(s.crew)} (${dec(Math.round((s.pax / s.crew) * 100) / 100)} pasajeros por tripulante)</td></tr>` : ''}
    ${s.length ? `<tr><th scope="row">Eslora</th><td>${fmt(s.length)} m</td></tr>` : ''}
    ${s.decks ? `<tr><th scope="row">Cubiertas</th><td>${s.decks}</td></tr>` : ''}
    ${s.refit ? `<tr><th scope="row">Última gran reforma</th><td>${s.refit}</td></tr>` : ''}
    ${s.formerNames ? `<tr><th scope="row">Nombres anteriores</th><td>${esc(s.formerNames)}</td></tr>` : ''}
    ${s.vsp ? `<tr><th scope="row">Inspección sanitaria CDC</th><td>${s.vsp.score}/100 (${s.vsp.date}) · <a href="${esc(s.vsp.source)}" target="_blank" rel="noopener">ver en el CDC</a></td></tr>` : ''}
    <tr><th scope="row">Índice de espacio</th><td>${dec(s.ratio)} GT por pasajero · ${spaceLabel(s.ratio)}</td></tr>
    <tr><th scope="row">Cargo de servicio (ref.)</th><td>${L.tip ? `${String(L.tip).replace('.', ',')} $ por persona y noche (camarote estándar, mercado EE. UU.)` : 'Consulta las condiciones de tu reserva'}</td></tr>
    <tr><th scope="row">Español a bordo</th><td>${L.es ? 'Habitual en el Mediterráneo' : 'Consúltalo al reservar'}</td></tr>
  </tbody></table>
  <p class="muted small">Índice de espacio: arqueo bruto dividido entre pasajeros. Orientativo: algunas navieras publican capacidad máxima y otras a doble ocupación. Fuente: <a href="${esc(s.specSource || s.source)}" target="_blank" rel="noopener">Wikipedia</a>. ${reportBtn('barco:' + s.slug)}</p>
  </section>

  ${forumBlock('barco:' + s.slug, `Opiniones y foro del ${s.name}`)}

  <section class="block rollcall"><h2>¿Vas a navegar en el ${esc(s.name)}?</h2><p>Únete al grupo de tu salida: conoce a otros pasajeros, comparte excursiones y resuelve dudas antes de embarcar.</p>
  <form class="rc-form" action="/comunidad/salida/" method="get"><input type="hidden" name="b" value="${s.slug}"><label><span>Fecha de salida</span><input type="date" name="f" required></label><button class="btn" type="submit">Entrar al grupo</button></form></section>

  <section class="block faq"><h2>Preguntas frecuentes</h2>${faqs.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</section>
</div>

<aside class="ship-side">
  <div class="side-card"><h2>Comparte este barco</h2>${shareBar(`Mira el ${s.name} en MejorCrucero:`, page)}</div>
  ${s.sc != null ? `<div class="side-card"><h2>¿Tienes un blog o una agencia?</h2><p class="small">Pon la nota del ${esc(s.name)} en tu web:</p><textarea class="embed-code" readonly rows="3" aria-label="Código para insertar">&lt;iframe src="${SITE}/embed/${s.slug}/" width="300" height="120" style="border:0" title="MejorCrucero Score ${esc(s.name)}" loading="lazy"&gt;&lt;/iframe&gt;</textarea><button class="btn btn-sm btn-ghost js-copy-embed" type="button">Copiar código</button></div>` : ''}
  <div class="side-card"><h2>Barcos parecidos</h2><ul class="mini">${similar.map((o) => `<li><a href="/barcos/${o.slug}/"><b>${esc(o.name)}${o.sc != null ? ` · ${o.sc}` : ''}</b><span>${esc(o.lineShort)} · ${o.year} · ${fmt(o.gt)} GT</span></a></li>`).join('')}</ul>${s.sc != null && similar[0] ? `<a class="small" href="/herramientas/comparar/?b=${s.slug},${similar[0].slug}">Comparar con el ${esc(similar[0].name)} →</a>` : ''}</div>
  <div class="side-card"><h2>Guías útiles</h2><ul class="mini"><li><a href="/guias/como-elegir-camarote/"><b>Cómo elegir camarote</b><span>Y cuáles evitar</span></a></li><li><a href="/guias/propinas-y-cargos-de-servicio/"><b>Propinas y cargos</b><span>Cuánto se paga de verdad</span></a></li><li><a href="/guias/cuando-reservar-crucero/"><b>Cuándo reservar</b><span>Para pagar menos</span></a></li></ul></div>
</aside>
</div>
</article>`;
  return layout({
    title: `${s.name}: opiniones, vídeos, camarotes y precios`,
    desc: `${s.name} de ${L.short} (${s.year}, ${fmt(s.gt)} GT${s.pax ? `, ${fmt(s.pax)} pasajeros` : ''}): vídeos del barco y camarotes, dónde reservar más barato, precio real con propinas y foro de cruceristas.`,
    url: page, body, ogType: 'article', og: fs.existsSync(path.join(OUT, '..', 'public', 'og', s.slug + '.png')) ? `/og/${s.slug}.png` : '/og.png',
    crumbs: [['Inicio', '/'], ['Barcos', '/barcos/'], [L.short, `/navieras/${s.lineSlug}/`], [s.name, page]],
    schema: [
      { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
      ...(s.sailings.length ? [{ '@context': 'https://schema.org', '@type': 'Product', name: `Crucero en el ${s.name}`, brand: L.short, offers: { '@type': 'AggregateOffer', priceCurrency: 'EUR', lowPrice: Math.min(...s.sailings.map(minPrice)), offerCount: s.sailings.length } }] : []),
    ],
  });
}

function sailingPage(x) { return OFF.page(x); }

function dealsPage(kind) {
  const now = new Date();
  const list = kind === 'ultima'
    ? sailings.filter((x) => (new Date(x.date) - now) / 864e5 <= 60 && new Date(x.date) > now).sort((a, b) => ppn(a) - ppn(b))
    : [...sailings].sort((a, b) => ppn(a) - ppn(b)).slice(0, 60);
  const title = kind === 'ultima' ? 'Cruceros de última hora' : 'Ofertas de cruceros de la semana';
  const url = kind === 'ultima' ? '/ultima-hora/' : '/ofertas/';
  const body = `<section class="wrap block page-h"><h1>${title}</h1><p class="lead-p">${kind === 'ultima' ? 'Salidas en los próximos 60 días ordenadas por precio por noche.' : 'Las salidas con mejor precio por persona y noche.'}</p>
  ${list.length ? `<div class="grid">${list.map(sailingCard).join('')}</div>` : `<div class="tip"><b>Estamos conectando los precios en directo.</b> En cuanto estén, aquí verás las mejores ofertas actualizadas cada día. Apúntate y te las enviamos.</div>${leadForm('ofertas-' + kind, 'Avisadme')}<h2>Mientras tanto, elige destino</h2><div class="dest-grid">${DESTINATIONS.map((d) => destCard(d)).join('')}</div>`}</section>`;
  return layout({ title, desc: `${title}: precio por noche, comparado entre naviera y agencias.`, url, body, crumbs: [['Inicio', '/'], [title, url]] });
}

function linesIndex() {
  const body = `<section class="wrap block page-h"><h1>Navieras de cruceros</h1><p class="lead-p">Cada naviera tiene su estilo. Encuentra la tuya y compara todos sus barcos.</p>
  <div class="grid grid-3">${[...lineList].sort((a, b) => b.ships.length - a.ships.length).map((l) => `<a class="card line-card" href="/navieras/${l.slug}/" style="--c:${l.color}"><span class="line-bar"></span><h2>${esc(l.short)}</h2><p>${esc(l.blurb)}</p><span class="muted small">${l.ships.length} barco${l.ships.length > 1 ? 's' : ''} · ${TIER[l.tier || 'estandar']}${l.es ? ' · Español a bordo en el Mediterráneo' : ''}</span></a>`).join('')}</div>
  <p><a href="/comparativas/">Ver comparativas entre navieras →</a></p></section>`;
  return layout({ title: 'Navieras de cruceros: MSC, Costa, Royal Caribbean y más', desc: 'Compara las navieras de cruceros: estilo, barcos, gama de precio, cargos de servicio y para quién es cada una.', url: '/navieras/', body, crumbs: [['Inicio', '/'], ['Navieras', '/navieras/']] });
}

function linePage(l) {
  const sorted = [...l.ships].sort((a, b) => (b.sc ?? -1) - (a.sc ?? -1) || b.year - a.year);
  const sc = l.ships.filter((s) => s.sc != null), avg = sc.length ? Math.round(sc.reduce((a, s) => a + s.sc, 0) / sc.length) : null;
  const body = `<section class="wrap block page-h line-h" style="--c:${l.color}"><span class="line-bar"></span><h1>Cruceros ${esc(l.short)}</h1><p class="lead-p">${esc(l.blurb)}</p>
  <div class="stats stats-light">${avg != null ? `<div><b>${avg}</b><span>Nota media de la flota</span></div>` : ''}<div><b>${l.ships.length}</b><span>Barcos analizados</span></div><div><b>${Math.max(...l.ships.map((s) => s.year))}</b><span>Barco más nuevo</span></div><div><b>${l.tip ? String(l.tip).replace('.', ',') + ' $' : '—'}</b><span>Cargo servicio/noche (ref.)</span></div><div><b>${TIER[l.tier || 'estandar']}</b><span>Gama</span></div></div>
  ${l.web ? `<p><a class="btn" href="${l.web}" target="_blank" rel="noopener" data-aff="oficial-${l.slug}" data-page="/navieras/${l.slug}/">Web oficial de ${esc(l.short)}</a> <a class="btn btn-ghost" href="/herramientas/precio-real/?linea=${l.slug}">Calcular precio real</a></p>` : ''}
  </section>
  <section class="wrap block"><h2>Todos los barcos de ${esc(l.short)} comparados</h2><div class="table-wrap"><table class="rank-t sortable"><thead><tr><th><button type="button" class="th-sort">Barco</button></th><th><button type="button" class="th-sort">Nota</button></th><th><button type="button" class="th-sort">Año</button></th><th><button type="button" class="th-sort">Arqueo (GT)</button></th><th><button type="button" class="th-sort">Pasajeros</button></th><th><button type="button" class="th-sort">Espacio</button></th><th><button type="button" class="th-sort">Vídeos</button></th></tr></thead><tbody>${sorted.map((s) => `<tr><td><a href="/barcos/${s.slug}/">${esc(s.name)}</a></td><td data-v="${s.sc ?? -1}">${s.sc != null ? scoreBadge(s.sc) : '—'}</td><td data-v="${s.year}">${s.year}</td><td data-v="${s.gt}">${fmt(s.gt)}</td><td data-v="${s.pax || 0}">${fmt(s.pax)}</td><td data-v="${s.ratio || 0}">${dec(s.ratio)}</td><td data-v="${s.videos.length}">${s.videos.length || '—'}</td></tr>`).join('')}</tbody></table></div><p class="muted small">Pulsa en una columna para ordenar.</p></section>
  <section class="wrap block"><h2>Fichas</h2><div class="grid">${sorted.map((s) => shipCard(s)).join('')}</div></section>
  <section class="wrap block"><div class="chips">${COMPARISONS.filter((c) => c.includes(l.slug)).map(([a, b]) => lineBySlug[a] && lineBySlug[b] ? `<a class="chip" href="/comparativas/${a}-vs-${b}/">${esc(lineBySlug[a].short)} vs ${esc(lineBySlug[b].short)}</a>` : '').join('')}</div>${shareBar(`Barcos de ${l.short} comparados en MejorCrucero:`, `/navieras/${l.slug}/`)}</section>`;
  return layout({ title: `Cruceros ${l.short}: barcos, opiniones y precio real`, desc: `Todos los barcos de ${l.short} comparados: año, tamaño, pasajeros y espacio, vídeos, cargos de servicio y dónde reservar.`, url: `/navieras/${l.slug}/`, body, crumbs: [['Inicio', '/'], ['Navieras', '/navieras/'], [l.short, `/navieras/${l.slug}/`]] });
}

function comparisonsIndex() {
  const body = `<section class="wrap block page-h"><h1>Comparativas de navieras</h1><p class="lead-p">Las dudas más buscadas, resueltas con datos.</p><ul class="cmp-links big">${COMPARISONS.map(([a, b]) => lineBySlug[a] && lineBySlug[b] ? `<li><a href="/comparativas/${a}-vs-${b}/">${esc(lineBySlug[a].short)} <span>vs</span> ${esc(lineBySlug[b].short)}</a></li>` : '').join('')}</ul></section>`;
  return layout({ title: 'Comparativas de navieras de cruceros', desc: 'MSC vs Costa, Royal Caribbean vs MSC, Norwegian vs Royal Caribbean y más: comparativas con datos de flota, gama y cargos.', url: '/comparativas/', body, crumbs: [['Inicio', '/'], ['Comparativas', '/comparativas/']] });
}

function comparisonPage(a, b) {
  const A = lineBySlug[a], B = lineBySlug[b];
  const stat = (l) => {
    const r = l.ships.filter((s) => s.ratio);
    return { n: l.ships.length, newest: [...l.ships].sort((x, y) => y.year - x.year)[0], biggest: [...l.ships].sort((x, y) => y.gt - x.gt)[0], avgAge: Math.round(l.ships.reduce((t, s) => t + s.age, 0) / l.ships.length), avgRatio: r.length ? Math.round((r.reduce((t, s) => t + s.ratio, 0) / r.length) * 10) / 10 : null };
  };
  const sa = stat(A), sb = stat(B);
  const row = (label, va, vb, better) => `<tr><th scope="row">${label}</th><td class="${better === 'a' ? 'best' : ''}">${va}</td><td class="${better === 'b' ? 'best' : ''}">${vb}</td></tr>`;
  const cmpNum = (x, y, higher = true) => (x == null || y == null || x === y ? '' : (higher ? x > y : x < y) ? 'a' : 'b');
  const verdict = [];
  if (A.es !== B.es) verdict.push(`Si el español a bordo es importante para ti, ${A.es ? A.short : B.short} juega con ventaja en el Mediterráneo.`);
  if (sa.avgRatio && sb.avgRatio && Math.abs(sa.avgRatio - sb.avgRatio) >= 2) verdict.push(`${sa.avgRatio > sb.avgRatio ? A.short : B.short} ofrece de media más espacio por pasajero en los barcos que analizamos.`);
  if (sa.avgAge !== sb.avgAge) verdict.push(`La flota analizada de ${sa.avgAge < sb.avgAge ? A.short : B.short} es más joven de media.`);
  if (A.tier !== B.tier) verdict.push(`${A.short} es de gama ${TIER[A.tier].toLowerCase()} y ${B.short} de gama ${TIER[B.tier].toLowerCase()}: compara siempre con el precio real.`);
  const url = `/comparativas/${a}-vs-${b}/`;
  const body = `<section class="wrap block page-h"><h1>${esc(A.short)} vs ${esc(B.short)}: ¿cuál es mejor?</h1><p class="lead-p">Comparamos flota, tamaño, edad, espacio por pasajero, cargos de servicio y estilo con datos públicos, para que elijas con criterio.</p></section>
  <section class="wrap block"><div class="table-wrap"><table class="cmp-t"><thead><tr><th></th><th><a href="/navieras/${a}/">${esc(A.short)}</a></th><th><a href="/navieras/${b}/">${esc(B.short)}</a></th></tr></thead><tbody>
  ${row('Estilo', esc(A.blurb), esc(B.blurb))}
  ${row('Gama', TIER[A.tier], TIER[B.tier])}
  ${row('Barcos analizados', sa.n, sb.n, cmpNum(sa.n, sb.n))}
  ${row('Barco más nuevo', `<a href="/barcos/${sa.newest.slug}/">${esc(sa.newest.name)}</a> (${sa.newest.year})`, `<a href="/barcos/${sb.newest.slug}/">${esc(sb.newest.name)}</a> (${sb.newest.year})`, cmpNum(sa.newest.year, sb.newest.year))}
  ${row('Barco más grande', `${esc(sa.biggest.name)} (${fmt(sa.biggest.gt)} GT)`, `${esc(sb.biggest.name)} (${fmt(sb.biggest.gt)} GT)`, cmpNum(sa.biggest.gt, sb.biggest.gt))}
  ${row('Edad media de la flota', sa.avgAge + ' años', sb.avgAge + ' años', cmpNum(sa.avgAge, sb.avgAge, false))}
  ${row('Espacio medio por pasajero', dec(sa.avgRatio), dec(sb.avgRatio), cmpNum(sa.avgRatio, sb.avgRatio))}
  ${row('Cargo de servicio (ref. EE. UU.)', A.tip ? String(A.tip).replace('.', ',') + ' $/noche' : 'Consultar', B.tip ? String(B.tip).replace('.', ',') + ' $/noche' : 'Consultar', cmpNum(A.tip, B.tip, false))}
  ${row('Español a bordo (Med.)', A.es ? 'Habitual' : 'Consultar', B.es ? 'Habitual' : 'Consultar')}
  </tbody></table></div></section>
  <section class="wrap block"><h2>Conclusión</h2>${verdict.length ? `<ul class="list">${verdict.map((v) => `<li>${esc(v)}</li>`).join('')}</ul>` : '<p>Son muy parecidas en los datos: decide por itinerario, puerto de salida y precio real.</p>'}
  <p>¿Dudas? Pregúntale al <a href="/herramientas/asistente/">asistente IA</a> o haz el <a href="/herramientas/que-crucero/">test</a>.</p>${shareBar(`${A.short} vs ${B.short}:`, url)}</section>
  <section class="wrap block split"><div><h2>Barcos de ${esc(A.short)}</h2><div class="grid">${[...A.ships].sort((x, y) => y.year - x.year).slice(0, 4).map((s) => shipCard(s)).join('')}</div></div><div><h2>Barcos de ${esc(B.short)}</h2><div class="grid">${[...B.ships].sort((x, y) => y.year - x.year).slice(0, 4).map((s) => shipCard(s)).join('')}</div></div></section>`;
  return layout({ title: `${A.short} vs ${B.short}: ¿qué naviera es mejor?`, desc: `Comparativa ${A.short} vs ${B.short}: flota, barco más nuevo, tamaño, edad, espacio por pasajero, propinas y español a bordo.`, url, body, ogType: 'article', crumbs: [['Inicio', '/'], ['Comparativas', '/comparativas/'], [`${A.short} vs ${B.short}`, url]] });
}

function destinationsIndex() {
  const body = `<section class="wrap block page-h"><h1>Destinos de crucero</h1><p class="lead-p">Dónde ir y cuándo: la mejor época, el estado de la mar y los puertos típicos de cada zona.</p>
  <div class="dest-grid big">${DESTINATIONS.map((d) => destCard(d, `<small>${esc(d.text.slice(0, 110))}…</small>`)).join('')}</div>
  <p><a href="/meses/">Ver qué destino elegir según el mes →</a></p></section>`;
  return layout({ title: 'Destinos de crucero: Mediterráneo, Caribe, fiordos y más', desc: 'Los grandes destinos de crucero con su mejor época, estado de la mar, puertos y consejos.', url: '/destinos/', body, crumbs: [['Inicio', '/'], ['Destinos', '/destinos/']] });
}

function destinationPage(d) {
  const url = `/destinos/${d.slug}/`;
  const ds = sailings.filter((x) => x.destination === d.slug);
  const body = `<section class="wrap block page-h"><span class="big-e">${d.emoji}</span><h1>Cruceros por ${esc(d.name)}</h1><p class="lead-p">${esc(d.text)}</p>
  <div class="stats"><div><b>${cap(monthRange(d.months))}</b><span>Mejor época</span></div><div><b>${esc(d.nights)}</b><span>Duración típica</span></div><div><b>${d.fromSpain ? 'Sí' : 'Volando'}</b><span>Salidas desde España</span></div><div><b>${d.ports.length}</b><span>Puertos típicos</span></div></div></section>
  <section class="wrap block"><h2>Calendario</h2><div class="months">${MONTHS.map((m, i) => `<a href="/meses/${m}/" class="m${d.months.includes(i + 1) ? ' on' : ''}">${m.slice(0, 3)}</a>`).join('')}</div><p class="muted small">Resaltados, los meses en los que las navieras suelen programar más salidas.</p></section>
  <section class="wrap block split"><div><h2>Puertos típicos</h2><ul class="list">${d.ports.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div><div><h2>¿Se mueve el barco?</h2><p>${esc(d.sea)}</p><p><a href="/herramientas/mareometro/">Ver el mareómetro →</a></p></div></section>
  <section class="wrap block"><h2>Consejos</h2><ul class="list">${d.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></section>
  ${ds.length ? `<section class="wrap block"><h2>Salidas</h2><div class="grid">${ds.slice(0, 12).map(sailingCard).join('')}</div></section>` : `<section class="wrap block"><form class="alert-crit" data-dest="${d.slug}"><h2 class="h-sm">Avísame de cruceros por ${esc(d.name)}</h2><label><span>Mes que te interesa</span><select name="mes"><option value="">Cualquiera</option>${d.months.map((m) => `<option value="${m}">${cap(MONTHS[m - 1])}</option>`).join('')}</select></label><label><span>Precio máx. por persona (€)</span><input name="max" type="number" min="0" step="50"></label><label><span>Tu email</span><input name="email" type="email" required autocomplete="email"></label><input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true"><button class="btn" type="submit">Crear alerta</button><p class="form-msg" role="status" aria-live="polite"></p></form></section>`}
  <section class="wrap block">${shareBar(`Cruceros por ${d.name}:`, url)}</section>`;
  return layout({ title: `Cruceros por ${d.name}: mejor época, puertos y consejos`, desc: `Todo sobre los cruceros por ${d.name}: cuándo ir, cuántas noches, puertos típicos, si se mueve el barco y consejos.`, url, body, ogType: 'article', crumbs: [['Inicio', '/'], ['Destinos', '/destinos/'], [d.name, url]] });
}

function monthsIndex() {
  const body = `<section class="wrap block page-h"><h1>Cruceros por meses: adónde ir en cada época</h1><p class="lead-p">Elige mes y te decimos qué destinos están en temporada.</p><div class="months big">${MONTHS.map((m) => `<a class="m on" href="/meses/${m}/">${cap(m)}</a>`).join('')}</div></section>`;
  return layout({ title: 'Cruceros por meses: qué destino elegir', desc: 'Qué destinos de crucero están en temporada cada mes del año.', url: '/meses/', body, crumbs: [['Inicio', '/'], ['Por meses', '/meses/']] });
}

function monthPage(i) {
  const m = MONTHS[i - 1];
  const inS = DESTINATIONS.filter((d) => d.months.includes(i));
  const outS = DESTINATIONS.filter((d) => !d.months.includes(i));
  const url = `/meses/${m}/`;
  const tips = [];
  if ([6, 7, 8].includes(i)) tips.push('Es temporada alta en Europa: reserva con antelación si viajas en vacaciones escolares.', 'Hace calor en las visitas: aprovecha las primeras horas en cada puerto.');
  if ([12, 1, 2].includes(i)) tips.push('Canarias y el Caribe son la apuesta segura de sol.', 'En el Mediterráneo hay salidas con precios más bajos, aunque el tiempo es más fresco.');
  if ([3, 4, 5, 9, 10, 11].includes(i)) tips.push('Entretemporada: buenos precios y menos gente en los puertos.', 'Mira las travesías transatlánticas de reposicionamiento.');
  const body = `<section class="wrap block page-h"><h1>Cruceros en ${m}: adónde ir</h1><p class="lead-p">En ${m} las navieras suelen programar más salidas hacia ${inS.length ? inS.map((d) => d.name).join(', ') : 'pocos destinos'}.</p></section>
  <section class="wrap block"><h2>Destinos en temporada en ${m}</h2><div class="dest-grid">${inS.map((d) => destCard(d, `<small>${esc(d.sea)}</small>`)).join('')}</div></section>
  ${outS.length ? `<section class="wrap block"><h2>Fuera de temporada en ${m}</h2><p class="muted">${outS.map((d) => `<a href="/destinos/${d.slug}/">${esc(d.name)}</a>`).join(' · ')}</p></section>` : ''}
  <section class="wrap block split"><div><h2>Consejos para ${m}</h2><ul class="list">${tips.map((t) => `<li>${t}</li>`).join('')}<li>Crea una <a href="/herramientas/alerta-precio/">alerta de precio</a> para no perderte las bajadas.</li></ul></div><div><h2>Otros meses</h2><div class="months">${MONTHS.map((x, j) => `<a class="m${j + 1 === i ? ' on' : ''}" href="/meses/${x}/">${x.slice(0, 3)}</a>`).join('')}</div></div></section>`;
  return layout({ title: `Cruceros en ${m}: mejores destinos`, desc: `Adónde ir de crucero en ${m}: destinos en temporada, estado de la mar y consejos.`, url, body, crumbs: [['Inicio', '/'], ['Por meses', '/meses/'], [cap(m), url]] });
}

function portsIndex() {
  const card = (p) => `<a class="card port-card" href="/puertos/${p.slug}/"><span class="eyebrow">${esc(p.region)}</span><h3>${esc(p.name)}</h3><p>${esc(p.text)}</p></a>`;
  const body = `<section class="wrap block page-h"><h1>Puertos de embarque de cruceros</h1><p class="lead-p">Empieza tu crucero cerca de casa o vuela al puerto que más te convenga.</p>
  <h2>España</h2><div class="grid grid-3">${HOME_PORTS.map(card).join('')}</div>
  <h2>América</h2><div class="grid grid-3">${AMERICA_PORTS.map(card).join('')}</div>
  <p><a href="/guias/cruceros-desde-espana-sin-avion/">Guía: cruceros desde España sin coger avión →</a></p></section>`;
  return layout({ title: 'Puertos de cruceros: Barcelona, Málaga, Valencia, Miami…', desc: 'Puertos de embarque de cruceros en España y América: qué esperar, excursiones, vuelos y consejos.', url: '/puertos/', body, crumbs: [['Inicio', '/'], ['Puertos', '/puertos/']] });
}

function portPage(p) {
  const ps = sailings.filter((x) => x.depart_port_slug === p.slug || slugify(x.depart_port || '') === p.slug);
  const city = p.name.split(' (')[0];
  const pph = portPhotos[p.name] || portPhotos[city];
  const body = `<section class="wrap block page-h${pph ? ' port-h' : ''}"><div><span class="eyebrow">${esc(p.region)}</span><h1>Cruceros desde ${esc(p.name)}</h1><p class="lead-p">${esc(p.text)}</p><p><a class="btn" href="/ofertas/desde-${p.slug}/">Ver ofertas desde ${esc(city)}</a></p></div>${pph ? `<figure class="port-fig"><img src="${pph.thumb}" srcset="${pph.thumb} 640w, ${pph.large} 1280w" sizes="(max-width: 900px) 100vw, 520px" alt="Puerto de ${esc(city)}" width="640" height="${Math.round(640 / (pph.ratio || 1.5))}" fetchpriority="high"><figcaption class="credit">Foto: <a href="${esc(pph.page)}" target="_blank" rel="noopener">${esc(pph.author)}</a> · ${esc(pph.license)} · Wikimedia Commons</figcaption></figure>` : ''}</section>
  ${ps.length ? `<section class="wrap block"><h2>Próximas salidas desde ${esc(city)}</h2><div class="grid">${ps.slice(0, 12).map(sailingCard).join('')}</div></section>` : ''}
  <section class="wrap block grid grid-3">
    <a class="tool tool-light" href="/ofertas/desde-${p.slug}/"><h2>Ofertas desde ${esc(city)}</h2><p>Todas las salidas con precio real y nota de la oferta.</p><span class="btn btn-sm">Ver ofertas →</span></a>
    <a class="tool tool-light" href="/herramientas/precio-real/"><h2>Calcula el precio real</h2><p>Suma el traslado al puerto, el aparcamiento y los extras de a bordo.</p><span class="btn btn-sm">Calcular →</span></a>
    <a class="tool tool-light" href="/herramientas/tiempo-puerto/"><h2>El tiempo en ${esc(city)}</h2><p>Previsión de 14 días para el día de embarque.</p><span class="btn btn-sm">Ver tiempo →</span></a>
  </section>
  <div class="wrap">${tripBox(city, { sid: 'puerto-' + p.slug, title: `Llegar al puerto de ${city}: hotel, traslado y vuelo` })}</div>
  ${['miami', 'fort-lauderdale', 'port-canaveral'].includes(p.slug) ? `<div class="wrap"><div class="side-card aff-card"><h2 class="h-sm">🎢 ¿Días extra en Florida?</h2><p class="small">Muchos cruceristas suman Disney World o Universal Orlando antes o después del crucero. Entradas con descuento:</p><a class="btn btn-sm" href="${cj('orlando', null, 'puerto-' + p.slug)}" target="_blank" rel="sponsored noopener" data-aff="cj-orlando">Ver entradas a parques →</a><p class="muted small">Enlace de afiliado (Undercover Tourist).</p></div></div>` : ''}
  <section class="wrap block"><h2>Consejos para embarcar en ${esc(city)}</h2><ul class="list">
    <li>Llega con margen: el embarque suele cerrar unas horas antes de zarpar y en temporada alta hay colas.</li>
    <li>Comprueba en tu tarjeta de embarque la terminal exacta: en los puertos grandes hay varias.</li>
    <li>Si vas en coche, reserva el aparcamiento con antelación; si vas en tren o avión, calcula el traslado hasta el muelle.</li>
    <li>Ten a mano el documento que exige tu itinerario. <a href="/guias/documentacion-crucero/">Guía de documentación</a>.</li>
  </ul></section>
  <section class="wrap block"><h2>Barcos que puedes comparar</h2><p class="muted">Las navieras cambian sus puertos de embarque cada temporada. Elige barco y comprueba en la web de reserva si sale desde ${esc(city)}.</p><div class="grid">${featured.slice(0, 4).map((s) => shipCard(s)).join('')}</div></section>
  <div class="wrap">${forumBlock('puerto:' + p.slug, `Dudas sobre el puerto de ${city}`, { tabs: [['question', 'Preguntas'], ['comment', 'Consejos']] })}</div>`;
  return layout({ title: `Cruceros desde ${city}: puerto, excursiones y consejos`, desc: `Todo para embarcar en un crucero desde ${p.name}: puerto, excursiones, vuelos y cómo calcular el precio real.`, url: `/puertos/${p.slug}/`, body, crumbs: [['Inicio', '/'], ['Puertos', '/puertos/'], [city, `/puertos/${p.slug}/`]] });
}

function excursions() {
  const body = `<section class="wrap block page-h"><h1>Excursiones en cada puerto, más baratas que las de la naviera</h1><p class="lead-p">Las excursiones del barco son cómodas, pero suelen ser caras. Reserva entradas y tours por tu cuenta en Booking.com (enlace de afiliado: tú pagas lo mismo).</p>
  <h2>Escalas del Mediterráneo y Atlántico</h2><div class="ports">${SCALE_PORTS.map(([n, c]) => `<a class="port" href="${cj('attr', null, 'excursiones-' + c)}" target="_blank" rel="sponsored noopener" data-aff="cj-attr" data-page="/excursiones/"><b>${esc(n)}</b><span>Ver excursiones →</span></a>`).join('')}</div>
  <h2>Puertos de embarque</h2><div class="ports">${allPorts.filter((p) => p.civ).map((p) => `<a class="port" href="${cj('attr', null, 'excursiones-' + p.slug)}" target="_blank" rel="sponsored noopener" data-aff="cj-attr" data-page="/excursiones/"><b>${esc(p.name)}</b><span>Ver excursiones →</span></a>`).join('')}</div>
  <div class="tip"><b>Importante:</b> si vas por tu cuenta y llegas tarde, el barco no te espera. Deja al menos hora y media de margen. ¿Quieres compartir guía o taxi? Propónlo en el <a href="/comunidad/">grupo de tu salida</a>.</div>
  <p><a href="/guias/excursiones-por-libre/">Guía: excursiones con la naviera o por libre →</a></p></section>`;
  return layout({ title: 'Excursiones en cruceros por tu cuenta: puerto a puerto', desc: 'Excursiones en español en Roma, Nápoles, Florencia, Marsella, Malta, Atenas, Santorini, Dubrovnik y más, más baratas que las del barco.', url: '/excursiones/', body, crumbs: [['Inicio', '/'], ['Excursiones', '/excursiones/']] });
}

const hasTag = (s, tag) => (tag.startsWith('tier:') ? s.tier === tag.slice(5) : s.tags.some((x) => x[0] === tag));
const BEST_FOR = [
  ['precio-medio', 'tier:estandar', 'Los mejores cruceros de precio medio', 'Navieras de gama media (MSC, Costa, Royal Caribbean, Norwegian, Carnival…): la mejor calidad sin pagar lujo.'],
  ['familias', 'familias', 'Los mejores cruceros para familias', 'Barcos grandes (más de 160.000 GT) con atracciones, ordenados por nota.'],
  ['espanol', 'espanol', 'Los mejores cruceros con español a bordo', 'Navieras que trabajan con el mercado español en el Mediterráneo.'],
  ['lujo', 'lujo', 'Los mejores cruceros de lujo', 'Navieras de gama lujo.'],
  ['parejas', 'premium', 'Los mejores cruceros para parejas', 'Navieras premium: ambiente más tranquilo y cuidado.'],
  ['pequenos', 'pequeno', 'Los mejores barcos pequeños', 'Menos de 70.000 GT: menos colas y puertos más pequeños.'],
  ['nuevos', 'nuevo', 'Los mejores barcos nuevos', 'Estrenados en los últimos 3 años.'],
];
function rankTable(list, { full = false } = {}) {
  const pt = (s, k) => { const x = s.score.parts.find((p) => p.k === k); return x ? String(x.pts).replace('.', ',') : '—'; };
  return `<div class="table-wrap"><table class="rank-t sortable"><thead><tr><th><button class="th-sort" type="button">#</button></th><th>Barco</th><th>Naviera</th><th><button class="th-sort" type="button">Nota</button></th>${full ? PARTS.map((P) => `<th><button class="th-sort" type="button">${P.label.split(' ')[0]}</button><small>/${P.max}</small></th>`).join('') : ''}</tr></thead><tbody>${list.map((s, i) => `<tr data-line="${s.lineSlug}"><td>${i + 1}</td><td><a href="/barcos/${s.slug}/">${esc(s.name)}</a></td><td>${esc(s.lineShort)}</td><td data-v="${s.sc}">${scoreBadge(s.sc)}</td>${full ? PARTS.map((P) => `<td>${pt(s, P.k)}</td>`).join('') : ''}</tr>`).join('')}</tbody></table></div>`;
}
function rankings() {
  const table = (list, col, label) => `<div class="table-wrap"><table class="rank-t"><thead><tr><th>#</th><th>Barco</th><th>Naviera</th><th>${label}</th></tr></thead><tbody>${list.map((s, i) => `<tr><td>${i + 1}</td><td><a href="/barcos/${s.slug}/">${esc(s.name)}</a></td><td>${esc(s.lineShort)}</td><td>${col(s)}</td></tr>`).join('')}</tbody></table></div>`;
  const big = [...ships].sort((a, b) => b.gt - a.gt).slice(0, 20);
  const roomy = ships.filter((s) => s.ratio && s.pax > 1500).sort((a, b) => b.ratio - a.ratio).slice(0, 20);
  const newest = [...ships].sort((a, b) => b.year - a.year || b.gt - a.gt).slice(0, 20);
  const lines = lineList.map((l) => ({ l, best: scored.filter((s) => s.line === l.full) })).filter((x) => x.best.length);
  const y = new Date().getFullYear();
  const body = `<section class="wrap block page-h"><h1>Ranking de cruceros ${y}: los mejores barcos con nota de 0 a 100</h1><p class="lead-p">${scored.length} barcos puntuados con datos públicos y verificables: inspecciones sanitarias oficiales, espacio por pasajero, tripulación, antigüedad y opiniones verificadas. <a href="/metodologia/">Así calculamos la nota</a>.</p>${shareBar(`El ranking de los mejores cruceros de ${y}:`, '/rankings/')}</section>
  <section class="wrap block" id="top"><h2>Top 100 barcos de crucero</h2>
  <form class="filters filters-inline" id="rank-filter"><label><span>Naviera</span><select name="linea"><option value="">Todas</option>${lines.map(({ l, best }) => `<option value="${l.slug}">${esc(l.short)} (${best.length})</option>`).join('')}</select></label></form>
  ${rankTable(scored.slice(0, 100), { full: true })}${scored.length > 100 ? `<details class="az"><summary>Ver los ${scored.length - 100} barcos restantes</summary>${rankTable(scored.slice(100), { full: true })}</details>` : ''}</section>
  <section class="wrap block" id="mejores-para"><h2>Los mejores según para qué</h2><div class="grid grid-3">${BEST_FOR.map(([slug, tag, t]) => { const l = scored.filter((s) => hasTag(s, tag)).slice(0, 3); return l.length ? `<a class="tool tool-light" href="/rankings/${slug}/"><h3>${esc(t)}</h3><ol class="small">${l.map((s) => `<li>${esc(s.name)} · ${s.sc}</li>`).join('')}</ol></a>` : ''; }).join('')}</div></section>
  <section class="wrap block" id="navieras"><h2>El mejor barco de cada naviera</h2><div class="table-wrap"><table class="rank-t"><thead><tr><th>Naviera</th><th>Mejor barco</th><th>Nota</th><th>Media de la flota</th></tr></thead><tbody>${lines.sort((a, b) => b.best[0].sc - a.best[0].sc).map(({ l, best }) => `<tr><td><a href="/navieras/${l.slug}/">${esc(l.short)}</a></td><td><a href="/barcos/${best[0].slug}/">${esc(best[0].name)}</a></td><td>${scoreBadge(best[0].sc)}</td><td>${Math.round(best.reduce((a, s) => a + s.sc, 0) / best.length)} (${best.length} barcos)</td></tr>`).join('')}</tbody></table></div></section>
  <section class="wrap block" id="grandes"><h2>Los 20 barcos más grandes</h2>${table(big, (s) => fmt(s.gt) + ' GT', 'Arqueo')}</section>
  <section class="wrap block" id="espaciosos"><h2>Los 20 barcos con más espacio por pasajero</h2><p class="muted small">Arqueo bruto ÷ pasajeros, barcos de más de 1.500 pasajeros.</p>${table(roomy, (s) => dec(s.ratio), 'Índice')}</section>
  <section class="wrap block" id="nuevos"><h2>Los 20 barcos más nuevos</h2>${table(newest, (s) => s.year, 'Año')}</section>
  <section class="wrap block"><p class="muted small">Fuentes: CDC Vessel Sanitation Program, Wikipedia y opiniones verificadas de la comunidad. Actualizado el ${BUILD_DATE}.</p></section>`;
  return layout({ title: `Ranking de cruceros ${y}: los mejores barcos del mundo con nota 0-100`, desc: `Los ${scored.length} mejores barcos de crucero puntuados de 0 a 100 con datos oficiales: higiene (CDC), espacio, tripulación, antigüedad y opiniones. Mejores para familias, parejas, lujo y con español a bordo.`, url: '/rankings/', body, crumbs: [['Inicio', '/'], ['Ranking', '/rankings/']],
    schema: [{ '@context': 'https://schema.org', '@type': 'ItemList', name: `Mejores barcos de crucero ${y}`, itemListElement: scored.slice(0, 20).map((s, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE + '/barcos/' + s.slug + '/', name: s.name })) }] });
}
function bestForPage([slug, tag, title, desc]) {
  const l = scored.filter((s) => hasTag(s, tag));
  const y = new Date().getFullYear();
  const body = `<section class="wrap block page-h"><h1>${esc(title)} (${y})</h1><p class="lead-p">${esc(desc)} Ordenados por MejorCrucero Score. <a href="/metodologia/">Metodología</a>.</p>${shareBar(title + ':', '/rankings/' + slug + '/')}</section>
  <section class="wrap block"><div class="grid">${l.slice(0, 12).map((s) => shipCard(s)).join('')}</div></section>
  <section class="wrap block"><h2>Clasificación completa</h2>${rankTable(l)}</section>`;
  return layout({ title: `${title} ${y}`, desc: `${title} según el MejorCrucero Score: ${l.slice(0, 3).map((s) => s.name).join(', ')} y más, con nota de 0 a 100 y datos verificables.`, url: '/rankings/' + slug + '/', body, crumbs: [['Inicio', '/'], ['Ranking', '/rankings/'], [title, '/rankings/' + slug + '/']] });
}
function methodology() {
  const ex = scored[0];
  const body = `<section class="wrap block page-h narrow"><h1>Cómo calculamos el MejorCrucero Score</h1><p class="lead-p">Una nota de 0 a 100 para cada barco, hecha solo con datos que cualquiera puede comprobar. Sin notas pagadas: las comisiones de afiliación no cambian ni la nota ni el orden.</p>
  <h2>Los 5 indicadores</h2><div class="table-wrap"><table class="spec"><thead><tr><th>Indicador</th><th>Puntos</th><th>Cómo se calcula</th></tr></thead><tbody>${PARTS.map((P) => `<tr><th scope="row">${P.label}</th><td>${P.max}</td><td>${esc(P.how)}</td></tr>`).join('')}</tbody></table></div>
  <h2>Cuando falta un dato</h2><p>Si no hay dato fiable de un indicador (por ejemplo, barcos que nunca hacen escala en EE. UU. no tienen inspección del CDC), ese indicador no cuenta y la nota se reescala sobre los puntos disponibles. En cada ficha indicamos qué datos faltan. Si un barco no tiene al menos el espacio por pasajero y otros dos indicadores, <b>no le damos nota</b>: preferimos "sin datos" a una nota inventada.</p>
  <h2>Escala</h2><ul><li><b>85–100</b> Excelente</li><li><b>75–84</b> Muy bueno</li><li><b>65–74</b> Bueno</li><li><b>50–64</b> Correcto</li><li><b>0–49</b> Flojo</li></ul>
  ${ex ? `<h2>Ejemplo: ${esc(ex.name)} (${ex.sc}/100)</h2><ul>${ex.score.parts.map((p) => `<li>${esc(p.label)}: ${String(p.pts).replace('.', ',')} de ${p.max} — ${esc(p.detail)}</li>`).join('')}</ul>` : ''}
  <h2>Fuentes</h2><ul><li>Inspecciones sanitarias: <a href="https://wwwn.cdc.gov/InspectionQueryTool/InspectionSearch.aspx" target="_blank" rel="noopener">CDC Vessel Sanitation Program</a> (Centros para el Control y la Prevención de Enfermedades de EE. UU.).</li><li>Arqueo, pasajeros, tripulación, eslora y reformas: artículos de Wikipedia de cada barco (enlazados en cada ficha).</li><li>Opiniones: comunidad de MejorCrucero, con moderación y detección de spam. Las opiniones verificadas con la confirmación de reserva pesan igual pero llevan insignia.</li></ul>
  <h2 id="ofertas">La nota de cada oferta (0–100)</h2><p>Cada salida tiene su propia nota, distinta de la del barco. Mide si el precio es bueno:</p><ul><li><b>Hasta 75 puntos</b>: precio real por noche (tarifa + tasas portuarias + cuota de servicio) frente a cruceros parecidos: mismo destino, duración similar y salida en un margen de 60 días. Cuanto más barato que ellos, más puntos.</li><li><b>Hasta 15 puntos</b>: descuento sobre el precio de catálogo que publica la propia naviera.</li><li><b>10 puntos</b> si está en su precio más bajo desde que lo seguimos, y <b>5</b> si ha bajado un 5% o más.</li></ul><p>85 o más = <b>chollo</b>; 70–84 = buen precio; 45–69 = precio normal. Los precios se leen dos veces al día de las webs oficiales de las navieras.</p>
  <h2>¿Ves un error?</h2><p>Cada ficha tiene un botón para reportarlo. Revisamos y corregimos con la fuente delante.</p><p class="muted small">Última actualización: ${BUILD_DATE}. La nota se recalcula a diario.</p></section>`;
  return layout({ title: 'Cómo calculamos el MejorCrucero Score (nota de 0 a 100)', desc: 'Metodología de la nota de 0 a 100 de los barcos de crucero: higiene oficial del CDC, espacio por pasajero, tripulación, modernidad y opiniones verificadas.', url: '/metodologia/', body, crumbs: [['Inicio', '/'], ['Metodología', '/metodologia/']] });
}
function embedPage(s) {
  const c = s.sc >= 85 ? '#065f46' : s.sc >= 75 ? '#166534' : s.sc >= 65 ? '#92400e' : s.sc >= 50 ? '#9a3412' : '#991b1b';
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><link rel="icon" href="${SITE}/favicon.svg"><title>${esc(s.name)} · MejorCrucero Score</title><style>body{margin:0;font:14px/1.3 system-ui,sans-serif}a{display:flex;gap:12px;align-items:center;padding:12px;border:1px solid #e2e8f0;border-radius:12px;color:#0f172a;text-decoration:none;background:#fff;height:94px;box-sizing:border-box}b.n{display:grid;place-items:center;min-width:64px;height:64px;border-radius:14px;background:${c};color:#fff;font-size:28px}small{color:#64748b;display:block}</style></head><body><a href="${SITE}/barcos/${s.slug}/" target="_blank" rel="noopener"><b class="n">${s.sc}</b><span><strong>${esc(s.name)}</strong><small>${scoreLabel(s.sc)} · nº ${s.rank} de ${scored.length}</small><small>MejorCrucero Score</small></span></a></body></html>`;
}

// ---------- herramientas ----------
const TOOLS = [
  ['asistente', '🤖', 'Asistente IA', 'Cuéntale cómo quieres viajar y te recomienda barcos.'],
  ['precio-real', '💶', 'Calculadora del precio real', 'Propinas, bebidas, extras, presupuesto total y comparar dos ofertas.'],
  ['alerta-precio', '🔔', 'Alerta de bajada de precio', 'Vigila tu reserva y genera el email para reclamar.'],
  ['que-crucero', '🧭', '¿Qué crucero es para mí?', 'Test de 7 preguntas con barcos y destinos recomendados.'],
  ['comparar', '⚖️', 'Comparar barcos', 'Hasta 3 barcos frente a frente.'],
  ['comparar-salidas', '📅', 'Comparar salidas', 'Dos salidas lado a lado, por precio por noche.'],
  ['checklist', '✅', 'Checklist del crucero', 'Maleta y documentos según tu itinerario.'],
  ['cuenta-atras', '⏳', 'Cuenta atrás y recordatorios', 'Días que faltan y avisos en tu calendario.'],
  ['mareometro', '🌊', 'Mareómetro', 'Qué zonas y meses suelen estar más movidos.'],
  ['conversor-horario', '🕐', 'Conversor horario', 'Hora del puerto frente a la del barco y la tuya.'],
  ['reclamar', '✉️', 'Reclamar una bajada de precio', 'Te escribimos el email para pedir la diferencia.'],
  ['camarotes', '🛏️', 'Buscador de camarotes', 'Lo que cuenta la comunidad de cada número de camarote.'],
  ['propinas', '💵', 'Simulador de propinas', 'Cuánto pagarás de cargo de servicio según naviera, noches y personas.'],
  ['paquete-bebidas', '🍹', '¿Me compensa el paquete de bebidas?', 'Tus consumos frente al precio del paquete.'],
  ['presupuesto-compartido', '🧮', 'Presupuesto compartido', 'Quién ha pagado qué y cómo quedar en paz entre amigos.'],
  ['tiempo-puerto', '🌤️', 'El tiempo en tu puerto', 'Previsión de 14 días para puertos de salida y escala.'],
  ['maleta', '🧳', 'Maleta según destino y mes', 'Lista de equipaje adaptada al clima de tu crucero.'],
  ['documentacion', '🛂', 'Documentación por destino', 'Qué papeles necesitas y dónde comprobarlo en fuentes oficiales.'],
  ['glosario', '📖', 'Glosario del crucerista', 'Tender, muster drill, todo incluido… explicado en cristiano.'],
];
const toolCrumbs = (n, u) => [['Inicio', '/'], ['Herramientas', '/herramientas/'], [n, u]];
const shipDatalist = (id) => `<datalist id="${id}">${ships.map((s) => `<option value="${esc(s.name)}">`).join('')}</datalist>`;

function toolsIndex() {
  const body = `<section class="wrap block page-h"><h1>Herramientas para cruceristas</h1><p class="lead-p">Gratis y sin registro.</p><div class="grid grid-3">${TOOLS.map(([s, e, n, d]) => `<a class="tool tool-light" href="/herramientas/${s}/"><h2>${e} ${esc(n)}</h2><p>${esc(d)}</p></a>`).join('')}</div></section>`;
  return layout({ title: 'Herramientas para cruceros', desc: 'Calculadora del precio real, alertas de precio, asistente IA, comparadores, checklist, mareómetro y más.', url: '/herramientas/', body, crumbs: [['Inicio', '/'], ['Herramientas', '/herramientas/']] });
}

function toolPrice() {
  const opts = [...lineList].sort((a, b) => a.short.localeCompare(b.short)).map((l) => `<option value="${l.slug}" data-tip="${l.tip ?? ''}">${esc(l.short)}</option>`).join('');
  const offer = (n) => `<fieldset class="offer" data-offer="${n}"><legend>Oferta ${n.toUpperCase()}${n === 'b' ? ' <small class="muted">(opcional, para comparar)</small>' : ''}</legend>
      <label><span>Naviera</span><select name="line_${n}">${opts}</select></label>
      <label><span>Precio total de la reserva (€)</span><input name="fare_${n}" type="number" min="0" step="1" inputmode="numeric" ${n === 'a' ? 'value="1200" required' : ''}></label>
      <label><span>Noches</span><input name="nights_${n}" type="number" min="1" max="60" value="7"></label>
      <label><span>Cargo de servicio por persona y noche</span><span class="cur-row"><input name="tip_${n}" type="number" min="0" step="0.5" value="16" aria-label="Importe del cargo de servicio"><select name="tipcur_${n}" aria-label="Moneda del cargo"><option value="USD">$</option><option value="EUR">€</option></select></span><small class="tip-note muted"></small></label>
      <label><span>Paquete de bebidas por persona y día (€)</span><input name="drinks_${n}" type="number" min="0" value="0"></label>
      <label class="chk"><input name="taxes_${n}" type="checkbox" checked> <span>Tasas portuarias incluidas</span></label>
      <label><span>Tasas si no están incluidas (€ total)</span><input name="taxAmt_${n}" type="number" min="0" value="0"></label>
    </fieldset>`;
  const body = `<section class="wrap block page-h"><h1>Calculadora del precio real de un crucero</h1><p class="lead-p">El precio de portada casi nunca es lo que acabas pagando. Mete tu oferta (o dos para compararlas) y te sumamos todo lo demás.</p></section>
  <section class="wrap block calc-wrap"><form class="calc" id="calc">
    <fieldset><legend>Viajeros</legend><label><span>Personas en el camarote</span><input name="people" type="number" min="1" max="6" value="2"></label></fieldset>
    ${offer('a')}${offer('b')}
    <fieldset><legend>Presupuesto total del viaje</legend>
      <label><span>Wifi (€ total)</span><input name="wifi" type="number" min="0" value="0"></label>
      <label><span>Excursiones (€ total)</span><input name="tours" type="number" min="0" value="0"></label>
      <label><span>Vuelo o tren al puerto (€ total)</span><input name="travel" type="number" min="0" value="0"></label>
      <label><span>Hotel la noche antes (€)</span><input name="hotel" type="number" min="0" value="0"></label>
      <label><span>Aparcamiento (€ total)</span><input name="parking" type="number" min="0" value="0"></label>
      <label><span>Seguro de viaje (€ total)</span><input name="insurance" type="number" min="0" value="0"></label>
    </fieldset>
  </form>
  <div class="calc-out" aria-live="polite"><p class="muted">Precio real total · Oferta A</p><p class="big" id="out-total">—</p><p id="out-pp" class="muted"></p><p id="out-ppn" class="muted"></p><p id="out-extra" class="extra"></p>
  <div id="out-b" hidden><hr><p class="muted">Oferta B</p><p class="big big-sm" id="out-total-b">—</p><p id="out-ppn-b" class="muted"></p><p id="out-win" class="extra"></p></div>
  <p class="muted small" id="fx-note"></p>
  <div class="share"><button class="btn js-share-calc" type="button">Compartir resultado</button><button class="btn btn-ghost btn-on-dark js-card-calc" type="button">Descargar tarjeta</button></div>
  <p class="muted small">Cargos de servicio de referencia: mercado EE. UU. (Cruzely, feb-2026). En Europa pueden ser distintos o venir incluidos: ajústalo con lo que diga tu reserva.</p></div>
  </section>`;
  return layout({ title: 'Calculadora del precio real de un crucero (propinas incluidas)', desc: 'Calcula cuánto cuesta de verdad tu crucero y compara dos ofertas: cargos de servicio, bebidas, wifi, excursiones, vuelos, hotel y parking.', url: '/herramientas/precio-real/', body, crumbs: toolCrumbs('Precio real', '/herramientas/precio-real/') });
}

function toolAlert() {
  const body = `<section class="wrap block page-h"><h1>¿Ha bajado el precio de tu crucero?</h1><p class="lead-p">Es la queja número uno de los cruceristas: reservas y luego sale más barato. Guarda tu reserva y el precio que pagaste; te ayudamos a vigilarlo y a reclamar.</p></section>
  <section class="wrap block split">
  <div>
  <details class="paste"><summary>📋 Pega el email de confirmación y lo rellenamos por ti</summary><label class="sr" for="paste-t">Texto del email</label><textarea id="paste-t" rows="6" placeholder="Pega aquí el texto del email de confirmación de tu reserva"></textarea><button class="btn btn-sm js-parse" type="button">Leer email</button><p class="form-msg" role="status" aria-live="polite"></p><p class="muted small">El texto se procesa para rellenar el formulario y no se guarda.</p></details>
  <form class="alert-form" id="alert-form">
    <label><span>Barco</span><input name="ship" list="ships-dl2" required placeholder="Ej.: MSC World Europa">${shipDatalist('ships-dl2')}</label>
    <label><span>Fecha de salida</span><input name="date" type="date" required></label>
    <label><span>Tipo de camarote</span><select name="cabin"><option>Interior</option><option>Exterior</option><option>Balcón</option><option>Suite</option></select></label>
    <label><span>Precio que pagaste (€ total)</span><input name="price" type="number" min="1" required inputmode="numeric"></label>
    <label><span>Dónde reservaste</span><input name="where" placeholder="Naviera, agencia…"></label>
    <label><span>Número de reserva (opcional)</span><input name="ref" maxlength="30"></label>
    <label><span>Tu email (para avisarte)</span><input name="email" type="email" autocomplete="email" placeholder="tu@email.com"></label>
    <input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
    <button class="btn" type="submit">Guardar y vigilar</button><p class="form-msg" role="status" aria-live="polite"></p>
  </form></div>
  <div><h2>Mis cruceros vigilados</h2><div id="alert-list" class="alert-list"><p class="muted">Todavía no has guardado ninguno.</p></div>
  <div class="tip"><b>Cómo reclamar si baja:</b> apunta el precio que ves hoy en tu crucero y pulsa "Email de reclamación". Muchas navieras permiten reajustar la tarifa o dar crédito a bordo antes del pago final, pero depende de las condiciones de tu reserva.</div></div>
  </section>`;
  return layout({ title: 'Alerta de bajada de precio de cruceros', desc: 'Guarda tu reserva de crucero, vigila si baja el precio y genera el email para reclamar la diferencia o crédito a bordo.', url: '/herramientas/alerta-precio/', body, crumbs: toolCrumbs('Alerta de precio', '/herramientas/alerta-precio/') });
}

function toolClaim() {
  const body = `<section class="wrap block page-h"><h1>Reclamar una bajada de precio de tu crucero</h1><p class="lead-p">Si tu crucero ha bajado después de reservar, pide la diferencia o crédito a bordo. Rellena los datos y te escribimos el email.</p></section>
  <section class="wrap block split"><form class="claim-form alert-form" id="claim-form">
    <label><span>Tu nombre</span><input name="name" required autocomplete="name"></label><label><span>Barco</span><input name="ship" list="ships-dl3" required>${shipDatalist('ships-dl3')}</label>
    <label><span>Fecha de salida</span><input name="date" type="date" required></label><label><span>Número de reserva</span><input name="ref" required></label>
    <label><span>Categoría de camarote</span><input name="cabin" required placeholder="Ej.: Balcón"></label>
    <label><span>Precio pagado (€)</span><input name="price" type="number" required></label><label><span>Precio actual (€)</span><input name="now" type="number" required></label>
    <label><span>Qué pides</span><select name="ask"><option value="diff">Que me devuelvan la diferencia</option><option value="credit">Crédito a bordo por la diferencia</option><option value="reprice">Reajustar la tarifa</option></select></label>
  </form><div><h2>Tu email</h2><label class="sr" for="claim-out">Email generado</label><textarea id="claim-out" rows="14" readonly></textarea><div class="share"><button class="btn js-copy" data-copy="#claim-out" type="button">Copiar</button><a class="btn btn-ghost" id="claim-mail" href="mailto:">Abrir en mi correo</a></div><p class="muted small">Adjunta una captura del precio actual para la misma salida y categoría.</p></div></section>`;
  return layout({ title: 'Reclamar bajada de precio de un crucero: email', desc: 'Genera el email para pedir la diferencia, crédito a bordo o reajuste de tarifa si tu crucero ha bajado de precio.', url: '/herramientas/reclamar/', body, crumbs: toolCrumbs('Reclamar', '/herramientas/reclamar/') });
}

function toolQuiz() {
  const q = (name, legend, opts) => `<fieldset><legend>${legend}</legend><div class="opts">${opts.map(([v, t], i) => `<label><input type="radio" name="${name}" value="${v}" ${i === 0 ? 'required' : ''}> ${t}</label>`).join('')}</div></fieldset>`;
  const body = `<section class="wrap block page-h"><h1>¿Qué crucero es para mí?</h1><p class="lead-p">Siete preguntas y te enseñamos los barcos y destinos que mejor encajan contigo.</p></section>
  <section class="wrap block"><form class="quiz" id="quiz">
    ${q('who', '¿Con quién viajas?', [['family', 'Familia con niños'], ['couple', 'En pareja'], ['friends', 'Con amigos'], ['senior', 'Viaje tranquilo']])}
    ${q('size', '¿Qué tipo de barco te apetece?', [['giant', 'Gigante, con atracciones'], ['mid', 'Grande pero manejable'], ['small', 'Pequeño y exclusivo'], ['any', 'Me da igual']])}
    ${q('budget', '¿Presupuesto?', [['estandar', 'Ajustado'], ['premium', 'Medio-alto'], ['lujo', 'Lo que haga falta'], ['any', 'No lo sé']])}
    ${q('es', '¿Es importante el español a bordo?', [['yes', 'Sí, mucho'], ['no', 'Me apaño en inglés']])}
    ${q('new', '¿Barco nuevo?', [['yes', 'Lo más nuevo posible'], ['no', 'Me importa más el precio']])}
    ${q('month', '¿Cuándo quieres ir?', [['summer', 'Verano'], ['winter', 'Invierno'], ['spring', 'Primavera u otoño'], ['any', 'Cuando sea']])}
    ${q('plane', '¿Te importa coger avión?', [['no', 'Prefiero salir desde España'], ['yes', 'Vuelo sin problema']])}
    <button class="btn" type="submit">Ver mis recomendaciones</button>
  </form><div id="quiz-dest"></div><div id="quiz-out" class="grid" aria-live="polite"></div></section>
  <script type="application/json" id="dest-meta">${JSON.stringify(DESTINATIONS.map((d) => ({ slug: d.slug, name: d.name, emoji: d.emoji, months: d.months, fromSpain: d.fromSpain })))}</script>`;
  return layout({ title: 'Test: ¿qué crucero es para mí?', desc: 'Responde 7 preguntas y descubre qué barcos y destinos de crucero encajan con tu forma de viajar.', url: '/herramientas/que-crucero/', body, crumbs: toolCrumbs('¿Qué crucero?', '/herramientas/que-crucero/') });
}

function toolAssistant() {
  const body = `<section class="wrap block page-h"><h1>Asistente IA de cruceros</h1><p class="lead-p">Cuéntale cómo quieres viajar y te recomienda barcos de nuestra base de datos, con sus motivos. No inventa precios: para eso tienes las demás herramientas.</p></section>
  <section class="wrap block chat-wrap"><div class="chat" id="chat" aria-live="polite"><div class="msg bot">¡Hola! Dime con quién viajas, qué te apetece (playa, ciudades, atracciones, tranquilidad), si quieres salir desde España y tu presupuesto aproximado.</div></div>
  <form class="chat-form" id="chat-form"><label class="sr" for="chat-q">Tu pregunta</label><textarea id="chat-q" name="q" rows="2" maxlength="600" placeholder="Ej.: Somos 2 adultos y un bebé, queremos salir desde Barcelona en mayo y no gastar mucho" required></textarea><button class="btn" type="submit">Enviar</button></form>
  <div class="chips"><button class="chip js-ask" type="button">Familia con niños, barco con toboganes y español</button><button class="chip js-ask" type="button">Pareja, tranquilo, sin niños</button><button class="chip js-ask" type="button">El barco más nuevo de MSC o Costa</button></div></section>`;
  return layout({ title: 'Asistente IA para elegir crucero', desc: 'Pregunta en lenguaje natural y el asistente de MejorCrucero te recomienda barcos con sus motivos.', url: '/herramientas/asistente/', body, crumbs: toolCrumbs('Asistente IA', '/herramientas/asistente/') });
}

function toolCompare() {
  const opts = [...ships].sort((a, b) => a.name.localeCompare(b.name)).map((s) => `<option value="${s.slug}">${esc(s.name)}</option>`).join('');
  const body = `<section class="wrap block page-h"><h1>Comparar barcos de crucero</h1><p class="lead-p">Elige hasta 3 barcos y míralos frente a frente.</p>
  <form class="cmp-form" id="cmp-form">${[0, 1, 2].map((i) => `<label><span>Barco ${i + 1}</span><select name="s${i}"><option value="">—</option>${opts}</select></label>`).join('')}</form>
  <div id="cmp-out" class="cmp-out" aria-live="polite"></div></section>`;
  return layout({ title: 'Comparar barcos de crucero frente a frente', desc: 'Compara hasta 3 barcos de crucero: naviera, año, tamaño, pasajeros, espacio por pasajero y cargos de servicio.', url: '/herramientas/comparar/', body, crumbs: toolCrumbs('Comparar', '/herramientas/comparar/') });
}

function toolCompareSailings() {
  const body = `<section class="wrap block page-h"><h1>Comparar dos salidas</h1><p class="lead-p">Pon dos salidas lado a lado: fechas, noches, escalas y precio por noche.</p>
  ${sailings.length ? `<form class="cmp-form" id="cmps-form">${[0, 1].map((i) => `<label><span>Salida ${i + 1}</span><select name="x${i}"><option value="">—</option>${sailings.map((x) => `<option value="${x.id}">${esc((bySlug[x.ship]?.name || x.ship) + ' · ' + x.date + ' · ' + (x.itinerary?.name || ''))}</option>`).join('')}</select></label>`).join('')}</form><div id="cmps-out" class="cmp-out"></div>` : `<div class="tip">Esta herramienta se activa en cuanto conectemos los precios en directo. Mientras tanto, compara dos ofertas que ya tengas en la <a href="/herramientas/precio-real/">calculadora del precio real</a> (ofertas A y B).</div>`}</section>`;
  return layout({ title: 'Comparar dos salidas de crucero', desc: 'Compara dos salidas de crucero por precio por noche, escalas y fechas.', url: '/herramientas/comparar-salidas/', body, crumbs: toolCrumbs('Comparar salidas', '/herramientas/comparar-salidas/') });
}

function toolChecklist() {
  const groups = {
    base: ['DNI o pasaporte en vigor (comprueba la caducidad)', 'Tarjeta de embarque / check-in online hecho', 'Etiquetas de equipaje de la naviera', 'Tarjeta sanitaria europea o seguro de viaje', 'Tarjeta de crédito para la cuenta a bordo', 'Cargadores (muchas navieras prohíben regletas con protección contra sobretensión)', 'Medicación habitual en el equipaje de mano', 'Bañador y chanclas en la mochila (la maleta llega tarde al camarote)', 'Ropa para la noche de gala, si la hay', 'Protector solar y gafas de sol', 'Botella reutilizable', 'Mochila pequeña para las excursiones'],
    nonEU: ['Pasaporte (obligatorio fuera de la UE en la mayoría de itinerarios)', 'Visados o autorizaciones electrónicas (ESTA, eTA…)', 'Algo de moneda local o tarjeta sin comisiones'],
    cold: ['Chaqueta impermeable', 'Capas térmicas', 'Gorro y guantes para cubierta', 'Prismáticos'],
    hot: ['Gorra o sombrero', 'Ropa ligera y transpirable', 'Repelente de mosquitos', 'Calzado para el agua'],
    baby: ['Pasaporte o DNI del bebé', 'Pañales y toallitas para todo el viaje', 'Comida infantil de tus marcas', 'Carrito ligero y plegable', 'Portabebés para excursiones', 'Termómetro y medicinas infantiles', 'Cuna pedida a la naviera'],
  };
  const names = { base: 'Imprescindible', nonEU: 'Fuera de la UE', cold: 'Frío', hot: 'Calor', baby: 'Bebé' };
  const body = `<section class="wrap block page-h"><h1>Checklist para tu crucero</h1><p class="lead-p">Marca lo que ya tienes. Se guarda en tu móvil.</p>
  <form class="chk-opts" id="chk-opts"><label class="chk"><input type="checkbox" name="nonEU"> Escalas fuera de la UE</label><label class="chk"><input type="checkbox" name="cold"> Destino frío</label><label class="chk"><input type="checkbox" name="hot"> Destino de calor</label><label class="chk"><input type="checkbox" name="baby"> Viajo con bebé</label></form>
  ${Object.entries(groups).map(([k, items]) => `<fieldset class="chk-group" data-group="${k}" ${k === 'base' ? '' : 'hidden'}><legend>${names[k]}</legend>${items.map((t, i) => `<label class="chk"><input type="checkbox" data-item="${k}-${i}"> ${esc(t)}</label>`).join('')}</fieldset>`).join('')}
  <p class="muted small" id="chk-count"></p><button class="btn btn-ghost js-print" type="button">Imprimir o guardar en PDF</button>
  <p class="muted small">Orientativo: la documentación exigida la marca la naviera en tu reserva. <a href="/guias/documentacion-crucero/">Guía de documentación</a>.</p><div class="side-card aff-card"><h2 class="h-sm">📶 Wifi del barco y de los puertos</h2><p class="small">En el puerto y en cafeterías de las escalas usarás wifi público. Una VPN cifra tu conexión cuando consultes el banco o la reserva.</p><a class="btn btn-sm" href="${cj('vpn', null, 'checklist')}" target="_blank" rel="sponsored noopener" data-aff="cj-vpn">Ver oferta de NordVPN →</a><p class="muted small">Enlace de afiliado.</p></div></section>`;
  return layout({ title: 'Checklist de crucero: maleta y documentos', desc: 'Lista interactiva para preparar tu crucero: documentos, maleta, bebé, frío o calor.', url: '/herramientas/checklist/', body, crumbs: toolCrumbs('Checklist', '/herramientas/checklist/') });
}

function toolCountdown() {
  const body = `<section class="wrap block page-h"><h1>Cuenta atrás para tu crucero</h1><p class="lead-p">Apunta tu salida y añade los recordatorios importantes a tu calendario.</p></section>
  <section class="wrap block split"><form class="cd-form alert-form" id="cd-form">
    <label><span>Barco</span><input name="ship" list="ships-dl4" required>${shipDatalist('ships-dl4')}</label>
    <label><span>Fecha de embarque</span><input name="date" type="date" required></label>
    <label><span>Fecha del pago final (si la sabes)</span><input name="pay" type="date"></label>
    <label><span>Puerto de embarque</span><input name="port" placeholder="Ej.: Barcelona"></label>
    <button class="btn" type="submit">Guardar</button>
  </form><div class="cd-out" id="cd-out" aria-live="polite"><p class="muted">Aún no has guardado ningún crucero.</p></div></section>`;
  return layout({ title: 'Cuenta atrás y recordatorios de tu crucero', desc: 'Cuenta atrás para tu crucero con recordatorios en tu calendario: pago final, check-in online y día de embarque.', url: '/herramientas/cuenta-atras/', body, crumbs: toolCrumbs('Cuenta atrás', '/herramientas/cuenta-atras/') });
}

const SEA = [
  ['Mediterráneo occidental (golfo de León)', [11, 12, 1, 2, 3], 'El mistral, viento del norte, es más frecuente en otoño e invierno.'],
  ['Mar Egeo (islas griegas)', [7, 8], 'El meltemi sopla con fuerza en pleno verano y puede afectar a los desembarcos en lancha.'],
  ['Golfo de Vizcaya', [10, 11, 12, 1, 2, 3], 'Zona atlántica conocida por el oleaje, sobre todo fuera del verano.'],
  ['Atlántico: Canarias y Madeira', [12, 1, 2], 'Más mar de fondo en invierno en los tramos largos de navegación.'],
  ['Mar del Norte', [9, 10, 11, 12, 1, 2, 3], 'Más temporales fuera de la temporada de verano.'],
  ['Caribe', [8, 9, 10], 'Pico de la temporada de huracanes del Atlántico, que va oficialmente del 1 de junio al 30 de noviembre.'],
  ['Travesías transatlánticas', [11, 12, 1, 2, 3], 'Muchos días de mar abierto: en invierno, más probabilidad de mar movido.'],
];
function toolSea() {
  const body = `<section class="wrap block page-h"><h1>Mareómetro: qué zonas y meses se mueven más</h1><p class="lead-p">Si te mareas, elige bien. Marcados, los meses en los que cada zona suele tener más mar movido. <b>Es orientativo, no es una previsión</b>: el tiempo real lo marca la meteorología de tu semana.</p></section>
  <section class="wrap block"><div class="table-wrap"><table class="sea-t"><thead><tr><th>Zona</th>${MONTHS.map((m) => `<th>${m.slice(0, 3)}</th>`).join('')}</tr></thead><tbody>${SEA.map(([z, ms, note]) => `<tr><th scope="row">${esc(z)}<small>${esc(note)}</small></th>${MONTHS.map((_, i) => `<td class="${ms.includes(i + 1) ? 'rough' : 'calm'}" title="${ms.includes(i + 1) ? 'Suele estar más movido' : 'Habitualmente más tranquilo'}">${ms.includes(i + 1) ? '<span aria-label="más movido">●</span>' : ''}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
  <p class="muted small">Fuentes: conocimiento náutico general sobre vientos estacionales; temporada de huracanes según la NOAA (EE. UU.).</p>
  <p><a href="/guias/mareo-en-crucero/">Guía: cómo evitar el mareo en un crucero →</a></p></section>`;
  return layout({ title: 'Mareómetro de cruceros: zonas y meses con más mar movido', desc: 'Qué zonas y meses suelen estar más movidos para un crucero: Mediterráneo, Egeo, Golfo de Vizcaya, Canarias, Caribe y más.', url: '/herramientas/mareometro/', body, crumbs: toolCrumbs('Mareómetro', '/herramientas/mareometro/') });
}

const TZ = [['Barcelona / Palma / Valencia / Málaga', 'Europe/Madrid'], ['Canarias', 'Atlantic/Canary'], ['Lisboa / Madeira', 'Europe/Lisbon'], ['Roma / Nápoles / Génova', 'Europe/Rome'], ['Marsella', 'Europe/Paris'], ['Atenas / Santorini / Mykonos', 'Europe/Athens'], ['Estambul', 'Europe/Istanbul'], ['Dubrovnik / Kotor', 'Europe/Belgrade'], ['Malta', 'Europe/Malta'], ['Southampton', 'Europe/London'], ['Noruega (fiordos)', 'Europe/Oslo'], ['Copenhague', 'Europe/Copenhagen'], ['Estocolmo', 'Europe/Stockholm'], ['Helsinki / Tallin', 'Europe/Helsinki'], ['Miami / Fort Lauderdale / Nassau', 'America/New_York'], ['Cozumel', 'America/Cancun'], ['Caribe oriental (Saint Thomas, Saint Martin, Barbados)', 'America/Puerto_Rico'], ['Alaska (Juneau)', 'America/Juneau'], ['Seattle / Vancouver', 'America/Vancouver'], ['Buenos Aires', 'America/Argentina/Buenos_Aires'], ['Ciudad de México', 'America/Mexico_City']];
function toolTime() {
  const opt = TZ.map(([n, z]) => `<option value="${z}">${esc(n)}</option>`).join('');
  const body = `<section class="wrap block page-h"><h1>Conversor horario para cruceros</h1><p class="lead-p">El barco puede llevar una hora distinta a la del puerto. Comprueba la hora local de cada escala frente a la tuya y no llegues tarde al "todos a bordo".</p></section>
  <section class="wrap block"><form class="tz-form filters" id="tz-form"><label><span>Puerto</span><select name="tz">${opt}</select></label><label><span>Hora de "todos a bordo" (hora del barco)</span><input name="t" type="time" value="17:30"></label><label><span>Zona horaria del barco</span><select name="ship">${opt}</select></label></form>
  <div class="tz-out" id="tz-out" aria-live="polite"></div><p class="muted small">Pregunta siempre en recepción qué hora sigue el barco: lo anuncian en el programa diario.</p></section>`;
  return layout({ title: 'Conversor horario para cruceros', desc: 'Compara la hora local de cada puerto con la hora del barco y tu hora para no perder el crucero.', url: '/herramientas/conversor-horario/', body, crumbs: toolCrumbs('Conversor horario', '/herramientas/conversor-horario/') });
}

function toolCabins() {
  const body = `<section class="wrap block page-h"><h1>Buscador de camarotes</h1><p class="lead-p">Elige barco y número de camarote: te enseñamos lo que la comunidad ha contado de ese camarote y de los de al lado (ruido, vistas, vídeos).</p>
  <form class="cabin-search cabin-search-big filters"><label><span>Barco</span><select name="ship" required><option value="">Elige barco</option>${[...ships].sort((a, b) => a.name.localeCompare(b.name)).map((s) => `<option value="${s.slug}">${esc(s.name)}</option>`).join('')}</select></label><label><span>Número de camarote</span><input name="cabin" inputmode="numeric" maxlength="8" required placeholder="Ej.: 12045"></label><button class="btn" type="submit">Buscar</button></form>
  <div class="cabin-results" aria-live="polite"></div>
  <p class="muted small">¿Ya has navegado? Cuenta cómo era tu camarote en el foro del barco, en la pestaña "Camarotes".</p></section>`;
  return layout({ title: 'Buscador de camarotes de crucero por número', desc: 'Busca un camarote por número y barco: opiniones sobre ruido, vistas y vídeos de otros cruceristas.', url: '/herramientas/camarotes/', body, crumbs: toolCrumbs('Camarotes', '/herramientas/camarotes/') });
}


// Coordenadas de puertos (para la previsión del tiempo)
const PORT_COORDS = [['Barcelona', 41.37, 2.18], ['Palma de Mallorca', 39.56, 2.63], ['Valencia', 39.45, -0.32], ['Málaga', 36.71, -4.42], ['Alicante', 38.34, -0.48], ['Cádiz', 36.53, -6.29], ['Tarragona', 41.1, 1.24], ['Bilbao', 43.34, -3.03], ['Vigo', 42.24, -8.72], ['Santa Cruz de Tenerife', 28.47, -16.24], ['Las Palmas de Gran Canaria', 28.14, -15.41], ['Lisboa', 38.71, -9.13], ['Funchal (Madeira)', 32.64, -16.91], ['Marsella', 43.3, 5.36], ['Génova', 44.41, 8.92], ['Roma (Civitavecchia)', 42.09, 11.79], ['Nápoles', 40.84, 14.26], ['La Spezia', 44.1, 9.82], ['Venecia', 45.43, 12.33], ['Malta (La Valeta)', 35.9, 14.51], ['Atenas (El Pireo)', 37.94, 23.64], ['Santorini', 36.42, 25.43], ['Mykonos', 37.45, 25.33], ['Dubrovnik', 42.65, 18.09], ['Kotor', 42.42, 18.77], ['Estambul', 41.03, 28.98], ['Southampton', 50.9, -1.4], ['Copenhague', 55.69, 12.6], ['Kiel', 54.32, 10.14], ['Bergen', 60.39, 5.32], ['Geiranger', 62.1, 7.21], ['Estocolmo', 59.33, 18.07], ['Miami', 25.77, -80.17], ['Fort Lauderdale', 26.09, -80.12], ['Port Canaveral', 28.41, -80.61], ['Nassau', 25.08, -77.35], ['Cozumel', 20.5, -86.95], ['San Juan', 18.46, -66.1], ['Saint Thomas', 18.34, -64.93], ['Juneau (Alaska)', 58.3, -134.42], ['Seattle', 47.61, -122.35], ['Buenos Aires', -34.6, -58.37]];
const DEST_CLIMATE = { 'mediterraneo-occidental': ['warm', 0, 0, 0], 'mediterraneo-oriental': ['warm', 0, 1, 1], caribe: ['warm', 1, 0, 1], 'fiordos-noruegos': ['cold', 0, 0, 0], 'capitales-balticas': ['mild', 0, 0, 0], 'canarias-y-madeira': ['warm', 1, 0, 0], alaska: ['cold', 0, 0, 1], transatlanticos: ['mild', 0, 0, 1] };
function toolTips() {
  const ls = lineList.filter((l) => l.tip).sort((a, b) => a.short.localeCompare(b.short));
  const body = `<section class="wrap block page-h narrow"><h1>Simulador de propinas de crucero</h1><p class="lead-p">El cargo de servicio (las "propinas") se suma a tu cuenta cada noche. Calcula cuánto será.</p>
  <form class="calc" id="tip-form" data-fx="${fx?.usdEur || 0.9}"><label><span>Naviera</span><select name="linea">${ls.map((l) => `<option data-tip="${l.tip}" data-suite="${l.tipSuite || l.tip}">${esc(l.short)} · ${String(l.tip).replace('.', ',')} $</option>`).join('')}</select></label>
  <label><span>Camarote</span><select name="cabin"><option value="std">Interior, exterior o balcón</option><option value="suite">Suite</option></select></label>
  <label><span>Noches</span><input name="nights" type="number" min="1" max="60" value="7" inputmode="numeric"></label><label><span>Personas</span><input name="people" type="number" min="1" max="10" value="2" inputmode="numeric"></label></form>
  <div id="tip-out" class="calc-out" aria-live="polite"></div><p class="muted small">Fuente: ${esc(SOURCES[1][0])}. <a href="/guias/propinas-y-cargos-de-servicio/">Guía de propinas</a>.</p></section>`;
  return layout({ title: 'Simulador de propinas de crucero por naviera', desc: 'Calcula el cargo de servicio (propinas) de tu crucero según naviera, noches, personas y tipo de camarote.', url: '/herramientas/propinas/', body, crumbs: toolCrumbs('Propinas', '/herramientas/propinas/') });
}
function toolDrinks() {
  const f = (n, l, v, step = 1) => `<label><span>${l}</span><input name="${n}" type="number" min="0" step="${step}" value="${v}" inputmode="decimal"></label>`;
  const body = `<section class="wrap block page-h narrow"><h1>¿Me compensa el paquete de bebidas del crucero?</h1><p class="lead-p">Pon lo que sueles beber al día y el precio del paquete de tu naviera. Los precios por bebida son editables: cópialos de la carta de tu barco.</p>
  <form class="calc grid-form" id="drinks-form">
  ${f('pack', 'Precio del paquete por persona y día (€)', 60)}${f('service', 'Cargo de servicio sobre bebidas (%)', 18)}${f('nights', 'Noches', 7)}
  <fieldset><legend>Al día bebes…</legend>${f('coffee', 'Cafés especiales', 2)}${f('soft', 'Refrescos', 2)}${f('water', 'Botellas de agua', 1)}${f('beer', 'Cervezas', 2)}${f('wine', 'Copas de vino', 1)}${f('cocktail', 'Cócteles', 2)}</fieldset>
  <fieldset><legend>Precio por bebida (€)</legend>${f('p_coffee', 'Café', 4, 0.5)}${f('p_soft', 'Refresco', 4, 0.5)}${f('p_water', 'Agua', 4, 0.5)}${f('p_beer', 'Cerveza', 8, 0.5)}${f('p_wine', 'Vino', 10, 0.5)}${f('p_cocktail', 'Cóctel', 14, 0.5)}</fieldset></form>
  <div id="drinks-out" class="calc-out" aria-live="polite"></div><p class="muted small">Los valores iniciales son solo un ejemplo para empezar: cambia todos por los de tu naviera. <a href="/guias/paquete-de-bebidas/">Guía del paquete de bebidas</a>.</p></section>`;
  return layout({ title: '¿Compensa el paquete de bebidas del crucero? Calculadora', desc: 'Calcula si te compensa el paquete de bebidas de tu crucero según lo que bebes cada día y los precios de tu barco.', url: '/herramientas/paquete-bebidas/', body, crumbs: toolCrumbs('Paquete de bebidas', '/herramientas/paquete-bebidas/') });
}
function toolSplit() {
  const body = `<section class="wrap block page-h narrow"><h1>Presupuesto compartido del crucero</h1><p class="lead-p">Para viajes en grupo: apunta quién paga qué y te decimos cómo quedar en paz con los mínimos pagos. Se guarda en este dispositivo.</p>
  <form class="calc" id="split-form"><label class="f-wide"><span>Viajeros (separados por comas)</span><input name="people" placeholder="Ana, Luis, Marta, Pablo"></label>
  <label><span>Concepto</span><input name="what" placeholder="Excursión Santorini"></label><label><span>Importe (€)</span><input name="amount" type="number" min="0" step="0.01" inputmode="decimal"></label><label><span>Pagó</span><select name="who"></select></label><button class="btn" type="submit">Añadir gasto</button></form>
  <div id="split-out" class="tool-out" aria-live="polite"></div><p><button class="btn btn-ghost btn-sm js-split-reset" type="button">Empezar de cero</button></p></section>`;
  return layout({ title: 'Presupuesto compartido para cruceros en grupo', desc: 'Divide los gastos del crucero entre amigos o familia: quién ha pagado qué y cuánto debe cada uno.', url: '/herramientas/presupuesto-compartido/', body, crumbs: toolCrumbs('Presupuesto compartido', '/herramientas/presupuesto-compartido/') });
}
function toolWeather() {
  const body = `<section class="wrap block page-h"><h1>El tiempo en tu puerto de crucero</h1><p class="lead-p">Previsión de 14 días para los principales puertos de salida y escala.</p>
  <form class="calc" id="weather-form"><label class="f-wide"><span>Puerto</span><select name="port">${PORT_COORDS.map(([n, a, b]) => `<option value="${a}|${b}|${esc(n)}">${esc(n)}</option>`).join('')}</select></label></form>
  <div id="weather-out" class="tool-out" aria-live="polite"></div></section>`;
  return layout({ title: 'El tiempo en los puertos de crucero: previsión de 14 días', desc: 'Previsión del tiempo de 14 días en Barcelona, Palma, Málaga, Santorini, Miami, fiordos y otros puertos de crucero.', url: '/herramientas/tiempo-puerto/', body, crumbs: toolCrumbs('El tiempo en tu puerto', '/herramientas/tiempo-puerto/') });
}
function toolPack() {
  const body = `<section class="wrap block page-h narrow"><h1>Qué meter en la maleta para un crucero</h1><p class="lead-p">Elige destino y mes: te damos la lista adaptada al clima. Márcala sobre la marcha.</p>
  <form class="calc" id="pack-form"><label><span>Destino</span><select name="dest">${DESTINATIONS.map((d) => { const c = DEST_CLIMATE[d.slug] || ['mild', 0, 0, 0]; return `<option data-months='${JSON.stringify(d.months)}' data-climate="${c[0]}" data-always="${c[1]}" data-religious="${c[2]}" data-plane="${c[3] || (d.fromSpain ? 0 : 1)}">${esc(d.name)}</option>`; }).join('')}</select></label>
  <label><span>Mes</span><select name="month">${MONTHS.map((m, i) => `<option value="${i + 1}"${i === 6 ? ' selected' : ''}>${cap(m)}</option>`).join('')}</select></label></form>
  <div id="pack-out" class="tool-out" aria-live="polite"></div><p class="small"><a href="/herramientas/checklist/">Checklist completo del crucero</a> · <a href="/herramientas/tiempo-puerto/">El tiempo en tu puerto</a></p></section>`;
  return layout({ title: 'Qué llevar a un crucero: maleta según destino y mes', desc: 'Lista de equipaje para tu crucero adaptada al destino y al mes: Mediterráneo, Caribe, fiordos, Alaska y más.', url: '/herramientas/maleta/', body, crumbs: toolCrumbs('Maleta', '/herramientas/maleta/') });
}
function toolDocs() {
  const rows = [
    ['Crucero solo por la UE / espacio Schengen (Mediterráneo occidental, Grecia, Báltico)', 'Ciudadanos españoles: DNI o pasaporte en vigor. Algunas navieras exigen pasaporte siempre: míralo en tu reserva. Si el itinerario toca un país fuera de la UE (Montenegro, Turquía, Marruecos, Reino Unido…) necesitarás pasaporte.', 'https://www.exteriores.gob.es/es/ServiciosAlCiudadano/Paginas/Recomendaciones-de-viaje.aspx', 'Recomendaciones de viaje (Ministerio de Asuntos Exteriores)'],
    ['Reino Unido (Southampton, escalas británicas)', 'Pasaporte y autorización electrónica de viaje (ETA) del Reino Unido para la mayoría de visitantes.', 'https://www.gov.uk/guidance/apply-for-an-electronic-travel-authorisation-eta', 'GOV.UK: ETA'],
    ['Estados Unidos (Miami, Alaska, Caribe con escala en EE. UU.)', 'Pasaporte y autorización ESTA (o visado). Solicítala solo en la web oficial.', 'https://esta.cbp.dhs.gov/', 'ESTA (CBP, web oficial)'],
    ['Canadá (Alaska desde Vancouver, Nueva Inglaterra)', 'Pasaporte y eTA de Canadá si llegas en avión.', 'https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/eta.html', 'Gobierno de Canadá: eTA'],
    ['Caribe (otros países) y Sudamérica', 'Pasaporte con validez suficiente (normalmente 6 meses). Los requisitos cambian por país.', 'https://www.exteriores.gob.es/es/ServiciosAlCiudadano/Paginas/Recomendaciones-de-viaje.aspx', 'Fichas por país (Exteriores)'],
  ];
  const body = `<section class="wrap block page-h narrow"><h1>Documentación para un crucero según el destino</h1><p class="lead-p">Qué necesitas y, sobre todo, dónde comprobarlo en la fuente oficial. Los requisitos cambian: revisa siempre la web oficial y las condiciones de tu naviera antes de viajar.</p>
  ${rows.map(([t, d, u, l]) => `<div class="side-card"><h2 class="h-sm">${esc(t)}</h2><p>${esc(d)}</p><p class="small"><a href="${u}" target="_blank" rel="noopener">${esc(l)} →</a></p></div>`).join('')}
  <h2>Siempre</h2><ul><li>Tarjeta Sanitaria Europea para escalas en la UE y seguro de viaje con cobertura médica y de evacuación.</li><li>Menores que viajan sin uno de los progenitores: autorización y copia del documento del otro progenitor (consulta la política de tu naviera).</li><li>Las tarjetas de embarque y el registro online de la naviera (check-in) se completan días antes de salir.</li></ul>
  <p class="muted small">Información orientativa para ciudadanos españoles, revisada el ${BUILD_DATE}. No sustituye a la información oficial. <a href="/guias/documentacion/">Guía completa de documentación</a>.</p></section>`;
  return layout({ title: 'Documentación para un crucero: DNI, pasaporte, ESTA y ETA', desc: 'Qué documentación necesitas para tu crucero según el destino (UE, Reino Unido, EE. UU., Caribe) y enlaces a las webs oficiales.', url: '/herramientas/documentacion/', body, crumbs: toolCrumbs('Documentación', '/herramientas/documentacion/') });
}
const GLOSSARY = [
  ['All inclusive / todo incluido', 'En crucero suele significar comidas en restaurantes principales y bufé. Las bebidas alcohólicas, cafés especiales, restaurantes de especialidad y propinas casi nunca están incluidos salvo que lo diga el paquete.'],
  ['Arqueo bruto (GT)', 'Medida del volumen interior del barco, no de su peso. Sirve para comparar tamaños.'],
  ['Babor y estribor', 'Babor es el lado izquierdo mirando hacia la proa; estribor, el derecho.'],
  ['Camarote garantizado (GTY)', 'Pagas una categoría y la naviera te asigna el número más tarde. Más barato, pero no eliges ubicación.'],
  ['Cargo de servicio', 'Las "propinas" automáticas que se cargan por persona y noche.'],
  ['Cubierta', 'Cada planta del barco.'],
  ['Desembarque exprés', 'Salir del barco cargando tú con tu equipaje, sin esperar a que lo bajen.'],
  ['Día de navegación', 'Día sin escala, en alta mar.'],
  ['Escala', 'Puerto que se visita durante el crucero.'],
  ['Eslora', 'Longitud del barco.'],
  ['Muster drill / simulacro', 'Ejercicio de seguridad obligatorio antes de zarpar: te explican tu punto de reunión.'],
  ['Naviera', 'La compañía que opera los barcos (MSC, Costa, Royal Caribbean…).'],
  ['Popa y proa', 'Popa es la parte de atrás del barco; proa, la de delante.'],
  ['Puerto base', 'Puerto donde empieza y acaba el crucero.'],
  ['Tarjeta de crucero', 'Tu llave del camarote, identificación y medio de pago a bordo. Todo se carga a tu cuenta.'],
  ['Tender', 'Lanchas que llevan a tierra cuando el barco fondea fuera del puerto. Con mal tiempo se puede cancelar la escala.'],
  ['Tasas portuarias', 'Impuestos y tasas de los puertos. A veces vienen aparte del precio anunciado.'],
  ['Ocupación doble', 'Precio por persona con dos personas en el camarote. Viajar solo suele tener suplemento.'],
];
function glossary() {
  const body = `<section class="wrap block page-h narrow"><h1>Glosario del crucerista</h1><p class="lead-p">La jerga de los cruceros, explicada en cristiano.</p><dl class="gloss">${GLOSSARY.map(([t, d]) => `<dt id="${slugify(t)}">${esc(t)}</dt><dd>${esc(d)}</dd>`).join('')}</dl></section>`;
  return layout({ title: 'Glosario de cruceros: tender, muster drill, GTY y más', desc: 'Diccionario de términos de cruceros explicados de forma sencilla: tender, muster drill, camarote garantizado, arqueo bruto y más.', url: '/herramientas/glosario/', body, crumbs: toolCrumbs('Glosario', '/herramientas/glosario/'),
    schema: [{ '@context': 'https://schema.org', '@type': 'DefinedTermSet', name: 'Glosario del crucerista', hasDefinedTerm: GLOSSARY.map(([t, d]) => ({ '@type': 'DefinedTerm', name: t, description: d })) }] });
}

// ---------- comunidad ----------
function community() {
  const shipOpts = [...ships].sort((a, b) => a.name.localeCompare(b.name)).map((s) => `<option value="${s.slug}">${esc(s.name)}</option>`).join('');
  const body = `<section class="wrap block page-h"><h1>Comunidad: el grupo de tu salida</h1><p class="lead-p">Cada salida tiene su propio grupo. Entra con tu barco y tu fecha para conocer a tus compañeros de viaje, organizar excursiones compartidas y resolver dudas antes de embarcar.</p>
  <form class="rc-form rc-big" action="/comunidad/salida/" method="get">
    <label><span>Barco</span><select name="b" required><option value="">Elige tu barco</option>${shipOpts}</select></label>
    <label><span>Fecha de salida</span><input type="date" name="f" required></label>
    <button class="btn" type="submit">Entrar al grupo</button></form></section>
  <section class="wrap block grid grid-3">
    <a class="tool tool-light" href="/comunidad/ranking/"><h2>🏆 Ranking de la comunidad</h2><p>Los cruceristas que más ayudan, con sus insignias.</p></a>
    <a class="tool tool-light" href="/herramientas/camarotes/"><h2>🛏️ Camarotes</h2><p>Busca un número de camarote y mira lo que cuentan otros.</p></a>
    <a class="tool tool-light" href="/comunidad/perfil/"><h2>👤 Tu perfil</h2><p>Tus mensajes, tus cruceros, tus insignias y tu diario de viaje.</p></a>
    <a class="tool tool-light" href="/creadores/"><h2>🎥 Programa de creadores</h2><p>¿Grabas vídeos de cruceros? Trabajemos juntos.</p></a>
    <a class="tool tool-light" href="/sorteo/"><h2>🎁 Sorteo de la comunidad</h2><p>Apúntate para recibir las bases cuando se publiquen.</p></a>
    <a class="tool tool-light" href="/excursiones/"><h2>🤝 Excursiones compartidas</h2><p>Propón un plan en el grupo de tu salida y comparte guía o taxi.</p></a>
  </section>`;
  return layout({ title: 'Comunidad de cruceristas: grupos por salida', desc: 'Encuentra el grupo de tu salida de crucero: conoce a otros pasajeros, comparte excursiones, opina y gana insignias.', url: '/comunidad/', body, crumbs: [['Inicio', '/'], ['Comunidad', '/comunidad/']] });
}

function rollcallShell() {
  const body = `<section class="wrap block page-h"><p class="eyebrow">Grupo de salida</p><h1 id="rc-title">Grupo de tu salida</h1><p class="lead-p" id="rc-sub">Conoce a quienes navegan contigo.</p>
  <div class="rc-members" hidden><b class="rc-n">0</b> <span>personas en este grupo</span> <button class="btn btn-sm js-join" type="button">Me apunto</button></div><div id="rc-links"></div></section>
  <div class="wrap">${forumBlock('salida:pendiente', 'Conversación del grupo', { tabs: [['comment', 'Conversación'], ['excursion', 'Excursiones compartidas'], ['question', 'Preguntas']] })}</div>
  <script type="application/json" id="ships-min">${JSON.stringify(Object.fromEntries(ships.map((s) => [s.slug, s.name])))}</script>`;
  return layout({ title: 'Grupo de salida', desc: 'Grupo de pasajeros de una salida de crucero concreta.', url: '/comunidad/salida/', body, noindex: true, crumbs: [['Inicio', '/'], ['Comunidad', '/comunidad/'], ['Salida', '/comunidad/salida/']] });
}

function profileShell() {
  const body = `<section class="wrap block page-h"><h1 id="pf-title">Tu perfil de crucerista</h1>
  <form class="pf-form alert-form" id="pf-form"><label><span>Tu nombre público</span><input name="name" maxlength="40" required autocomplete="nickname"></label><label><span>¿Cuántos cruceros has hecho?</span><input name="cruises" type="number" min="0" max="500" value="0"></label><label><span>Navieras con las que has navegado</span><input name="lines" maxlength="200" placeholder="MSC, Costa…"></label><button class="btn" type="submit">Guardar perfil</button><p class="form-msg" role="status" aria-live="polite"></p></form>
  <div id="pf-view"></div></section>
  <div class="wrap">${forumBlock('perfil:pendiente', 'Diario de viaje', { tabs: [['diary', 'Diario']] })}</div>`;
  return layout({ title: 'Perfil de crucerista', desc: 'Perfil, insignias y diario de viaje en la comunidad de MejorCrucero.', url: '/comunidad/perfil/', body, noindex: true, crumbs: [['Inicio', '/'], ['Comunidad', '/comunidad/'], ['Perfil', '/comunidad/perfil/']] });
}

function leaderboard() {
  const body = `<section class="wrap block page-h"><h1>Ranking de la comunidad</h1><p class="lead-p">Los cruceristas que más ayudan a los demás, por votos y mensajes.</p><div id="lb" class="lb" aria-live="polite"><div class="skel"></div><div class="skel"></div></div>
  <h2>Insignias</h2><ul class="list"><li><b>Primer mensaje</b>: publica tu primera opinión o pregunta.</li><li><b>Colaborador</b>: 10 mensajes.</li><li><b>Experto</b>: 50 mensajes.</li><li><b>Reportero de camarotes</b>: cuenta cómo era tu camarote.</li><li><b>Lobo de mar</b>: 10 cruceros o más en tu perfil.</li></ul></section>`;
  return layout({ title: 'Ranking de la comunidad de cruceristas', desc: 'Los miembros que más ayudan en la comunidad de MejorCrucero y cómo ganar insignias.', url: '/comunidad/ranking/', body, crumbs: [['Inicio', '/'], ['Comunidad', '/comunidad/'], ['Ranking', '/comunidad/ranking/']] });
}

function myCruises() {
  const body = `<section class="wrap block page-h"><h1>Mis cruceros</h1><p class="lead-p">Tus favoritos, lo último que has visto, tus alertas y tu cuenta atrás. Se guarda en este dispositivo, sin registro.</p></section>
  <section class="wrap block"><h2>❤️ Favoritos</h2><div class="grid" id="my-favs"><p class="muted">Pulsa el corazón en cualquier barco para guardarlo aquí.</p></div></section>
  <section class="wrap block"><h2>🛳️ Ofertas guardadas y vistas</h2><div id="my-offers"><p class="muted">Pulsa "Guardar oferta" en cualquier oferta para tenerla aquí.</p></div></section>
  <section class="wrap block"><h2>🕘 Vistos recientemente</h2><div class="grid" id="my-recent"><p class="muted">Todavía no has visto ningún barco.</p></div></section>
  <section class="wrap block" id="avisos"><h2>💬 Avisos</h2><div id="my-notifs"><p class="muted">Cargando…</p></div></section>
  <section class="wrap block split"><div><h2>🚢 Barcos en los que he navegado</h2><form class="calc" id="log-form"><label><span>Barco</span><input name="ship" list="log-ships" required autocomplete="off"></label><label><span>Año</span><input name="year" type="number" min="1970" max="2030" inputmode="numeric"></label><button class="btn" type="submit">Añadir</button><p class="form-msg" role="status"></p></form>${shipDatalist('log-ships')}<div id="log-out"></div></div><div><h2>🏅 Mi resumen y retos</h2><div id="wrapped"><p class="muted">Añade tus cruceros para ver tu resumen.</p></div></div></section>
  <section class="wrap block split"><div><h2>🔔 Alertas</h2><div id="my-alerts"><p class="muted">Sin alertas. <a href="/herramientas/alerta-precio/">Crear una</a>.</p></div></div><div><h2>⏳ Cuenta atrás</h2><div id="my-cd"><p class="muted">Sin cruceros. <a href="/herramientas/cuenta-atras/">Añadir</a>.</p></div></div></section>`;
  return layout({ title: 'Mis cruceros: favoritos, alertas y cuenta atrás', desc: 'Tus barcos favoritos, vistos recientemente, alertas de precio y cuenta atrás.', url: '/mis-cruceros/', body, noindex: true, crumbs: [['Inicio', '/'], ['Mis cruceros', '/mis-cruceros/']] });
}

function admin() {
  const body = `<section class="wrap block page-h"><h1>Panel de MejorCrucero</h1><form class="calc" id="adm-form"><label><span>Clave de administrador</span><input id="adm-token" type="password" autocomplete="current-password"></label><label><span>Periodo</span><select id="adm-days"><option value="7">7 días</option><option value="30" selected>30 días</option><option value="90">90 días</option></select></label><button class="btn" type="submit">Entrar</button></form><div id="adm-out"></div></section><script src="/assets/admin.js?v=${BUILD_DATE}" defer></script>`;
  return layout({ title: 'Panel de administración', desc: 'Panel interno.', url: '/admin/', body, noindex: true, crumbs: [['Inicio', '/'], ['Panel', '/admin/']] });
}

// ---------- guías ----------
function guidesIndex() {
  const body = `<section class="wrap block page-h"><h1>Guías para cruceristas</h1><p class="lead-p">Todo lo que nos habría gustado saber antes de nuestro primer crucero.</p>
  <div class="grid grid-3">${GUIDES.map((g) => `<a class="card guide" href="/guias/${g.slug}/"><span class="guide-e">${g.emoji}</span><h2>${esc(g.title)}</h2><p>${esc(g.desc)}</p></a>`).join('')}</div>
  <h2>Más guías</h2><div class="grid grid-3">
  <a class="card guide" href="/destinos/"><span class="guide-e">🗺️</span><h3>${DESTINATIONS.length} guías de destinos</h3><p>Mejor época, puertos, mar y consejos.</p></a>
  <a class="card guide" href="/meses/"><span class="guide-e">📅</span><h3>Cruceros mes a mes</h3><p>Adónde ir en cada época del año.</p></a>
  <a class="card guide" href="/comparativas/"><span class="guide-e">⚖️</span><h3>${COMPARISONS.length} comparativas de navieras</h3><p>MSC vs Costa, Royal Caribbean vs MSC…</p></a>
  <a class="card guide" href="/puertos/"><span class="guide-e">⚓</span><h3>${allPorts.length} guías de puertos</h3><p>Cómo embarcar, excursiones y vuelos.</p></a>
  <a class="card guide" href="/navieras/"><span class="guide-e">🚢</span><h3>${lineList.length} guías de navieras</h3><p>Estilo, flota y para quién es cada una.</p></a></div></section>`;
  return layout({ title: 'Guías de cruceros: consejos para acertar y pagar menos', desc: 'Guías prácticas de cruceros: primer crucero, camarotes, propinas, bebé, documentación, mareo, excursiones, destinos y navieras.', url: '/guias/', body, crumbs: [['Inicio', '/'], ['Guías', '/guias/']] });
}

function guidePage(g) {
  const others = GUIDES.filter((o) => o.slug !== g.slug).slice(0, 3);
  const body = `<article class="wrap block prose-wrap"><header class="page-h"><span class="guide-e big-e">${g.emoji}</span><h1>${esc(g.title)}</h1><p class="lead-p">${esc(g.desc)}</p>
  <p class="byline">Por <a href="/sobre-nosotros/">${esc(CONFIG.author.name)}</a>, ${esc(CONFIG.author.role.charAt(0).toLowerCase() + CONFIG.author.role.slice(1))} · Actualizado: ${BUILD_DATE}</p></header>
  <div class="prose">${g.body}</div>
  <p>${reportBtn('guia:' + g.slug)}</p>
  ${shareBar(g.title, `/guias/${g.slug}/`)}
  <aside class="block"><h2>Sigue leyendo</h2><div class="grid grid-3">${others.map((o) => `<a class="card guide" href="/guias/${o.slug}/"><span class="guide-e">${o.emoji}</span><h3>${esc(o.title)}</h3></a>`).join('')}</div></aside>
  ${forumBlock('guia:' + g.slug, 'Preguntas sobre esta guía', { tabs: [['question', 'Preguntas'], ['comment', 'Comentarios']] })}
  <section class="cta-band cta-inline"><div class="cta-in"><div><h2>Chollos de cruceros en tu email</h2><p>Una vez por semana, con el precio real calculado.</p></div>${leadForm('newsletter-guia-' + g.slug)}</div></section></article>`;
  return layout({ title: g.title, desc: g.desc, url: `/guias/${g.slug}/`, body, ogType: 'article', crumbs: [['Inicio', '/'], ['Guías', '/guias/'], [g.title, `/guias/${g.slug}/`]],
    schema: [{ '@context': 'https://schema.org', '@type': 'Article', headline: g.title, description: g.desc, inLanguage: 'es', dateModified: BUILD_DATE, author: { '@type': 'Person', name: CONFIG.author.name, url: SITE + '/sobre-nosotros/' }, publisher: { '@type': 'Organization', name: 'MejorCrucero' }, mainEntityOfPage: SITE + `/guias/${g.slug}/` }] });
}

function simplePage(url, title, desc, html, extra = {}) {
  return layout({ title, desc, url, body: `<article class="wrap block prose-wrap"><h1>${esc(title)}</h1><div class="prose">${html}</div></article>`, crumbs: [['Inicio', '/'], [title, url]], ...extra });
}

const LEGAL_OWNER = 'Equinox Investment Group LLC, 30 N Gould St Ste N, Sheridan, WY 82801, EE. UU.';
const about = `<p>MejorCrucero nace de una idea sencilla: que comparar cruceros en español sea tan fácil y honesto como comparar vuelos.</p>
<h2>Quién está detrás</h2><p><strong>${esc(CONFIG.author.name)}</strong> es el fundador de MejorCrucero y de <a href="${CONFIG.happyLowCost}" target="_blank" rel="noopener">Happy Low Cost</a>, una comunidad de más de 400.000 viajeros que lleva años cazando chollos de viaje.</p>
<h2>Nuestras reglas</h2><ul><li><strong>Cero datos inventados.</strong> Cada cifra técnica tiene su fuente citada y puedes <button type="button" class="link-btn js-report" data-target="general">reportar un error</button>.</li><li><strong>Precio real, no de portada.</strong></li><li><strong>Opiniones de verdad.</strong> No compramos ni filtramos reseñas.</li><li><strong>Transparencia con el dinero.</strong> Explicamos <a href="/afiliacion/">cómo ganamos dinero</a> y lo indicamos en cada botón.</li></ul>
<h2>Fuentes</h2><ul>${SOURCES.map(([t, u]) => `<li><a href="${u}" target="_blank" rel="noopener">${esc(t)}</a></li>`).join('')}<li>Datos de flotas ampliados: artículos de Wikipedia de cada naviera, consultados en octubre de 2026.</li><li>Fotos: Wikimedia Commons, con autor y licencia en cada imagen.</li><li>Tipos de cambio: Banco Central Europeo.</li></ul>`;
const affiliation = `<p>MejorCrucero es gratis para ti. Nos financiamos con comisiones de afiliación: cuando haces clic en un enlace a una naviera, agencia o proveedor de excursiones y reservas, el vendedor puede pagarnos una comisión. <strong>Tú pagas lo mismo</strong>.</p><p>Cada botón de reserva indica si es un enlace de afiliado. Nunca dejamos que una comisión cambie el orden de los barcos, los rankings o las opiniones de la comunidad.</p><h2>Socios</h2><ul>${Object.values(CONFIG.affiliates).map((a) => `<li>${esc(a.name)}: ${a.param ? 'enlace de afiliado' : 'por ahora sin comisión'}</li>`).join('')}</ul>`;
const legal = `<p><strong>Titular del sitio web:</strong> ${LEGAL_OWNER}</p><p><strong>Dominio:</strong> mejorcrucero.com</p><p>MejorCrucero es un comparador y medio informativo. No vende cruceros directamente: las reservas se realizan en las webs de las navieras y agencias enlazadas, que son las responsables del contrato de viaje.</p><p>Los datos técnicos de los barcos proceden de fuentes públicas y pueden contener errores o quedar desactualizados. Confirma siempre las condiciones con el vendedor antes de reservar.</p><p>Los mensajes de la comunidad son responsabilidad de sus autores. Puedes reportar cualquier contenido inapropiado y lo revisaremos.</p><p>Los vídeos incrustados pertenecen a sus autores y se muestran mediante el reproductor oficial de YouTube. Las fotos proceden de Wikimedia Commons con la licencia y autoría indicadas.</p>`;
const privacy = `<p><strong>Responsable:</strong> ${LEGAL_OWNER}</p><h2>Qué datos tratamos</h2><ul><li><strong>Email</strong>, si te suscribes, creas una alerta o sigues un barco: lo usamos solo para eso y puedes darte de baja en cualquier momento.</li><li><strong>Favoritos, alertas, checklist y cuenta atrás</strong> se guardan en tu propio navegador.</li><li><strong>Comunidad:</strong> el nombre que eliges y tus mensajes son públicos. Guardamos un identificador técnico anónimo de tu conexión (hash) para frenar el spam.</li><li><strong>Estadísticas:</strong> contamos visitas y clics a socios de forma agregada y sin cookies.</li><li><strong>Asistente IA y lectura de emails:</strong> el texto se procesa para responderte y no se guarda.</li></ul><h2>Tus derechos</h2><p>Puedes pedir acceso, rectificación o supresión de tus datos escribiendo al responsable. También puedes reclamar ante la autoridad de protección de datos de tu país (en España, la AEPD).</p>`;
const cookies = `<p>MejorCrucero no instala cookies publicitarias propias. Usamos almacenamiento local del navegador solo para funciones que tú activas (favoritos, alertas, comparador, checklist, tema claro u oscuro).</p><p>Los vídeos de YouTube no se cargan hasta que pulsas reproducir, y entonces se usan desde el dominio youtube-nocookie.com. Los enlaces a navieras y agencias pueden dejar cookies de afiliación en esos sitios cuando haces clic.</p>`;
const newsletter = `<p>Una vez por semana, como mucho. Esto es lo que recibirás:</p><ol><li><strong>Las mejores ofertas de la semana</strong>, con el precio real por persona y noche ya calculado (propinas incluidas).</li><li><strong>Bajadas de precio</strong> de los barcos y destinos que sigues.</li><li><strong>Una guía práctica</strong>: camarotes, excursiones por libre, documentación…</li><li><strong>Lo mejor de la comunidad</strong>: la opinión o el vídeo de camarote más útil de la semana.</li></ol><p>Sin spam y con baja en un clic.</p>${leadForm('newsletter-page', 'Apuntarme')}`;
const creators = `<p>¿Grabas vídeos de cruceros, de tu camarote o de los barcos en los que navegas? Queremos que la gente vea cómo es cada barco de verdad, y los mejores vídeos salen en las fichas de MejorCrucero con tu nombre y enlace a tu canal.</p><h2>Qué buscamos</h2><ul><li>Vídeos de camarotes indicando el número y la categoría.</li><li>Tours del barco, bufé, piscinas, clubes infantiles.</li><li>Opiniones sinceras, lo bueno y lo malo.</li></ul><h2>Cómo participar</h2><p>Déjanos tu email y el enlace a tu canal o vídeo y te escribimos con una propuesta de colaboración.</p>${leadForm('creadores', 'Quiero participar', '<label class="sr" for="cr-ch">Tu canal</label><input id="cr-ch" type="url" name="channel" placeholder="Enlace a tu canal o vídeo">')}`;
const raffle = `<p>Estamos preparando un sorteo periódico para la comunidad de MejorCrucero. Todavía no hay bases publicadas ni premio definido: cuando estén listos, los publicaremos aquí con todas las condiciones.</p><p>Si quieres enterarte el primero, déjanos tu email.</p>${leadForm('sorteo', 'Avisadme')}`;

function notFound() {
  const top = [...sailings].filter((x) => new Date(x.date) > new Date()).sort((a, b) => OFF.deal(b).score - OFF.deal(a).score).slice(0, 4);
  return layout({ title: 'Página no encontrada', desc: 'Esta página no existe.', url: '/404.html', noindex: true, body: `<section class="wrap block page-h center"><h1>Este barco ya ha zarpado</h1><p class="lead-p">No encontramos la página que buscas. Puede que la oferta ya no esté disponible.</p><form class="gsearch gsearch-404" action="/buscar/" role="search"><label class="sr" for="q404">Buscar</label><input id="q404" name="q" type="search" placeholder="Barco, destino o puerto"></form><p><a class="btn" href="/ofertas/">Ver todas las ofertas</a> <a class="btn btn-ghost" href="/">Ir a la portada</a></p></section>${top.length ? `<section class="wrap block"><h2>Chollos de hoy</h2><div class="grid">${top.map(sailingCard).join('')}</div></section>` : ''}` });
}
function offline() {
  return layout({ title: 'Sin conexión', desc: 'Sin conexión.', url: '/offline/', noindex: true, body: `<section class="wrap block page-h center"><h1>Estás sin conexión</h1><p class="lead-p">Tus favoritos, checklist y cuenta atrás siguen disponibles en <a href="/mis-cruceros/">Mis cruceros</a> y en las páginas que ya visitaste.</p></section>` });
}

// ---------- build ----------
async function getFx() {
  try {
    const r = await fetch('https://api.frankfurter.app/latest?from=USD&to=EUR,MXN', { signal: AbortSignal.timeout(8000), redirect: 'follow' });
    if (r.ok) { const j = await r.json(); fx = { usdEur: j.rates.EUR, usdMxn: j.rates.MXN, date: j.date, source: 'Banco Central Europeo (frankfurter.app)' }; }
  } catch {}
}
await getFx();

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.cpSync(path.join(OUT, '..', 'public'), OUT, { recursive: true });

OFF = makeOffers({ sailings, bySlug, LINES, DESTINATIONS, forWhom, allPorts, BUILD_DATE, PORT_COORDS, portPhotos });
write('index.html', home());
write('buscar/index.html', searchPage());
write('barcos/index.html', shipsIndex());
ships.forEach((s) => write(`barcos/${s.slug}/index.html`, shipPage(s)));
sailings.forEach((x) => write(`salidas/${x.id}/index.html`, sailingPage(x)));
OFF.hubs().forEach(([f, html]) => write(f, html));
OFF.feeds().forEach(([f, c]) => write(f, c));
write('navieras/index.html', linesIndex());
lineList.forEach((l) => write(`navieras/${l.slug}/index.html`, linePage(l)));
write('comparativas/index.html', comparisonsIndex());
COMPARISONS.forEach(([a, b]) => lineBySlug[a] && lineBySlug[b] && write(`comparativas/${a}-vs-${b}/index.html`, comparisonPage(a, b)));
write('destinos/index.html', destinationsIndex());
DESTINATIONS.forEach((d) => write(`destinos/${d.slug}/index.html`, destinationPage(d)));
write('meses/index.html', monthsIndex());
MONTHS.forEach((m, i) => write(`meses/${m}/index.html`, monthPage(i + 1)));
write('puertos/index.html', portsIndex());
allPorts.forEach((p) => write(`puertos/${p.slug}/index.html`, portPage(p)));
write('excursiones/index.html', excursions());
write('rankings/index.html', rankings());
BEST_FOR.forEach((b) => write(`rankings/${b[0]}/index.html`, bestForPage(b)));
write('metodologia/index.html', methodology());
scored.forEach((s) => { fs.mkdirSync(path.join(OUT, 'embed', s.slug), { recursive: true }); fs.writeFileSync(path.join(OUT, 'embed', s.slug, 'index.html'), embedPage(s)); });
write('herramientas/index.html', toolsIndex());
write('herramientas/precio-real/index.html', toolPrice());
write('herramientas/alerta-precio/index.html', toolAlert());
write('herramientas/reclamar/index.html', toolClaim());
write('herramientas/que-crucero/index.html', toolQuiz());
write('herramientas/asistente/index.html', toolAssistant());
write('herramientas/comparar/index.html', toolCompare());
write('herramientas/comparar-salidas/index.html', toolCompareSailings());
write('herramientas/checklist/index.html', toolChecklist());
write('herramientas/cuenta-atras/index.html', toolCountdown());
write('herramientas/mareometro/index.html', toolSea());
write('herramientas/conversor-horario/index.html', toolTime());
write('herramientas/camarotes/index.html', toolCabins());
write('herramientas/propinas/index.html', toolTips());
write('herramientas/paquete-bebidas/index.html', toolDrinks());
write('herramientas/presupuesto-compartido/index.html', toolSplit());
write('herramientas/tiempo-puerto/index.html', toolWeather());
write('herramientas/maleta/index.html', toolPack());
write('herramientas/documentacion/index.html', toolDocs());
write('herramientas/glosario/index.html', glossary());
write('comunidad/index.html', community());
write('comunidad/salida/index.html', rollcallShell());
write('comunidad/perfil/index.html', profileShell());
write('comunidad/ranking/index.html', leaderboard());
write('mis-cruceros/index.html', myCruises());
write('admin/index.html', admin());
write('guias/index.html', guidesIndex());
GUIDES.forEach((g) => write(`guias/${g.slug}/index.html`, guidePage(g)));
write('sobre-nosotros/index.html', simplePage('/sobre-nosotros/', 'Quiénes somos', 'Quién está detrás de MejorCrucero y nuestras reglas.', about, { schema: [{ '@context': 'https://schema.org', '@type': 'AboutPage', name: 'Quiénes somos' }] }));
write('afiliacion/index.html', simplePage('/afiliacion/', 'Cómo ganamos dinero', 'Transparencia sobre los enlaces de afiliación de MejorCrucero.', affiliation));
write('newsletter/index.html', simplePage('/newsletter/', 'La newsletter de MejorCrucero', 'Qué recibirás en la newsletter semanal de chollos de cruceros.', newsletter));
write('creadores/index.html', simplePage('/creadores/', 'Programa de creadores', 'Colabora con MejorCrucero con tus vídeos de cruceros.', creators));
write('sorteo/index.html', simplePage('/sorteo/', 'Sorteo de la comunidad', 'Sorteo de la comunidad de MejorCrucero.', raffle, { noindex: true }));
write('aviso-legal/index.html', simplePage('/aviso-legal/', 'Aviso legal', 'Aviso legal de MejorCrucero.com', legal));
write('privacidad/index.html', simplePage('/privacidad/', 'Política de privacidad', 'Política de privacidad de MejorCrucero.com', privacy));
write('cookies/index.html', simplePage('/cookies/', 'Política de cookies', 'Política de cookies de MejorCrucero.com', cookies));
write('404.html', notFound());
write('offline/index.html', offline());

// datos para el JS del cliente
const lineOf = (slug) => Object.values(LINES).find((l) => l.slug === slug) || {};
write('data/ships.json', JSON.stringify(ships.map(({ name, slug, lineShort, lineSlug, year, gt, pax, ratio, size, color, tier, photo, videos, sc, crew, tags, rank, score }) => ({ name, slug, lineShort, lineSlug, year, gt, pax, ratio, size, color, tier, es: !!lineOf(lineSlug).es, tip: lineOf(lineSlug).tip ?? null, img: photo?.thumb ? (photo.local ? BASE.replace(/\/$/, '') : '') + photo.thumb : null, v: videos.length, sc, crew, rank: rank ?? null, tags: tags.map((t) => t[0]), p: score ? Object.fromEntries(score.parts.map((x) => [x.k, x.pts])) : null }))));
write('data/index.json', JSON.stringify([
  ...ships.map((s) => [s.name, `/barcos/${s.slug}/`, s.lineShort]),
  ...lineList.map((l) => [l.short, `/navieras/${l.slug}/`, 'Naviera']),
  ...DESTINATIONS.map((d) => [d.name, `/destinos/${d.slug}/`, 'Destino']),
  ...allPorts.map((p) => [p.name, `/puertos/${p.slug}/`, 'Puerto']),
  ...GUIDES.map((g) => [g.title, `/guias/${g.slug}/`, 'Guía']),
  ...TOOLS.map(([s, , n]) => [n, `/herramientas/${s}/`, 'Herramienta']),
]));
write('data/sailings.json', JSON.stringify(sailings));
write('data/config.json', JSON.stringify({ api: CONFIG.api, ab: CONFIG.ab, fx }));

// sitemap + robots + service worker
const sm = pages.filter((p) => !p.noindex).map((p) => `<url><loc>${SITE}${p.url}</loc><lastmod>${BUILD_DATE}</lastmod></url>`).join('');
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sm}</urlset>`);
write('robots.txt', `User-agent: *\nAllow: /\nDisallow: /comunidad/salida/\nDisallow: /comunidad/perfil/\nDisallow: /admin/\nDisallow: /embed/\nSitemap: ${SITE}/sitemap.xml\n`);
write('sw.js', `const V='mc-${Date.now()}';const B='${BASE}';const CORE=[B,B+'offline/',B+'assets/style.css?v=${BUILD_DATE}',B+'assets/app.js?v=${BUILD_DATE}',B+'mis-cruceros/',B+'herramientas/checklist/',B+'herramientas/cuenta-atras/'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
if(r.mode==='navigate'){e.respondWith(fetch(r).then(res=>{const c=res.clone();caches.open(V).then(x=>x.put(r,c));return res}).catch(()=>caches.match(r).then(m=>m||caches.match(B+'offline/'))));return}
e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{if(res.ok){const c=res.clone();caches.open(V).then(x=>x.put(r,c))}return res})))});`);
write('.nojekyll', '');
if (process.env.CNAME) write('CNAME', process.env.CNAME + '\n');

{
  const p = path.join(OUT, 'assets/style.css');
  fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s*\n\s*/g, '').replace(/\s*([{}:;,>])\s*/g, '$1').replace(/;}/g, '}'));
}
console.log(`OK: ${pages.length} páginas, ${ships.length} barcos, ${totalVideos} vídeos, ${Object.keys(photos).length} fotos, ${sailings.length} salidas, fx=${fx ? fx.usdEur : 'no'} (BASE=${BASE})`);
