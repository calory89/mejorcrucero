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
  const eur = (n) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let shipsCache, configCache;
  const getShips = () => shipsCache || (shipsCache = fetch(BASE + 'data/ships.json').then((r) => r.json()));
  const getConfig = () => configCache || (configCache = fetch(BASE + 'data/config.json').then((r) => r.json()));
  const slugify = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  async function send(payload) {
    const cfg = await getConfig().catch(() => ({}));
    if (!cfg.formEndpoint) return false;
    const r = await fetch(cfg.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, page: location.pathname, ts: new Date().toISOString() }) });
    return r.ok;
  }

  // Vídeos YouTube (facade)
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.yt');
    if (!b || b.querySelector('iframe')) return;
    const f = document.createElement('iframe');
    f.src = `https://www.youtube-nocookie.com/embed/${b.dataset.id}?autoplay=1&rel=0`;
    f.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen';
    f.allowFullscreen = true;
    f.title = b.getAttribute('aria-label') || 'Vídeo';
    b.replaceChildren(f);
  });

  // Compartir
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('.js-share');
    if (!b) return;
    const data = { title: b.dataset.title, url: b.dataset.url };
    if (navigator.share) { try { await navigator.share(data); } catch {} }
    else { try { await navigator.clipboard.writeText(data.url); b.textContent = '¡Enlace copiado!'; } catch {} }
  });

  // Búsqueda del inicio: si coincide con un barco, ir directo a la ficha
  const hs = $('.search');
  if (hs) hs.addEventListener('submit', async (e) => {
    const v = $('#q', hs).value.trim();
    if (!v) return;
    const ships = await getShips().catch(() => []);
    const hit = ships.find((s) => s.name.toLowerCase() === v.toLowerCase());
    if (hit) { e.preventDefault(); location.href = `${BASE}barcos/${hit.slug}/`; }
  });

  // Formularios de email (newsletter / avisos)
  $$('form.lead').forEach((f) => f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = $('.form-msg', f);
    const email = f.email.value.trim();
    const list = store.get('mc_leads', []);
    list.push({ email, source: f.dataset.source, ts: Date.now() });
    store.set('mc_leads', list);
    let ok = false;
    try { ok = await send({ type: 'lead', email, source: f.dataset.source }); } catch {}
    msg.textContent = ok ? '¡Hecho! Revisa tu email.' : '¡Apuntado! Te escribiremos en cuanto lancemos los envíos.';
    f.reset();
  }));

  // Listado de barcos: filtros
  const filters = $('#filters');
  if (filters) {
    const grid = $('#ship-grid');
    const cards = $$('.ship-card', grid);
    if (qs.get('q')) filters.q.value = qs.get('q');
    if (qs.get('linea')) filters.line.value = qs.get('linea');
    const apply = () => {
      const q = filters.q.value.trim().toLowerCase();
      const line = filters.line.value, size = filters.size.value, sort = filters.sort.value;
      let n = 0;
      cards.forEach((c) => {
        const ok = (!q || c.dataset.name.includes(q)) && (!line || c.dataset.line === line) && (!size || c.dataset.size === size);
        c.hidden = !ok; if (ok) n++;
      });
      const key = { gt: (c) => -c.dataset.gt, year: (c) => -c.dataset.year * 1e6 - c.dataset.gt, ratio: (c) => -c.dataset.ratio, name: null }[sort];
      const sorted = [...cards].sort(key ? (a, b) => key(a) - key(b) : (a, b) => a.dataset.name.localeCompare(b.dataset.name));
      grid.append(...sorted);
      $('#count').textContent = `${n} barco${n === 1 ? '' : 's'}`;
      $('#empty').hidden = n > 0;
    };
    filters.addEventListener('input', apply);
    filters.addEventListener('submit', (e) => e.preventDefault());
    apply();
  }

  // Añadir a comparar
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.js-compare');
    if (!b) return;
    const list = store.get('mc_cmp', []).filter((x) => x !== b.dataset.slug);
    list.unshift(b.dataset.slug);
    store.set('mc_cmp', list.slice(0, 3));
    location.href = BASE + 'herramientas/comparar/';
  });

  // Comparador
  const cmp = $('#cmp-form');
  if (cmp) {
    const saved = store.get('mc_cmp', []);
    saved.forEach((s, i) => { if (cmp['s' + i]) cmp['s' + i].value = s; });
    const render = async () => {
      const ships = await getShips();
      const sel = [0, 1, 2].map((i) => cmp['s' + i].value).filter(Boolean).map((s) => ships.find((x) => x.slug === s)).filter(Boolean);
      store.set('mc_cmp', sel.map((s) => s.slug));
      const out = $('#cmp-out');
      if (!sel.length) { out.innerHTML = '<p class="muted">Elige al menos un barco.</p>'; return; }
      const rows = [
        ['Naviera', (s) => esc(s.lineShort)],
        ['Año', (s) => s.year, 'max'],
        ['Arqueo (GT)', (s) => s.gt.toLocaleString('es-ES'), 'max', (s) => s.gt],
        ['Pasajeros', (s) => s.pax ? s.pax.toLocaleString('es-ES') : '—'],
        ['Espacio por pasajero', (s) => s.ratio ? String(s.ratio).replace('.', ',') : '—', 'max', (s) => s.ratio || 0],
        ['Cargo servicio/noche (ref.)', (s) => s.tip ? s.tip.toString().replace('.', ',') + ' $' : 'Consultar'],
        ['Español a bordo (Med.)', (s) => s.es ? 'Sí' : 'Consultar'],
      ];
      out.innerHTML = `<table class="cmp-t"><thead><tr><th></th>${sel.map((s) => `<th><a href="${BASE}barcos/${s.slug}/">${esc(s.name)}</a></th>`).join('')}</tr></thead><tbody>${rows.map(([lbl, f, best, val]) => {
        const vals = sel.map((s) => (val ? val(s) : f(s)));
        const top = best ? Math.max(...vals.map(Number)) : null;
        return `<tr><th scope="row">${lbl}</th>${sel.map((s, i) => `<td class="${best && sel.length > 1 && Number(vals[i]) === top ? 'best' : ''}">${f(s)}</td>`).join('')}</tr>`;
      }).join('')}</tbody></table>`;
    };
    cmp.addEventListener('input', render);
    render();
  }

  // Calculadora del precio real
  const calc = $('#calc');
  if (calc) {
    const tipNote = $('#tip-note');
    const setTip = () => {
      const o = calc.line.selectedOptions[0];
      const t = o.dataset.tip;
      calc.tip.value = t || 0;
      tipNote.textContent = t ? `Referencia ${o.textContent}: ${t.replace('.', ',')} $ (mercado EE. UU.). Ajústalo si tu reserva dice otra cosa.` : `Sin referencia pública para ${o.textContent}: revisa tu reserva.`;
    };
    if (qs.get('linea')) calc.line.value = qs.get('linea');
    calc.line.addEventListener('change', () => { setTip(); run(); });
    const v = (n) => Math.max(0, parseFloat(calc[n].value) || 0);
    const run = () => {
      const nights = Math.max(1, v('nights')), people = Math.max(1, v('people'));
      const fare = v('fare');
      const tax = calc.taxes.checked ? 0 : v('taxAmt');
      const tips = v('tip') * nights * people;
      const drinks = v('drinks') * nights * people;
      const total = fare + tax + tips + drinks + v('wifi') + v('tours') + v('travel');
      $('#out-total').textContent = eur(total);
      $('#out-pp').textContent = `${eur(total / people)} por persona`;
      $('#out-ppn').textContent = `${eur(total / people / nights)} por persona y noche`;
      const extra = total - fare;
      $('#out-extra').textContent = fare ? `+${eur(extra)} sobre el precio anunciado (${Math.round((extra / fare) * 100)}% más)` : '';
    };
    calc.addEventListener('input', run);
    setTip(); run();
    $('.js-share-calc').addEventListener('click', async () => {
      const text = `Mi crucero de ${eur(v('fare'))} en realidad cuesta ${$('#out-total').textContent}. Calcula el tuyo:`;
      const url = location.origin + location.pathname;
      if (navigator.share) { try { await navigator.share({ title: 'Precio real de mi crucero', text, url }); } catch {} }
      else window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank', 'noopener');
    });
  }

  // Alerta de bajada de precio
  const af = $('#alert-form');
  if (af) {
    const listEl = $('#alert-list');
    if (qs.get('barco')) getShips().then((ss) => { const s = ss.find((x) => x.slug === qs.get('barco')); if (s) af.ship.value = s.name; });
    const render = () => {
      const items = store.get('mc_alerts', []);
      if (!items.length) { listEl.innerHTML = '<p class="muted">Todavía no has guardado ninguno.</p>'; return; }
      listEl.innerHTML = items.map((it, i) => `<div class="alert-item"><div class="row"><b>${esc(it.ship)}</b><span class="muted small">${esc(it.date)} · ${esc(it.cabin)}</span></div>
      <div class="row"><span>Pagaste <b>${eur(it.price)}</b>${it.where ? ' en ' + esc(it.where) : ''}</span>${it.now ? `<span class="${it.now < it.price ? 'extra' : 'muted'}">Ahora: ${eur(it.now)}${it.now < it.price ? ` · ¡${eur(it.price - it.now)} menos!` : ''}</span>` : ''}</div>
      <div class="row"><label class="small">Precio que ves hoy (€) <input type="number" min="1" data-now="${i}" value="${it.now || ''}" style="width:130px"></label>
      <span><a class="btn btn-sm btn-ghost" href="${BASE}barcos/${slugify(it.ship)}/#reservar">Comprobar precio</a> <button class="btn btn-sm btn-ghost" type="button" data-del="${i}">Quitar</button></span></div></div>`).join('');
    };
    listEl.addEventListener('change', (e) => {
      const i = e.target.dataset.now; if (i == null) return;
      const items = store.get('mc_alerts', []); items[i].now = parseFloat(e.target.value) || null; store.set('mc_alerts', items); setTimeout(render);
    });
    listEl.addEventListener('click', (e) => {
      const i = e.target.dataset.del; if (i == null) return;
      const items = store.get('mc_alerts', []); items.splice(i, 1); store.set('mc_alerts', items); render();
    });
    af.addEventListener('submit', async (e) => {
      e.preventDefault();
      const it = { ship: af.ship.value.trim(), date: af.date.value, cabin: af.cabin.value, price: parseFloat(af.price.value), where: af.where.value.trim(), email: af.email.value.trim() };
      const items = store.get('mc_alerts', []); items.unshift(it); store.set('mc_alerts', items);
      let ok = false;
      if (it.email) { try { ok = await send({ type: 'price_alert', ...it }); } catch {} }
      $('.form-msg', af).textContent = ok ? 'Guardado. Te avisaremos por email si detectamos una bajada.' : 'Guardado en este dispositivo. Vuelve cuando quieras y apunta el precio que ves hoy para comparar.';
      af.reset(); render();
    });
    render();
  }

  // Test: ¿qué crucero es para mí?
  const quiz = $('#quiz');
  if (quiz) quiz.addEventListener('submit', async (e) => {
    e.preventDefault();
    const a = Object.fromEntries(new FormData(quiz));
    const ships = await getShips();
    const scored = ships.map((s) => {
      let p = 0;
      if (a.es === 'yes') p += s.es ? 6 : -4;
      if (a.size === 'giant') p += s.gt >= 200000 ? 5 : s.gt >= 170000 ? 2 : -1;
      if (a.size === 'mid') p += s.gt < 170000 ? 4 : -2;
      if (a.new === 'yes') p += (s.year - 2015) / 2;
      if (a.new === 'no') p += s.year < 2019 ? 2 : 0;
      if (a.who === 'family') p += ['royal-caribbean', 'disney', 'msc', 'carnival'].includes(s.lineSlug) ? 3 : 0;
      if (a.who === 'couple' || a.who === 'senior') p += ['celebrity', 'princess', 'cunard'].includes(s.lineSlug) ? 3 : 0;
      if (a.who === 'senior') p += (s.ratio || 0) > 40 ? 2 : 0;
      if (a.who === 'friends') p += ['norwegian', 'carnival', 'royal-caribbean', 'msc'].includes(s.lineSlug) ? 2 : 0;
      if (['aida', 'tui-cruises', 'po-cruises', 'dream-cruises', 'aroya'].includes(s.lineSlug)) p -= 5; // orientadas a otros mercados
      return { s, p };
    }).sort((x, y) => y.p - x.p).slice(0, 6);
    $('#quiz-out').innerHTML = `<h2 style="grid-column:1/-1">Tus barcos recomendados</h2>` + scored.map(({ s }) => `<a class="card" href="${BASE}barcos/${s.slug}/"><div class="card-body"><span class="eyebrow">${esc(s.lineShort)}</span><h3>${esc(s.name)}</h3><ul class="facts"><li><b>${s.year}</b> año</li><li><b>${s.pax ? s.pax.toLocaleString('es-ES') : '—'}</b> pasajeros</li><li><b>${s.ratio ? String(s.ratio).replace('.', ',') : '—'}</b> espacio</li></ul></div></a>`).join('');
    $('#quiz-out').scrollIntoView({ behavior: 'smooth' });
  });

  // Grupo de salida
  const rcTitle = $('#rc-title');
  if (rcTitle) {
    const names = JSON.parse($('#ships-min').textContent);
    const b = qs.get('b'), f = qs.get('f');
    const mount = $('.giscus-mount');
    if (b && names[b] && /^\d{4}-\d{2}-\d{2}$/.test(f || '')) {
      const d = new Date(f + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
      rcTitle.textContent = `${names[b]} · salida del ${d}`;
      document.title = `${names[b]} · ${d} | Grupo de salida | MejorCrucero`;
      $('#rc-sub').textContent = 'Preséntate, comparte excursiones y resuelve dudas con quienes navegan contigo.';
      const url = location.href;
      $('#rc-links').innerHTML = `<div class="share"><a class="btn btn-wa" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(`¿Vas en el ${names[b]} el ${d}? Únete a nuestro grupo: ${url}`)}">Invitar por WhatsApp</a><a class="btn btn-ghost" href="${BASE}barcos/${b}/">Ficha del barco</a></div>`;
      mount.dataset.term = `salida:${b}:${f}`;
    } else {
      rcTitle.textContent = 'Elige tu barco y fecha';
      $('#rc-sub').innerHTML = `Vuelve a <a href="${BASE}comunidad/">la comunidad</a> y elige tu salida.`;
      mount.dataset.enabled = '0';
    }
  }

  // Foro (Giscus) — solo si está activado; carga diferida al acercarse
  $$('.giscus-mount').forEach((m) => {
    if (m.dataset.enabled !== '1') return;
    const load = () => {
      const s = document.createElement('script');
      s.src = 'https://giscus.app/client.js';
      Object.entries({ repo: m.dataset.repo, 'repo-id': m.dataset.repoId, category: m.dataset.category, 'category-id': m.dataset.categoryId, mapping: 'specific', term: m.dataset.term, strict: '1', 'reactions-enabled': '1', 'emit-metadata': '0', 'input-position': 'top', theme: 'preferred_color_scheme', lang: 'es', loading: 'lazy' }).forEach(([k, v]) => s.setAttribute('data-' + k, v));
      s.crossOrigin = 'anonymous'; s.async = true;
      m.replaceChildren(s);
    };
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { io.disconnect(); load(); } }, { rootMargin: '400px' });
      io.observe(m);
    } else load();
  });
})();
