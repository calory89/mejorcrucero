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
  // ---------- Ofertas: ordenar y filtrar el listado sin recargar ----------
  $$('.offer-filter').forEach((f) => {
    const g = $(f.dataset.target); if (!g) return;
    const cards = [...g.children];
    const apply = () => {
      const o = f.o.value, n = f.n.value, b = +(f.b?.value || 0), es = f.es?.value, mo = f.m?.value;
      const key = { score: (c) => -+c.dataset.score, price: (c) => +c.dataset.price, ppn: (c) => +c.dataset.ppn, date: (c) => c.dataset.date }[o];
      cards.sort((a, b) => { const x = key(a), y = key(b); return x < y ? -1 : x > y ? 1 : 0; });
      let shown = 0;
      cards.forEach((c) => { c.hidden = (n && c.dataset.n !== n) || (b && +c.dataset.price > b) || (es === '1' && c.dataset.es !== '1') || (mo && c.dataset.m !== mo); if (!c.hidden) shown++; g.appendChild(c); });
      let m = $('.offer-count', f); if (!m) { m = document.createElement('p'); m.className = 'offer-count muted small'; m.setAttribute('aria-live', 'polite'); f.appendChild(m); } m.textContent = `${shown} ofertas`;
    };
    f.addEventListener('input', apply);
  });
})();
