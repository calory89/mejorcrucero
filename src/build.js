// Generador estático de MejorCrucero.com — sin dependencias. `node src/build.js`
// BASE: ruta base de despliegue ("/" con dominio propio, "/mejorcrucero/" en github.io)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CONFIG, LINES, VIDEOS, VIDEO_TOPICS, HOME_PORTS, SCALE_PORTS, SOURCES } from './data/content.js';
import { GUIDES } from './data/guides.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'dist');
const BASE = (process.env.BASE || '/').replace(/\/?$/, '/');
const SITE = CONFIG.siteUrl;
const BUILD_DATE = new Date().toISOString().slice(0, 10);

// ---------- utilidades ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slugify = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const dec = (r) => (r == null ? '—' : String(r).replace('.', ','));
const fmt = (n) => (n == null ? '—' : Number(n).toLocaleString('es-ES'));
const pages = []; // para sitemap
function write(rel, html) {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}
function rebase(html) {
  if (BASE === '/') return html;
  return html.replace(/(href|src|action|data-base)="\/(?!\/)/g, `$1="${BASE}`);
}

// ---------- datos ----------
const csv = fs.readFileSync(path.join(__dirname, 'data/ships.csv'), 'utf8').trim().split('\n').slice(1);
const ships = csv.map((row) => {
  const [name, line, year, gt, pax] = row.split(',');
  const L = LINES[line];
  const s = { name, line, lineShort: L.short, lineSlug: L.slug, color: L.color, year: +year, gt: +gt, pax: pax ? +pax : null, slug: slugify(name) };
  s.ratio = s.pax ? Math.round((s.gt / s.pax) * 10) / 10 : null;
  s.size = s.gt >= 200000 ? 'Gigante' : s.gt >= 160000 ? 'Muy grande' : 'Grande';
  s.age = 2026 - s.year;
  s.videos = VIDEOS[s.slug] || [];
  return s;
});
const bySlug = Object.fromEntries(ships.map((s) => [s.slug, s]));
const lineList = Object.entries(LINES).map(([full, L]) => ({ full, ...L, ships: ships.filter((s) => s.line === full) })).filter((l) => l.ships.length);
const spaceLabel = (r) => (r == null ? 'Sin dato' : r >= 45 ? 'Muy espacioso' : r >= 38 ? 'Espacioso' : r >= 33 ? 'Estándar' : 'Concurrido');

// ---------- piezas ----------
let svgN = 0;
function shipSvg(s, w = 320) {
  const c = s.color;
  const id = 'w' + (++svgN);
  const decks = s.gt >= 200000 ? 7 : s.gt >= 160000 ? 6 : 5;
  let rows = '';
  for (let i = 0; i < decks; i++) {
    const y = 78 - i * 8, inset = 18 + i * 9, wd = 300 - inset * 2 + 20;
    rows += `<rect x="${inset}" y="${y}" width="${wd}" height="6" rx="2" fill="${i % 2 ? '#fff' : '#f1f5f9'}"/><rect x="${inset + 5}" y="${y + 1.5}" width="${wd - 10}" height="3" fill="url(#${id})"/>`;
  }
  return `<svg viewBox="0 0 340 130" width="${w}" role="img" aria-label="Ilustración del ${esc(s.name)}" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="${id}" width="9" height="3" patternUnits="userSpaceOnUse"><rect width="4" height="3" rx="1" fill="${c}" opacity=".55"/></pattern></defs>${rows}<rect x="150" y="${78 - decks * 8 - 10}" width="26" height="12" rx="3" fill="${c}"/><path d="M8 86H332L304 112H34Z" fill="${c}"/><path d="M8 86H332L328 92H12Z" fill="#fff" opacity=".25"/><path d="M0 116q20-6 40 0t40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0" stroke="#fff" stroke-width="2" fill="none" opacity=".6"/></svg>`;
}

const ICON = {
  search: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M10 3a7 7 0 1 0 4.2 12.6l4.6 4.6 1.4-1.4-4.6-4.6A7 7 0 0 0 10 3Zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z"/></svg>',
  play: '<svg viewBox="0 0 68 48" width="68" height="48" aria-hidden="true"><path d="M66.5 7.7a8.5 8.5 0 0 0-6-6C55.3.3 34 .3 34 .3s-21.3 0-26.5 1.4a8.5 8.5 0 0 0-6 6A89 89 0 0 0 .1 24a89 89 0 0 0 1.4 16.3 8.5 8.5 0 0 0 6 6C12.7 47.7 34 47.7 34 47.7s21.3 0 26.5-1.4a8.5 8.5 0 0 0 6-6A89 89 0 0 0 67.9 24a89 89 0 0 0-1.4-16.3Z" fill="#e11d48"/><path d="m45 24-18-10v20z" fill="#fff"/></svg>',
  wa: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 20Zm4.4-6c-.2-.1-1.4-.7-1.7-.8s-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6a2.6 2.6 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .2-1.2c-.1-.1-.2-.2-.5-.3Z"/></svg>',
};

function shipCard(s) {
  return `<a class="card ship-card" href="/barcos/${s.slug}/" data-name="${esc(s.name.toLowerCase())}" data-line="${s.lineSlug}" data-size="${s.size}" data-gt="${s.gt}" data-year="${s.year}" data-ratio="${s.ratio ?? 0}" data-pax="${s.pax ?? 0}">
  <div class="ship-art" style="--c:${s.color}">${shipSvg(s, 300)}${s.videos.length ? '<span class="pill pill-video">▶ Vídeos</span>' : ''}</div>
  <div class="card-body"><span class="eyebrow">${esc(s.lineShort)}</span><h3>${esc(s.name)}</h3>
  <ul class="facts"><li><b>${s.year}</b> año</li><li><b>${fmt(s.pax)}</b> pasajeros</li><li><b>${dec(s.ratio)}</b> espacio</li></ul></div></a>`;
}

function videoFacade(id, title) {
  return `<button class="yt" type="button" data-id="${id}" aria-label="Reproducir vídeo: ${esc(title)}"><img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="" loading="lazy" decoding="async" width="480" height="360"><span class="yt-play">${ICON.play}</span><span class="yt-title">${esc(title)}</span></button>`;
}

function affLink(key, extra = '') {
  const a = CONFIG.affiliates[key];
  const url = a.url + extra;
  return a.param ? url + (url.includes('?') ? '&' : '?') + a.param : url;
}
function civLink(slug) {
  const a = CONFIG.affiliates.civitatis;
  return a.base + slug + '/' + (a.param ? '?' + a.param : '');
}

function giscusBlock(term, title) {
  const g = CONFIG.giscus;
  return `<section class="forum" id="foro" aria-labelledby="foro-h"><h2 id="foro-h">${esc(title)}</h2>
  <div class="giscus-mount" data-term="${esc(term)}" data-enabled="${g.enabled && g.categoryId ? '1' : '0'}" data-repo="${g.repo}" data-repo-id="${g.repoId}" data-category="${esc(g.category)}" data-category-id="${g.categoryId}">
    <div class="forum-soon"><p><strong>El foro de este barco se abre muy pronto.</strong> Aquí podrás preguntar a quien ya ha navegado, dejar tu opinión y compartir vídeos de tu camarote.</p>
    <p>Mientras tanto, apúntate y te avisamos cuando se abra:</p>${leadForm('foro:' + term, 'Avisadme cuando abra el foro')}</div>
  </div></section>`;
}

function leadForm(source, cta = 'Quiero los chollos') {
  return `<form class="lead" data-source="${esc(source)}"><label class="sr" for="em-${esc(source)}">Tu email</label><input id="em-${esc(source)}" type="email" name="email" placeholder="tu@email.com" required autocomplete="email"><button class="btn" type="submit">${esc(cta)}</button><p class="form-msg" role="status" aria-live="polite"></p></form>`;
}

function shareBar(text, url) {
  const full = SITE + url;
  return `<div class="share"><a class="btn btn-wa" href="https://wa.me/?text=${encodeURIComponent(text + ' ' + full)}" target="_blank" rel="noopener">${ICON.wa} Compartir por WhatsApp</a><button class="btn btn-ghost js-share" type="button" data-title="${esc(text)}" data-url="${full}">Compartir</button></div>`;
}

// ---------- layout ----------
const NAV = [
  ['/barcos/', 'Barcos'], ['/navieras/', 'Navieras'], ['/puertos/', 'Puertos'], ['/herramientas/precio-real/', 'Precio real'], ['/comunidad/', 'Comunidad'], ['/guias/', 'Guías'],
];

function layout({ title, desc, url, body, schema = [], ogType = 'website', crumbs = null, noindex = false }) {
  pages.push({ url, noindex });
  const fullTitle = url === '/' ? title : `${title} | MejorCrucero`;
  const ld = [
    { '@context': 'https://schema.org', '@type': 'Organization', name: 'MejorCrucero', url: SITE, logo: SITE + '/icon-512.png', sameAs: [CONFIG.happyLowCost] },
    ...schema,
  ];
  if (crumbs) {
    ld.push({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: crumbs.map(([n, u], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: SITE + u })) });
  }
  const crumbHtml = crumbs ? `<nav class="crumbs wrap" aria-label="Migas de pan"><ol>${crumbs.map(([n, u], i) => i === crumbs.length - 1 ? `<li aria-current="page">${esc(n)}</li>` : `<li><a href="${u}">${esc(n)}</a></li>`).join('')}</ol></nav>` : '';
  return rebase(`<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${url}">
${noindex ? '<meta name="robots" content="noindex">' : ''}
<meta name="theme-color" content="#0b2540">
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="MejorCrucero">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE}${url}">
<meta property="og:image" content="${SITE}/og.png">
<meta property="og:locale" content="es_ES">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/icon-192.png">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="preconnect" href="https://i.ytimg.com">
<link rel="stylesheet" href="/assets/style.css?v=${BUILD_DATE}">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
</head>
<body data-base="/">
<a class="skip" href="#main">Saltar al contenido</a>
<header class="top"><div class="wrap top-in">
<a class="logo" href="/" aria-label="MejorCrucero, inicio"><svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true"><circle cx="20" cy="20" r="20" fill="#0b2540"/><path d="M8 24h24l-3 6H11z" fill="#f25c3c"/><path d="M12 23v-4h16v4zM15 18v-4h10v4z" fill="#fff"/><path d="M19 13V9h3v4z" fill="#f25c3c"/></svg><span>Mejor<b>Crucero</b></span></a>
<nav class="nav" aria-label="Principal"><ul>${NAV.map(([u, n]) => `<li><a href="${u}"${url.startsWith(u) ? ' aria-current="page"' : ''}>${n}</a></li>`).join('')}</ul></nav>
<a class="btn btn-sm nav-cta" href="/herramientas/alerta-precio/">🔔 Alerta de precio</a>
</div></header>
${crumbHtml}
<main id="main">${body}</main>
<footer class="foot"><div class="wrap foot-in">
<div><a class="logo logo-foot" href="/"><span>Mejor<b>Crucero</b></span></a><p>El comparador de cruceros en español hecho por cruceristas: barcos, vídeos, precio real y comunidad. De los creadores de <a href="${CONFIG.happyLowCost}" target="_blank" rel="noopener">Happy Low Cost</a>, más de 400.000 viajeros en Facebook.</p></div>
<div><h2>Explorar</h2><ul><li><a href="/barcos/">Todos los barcos</a></li><li><a href="/rankings/">Rankings</a></li><li><a href="/navieras/">Navieras</a></li><li><a href="/puertos/">Puertos de España</a></li><li><a href="/excursiones/">Excursiones por puerto</a></li></ul></div>
<div><h2>Herramientas</h2><ul><li><a href="/herramientas/precio-real/">Calculadora precio real</a></li><li><a href="/herramientas/alerta-precio/">Alerta de bajada de precio</a></li><li><a href="/herramientas/que-crucero/">¿Qué crucero es para mí?</a></li><li><a href="/herramientas/comparar/">Comparar barcos</a></li><li><a href="/comunidad/">Grupos por salida</a></li></ul></div>
<div><h2>MejorCrucero</h2><ul><li><a href="/sobre-nosotros/">Quiénes somos</a></li><li><a href="/afiliacion/">Cómo ganamos dinero</a></li><li><a href="/aviso-legal/">Aviso legal</a></li><li><a href="/privacidad/">Privacidad</a></li><li><a href="/cookies/">Cookies</a></li></ul></div>
</div><p class="wrap fine">© ${new Date().getFullYear()} MejorCrucero.com · Algunos enlaces son de afiliado: si reservas a través de ellos podemos recibir una comisión, sin coste extra para ti. Los datos técnicos de los barcos proceden de fuentes públicas citadas en cada página.</p></footer>
<script src="/assets/app.js?v=${BUILD_DATE}" defer></script>
</body></html>`);
}

// ---------- páginas ----------
const featured = ['msc-world-europa', 'icon-of-the-seas', 'costa-smeralda', 'costa-toscana', 'msc-grandiosa', 'wonder-of-the-seas', 'msc-euribia', 'msc-seashore'].map((k) => bySlug[k]);

function home() {
  const roomiest = ships.filter((s) => s.ratio).sort((a, b) => b.ratio - a.ratio).slice(0, 5);
  const body = `
<section class="hero"><div class="wrap hero-in">
  <div class="hero-copy">
    <p class="kicker">El comparador de cruceros en español</p>
    <h1>Elige el crucero perfecto y descubre <em>lo que de verdad cuesta</em></h1>
    <p class="lead-p">Fichas de ${ships.length} barcos, vídeos reales, el precio final con propinas incluidas, alertas si baja el precio después de reservar y un foro por cada barco y cada salida.</p>
    <form class="search" action="/barcos/" role="search"><label class="sr" for="q">Busca un barco o naviera</label>${ICON.search}<input id="q" name="q" list="ships-dl" placeholder="Busca un barco: MSC World Europa, Icon of the Seas…" autocomplete="off"><datalist id="ships-dl">${ships.map((s) => `<option value="${esc(s.name)}">`).join('')}</datalist><button class="btn" type="submit">Buscar</button></form>
    <div class="chips"><a class="chip" href="/navieras/msc/">MSC</a><a class="chip" href="/navieras/costa/">Costa</a><a class="chip" href="/navieras/royal-caribbean/">Royal Caribbean</a><a class="chip" href="/puertos/barcelona/">Desde Barcelona</a><a class="chip" href="/guias/crucero-con-bebe/">Con bebé</a><a class="chip" href="/rankings/#nuevos">Barcos más nuevos</a></div>
  </div>
  <div class="hero-art" aria-hidden="true">${shipSvg(bySlug['msc-world-europa'], 520)}</div>
</div></section>

<section class="wrap usp" aria-label="Por qué MejorCrucero">
  <a class="usp-i" href="/herramientas/precio-real/"><span class="usp-e">💶</span><h2>Precio real</h2><p>Sumamos propinas, bebidas, excursiones y traslados. Sin sorpresas al desembarcar.</p></a>
  <a class="usp-i" href="/herramientas/alerta-precio/"><span class="usp-e">🔔</span><h2>¿Ha bajado tu crucero?</h2><p>Guarda tu reserva y vigila si baja el precio para reclamar la diferencia.</p></a>
  <a class="usp-i" href="#videos"><span class="usp-e">🎬</span><h2>Vídeos de cada barco</h2><p>Camarotes, bufé, piscinas y opiniones sinceras de cruceristas reales.</p></a>
  <a class="usp-i" href="/comunidad/"><span class="usp-e">💬</span><h2>Foro por barco y salida</h2><p>Conoce a tus compañeros de viaje antes de embarcar y comparte excursiones.</p></a>
</section>

<section class="wrap block" id="videos"><div class="block-h"><h2>Los barcos más buscados, en vídeo</h2><a href="/barcos/">Ver los ${ships.length} barcos →</a></div>
<div class="grid">${featured.map(shipCard).join('')}</div></section>

<section class="band"><div class="wrap block tools">
  <div class="block-h"><h2>Herramientas que nadie más te da</h2></div>
  <div class="grid grid-3">
    <a class="tool" href="/herramientas/precio-real/"><h3>Calculadora del precio real</h3><p>El precio de portada no es lo que pagas. Descubre el total en 30 segundos.</p><span class="btn btn-sm">Calcular →</span></a>
    <a class="tool" href="/herramientas/que-crucero/"><h3>¿Qué crucero es para mí?</h3><p>4 preguntas y te recomendamos los barcos que encajan contigo.</p><span class="btn btn-sm">Hacer el test →</span></a>
    <a class="tool" href="/herramientas/comparar/"><h3>Comparador de barcos</h3><p>Pon hasta 3 barcos frente a frente: tamaño, edad, espacio por pasajero.</p><span class="btn btn-sm">Comparar →</span></a>
  </div>
</div></section>

<section class="wrap block"><div class="block-h"><h2>Embarca sin salir de España</h2><a href="/puertos/">Todos los puertos →</a></div>
<div class="ports">${HOME_PORTS.map((p) => `<a class="port" href="/puertos/${p.slug}/"><b>${esc(p.name)}</b><span>${esc(p.region)}</span></a>`).join('')}</div></section>

<section class="wrap block split">
  <div><div class="block-h"><h2>Los barcos con más espacio por pasajero</h2></div>
  <ol class="rank">${roomiest.map((s, i) => `<li><span class="rank-n">${i + 1}</span><a href="/barcos/${s.slug}/">${esc(s.name)}</a><span class="rank-v">${dec(s.ratio)}</span></li>`).join('')}</ol>
  <p class="muted small">Índice de espacio = arqueo bruto ÷ pasajeros. Cuanto más alto, menos colas y más sitio en la piscina. <a href="/rankings/">Ver rankings completos</a>.</p></div>
  <div><div class="block-h"><h2>Navieras</h2></div>
  <div class="lines">${lineList.filter((l) => l.ships.length >= 2).map((l) => `<a class="line" href="/navieras/${l.slug}/" style="--c:${l.color}"><b>${esc(l.short)}</b><span>${l.ships.length} barcos</span></a>`).join('')}</div></div>
</section>

<section class="wrap block"><div class="block-h"><h2>Guías para cruceristas</h2><a href="/guias/">Todas las guías →</a></div>
<div class="grid grid-3">${GUIDES.slice(0, 6).map((g) => `<a class="card guide" href="/guias/${g.slug}/"><span class="guide-e">${g.emoji}</span><h3>${esc(g.title)}</h3><p>${esc(g.desc)}</p></a>`).join('')}</div></section>

<section class="cta-band"><div class="wrap cta-in">
  <div><h2>Chollos de cruceros en tu email</h2><p>Una selección semanal de las mejores ofertas desde España, con el precio real calculado. Sin spam.</p></div>
  ${leadForm('newsletter-home', 'Quiero los chollos')}
</div></section>`;
  return layout({
    title: 'MejorCrucero: compara cruceros en español con precio real, vídeos y opiniones',
    desc: `Compara ${ships.length} barcos de crucero con vídeos, precio real con propinas, alertas de bajada de precio y foro por barco. Cruceros desde Barcelona, Málaga, Valencia y más.`,
    url: '/', body,
    schema: [{ '@context': 'https://schema.org', '@type': 'WebSite', name: 'MejorCrucero', url: SITE, inLanguage: 'es', potentialAction: { '@type': 'SearchAction', target: SITE + '/barcos/?q={q}', 'query-input': 'required name=q' } }],
  });
}

function shipsIndex() {
  const body = `<section class="wrap block page-h"><h1>Todos los barcos de crucero</h1><p class="lead-p">${ships.length} barcos de ${lineList.length} navieras. Filtra, ordena y entra en cada ficha para ver vídeos, comparar precios y preguntar en su foro.</p>
  <form class="filters" id="filters" role="search">
    <label><span>Buscar</span><input name="q" type="search" placeholder="Nombre del barco" autocomplete="off"></label>
    <label><span>Naviera</span><select name="line"><option value="">Todas</option>${lineList.map((l) => `<option value="${l.slug}">${esc(l.short)}</option>`).join('')}</select></label>
    <label><span>Tamaño</span><select name="size"><option value="">Todos</option><option>Gigante</option><option>Muy grande</option><option>Grande</option></select></label>
    <label><span>Ordenar</span><select name="sort"><option value="gt">Más grandes</option><option value="year">Más nuevos</option><option value="ratio">Más espaciosos</option><option value="name">A–Z</option></select></label>
  </form><h2 class="sr">Resultados</h2><p class="muted small" id="count" aria-live="polite"></p>
  <div class="grid" id="ship-grid">${[...ships].sort((a, b) => b.gt - a.gt).map(shipCard).join('')}</div>
  <p class="empty" id="empty" hidden>No hay barcos con esos filtros. <a href="/barcos/">Ver todos</a>.</p></section>`;
  return layout({ title: 'Todos los barcos de crucero: fichas, vídeos y comparador', desc: `Fichas de ${ships.length} barcos de crucero de MSC, Costa, Royal Caribbean, Norwegian y más: tamaño, año, pasajeros, espacio, vídeos y foro.`, url: '/barcos/', body, crumbs: [['Inicio', '/'], ['Barcos', '/barcos/']] });
}

function shipPage(s) {
  const L = LINES[s.line];
  const similar = ships.filter((o) => o.slug !== s.slug && (o.line === s.line || Math.abs(o.gt - s.gt) < 8000)).sort((a, b) => (a.line === s.line ? -1 : 1) - (b.line === s.line ? -1 : 1) || Math.abs(a.gt - s.gt) - Math.abs(b.gt - s.gt)).slice(0, 4);
  const rankGt = [...ships].sort((a, b) => b.gt - a.gt).findIndex((o) => o.slug === s.slug) + 1;
  const ytq = (t) => `https://www.youtube.com/results?search_query=${encodeURIComponent(s.name + ' ' + t)}`;
  const faqs = [
    [`¿Cuántos pasajeros lleva el ${s.name}?`, s.pax ? `El ${s.name} tiene capacidad para unos ${fmt(s.pax)} pasajeros según las cifras publicadas (la capacidad máxima puede ser mayor si se ocupan las terceras y cuartas camas).` : `No tenemos una cifra verificada de pasajeros para el ${s.name}.`],
    [`¿Qué tamaño tiene el ${s.name}?`, `El ${s.name} tiene un arqueo bruto de ${fmt(s.gt)} GT, lo que lo sitúa en el puesto ${rankGt} de los ${ships.length} barcos que analizamos.`],
    [`¿Cuándo empezó a navegar el ${s.name}?`, `El ${s.name} entró en servicio en ${s.year}.`],
    [`¿Qué naviera opera el ${s.name}?`, `El ${s.name} pertenece a ${L.short}. ${L.blurb}`],
  ];
  if (L.es) faqs.push([`¿Se habla español a bordo del ${s.name}?`, `${L.short} trabaja mucho con el mercado español y en sus cruceros por el Mediterráneo es habitual encontrar información, anuncios y personal en español. Confirma los idiomas de tu salida concreta al reservar.`]);
  const body = `
<article class="ship">
<section class="ship-hero" style="--c:${s.color}"><div class="wrap ship-hero-in">
  <div>
    <a class="eyebrow eyebrow-l" href="/navieras/${s.lineSlug}/">${esc(L.short)}</a>
    <h1>${esc(s.name)}</h1>
    <p class="lead-p">Barco ${s.size.toLowerCase()} de ${esc(L.short)} en servicio desde ${s.year}${s.pax ? `, con capacidad para unos ${fmt(s.pax)} pasajeros` : ''}. Vídeos, ficha técnica, dónde reservar y opiniones de cruceristas.</p>
    <div class="stats">
      <div><b>${s.year}</b><span>Año</span></div>
      <div><b>${fmt(s.gt)}</b><span>Arqueo (GT)</span></div>
      <div><b>${fmt(s.pax)}</b><span>Pasajeros</span></div>
      <div><b>${dec(s.ratio)}</b><span>Espacio · ${spaceLabel(s.ratio)}</span></div>
    </div>
    <div class="actions"><a class="btn" href="#reservar">Comparar precios</a><a class="btn btn-ghost" href="#videos">Ver vídeos</a><button class="btn btn-ghost js-compare" type="button" data-slug="${s.slug}">+ Comparar</button></div>
  </div>
  <div class="ship-hero-art" aria-hidden="true">${shipSvg(s, 460)}</div>
</div></section>

<div class="wrap ship-grid">
<div class="ship-main">
  <section id="reservar" class="block"><h2>Dónde reservar el ${esc(s.name)}</h2>
  <p class="muted">Compara la misma salida en la naviera y en las agencias. Los precios en directo se están conectando: de momento te llevamos a la búsqueda de cada sitio.</p>
  <div class="partners">
    ${L.web ? `<a class="partner" href="${L.web}" target="_blank" rel="noopener"><b>Web oficial de ${esc(L.short)}</b><span>Precio de la naviera</span><span class="go">Ver precios →</span></a>` : ''}
    <a class="partner" href="${affLink('logitravel')}" target="_blank" rel="sponsored noopener"><b>Logitravel</b><span>Agencia online</span><span class="go">Ver precios →</span></a>
    <a class="partner" href="${affLink('crucerosnet')}" target="_blank" rel="sponsored noopener"><b>Crucerosnet</b><span>Especialista en cruceros</span><span class="go">Ver precios →</span></a>
    <a class="partner" href="${affLink('vayacruceros')}" target="_blank" rel="sponsored noopener"><b>VayaCruceros</b><span>Especialista en cruceros</span><span class="go">Ver precios →</span></a>
  </div>
  <div class="tip"><b>Antes de pagar:</b> calcula el <a href="/herramientas/precio-real/?linea=${s.lineSlug}">precio real con propinas y extras</a> y guarda tu reserva en la <a href="/herramientas/alerta-precio/?barco=${s.slug}">alerta de bajada de precio</a>.</div>
  </section>

  <section id="videos" class="block"><h2>Vídeos del ${esc(s.name)}</h2>
  ${s.videos.length ? `<div class="videos">${s.videos.map(([id, t]) => videoFacade(id, t)).join('')}</div><p class="muted small">Vídeos públicos de YouTube de sus autores. Se cargan solo al pulsar.</p>` : `<p class="muted">Aún no hemos seleccionado vídeos de este barco. Mientras tanto, abre directamente lo que te interesa:</p>`}
  <h3 class="h-sm">Busca vídeos por tema</h3>
  <div class="chips">${VIDEO_TOPICS.map(([lbl, q]) => `<a class="chip" href="${ytq(q)}" target="_blank" rel="noopener">▶ ${lbl}</a>`).join('')}</div>
  </section>

  <section class="block"><h2>Ficha técnica</h2>
  <table class="spec"><tbody>
    <tr><th scope="row">Naviera</th><td><a href="/navieras/${s.lineSlug}/">${esc(L.short)}</a></td></tr>
    <tr><th scope="row">Entrada en servicio</th><td>${s.year} (${s.age <= 0 ? 'nuevo' : s.age === 1 ? '1 año' : s.age + ' años'})</td></tr>
    <tr><th scope="row">Arqueo bruto</th><td>${fmt(s.gt)} GT · puesto ${rankGt} de ${ships.length}</td></tr>
    <tr><th scope="row">Pasajeros</th><td>${fmt(s.pax)}</td></tr>
    <tr><th scope="row">Índice de espacio</th><td>${dec(s.ratio)} GT por pasajero · ${spaceLabel(s.ratio)}</td></tr>
    <tr><th scope="row">Cargo de servicio (ref.)</th><td>${L.tip ? `${String(L.tip).replace('.', ',')} $ por persona y noche (camarote estándar, mercado EE. UU.)` : 'Consulta las condiciones de tu reserva'}</td></tr>
  </tbody></table>
  <p class="muted small">Índice de espacio: arqueo bruto dividido entre pasajeros. Orientativo: algunas navieras publican capacidad máxima y otras a doble ocupación. Fuente de datos: <a href="${SOURCES[0][1]}" target="_blank" rel="noopener">Wikipedia</a>.</p>
  </section>

  ${giscusBlock('barco:' + s.slug, `Foro y opiniones del ${s.name}`)}

  <section class="block rollcall"><h2>¿Vas a navegar en el ${esc(s.name)}?</h2><p>Únete al grupo de tu salida: conoce a otros pasajeros, comparte excursiones y resuelve dudas antes de embarcar.</p>
  <form class="rc-form" action="/comunidad/salida/" method="get"><input type="hidden" name="b" value="${s.slug}"><label><span>Fecha de salida</span><input type="date" name="f" required></label><button class="btn" type="submit">Entrar al grupo</button></form></section>

  <section class="block faq"><h2>Preguntas frecuentes</h2>${faqs.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</section>
</div>

<aside class="ship-side">
  <div class="side-card"><h2>Comparte este barco</h2>${shareBar(`Mira el ${s.name} en MejorCrucero:`, `/barcos/${s.slug}/`)}</div>
  <div class="side-card"><h2>Barcos parecidos</h2><ul class="mini">${similar.map((o) => `<li><a href="/barcos/${o.slug}/"><b>${esc(o.name)}</b><span>${esc(o.lineShort)} · ${o.year} · ${fmt(o.gt)} GT</span></a></li>`).join('')}</ul></div>
  <div class="side-card"><h2>Guías útiles</h2><ul class="mini"><li><a href="/guias/como-elegir-camarote/"><b>Cómo elegir camarote</b><span>Y cuáles evitar</span></a></li><li><a href="/guias/propinas-y-cargos-de-servicio/"><b>Propinas y cargos</b><span>Cuánto se paga de verdad</span></a></li><li><a href="/guias/cuando-reservar-crucero/"><b>Cuándo reservar</b><span>Para pagar menos</span></a></li></ul></div>
</aside>
</div>
</article>`;
  return layout({
    title: `${s.name}: opiniones, vídeos, camarotes y precios`,
    desc: `${s.name} de ${L.short} (${s.year}, ${fmt(s.gt)} GT${s.pax ? `, ${fmt(s.pax)} pasajeros` : ''}): vídeos del barco y camarotes, dónde reservar más barato, precio real con propinas y foro de cruceristas.`,
    url: `/barcos/${s.slug}/`, body, ogType: 'article',
    crumbs: [['Inicio', '/'], ['Barcos', '/barcos/'], [L.short, `/navieras/${s.lineSlug}/`], [s.name, `/barcos/${s.slug}/`]],
    schema: [
      { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    ],
  });
}

function linesIndex() {
  const body = `<section class="wrap block page-h"><h1>Navieras de cruceros</h1><p class="lead-p">Cada naviera tiene su estilo. Encuentra la tuya y mira todos sus barcos.</p>
  <div class="grid grid-3">${lineList.map((l) => `<a class="card line-card" href="/navieras/${l.slug}/" style="--c:${l.color}"><span class="line-bar"></span><h2>${esc(l.short)}</h2><p>${esc(l.blurb)}</p><span class="muted small">${l.ships.length} barco${l.ships.length > 1 ? 's' : ''}${l.es ? ' · Español a bordo en el Mediterráneo' : ''}</span></a>`).join('')}</div></section>`;
  return layout({ title: 'Navieras de cruceros: MSC, Costa, Royal Caribbean y más', desc: 'Compara las principales navieras de cruceros: estilo, barcos, cargos de servicio y para quién es cada una.', url: '/navieras/', body, crumbs: [['Inicio', '/'], ['Navieras', '/navieras/']] });
}

function linePage(l) {
  const body = `<section class="wrap block page-h line-h" style="--c:${l.color}"><span class="line-bar"></span><h1>Cruceros ${esc(l.short)}</h1><p class="lead-p">${esc(l.blurb)}</p>
  <div class="stats stats-light"><div><b>${l.ships.length}</b><span>Barcos analizados</span></div><div><b>${Math.max(...l.ships.map((s) => s.year))}</b><span>Barco más nuevo</span></div><div><b>${l.tip ? String(l.tip).replace('.', ',') + ' $' : '—'}</b><span>Cargo servicio/noche (ref.)</span></div><div><b>${l.es ? 'Sí' : 'Consultar'}</b><span>Español a bordo</span></div></div>
  ${l.web ? `<p><a class="btn" href="${l.web}" target="_blank" rel="noopener">Web oficial de ${esc(l.short)}</a> <a class="btn btn-ghost" href="/herramientas/precio-real/?linea=${l.slug}">Calcular precio real</a></p>` : ''}
  </section>
  <section class="wrap block"><h2>Barcos de ${esc(l.short)}</h2><div class="grid">${[...l.ships].sort((a, b) => b.year - a.year).map(shipCard).join('')}</div></section>
  <section class="wrap block">${shareBar(`Barcos de ${l.short} comparados en MejorCrucero:`, `/navieras/${l.slug}/`)}</section>`;
  return layout({ title: `Cruceros ${l.short}: barcos, opiniones y precio real`, desc: `Todos los barcos de ${l.short} comparados: año, tamaño, pasajeros y espacio, vídeos, cargos de servicio y dónde reservar.`, url: `/navieras/${l.slug}/`, body, crumbs: [['Inicio', '/'], ['Navieras', '/navieras/'], [l.short, `/navieras/${l.slug}/`]] });
}

function portsIndex() {
  const body = `<section class="wrap block page-h"><h1>Puertos de embarque de cruceros en España</h1><p class="lead-p">Empieza tu crucero cerca de casa. Elige puerto para ver qué ofrece, excursiones y cómo organizarte.</p>
  <div class="grid grid-3">${HOME_PORTS.map((p) => `<a class="card port-card" href="/puertos/${p.slug}/"><span class="eyebrow">${esc(p.region)}</span><h2>${esc(p.name)}</h2><p>${esc(p.text)}</p></a>`).join('')}</div>
  <p><a href="/guias/cruceros-desde-espana-sin-avion/">Guía: cruceros desde España sin coger avión →</a></p></section>`;
  return layout({ title: 'Puertos de cruceros en España: Barcelona, Málaga, Valencia, Palma…', desc: 'Los puertos de embarque de cruceros en España: Barcelona, Palma, Valencia, Málaga, Alicante, Cádiz, Tarragona, Bilbao, Vigo y Canarias.', url: '/puertos/', body, crumbs: [['Inicio', '/'], ['Puertos', '/puertos/']] });
}

function portPage(p) {
  const body = `<section class="wrap block page-h"><span class="eyebrow">${esc(p.region)}</span><h1>Cruceros desde ${esc(p.name)}</h1><p class="lead-p">${esc(p.text)}</p></section>
  <section class="wrap block grid grid-3">
    <a class="tool" href="${civLink(p.civ)}" target="_blank" rel="sponsored noopener"><h2>Excursiones en ${esc(p.name)}</h2><p>Si llegas antes o es una escala, aprovecha el día con visitas guiadas en español.</p><span class="btn btn-sm">Ver excursiones →</span></a>
    <a class="tool" href="${CONFIG.happyLowCost}" target="_blank" rel="noopener"><h2>Vuelos baratos al puerto</h2><p>Cada día publicamos chollos de vuelos en Happy Low Cost, con más de 400.000 seguidores.</p><span class="btn btn-sm">Ver vuelos →</span></a>
    <a class="tool" href="/herramientas/precio-real/"><h2>Calcula el precio real</h2><p>Suma el traslado al puerto, el aparcamiento y los extras de a bordo.</p><span class="btn btn-sm">Calcular →</span></a>
  </section>
  <section class="wrap block"><h2>Consejos para embarcar en ${esc(p.name)}</h2><ul class="list">
    <li>Llega con margen: el embarque suele cerrar unas horas antes de zarpar y en temporada alta hay colas.</li>
    <li>Comprueba en tu tarjeta de embarque la terminal exacta: en los puertos grandes hay varias.</li>
    <li>Si vas en coche, reserva el aparcamiento con antelación; si vas en tren o avión, calcula el traslado hasta el muelle.</li>
    <li>Ten a mano el documento de identidad que exige tu itinerario (DNI o pasaporte).</li>
  </ul></section>
  <section class="wrap block"><h2>Barcos que puedes comparar</h2><p class="muted">Las navieras cambian sus puertos de embarque cada temporada. Elige barco y comprueba en la web de reserva si sale desde ${esc(p.name)}.</p><div class="grid">${featured.slice(0, 4).map(shipCard).join('')}</div></section>`;
  return layout({ title: `Cruceros desde ${p.name}: puerto, excursiones y consejos`, desc: `Todo para embarcar en un crucero desde ${p.name}: qué esperar del puerto, excursiones, vuelos baratos y cómo calcular el precio real.`, url: `/puertos/${p.slug}/`, body, crumbs: [['Inicio', '/'], ['Puertos', '/puertos/'], [p.name, `/puertos/${p.slug}/`]] });
}

function excursions() {
  const body = `<section class="wrap block page-h"><h1>Excursiones en cada puerto, más baratas que las de la naviera</h1><p class="lead-p">Las excursiones que vende el barco son cómodas, pero suelen ser caras. Estas son visitas en español reservables por tu cuenta. Elige siempre un horario que te deje volver al barco con margen.</p>
  <h2>Escalas del Mediterráneo y Atlántico</h2><div class="ports">${SCALE_PORTS.map(([n, c]) => `<a class="port" href="${civLink(c)}" target="_blank" rel="sponsored noopener"><b>${esc(n)}</b><span>Ver excursiones →</span></a>`).join('')}</div>
  <h2>Puertos españoles</h2><div class="ports">${HOME_PORTS.map((p) => `<a class="port" href="${civLink(p.civ)}" target="_blank" rel="sponsored noopener"><b>${esc(p.name)}</b><span>Ver excursiones →</span></a>`).join('')}</div>
  <div class="tip"><b>Importante:</b> si vas por tu cuenta y llegas tarde, el barco no te espera. Deja al menos una hora y media de margen antes de la hora de "todos a bordo".</div></section>`;
  return layout({ title: 'Excursiones en cruceros por tu cuenta: puerto a puerto', desc: 'Excursiones en español en Roma, Nápoles, Florencia, Marsella, Malta, Atenas, Santorini, Dubrovnik y puertos españoles, más baratas que las del barco.', url: '/excursiones/', body, crumbs: [['Inicio', '/'], ['Excursiones', '/excursiones/']] });
}

function rankings() {
  const table = (list, col, label) => `<table class="rank-t"><thead><tr><th>#</th><th>Barco</th><th>Naviera</th><th>${label}</th></tr></thead><tbody>${list.map((s, i) => `<tr><td>${i + 1}</td><td><a href="/barcos/${s.slug}/">${esc(s.name)}</a></td><td>${esc(s.lineShort)}</td><td>${col(s)}</td></tr>`).join('')}</tbody></table>`;
  const big = [...ships].sort((a, b) => b.gt - a.gt).slice(0, 20);
  const roomy = ships.filter((s) => s.ratio).sort((a, b) => b.ratio - a.ratio).slice(0, 20);
  const newest = [...ships].sort((a, b) => b.year - a.year || b.gt - a.gt).slice(0, 20);
  const body = `<section class="wrap block page-h"><h1>Rankings de barcos de crucero ${new Date().getFullYear()}</h1><p class="lead-p">Datos públicos, sin opiniones compradas. Comparte el ranking con quien esté dudando.</p>${shareBar('Los rankings de barcos de crucero de MejorCrucero:', '/rankings/')}</section>
  <section class="wrap block" id="grandes"><h2>Los 20 barcos más grandes del mundo</h2>${table(big, (s) => fmt(s.gt) + ' GT', 'Arqueo')}</section>
  <section class="wrap block" id="espaciosos"><h2>Los 20 barcos con más espacio por pasajero</h2><p class="muted small">Arqueo bruto ÷ pasajeros. Orientativo: no todas las navieras publican la capacidad con el mismo criterio.</p>${table(roomy, (s) => dec(s.ratio), 'Índice')}</section>
  <section class="wrap block" id="nuevos"><h2>Los 20 barcos más nuevos</h2>${table(newest, (s) => s.year, 'Año')}</section>
  <section class="wrap block"><p class="muted small">Fuente: <a href="${SOURCES[0][1]}" target="_blank" rel="noopener">${esc(SOURCES[0][0])}</a>.</p></section>`;
  return layout({ title: 'Rankings de cruceros: los barcos más grandes, nuevos y espaciosos', desc: 'Ranking de los barcos de crucero más grandes del mundo, los más nuevos y los que más espacio ofrecen por pasajero.', url: '/rankings/', body, crumbs: [['Inicio', '/'], ['Rankings', '/rankings/']] });
}

function toolPrice() {
  const opts = lineList.map((l) => `<option value="${l.slug}" data-tip="${l.tip ?? ''}">${esc(l.short)}</option>`).join('');
  const body = `<section class="wrap block page-h"><h1>Calculadora del precio real de un crucero</h1><p class="lead-p">El precio de portada casi nunca es lo que acabas pagando. Mete tu oferta y te sumamos todo lo demás.</p></section>
  <section class="wrap block calc-wrap"><form class="calc" id="calc">
    <fieldset><legend>Tu crucero</legend>
      <label><span>Naviera</span><select name="line">${opts}</select></label>
      <label><span>Precio total de la reserva (€)</span><input name="fare" type="number" min="0" step="1" inputmode="numeric" value="1200" required></label>
      <label><span>Noches</span><input name="nights" type="number" min="1" max="60" value="7"></label>
      <label><span>Personas en el camarote</span><input name="people" type="number" min="1" max="6" value="2"></label>
      <label class="chk"><input name="taxes" type="checkbox" checked> <span>Las tasas portuarias ya están incluidas</span></label>
      <label><span>Tasas portuarias si no están incluidas (€ total)</span><input name="taxAmt" type="number" min="0" value="0"></label>
    </fieldset>
    <fieldset><legend>A bordo</legend>
      <label><span>Cargo de servicio por persona y noche</span><input name="tip" type="number" min="0" step="0.5" value="16"><small id="tip-note" class="muted"></small></label>
      <label><span>Paquete de bebidas por persona y día (€, 0 si no)</span><input name="drinks" type="number" min="0" value="0"></label>
      <label><span>Wifi (€ total)</span><input name="wifi" type="number" min="0" value="0"></label>
    </fieldset>
    <fieldset><legend>En tierra</legend>
      <label><span>Excursiones (€ total)</span><input name="tours" type="number" min="0" value="0"></label>
      <label><span>Vuelo / tren / parking al puerto (€ total)</span><input name="travel" type="number" min="0" value="0"></label>
    </fieldset>
  </form>
  <div class="calc-out" aria-live="polite"><p class="muted">Precio real total</p><p class="big" id="out-total">—</p><p id="out-pp" class="muted"></p><p id="out-ppn" class="muted"></p><p id="out-extra" class="extra"></p>
  <button class="btn js-share-calc" type="button">Compartir resultado</button>
  <p class="muted small">Los cargos de servicio de referencia son los publicados para el mercado de EE. UU. (Cruzely, feb-2026). En Europa pueden ser distintos o venir incluidos: ajústalo con lo que diga tu reserva.</p></div>
  </section>`;
  return layout({ title: 'Calculadora del precio real de un crucero (propinas incluidas)', desc: 'Calcula cuánto cuesta de verdad tu crucero: cargos de servicio, bebidas, wifi, excursiones y traslados. Precio por persona y por noche.', url: '/herramientas/precio-real/', body, crumbs: [['Inicio', '/'], ['Herramientas', '/herramientas/precio-real/'], ['Precio real', '/herramientas/precio-real/']] });
}

function toolAlert() {
  const body = `<section class="wrap block page-h"><h1>¿Ha bajado el precio de tu crucero?</h1><p class="lead-p">Es la queja número uno de los cruceristas: reservas y luego sale más barato. Guarda aquí tu reserva y el precio que pagaste; te ayudamos a vigilarlo y a reclamar.</p></section>
  <section class="wrap block split">
  <form class="alert-form" id="alert-form">
    <label><span>Barco</span><input name="ship" list="ships-dl2" required placeholder="Ej.: MSC World Europa"><datalist id="ships-dl2">${ships.map((s) => `<option value="${esc(s.name)}">`).join('')}</datalist></label>
    <label><span>Fecha de salida</span><input name="date" type="date" required></label>
    <label><span>Tipo de camarote</span><select name="cabin"><option>Interior</option><option>Exterior</option><option>Balcón</option><option>Suite</option></select></label>
    <label><span>Precio que pagaste (€ total)</span><input name="price" type="number" min="1" required inputmode="numeric"></label>
    <label><span>Dónde reservaste</span><input name="where" placeholder="Naviera, agencia…"></label>
    <label><span>Tu email (para avisarte)</span><input name="email" type="email" autocomplete="email" placeholder="tu@email.com"></label>
    <button class="btn" type="submit">Guardar y vigilar</button><p class="form-msg" role="status" aria-live="polite"></p>
  </form>
  <div><h2>Mis cruceros vigilados</h2><div id="alert-list" class="alert-list"><p class="muted">Todavía no has guardado ninguno.</p></div>
  <div class="tip"><b>Cómo reclamar si baja:</b> escribe a quien te vendió el crucero con tu número de reserva y una captura del nuevo precio para la misma salida y categoría. Muchas navieras permiten reajustar la tarifa o dar crédito a bordo antes del pago final, pero depende de las condiciones de tu reserva.</div></div>
  </section>`;
  return layout({ title: 'Alerta de bajada de precio de cruceros', desc: 'Guarda tu reserva de crucero y vigila si baja el precio después de reservar para reclamar la diferencia o crédito a bordo.', url: '/herramientas/alerta-precio/', body, crumbs: [['Inicio', '/'], ['Herramientas', '/herramientas/precio-real/'], ['Alerta de precio', '/herramientas/alerta-precio/']] });
}

function toolQuiz() {
  const body = `<section class="wrap block page-h"><h1>¿Qué crucero es para mí?</h1><p class="lead-p">Cuatro preguntas y te enseñamos los barcos que mejor encajan contigo.</p></section>
  <section class="wrap block"><form class="quiz" id="quiz">
    <fieldset><legend>¿Con quién viajas?</legend><div class="opts">
      <label><input type="radio" name="who" value="family" required> Familia con niños</label><label><input type="radio" name="who" value="couple"> En pareja</label><label><input type="radio" name="who" value="friends"> Con amigos</label><label><input type="radio" name="who" value="senior"> Viaje tranquilo</label></div></fieldset>
    <fieldset><legend>¿Qué tipo de barco te apetece?</legend><div class="opts">
      <label><input type="radio" name="size" value="giant" required> Gigante, con atracciones</label><label><input type="radio" name="size" value="mid"> Grande pero manejable</label><label><input type="radio" name="size" value="any"> Me da igual</label></div></fieldset>
    <fieldset><legend>¿Es importante el español a bordo?</legend><div class="opts">
      <label><input type="radio" name="es" value="yes" required> Sí, mucho</label><label><input type="radio" name="es" value="no"> Me apaño en inglés</label></div></fieldset>
    <fieldset><legend>¿Barco nuevo o te importa menos?</legend><div class="opts">
      <label><input type="radio" name="new" value="yes" required> Lo más nuevo posible</label><label><input type="radio" name="new" value="no"> Me importa más el precio</label></div></fieldset>
    <button class="btn" type="submit">Ver mis barcos</button>
  </form><div id="quiz-out" class="grid" aria-live="polite"></div></section>`;
  return layout({ title: 'Test: ¿qué crucero es para mí?', desc: 'Responde 4 preguntas y descubre qué barcos de crucero encajan con tu forma de viajar: familia, pareja, tamaño, idioma y presupuesto.', url: '/herramientas/que-crucero/', body, crumbs: [['Inicio', '/'], ['Herramientas', '/herramientas/precio-real/'], ['¿Qué crucero?', '/herramientas/que-crucero/']] });
}

function toolCompare() {
  const body = `<section class="wrap block page-h"><h1>Comparar barcos de crucero</h1><p class="lead-p">Elige hasta 3 barcos y míralos frente a frente.</p>
  <form class="cmp-form" id="cmp-form">${[0, 1, 2].map((i) => `<label><span>Barco ${i + 1}</span><select name="s${i}"><option value="">—</option>${[...ships].sort((a, b) => a.name.localeCompare(b.name)).map((s) => `<option value="${s.slug}">${esc(s.name)}</option>`).join('')}</select></label>`).join('')}</form>
  <div id="cmp-out" class="cmp-out" aria-live="polite"></div></section>`;
  return layout({ title: 'Comparar barcos de crucero frente a frente', desc: 'Compara hasta 3 barcos de crucero: naviera, año, tamaño, pasajeros, espacio por pasajero y cargos de servicio.', url: '/herramientas/comparar/', body, crumbs: [['Inicio', '/'], ['Herramientas', '/herramientas/precio-real/'], ['Comparar', '/herramientas/comparar/']] });
}

function community() {
  const body = `<section class="wrap block page-h"><h1>Comunidad: el grupo de tu salida</h1><p class="lead-p">Cada salida tiene su propio grupo. Entra con tu barco y tu fecha para conocer a tus compañeros de viaje, organizar excursiones compartidas y resolver dudas antes de embarcar.</p>
  <form class="rc-form rc-big" action="/comunidad/salida/" method="get">
    <label><span>Barco</span><select name="b" required><option value="">Elige tu barco</option>${[...ships].sort((a, b) => a.name.localeCompare(b.name)).map((s) => `<option value="${s.slug}">${esc(s.name)}</option>`).join('')}</select></label>
    <label><span>Fecha de salida</span><input type="date" name="f" required></label>
    <button class="btn" type="submit">Entrar al grupo</button></form></section>
  <section class="wrap block grid grid-3">
    <div class="tool"><h2>🤝 Comparte excursiones</h2><p>Organizad un taxi o un guía entre varios y pagad mucho menos que con la excursión del barco.</p></div>
    <div class="tool"><h2>🎥 Sube el vídeo de tu camarote</h2><p>Ayuda a quien viene detrás: indica el número de camarote y qué tal se duerme.</p></div>
    <div class="tool"><h2>⭐ Opina con sinceridad</h2><p>Sin reseñas compradas. Cuenta lo bueno y lo malo para que otros acierten.</p></div>
  </section>`;
  return layout({ title: 'Grupos por salida de crucero: conoce a tus compañeros de viaje', desc: 'Encuentra el grupo de tu salida de crucero: conoce a otros pasajeros de tu barco y fecha, comparte excursiones y resuelve dudas.', url: '/comunidad/', body, crumbs: [['Inicio', '/'], ['Comunidad', '/comunidad/']] });
}

function rollcallShell() {
  const body = `<section class="wrap block page-h"><p class="eyebrow">Grupo de salida</p><h1 id="rc-title">Grupo de tu salida</h1><p class="lead-p" id="rc-sub">Conoce a quienes navegan contigo.</p><div id="rc-links"></div></section>
  <div class="wrap">${giscusBlock('salida', 'Conversación del grupo')}</div>
  <script type="application/json" id="ships-min">${JSON.stringify(Object.fromEntries(ships.map((s) => [s.slug, s.name])))}</script>`;
  return layout({ title: 'Grupo de salida', desc: 'Grupo de pasajeros de una salida de crucero concreta.', url: '/comunidad/salida/', body, noindex: true, crumbs: [['Inicio', '/'], ['Comunidad', '/comunidad/'], ['Salida', '/comunidad/salida/']] });
}

function guidesIndex() {
  const body = `<section class="wrap block page-h"><h1>Guías para cruceristas</h1><p class="lead-p">Todo lo que nos habría gustado saber antes de nuestro primer crucero.</p>
  <div class="grid grid-3">${GUIDES.map((g) => `<a class="card guide" href="/guias/${g.slug}/"><span class="guide-e">${g.emoji}</span><h2>${esc(g.title)}</h2><p>${esc(g.desc)}</p></a>`).join('')}</div></section>`;
  return layout({ title: 'Guías de cruceros: consejos para acertar y pagar menos', desc: 'Guías prácticas de cruceros: primer crucero, elegir camarote, propinas, cruceros con bebé, salir desde España y cuándo reservar.', url: '/guias/', body, crumbs: [['Inicio', '/'], ['Guías', '/guias/']] });
}

function guidePage(g) {
  const others = GUIDES.filter((o) => o.slug !== g.slug).slice(0, 3);
  const body = `<article class="wrap block prose-wrap"><header class="page-h"><span class="guide-e big-e">${g.emoji}</span><h1>${esc(g.title)}</h1><p class="lead-p">${esc(g.desc)}</p><p class="muted small">Actualizado: ${BUILD_DATE}</p></header>
  <div class="prose">${g.body}</div>
  ${shareBar(g.title, `/guias/${g.slug}/`)}
  <aside class="block"><h2>Sigue leyendo</h2><div class="grid grid-3">${others.map((o) => `<a class="card guide" href="/guias/${o.slug}/"><span class="guide-e">${o.emoji}</span><h3>${esc(o.title)}</h3></a>`).join('')}</div></aside>
  <section class="cta-band cta-inline"><div class="cta-in"><div><h2>Chollos de cruceros en tu email</h2><p>Una vez por semana, con el precio real calculado.</p></div>${leadForm('newsletter-guia-' + g.slug)}</div></section></article>`;
  return layout({ title: g.title, desc: g.desc, url: `/guias/${g.slug}/`, body, ogType: 'article', crumbs: [['Inicio', '/'], ['Guías', '/guias/'], [g.title, `/guias/${g.slug}/`]],
    schema: [{ '@context': 'https://schema.org', '@type': 'Article', headline: g.title, description: g.desc, inLanguage: 'es', dateModified: BUILD_DATE, author: { '@type': 'Organization', name: 'MejorCrucero' }, publisher: { '@type': 'Organization', name: 'MejorCrucero' }, mainEntityOfPage: SITE + `/guias/${g.slug}/` }] });
}

function simplePage(url, title, desc, html) {
  return layout({ title, desc, url, body: `<article class="wrap block prose-wrap"><h1>${esc(title)}</h1><div class="prose">${html}</div></article>`, crumbs: [['Inicio', '/'], [title, url]] });
}

const LEGAL_OWNER = 'Equinox Investment Group LLC, 30 N Gould St Ste N, Sheridan, WY 82801, EE. UU.';
const about = `<p>MejorCrucero nace de una idea sencilla: que comparar cruceros en español sea tan fácil y honesto como comparar vuelos. Somos el equipo detrás de <a href="${CONFIG.happyLowCost}" target="_blank" rel="noopener">Happy Low Cost</a>, una comunidad de más de 400.000 viajeros que llevan años cazando chollos con nosotros.</p>
<h2>Nuestras reglas</h2><ul><li><strong>Cero datos inventados.</strong> Cada cifra técnica tiene su fuente citada.</li><li><strong>Precio real, no de portada.</strong> Te enseñamos lo que vas a pagar de verdad.</li><li><strong>Opiniones de verdad.</strong> No compramos ni filtramos reseñas.</li><li><strong>Transparencia con el dinero.</strong> Explicamos <a href="/afiliacion/">cómo ganamos dinero</a>.</li></ul>
<h2>Fuentes</h2><ul>${SOURCES.map(([t, u]) => `<li><a href="${u}" target="_blank" rel="noopener">${esc(t)}</a></li>`).join('')}</ul>`;
const affiliation = `<p>MejorCrucero es gratis para ti. Nos financiamos con comisiones de afiliación: cuando haces clic en un enlace a una naviera, agencia o proveedor de excursiones y reservas, el vendedor puede pagarnos una comisión. <strong>Tú pagas lo mismo</strong>; el precio no cambia por venir desde aquí.</p><p>Los enlaces de afiliado están marcados técnicamente como patrocinados. Nunca dejamos que una comisión cambie el orden de los barcos, los rankings o las opiniones de la comunidad.</p>`;
const legal = `<p><strong>Titular del sitio web:</strong> ${LEGAL_OWNER}</p><p><strong>Dominio:</strong> mejorcrucero.com</p><p>MejorCrucero es un comparador y medio informativo. No vende cruceros directamente: las reservas se realizan en las webs de las navieras y agencias enlazadas, que son las responsables del contrato de viaje.</p><p>Los datos técnicos de los barcos proceden de fuentes públicas y pueden contener errores o quedar desactualizados. Confirma siempre las condiciones con el vendedor antes de reservar.</p><p>Los vídeos incrustados pertenecen a sus autores y se muestran mediante el reproductor oficial de YouTube.</p>`;
const privacy = `<p><strong>Responsable:</strong> ${LEGAL_OWNER}</p><h2>Qué datos tratamos</h2><ul><li><strong>Email</strong>, si te suscribes a los chollos o pides que te avisemos: lo usamos solo para eso y puedes darte de baja en cualquier momento.</li><li><strong>Tus cruceros vigilados</strong> en la alerta de precio se guardan en tu propio navegador (almacenamiento local). Si nos dejas tu email, lo usamos para avisarte.</li><li><strong>Foro:</strong> si participas en los foros, se hace con tu cuenta de GitHub mediante Giscus, sujeto a la política de privacidad de GitHub.</li></ul><h2>Tus derechos</h2><p>Puedes pedir acceso, rectificación o supresión de tus datos escribiendo al responsable. También puedes reclamar ante la autoridad de protección de datos de tu país (en España, la AEPD).</p>`;
const cookies = `<p>MejorCrucero no instala cookies publicitarias propias. Usamos almacenamiento local del navegador solo para funciones que tú activas (tus cruceros vigilados y tu comparador).</p><p>Los vídeos de YouTube no se cargan hasta que pulsas reproducir, y entonces se usan desde el dominio youtube-nocookie.com. Los enlaces a navieras y agencias pueden dejar cookies de afiliación en esos sitios cuando haces clic.</p>`;

function notFound() {
  return layout({ title: 'Página no encontrada', desc: 'Esta página no existe.', url: '/404.html', noindex: true, body: `<section class="wrap block page-h center"><h1>Este barco ya ha zarpado</h1><p class="lead-p">No encontramos la página que buscas.</p><p><a class="btn" href="/barcos/">Ver todos los barcos</a> <a class="btn btn-ghost" href="/">Ir al inicio</a></p></section>` });
}

// ---------- build ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.cpSync(path.join(ROOT, 'public'), OUT, { recursive: true });

write('index.html', home());
write('barcos/index.html', shipsIndex());
ships.forEach((s) => write(`barcos/${s.slug}/index.html`, shipPage(s)));
write('navieras/index.html', linesIndex());
lineList.forEach((l) => write(`navieras/${l.slug}/index.html`, linePage(l)));
write('puertos/index.html', portsIndex());
HOME_PORTS.forEach((p) => write(`puertos/${p.slug}/index.html`, portPage(p)));
write('excursiones/index.html', excursions());
write('rankings/index.html', rankings());
write('herramientas/precio-real/index.html', toolPrice());
write('herramientas/alerta-precio/index.html', toolAlert());
write('herramientas/que-crucero/index.html', toolQuiz());
write('herramientas/comparar/index.html', toolCompare());
write('comunidad/index.html', community());
write('comunidad/salida/index.html', rollcallShell());
write('guias/index.html', guidesIndex());
GUIDES.forEach((g) => write(`guias/${g.slug}/index.html`, guidePage(g)));
write('sobre-nosotros/index.html', simplePage('/sobre-nosotros/', 'Quiénes somos', 'Quién está detrás de MejorCrucero y nuestras reglas.', about));
write('afiliacion/index.html', simplePage('/afiliacion/', 'Cómo ganamos dinero', 'Transparencia sobre los enlaces de afiliación de MejorCrucero.', affiliation));
write('aviso-legal/index.html', simplePage('/aviso-legal/', 'Aviso legal', 'Aviso legal de MejorCrucero.com', legal));
write('privacidad/index.html', simplePage('/privacidad/', 'Política de privacidad', 'Política de privacidad de MejorCrucero.com', privacy));
write('cookies/index.html', simplePage('/cookies/', 'Política de cookies', 'Política de cookies de MejorCrucero.com', cookies));
write('404.html', notFound());

// datos para el JS del cliente
write('data/ships.json', JSON.stringify(ships.map(({ name, slug, lineShort, lineSlug, year, gt, pax, ratio, size, color }) => ({ name, slug, lineShort, lineSlug, year, gt, pax, ratio, size, color, es: Object.values(LINES).find((l) => l.slug === lineSlug).es, tip: Object.values(LINES).find((l) => l.slug === lineSlug).tip }))));
write('data/config.json', JSON.stringify({ formEndpoint: CONFIG.formEndpoint, giscus: CONFIG.giscus }));

// sitemap + robots
const sm = pages.filter((p) => !p.noindex).map((p) => `<url><loc>${SITE}${p.url}</loc><lastmod>${BUILD_DATE}</lastmod></url>`).join('');
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sm}</urlset>`);
write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
write('.nojekyll', '');
if (process.env.CNAME) write('CNAME', process.env.CNAME + '\n');

console.log(`OK: ${pages.length} páginas en dist/ (BASE=${BASE})`);

// minificado ligero de CSS y JS (sin dependencias)
for (const f of ['assets/style.css']) {
  const p = path.join(OUT, f);
  fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s*\n\s*/g, '').replace(/\s*([{}:;,>])\s*/g, '$1').replace(/;}/g, '}'));
}
