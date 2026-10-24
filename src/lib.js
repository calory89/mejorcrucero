// Utilidades y piezas compartidas del generador
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { CONFIG } from './data/content.js';

export const SITE = CONFIG.siteUrl;
export const BASE = (process.env.BASE || '/').replace(/\/?$/, '/');
export const BUILD_DATE = new Date().toISOString().slice(0, 10);
export const OUT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'dist');

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const slugify = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const dec = (r) => (r == null ? '–' : String(r).replace('.', ','));
export const fmt = (n) => (n == null || n === '' ? '–' : Number(n).toLocaleString('es-ES'));
export const eur = (n) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
export const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export const pages = [];
// HTML más ligero: quita la sangría al principio de línea (fuera de <pre>, <textarea> y <script>)
function slim(html) {
  const keep = []; const t = html.replace(/<(pre|textarea|script)\b[\s\S]*?<\/\1>/gi, (m) => { keep.push(m); return `\u0000${keep.length - 1}\u0000`; });
  return t.replace(/\n[ \t]+/g, '\n').replace(/\n{2,}/g, '\n').replace(/\u0000(\d+)\u0000/g, (_, i) => keep[+i]);
}
// Versión de cada fichero de assets según su contenido: la caché se renueva solo cuando el fichero cambia
const AVC = {};
export const AV = (f) => AVC[f] || (AVC[f] = (() => { try { return createHash('sha1').update(fs.readFileSync(path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'public', 'assets', f))).digest('hex').slice(0, 10); } catch { return BUILD_DATE; } })());
export function write(rel, html) {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, rel.endsWith('.html') ? slim(html) : html);
}
export function rebase(html) {
  if (BASE === '/') return html;
  return html.replace(/(href|src|action|data-base|data-href)="\/(?!\/)/g, `$1="${BASE}`);
}

export const ICON = {
  search: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M10 3a7 7 0 1 0 4.2 12.6l4.6 4.6 1.4-1.4-4.6-4.6A7 7 0 0 0 10 3Zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z"/></svg>',
  play: '<svg viewBox="0 0 68 48" width="68" height="48" aria-hidden="true"><path d="M66.5 7.7a8.5 8.5 0 0 0-6-6C55.3.3 34 .3 34 .3s-21.3 0-26.5 1.4a8.5 8.5 0 0 0-6 6A89 89 0 0 0 .1 24a89 89 0 0 0 1.4 16.3 8.5 8.5 0 0 0 6 6C12.7 47.7 34 47.7 34 47.7s21.3 0 26.5-1.4a8.5 8.5 0 0 0 6-6A89 89 0 0 0 67.9 24a89 89 0 0 0-1.4-16.3Z" fill="#e11d48"/><path d="m45 24-18-10v20z" fill="#fff"/></svg>',
  wa: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 20Zm4.4-6c-.2-.1-1.4-.7-1.7-.8s-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6a2.6 2.6 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .2-1.2c-.1-.1-.2-.2-.5-.3Z"/></svg>',
  heart: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.4C.9 8.1 3.2 4.5 6.8 4.5c2 0 3.5 1.1 4.2 2.4h2c.7-1.3 2.2-2.4 4.2-2.4 3.6 0 5.9 3.6 4.4 7.1C19.5 16.4 12 21 12 21Z" fill="currentColor"/></svg>',
  home: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M12 3 2 11h3v9h6v-6h2v6h6v-9h3z"/></svg>',
  bell: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M12 22a2.5 2.5 0 0 0 2.5-2.5h-5A2.5 2.5 0 0 0 12 22Zm7-6V11a7 7 0 0 0-5.5-6.8V3a1.5 1.5 0 0 0-3 0v1.2A7 7 0 0 0 5 11v5l-2 2v1h18v-1z"/></svg>',
  chat: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2Z"/></svg>',
  user: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.4 0-8 2.2-8 5v2h16v-2c0-2.8-3.6-5-8-5Z"/></svg>',
  moon: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>',
  menu: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path fill="currentColor" d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z"/></svg>',
  ship: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M4 15h16l-2.5 5h-11zM7 14V9h10v5zm3-6V5h4v3z"/></svg>',
};

let svgN = 0;
export function shipSvg(s, w = 320) {
  const c = s.color;
  const id = 'w' + (++svgN);
  const decks = s.gt >= 200000 ? 7 : s.gt >= 160000 ? 6 : s.gt >= 100000 ? 5 : 4;
  let rows = '';
  for (let i = 0; i < decks; i++) {
    const y = 78 - i * 8, inset = 18 + i * 9, wd = 300 - inset * 2 + 20;
    rows += `<rect x="${inset}" y="${y}" width="${wd}" height="6" rx="2" fill="${i % 2 ? '#fff' : '#f1f5f9'}"/><rect x="${inset + 5}" y="${y + 1.5}" width="${wd - 10}" height="3" fill="url(#${id})"/>`;
  }
  return `<svg viewBox="0 0 340 130" width="${w}" role="img" aria-label="Ilustración del ${esc(s.name)}" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="${id}" width="9" height="3" patternUnits="userSpaceOnUse"><rect width="4" height="3" rx="1" fill="${c}" opacity=".55"/></pattern></defs>${rows}<rect x="150" y="${78 - decks * 8 - 10}" width="26" height="12" rx="3" fill="${c}"/><path d="M8 86H332L304 112H34Z" fill="${c}"/><path d="M8 86H332L328 92H12Z" fill="#fff" opacity=".25"/><path d="M0 116q20-6 40 0t40 0 40 0 40 0 40 0 40 0 40 0 40 0 40 0" stroke="#fff" stroke-width="2" fill="none" opacity=".6"/></svg>`;
}

export function shipVisual(s, w = 300, eager = false) {
  if (s.photo) {
    return `<img src="${esc(s.photo.thumb)}"${s.photo.hi ? ` srcset="${esc(s.photo.thumb)} 640w, ${esc(s.photo.large)} 1280w" sizes="(max-width: 600px) 100vw, 360px"` : ''} alt="${esc(s.name)} navegando" width="640" height="${Math.round(640 / (s.photo.ratio || 1.6))}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" class="ship-photo">`;
  }
  return shipSvg(s, w);
}

export function photoCredit(s) {
  if (!s.photo) return '';
  return `<p class="credit">Foto: <a href="${esc(s.photo.page)}" target="_blank" rel="noopener">${esc(s.photo.author || 'Wikimedia Commons')}</a> · ${esc(s.photo.license || '')} · Wikimedia Commons</p>`;
}

export const scoreBadge = (n, big = false) => (n == null ? '' : `<span class="scb ${n >= 85 ? 'sc-a' : n >= 75 ? 'sc-b' : n >= 65 ? 'sc-c' : n >= 50 ? 'sc-d' : 'sc-e'}${big ? ' scb-big' : ''}" title="MejorCrucero Score ${n}/100"><b>${n}</b>${big ? '<small>/100</small>' : ''}</span>`);

export function shipCard(s, opts = {}) {
  return `<article class="card ship-card" data-name="${esc(s.name.toLowerCase())}" data-line="${s.lineSlug}" data-size="${s.size}" data-gt="${s.gt}" data-year="${s.year}" data-ratio="${s.ratio ?? 0}" data-pax="${s.pax ?? 0}" data-tier="${s.tier}" data-sc="${s.sc ?? -1}" data-slug="${s.slug}">
  <a class="card-link" href="/barcos/${s.slug}/"><div class="ship-art${s.photo ? ' has-photo' : ''}" style="--c:${s.color}">${shipVisual(s, 300)}${s.videos.length ? '<span class="pill pill-video">Vídeos</span>' : ''}${scoreBadge(s.sc)}</div>
  <div class="card-body"><h3>${esc(s.name)}</h3><p class="card-sub"><span>${esc(s.lineShort)}</span></p>
  <dl class="facts-dl"><div><dt>Año</dt><dd>${s.year}</dd></div><div><dt>Pasajeros</dt><dd>${fmt(s.pax)}</dd></div><div><dt>Espacio</dt><dd>${dec(s.ratio)}</dd></div></dl>${s.sailings?.length ? `<p class="has-offers">${s.sailings.length} salida${s.sailings.length > 1 ? 's' : ''} a la venta</p>` : ''}</div></a>
  <button class="fav" type="button" data-fav="${s.slug}" aria-label="Guardar ${esc(s.name)} en favoritos" aria-pressed="false">${ICON.heart}</button>
  ${opts.compare !== false ? `<button class="cmp-add" type="button" data-cmp="${s.slug}">+ Comparar<span class="sr"> ${esc(s.name)}</span></button>` : ''}
</article>`;
}

export function videoFacade(id, title, es) {
  return `<button class="yt" type="button" data-id="${id}" aria-label="Reproducir vídeo: ${esc(title)}"><img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="" loading="lazy" decoding="async" width="480" height="360"><span class="yt-play">${ICON.play}</span>${es ? '<span class="yt-es">ES</span>' : ''}<span class="yt-title">${esc(title)}</span></button>`;
}

export function affLink(key, page = '') {
  const a = CONFIG.affiliates[key];
  let url = a.url;
  if (a.param) url += (url.includes('?') ? '&' : '?') + a.param;
  return url;
}
export const isAff = (key) => !!CONFIG.affiliates[key]?.param;
// Enlace de afiliado CJ (solo programas aprobados). url = destino profundo (si el programa lo permite).
export function cj(kind, url, sid = 'web') {
  const L = CONFIG.cj.links[kind];
  const u = url || L.def;
  return `${CONFIG.cj.host}/click-${CONFIG.cj.pid}-${L.aid}?sid=${encodeURIComponent('mc-' + sid)}${u ? '&url=' + encodeURIComponent(u) : ''}`;
}
export const bookingHotels = (city, checkin, checkout) => `https://www.booking.com/searchresults.es.html?ss=${encodeURIComponent(city)}&lang=es&group_adults=2${checkin ? `&checkin=${checkin}&checkout=${checkout}` : ''}`;
// Caja "Prepara tu viaje al puerto": hotel la noche antes, traslado, vuelo, coche y excursiones (CJ)
export function tripBox(city, { date, sid = 'web', title, attrCity } = {}) {
  const before = date ? new Date(new Date(date + 'T12:00:00') - 864e5).toISOString().slice(0, 10) : null;
  const a = (kind, url, icon, t, sub) => `<a class="trip-a" href="${cj(kind, url, sid)}" target="_blank" rel="sponsored noopener" data-aff="cj-${kind}" data-page="${esc(sid)}"><span class="trip-i" aria-hidden="true">${icon}</span><b>${esc(t)}</b><small>${esc(sub)}</small></a>`;
  return `<section class="block trip"><h2>${esc(title || `Prepara tu viaje a ${city}`)}</h2><div class="trip-g">
  ${a('hotel', bookingHotels(city, before, date), '🏨', `Hotel en ${city}${date ? ' la noche antes' : ''}`, 'Embarca sin prisas · Booking.com')}
  ${a('taxi', null, '🚕', 'Traslado al puerto', 'Taxi reservado con precio cerrado · Booking.com')}
  ${a('flight', null, '✈️', `Vuelo a ${city}`, 'Compara vuelos · Booking.com')}
  ${a('car', null, '🚗', 'Coche de alquiler', 'Para llegar o hacer excursiones · Holiday Autos')}
  ${a('attr', null, '🎟️', `Excursiones en ${attrCity || city}`, 'Entradas y tours por libre · Booking.com')}
  </div><p class="muted small">Enlaces de afiliado: si reservas, podemos cobrar una comisión y tú pagas lo mismo.</p></section>`;
}
export function civLink(slug) {
  const a = CONFIG.affiliates.civitatis;
  return a.base + slug + '/' + (a.param ? '?' + a.param : '');
}
export function partnerLink({ href, key, title, sub, page }) {
  const aff = key ? isAff(key) : false;
  return `<a class="partner" href="${href}" target="_blank" rel="${key ? 'sponsored ' : ''}noopener" data-aff="${esc(key || 'oficial')}" data-page="${esc(page)}"><b>${esc(title)}</b><span>${esc(sub)}</span><span class="go">Ver precios</span><small class="comm">${aff ? 'Enlace de afiliado: podemos cobrar comisión' : 'Sin comisión para nosotros'}</small></a>`;
}

export function leadForm(source, cta = 'Quiero los chollos', extra = '') {
  const id = 'em-' + slugify(source);
  return `<form class="lead" data-source="${esc(source)}"><label class="sr" for="${id}">Tu email</label><input id="${id}" type="email" name="email" placeholder="tu@email.com" required autocomplete="email">${extra}<input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true"><button class="btn" type="submit">${esc(cta)}</button><p class="form-msg" role="status" aria-live="polite"></p></form>`;
}

export function shareBar(text, url) {
  const full = SITE + url;
  return `<div class="share"><a class="btn btn-wa" href="https://wa.me/?text=${encodeURIComponent(text + ' ' + full)}" target="_blank" rel="noopener">${ICON.wa} Compartir por WhatsApp</a><button class="btn btn-ghost js-share" type="button" data-title="${esc(text)}" data-url="${full}">Compartir</button></div>`;
}

export function reportBtn(target) {
  return `<button class="link-btn js-report" type="button" data-target="${esc(target)}">Reportar un error en estos datos</button>`;
}

// Foro / reseñas / preguntas nativos (API propia). Sin API: modo "abre pronto".
export function forumBlock(thread, title, opts = {}) {
  const opt = opts.optional ? ' data-optional="1"' : '';
  const tabs = opts.tabs || [['review', 'Opiniones'], ['question', 'Preguntas'], ['cabin', 'Camarotes'], ['comment', 'Comentarios']];
  return `<section class="forum" id="foro" aria-labelledby="foro-h"${opt} data-thread="${esc(thread)}" data-kinds="${tabs.map((t) => t[0]).join(',')}">
  <div class="forum-h"><h2 id="foro-h">${esc(title)}</h2><span class="forum-count" aria-live="polite"></span></div>
  <div class="forum-stats" hidden></div>
  <div class="forum-summary" hidden></div>
  <div class="tabs" role="tablist">${tabs.map(([k, n], i) => `<button role="tab" type="button" class="tab" data-kind="${k}" aria-selected="${i === 0}">${n}</button>`).join('')}</div>
  <div class="forum-list"><div class="skel"></div><div class="skel"></div></div>
  <form class="forum-form" novalidate>
    <h3 class="h-sm forum-form-title">Escribe tu opinión</h3>
    <div class="rating-row" data-for="review">${[['general', 'General'], ['comida', 'Comida'], ['camarote', 'Camarote'], ['animacion', 'Animación'], ['ninos', 'Niños'], ['limpieza', 'Limpieza']].map(([k, n]) => `<label><span>${n}</span><select name="r_${k}"><option value="">–</option>${[5, 4, 3, 2, 1].map((v) => `<option value="${v}">${'★'.repeat(v)}</option>`).join('')}</select></label>`).join('')}<label><span>¿Repetirías?</span><select name="r_repetiria"><option value="">–</option><option value="1">Sí</option><option value="0">No</option></select></label></div>
    <div class="photo-row" data-for="review"><label><span>Foto (opcional, se publica cuando la revisamos)</span><input name="photo" type="file" accept="image/jpeg,image/png,image/webp"></label></div>
    <div class="cabin-row" data-for="cabin"><label><span>Nº de camarote</span><input name="cabin" inputmode="numeric" maxlength="8" placeholder="Ej.: 12045"></label><label><span>Vídeo de YouTube (opcional)</span><input name="video" type="url" placeholder="https://youtube.com/…"></label></div>
    <details class="proof" data-for="review"><summary>Verifica tu opinión (opcional)</summary><label><span>Pega aquí el email de confirmación de tu reserva. Solo comprobamos que es de este barco: no se guarda ni se publica.</span><textarea name="proof" rows="3" maxlength="6000"></textarea></label></details>
    <div class="diary-row" data-for="diary"><label><span>Día del crucero</span><select name="day"><option value="">Sin día</option>${Array.from({ length: 30 }, (_, i) => `<option value="${i + 1}">Día ${i + 1}</option>`).join('')}</select></label></div>
    <label><span>Tu nombre</span><input name="name" maxlength="40" autocomplete="nickname" required></label>
    <label><span>Tu mensaje</span><textarea name="body" rows="4" maxlength="4000" required></textarea></label>
    <input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
    <button class="btn" type="submit">Publicar</button><p class="form-msg" role="status" aria-live="polite"></p>
    <p class="muted small">Sin registro. Tu nombre y tu mensaje serán públicos: no escribas tu teléfono, tu email ni tu número de reserva. Puedes editar tu mensaje durante 15 minutos y borrarlo cuando quieras desde este navegador. La comunidad puede reportar mensajes inapropiados. <a href="/privacidad/">Privacidad</a>.</p>
  </form>
  <div class="forum-soon" hidden><p><strong>El foro se abre muy pronto.</strong> Apúntate y te avisamos.</p>${leadForm('foro:' + thread, 'Avisadme')}</div>
</section>`;
}

const NAV = [['/ofertas/', 'Ofertas'], ['/barcos/', 'Barcos'], ['/destinos/', 'Destinos'], ['/herramientas/', 'Herramientas'], ['/comunidad/', 'Comunidad']];

export function layout({ title, desc, url, body, schema = [], ogType = 'website', crumbs = null, noindex = false, og = '/og.png', image = null, preload = null }) {
  pages.push({ url, noindex });
  // Descripción de 160 caracteres como máximo, cortada por palabra
  if (desc && desc.length > 160) desc = desc.slice(0, 157).replace(/\s+\S*$/, '').replace(/[,;:·\s]+$/, '') + '…';
  const fullTitle = url === '/' ? title : title.length > 62 ? title : `${title} | MejorCrucero`;
  const ld = [{ '@context': 'https://schema.org', '@type': 'Organization', name: 'MejorCrucero', url: SITE, logo: SITE + '/icon-512.png', sameAs: [CONFIG.happyLowCost], founder: { '@type': 'Person', name: CONFIG.author.name } }, ...schema];
  if (crumbs) ld.push({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: crumbs.map(([n, u], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: SITE + u })) });
  const crumbHtml = crumbs ? `<nav class="crumbs wrap" aria-label="Migas de pan"><ol>${crumbs.map(([n, u], i) => i === crumbs.length - 1 ? `<li aria-current="page">${esc(n)}</li>` : `<li><a href="${u}">${esc(n)}</a></li>`).join('')}</ol></nav>` : '';
  const ogImg = image || SITE + og;
  return rebase(`<!doctype html>
<html lang="es-ES">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${url}">
<link rel="alternate" hreflang="es-ES" href="${SITE}${url}"><link rel="alternate" hreflang="x-default" href="${SITE}${url}">
<meta property="og:locale" content="es_ES"><meta name="geo.region" content="ES"><link rel="alternate" type="application/rss+xml" title="Chollos de cruceros" href="/ofertas/feed.xml">
${noindex ? '<meta name="robots" content="noindex">' : ''}
<meta name="theme-color" content="#0b2540">
<meta property="og:type" content="${ogType}"><meta property="og:site_name" content="MejorCrucero"><meta property="og:title" content="${esc(fullTitle)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${SITE}${url}"><meta property="og:image" content="${esc(ogImg)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:locale" content="es_ES">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/icon-192.png"><link rel="manifest" href="/manifest.webmanifest">
<script>try{var t=localStorage.getItem('mc_theme');if(t)document.documentElement.dataset.theme=t;var z=localStorage.getItem('mc_textsize');if(z)document.documentElement.style.fontSize=z}catch(e){}</script>
${preload ? `<link rel="preload" as="image" href="${preload}" fetchpriority="high">` : ''}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@100..125,400..800&display=swap">
<link rel="stylesheet" href="/assets/style.css?v=${AV('style.css')}">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
<script>(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","wqn50nb6kp");clarity("consentv2",{ad_Storage:"denied",analytics_Storage:"denied"});clarity("set","site","mejorcrucero");</script>
</head>
<body data-base="/" data-page="${esc(url)}">
<a class="skip" href="#main">Saltar al contenido</a>
<header class="top"><div class="wrap top-in">
<a class="logo" href="/" aria-label="MejorCrucero, inicio"><svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true"><rect width="40" height="40" rx="10" fill="#0F5BD8"/><path d="M9 23h22l-3.5 6.5h-15z" fill="#fff"/><path d="M13 22v-4.5h14V22z" fill="#fff" opacity=".85"/><path d="M17 16.5V12h6v4.5z" fill="#FFC400"/></svg><span>MejorCrucero</span></a>
<nav class="nav" aria-label="Principal"><ul>${NAV.map(([u, n]) => `<li><a href="${u}"${url.startsWith(u) ? ' aria-current="page"' : ''}>${n}</a></li>`).join('')}</ul></nav>
<form class="gsearch" action="/buscar/" role="search"><label class="sr" for="gq">Buscar barco, naviera, destino o puerto</label><input id="gq" name="q" type="search" placeholder="Barco, destino, puerto…" autocomplete="off" aria-autocomplete="list" aria-controls="gq-list"><ul id="gq-list" class="ac" role="listbox" hidden></ul></form>
<a class="notif" href="/mis-cruceros/#avisos" hidden aria-label="Tienes respuestas nuevas">💬<span></span></a>
<details class="settings"><summary class="icon-btn" aria-label="Ajustes de lectura" title="Ajustes de lectura"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M4 7h10v2H4zm12 0h4v2h-4v2h-2V5h2zM4 15h4v2H4zm6 0h10v2H10v2H8v-6h2z"/></svg></summary><div class="settings-pop"><button class="set-btn js-theme" type="button">${ICON.moon}<span>Modo oscuro</span></button><button class="set-btn js-contrast" type="button" aria-pressed="false"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg><span>Alto contraste</span></button><button class="set-btn js-textsize" type="button"><span aria-hidden="true" class="set-i">A</span><span>Texto más grande</span></button></div></details>
<a class="btn btn-sm nav-cta" href="/herramientas/alerta-precio/">Crear alerta</a>
<details class="burger"><summary aria-label="Abrir menú">${ICON.menu}</summary><nav class="burger-nav" aria-label="Menú completo"><ul>
${[['/', 'Inicio'], ['/ofertas/chollos/', 'Chollos de hoy'], ...NAV, ['/navieras/', 'Navieras'], ['/rankings/', 'Rankings'], ['/guias/', 'Guías'], ['/puertos/', 'Puertos'], ['/metodologia/', 'Cómo puntuamos'], ['/comparativas/', 'Comparativas de navieras'], ['/meses/', 'Cruceros por mes'], ['/excursiones/', 'Excursiones'], ['/mis-cruceros/', 'Mis cruceros y favoritos'], ['/herramientas/asistente/', 'Asistente IA']].map(([u, n]) => `<li><a href="${u}">${n}</a></li>`).join('')}
</ul></nav></details>
</div></header>
${crumbHtml}
<main id="main">${body}</main>
<div class="cmp-bar" hidden><div class="wrap cmp-bar-in"><span class="cmp-bar-list"></span><a class="btn btn-sm" href="/herramientas/comparar/">Comparar</a><button class="link-btn js-cmp-clear" type="button">Vaciar</button></div></div>
<nav class="bottom-nav" aria-label="Accesos rápidos"><a href="/">${ICON.home}<span>Inicio</span></a><a href="/buscar/">${ICON.search}<span>Buscar</span></a><a href="/herramientas/alerta-precio/">${ICON.bell}<span>Alertas</span></a><a href="/comunidad/">${ICON.chat}<span>Comunidad</span></a><a href="/mis-cruceros/" class="bn-my">${ICON.user}<span>Mis cruceros</span><i class="bn-count" hidden></i></a></nav>
<dialog class="modal" id="exit-modal" aria-labelledby="exit-h"><form method="dialog" class="modal-x"><button aria-label="Cerrar">×</button></form><h2 id="exit-h">¿Te vas sin tu alerta de precio?</h2><p>Te avisamos cuando bajen los cruceros que te interesan. Un email a la semana como mucho.</p>${leadForm('exit-intent', 'Quiero alertas')}</dialog>
<dialog class="modal" id="report-modal" aria-labelledby="rep-h"><form method="dialog" class="modal-x"><button aria-label="Cerrar">×</button></form><h2 id="rep-h">Reportar un error</h2><form class="report-form"><label><span>¿Qué dato está mal y cuál es el correcto?</span><textarea name="reason" rows="4" required maxlength="1000"></textarea></label><button class="btn" type="submit">Enviar</button><p class="form-msg" role="status" aria-live="polite"></p></form></dialog>
<footer class="foot"><div class="wrap foot-in">
<div><a class="logo logo-foot" href="/"><span>Mejor<b>Crucero</b></span></a><p>El comparador de cruceros en español hecho por cruceristas: barcos, vídeos, precio real y comunidad. De los creadores de <a href="${CONFIG.happyLowCost}" target="_blank" rel="noopener">Happy Low Cost</a>, más de 400.000 viajeros en Facebook.</p></div>
<div><h2>Ofertas</h2><ul><li><a href="/ofertas/chollos/">Chollos</a></li><li><a href="/ofertas/observatorio/">Observatorio de precios</a></li><li><a href="/ofertas/bajadas/">Bajadas de precio</a></li><li><a href="/herramientas/comparar-ofertas/">Comparar ofertas</a></li><li><a href="/ultima-hora/">Última hora</a></li><li><a href="/ofertas/desde-barcelona/">Cruceros desde Barcelona</a></li><li><a href="/ofertas/desde-valencia/">Cruceros desde Valencia</a></li><li><a href="/ofertas/desde-malaga/">Cruceros desde Málaga</a></li><li><a href="/ofertas/canarias-y-madeira/">Cruceros por Canarias</a></li><li><a href="/ofertas/mediterraneo-oriental/">Islas griegas</a></li><li><a href="/ofertas/minicruceros/">Minicruceros</a></li><li><a href="/novedades/">Novedades de las navieras</a></li><li><a href="/ofertas/desde-america/">Cruceros desde América</a></li></ul></div>
<div><h2>Explorar</h2><ul><li><a href="/barcos/">Todos los barcos</a></li><li><a href="/destinos/">Destinos</a></li><li><a href="/meses/">Cruceros por mes</a></li><li><a href="/comparativas/">Comparativas</a></li><li><a href="/rankings/">Rankings</a></li><li><a href="/rankings/premios/">Premios del año</a></li><li><a href="/puertos/">Puertos</a></li><li><a href="/excursiones/">Excursiones</a></li></ul></div>
<div><h2>Herramientas</h2><ul><li><a href="/herramientas/precio-real/">Precio real</a></li><li><a href="/herramientas/alerta-precio/">Alerta de precio</a></li><li><a href="/herramientas/asistente/">Asistente IA</a></li><li><a href="/herramientas/que-crucero/">¿Qué crucero es para mí?</a></li><li><a href="/herramientas/comparar/">Comparar barcos</a></li><li><a href="/herramientas/checklist/">Checklist</a></li><li><a href="/herramientas/">Todas</a></li></ul></div>
<div><h2>MejorCrucero</h2><ul><li><a href="/sobre-nosotros/">Quiénes somos</a></li><li><a href="/por-que-fiarte/">Por qué fiarte</a></li><li><a href="/datos/">Datos abiertos</a></li><li><a href="/prensa/">Prensa</a></li><li><a href="/accesibilidad/">Accesibilidad</a></li><li><a href="/estado/">Estado de los datos</a></li><li><a href="/contacto/">Contacto</a></li><li><a href="/afiliacion/">Cómo ganamos dinero</a></li><li><a href="/newsletter/">Newsletter</a></li><li><a href="/creadores/">Programa de creadores</a></li><li><a href="/aviso-legal/">Aviso legal</a></li><li><a href="/privacidad/">Privacidad</a></li><li><a href="/cookies/">Cookies</a></li></ul></div>
</div><p class="wrap fine">© ${new Date().getFullYear()} MejorCrucero.com · Algunos enlaces son de afiliado: si reservas a través de ellos podemos recibir una comisión, sin coste extra para ti. Los datos técnicos proceden de fuentes públicas citadas en cada página.</p></footer>
<button class="to-top" type="button" aria-label="Volver arriba" hidden>↑</button>
<script src="/assets/v3.js?v=${AV('v3.js')}" defer></script>
<script src="/assets/app.js?v=${AV('app.js')}" defer></script>
${CONFIG.cfBeacon ? `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"${CONFIG.cfBeacon}"}'></script>` : ''}
</body></html>`);
}
