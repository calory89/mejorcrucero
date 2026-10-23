// MejorCrucero v3: encaje personal, sorpréndeme, ranking, embeds, referidos, avisos,
// resumen anual ("Wrapped"), duelo compartible y herramientas nuevas.
(() => {
  'use strict';
  const BASE = document.body.dataset.base || '/';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const qs = new URLSearchParams(location.search);
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const eur = (n) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
  const dec = (n, d = 1) => Number(n).toLocaleString('es-ES', { maximumFractionDigits: d });
  const memo = {};
  const getJson = (f) => memo[f] || (memo[f] = fetch(BASE + 'data/' + f).then((r) => r.json()));
  const getShips = () => getJson('ships.json');
  const cfg = () => getJson('config.json').catch(() => ({}));
  async function api(path, opts = {}) {
    const c = await cfg(); if (!c.api) throw new Error('noapi');
    const r = await fetch(c.api + path, { method: opts.body ? 'POST' : 'GET', headers: opts.body ? { 'Content-Type': 'application/json' } : {}, body: opts.body ? JSON.stringify(opts.body) : undefined });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'error'); return j;
  }
  const uid = () => { let id = store.get('mc_uid'); if (!id) { id = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 24); store.set('mc_uid', id); } return id; };
  const scCls = (n) => (n >= 85 ? 'sc-a' : n >= 75 ? 'sc-b' : n >= 65 ? 'sc-c' : n >= 50 ? 'sc-d' : 'sc-e');
  const scColor = (n) => (n >= 85 ? '#065f46' : n >= 75 ? '#166534' : n >= 65 ? '#92400e' : n >= 50 ? '#9a3412' : '#991b1b');

  // ---------- Encaje personal (a partir del test "¿Qué crucero es para mí?") ----------
  const FAMILY = ['royal-caribbean', 'disney', 'msc', 'carnival', 'costa', 'norwegian'];
  const CALM = ['celebrity', 'princess', 'cunard', 'holland-america', 'oceania', 'viking', 'azamara', 'regent', 'silversea', 'seabourn', 'explora'];
  window.MC_profile = () => store.get('mc_profile', null);
  window.MC_match = (s, a, why) => {
    let got = 0, max = 0; const r = [];
    const add = (w, ok, txt) => { max += w; if (ok > 0) { got += w * ok; if (txt && ok >= 0.7) r.push(txt); } };
    if (a.es === 'yes') add(3, s.es ? 1 : 0, 'español a bordo');
    if (a.size === 'giant') add(2, s.gt >= 200000 ? 1 : s.gt >= 160000 ? 0.6 : 0, 'barco gigante con atracciones');
    if (a.size === 'mid') add(2, s.gt < 170000 && s.gt > 80000 ? 1 : 0.2, 'tamaño mediano');
    if (a.size === 'small') add(2, s.gt < 60000 ? 1 : s.gt < 90000 ? 0.5 : 0, 'barco pequeño');
    if (a.budget && a.budget !== 'any') add(2, s.tier === a.budget ? 1 : 0, 'encaja con tu presupuesto');
    if (a.new === 'yes') add(1.5, Math.max(0, Math.min(1, (s.year - 2012) / 13)), 'barco moderno');
    if (a.who === 'family') add(2.5, ['virgin-voyages', 'viking'].includes(s.lineSlug) ? 0 : FAMILY.includes(s.lineSlug) ? 1 : 0.3, 'pensado para familias');
    if (a.who === 'couple' || a.who === 'senior') add(2, CALM.includes(s.lineSlug) ? 1 : 0.3, 'ambiente tranquilo');
    if (a.who === 'senior') add(1, (s.ratio || 0) > 40 ? 1 : 0.3, 'mucho espacio');
    if (a.who === 'friends') add(1.5, ['norwegian', 'carnival', 'royal-caribbean', 'msc', 'virgin-voyages'].includes(s.lineSlug) ? 1 : 0.3, 'ambiente animado');
    add(2, s.sc != null ? s.sc / 100 : 0.55, s.sc >= 80 ? `nota alta (${s.sc}/100)` : '');
    const m = Math.round((got / max) * 100);
    return why ? { m, why: r.slice(0, 3) } : m;
  };
  const box = $('.match-box');
  if (box) getShips().then((ships) => {
    const s = ships.find((x) => x.slug === box.dataset.slug); const a = window.MC_profile();
    if (!s) return;
    box.hidden = false;
    if (!a) { box.innerHTML = `🎯 <a href="${BASE}herramientas/que-crucero/">Haz el test de 1 minuto</a> y te decimos qué encaje tiene este barco contigo.`; return; }
    const { m, why } = window.MC_match(s, a, true);
    box.innerHTML = `🎯 <b>${m}% para ti</b>${why.length ? ` · ${esc(why.join(', '))}` : ''} · <a href="${BASE}herramientas/que-crucero/">rehacer el test</a>`;
  });

  // ---------- Sorpréndeme ----------
  $$('.js-surprise').forEach((b) => b.addEventListener('click', async () => {
    const ships = (await getShips()).filter((s) => (s.sc ?? 0) >= 65);
    const a = window.MC_profile();
    const pool = a ? ships.filter((s) => window.MC_match(s, a) >= 60) : ships;
    const s = (pool.length ? pool : ships)[Math.floor(Math.random() * (pool.length || ships.length))];
    if (s) location.href = `${BASE}barcos/${s.slug}/`;
  }));

  // ---------- Ranking: filtro por naviera ----------
  const rf = $('#rank-filter');
  if (rf) rf.addEventListener('input', () => { const l = rf.linea.value; $$('#top tbody tr').forEach((tr) => { tr.hidden = l && tr.dataset.line !== l; }); });

  // ---------- Copiar código para insertar ----------
  $$('.js-copy-embed').forEach((b) => b.addEventListener('click', () => { const t = b.previousElementSibling; t.select(); navigator.clipboard?.writeText(t.value); b.textContent = '¡Copiado!'; }));

  // ---------- Referidos: los enlaces que compartes llevan tu código ----------
  const ref = qs.get('ref');
  if (ref && /^[a-z0-9]{16,40}$/.test(ref) && ref !== store.get('mc_uid') && !store.get('mc_ref_from')) { store.set('mc_ref_from', ref); api('/ref', { body: { code: ref, user_id: uid(), page: location.pathname } }).catch(() => {}); }
  const withRef = (u) => { try { const x = new URL(u); x.searchParams.set('ref', uid()); return x.toString(); } catch { return u; } };
  $$('.js-share').forEach((b) => { if (b.dataset.url) b.dataset.url = withRef(b.dataset.url); });
  $$('a.btn-wa').forEach((a) => { a.href = a.href.replace(/(https?%3A%2F%2F[^&\s]+)/i, (m) => encodeURIComponent(withRef(decodeURIComponent(m)))); });

  // ---------- Avisos: respuestas a tus mensajes ----------
  const bell = $('.notif');
  (async () => {
    if (!bell || !store.get('mc_me', {}).name) return;
    const since = store.get('mc_notif_seen', '2026-01-01 00:00:00');
    const j = await api(`/notifications?user_id=${uid()}&since=${encodeURIComponent(since)}`).catch(() => null);
    if (!j || !j.items.length) return;
    store.set('mc_notifs', j.items);
    bell.hidden = false; $('span', bell).textContent = j.items.length;
  })();
  const nl = $('#my-notifs');
  if (nl) {
    const items = store.get('mc_notifs', []);
    const link = (t) => { const [k, a, b] = t.split(':'); return k === 'barco' ? `${BASE}barcos/${a}/#foro` : k === 'salida' ? `${BASE}comunidad/salida/?b=${a}&f=${b}` : BASE + 'comunidad/'; };
    nl.innerHTML = items.length ? `<ul class="mini">${items.map((x) => `<li><a href="${link(x.thread)}"><b>${esc(x.name)} te ha respondido</b><span>${esc(x.body)}</span></a></li>`).join('')}</ul>` : '<p class="muted">No tienes avisos nuevos. Cuando alguien responda a tus mensajes del foro, aparecerá aquí.</p>';
    if (items.length) { store.set('mc_notif_seen', new Date().toISOString().slice(0, 19).replace('T', ' ')); store.set('mc_notifs', []); }
  }

  // ---------- Canvas: tarjetas para compartir ----------
  const card = (draw, name) => {
    const c = document.createElement('canvas'); c.width = 1080; c.height = 1080; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 1080); gr.addColorStop(0, '#0b2540'); gr.addColorStop(1, '#0e5a86'); g.fillStyle = gr; g.fillRect(0, 0, 1080, 1080);
    g.fillStyle = '#ffb09c'; g.font = 'bold 44px Georgia,serif'; g.fillText('MejorCrucero', 70, 110);
    draw(g);
    g.fillStyle = '#cfe0f3'; g.font = '30px system-ui,sans-serif'; g.fillText('mejorcrucero.com', 70, 1020);
    c.toBlob(async (blob) => {
      const file = new File([blob], name + '.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: 'MejorCrucero' }); return; } catch {} }
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name + '.png'; a.click();
    });
  };
  const wrap = (g, text, x, y, w, lh) => { let line = ''; for (const word of text.split(' ')) { if (g.measureText(line + word).width > w) { g.fillText(line, x, y); y += lh; line = ''; } line += word + ' '; } g.fillText(line, x, y); return y; };

  // Duelo de barcos compartible (comparador)
  const cmp = $('#cmp-form');
  if (cmp) {
    const b = document.createElement('p'); b.innerHTML = '<button class="btn btn-ghost btn-sm" type="button">📸 Imagen del duelo para compartir</button>'; cmp.after(b);
    b.firstChild.addEventListener('click', async () => {
      const ships = await getShips();
      const sel = [0, 1, 2].map((i) => cmp['s' + i].value).filter(Boolean).map((x) => ships.find((s) => s.slug === x)).filter(Boolean).slice(0, 3);
      if (sel.length < 2) { alert('Elige al menos dos barcos.'); return; }
      const win = [...sel].sort((a, z) => (z.sc ?? -1) - (a.sc ?? -1))[0];
      card((g) => {
        g.fillStyle = '#fff'; g.font = 'bold 64px Georgia,serif'; g.fillText('Duelo de cruceros', 70, 220);
        sel.forEach((s, i) => {
          const y = 300 + i * 200; g.fillStyle = '#12345a'; g.fillRect(70, y, 940, 170);
          g.fillStyle = s.sc != null ? scColor(s.sc) : '#475569'; g.fillRect(90, y + 25, 120, 120);
          g.fillStyle = '#fff'; g.font = 'bold 56px system-ui,sans-serif'; g.fillText(s.sc != null ? s.sc : '—', s.sc >= 100 ? 95 : 112, y + 105);
          g.font = 'bold 44px system-ui,sans-serif'; g.fillText((s === win ? '🏆 ' : '') + s.name, 240, y + 75);
          g.fillStyle = '#cfe0f3'; g.font = '30px system-ui,sans-serif'; g.fillText(`${s.lineShort} · ${s.year} · ${s.gt.toLocaleString('es-ES')} GT`, 240, y + 125);
        });
        g.fillStyle = '#fbbf24'; g.font = 'bold 40px system-ui,sans-serif'; g.fillText(`Gana el ${win.name}`, 70, 960);
      }, 'duelo-cruceros');
    });
  }

  // ---------- Mis cruceros: diario de barcos y resumen anual ----------
  const logF = $('#log-form');
  if (logF) {
    const render = async () => {
      const ships = await getShips(); const by = Object.fromEntries(ships.map((s) => [s.slug, s]));
      const log = store.get('mc_sailed', []).filter((x) => by[x.slug]);
      const out = $('#log-out');
      out.innerHTML = log.length ? `<ul class="mini">${log.map((x, i) => `<li><a href="${BASE}barcos/${x.slug}/"><b>${esc(by[x.slug].name)}</b><span>${x.year} · ${esc(by[x.slug].lineShort)}${by[x.slug].sc != null ? ' · nota ' + by[x.slug].sc : ''}</span></a><button class="link js-del-log" data-i="${i}" type="button" aria-label="Quitar">✕</button></li>`).join('')}</ul>` : '<p class="muted">Añade los barcos en los que has navegado.</p>';
      // Resumen + retos
      const lines = new Set(log.map((x) => by[x.slug].lineSlug));
      const gt = log.reduce((a, x) => a + by[x.slug].gt, 0);
      const best = [...log].sort((a, z) => (by[z.slug].sc ?? -1) - (by[a.slug].sc ?? -1))[0];
      const RETOS = [['Primer crucero', log.length >= 1], ['5 cruceros', log.length >= 5], ['10 cruceros', log.length >= 10], ['3 navieras', lines.size >= 3], ['5 navieras', lines.size >= 5], ['Barco gigante (200.000 GT+)', log.some((x) => by[x.slug].gt >= 200000)], ['Crucero de lujo', log.some((x) => by[x.slug].tier === 'lujo')], ['Barco con nota 85+', log.some((x) => (by[x.slug].sc ?? 0) >= 85)], ['Barco pequeño', log.some((x) => by[x.slug].gt < 60000)]];
      $('#wrapped').innerHTML = log.length ? `<div class="stats"><div><b>${log.length}</b><span>cruceros</span></div><div><b>${lines.size}</b><span>navieras</span></div><div><b>${(gt / 1000).toLocaleString('es-ES', { maximumFractionDigits: 0 })}k</b><span>GT navegados</span></div><div><b>${best && by[best.slug].sc != null ? by[best.slug].sc : '—'}</b><span>tu mejor nota</span></div></div>
        <h3 class="h-sm">Retos</h3><ul class="retos">${RETOS.map(([t, ok]) => `<li class="${ok ? 'ok' : ''}">${ok ? '🏅' : '⬜'} ${esc(t)}</li>`).join('')}</ul>
        <button class="btn js-wrapped" type="button">📸 Compartir mi resumen</button>` : '';
      $('.js-wrapped')?.addEventListener('click', () => card((g) => {
        g.fillStyle = '#fff'; g.font = 'bold 72px Georgia,serif'; g.fillText('Mis cruceros', 70, 230);
        [[log.length, 'cruceros'], [lines.size, 'navieras'], [Math.round(gt / 1000) + 'k', 'GT navegados']].forEach(([v, l], i) => { g.fillStyle = '#12345a'; g.fillRect(70 + i * 320, 300, 290, 200); g.fillStyle = '#fff'; g.font = 'bold 80px system-ui,sans-serif'; g.fillText(v, 95 + i * 320, 410); g.fillStyle = '#cfe0f3'; g.font = '30px system-ui,sans-serif'; g.fillText(l, 95 + i * 320, 465); });
        if (best) { g.fillStyle = '#fbbf24'; g.font = 'bold 40px system-ui,sans-serif'; wrap(g, `Mi mejor barco: ${by[best.slug].name}${by[best.slug].sc != null ? ` (${by[best.slug].sc}/100)` : ''}`, 70, 600, 940, 52); }
        g.fillStyle = '#fff'; g.font = '34px system-ui,sans-serif'; g.fillText(`🏅 ${RETOS.filter((r) => r[1]).length} de ${RETOS.length} retos conseguidos`, 70, 760);
      }, 'mis-cruceros'));
    };
    logF.addEventListener('submit', async (e) => {
      e.preventDefault(); const ships = await getShips();
      const s = ships.find((x) => x.name.toLowerCase() === logF.ship.value.trim().toLowerCase());
      if (!s) { $('.form-msg', logF).textContent = 'Elige un barco de la lista.'; return; }
      const l = store.get('mc_sailed', []); l.unshift({ slug: s.slug, year: +logF.year.value || new Date().getFullYear() }); store.set('mc_sailed', l.slice(0, 200));
      const me = store.get('mc_me', {}); store.set('mc_me', { ...me, cruises: Math.max(me.cruises || 0, l.length) });
      logF.reset(); $('.form-msg', logF).textContent = ''; render();
    });
    document.addEventListener('click', (e) => { const d = e.target.closest('.js-del-log'); if (d) { const l = store.get('mc_sailed', []); l.splice(+d.dataset.i, 1); store.set('mc_sailed', l); render(); } });
    render();
  }

  // ---------- Herramienta: simulador de propinas ----------
  const tipF = $('#tip-form');
  if (tipF) {
    const calc = () => {
      const o = tipF.linea.selectedOptions[0]; const t = parseFloat(tipF.cabin.value === 'suite' ? o.dataset.suite : o.dataset.tip);
      const out = $('#tip-out'); const fx = +tipF.dataset.fx || 0.9;
      if (!t) { out.innerHTML = '<p class="muted">Esta naviera no publica un cargo de servicio en dólares o lo incluye en el precio. Consulta las condiciones de tu reserva.</p>'; return; }
      const n = +tipF.nights.value || 7, p = +tipF.people.value || 2, usd = t * n * p;
      out.innerHTML = `<p class="big-num">${usd.toLocaleString('es-ES', { maximumFractionDigits: 0 })} $ <small>≈ ${eur(usd * fx)}</small></p><p>${dec(t, 2)} $ por persona y noche × ${n} noches × ${p} personas. Referencia del mercado de EE. UU.; en reservas hechas en España algunas navieras lo cobran en euros o lo incluyen. Comprueba tus condiciones.</p>`;
    };
    tipF.addEventListener('input', calc); calc();
  }

  // ---------- Herramienta: ¿compensa el paquete de bebidas? ----------
  const drF = $('#drinks-form');
  if (drF) {
    const calc = () => {
      const v = (k) => parseFloat(drF[k].value) || 0;
      const perDay = v('coffee') * v('p_coffee') + v('soft') * v('p_soft') + v('beer') * v('p_beer') + v('wine') * v('p_wine') + v('cocktail') * v('p_cocktail') + v('water') * v('p_water');
      const withTip = perDay * (1 + v('service') / 100), pack = v('pack') * (1 + v('service') / 100);
      const diff = (withTip - pack) * v('nights');
      $('#drinks-out').innerHTML = `<p>Sueltas: <b>${eur(withTip)}</b> al día · Paquete: <b>${eur(pack)}</b> al día</p><p class="big-num ${diff > 0 ? 'ok' : 'ko'}">${diff > 0 ? `El paquete te ahorra ${eur(diff)}` : `Sin paquete ahorras ${eur(-diff)}`}</p><p class="muted small">En ${v('nights')} noches, para una persona. La mayoría de navieras obligan a contratar el paquete a todos los adultos del camarote.</p>`;
    };
    drF.addEventListener('input', calc); calc();
  }

  // ---------- Herramienta: presupuesto compartido ----------
  const spF = $('#split-form');
  if (spF) {
    const people = () => spF.people.value.split(',').map((x) => x.trim()).filter(Boolean);
    let items = store.get('mc_split', []);
    const render = () => {
      const ps = people(); spF.who.innerHTML = ps.map((p) => `<option>${esc(p)}</option>`).join('');
      const total = items.reduce((a, x) => a + x.amount, 0), share = ps.length ? total / ps.length : 0;
      const bal = Object.fromEntries(ps.map((p) => [p, -share])); items.forEach((x) => { if (bal[x.who] != null) bal[x.who] += x.amount; });
      // Liquidación mínima
      const deb = Object.entries(bal).filter(([, v]) => v < -0.5).map(([p, v]) => [p, -v]), cred = Object.entries(bal).filter(([, v]) => v > 0.5);
      const moves = []; let i = 0, j = 0;
      while (i < deb.length && j < cred.length) { const m = Math.min(deb[i][1], cred[j][1]); moves.push(`${deb[i][0]} paga ${eur(m)} a ${cred[j][0]}`); deb[i][1] -= m; cred[j][1] -= m; if (deb[i][1] < 0.5) i++; if (cred[j][1] < 0.5) j++; }
      $('#split-out').innerHTML = `<ul class="mini">${items.map((x, k) => `<li><span><b>${esc(x.what)}</b> · ${eur(x.amount)} · pagó ${esc(x.who)}</span><button class="link js-split-del" data-i="${k}" type="button" aria-label="Quitar">✕</button></li>`).join('')}</ul><p>Total <b>${eur(total)}</b> · ${ps.length ? `<b>${eur(share)}</b> por persona` : ''}</p>${moves.length ? `<h3 class="h-sm">Para quedar en paz</h3><ul>${moves.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>` : ''}`;
      store.set('mc_split', items); store.set('mc_split_p', spF.people.value);
    };
    spF.people.value = store.get('mc_split_p', '');
    spF.people.addEventListener('change', render);
    spF.addEventListener('submit', (e) => { e.preventDefault(); const a = parseFloat(spF.amount.value); if (!a || !spF.what.value.trim()) return; items.push({ what: spF.what.value.trim(), amount: a, who: spF.who.value }); spF.what.value = ''; spF.amount.value = ''; render(); });
    document.addEventListener('click', (e) => { const d = e.target.closest('.js-split-del'); if (d) { items.splice(+d.dataset.i, 1); render(); } if (e.target.closest('.js-split-reset')) { items = []; render(); } });
    render();
  }

  // ---------- Herramienta: el tiempo en el puerto (Open-Meteo, sin claves) ----------
  const wF = $('#weather-form');
  if (wF) {
    const go = async () => {
      const [lat, lon, name] = wF.port.value.split('|'); const out = $('#weather-out');
      out.innerHTML = '<p class="muted">Cargando…</p>';
      try {
        const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&timezone=auto&forecast_days=14`);
        const j = await r.json(); const d = j.daily;
        const icon = (c) => (c <= 1 ? '☀️' : c <= 3 ? '⛅' : c <= 48 ? '🌫️' : c <= 67 ? '🌧️' : c <= 77 ? '❄️' : c <= 82 ? '🌦️' : '⛈️');
        out.innerHTML = `<h2 class="h-sm">Próximos 14 días en ${esc(name)}</h2><div class="wx">${d.time.map((t, i) => `<div><b>${new Date(t).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })}</b><span class="wx-i">${icon(d.weather_code[i])}</span><span>${Math.round(d.temperature_2m_max[i])}° / ${Math.round(d.temperature_2m_min[i])}°</span><small>💧${d.precipitation_probability_max[i] ?? '—'}% · 💨${Math.round(d.wind_speed_10m_max[i])} km/h</small></div>`).join('')}</div><p class="muted small">Previsión de <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a>. El viento fuerte (más de 40 km/h) puede hacer que el barco se mueva o que se cancele una escala con lanchas.</p>`;
      } catch { out.innerHTML = '<p class="muted">No se ha podido cargar la previsión. Inténtalo más tarde.</p>'; }
    };
    if (qs.get('lat') && qs.get('lon')) { const o = document.createElement('option'); o.value = `${qs.get('lat')}|${qs.get('lon')}|${qs.get('n') || 'Puerto'}`; o.textContent = qs.get('n') || 'Puerto'; wF.port.prepend(o); wF.port.value = o.value; }
    wF.addEventListener('input', go); if (qs.get('p')) { const o = [...wF.port.options].find((x) => x.value.endsWith('|' + qs.get('p'))); if (o) wF.port.value = o.value; } go();
  }

  // ---------- Herramienta: maleta según destino y mes ----------
  const mF = $('#pack-form');
  if (mF) {
    const BASE_LIST = ['Documentación (DNI/pasaporte) y tarjetas de embarque', 'Seguro de viaje y tarjeta sanitaria europea', 'Medicación habitual en el equipaje de mano', 'Pastillas o pulseras para el mareo', 'Cargador y regleta sin protección contra sobretensiones (no suelen estar permitidas)', 'Bolsa para la primera tarde (la maleta llega horas después)', 'Ropa de noche para las cenas de gala', 'Botella reutilizable', 'Pequeña mochila para las escalas', 'Copia digital de los documentos'];
    const calc = () => {
      const o = mF.dest.selectedOptions[0]; const m = +mF.month.value; const months = JSON.parse(o.dataset.months || '[]');
      const warm = o.dataset.climate === 'warm' ? m >= 4 && m <= 10 || o.dataset.always === '1' : o.dataset.climate === 'mild' ? m >= 6 && m <= 9 : false;
      const cold = o.dataset.climate === 'cold' || (!warm && (m <= 3 || m >= 11));
      const extra = [];
      if (warm) extra.push('Crema solar alta y after-sun', 'Gorra o sombrero y gafas de sol', 'Bañador (mejor dos)', 'Sandalias y calzado cómodo para caminar', 'Ropa ligera de algodón o lino');
      if (cold) extra.push('Abrigo impermeable y forro polar', 'Capas: térmica, jersey y cortavientos', 'Gorro, guantes y bufanda', 'Calzado impermeable con buena suela', 'Prismáticos para ver paisajes y fauna');
      if (!warm && !cold) extra.push('Chaqueta ligera para la noche', 'Capas para el viento en cubierta', 'Paraguas plegable');
      if (o.dataset.religious === '1') extra.push('Ropa que cubra hombros y rodillas para visitar templos');
      if (o.dataset.plane === '1') extra.push('Revisa los límites de equipaje de tu vuelo');
      $('#pack-out').innerHTML = `${months.length && !months.includes(m) ? '<p class="tip">Ojo: no es la mejor época para este destino. Mira la guía del destino.</p>' : ''}<ul class="chk">${[...extra, ...BASE_LIST].map((x, i) => `<li><label><input type="checkbox" data-k="${i}"> ${esc(x)}</label></li>`).join('')}</ul>`;
    };
    mF.addEventListener('input', calc); calc();
  }
  // ---------- Ofertas: búsqueda en lenguaje natural ----------
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const fold = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const nlParse = (raw) => {
    let t = fold(raw); if (!t.trim()) return null;
    const money = /(?:menos de|hasta|maximo|max|por)\s*(\d{2,5})|(\d{2,5})\s*(?:€|eur)/.exec(t); const max = money ? +(money[1] || money[2]) : 0; if (money) t = t.replace(money[0], ' ');
    const nm = /(\d{1,2})\s*noches?/.exec(t); const nights = nm ? +nm[1] : 0; if (nm) t = t.replace(nm[0], ' ');
    const month = MESES.findIndex((m) => t.includes(m)); if (month >= 0) t = t.replace(MESES[month], ' ');
    const words = t.replace(/\b(crucero|cruceros|en|de|del|la|el|los|las|por|desde|con|y|a|para|un|una|barato|baratos|baratas|islas|oferta|ofertas|euros?)\b/g, ' ').split(/\s+/).filter((w) => w.length > 2).map((w) => (w.length > 5 ? w.slice(0, -1) : w));
    return (c) => (!max || +c.dataset.price <= max) && (!nights || Math.abs(+c.dataset.nights - nights) <= 1) && (month < 0 || +String(c.dataset.m).slice(5) === month + 1) && words.every((w) => fold(c.dataset.q).includes(w));
  };
  // ---------- Ofertas: ordenar y filtrar el listado sin recargar ----------
  $$('.offer-filter').forEach((f) => {
    const g = $(f.dataset.target); if (!g) return;
    const cards = [...g.children];
    const apply = () => {
      const o = f.o.value, n = f.n.value, b = +(f.b?.value || 0), es = f.es?.value, mo = f.m?.value, nl = nlParse(f.q?.value);
      const key = { score: (c) => -+c.dataset.score, price: (c) => +c.dataset.price, ppn: (c) => +c.dataset.ppn, date: (c) => c.dataset.date }[o];
      g.dataset.sort = o; cards.sort((a, b) => { const x = key(a), y = key(b); return x < y ? -1 : x > y ? 1 : 0; });
      let shown = 0;
      cards.forEach((c) => { c.hidden = (n && c.dataset.n !== n) || (b && +c.dataset.price > b) || (es === '1' && c.dataset.es !== '1') || (mo && c.dataset.m !== mo) || (nl && !nl(c)); if (!c.hidden) shown++; g.appendChild(c); });
      let m = $('.offer-count', f); if (!m) { m = document.createElement('p'); m.className = 'offer-count muted small'; m.setAttribute('aria-live', 'polite'); f.appendChild(m); } m.textContent = `${shown} ofertas`;
      let more = $('.nl-more', f.parentNode); if (more) more.remove();
      if (nl && shown < 6) getJson('ofertas.json').then((all) => {
        const vis = new Set(cards.filter((c) => !c.hidden).map((c) => c.querySelector('a[href*="/salidas/"]')?.getAttribute('href')));
        const hits = all.filter((o) => !vis.has(`${BASE}salidas/${o.i}/`) && nl({ dataset: { price: o.pr, nights: o.n, m: o.d.slice(0, 7), q: [o.dst, o.sn, o.p, ...(o.pts || []), MESES[+o.d.slice(5, 7) - 1]].join(' ') } })).sort((a, b) => b.sc - a.sc).slice(0, 24);
        $('.nl-more', f.parentNode)?.remove();
        const box = document.createElement('div'); box.className = 'nl-more';
        box.innerHTML = hits.length ? `<h3 class="h-sm">${hits.length} ofertas más en otras fechas y destinos que encajan</h3><ul class="mini">${hits.map((o) => `<li><a href="${BASE}salidas/${o.i}/"><b>${esc(o.t)}</b><span>${new Date(o.d + 'T12:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })} · desde ${esc(o.p)} · ${eur(o.pr)} · nota ${o.sc}</span></a></li>`).join('')}</ul>` : (shown ? '' : '<p class="tip">No hay ofertas que cumplan todo. Prueba quitando el presupuesto, el mes o alguna palabra.</p>');
        g.before(box);
      }).catch(() => {});
    };
    f.addEventListener('input', apply); f.addEventListener('submit', (e) => { e.preventDefault(); apply(); });
    let any = false; for (const el of f.elements) if (el.name && qs.get(el.name)) { el.value = qs.get(el.name); any = true; } if (any) apply();
  });
// ---------- Ofertas guardadas y vistas ----------
  const so = $('.js-save-offer');
  if (so) {
    const o = JSON.parse(so.dataset.offer);
    const rec = store.get('mc_offer_recent', []).filter((x) => x.id !== o.id); rec.unshift({ ...o, seen: Date.now() }); store.set('mc_offer_recent', rec.slice(0, 20));
    const sync = () => { const on = store.get('mc_offer_favs', []).some((x) => x.id === o.id); so.setAttribute('aria-pressed', on); so.lastChild.textContent = on ? ' Guardada' : ' Guardar oferta'; };
    so.addEventListener('click', () => { const l = store.get('mc_offer_favs', []); const on = l.some((x) => x.id === o.id); store.set('mc_offer_favs', on ? l.filter((x) => x.id !== o.id) : [o, ...l].slice(0, 50)); sync(); });
    sync();
  }
  const mo = $('#my-offers');
  if (mo) {
    const favs = store.get('mc_offer_favs', []), rec = store.get('mc_offer_recent', []).filter((r) => !favs.some((f) => f.id === r.id)).slice(0, 8);
    const li = (x, tag) => `<li><a href="${BASE}salidas/${esc(x.id)}/"><b>${esc(x.t)}</b><span>${esc(x.d)} · desde ${eur(x.p)}${tag ? ' · ' + tag : ''}</span></a></li>`;
    if (favs.length || rec.length) mo.innerHTML = `<ul class="mini">${favs.map((x) => li(x, '❤️ guardada')).join('')}${rec.map((x) => li(x, 'vista')).join('')}</ul>`;
  }
// ---------- Ofertas: datos ligeros ----------
  const getOffers = () => getJson('ofertas.json');

  // Guardar búsquedas y sorpréndeme con un chollo
  $$('.js-save-search').forEach((b) => b.addEventListener('click', () => {
    const f = $('.offer-filter'); const params = new URLSearchParams();
    if (f) for (const el of f.elements) if (el.name && el.value) params.set(el.name, el.value);
    const item = { u: location.pathname + (params.toString() ? '?' + params : ''), t: document.querySelector('h1')?.textContent.trim() + (f?.q?.value ? ` · "${f.q.value}"` : ''), at: Date.now() };
    const l = store.get('mc_searches', []).filter((x) => x.u !== item.u); l.unshift(item); store.set('mc_searches', l.slice(0, 20)); b.textContent = '⭐ Guardada en Mis cruceros';
  }));
  $$('.js-surprise-offer').forEach((b) => b.addEventListener('click', async () => {
    const l = (await getOffers()).filter((o) => o.sc >= 80); const o = l[Math.floor(Math.random() * l.length)]; if (o) location.href = `${BASE}salidas/${o.i}/`;
  }));

  // Cambio de precio desde tu última visita
  const pc = $('.price-change');
  if (pc) {
    const seen = store.get('mc_prices', {}); const now = +pc.dataset.price, prev = seen[pc.dataset.id];
    if (prev && prev !== now) { pc.hidden = false; pc.className = 'price-change tip ' + (now < prev ? 'tip-ok' : 'tip-hot'); pc.innerHTML = now < prev ? `📉 <b>Ha bajado ${eur(prev - now)}</b> desde tu última visita (antes ${eur(prev)}).` : `📈 Ha subido ${eur(now - prev)} desde tu última visita (antes ${eur(prev)}).`; }
    seen[pc.dataset.id] = now; store.set('mc_prices', seen);
  }
  // Mis cruceros: avisos de cambios de precio en ofertas guardadas + búsquedas guardadas
  const mo2 = $('#my-offers');
  if (mo2) getOffers().then((all) => {
    const by = Object.fromEntries(all.map((o) => [o.i, o])); const favs = store.get('mc_offer_favs', []);
    const changes = favs.filter((f) => by[f.id] && f.p && by[f.id].pr !== f.p).map((f) => `<li><a href="${BASE}salidas/${f.id}/"><b>${esc(f.t)}</b><span>${by[f.id].pr < f.p ? '📉 ha bajado' : '📈 ha subido'} de ${eur(f.p)} a ${eur(by[f.id].pr)}</span></a></li>`);
    if (changes.length) mo2.insertAdjacentHTML('afterbegin', `<div class="tip"><b>Cambios de precio en tus ofertas guardadas</b><ul class="mini">${changes.join('')}</ul></div>`);
    const ss = store.get('mc_searches', []);
    if (ss.length) mo2.insertAdjacentHTML('beforeend', `<h3 class="h-sm">⭐ Búsquedas guardadas</h3><ul class="mini">${ss.map((x) => `<li><a href="${esc(x.u)}"><b>${esc(x.t)}</b><span>${new Date(x.at).toLocaleDateString('es-ES')}</span></a></li>`).join('')}</ul>`);
  }).catch(() => {});

  // Comparar ofertas
  $$('.js-cmp-offer').forEach((b) => b.addEventListener('click', () => { const l = store.get('mc_cmp_offers', []).filter((x) => x !== b.dataset.id); l.unshift(b.dataset.id); store.set('mc_cmp_offers', l.slice(0, 3)); location.href = BASE + 'herramientas/comparar-ofertas/'; }));
  const cf = $('#cmpo-form');
  if (cf) getOffers().then((all) => {
    const by = Object.fromEntries(all.map((o) => [o.i, o]));
    const label = (o) => `${o.sn} · ${o.d} · ${o.n} noches · ${o.p} · ${o.pr} €`;
    $('#cmpo-dl').innerHTML = all.slice(0, 1500).map((o) => `<option value="${esc(label(o))}">`).join('');
    const render = () => {
      const sel = store.get('mc_cmp_offers', []).map((i) => by[i]).filter(Boolean); const out = $('#cmpo-out');
      if (!sel.length) { out.innerHTML = '<p class="muted">Añade al menos una oferta.</p>'; return; }
      const best = (f, low = true) => { const v = sel.map(f); const t = low ? Math.min(...v) : Math.max(...v); return (o) => (sel.length > 1 && f(o) === t ? ' class="best"' : ''); };
      const rows = [['Barco', (o) => esc(o.sn)], ['Salida', (o) => `${new Date(o.d + 'T12:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })} desde ${esc(o.p)}`], ['Noches', (o) => o.n], ['Precio desde', (o) => eur(o.pr), best((o) => o.pr)], ['Precio real p.p.', (o) => eur(o.r), best((o) => o.r)], ['Real por noche', (o) => eur(Math.round(o.r / o.n)), best((o) => o.r / o.n)], ['Nota del precio', (o) => `<b class="scb ${o.sc >= 85 ? 'sc-a' : o.sc >= 70 ? 'sc-b' : o.sc >= 45 ? 'sc-c' : 'sc-e'}">${o.sc}</b>`, best((o) => o.sc, false)], ['Escalas', (o) => esc(o.pts.slice(1).join(', '))]];
      out.innerHTML = `<div class="table-wrap"><table class="cmp-t"><thead><tr><th></th>${sel.map((o) => `<th>${o.img ? `<img src="${esc(o.img)}" alt="" width="200" height="120" loading="lazy">` : ''}<a href="${BASE}salidas/${o.i}/">${esc(o.t)}</a></th>`).join('')}</tr></thead><tbody>${rows.map(([l, f, b]) => `<tr><th scope="row">${l}</th>${sel.map((o) => `<td${b ? b(o) : ''}>${f(o)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    };
    cf.addEventListener('submit', (e) => { e.preventDefault(); const o = all.find((x) => label(x) === cf.q.value); if (!o) return; const l = store.get('mc_cmp_offers', []).filter((x) => x !== o.i); l.unshift(o.i); store.set('mc_cmp_offers', l.slice(0, 3)); cf.reset(); render(); });
    $('.js-cmpo-clear').addEventListener('click', () => { store.set('mc_cmp_offers', []); render(); });
    render();
  });

  // Imagen de la oferta para compartir
  $$('.js-offer-img').forEach((b) => b.addEventListener('click', () => card((g) => {
    const d = b.dataset;
    g.fillStyle = '#fff'; g.font = 'bold 60px Georgia,serif'; wrap(g, d.t, 70, 230, 940, 70);
    g.fillStyle = '#cfe0f3'; g.font = '36px system-ui,sans-serif'; g.fillText(`${d.s} · ${d.d}`, 70, 420); g.fillText(`Salida desde ${d.p}`, 70, 470);
    g.fillStyle = '#fbbf24'; g.font = 'bold 120px system-ui,sans-serif'; g.fillText(`${(+d.pr).toLocaleString('es-ES')} €`, 70, 650);
    g.fillStyle = '#cfe0f3'; g.font = '32px system-ui,sans-serif'; g.fillText('por persona, desde', 70, 700);
    g.fillStyle = scColor(+d.sc); g.fillRect(70, 760, 200, 140); g.fillStyle = '#fff'; g.font = 'bold 80px system-ui,sans-serif'; g.fillText(d.sc, 100, 860);
    g.font = 'bold 40px system-ui,sans-serif'; g.fillText(d.l, 300, 830); g.font = '28px system-ui,sans-serif'; g.fillStyle = '#cfe0f3'; g.fillText('Nota del precio', 300, 875);
  }, 'oferta-crucero')));

  // Prerrellenar checklist y cuenta atrás desde una oferta
  setTimeout(() => {
    const ck = $('#chk-opts'); if (ck) { let any = false; for (const el of ck.elements) if (qs.get(el.name) === '1') { el.checked = true; any = true; } if (any) ck.dispatchEvent(new Event('change', { bubbles: true })); }
    const cd = $('#cd-form'); if (cd && qs.get('fecha')) { cd.ship.value = qs.get('barco') || ''; cd.date.value = qs.get('fecha'); if (cd.port) cd.port.value = qs.get('puerto') || ''; }
  }, 60);

  // Contacto (se guarda como mensaje para el panel)
  const ctf = $('#contact-form');
  if (ctf) ctf.addEventListener('submit', async (e) => {
    e.preventDefault(); const m = $('.form-msg', ctf); if (ctf.website.value) return;
    try { await api('/report', { body: { target: 'contacto:' + ctf.email.value.trim(), reason: `[${ctf.kind.value}] ${ctf.msg.value.trim()}`, page: location.pathname } }); m.textContent = '¡Gracias! Te responderemos por email.'; ctf.reset(); }
    catch { m.textContent = 'No se ha podido enviar. Inténtalo de nuevo en un rato.'; }
  });

  // Cruceros desde el puerto más cercano
  const PORTS_ES = [['barcelona', 'Barcelona', 41.37, 2.18], ['palma', 'Palma', 39.56, 2.63], ['valencia', 'Valencia', 39.45, -0.32], ['malaga', 'Málaga', 36.71, -4.42], ['alicante', 'Alicante', 38.34, -0.48], ['cadiz', 'Cádiz', 36.53, -6.29], ['tarragona', 'Tarragona', 41.1, 1.24], ['tenerife', 'Tenerife', 28.47, -16.24], ['gran-canaria', 'Gran Canaria', 28.14, -15.41]];
  $$('.js-near').forEach((b) => b.addEventListener('click', () => {
    const out = $('.near-out'); if (!navigator.geolocation) { out.textContent = 'Tu navegador no permite la ubicación.'; return; }
    out.textContent = 'Buscando…';
    navigator.geolocation.getCurrentPosition((p) => {
      const d = (a, c) => Math.hypot(a - p.coords.latitude, (c - p.coords.longitude) * Math.cos((a * Math.PI) / 180));
      const n = [...PORTS_ES].sort((x, y) => d(x[2], x[3]) - d(y[2], y[3]))[0]; location.href = `${BASE}ofertas/desde-${n[0]}/`;
    }, () => { out.textContent = 'No hemos podido saber tu ubicación. Elige tu puerto en los botones de arriba.'; }, { timeout: 8000, maximumAge: 3600000 });
  }));

  // Volver arriba, atajo "/" para buscar y sugerencia de email mal escrito
  const tt = $('.to-top');
  if (tt) { addEventListener('scroll', () => { tt.hidden = scrollY < 1200; }, { passive: true }); tt.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' })); }
  addEventListener('keydown', (e) => { if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement?.tagName || '')) { const i = $('#gq'); if (i) { e.preventDefault(); i.focus(); } } });
  const TYPO = { 'gmial.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.es': 'gmail.com', 'hotmal.com': 'hotmail.com', 'hotmail.co': 'hotmail.com', 'hotmial.com': 'hotmail.com', 'yahoo.co': 'yahoo.com', 'outlok.com': 'outlook.com', 'outlook.co': 'outlook.com', 'telefonica.es': 'telefonica.net' };
  document.addEventListener('blur', (e) => {
    const i = e.target; if (!(i instanceof HTMLInputElement) || i.type !== 'email' || !i.value.includes('@')) return;
    const [u, dom] = i.value.trim().split('@'); const fix = TYPO[dom?.toLowerCase()]; let h = i.parentElement.querySelector('.typo');
    if (fix) { if (!h) { h = document.createElement('button'); h.type = 'button'; h.className = 'typo link'; i.after(h); } h.textContent = `¿Querías decir ${u}@${fix}?`; h.onclick = () => { i.value = `${u}@${fix}`; h.remove(); }; } else if (h) h.remove();
  }, true);
})();
