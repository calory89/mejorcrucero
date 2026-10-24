// Panel de administración de MejorCrucero (solo con la clave de administrador)
(() => {
  const BASE = document.body.dataset.base || '/';
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let API = '';
  const tok = () => { try { return localStorage.getItem('mc_admin') || ''; } catch { return ''; } };
  const call = async (p, body) => { const r = await fetch(API + p, { method: body ? 'POST' : 'GET', headers: { Authorization: 'Bearer ' + tok(), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined }); if (r.status === 401) throw new Error('auth'); return r.json(); };
  const table = (rows) => rows.length ? `<div class="table-wrap"><table class="rank-t"><thead><tr>${Object.keys(rows[0]).map((k) => `<th>${esc(k)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${Object.values(r).map((v) => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '<p class="muted">Nada todavía.</p>';
  const csv = (rows, name) => { if (!rows.length) return; const k = Object.keys(rows[0]); const t = [k.join(','), ...rows.map((r) => k.map((x) => `"${String(r[x] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t], { type: 'text/csv' })); a.download = name + '.csv'; a.click(); };
  async function load() {
    const out = $('#adm-out');
    try {
      const days = $('#adm-days').value;
      const [ov, fn, q, ck, ob] = await Promise.all([call('/admin/overview'), call('/admin/funnel?days=' + days), call('/admin/queue'), call('/admin/clicks?days=' + days).catch(() => ({ byPartner: [], byPage: [], byDay: [] })), call('/admin/outbox').catch(() => [])]);
      const maxDay = Math.max(1, ...ck.byDay.map((d) => d.n));
      const bars = ck.byDay.length ? `<div class="adm-bars">${ck.byDay.map((d) => `<span title="${esc(d.d)}: ${d.n} clics" style="height:${Math.round((d.n / maxDay) * 100)}%"></span>`).join('')}</div>` : '';
      out.innerHTML = `<div class="stats stats-light"><div><b>${ov.leads}</b><span>Leads</span></div><div><b>${ov.alerts}</b><span>Alertas</span></div><div><b>${ov.posts}</b><span>Mensajes</span></div><div><b>${ov.reports}</b><span>Reportes</span></div></div>
      <h2>Clics a socios (${days} días)</h2>${bars}<h3>Por socio</h3>${table(ck.byPartner)}<h3>Por página</h3>${table(ck.byPage)}
      <h2>Avisos por email</h2><p class="muted small">${ob.filter((m) => m.status === 'pending').length} en cola · ${ob.filter((m) => m.status === 'sent').length} enviados · ${ob.filter((m) => m.status === 'error').length} con error</p><p><button class="btn btn-ghost btn-sm" id="run-alerts">Comprobar avisos ahora</button> <span id="run-out" class="small"></span></p>${table(ob.slice(0, 30).map(({ id, email, kind, subject, status, created }) => ({ id, email, kind, subject, status, created })))}
      <h2>Embudo (${fn.days} días)</h2>${table(fn.events)}<h3>Páginas que más clics a socios generan</h3>${table(fn.affPages)}<h3>Clics a socios (7 días)</h3>${table(ov.clicks7d)}<h3>Pruebas A/B</h3>${table(fn.ab)}<h3>Leads por origen</h3>${table(fn.leads)}
      <h2>Moderación</h2>${q.length ? `<ul class="mini">${q.map((p) => `<li><span><b>${esc(p.name)}</b> · ${esc(p.thread)} · ${esc(p.kind)} · reportes ${p.reports}${p.mod ? ' · IA' : ''}<br>${esc(p.body)}</span><button class="btn btn-sm btn-ghost" data-show="${p.id}">Publicar</button><button class="btn btn-sm btn-ghost" data-hide="${p.id}">Ocultar</button></li>`).join('')}</ul>` : '<p class="muted">Nada pendiente.</p>'}
      <h2>Fotos pendientes</h2><div id="adm-photos" class="grid grid-3"><p class="muted">Cargando…</p></div>
      <h2>Descargas</h2><p><button class="btn btn-ghost" id="dl-leads">Leads (CSV)</button> <button class="btn btn-ghost" id="dl-alerts">Alertas (CSV)</button></p>`;
      $('#run-alerts').onclick = async () => { $('#run-out').textContent = 'Comprobando…'; try { $('#run-out').textContent = JSON.stringify(await call('/admin/run-alerts')); } catch { $('#run-out').textContent = 'Error'; } };
      call('/admin/photos').then(async (ph) => { const box = $('#adm-photos'); if (!ph.length) { box.innerHTML = '<p class="muted">No hay fotos pendientes.</p>'; return; } box.innerHTML = ph.map((x) => `<div class="side-card"><img data-k="${esc(x.photo)}" alt="" style="width:100%;border-radius:8px"><p class="small"><b>${esc(x.name)}</b> · ${esc(x.thread)}</p><button class="btn btn-sm" data-pok="${x.id}">Aprobar</button> <button class="btn btn-sm btn-ghost" data-pno="${x.id}">Rechazar</button></div>`).join('');
        for (const im of box.querySelectorAll('img[data-k]')) { try { const cfg = await (await fetch(BASE + 'data/config.json')).json(); const r = await fetch(cfg.api.replace(/\/$/, '') + '/admin/photo-raw?k=' + encodeURIComponent(im.dataset.k), { headers: { Authorization: 'Bearer ' + localStorage.getItem('mc_admin') } }); im.src = URL.createObjectURL(await r.blob()); } catch {} } }).catch(() => {});
      $('#dl-leads').onclick = async () => csv(await call('/admin/leads'), 'leads');
      $('#dl-alerts').onclick = async () => csv(await call('/admin/alerts'), 'alertas');
    } catch (e) { out.innerHTML = `<p class="tip">${e.message === 'auth' ? 'Clave incorrecta.' : 'No se ha podido conectar con la API.'}</p>`; }
  }
  document.addEventListener('click', async (e) => { const po = e.target.dataset.pok, pn = e.target.dataset.pno; if (po || pn) { await call('/admin/photo', { id: +(po || pn), ok: po ? 1 : 0 }); load(); return; } const s = e.target.dataset.show, h = e.target.dataset.hide; if (s || h) { await call('/admin/hide', { id: +(s || h), hidden: h ? 1 : 0 }); load(); } });
  $('#adm-form').addEventListener('submit', (e) => { e.preventDefault(); try { localStorage.setItem('mc_admin', $('#adm-token').value.trim()); } catch {} load(); });
  $('#adm-days').addEventListener('change', load);
  fetch(BASE + 'data/config.json').then((r) => r.json()).then((c) => { API = c.api; if (tok()) { $('#adm-token').value = tok(); load(); } });
})();
