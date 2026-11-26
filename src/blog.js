// Blog de MejorCrucero: artículos que se reescriben en cada build SOLO con datos reales de las salidas
// (precio de la web oficial de cada naviera). Nada inventado: si no hay datos suficientes, el artículo no se publica.
import { esc, eur, fmt, cap, layout, write, SITE, BUILD_DATE } from './lib.js';
import { CONFIG } from './data/content.js';

const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const ES_PORTS = { barcelona: 'Barcelona', valencia: 'Valencia', malaga: 'Málaga', alicante: 'Alicante', palma: 'Palma', tenerife: 'Tenerife', 'gran-canaria': 'Gran Canaria', cadiz: 'Cádiz', tarragona: 'Tarragona', bilbao: 'Bilbao', vigo: 'Vigo' };
const PUBLISHED = BUILD_DATE < '2026-11-27' ? BUILD_DATE : '2026-11-27';
const addDays = (d, n) => { const t = new Date(d + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
const fdate = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const fshort = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };

export function makeBlog({ sailings, OFF, bySlug, LINES }) {
  const shipName = (x) => bySlug[x.ship]?.name || x.ship_name || x.ship;
  const lineName = (x) => bySlug[x.ship]?.lineShort || Object.values(LINES).find((z) => z.slug === x.line)?.short || x.line;
  const today = BUILD_DATE;
  const fromSpain = (x) => !!ES_PORTS[x.depart_port_slug];
  const uniq = (list, key = (x) => x.ship + '|' + x.date) => list.filter((x, i, a) => a.findIndex((y) => key(y) === key(x)) === i);
  const byPpn = (a, b) => OFF.ppn(a) - OFF.ppn(b) || OFF.minPrice(a) - OFF.minPrice(b);
  const posts = [];

  const table = (list) => `<div class="table-wrap"><table class="rank-t keep-t"><thead><tr><th>Crucero</th><th>Salida</th><th>Noches</th><th>Desde</th><th>Por noche</th></tr></thead><tbody>${list.map((x) => `<tr><td><a href="${OFF.url(x)}">${esc(shipName(x))}</a><br><small>${esc(OFF.destName(x.destination, x))} · ${esc(lineName(x))}</small></td><td>${fshort(x.date)}<br><small>${esc(x.depart_port || '')}</small></td><td>${x.nights}</td><td><b>${eur(OFF.minPrice(x))}</b></td><td>${eur(OFF.ppn(x))}</td></tr>`).join('')}</tbody></table></div>`;

  function add({ slug, title, h1, desc, kicker, intro, list, sort = byPpn, min = 5, top = 10, faq = [], extra = '', related = [] }) {
    const L = uniq([...list].sort(sort));
    if (L.length < min) return;
    const T = L.slice(0, top);
    const prices = L.map(OFF.minPrice), ppns = L.map(OFF.ppn);
    const stats = { n: L.length, min: Math.min(...prices), medPpn: median(ppns), lines: new Set(L.map((x) => x.line)).size, ports: [...new Set(L.map((x) => x.depart_port).filter(Boolean))] };
    const url = `/blog/${slug}/`;
    const faqs = [[`¿Cuál es el crucero más barato?`, `El más barato ahora mismo es el ${shipName(T[0])} (${lineName(T[0])}) del ${fdate(T[0].date)}, ${T[0].nights} noches desde ${T[0].depart_port}, por ${eur(OFF.minPrice(T[0]))} por persona con tasas incluidas.`], [`¿Cuánto cuesta de media por noche?`, `La mediana es de ${eur(stats.medPpn)} por persona y noche entre las ${fmt(stats.n)} salidas que comparamos.`], ...faq.map((f) => (typeof f === 'function' ? f(L, stats) : f)).filter(Boolean)];
    const body = `<article class="wrap block guide blog-post">
<p class="eyebrow">${esc(kicker)}</p>
<h1>${esc(h1 || title)}</h1>
<p class="byline small muted">Por <a href="/sobre-nosotros/">${esc(CONFIG.author.name)}</a> · Publicado el ${fdate(PUBLISHED)} · <b>Datos actualizados el ${fdate(today)}</b></p>
<p class="lead-p">${intro(L, stats)}</p>
<div class="stats stats-light"><div><b>${fmt(stats.n)}</b><span>Salidas comparadas</span></div><div><b>${eur(stats.min)}</b><span>Precio más bajo</span></div><div><b>${eur(stats.medPpn)}</b><span>Mediana por noche</span></div><div><b>${stats.lines}</b><span>Navieras</span></div></div>
<h2>Los ${T.length} más baratos por noche</h2>
${table(T)}
<p class="muted small">Precio por persona en camarote doble, con tasas portuarias y cuota de servicio cuando la naviera las publica. Fuente: web oficial de cada naviera, comprobado el ${fdate(today)}. Los precios cambian a diario.</p>
<h2>Las mejores ofertas, en detalle</h2>
<div class="grid">${T.slice(0, 6).map((x) => OFF.card(x)).join('')}</div>
${extra ? extra(L, stats) : ''}
<section class="faq"><h2>Preguntas frecuentes</h2>${faqs.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</section>
${related.length ? `<h2>Sigue buscando</h2><div class="chips">${related.map(([u, t]) => `<a class="chip" href="${u}">${esc(t)}</a>`).join('')}</div>` : ''}
<p class="tip"><b>Consejo:</b> crea una <a href="/herramientas/alerta-precio/">alerta de precio</a> y te avisamos si alguna de estas salidas baja.</p>
</article>`;
    const schema = [{ '@context': 'https://schema.org', '@type': 'Article', headline: title, description: desc(stats), datePublished: PUBLISHED, dateModified: today, author: { '@type': 'Person', name: CONFIG.author.name, url: SITE + '/sobre-nosotros/' }, publisher: { '@type': 'Organization', name: 'MejorCrucero', logo: { '@type': 'ImageObject', url: SITE + '/icon-512.png' } }, mainEntityOfPage: SITE + url }, { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }, { '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: T.map((x, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE + OFF.url(x), name: `${shipName(x)} · ${fshort(x.date)}` })) }];
    write(`blog/${slug}/index.html`, layout({ title, desc: desc(stats), url, body, schema, ogType: 'article', crumbs: [['Inicio', '/'], ['Blog', '/blog/'], [h1 || title, url]] }));
    posts.push({ slug, url, title, h1: h1 || title, kicker, desc: desc(stats), n: stats.n, min: stats.min });
  }

  // 1-3. Los más baratos de este mes y los dos siguientes
  const now = new Date(today + 'T12:00:00Z');
  for (let k = now.getUTCDate() > 20 ? 1 : 0, done = 0; done < 3; k++, done++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + k, 1));
    const y = d.getUTCFullYear(), m = d.getUTCMonth(), ym = `${y}-${String(m + 1).padStart(2, '0')}`;
    add({ slug: `cruceros-mas-baratos-${MES[m]}-${y}`, kicker: 'Precios del mes', title: `Los cruceros más baratos de ${MES[m]} de ${y}`, desc: (s) => `${fmt(s.n)} cruceros en ${MES[m]} de ${y} comparados: desde ${eur(s.min)} por persona con tasas. Los 10 más baratos por noche, con fecha, puerto y naviera.`,
      intro: (L, s) => `Hemos comparado las ${fmt(s.n)} salidas de crucero de ${MES[m]} de ${y} que publican las navieras. La más barata cuesta ${eur(s.min)} por persona y la mitad sale por menos de ${eur(s.medPpn)} por noche. ${L.filter(fromSpain).length ? `${fmt(L.filter(fromSpain).length)} de ellas salen de un puerto español.` : ''}`,
      list: sailings.filter((x) => x.date.startsWith(ym) && x.date >= today), related: [[`/ofertas/${MES[m]}-${y}/`, `Todas las ofertas de ${MES[m]} ${y}`], [`/meses/${MES[m]}/`, `Adónde ir en ${MES[m]}`], ['/ultima-hora/', 'Cruceros de última hora']] });
  }
  // 4. Navidad y Nochevieja desde España
  const xy = now.getUTCMonth() === 11 && now.getUTCDate() > 26 ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
  const covers = (x, day) => x.date <= day && addDays(x.date, x.nights) > day;
  add({ slug: `cruceros-navidad-nochevieja-${xy}`, kicker: 'Fiestas', title: `Cruceros de Navidad y Nochevieja ${xy} desde España`, desc: (s) => `${fmt(s.n)} cruceros que pasan Nochebuena o Nochevieja ${xy} a bordo saliendo de España, desde ${eur(s.min)}. Fechas, barcos y precio real comparados.`,
    intro: (L, s) => `Estos son los cruceros que salen de un puerto español y en los que estarás a bordo el 24 o el 31 de diciembre de ${xy}: ${fmt(L.filter((x) => covers(x, `${xy}-12-24`)).length)} pasan Nochebuena en el barco y ${fmt(L.filter((x) => covers(x, `${xy}-12-31`)).length)} Nochevieja. Salen de ${s.ports.slice(0, 5).join(', ')}.`,
    list: sailings.filter((x) => fromSpain(x) && x.date >= today && (covers(x, `${xy}-12-24`) || covers(x, `${xy}-12-31`))), min: 3,
    faq: [(L) => [`¿Hay cruceros que pasen las dos fiestas a bordo?`, `${L.filter((x) => covers(x, `${xy}-12-24`) && covers(x, `${xy}-12-31`)).length ? `Sí: ${L.filter((x) => covers(x, `${xy}-12-24`) && covers(x, `${xy}-12-31`)).length} de estas salidas incluyen Nochebuena y Nochevieja.` : 'Entre las salidas desde España que tenemos ahora, ninguna incluye las dos noches.'}`]],
    related: [['/ofertas/navidad/', 'Ofertas de Navidad'], ['/ofertas/nochevieja/', 'Ofertas de Nochevieja'], ['/ofertas/sin-salir-de-espana/', 'Cruceros sin salir de España']] });
  // 5-11. Desde cada gran puerto español este invierno (dic–mar)
  const wy = now.getUTCMonth() >= 3 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  const wFrom = `${wy}-12-01` > today ? `${wy}-12-01` : today, wTo = `${wy + 1}-03-31`;
  for (const [slug, name] of Object.entries(ES_PORTS)) {
    add({ slug: `cruceros-desde-${slug}-invierno-${wy}-${wy + 1}`, kicker: `Desde ${name}`, title: `Cruceros desde ${name} este invierno (${wy}-${wy + 1})`, desc: (s) => `${fmt(s.n)} cruceros desde ${name} de diciembre a marzo, desde ${eur(s.min)} por persona con tasas. Los más baratos por noche, destinos y navieras.`,
      intro: (L, s) => `Entre diciembre de ${wy} y marzo de ${wy + 1} hay ${fmt(s.n)} salidas de crucero desde ${name} con precio publicado, de ${s.lines} naviera${s.lines > 1 ? 's' : ''}. Los destinos más repetidos son ${[...new Set(L.map((x) => OFF.destName(x.destination, x)))].slice(0, 3).join(', ')}.`,
      list: sailings.filter((x) => x.depart_port_slug === slug && x.date >= wFrom && x.date <= wTo), min: 4, related: [[`/puertos/${slug}/`, `Puerto de ${name}: cómo llegar`], [`/ofertas/desde-${slug}/`, `Todas las salidas desde ${name}`], ['/ofertas/cruceros-de-invierno/', 'Cruceros de invierno']] });
  }
  // 12. Minicruceros de 2-4 noches desde España
  add({ slug: 'minicruceros-desde-espana', kicker: 'Escapadas', title: 'Minicruceros de 2 a 4 noches desde España: los más baratos', desc: (s) => `${fmt(s.n)} minicruceros de 2 a 4 noches con salida de España, desde ${eur(s.min)} por persona. Ideales para probar un crucero o para un puente.`,
    intro: (L, s) => `Un minicrucero es la forma más barata de probar un barco. Hay ${fmt(s.n)} salidas de 2 a 4 noches desde puertos españoles (${s.ports.slice(0, 5).join(', ')}) con precio publicado; la más barata cuesta ${eur(s.min)} por persona con tasas.`,
    list: sailings.filter((x) => fromSpain(x) && x.nights >= 2 && x.nights <= 4 && x.date >= today), sort: (a, b) => OFF.minPrice(a) - OFF.minPrice(b), related: [['/ofertas/minicruceros/', 'Todos los minicruceros'], ['/ofertas/fin-de-semana/', 'Cruceros de fin de semana'], ['/guias/primer-crucero/', 'Guía: tu primer crucero']] });
  // 13. Chollos de la semana (nota de la oferta)
  add({ slug: 'chollos-de-cruceros-de-la-semana', kicker: 'Chollos', title: `Chollos de cruceros de la semana`, desc: (s) => `Las ${Math.min(10, s.n)} ofertas de crucero con mejor nota de precio esta semana (precio frente a cruceros parecidos e histórico), desde ${eur(s.min)}.`,
    intro: (L, s) => `Cada oferta lleva una nota de 0 a 100 que compara su precio real por noche con cruceros parecidos y con su propio histórico. Estas son las ${Math.min(10, s.n)} mejores de la semana del ${fdate(today)}, todas con nota de 85 o más.`,
    list: sailings.filter((x) => x.date >= today && OFF.deal(x).score >= 85), sort: (a, b) => OFF.deal(b).score - OFF.deal(a).score || byPpn(a, b), related: [['/ofertas/chollos/', 'Todos los chollos'], ['/ofertas/bajadas/', 'Bajadas de precio'], ['/metodologia/', 'Cómo calculamos la nota']] });
  // 14. Última hora: próximos 21 días
  add({ slug: 'cruceros-ultima-hora-proximas-semanas', kicker: 'Última hora', title: 'Cruceros de última hora: salidas en las próximas 3 semanas', desc: (s) => `${fmt(s.n)} cruceros que salen en los próximos 21 días, desde ${eur(s.min)} por persona con tasas. Los más baratos por noche, actualizados a diario.`,
    intro: (L, s) => `Si puedes viajar ya, la última hora suele tener buenos precios. Hay ${fmt(s.n)} salidas entre el ${fdate(today)} y el ${fdate(addDays(today, 21))}, ${fmt(L.filter(fromSpain).length)} de ellas desde España.`,
    list: sailings.filter((x) => x.date >= today && x.date <= addDays(today, 21)), related: [['/ultima-hora/', 'Toda la última hora'], ['/guias/cuando-reservar-crucero/', '¿Reservar ya o esperar?']] });
  // 15. Por menos de 500 € desde España
  add({ slug: 'cruceros-baratos-menos-500-euros-desde-espana', kicker: 'Presupuesto', title: 'Cruceros por menos de 500 € saliendo de España', desc: (s) => `${fmt(s.n)} cruceros desde puertos españoles por menos de 500 € por persona con tasas, desde ${eur(s.min)}. Ordenados por precio por noche.`,
    intro: (L, s) => `Sí, se puede hacer un crucero desde España por menos de 500 € por persona con tasas incluidas: hay ${fmt(s.n)} salidas así ahora mismo, de ${s.lines} naviera${s.lines > 1 ? 's' : ''}. La de más noches dura ${Math.max(...L.map((x) => x.nights))}.`,
    list: sailings.filter((x) => fromSpain(x) && x.date >= today && OFF.minPrice(x) < 500), related: [['/ofertas/menos-de-500-euros/', 'Todas por menos de 500 €'], ['/herramientas/precio-real/', 'Calcula el precio real con extras']] });
  // 16. Semana Santa 2027 (Domingo de Ramos 21-mar, Pascua 28-mar-2027)
  add({ slug: 'cruceros-semana-santa-2027', kicker: 'Fiestas', title: 'Cruceros de Semana Santa 2027: los más baratos', desc: (s) => `${fmt(s.n)} cruceros que salen en Semana Santa 2027 (del 18 al 28 de marzo), desde ${eur(s.min)} por persona con tasas.`,
    intro: (L, s) => `La Semana Santa de 2027 va del Domingo de Ramos, 21 de marzo, al Domingo de Resurrección, 28 de marzo. Hay ${fmt(s.n)} cruceros que salen entre el 18 y el 28 de marzo, ${fmt(L.filter(fromSpain).length)} de ellos desde España.`,
    list: sailings.filter((x) => x.date >= '2027-03-18' && x.date <= '2027-03-28' && x.date >= today), related: [['/ofertas/semana-santa/', 'Ofertas de Semana Santa'], ['/ofertas/marzo-2027/', 'Cruceros en marzo de 2027']] });
  // 17. Costa Cruceros este año: búsqueda con impresiones en Search Console
  const cy = now.getUTCFullYear() + (now.getUTCMonth() >= 10 ? 1 : 0);
  add({ slug: `ofertas-costa-cruceros-${cy}`, kicker: 'Navieras', title: `Ofertas de Costa Cruceros ${cy}: las más baratas desde España`, desc: (s) => `${fmt(s.n)} salidas de Costa Cruceros en ${cy} comparadas, desde ${eur(s.min)} con tasas. Las más baratas por noche, barcos y puertos españoles.`,
    intro: (L, s) => `Costa es una de las navieras con más salidas desde España. En ${cy} tiene ${fmt(s.n)} salidas con precio publicado en su web oficial, desde ${eur(s.min)} por persona; salen de ${s.ports.slice(0, 6).join(', ')}.`,
    list: sailings.filter((x) => x.line === 'costa' && x.date.startsWith(String(cy)) && x.date >= today), related: [['/navieras/costa/', 'Barcos de Costa con nota'], ['/ofertas/naviera-costa/', 'Todas las ofertas de Costa'], ['/comparativas/msc-vs-costa/', 'MSC o Costa']] });

  // Índice del blog + RSS
  const idx = `<section class="wrap block page-h"><h1>Blog de cruceros: precios reales, cada día</h1><p class="lead-p">Artículos que se actualizan solos con los precios de las navieras. Sin opiniones pagadas: solo datos comprobados el ${fdate(today)}.</p></section>
<section class="wrap block"><div class="grid">${posts.map((p) => `<a class="card blog-card" href="${p.url}"><span class="eyebrow">${esc(p.kicker)}</span><h2 class="h-sm">${esc(p.h1)}</h2><p class="small muted">${fmt(p.n)} salidas · desde ${eur(p.min)}</p></a>`).join('')}</div></section>`;
  write('blog/index.html', layout({ title: 'Blog de cruceros: ofertas y precios reales actualizados', desc: `Artículos de cruceros con datos reales: los más baratos del mes, Navidad, Semana Santa, minicruceros y salidas desde cada puerto español. Actualizado el ${fdate(today)}.`, url: '/blog/', body: idx, crumbs: [['Inicio', '/'], ['Blog', '/blog/']] }));
  write('blog/feed.xml', `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Blog de MejorCrucero</title><link>${SITE}/blog/</link><description>Cruceros con precios reales, actualizados a diario</description><language>es-ES</language>${posts.map((p) => `<item><title>${esc(p.title)}</title><link>${SITE}${p.url}</link><guid isPermaLink="true">${SITE}${p.url}</guid><pubDate>${new Date(today + 'T06:00:00Z').toUTCString()}</pubDate><description>${esc(p.desc)}</description></item>`).join('')}</channel></rss>`);
  return posts;
}
