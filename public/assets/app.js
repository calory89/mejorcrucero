(() => {
  'use strict';
  const BASE = document.body.dataset.base || '/';
  const PAGE = document.body.dataset.page || location.pathname;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const qs = new URLSearchParams(location.search);
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };
  const eur = (n) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const slugify = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const dec = (r) => (r == null ? '—' : String(r).replace('.', ','));
  const num = (n) => (n == null ? '—' : Number(n).toLocaleString('es-ES'));
  const memo = {};
  const getJson = (f) => memo[f] || (memo[f] = fetch(BASE + 'data/' + f).then((r) => r.json()));
  const getShips = () => getJson('ships.json');
  const getConfig = () => getJson('config.json').catch(() => ({}));
  const uid = () => { let id = store.get('mc_uid'); if (!id) { id = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 24); store.set('mc_uid', id); } return id; };
  const me = () => store.get('mc_me', {});

  async function api(path, opts = {}) {
    const cfg = await getConfig();
    if (!cfg.api) throw new Error('noapi');
    const r = await fetch(cfg.api.replace(/\/$/, '') + path, { method: opts.body ? 'POST' : 'GET', headers: opts.body ? { 'Content-Type': 'application/json' } : {}, body: opts.body ? JSON.stringify(opts.body) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(j.error || 'error'), { data: j });
    return j;
  }
  const hasApi = async () => !!(await getConfig()).api;
  const track = (name, target = '', variant = '') => api('/evt', { body: { name, page: PAGE, target, variant } }).catch(() => {});

  // ---------- Tema claro / oscuro ----------
  $$('.js-theme').forEach((b) => b.addEventListener('click', () => {
    const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('mc_theme', next); } catch {}
  }));

  // ---------- Service worker (PWA) ----------
  if ('serviceWorker' in navigator && location.protocol === 'https:') addEventListener('load', () => navigator.serviceWorker.register(BASE + 'sw.js').catch(() => {}));

  // ---------- Autocompletar global ----------
  const gq = $('#gq'), gl = $('#gq-list');
  if (gq) {
    let idx = [], active = -1;
    const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const loadIdx = () => (idx.length ? Promise.resolve() : getJson('index.json').then((d) => { idx = d.map((x) => [...x, norm(x[0])]); }));
    gq.addEventListener('focus', loadIdx, { once: true });
    const render = async () => {
      await loadIdx();
      const q = norm(gq.value.trim());
      if (q.length < 2) { gl.hidden = true; return; }
      const hits = idx.filter((x) => x[3].includes(q)).sort((a, b) => a[3].indexOf(q) - b[3].indexOf(q)).slice(0, 8);
      active = -1;
      gl.innerHTML = hits.map((h, i) => `<li role="option" id="ac-${i}"><a href="${BASE}${h[1].slice(1)}"><b>${esc(h[0])}</b><span>${esc(h[2])}</span></a></li>`).join('') || '<li class="muted">Sin resultados: pulsa Intro para buscar</li>';
      gl.hidden = false;
    };
    gq.addEventListener('input', render);
    gq.addEventListener('keydown', (e) => {
      const items = $$('li[role=option]', gl);
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && items.length) { e.preventDefault(); active = (active + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; items.forEach((li, i) => li.classList.toggle('on', i === active)); gq.setAttribute('aria-activedescendant', 'ac-' + active); }
      if (e.key === 'Enter' && active >= 0 && items[active]) { e.preventDefault(); location.href = $('a', items[active]).href; }
      if (e.key === 'Escape') gl.hidden = true;
    });
    document.addEventListener('click', (e) => { if (!e.target.closest('.gsearch')) gl.hidden = true; });
  }

  // ---------- Vídeos (facade) ----------
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.yt');
    if (!b || b.querySelector('iframe')) return;
    const f = document.createElement('iframe');
    f.src = `https://www.youtube-nocookie.com/embed/${b.dataset.id}?autoplay=1&rel=0`;
    f.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen';
    f.allowFullscreen = true;
    f.title = b.getAttribute('aria-label') || 'Vídeo';
    b.replaceChildren(f);
    track('video_play', b.dataset.id);
  });

  // ---------- Compartir, copiar, imprimir ----------
  document.addEventListener('click', async (e) => {
    const s = e.target.closest('.js-share');
    if (s) {
      const data = { title: s.dataset.title, url: s.dataset.url };
      if (navigator.share) { try { await navigator.share(data); } catch {} } else { try { await navigator.clipboard.writeText(data.url); s.textContent = '¡Enlace copiado!'; } catch {} }
      track('share', data.url);
    }
    const c = e.target.closest('.js-copy');
    if (c) { const t = $(c.dataset.copy); try { await navigator.clipboard.writeText(t.value || t.textContent); c.textContent = '¡Copiado!'; } catch { t.select?.(); } }
    if (e.target.closest('.js-print')) print();
  });

  // ---------- Clics a afiliados y A/B ----------
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-aff]');
    if (a) track('aff_click', a.dataset.aff + ' ' + (a.dataset.page || PAGE));
  });
  getConfig().then((cfg) => {
    $$('.js-ab').forEach((el) => {
      const key = el.dataset.ab, vars = cfg.ab?.[key];
      if (!vars) return;
      const ab = store.get('mc_ab', {});
      if (ab[key] == null) { ab[key] = Math.floor(Math.random() * vars.length); store.set('mc_ab', ab); }
      el.textContent = vars[ab[key]];
      track('ab_view', key, String(ab[key]));
      el.addEventListener('click', () => track('ab_click', key, String(ab[key])));
    });
  });

  // ---------- Favoritos, vistos recientemente, comparador ----------
  const favs = () => store.get('mc_favs', []);
  const syncFavs = () => $$('[data-fav]').forEach((b) => { const on = favs().includes(b.dataset.fav); b.setAttribute('aria-pressed', on); b.classList.toggle('on', on); });
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-fav]');
    if (!b) return;
    e.preventDefault();
    const f = favs(), s = b.dataset.fav;
    store.set('mc_favs', f.includes(s) ? f.filter((x) => x !== s) : [s, ...f].slice(0, 50));
    syncFavs(); b.classList.add('pop'); setTimeout(() => b.classList.remove('pop'), 300);
  });
  syncFavs();
  const shipEl = $('article.ship');
  if (shipEl) store.set('mc_recent', [shipEl.dataset.ship, ...store.get('mc_recent', []).filter((x) => x !== shipEl.dataset.ship)].slice(0, 12));

  const cmpBar = $('.cmp-bar');
  const renderCmpBar = async () => {
    const list = store.get('mc_cmp', []);
    $$('[data-cmp]').forEach((b) => b.classList.toggle('on', list.includes(b.dataset.cmp)));
    if (!cmpBar || !list.length || PAGE.includes('/herramientas/comparar/')) { if (cmpBar) cmpBar.hidden = true; return; }
    const ships = await getShips();
    $('.cmp-bar-list', cmpBar).textContent = list.map((s) => ships.find((x) => x.slug === s)?.name || s).join(' · ');
    cmpBar.hidden = false;
  };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cmp]');
    if (b) { e.preventDefault(); const l = store.get('mc_cmp', []).filter((x) => x !== b.dataset.cmp); l.unshift(b.dataset.cmp); store.set('mc_cmp', l.slice(0, 3)); renderCmpBar(); }
    if (e.target.closest('.js-cmp-clear')) { store.set('mc_cmp', []); renderCmpBar(); }
  });
  renderCmpBar();

  const miniCard = (s) => `<a class="card mini-card" href="${BASE}barcos/${s.slug}/">${s.img ? `<img src="${esc(s.img)}" alt="" loading="lazy" width="320" height="200">` : ''}<div class="card-body"><span class="eyebrow">${esc(s.lineShort)}</span><h3>${esc(s.name)}</h3><ul class="facts"><li><b>${s.year}</b> año</li><li><b>${num(s.pax)}</b> pasajeros</li><li><b>${dec(s.ratio)}</b> espacio</li></ul></div></a>`;
  const fillShips = async (el, slugs) => { if (!el || !slugs.length) return; const ships = await getShips(); el.innerHTML = slugs.map((s) => ships.find((x) => x.slug === s)).filter(Boolean).map(miniCard).join(''); };
  const mine = $('section.mine');
  if (mine) { const sl = [...new Set([...favs(), ...store.get('mc_recent', [])])].slice(0, 4); if (sl.length) { mine.hidden = false; fillShips($('.mine-grid', mine), sl); } }
  fillShips($('#my-favs'), favs());
  fillShips($('#my-recent'), store.get('mc_recent', []));

  // ---------- Formularios de email ----------
  $$('form.lead').forEach((f) => f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = $('.form-msg', f);
    const email = f.email.value.trim();
    const extra = f.channel ? { channel: f.channel.value } : {};
    let ok = false;
    try {
      if (f.dataset.source === 'creadores') ok = !!(await api('/alert', { body: { kind: 'creator', email, website: f.website?.value, ...extra } }));
      else ok = !!(await api('/lead', { body: { email, source: f.dataset.source, website: f.website?.value } }));
    } catch { const l = store.get('mc_leads', []); l.push({ email, source: f.dataset.source, ...extra }); store.set('mc_leads', l); }
    msg.textContent = ok ? '¡Hecho! Te escribiremos pronto.' : '¡Apuntado! Te escribiremos en cuanto lancemos los envíos.';
    f.reset();
    const em = $('#exit-modal'); if (em?.open) setTimeout(() => em.close(), 1200);
  }));
  $$('form.follow').forEach((f) => f.addEventListener('submit', async (e) => {
    e.preventDefault();
    let ok = false;
    try { ok = !!(await api('/follow', { body: { email: f.email.value.trim(), thread: f.dataset.thread } })); } catch {}
    $('.form-msg', f).textContent = ok ? 'Listo: te avisaremos de las ofertas de este barco.' : 'Apuntado. Te avisaremos en cuanto activemos los avisos.';
    f.reset();
  }));
  $$('form.alert-crit').forEach((f) => f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const crit = f.id === 'crit-form' ? Object.fromEntries(new URLSearchParams(location.search)) : { destino: f.dataset.dest, mes: f.mes?.value, max: f.max?.value };
    let ok = false;
    try { ok = !!(await api('/alert', { body: { kind: 'criteria', email: f.email.value.trim(), website: f.website?.value, ...crit } })); } catch {}
    const l = store.get('mc_crit', []); l.push(crit); store.set('mc_crit', l);
    $('.form-msg', f).textContent = ok ? 'Alerta creada: te escribiremos cuando haya cruceros así.' : 'Alerta guardada. Te escribiremos en cuanto activemos los avisos por email.';
    f.reset();
  }));

  // ---------- Reportar error ----------
  const rep = $('#report-modal');
  let repTarget = '';
  document.addEventListener('click', (e) => { const b = e.target.closest('.js-report'); if (!b) return; e.preventDefault(); repTarget = b.dataset.target; rep?.showModal(); });
  $('.report-form', rep || document)?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    let ok = false;
    try { ok = !!(await api('/report', { body: { target: repTarget, reason: f.reason.value, page: PAGE } })); } catch {}
    if (!ok) { const r = store.get('mc_reports', []); r.push({ target: repTarget, reason: f.reason.value, page: PAGE }); store.set('mc_reports', r); }
    $('.form-msg', f).textContent = '¡Gracias! Lo revisamos.'; f.reset(); setTimeout(() => rep.close(), 1200);
  });

  // ---------- Aviso al salir (una vez por semana, solo escritorio) ----------
  const exitM = $('#exit-modal');
  if (exitM && matchMedia('(pointer:fine)').matches && !PAGE.includes('/herramientas/alerta-precio/')) {
    const last = store.get('mc_exit', 0);
    if (Date.now() - last > 7 * 864e5) {
      const h = (e) => { if (e.clientY <= 0 && !e.relatedTarget && performance.now() > 15000) { document.removeEventListener('mouseout', h); store.set('mc_exit', Date.now()); exitM.showModal(); track('exit_intent'); } };
      document.addEventListener('mouseout', h);
    }
  }

  // ---------- Listado de barcos: filtros en la URL y paginación (datos de ships.json) ----------
  const filters = $('#filters');
  const fullCard = (s) => `<article class="card ship-card"><a class="card-link" href="${BASE}barcos/${s.slug}/"><div class="ship-art${s.img ? ' has-photo' : ''}" style="--c:${s.color}">${s.img ? `<img src="${esc(s.img)}" alt="${esc(s.name)} navegando" loading="lazy" decoding="async" width="640" height="400" class="ship-photo">` : `<svg viewBox="0 0 340 130" width="300" aria-hidden="true"><path d="M60 78h220v8H60zM80 64h180v10H80zM100 50h140v10H100z" fill="#fff"/><rect x="160" y="36" width="24" height="12" rx="3" fill="${s.color}"/><path d="M8 86H332L304 112H34Z" fill="${s.color}"/></svg>`}${s.v ? '<span class="pill pill-video">▶ Vídeos</span>' : ''}</div><div class="card-body"><span class="eyebrow">${esc(s.lineShort)}</span><h3>${esc(s.name)}</h3><ul class="facts"><li><b>${s.year}</b> año</li><li><b>${num(s.pax)}</b> pasajeros</li><li><b>${dec(s.ratio)}</b> espacio</li></ul></div></a><button class="fav" type="button" data-fav="${s.slug}" aria-label="Guardar ${esc(s.name)} en favoritos" aria-pressed="false"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.4C.9 8.1 3.2 4.5 6.8 4.5c2 0 3.5 1.1 4.2 2.4h2c.7-1.3 2.2-2.4 4.2-2.4 3.6 0 5.9 3.6 4.4 7.1C19.5 16.4 12 21 12 21Z" fill="currentColor"/></svg></button><button class="cmp-add" type="button" data-cmp="${s.slug}">+ Comparar<span class="sr"> ${esc(s.name)}</span></button></article>`;
  if (filters) {
    const grid = $('#ship-grid'), more = $('#more');
    const PER = 24; let shown = PER, touched = false;
    for (const [k, v] of qs) if (filters[k]) { filters[k].value = v; touched = true; }
    const apply = async (resetPage = true) => {
      if (resetPage) shown = PER;
      const ships = await getShips();
      const q = filters.q.value.trim().toLowerCase(), line = filters.linea.value, size = filters.tam.value, tier = filters.gama.value, sort = filters.orden.value;
      const ok = ships.filter((s) => (!q || s.name.toLowerCase().includes(q)) && (!line || s.lineSlug === line) && (!size || s.size === size) && (!tier || s.tier === tier));
      const key = { gt: (s) => -s.gt, year: (s) => -s.year * 1e6 - s.gt, ratio: (s) => -(s.ratio || 0), name: null }[sort];
      ok.sort(key ? (x, y) => key(x) - key(y) : (x, y) => x.name.localeCompare(y.name));
      grid.innerHTML = ok.slice(0, shown).map(fullCard).join('');
      $('#count').textContent = `${ok.length} barco${ok.length === 1 ? '' : 's'}`;
      $('#empty').hidden = ok.length > 0;
      more.hidden = ok.length <= shown;
      syncFavs(); renderCmpBar();
      const p = new URLSearchParams();
      for (const el of filters.elements) if (el.name && el.value && !(el.name === 'orden' && el.value === 'gt')) p.set(el.name, el.value);
      history.replaceState(null, '', p.toString() ? '?' + p : location.pathname);
    };
    filters.addEventListener('input', () => apply());
    filters.addEventListener('submit', (e) => e.preventDefault());
    more.addEventListener('click', () => { shown += PER; apply(false); });
    if (touched) apply();
  }

  // ---------- Tablas ordenables ----------
  $$('table.sortable').forEach((t) => $$('.th-sort', t).forEach((b, col) => b.addEventListener('click', () => {
    const rows = $$('tbody tr', t), dir = b.dataset.dir === 'asc' ? -1 : 1;
    b.dataset.dir = dir === 1 ? 'asc' : 'desc';
    rows.sort((x, y) => { const a = x.cells[col], c = y.cells[col]; const va = a.dataset.v ?? a.textContent, vc = c.dataset.v ?? c.textContent; return (isNaN(va) ? va.localeCompare(vc) : va - vc) * dir; });
    $('tbody', t).append(...rows);
  })));

  // ---------- Buscador de cruceros ----------
  const sform = $('#sform');
  if (sform) {
    for (const [k, v] of qs) if (sform[k]) sform[k].value = v;
    const meta = JSON.parse($('#search-meta').textContent);
    const run = async () => {
      const p = new URLSearchParams();
      for (const el of sform.elements) if (el.name && el.value) p.set(el.name, el.value);
      history.replaceState(null, '', p.toString() ? '?' + p : location.pathname);
      const [sails, ships] = await Promise.all([getJson('sailings.json'), getShips()]);
      const v = Object.fromEntries(p);
      const [nmin, nmax] = (v.noches || '0-999').split('-').map(Number);
      const q = (v.q || '').toLowerCase();
      const res = sails.filter((x) => {
        const s = ships.find((y) => y.slug === x.ship) || {};
        const min = Math.min(...Object.entries(x.prices || {}).filter(([k, val]) => val && (!v.cabina || k === v.cabina)).map(([, val]) => val));
        if (!isFinite(min)) return false;
        x._min = min; x._ppn = min / x.nights; x._s = s;
        return (!v.destino || x.destination === v.destino) && (!v.mes || new Date(x.date).getMonth() + 1 === +v.mes) && (!v.puerto || x.depart_port_slug === v.puerto) && x.nights >= nmin && x.nights <= nmax && (!v.max || min <= +v.max)
          && (!v.perfil || (v.perfil === 'adultos' ? x.adults_only : !x.adults_only)) && (!q || `${s.name} ${s.lineShort} ${x.itinerary?.name} ${x.depart_port}`.toLowerCase().includes(q));
      }).sort(v.orden === 'precio' ? (a, b) => a._min - b._min : v.orden === 'fecha' ? (a, b) => a.date.localeCompare(b.date) : (a, b) => a._ppn - b._ppn);
      $('#s-count').textContent = sails.length ? `${res.length} salida${res.length === 1 ? '' : 's'}` : '';
      $('#s-results').innerHTML = res.slice(0, 60).map((x) => `<a class="card sail-card" href="${BASE}salidas/${x.id}/"><div class="card-body"><span class="eyebrow">${esc(x._s.lineShort || '')} · ${esc(x._s.name || x.ship)}</span><h3>${esc(x.itinerary?.name || 'Crucero')}</h3><p class="muted small">${new Date(x.date + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })} · ${x.nights} noches · desde ${esc(x.depart_port)}</p><p class="price">desde <b>${eur(x._min)}</b> <span class="muted small">(${eur(x._ppn)}/noche)</span></p></div></a>`).join('');
      const empty = !res.length;
      $('#s-empty').hidden = !empty;
      if (empty) {
        const dests = meta.dest.filter((d) => (!v.destino || d.slug === v.destino) && (!v.mes || d.months.includes(+v.mes)));
        const sh = ships.filter((s) => !q || `${s.name} ${s.lineShort}`.toLowerCase().includes(q)).sort((a, b) => b.year - a.year).slice(0, 8);
        const port = meta.ports.find((x) => x.slug === v.puerto);
        $('#s-alt').innerHTML = `${dests.length ? `<h2>Destinos que encajan</h2><div class="dest-grid">${dests.map((d) => `<a class="dest" href="${BASE}destinos/${d.slug}/"><span class="dest-e">${d.emoji}</span><b>${esc(d.name)}</b></a>`).join('')}</div>` : ''}${port ? `<p><a class="btn btn-ghost" href="${BASE}puertos/${port.slug}/">Guía del puerto de ${esc(port.name)} →</a></p>` : ''}<h2>Barcos ${q ? 'que coinciden' : 'más nuevos'}</h2><div class="grid">${sh.map(miniCard).join('')}</div>`;
      }
    };
    sform.addEventListener('input', run);
    sform.addEventListener('submit', (e) => { e.preventDefault(); run(); });
    run();
  }

  // ---------- Comparador de barcos ----------
  const cmp = $('#cmp-form');
  if (cmp) {
    store.get('mc_cmp', []).forEach((s, i) => { if (cmp['s' + i]) cmp['s' + i].value = s; });
    const render = async () => {
      const ships = await getShips();
      const sel = [0, 1, 2].map((i) => cmp['s' + i].value).filter(Boolean).map((s) => ships.find((x) => x.slug === s)).filter(Boolean);
      store.set('mc_cmp', sel.map((s) => s.slug));
      const out = $('#cmp-out');
      if (!sel.length) { out.innerHTML = '<p class="muted">Elige al menos un barco.</p>'; return; }
      const rows = [
        ['Naviera', (s) => esc(s.lineShort)],
        ['Gama', (s) => ({ estandar: 'Precio medio', premium: 'Premium', lujo: 'Lujo' }[s.tier])],
        ['Año', (s) => s.year, (s) => s.year],
        ['Arqueo (GT)', (s) => num(s.gt), (s) => s.gt],
        ['Pasajeros', (s) => num(s.pax)],
        ['Espacio por pasajero', (s) => dec(s.ratio), (s) => s.ratio || 0],
        ['Vídeos', (s) => s.v || '—'],
        ['Cargo servicio/noche (ref.)', (s) => (s.tip ? String(s.tip).replace('.', ',') + ' $' : 'Consultar')],
        ['Español a bordo (Med.)', (s) => (s.es ? 'Sí' : 'Consultar')],
      ];
      out.innerHTML = `<div class="table-wrap"><table class="cmp-t"><thead><tr><th></th>${sel.map((s) => `<th>${s.img ? `<img src="${esc(s.img)}" alt="" width="200" height="120" loading="lazy">` : ''}<a href="${BASE}barcos/${s.slug}/">${esc(s.name)}</a></th>`).join('')}</tr></thead><tbody>${rows.map(([lbl, f, val]) => {
        const vals = val ? sel.map(val) : [];
        const top = val ? Math.max(...vals) : null;
        return `<tr><th scope="row">${lbl}</th>${sel.map((s, i) => `<td class="${val && sel.length > 1 && vals[i] === top ? 'best' : ''}">${f(s)}</td>`).join('')}</tr>`;
      }).join('')}</tbody></table></div>`;
    };
    cmp.addEventListener('input', render);
    render();
  }

  // ---------- Comparar salidas ----------
  const cmps = $('#cmps-form');
  if (cmps) {
    const render = async () => {
      const [sails, ships] = await Promise.all([getJson('sailings.json'), getShips()]);
      const sel = [cmps.x0.value, cmps.x1.value].map((id) => sails.find((x) => x.id === id)).filter(Boolean);
      const minp = (x) => Math.min(...Object.values(x.prices || {}).filter(Boolean));
      if (!sel.length) { $('#cmps-out').innerHTML = ''; return; }
      const best = Math.min(...sel.map((x) => minp(x) / x.nights));
      $('#cmps-out').innerHTML = `<div class="table-wrap"><table class="cmp-t"><tbody>${[['Barco', (x) => esc(ships.find((s) => s.slug === x.ship)?.name || x.ship)], ['Itinerario', (x) => esc(x.itinerary?.name || '')], ['Fecha', (x) => x.date], ['Noches', (x) => x.nights], ['Salida', (x) => esc(x.depart_port)], ['Desde', (x) => eur(minp(x))], ['Por noche', (x) => `<span class="${minp(x) / x.nights === best && sel.length > 1 ? 'best' : ''}">${eur(minp(x) / x.nights)}</span>`]].map(([l, f]) => `<tr><th scope="row">${l}</th>${sel.map((x) => `<td>${f(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    };
    cmps.addEventListener('input', render);
  }

  // ---------- Calculadora del precio real ----------
  const calc = $('#calc');
  if (calc) {
    let fx = null, last = null;
    const v = (n) => Math.max(0, parseFloat(calc[n]?.value) || 0);
    const setTip = (n) => {
      const o = calc['line_' + n].selectedOptions[0];
      const t = o.dataset.tip;
      calc['tip_' + n].value = t || 0;
      calc['tipcur_' + n].value = 'USD';
      $(`[data-offer="${n}"] .tip-note`).textContent = t ? `Referencia ${o.textContent}: ${t.replace('.', ',')} $ (mercado EE. UU.). Ajústalo si tu reserva dice otra cosa.` : `Sin referencia pública para ${o.textContent}: revisa tu reserva.`;
    };
    const offer = (n, people, shared) => {
      const fare = v('fare_' + n); if (!fare) return null;
      const nights = Math.max(1, v('nights_' + n));
      const rate = calc['tipcur_' + n].value === 'USD' && fx ? fx.usdEur : 1;
      const tips = v('tip_' + n) * rate * nights * people;
      const drinks = v('drinks_' + n) * nights * people;
      const tax = calc['taxes_' + n].checked ? 0 : v('taxAmt_' + n);
      const total = fare + tips + drinks + tax + shared;
      return { fare, nights, total, extra: total - fare };
    };
    const run = () => {
      const people = Math.max(1, v('people'));
      const shared = ['wifi', 'tours', 'travel', 'hotel', 'parking', 'insurance'].reduce((t, k) => t + v(k), 0);
      const a = offer('a', people, shared), b = offer('b', people, shared);
      if (!a) return;
      last = { a, people };
      $('#out-total').textContent = eur(a.total);
      $('#out-pp').textContent = `${eur(a.total / people)} por persona`;
      $('#out-ppn').textContent = `${eur(a.total / people / a.nights)} por persona y noche`;
      $('#out-extra').textContent = `+${eur(a.extra)} sobre el precio anunciado (${Math.round((a.extra / a.fare) * 100)}% más)`;
      $('#out-b').hidden = !b;
      if (b) {
        $('#out-total-b').textContent = eur(b.total);
        $('#out-ppn-b').textContent = `${eur(b.total / people / b.nights)} por persona y noche`;
        const pa = a.total / a.nights, pb = b.total / b.nights;
        $('#out-win').textContent = Math.round(pa) === Math.round(pb) ? 'Empate por noche.' : `Sale más barata por noche la oferta ${pa < pb ? 'A' : 'B'} (${eur(Math.abs(pa - pb) / people)} menos por persona y noche).`;
      }
    };
    if (qs.get('linea')) calc.line_a.value = qs.get('linea');
    ['a', 'b'].forEach((n) => calc['line_' + n].addEventListener('change', () => { setTip(n); run(); }));
    setTip('a'); setTip('b');
    if (qs.get('precio')) calc.fare_a.value = qs.get('precio');
    if (qs.get('noches')) calc.nights_a.value = qs.get('noches');
    calc.addEventListener('input', run);
    run();
    getConfig().then((c) => { fx = c.fx; $('#fx-note').textContent = fx ? `Cambio aplicado: 1 $ = ${fx.usdEur.toFixed(4).replace('.', ',')} € (${fx.source}, ${fx.date}).` : 'Sin tipo de cambio disponible: los cargos en dólares se suman 1:1.'; run(); });
    $('.js-share-calc').addEventListener('click', async () => {
      const text = `Mi crucero de ${eur(last.a.fare)} en realidad cuesta ${eur(last.a.total)}. Calcula el tuyo:`;
      const url = location.origin + location.pathname;
      if (navigator.share) { try { await navigator.share({ title: 'Precio real de mi crucero', text, url }); } catch {} } else window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank', 'noopener');
      track('share_calc');
    });
    $('.js-card-calc').addEventListener('click', () => {
      const c = document.createElement('canvas'); c.width = 1080; c.height = 1080;
      const x = c.getContext('2d');
      const g = x.createLinearGradient(0, 0, 0, 1080); g.addColorStop(0, '#0b2540'); g.addColorStop(1, '#0f766e');
      x.fillStyle = g; x.fillRect(0, 0, 1080, 1080);
      x.fillStyle = '#fff'; x.font = 'bold 54px Georgia, serif'; x.fillText('El precio real de mi crucero', 80, 170);
      x.font = '40px system-ui, sans-serif'; x.fillStyle = '#cfe0f3'; x.fillText(`Anunciado: ${eur(last.a.fare)}`, 80, 300);
      x.font = 'bold 130px Georgia, serif'; x.fillStyle = '#fff'; x.fillText(eur(last.a.total), 80, 470);
      x.font = 'bold 44px system-ui, sans-serif'; x.fillStyle = '#fbbf24'; x.fillText(`+${Math.round((last.a.extra / last.a.fare) * 100)}% sobre el precio de portada`, 80, 570);
      x.font = '40px system-ui, sans-serif'; x.fillStyle = '#cfe0f3'; x.fillText(`${eur(last.a.total / last.people / last.a.nights)} por persona y noche`, 80, 650);
      x.fillStyle = '#c93b1f'; x.beginPath(); (x.roundRect ? x.roundRect(80, 860, 560, 100, 50) : x.rect(80, 860, 560, 100)); x.fill();
      x.fillStyle = '#fff'; x.font = 'bold 46px system-ui, sans-serif'; x.fillText('mejorcrucero.com', 120, 925);
      c.toBlob(async (blob) => {
        const file = new File([blob], 'precio-real-crucero.png', { type: 'image/png' });
        if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: 'Precio real de mi crucero' }); return; } catch {} }
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
      });
      track('card_calc');
    });
  }

  // ---------- Alerta de bajada de precio ----------
  const af = $('#alert-form');
  if (af) {
    const listEl = $('#alert-list');
    getShips().then((ss) => { const s = ss.find((x) => x.slug === qs.get('barco')); if (s) af.ship.value = s.name; if (qs.get('fecha')) af.date.value = qs.get('fecha'); });
    const claimText = (it) => `Asunto: Solicitud de ajuste de precio – reserva ${it.ref || '[nº de reserva]'}\n\nHola:\n\nTengo una reserva${it.ref ? ' (n.º ' + it.ref + ')' : ''} en el ${it.ship} con salida el ${it.date}, camarote ${it.cabin}, por la que pagué ${eur(it.price)}.\n\nHe visto que esa misma salida y categoría está ahora a ${eur(it.now)}, es decir, ${eur(it.price - it.now)} menos. Adjunto captura.\n\nOs pido, por favor, que se me aplique el nuevo precio o, si no fuera posible, que se me abone la diferencia como crédito a bordo.\n\nQuedo a la espera de vuestra respuesta.\n\nGracias,\n`;
    const render = () => {
      const items = store.get('mc_alerts', []);
      if (!items.length) { listEl.innerHTML = '<p class="muted">Todavía no has guardado ninguno.</p>'; return; }
      listEl.innerHTML = items.map((it, i) => `<div class="alert-item"><div class="row"><b>${esc(it.ship)}</b><span class="muted small">${esc(it.date)} · ${esc(it.cabin)}</span></div>
      <div class="row"><span>Pagaste <b>${eur(it.price)}</b>${it.where ? ' en ' + esc(it.where) : ''}</span>${it.now ? `<span class="${it.now < it.price ? 'extra' : 'muted'}">Hoy: ${eur(it.now)}${it.now < it.price ? ` · ¡${eur(it.price - it.now)} menos!` : ''}</span>` : ''}</div>
      <div class="row"><label class="small">Precio que ves hoy (€) <input type="number" min="1" data-now="${i}" value="${it.now || ''}" class="in-sm"></label>
      <span class="row-btns"><a class="btn btn-sm btn-ghost" href="${BASE}barcos/${slugify(it.ship)}/#reservar">Comprobar</a>${it.now && it.now < it.price ? `<button class="btn btn-sm" type="button" data-claim="${i}">Email de reclamación</button>` : ''}<button class="btn btn-sm btn-ghost" type="button" data-del="${i}">Quitar</button></span></div>
      <textarea class="claim-out" data-claim-out="${i}" rows="10" readonly hidden aria-label="Email de reclamación"></textarea></div>`).join('');
    };
    listEl.addEventListener('change', (e) => {
      const i = e.target.dataset.now; if (i == null) return;
      const items = store.get('mc_alerts', []); items[i].now = parseFloat(e.target.value) || null; store.set('mc_alerts', items); setTimeout(render);
    });
    listEl.addEventListener('click', (e) => {
      const d = e.target.dataset.del, c = e.target.dataset.claim;
      if (d != null) { const items = store.get('mc_alerts', []); items.splice(d, 1); store.set('mc_alerts', items); render(); }
      if (c != null) { const t = $(`[data-claim-out="${c}"]`, listEl); t.value = claimText(store.get('mc_alerts', [])[c]); t.hidden = false; t.select(); }
    });
    af.addEventListener('submit', async (e) => {
      e.preventDefault();
      const it = { ship: af.ship.value.trim(), date: af.date.value, cabin: af.cabin.value, price: parseFloat(af.price.value), where: af.where.value.trim(), ref: af.ref.value.trim(), email: af.email.value.trim() };
      const items = store.get('mc_alerts', []); items.unshift(it); store.set('mc_alerts', items);
      let ok = false;
      if (it.email) { try { ok = !!(await api('/alert', { body: { kind: 'price', website: af.website.value, ...it } })); } catch {} }
      $('.form-msg', af).textContent = ok ? 'Guardado. Te avisaremos por email si detectamos una bajada.' : 'Guardado en este dispositivo. Vuelve cuando quieras y apunta el precio que ves hoy para comparar.';
      af.reset(); render();
    });
    $('.js-parse')?.addEventListener('click', async () => {
      const t = $('#paste-t').value, msg = $('.paste .form-msg');
      if (t.trim().length < 20) { msg.textContent = 'Pega el texto completo del email.'; return; }
      const ships = await getShips();
      const low = t.toLowerCase();
      const ship = ships.filter((s) => low.includes(s.name.toLowerCase())).sort((a, b) => b.name.length - a.name.length)[0];
      const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      let date = null, m;
      if ((m = /(\d{4})-(\d{2})-(\d{2})/.exec(t))) date = `${m[1]}-${m[2]}-${m[3]}`;
      else if ((m = /(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/.exec(t))) date = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
      else if ((m = new RegExp(`(\\d{1,2}) de (${months.join('|')}) de (\\d{4})`, 'i').exec(t))) date = `${m[3]}-${String(months.indexOf(m[2].toLowerCase()) + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
      const prices = [...t.matchAll(/(\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})?|\d+(?:,\d{2})?)\s?(?:€|eur)|(?:€|eur)\s?(\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})?)/gi)].map((x) => parseFloat((x[1] || x[2]).replace(/[.\s]/g, '').replace(',', '.'))).filter((n) => n > 50);
      const cabin = /suite/i.test(t) ? 'Suite' : /balc[oó]n|balcony/i.test(t) ? 'Balcón' : /exterior|ocean ?view|vista mar/i.test(t) ? 'Exterior' : /interior|inside/i.test(t) ? 'Interior' : null;
      let data = { ship: ship?.name, date, price: prices.length ? Math.max(...prices) : null, cabin };
      if ((!data.ship || !data.date || !data.price) && (await hasApi())) { try { const r = await api('/parse-booking', { body: { text: t } }); data = { ...(r.data || {}), ...Object.fromEntries(Object.entries(data).filter(([, x]) => x)) }; } catch {} }
      if (data.ship) af.ship.value = data.ship; if (data.date) af.date.value = data.date; if (data.price) af.price.value = Math.round(data.price); if (data.cabin) af.cabin.value = data.cabin; if (data.where) af.where.value = data.where;
      const got = ['ship', 'date', 'price', 'cabin'].filter((k) => data[k]).length;
      msg.textContent = got ? `He rellenado ${got} de 4 datos. Revísalos antes de guardar.` : 'No he encontrado los datos: rellénalos a mano.';
    });
    render();
  }

  // ---------- Email de reclamación ----------
  const cf = $('#claim-form');
  if (cf) {
    const gen = () => {
      const v = Object.fromEntries(new FormData(cf));
      const diff = (+v.price || 0) - (+v.now || 0);
      const ask = { diff: 'que se me aplique el nuevo precio y se me devuelva la diferencia', credit: 'que se me abone la diferencia como crédito a bordo', reprice: 'que se reajuste mi tarifa al precio actual' }[v.ask];
      const txt = `Asunto: Solicitud de ajuste de precio – reserva ${v.ref || '[nº de reserva]'}\n\nHola:\n\nSoy ${v.name || '[tu nombre]'}, titular de la reserva ${v.ref || '[nº]'} en el ${v.ship || '[barco]'} con salida el ${v.date || '[fecha]'}, categoría ${v.cabin || '[camarote]'}, por la que pagué ${v.price ? eur(+v.price) : '[precio]'}.\n\nHe comprobado que esa misma salida y categoría se vende ahora a ${v.now ? eur(+v.now) : '[precio actual]'}${diff > 0 ? `, ${eur(diff)} menos` : ''}. Adjunto captura.\n\nOs solicito, por favor, ${ask}.\n\nQuedo a la espera de vuestra respuesta.\n\nUn saludo,\n${v.name || ''}`;
      $('#claim-out').value = txt;
      const [subj, ...rest] = txt.split('\n\n');
      $('#claim-mail').href = `mailto:?subject=${encodeURIComponent(subj.replace('Asunto: ', ''))}&body=${encodeURIComponent(rest.join('\n\n'))}`;
    };
    cf.addEventListener('input', gen); gen();
  }

  // ---------- Test: ¿qué crucero es para mí? ----------
  const quiz = $('#quiz');
  if (quiz) quiz.addEventListener('submit', async (e) => {
    e.preventDefault();
    const a = Object.fromEntries(new FormData(quiz));
    const ships = await getShips();
    const dests = JSON.parse($('#dest-meta').textContent);
    const monthsFor = { summer: [6, 7, 8], winter: [12, 1, 2], spring: [3, 4, 5, 9, 10, 11], any: [] }[a.month];
    const goodDest = dests.filter((d) => (!monthsFor.length || monthsFor.some((m) => d.months.includes(m))) && (a.plane === 'yes' || d.fromSpain));
    $('#quiz-dest').innerHTML = goodDest.length ? `<h2>Destinos para ti</h2><div class="dest-grid">${goodDest.map((d) => `<a class="dest" href="${BASE}destinos/${d.slug}/"><span class="dest-e">${d.emoji}</span><b>${esc(d.name)}</b></a>`).join('')}</div>` : '';
    const scored = ships.map((s) => {
      let p = 0;
      if (a.es === 'yes') p += s.es ? 6 : -4;
      if (a.size === 'giant') p += s.gt >= 200000 ? 5 : s.gt >= 170000 ? 2 : -1;
      if (a.size === 'mid') p += s.gt < 170000 && s.gt > 80000 ? 4 : -2;
      if (a.size === 'small') p += s.gt < 60000 ? 5 : -3;
      if (a.budget !== 'any') p += s.tier === a.budget ? 4 : -2;
      if (a.new === 'yes') p += (s.year - 2015) / 2;
      if (a.new === 'no') p += s.year < 2019 ? 2 : 0;
      if (a.who === 'family') p += ['royal-caribbean', 'disney', 'msc', 'carnival', 'costa'].includes(s.lineSlug) ? 3 : 0;
      if (a.who === 'family' && ['virgin-voyages', 'viking'].includes(s.lineSlug)) p -= 10;
      if (a.who === 'couple' || a.who === 'senior') p += ['celebrity', 'princess', 'cunard', 'holland-america', 'oceania', 'viking'].includes(s.lineSlug) ? 3 : 0;
      if (a.who === 'senior') p += (s.ratio || 0) > 40 ? 2 : 0;
      if (a.who === 'friends') p += ['norwegian', 'carnival', 'royal-caribbean', 'msc', 'virgin-voyages'].includes(s.lineSlug) ? 2 : 0;
      p += s.v ? 1 : 0;
      return { s, p };
    }).sort((x, y) => y.p - x.p).slice(0, 6);
    $('#quiz-out').innerHTML = `<h2 class="full">Tus barcos recomendados</h2>` + scored.map(({ s }) => miniCard(s)).join('');
    ($('#quiz-dest').firstChild ? $('#quiz-dest') : $('#quiz-out')).scrollIntoView({ behavior: 'smooth' });
    track('quiz_done');
  });

  // ---------- Asistente IA ----------
  const chatF = $('#chat-form');
  if (chatF) {
    const chat = $('#chat');
    const add = (cls, html) => { const d = document.createElement('div'); d.className = 'msg ' + cls; d.innerHTML = html; chat.append(d); chat.scrollTop = chat.scrollHeight; return d; };
    const linkify = (txt, ships) => { let h = esc(txt).replace(/\n/g, '<br>'); ships.slice().sort((a, b) => b.name.length - a.name.length).forEach((s) => { const n = esc(s.name); if (h.includes(n) && !h.includes('>' + n + '<')) h = h.split(n).join(`<a href="${BASE}barcos/${s.slug}/">${n}</a>`); }); return h; };
    const LINE_WORDS = { msc: 'msc', costa: 'costa', royal: 'royal-caribbean', norwegian: 'norwegian', ncl: 'norwegian', celebrity: 'celebrity', princess: 'princess', carnival: 'carnival', disney: 'disney', virgin: 'virgin-voyages', cunard: 'cunard', viking: 'viking' };
    const local = (q, ships) => {
      const t = q.toLowerCase();
      const lines = Object.entries(LINE_WORDS).filter(([w]) => t.includes(w)).map(([, l]) => l);
      let list = lines.length ? ships.filter((s) => lines.includes(s.lineSlug)) : ships.slice();
      const score = (s) => (/(niñ|famil|tobog|hij|beb)/.test(t) ? (s.gt > 170000 ? 4 : 0) + (['royal-caribbean', 'msc', 'disney', 'costa'].includes(s.lineSlug) ? 3 : 0) : 0)
        + (/(tranquil|sin niñ|pareja|relax)/.test(t) ? (['celebrity', 'princess', 'viking', 'virgin-voyages', 'cunard'].includes(s.lineSlug) ? 4 : 0) : 0)
        + (/(español|espan|barcelona|málaga|malaga|valencia|españa)/.test(t) ? (s.es ? 5 : -2) : 0) + (/(nuev|reciente|moderno)/.test(t) ? (s.year - 2018) : 0)
        + (/(barat|económ|econom|no gastar|presupuesto|ajustad)/.test(t) ? (s.tier === 'estandar' ? 3 : -3) : 0) + (/(lujo|exclusiv)/.test(t) ? (s.tier === 'lujo' ? 5 : 0) : 0) + (s.v ? 1 : 0);
      const top = list.sort((a, b) => score(b) - score(a)).slice(0, 3);
      return 'Te propongo estos barcos:\n' + top.map((s) => `• ${s.name} (${s.lineShort}, ${s.year}): ${s.gt >= 200000 ? 'gigante y con muchas actividades' : s.tier === 'lujo' ? 'gama de lujo' : s.tier === 'premium' ? 'ambiente más cuidado' : 'buena relación calidad-precio'}${s.es ? ', con español a bordo en el Mediterráneo' : ''}.`).join('\n') + '\n\nMira sus vídeos y calcula el precio real antes de reservar.';
    };
    const ask = async (q) => {
      add('user', esc(q));
      const wait = add('bot', '<span class="dots">Pensando</span>');
      const ships = await getShips();
      let answer = null;
      if (await hasApi()) {
        const ctx = ships.map((s) => `${s.name} | ${s.lineShort} | ${s.year} | ${s.gt} GT | ${s.pax || '?'} pax | gama ${s.tier} | español:${s.es ? 'sí' : 'no'}`).join('\n').slice(0, 6000);
        try { answer = (await api('/ask', { body: { q, context: ctx } })).answer; } catch {}
      }
      wait.innerHTML = linkify(answer || local(q, ships), ships);
      track('ask');
    };
    chatF.addEventListener('submit', (e) => { e.preventDefault(); const q = chatF.q.value.trim(); if (q) { ask(q); chatF.reset(); } });
    $$('.js-ask').forEach((b) => b.addEventListener('click', () => ask(b.textContent)));
  }

  // ---------- Checklist ----------
  const chkOpts = $('#chk-opts');
  if (chkOpts) {
    const st = store.get('mc_chk', { opts: {}, items: {} });
    const sync = () => {
      for (const el of chkOpts.elements) $(`[data-group="${el.name}"]`).hidden = !el.checked;
      const vis = $$('.chk-group:not([hidden]) [data-item]');
      $('#chk-count').textContent = `${vis.filter((i) => i.checked).length} de ${vis.length} listos`;
    };
    for (const el of chkOpts.elements) el.checked = !!st.opts[el.name];
    $$('[data-item]').forEach((i) => { i.checked = !!st.items[i.dataset.item]; });
    document.addEventListener('change', (e) => {
      if (e.target.form === chkOpts) st.opts[e.target.name] = e.target.checked;
      if (e.target.dataset.item) st.items[e.target.dataset.item] = e.target.checked;
      store.set('mc_chk', st); sync();
    });
    sync();
  }

  // ---------- Cuenta atrás + calendario ----------
  const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const reminders = (c) => [['Pago final del crucero', c.pay, 'Revisa que se ha cobrado y guarda el justificante.'], ['Check-in online del crucero', addDays(c.date, -14), 'Suele abrirse unas semanas antes: compruébalo en la web de la naviera.'], ['Revisar checklist y documentos', addDays(c.date, -3), 'mejorcrucero.com/herramientas/checklist/'], [`Embarque en el ${c.ship}`, c.date, c.port ? 'Puerto: ' + c.port : '']].filter((r) => r[1]);
  const ics = (title, date, desc) => {
    const d = date.replace(/-/g, '');
    const blob = new Blob([`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//MejorCrucero//ES\r\nBEGIN:VEVENT\r\nUID:${Date.now()}-${Math.random().toString(36).slice(2)}@mejorcrucero.com\r\nDTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z\r\nDTSTART;VALUE=DATE:${d}\r\nSUMMARY:${title}\r\nDESCRIPTION:${desc}\r\nBEGIN:VALARM\r\nTRIGGER:-P1D\r\nACTION:DISPLAY\r\nDESCRIPTION:${title}\r\nEND:VALARM\r\nEND:VEVENT\r\nEND:VCALENDAR`], { type: 'text/calendar' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'recordatorio-crucero.ics'; a.click();
  };
  const cdHtml = (c, i) => {
    const days = Math.ceil((new Date(c.date + 'T12:00:00') - new Date()) / 864e5);
    return `<div class="cd-item"><p class="cd-days"><b>${days > 0 ? days : days === 0 ? '¡Hoy!' : '✓'}</b>${days > 0 ? ' días para tu crucero' : days < 0 ? ' Ya navegaste' : ''}</p><p><b>${esc(c.ship)}</b> · ${esc(c.date)}${c.port ? ' · ' + esc(c.port) : ''}</p><ul class="mini">${reminders(c).map(([t, d], j) => `<li class="row"><span>${esc(t)} <span class="muted small">${d}</span></span><button class="btn btn-sm btn-ghost" type="button" data-ics="${i}:${j}">Al calendario</button></li>`).join('')}</ul><button class="link-btn" type="button" data-cd-del="${i}">Quitar</button></div>`;
  };
  const renderCd = (el) => {
    if (!el) return;
    const list = store.get('mc_cd', []);
    if (list.length) el.innerHTML = list.map(cdHtml).join('');
    el.onclick = (e) => {
      const ic = e.target.dataset.ics, del = e.target.dataset.cdDel;
      if (ic) { const [i, j] = ic.split(':').map(Number); const r = reminders(store.get('mc_cd', [])[i])[j]; ics(r[0], r[1], r[2]); }
      if (del != null) { const l = store.get('mc_cd', []); l.splice(del, 1); store.set('mc_cd', l); el.innerHTML = '<p class="muted">Sin cruceros guardados.</p>'; renderCd(el); }
    };
  };
  const cdf = $('#cd-form');
  if (cdf) cdf.addEventListener('submit', (e) => { e.preventDefault(); const l = store.get('mc_cd', []); l.unshift(Object.fromEntries(new FormData(cdf))); store.set('mc_cd', l.slice(0, 5)); cdf.reset(); renderCd($('#cd-out')); });
  renderCd($('#cd-out')); renderCd($('#my-cd'));
  const myAl = $('#my-alerts');
  if (myAl) { const it = store.get('mc_alerts', []); if (it.length) myAl.innerHTML = it.map((a) => `<div class="alert-item"><b>${esc(a.ship)}</b> <span class="muted small">${esc(a.date)} · ${eur(a.price)}${a.now ? ' · hoy ' + eur(a.now) : ''}</span></div>`).join('') + `<p><a href="${BASE}herramientas/alerta-precio/">Gestionar alertas →</a></p>`; }

  // ---------- Conversor horario ----------
  const tzf = $('#tz-form');
  if (tzf) {
    tzf.ship.value = 'Europe/Madrid';
    const off = (tz, d) => { const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(d).reduce((o, x) => (o[x.type] = x.value, o), {}); return Math.round((Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute) - d.getTime()) / 6e4); };
    const run = () => {
      const now = new Date();
      const [h, m] = (tzf.t.value || '17:30').split(':').map(Number);
      const shipOff = off(tzf.ship.value, now), portOff = off(tzf.tz.value, now), myOff = -now.getTimezoneOffset();
      const fmt = (mins) => { const t = ((Math.round(mins) % 1440) + 1440) % 1440; return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
      const base = h * 60 + m, diff = portOff - shipOff;
      $('#tz-out').innerHTML = `<div class="stats"><div><b>${fmt(base)}</b><span>Todos a bordo (hora del barco)</span></div><div><b>${fmt(base + diff)}</b><span>Esa hora en el puerto</span></div><div><b>${fmt(base - shipOff + myOff)}</b><span>Esa hora donde estás tú</span></div><div><b>${new Intl.DateTimeFormat('es-ES', { timeZone: tzf.tz.value, hour: '2-digit', minute: '2-digit' }).format(now)}</b><span>Hora actual en el puerto</span></div></div>${diff ? `<div class="tip"><b>Ojo:</b> el puerto va ${Math.abs(diff / 60)} h ${diff > 0 ? 'por delante' : 'por detrás'} del barco. Guíate por la hora del barco para volver.</div>` : '<p class="muted">El puerto y el barco tienen la misma hora.</p>'}`;
    };
    tzf.addEventListener('input', run); run();
  }

  // ---------- Comunidad: foros, reseñas, preguntas ----------
  const ago = (iso) => { const s = (Date.now() - new Date(String(iso).replace(' ', 'T') + (String(iso).includes('Z') ? '' : 'Z'))) / 1000; return s < 3600 ? `hace ${Math.max(1, Math.round(s / 60))} min` : s < 86400 ? `hace ${Math.round(s / 3600)} h` : `hace ${Math.round(s / 86400)} d`; };
  $$('.js-ago').forEach((t) => { t.textContent = ago(t.getAttribute('datetime')); });
  const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);
  const LBL = { general: 'General', comida: 'Comida', camarote: 'Camarote', animacion: 'Animación', ninos: 'Niños', limpieza: 'Limpieza' };
  const postHtml = (p, all) => `<article class="post" id="p${p.id}"><header><b>${p.user_id ? `<a href="${BASE}comunidad/perfil/?id=${esc(p.user_id)}">${esc(p.name)}</a>` : esc(p.name)}</b> <span class="muted small">${ago(p.created)}${p.cabin ? ' · camarote ' + esc(p.cabin) : ''}</span></header>
    ${p.rating ? `<p class="stars">${Object.entries(p.rating).filter(([k]) => LBL[k]).map(([k, v]) => `<span>${LBL[k]} <b aria-label="${v} de 5">${stars(v)}</b></span>`).join('')}${p.rating.repetiria != null ? `<span>${p.rating.repetiria ? '👍 Repetiría' : '👎 No repetiría'}</span>` : ''}</p>` : ''}
    ${p.body ? `<p>${esc(p.body).replace(/\n/g, '<br>')}</p>` : ''}
    ${p.video ? `<button class="yt yt-sm" type="button" data-id="${esc(p.video)}" aria-label="Reproducir vídeo de ${esc(p.name)}"><img src="https://i.ytimg.com/vi/${esc(p.video)}/hqdefault.jpg" alt="" loading="lazy" width="480" height="360"><span class="yt-play">▶</span></button>` : ''}
    <footer><button class="link-btn" type="button" data-vote="${p.id}">👍 Útil (${p.votes})</button>${p.kind === 'question' ? `<button class="link-btn" type="button" data-reply="${p.id}">Responder</button>` : ''}<button class="link-btn" type="button" data-rep="${p.id}">Reportar</button></footer>
    ${all.filter((r) => r.parent === p.id).map((r) => `<div class="reply"><b>${esc(r.name)}</b> <span class="muted small">${ago(r.created)}</span><p>${esc(r.body)}</p></div>`).join('')}</article>`;

  async function initForum(f) {
    const list = $('.forum-list', f), form = $('.forum-form', f);
    const kinds = f.dataset.kinds.split(',');
    let kind = kinds[0], posts = [], replyTo = null;
    if (!(await hasApi())) { list?.remove(); form?.remove(); $('.tabs', f)?.remove(); $('.forum-soon', f).hidden = false; return; }
    const titles = { review: 'Escribe tu opinión', question: 'Haz una pregunta', cabin: 'Cuenta cómo era tu camarote', comment: 'Escribe un comentario', excursion: 'Propón una excursión compartida (puerto, día, plan y cuántos sois)', diary: 'Escribe en tu diario de viaje' };
    const setKind = (k) => {
      kind = k; replyTo = null;
      $$('.tab', f).forEach((t) => t.setAttribute('aria-selected', t.dataset.kind === k));
      if (form) { $('.forum-form-title', f).textContent = titles[k]; $$('[data-for]', form).forEach((r) => { r.hidden = r.dataset.for !== k; }); }
      const shown = posts.filter((p) => p.kind === k && !p.parent);
      list.innerHTML = shown.length ? shown.map((p) => postHtml(p, posts)).join('') : `<p class="muted">Todavía no hay nada aquí. ¡Sé el primero!</p>`;
    };
    const load = async () => {
      const thread = f.dataset.thread;
      try {
        const j = await api('/posts?thread=' + encodeURIComponent(thread));
        posts = j.posts;
        $('.forum-count', f).textContent = posts.length ? `${posts.length} mensaje${posts.length === 1 ? '' : 's'}` : '';
        const n = $('.rc-n'); if (n) n.textContent = j.members;
        if (kinds.includes('review')) {
          const st = await api('/stats?thread=' + encodeURIComponent(thread)).catch(() => null);
          if (st?.reviews) { const box = $('.forum-stats', f); box.hidden = false; box.innerHTML = `<div class="stats">${Object.entries(st.avg).map(([k, v]) => `<div><b>${String(v).replace('.', ',')}</b><span>${LBL[k] || k}</span></div>`).join('')}${st.repetiria != null ? `<div><b>${st.repetiria}%</b><span>Repetiría</span></div>` : ''}<div><b>${st.reviews}</b><span>Opiniones</span></div></div>`; }
          api('/summary?thread=' + encodeURIComponent(thread)).then((s) => { if (s.summary) { const b = $('.forum-summary', f); b.hidden = false; b.innerHTML = `<h3 class="h-sm">Resumen de opiniones (IA)</h3><p>${esc(s.summary).replace(/\n/g, '<br>')}</p><p class="muted small">Resumen automático de las opiniones publicadas; puede contener errores.</p>`; } }).catch(() => {});
        }
        setKind(kind);
      } catch { list.innerHTML = '<p class="muted">No se ha podido cargar el foro. Inténtalo de nuevo más tarde.</p>'; }
    };
    $$('.tab', f).forEach((t) => t.addEventListener('click', () => setKind(t.dataset.kind)));
    list.addEventListener('click', async (e) => {
      const v = e.target.dataset.vote, r = e.target.dataset.reply, rp = e.target.dataset.rep;
      if (v) { await api('/vote', { body: { id: +v } }).catch(() => {}); e.target.textContent = '👍 ¡Gracias!'; }
      if (r && form) { replyTo = +r; $('.forum-form-title', f).textContent = 'Tu respuesta'; form.body.focus(); }
      if (rp) { await api('/report', { body: { target: 'post:' + rp, reason: 'Reportado desde el foro', page: PAGE } }).catch(() => {}); e.target.textContent = 'Reportado'; }
    });
    if (form) {
      form.name.value = me().name || '';
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = $('.form-msg', form);
        if (form.name.value.trim().length < 2 || (form.body.value.trim().length < 3 && !form.video?.value)) { msg.textContent = 'Escribe tu nombre y un mensaje.'; return; }
        const rating = kind === 'review' ? Object.fromEntries(['general', 'comida', 'camarote', 'animacion', 'ninos', 'limpieza', 'repetiria'].map((k) => [k, form['r_' + k].value]).filter(([, x]) => x !== '').map(([k, x]) => [k, k === 'repetiria' ? x === '1' : +x])) : null;
        try {
          await api('/posts', { body: { thread: f.dataset.thread, kind: replyTo ? 'answer' : kind, parent: replyTo, name: form.name.value.trim(), body: form.body.value.trim(), rating, cabin: kind === 'cabin' ? form.cabin?.value : '', video: kind === 'cabin' ? form.video?.value : '', user_id: uid(), website: form.website.value } });
          store.set('mc_me', { ...me(), name: form.name.value.trim() });
          api('/user', { body: { id: uid(), name: form.name.value.trim(), cruises: me().cruises || 0, lines: me().lines || '' } }).catch(() => {});
          msg.textContent = '¡Publicado!'; form.body.value = ''; if (form.video) form.video.value = ''; replyTo = null; load();
          track('post', kind);
        } catch (err) { msg.textContent = err.message === 'rate' ? 'Has publicado mucho en poco tiempo: espera un poco.' : 'No se ha podido publicar. Revisa el mensaje e inténtalo de nuevo.'; }
      });
    }
    if ('IntersectionObserver' in window) { const io = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { io.disconnect(); load(); } }, { rootMargin: '300px' }); io.observe(f); } else load();
  }

  // Grupo de salida
  const rcTitle = $('#rc-title');
  if (rcTitle) {
    const names = JSON.parse($('#ships-min').textContent);
    const b = qs.get('b'), d = qs.get('f');
    const forum = $('.forum');
    if (b && names[b] && /^\d{4}-\d{2}-\d{2}$/.test(d || '')) {
      const nice = new Date(d + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
      rcTitle.textContent = `${names[b]} · salida del ${nice}`;
      document.title = `${names[b]} · ${nice} | Grupo de salida | MejorCrucero`;
      $('#rc-sub').textContent = 'Preséntate, propón excursiones compartidas y resuelve dudas con quienes navegan contigo.';
      $('#rc-links').innerHTML = `<div class="share"><a class="btn btn-wa" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(`¿Vas en el ${names[b]} el ${nice}? Únete a nuestro grupo: ${location.href}`)}">Invitar por WhatsApp</a><a class="btn btn-ghost" href="${BASE}barcos/${b}/">Ficha del barco</a><a class="btn btn-ghost" href="${BASE}herramientas/cuenta-atras/">Cuenta atrás</a></div>`;
      forum.dataset.thread = `salida:${b}:${d}`;
      hasApi().then((ok) => { if (!ok) return; const m = $('.rc-members'); m.hidden = false; $('.js-join').addEventListener('click', async (e) => { const name = me().name || prompt('¿Con qué nombre quieres aparecer?'); if (!name) return; store.set('mc_me', { ...me(), name }); const j = await api('/join', { body: { thread: forum.dataset.thread, user_id: uid(), name } }).catch(() => null); if (j) { $('.rc-n').textContent = j.members; e.target.textContent = '¡Dentro!'; e.target.disabled = true; } }); });
    } else {
      rcTitle.textContent = 'Elige tu barco y fecha';
      $('#rc-sub').innerHTML = `Vuelve a <a href="${BASE}comunidad/">la comunidad</a> y elige tu salida.`;
      forum.remove();
    }
  }

  // Perfil
  const pf = $('#pf-form');
  if (pf) {
    const id = qs.get('id') || uid();
    const mineP = id === uid();
    const forum = $('.forum');
    forum.dataset.thread = 'perfil:' + id;
    const show = async () => {
      try {
        const j = await api('/user?id=' + encodeURIComponent(id));
        $('#pf-title').textContent = mineP ? 'Tu perfil de crucerista' : j.user.name;
        $('#pf-view').innerHTML = `<div class="stats"><div><b>${j.user.cruises}</b><span>Cruceros</span></div><div><b>${j.user.posts}</b><span>Mensajes</span></div><div><b>${j.user.cabins}</b><span>Camarotes reportados</span></div></div><p class="badges">${j.user.badges.map((x) => `<span class="badge">🏅 ${esc(x)}</span>`).join('')}</p>${j.user.lines ? `<p class="muted">Ha navegado con: ${esc(j.user.lines)}</p>` : ''}${mineP ? `<p class="small">Tu perfil público: <a href="?id=${id}">${location.origin}${location.pathname}?id=${id}</a></p>` : ''}`;
      } catch { if (!mineP) $('#pf-title').textContent = 'Perfil no encontrado'; }
    };
    if (!mineP) { pf.remove(); $('.forum-form', forum)?.remove(); }
    else {
      pf.name.value = me().name || ''; pf.cruises.value = me().cruises || 0; pf.lines.value = me().lines || '';
      pf.addEventListener('submit', async (e) => {
        e.preventDefault();
        const v = { name: pf.name.value.trim(), cruises: +pf.cruises.value || 0, lines: pf.lines.value.trim() };
        store.set('mc_me', v);
        let ok = false; try { ok = !!(await api('/user', { body: { id, ...v } })); } catch {}
        $('.form-msg', pf).textContent = ok ? 'Perfil guardado.' : 'Guardado en este dispositivo.';
        show();
      });
    }
    show();
  }

  // Ranking
  const lb = $('#lb');
  if (lb) hasApi().then(async (ok) => {
    if (!ok) { lb.innerHTML = '<p class="muted">El ranking se abre junto con el foro, muy pronto.</p>'; return; }
    const j = await api('/leaderboard').catch(() => ({ users: [] }));
    lb.innerHTML = j.users.length ? `<ol class="rank">${j.users.map((u, i) => `<li><span class="rank-n">${i + 1}</span><a href="${BASE}comunidad/perfil/?id=${esc(u.id)}">${esc(u.name)}</a><span class="muted small">${u.posts} mensajes · ${u.votes || 0} votos</span></li>`).join('')}</ol>` : '<p class="muted">Aún no hay nadie: ¡estrena el ranking con tu primera opinión!</p>';
  });

  $$('.forum').forEach(initForum);

  // Buscador de camarotes
  $$('.cabin-search').forEach((f) => f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const out = f.nextElementSibling;
    const ship = f.dataset.ship || f.ship.value, cab = f.cabin.value.trim().replace(/\D/g, '');
    if (!ship || !cab) return;
    if (!(await hasApi())) { out.innerHTML = '<p class="muted">El buscador de camarotes se abre junto con el foro, muy pronto.</p>'; return; }
    out.innerHTML = '<div class="skel"></div>';
    const j = await api('/posts?thread=' + encodeURIComponent('barco:' + ship)).catch(() => ({ posts: [] }));
    const n = +cab;
    const near = j.posts.filter((p) => p.kind === 'cabin' && p.cabin && Math.abs(+String(p.cabin).replace(/\D/g, '') - n) <= 6).sort((a, b) => Math.abs(a.cabin - n) - Math.abs(b.cabin - n));
    out.innerHTML = near.length ? near.map((p) => postHtml(p, [])).join('') : `<p class="muted">Nadie ha contado nada todavía del camarote ${esc(cab)} ni de los de al lado. Si has estado, cuéntalo en el foro del barco (pestaña "Camarotes").</p>`;
  }));

  // Mapa del itinerario (Leaflet bajo demanda)
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.js-map'); if (!b) return;
    const box = b.parentElement, pts = JSON.parse(box.dataset.ports);
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.append(css);
    const s = document.createElement('script'); s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.onload = () => { box.innerHTML = '<div class="map-box"></div>'; const m = L.map($('.map-box', box)); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(m); const ll = pts.map((p) => [p[0], p[1]]); pts.forEach((p) => L.marker([p[0], p[1]]).addTo(m).bindPopup(p[2])); L.polyline(ll, { color: '#c93b1f' }).addTo(m); m.fitBounds(ll, { padding: [30, 30] }); };
    document.head.append(s);
  });
})();
