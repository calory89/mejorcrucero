// MejorCrucero API — Cloudflare Worker + D1 (+ Workers AI opcional)
// Bindings: DB (D1), AI (Workers AI, opcional), ADMIN_TOKEN (secret), ALLOWED_ORIGINS (texto, separado por comas)
const json = (data, status = 200, origin = '*') => new Response(status === 204 ? null : JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Max-Age': '86400', 'Vary': 'Origin', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'DENY', 'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'", 'Strict-Transport-Security': 'max-age=31536000' },
});
const clean = (s, max = 2000) => String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
const YT = /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
const KINDS = new Set(['comment', 'review', 'question', 'answer', 'cabin', 'excursion', 'diary', 'poll', 'meetup']);
const THREAD = /^(barco|salida|camarote|perfil|guia|naviera|puerto|escala):[a-z0-9:-]{1,120}$/;

async function sha(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('').slice(0, 32);
}
async function limited(env, key, max, minutes) {
  const win = new Date(Math.floor(Date.now() / (minutes * 60000)) * minutes * 60000).toISOString();
  const row = await env.DB.prepare('SELECT n, window FROM ratelimit WHERE key=?').bind(key).first();
  if (!row || row.window !== win) { await env.DB.prepare('INSERT OR REPLACE INTO ratelimit(key,n,window) VALUES(?,1,?)').bind(key, win).run(); return false; }
  if (row.n >= max) return true;
  await env.DB.prepare('UPDATE ratelimit SET n=n+1 WHERE key=?').bind(key).run();
  return false;
}
function badges(u) {
  const b = [];
  if (u.posts >= 1) b.push('Primer mensaje');
  if (u.posts >= 10) b.push('Colaborador');
  if (u.posts >= 50) b.push('Experto');
  if (u.cruises >= 1) b.push(`${u.cruises} crucero${u.cruises > 1 ? 's' : ''}`);
  if (u.cruises >= 10) b.push('Lobo de mar');
  if (u.reviews >= 1) b.push('Primera opinión');
  if (u.cruises >= 5) b.push('Crucerista frecuente');
  if (u.expert) b.push('Experto de MejorCrucero');
  if (u.cabins >= 1) b.push('Reportero de camarotes');
  if (u.verified >= 1) b.push('Opinión verificada');
  if (u.refs >= 3) b.push('Embajador');
  if (u.refs >= 10) b.push('Embajador de oro');
  return b;
}

// Modelos de Workers AI por orden de preferencia (si uno se retira, prueba el siguiente)
const MODELS = ['@cf/meta/llama-3.3-70b-instruct-fp8-fast', '@cf/mistralai/mistral-small-3.1-24b-instruct', '@cf/meta/llama-3.1-8b-instruct-fp8'];
async function ai(env, input) {
  let err;
  for (const m of MODELS) { try { return await env.AI.run(m, input); } catch (e) { err = e; } }
  throw err;
}

// ---------- Motor de avisos (cron): compara las ofertas publicadas con los avisos que la gente pidió ----------
const SITE = 'https://mejorcrucero.com';
const fold = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const eurF = (n) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const fecha = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
const confirmToken = async (env, email) => (await sha((env.SALT || 'mc') + ':confirm:' + email)).slice(0, 20);
// Correo de confirmación (una vez por email): hasta confirmarlo, no se envían avisos de alertas nuevas
async function askConfirm(env, email) {
  if (!email || (await env.DB.prepare('SELECT 1 FROM confirmed WHERE email=?').bind(email).first())) return;
  const link = `https://mejorcrucero-api.mejorcrucero.workers.dev/confirm?e=${encodeURIComponent(email)}&t=${await confirmToken(env, email)}`;
  const html = `<div style="font-family:system-ui,Arial,sans-serif;max-width:600px;margin:auto;color:#0f172a"><p style="font:700 22px Georgia,serif;color:#0b2540">MejorCrucero</p><h1 style="font-size:20px">Confirma tu email</h1><p>Has pedido avisos de cruceros en MejorCrucero. Pulsa para confirmar que este email es tuyo:</p><p><a href="${link}" style="display:inline-block;background:#c2410c;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700">Confirmar mi email</a></p><p style="color:#64748b;font-size:13px">Si no has sido tú, ignora este correo: no te escribiremos más.</p></div>`;
  await env.DB.prepare('INSERT OR IGNORE INTO outbox(email,kind,subject,html,text,k) VALUES(?,?,?,?,?,?)').bind(email, 'confirm', 'Confirma tu email para recibir los avisos', html, `Confirma tu email para recibir los avisos de MejorCrucero: ${link}`, 'confirm:' + email).run();
}
const unsubToken = async (env, email) => (await sha((env.SALT || 'mc') + ':unsub:' + email)).slice(0, 20);
async function mailBody(env, email, title, intro, items) {
  const u = `https://mejorcrucero-api.mejorcrucero.workers.dev/unsub?e=${encodeURIComponent(email)}&t=${await unsubToken(env, email)}`;
  const rows = items.map((o) => `<tr><td style="padding:12px 0;border-bottom:1px solid #e5e7eb"><a href="${SITE}/salidas/${o.i}/?utm_source=email&utm_medium=aviso" style="color:#0b2540;font-weight:700;text-decoration:none">${o.t} · ${o.sn}</a><br><span style="color:#475569">${fecha(o.d)} · desde ${o.p}</span><br><b style="color:#c2410c;font-size:18px">${eurF(o.pr)}</b>${o.was ? ` <s style="color:#64748b">${eurF(o.was)}</s>` : ''} <span style="color:#475569">por persona · nota de la oferta ${o.sc}/100</span></td></tr>`).join('');
  const html = `<div style="font-family:system-ui,Arial,sans-serif;max-width:600px;margin:auto;color:#0f172a"><p style="font:700 22px Georgia,serif;color:#0b2540">MejorCrucero</p><h1 style="font-size:20px">${title}</h1><p>${intro}</p><table style="width:100%;border-collapse:collapse">${rows}</table><p style="color:#64748b;font-size:13px;margin-top:24px">Precios públicos de la web oficial de la naviera en el momento de la comprobación; pueden cambiar. Recibes esto porque creaste un aviso en mejorcrucero.com. <a href="${u}">Darme de baja</a>.</p></div>`;
  const text = `${title}\n\n${intro}\n\n${items.map((o) => `- ${o.t} · ${o.sn} · ${fecha(o.d)} desde ${o.p}: ${eurF(o.pr)} p.p. ${SITE}/salidas/${o.i}/`).join('\n')}\n\nDarme de baja: ${u}`;
  return { html, text };
}
async function enqueue(env, email, kind, key, subject, intro, items) {
  if (!items.length && kind !== 'review') return 0;
  const m = await mailBody(env, email, subject, intro, items.slice(0, 8));
  const r = await env.DB.prepare('INSERT OR IGNORE INTO outbox(email,kind,subject,html,text,k) VALUES(?,?,?,?,?,?)').bind(email, kind, subject, m.html, m.text, key).run();
  return r.meta?.changes || 0;
}
const isSeen = async (env, k) => !!(await env.DB.prepare('SELECT 1 FROM seen WHERE k=?').bind(k).first());
const markSeen = (env, k) => env.DB.prepare('INSERT OR IGNORE INTO seen(k) VALUES(?)').bind(k).run();
async function runAlerts(env) {
  const r = await fetch(SITE + '/data/ofertas.json');
  if (!r.ok) return { error: 'ofertas ' + r.status };
  const offers = await r.json();
  const today = new Date().toISOString().slice(0, 10);
  const blocked = new Set((await env.DB.prepare('SELECT email FROM unsub').all()).results.map((x) => x.email));
  const stats = { price: 0, criteria: 0, follow: 0 };
  const alerts = (await env.DB.prepare("SELECT id,email,kind,payload,created FROM alerts WHERE email IS NOT NULL AND kind IN ('price','criteria','watch')").all()).results;
  const okMail = new Set((await env.DB.prepare('SELECT email FROM confirmed').all()).results.map((x) => x.email));
  const SWITCH = '2026-10-25'; // las alertas anteriores a la doble confirmación siguen funcionando
  for (const a of alerts) {
    if (blocked.has(a.email)) continue;
    if (String(a.created) >= SWITCH && !okMail.has(a.email)) continue;
    let pl; try { pl = JSON.parse(a.payload); } catch { continue; }
    // Crucero ya reservado: avisar si la web oficial lo vende más barato que lo que pagó
    if (a.kind === 'price' && pl.ship && pl.date && pl.price) {
      for (const o of offers.filter((x) => x.d === pl.date && fold(x.sn) === fold(pl.ship) && x.pr < pl.price))
        stats.price += await enqueue(env, a.email, 'price', `price:${a.id}:${o.i}:${o.pr}`, `Tu crucero en el ${o.sn} ha bajado a ${eurF(o.pr)}`, `Pagaste ${eurF(pl.price)} por persona. Hoy la web oficial lo vende desde ${eurF(o.pr)}. Pregunta a tu agencia o a la naviera si tus condiciones permiten un ajuste de precio o crédito a bordo.`, [{ ...o, was: pl.price }]);
    }
    // Recordatorio para opinar al volver del crucero (una sola vez, entre 1 y 10 días después de la vuelta)
    if ((a.kind === 'price' || a.kind === 'watch') && /^\d{4}-\d{2}-\d{2}$/.test(String(pl.date || ''))) {
      const back = new Date(new Date(pl.date + 'T12:00:00Z').getTime() + ((+pl.nights || 7) + 1) * 864e5), age = (Date.now() - back.getTime()) / 864e5;
      if (age >= 0 && age <= 10 && !(await isSeen(env, `review:${a.id}`))) { await markSeen(env, `review:${a.id}`);
        stats.review = (stats.review || 0) + await enqueue(env, a.email, 'review', `review:${a.id}`, `¿Qué tal tu crucero${pl.ship ? ' en el ' + pl.ship : ''}?`, 'Has vuelto hace poco. Tu opinión ayuda a otros cruceristas a elegir: cuéntala en MejorCrucero en dos minutos (y si pegas tu confirmación, sale como opinión verificada): ' + SITE + '/barcos/' + (pl.ship ? String(pl.ship).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '/' : '') + '#foro', []); }
    }
    // Salida concreta vigilada: avisar si baja del precio que tenía al crear la alerta o del precio objetivo
    if (a.kind === 'watch' && pl.id) {
      const lim = +pl.target > 0 ? +pl.target : +pl.base - 1;
      const o = offers.find((x) => x.i === pl.id);
      if (o && lim > 0 && o.pr <= lim && !(await isSeen(env, `watch:${a.id}:${o.pr}`))) {
        await markSeen(env, `watch:${a.id}:${o.pr}`);
        stats.watch = (stats.watch || 0) + await enqueue(env, a.email, 'watch', `watch:${a.id}:${o.pr}`, `Ha bajado: ${o.t} en el ${o.sn}, ahora desde ${eurF(o.pr)}`, `Lo seguías desde ${eurF(+pl.base)}${+pl.target > 0 ? ` y querías que bajara de ${eurF(+pl.target)}` : ''}. Hoy la web oficial lo vende desde ${eurF(o.pr)} por persona.`, [{ ...o, was: +pl.base }]);
      }
    }
    // Alerta por destino / mes / presupuesto
    if (a.kind === 'criteria' && (pl.destino || pl.max || pl.mes)) {
      const mes = String(pl.mes || '');
      const fresh = [];
      for (const o of offers.filter((x) => (!pl.destino || x.dst === pl.destino) && (!pl.max || x.pr <= +pl.max) && (!mes || x.d.startsWith(mes) || +x.d.slice(5, 7) === +mes)).sort((x, y) => y.sc - x.sc)) {
        const k = `crit:${a.id}:${o.i}:${o.pr}`; if (!(await isSeen(env, k))) { fresh.push(o); await markSeen(env, k); }
      }
      stats.criteria += await enqueue(env, a.email, 'criteria', `crit:${a.id}:${today}`, `${fresh.length} ofertas que encajan con tu alerta`, 'Estas salidas cumplen lo que nos pediste (o han cambiado de precio desde la última vez). Ordenadas por nota de la oferta.', fresh);
    }
  }
  // Barcos seguidos: salidas nuevas (la primera pasada solo registra lo que ya había, sin email)
  const follows = (await env.DB.prepare("SELECT email, thread FROM follows WHERE thread LIKE 'barco:%'").all()).results;
  for (const f of follows) {
    if (blocked.has(f.email)) continue;
    const slug = f.thread.slice(6), init = `finit:${f.email}:${slug}`, first = !(await isSeen(env, init));
    const fresh = [];
    for (const o of offers.filter((x) => x.s === slug)) { const k = `f:${f.email}:${o.i}`; if (!(await isSeen(env, k))) { await markSeen(env, k); if (!first) fresh.push(o); } }
    if (first) await markSeen(env, init);
    else stats.follow += await enqueue(env, f.email, 'follow', `follow:${f.email}:${slug}:${today}`, `Nuevas salidas del ${fresh[0]?.sn || 'barco que sigues'}`, 'Han salido a la venta nuevas fechas del barco que sigues en MejorCrucero.', fresh);
  }
  // Lunes: resumen semanal de chollos para la newsletter y informe de visitas y clics para el administrador
  if (new Date().getUTCDay() === 1) {
    const wk = today; const top = [...offers].sort((x, y) => y.sc - x.sc).slice(0, 8);
    const subs = (await env.DB.prepare("SELECT DISTINCT email FROM leads WHERE created < ?").bind(SWITCH).all()).results.map((x) => x.email).concat((await env.DB.prepare('SELECT l.email FROM leads l JOIN confirmed c ON c.email=l.email').all()).results.map((x) => x.email));
    for (const e of [...new Set(subs)]) if (!blocked.has(e)) stats.weekly = (stats.weekly || 0) + await enqueue(env, e, 'weekly', `weekly:${e}:${wk}`, `Los ${top.length} chollos de cruceros de la semana`, 'Las salidas con mejor nota del precio esta semana, con el precio de la web oficial de cada naviera.', top);
    const admin = (await env.DB.prepare("SELECT value FROM settings WHERE key='admin_email'").first().catch(() => null))?.value;
    if (admin && !(await isSeen(env, 'report:' + wk))) { await markSeen(env, 'report:' + wk);
      const ev = (await env.DB.prepare("SELECT name, COUNT(*) n FROM events WHERE created > datetime('now','-7 days') GROUP BY name ORDER BY n DESC LIMIT 15").all()).results;
      const pg = (await env.DB.prepare("SELECT page, COUNT(*) n FROM events WHERE created > datetime('now','-7 days') AND name='aff' GROUP BY page ORDER BY n DESC LIMIT 10").all()).results;
      const nl = await env.DB.prepare("SELECT (SELECT COUNT(*) FROM leads WHERE created > datetime('now','-7 days')) leads, (SELECT COUNT(*) FROM alerts WHERE created > datetime('now','-7 days')) alerts, (SELECT COUNT(*) FROM posts WHERE created > datetime('now','-7 days')) posts, (SELECT COUNT(*) FROM outbox WHERE sent > datetime('now','-7 days')) mails").first();
      const rows = (l, k) => l.map((x) => `<tr><td style="padding:4px 8px">${String(x[k] || '-').replace(/</g, '&lt;')}</td><td style="padding:4px 8px;text-align:right">${x.n}</td></tr>`).join('');
      const html = `<div style="font-family:system-ui,Arial,sans-serif;max-width:640px;margin:auto"><h1 style="font-size:20px">MejorCrucero: informe semanal</h1><p>Últimos 7 días: ${nl.leads} suscriptores nuevos, ${nl.alerts} alertas, ${nl.posts} mensajes en la comunidad y ${nl.mails} emails enviados. ${offers.length} salidas publicadas.</p><h2 style="font-size:16px">Eventos</h2><table>${rows(ev, 'name')}</table><h2 style="font-size:16px">Páginas con más clics a naviera o agencia</h2><table>${rows(pg, 'page')}</table></div>`;
      await env.DB.prepare('INSERT OR IGNORE INTO outbox(email,kind,subject,html,text,k) VALUES(?,?,?,?,?,?)').bind(admin, 'report', `MejorCrucero: informe de la semana (${nl.leads} suscriptores, ${nl.alerts} alertas)`, html, html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '), 'report:' + wk).run(); }
  }
  return { offers: offers.length, queued: stats, sent: await sendOutbox(env) };
}
// Envío con Resend cuando estén RESEND_KEY y MAIL_FROM; si no, los emails esperan en la cola (outbox).
// Envío: por el puente de Supabase a Brevo (MC_EMAIL_URL + secreto MC_EMAIL_SECRET); si no está, Resend como antes.
async function sendOutbox(env) {
  if (env.MC_EMAIL_URL && env.MC_EMAIL_SECRET) {
    const rows = (await env.DB.prepare("SELECT * FROM outbox WHERE status='pending' ORDER BY id LIMIT 40").all()).results;
    let ok = 0;
    for (const m of rows) {
      const u = m.text.match(/Darme de baja: (\S+)/)?.[1];
      const res = await fetch(env.MC_EMAIL_URL + '/send', { method: 'POST', headers: { 'x-mc-secret': env.MC_EMAIL_SECRET, 'Content-Type': 'application/json' }, body: JSON.stringify({ to: m.email, subject: m.subject, html: m.html, text: m.text, unsubscribe: u }) });
      if (res.ok) { ok++; await env.DB.prepare("UPDATE outbox SET status='sent', sent=datetime('now') WHERE id=?").bind(m.id).run(); }
      else await env.DB.prepare("UPDATE outbox SET status='error', err=? WHERE id=?").bind((await res.text()).slice(0, 300), m.id).run();
    }
    return ok;
  }
  if (!env.RESEND_KEY || !env.MAIL_FROM) return 'en cola (falta el puente de email)';
  const rows = (await env.DB.prepare("SELECT * FROM outbox WHERE status='pending' ORDER BY id LIMIT 40").all()).results;
  let ok = 0;
  for (const m of rows) {
    const u = m.text.match(/Darme de baja: (\S+)/)?.[1];
    const res = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + env.RESEND_KEY, 'Content-Type': 'application/json', 'Idempotency-Key': 'mc-' + m.id },
      body: JSON.stringify({ from: env.MAIL_FROM, to: [m.email], subject: m.subject, html: m.html, text: m.text, headers: u ? { 'List-Unsubscribe': `<${u}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } : {} }) });
    if (res.ok) { ok++; await env.DB.prepare("UPDATE outbox SET status='sent', sent=datetime('now') WHERE id=?").bind(m.id).run(); }
    else await env.DB.prepare("UPDATE outbox SET status='error', err=? WHERE id=?").bind((await res.text()).slice(0, 300), m.id).run();
  }
  return ok;
}

export default {
  async fetch(req, env, ctx) {
    const allowed = (env.ALLOWED_ORIGINS || '*').split(',').map((s) => s.trim());
    const reqOrigin = req.headers.get('Origin') || '';
    const origin = allowed.includes('*') ? '*' : allowed.includes(reqOrigin) ? reqOrigin : allowed[0];
    if (req.method === 'OPTIONS') return json({}, 204, origin);
    const url = new URL(req.url);
    const p = url.pathname.replace(/\/+$/, '');
    const ip = req.headers.get('CF-Connecting-IP') || 'x';
    const ipHash = await sha(ip + (env.SALT || 'mc'));
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const R = (d, s) => json(d, s, origin);
    try {
      if (p === '/health') return R({ ok: true });
      if (p === '/unsub') {
        const e = clean(url.searchParams.get('e'), 254).toLowerCase();
        if (!EMAIL.test(e) || url.searchParams.get('t') !== (await unsubToken(env, e))) return new Response('Enlace no válido', { status: 400 });
        await env.DB.prepare('INSERT OR IGNORE INTO unsub(email) VALUES(?)').bind(e).run();
        await env.DB.prepare("UPDATE outbox SET status='unsub' WHERE email=? AND status='pending'").bind(e).run();
        return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Baja confirmada</title><body style="font-family:system-ui;max-width:520px;margin:60px auto;padding:0 16px"><h1>Baja confirmada</h1><p>No te enviaremos más avisos a este email.</p><p><a href="https://mejorcrucero.com/">Volver a MejorCrucero</a></p>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      }

      // --- Leads / newsletter / avisos
      if (p === '/lead' && req.method === 'POST') {
        if (body.website) return R({ ok: true }); // honeypot
        const email = clean(body.email, 254).toLowerCase();
        if (!EMAIL.test(email)) return R({ error: 'email' }, 400);
        if (await limited(env, 'lead:' + ipHash, 20, 60)) return R({ error: 'rate' }, 429);
        await env.DB.prepare('INSERT OR IGNORE INTO leads(email, source) VALUES(?,?)').bind(email, clean(body.source, 120)).run();
        await askConfirm(env, email); ctx.waitUntil(sendOutbox(env).catch(() => {}));
        return R({ ok: true });
      }
      // Operación interna: lanzar el motor de avisos ahora (protegido con el secreto del puente de email)
      if (p === '/ops/run-alerts' && req.method === 'POST') {
        if (!env.MC_EMAIL_SECRET || req.headers.get('x-mc-secret') !== env.MC_EMAIL_SECRET) return R({ error: 'forbidden' }, 403);
        return R(await runAlerts(env));
      }
      if (p === '/alert' && req.method === 'POST') {
        if (body.website) return R({ ok: true });
        const email = clean(body.email, 254).toLowerCase();
        if (email && !EMAIL.test(email)) return R({ error: 'email' }, 400);
        if (await limited(env, 'alert:' + ipHash, 30, 60)) return R({ error: 'rate' }, 429);
        const { website, email: _e, ...rest } = body;
        await env.DB.prepare('INSERT INTO alerts(email, kind, payload) VALUES(?,?,?)').bind(email || null, clean(body.kind || 'price', 40), JSON.stringify(rest).slice(0, 4000)).run();
        if (email) { await askConfirm(env, email); ctx.waitUntil(sendOutbox(env).catch(() => {})); }
        return R({ ok: true });
      }
      if (p === '/follow' && req.method === 'POST') {
        const email = clean(body.email, 254).toLowerCase();
        const thread = clean(body.thread, 140);
        if (!EMAIL.test(email) || !THREAD.test(thread)) return R({ error: 'datos' }, 400);
        await env.DB.prepare('INSERT OR IGNORE INTO follows(email, thread) VALUES(?,?)').bind(email, thread).run();
        return R({ ok: true });
      }

      // --- Usuarios (sin contraseña: id local + nombre)
      if (p === '/user' && req.method === 'POST') {
        const id = clean(body.id, 40);
        const name = clean(body.name, 40);
        if (!/^[a-z0-9]{16,40}$/.test(id) || name.length < 2) return R({ error: 'datos' }, 400);
        const cruises = Math.max(0, Math.min(500, parseInt(body.cruises) || 0));
        await env.DB.prepare('INSERT INTO users(id,name,cruises,lines) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, cruises=excluded.cruises, lines=excluded.lines')
          .bind(id, name, cruises, clean(body.lines, 200)).run();
        return R({ ok: true });
      }
      if (p === '/user' && req.method === 'GET') {
        const id = clean(url.searchParams.get('id'), 40);
        const u = await env.DB.prepare('SELECT id,name,cruises,lines,created,expert FROM users WHERE id=?').bind(id).first();
        if (!u) return R({ error: 'no' }, 404);
        const st = await env.DB.prepare("SELECT COUNT(*) posts, SUM(kind='cabin') cabins, SUM(kind='review') reviews FROM posts WHERE user_id=? AND hidden=0").bind(id).first();
        const posts = await env.DB.prepare('SELECT id,thread,kind,body,created FROM posts WHERE user_id=? AND hidden=0 ORDER BY id DESC LIMIT 30').bind(id).all();
        const refs = await env.DB.prepare("SELECT COUNT(DISTINCT variant) n FROM events WHERE name='ref' AND target=?").bind(id).first();
        const ver = await env.DB.prepare('SELECT COUNT(*) n FROM posts WHERE user_id=? AND verified=1 AND hidden=0').bind(id).first();
        const full = { ...u, posts: st.posts || 0, cabins: st.cabins || 0, reviews: st.reviews || 0, refs: refs.n || 0, verified: ver.n || 0 };
        return R({ user: { ...full, badges: badges(full) }, posts: posts.results });
      }
      if (p === '/leaderboard') {
        const r = await env.DB.prepare('SELECT u.id,u.name,u.cruises,COUNT(p.id) posts, SUM(p.votes) votes FROM users u JOIN posts p ON p.user_id=u.id AND p.hidden=0 GROUP BY u.id ORDER BY votes DESC, posts DESC LIMIT 25').all();
        return R({ users: r.results });
      }

      // --- Foro, reseñas, preguntas, camarotes, excursiones
      if (p === '/posts' && req.method === 'GET') {
        const thread = clean(url.searchParams.get('thread'), 140);
        if (!THREAD.test(thread) && !thread.endsWith(':*')) return R({ error: 'thread' }, 400);
        const like = thread.endsWith(':*');
        const q = like
          ? env.DB.prepare('SELECT id,thread,parent,user_id,name,kind,body,rating,cabin,video,votes,verified,created,(SELECT expert FROM users WHERE users.id=posts.user_id) expert FROM posts WHERE thread LIKE ? AND hidden=0 ORDER BY id DESC LIMIT 300').bind(thread.slice(0, -1) + '%')
          : env.DB.prepare('SELECT id,thread,parent,user_id,name,kind,body,rating,cabin,video,votes,verified,created,(SELECT expert FROM users WHERE users.id=posts.user_id) expert FROM posts WHERE thread=? AND hidden=0 ORDER BY votes DESC, id DESC LIMIT 300').bind(thread);
        const r = await q.all();
        const members = like ? { n: 0 } : await env.DB.prepare('SELECT COUNT(*) n FROM members WHERE thread=?').bind(thread).first();
        const summary = like ? null : await env.DB.prepare('SELECT body, posts FROM summaries WHERE thread=?').bind(thread).first();
        return R({ posts: r.results.map((x) => ({ ...x, rating: x.rating ? JSON.parse(x.rating) : null })), members: members.n, summary });
      }
      if (p === '/posts' && req.method === 'POST') {
        if (body.website) return R({ ok: true });
        const thread = clean(body.thread, 140), kind = clean(body.kind, 20), name = clean(body.name, 40);
        if (!THREAD.test(thread) || !KINDS.has(kind) || name.length < 2) return R({ error: 'datos' }, 400);
        const text = clean(body.body, 4000);
        const vm = YT.exec(clean(body.video, 300));
        if (text.length < 3 && !vm) return R({ error: 'texto' }, 400);
        if (/(https?:\/\/(?!(www\.)?(youtube\.com|youtu\.be)))/i.test(text) && text.split('http').length > 3) return R({ error: 'spam' }, 400);
        if (await limited(env, 'post:' + ipHash, 15, 60)) return R({ error: 'rate' }, 429);
        // Opiniones repetidas: el mismo texto (largo) ya publicado en los últimos 90 días
        if (text.length >= 40) { const dup = await env.DB.prepare("SELECT id FROM posts WHERE body=? AND created > datetime('now','-90 days') LIMIT 1").bind(text).first(); if (dup) return R({ error: 'repetido' }, 409); }
        let rating = null;
        if (body.rating && typeof body.rating === 'object') {
          rating = {};
          for (const k of ['general', 'comida', 'camarote', 'animacion', 'ninos', 'limpieza', 'repetiria']) {
            const v = Number(body.rating[k]);
            if (k === 'repetiria') { if (body.rating[k] != null) rating[k] = !!body.rating[k]; } else if (v >= 1 && v <= 5) rating[k] = Math.round(v);
          }
        }
        // Moderación automática con IA (Llama Guard). Si la IA falla, se publica y queda el sistema de reportes.
        let hidden = 0, mod = null;
        if (env.AI && text.length >= 3) {
          try {
            const g = await env.AI.run('@cf/meta/llama-guard-3-8b', { messages: [{ role: 'user', content: text.slice(0, 3000) }] });
            const res = g?.response; const unsafe = typeof res === 'object' ? res.safe === false : /unsafe/i.test(String(res));
            if (unsafe) { hidden = 1; mod = 'ia:' + JSON.stringify(res).slice(0, 120); }
          } catch {}
        }
        // Opinión verificada: el usuario pega su email de confirmación y comprobamos que es de este barco.
        let verified = 0;
        if (kind === 'review' && env.AI && body.proof && thread.startsWith('barco:')) {
          try {
            const out = await ai(env, { messages: [{ role: 'system', content: 'Extrae de este email de confirmación de crucero un JSON con: ship (nombre del barco) y date (fecha de salida YYYY-MM-DD). Si no es una confirmación de reserva de crucero, responde {"ship":null}. Responde SOLO el JSON.' }, { role: 'user', content: clean(body.proof, 6000) }], max_tokens: 120 });
            const m = /\{[\s\S]*\}/.exec(out.response || ''); const d = m ? JSON.parse(m[0]) : null;
            const norm = (x) => String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            const slug = thread.slice(7), sh = norm(d?.ship).replace(/^(ms|mv|msc-)?/, '');
            if (sh && sh.length > 3 && (slug.includes(sh) || sh.includes(slug.replace(/^msc-/, '')))) verified = 1;
          } catch {}
        }
        const key = clean(body.key, 64), eh = /^[a-z0-9]{20,64}$/.test(key) ? await sha('edit:' + key) : null;
        const r = await env.DB.prepare('INSERT INTO posts(thread,parent,user_id,name,kind,body,rating,cabin,video,ip_hash,hidden,mod,verified,edit_hash) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id')
          .bind(thread, body.parent ? parseInt(body.parent) : null, clean(body.user_id, 40) || null, name, kind, text, rating ? JSON.stringify(rating) : null, clean(body.cabin, 10) || null, vm ? vm[1] : null, ipHash, hidden, mod, verified, eh).first();
        return R({ ok: true, id: r.id, held: !!hidden, verified: !!verified });
      }
      // Editar (15 minutos) o borrar tu mensaje: solo con la clave secreta que guardó tu navegador al publicarlo
      if ((p === '/posts/edit' || p === '/posts/delete') && req.method === 'POST') {
        const id = parseInt(body.id), key = clean(body.key, 64);
        if (!id || !/^[a-z0-9]{20,64}$/.test(key)) return R({ error: 'datos' }, 400);
        const row = await env.DB.prepare("SELECT id, edit_hash, created > datetime('now','-15 minutes') fresh FROM posts WHERE id=?").bind(id).first();
        if (!row || !row.edit_hash || row.edit_hash !== await sha('edit:' + key)) return R({ error: 'permiso' }, 403);
        if (p === '/posts/delete') { await env.DB.prepare("UPDATE posts SET hidden=1, mod='borrado por su autor' WHERE id=?").bind(id).run(); return R({ ok: true }); }
        if (!row.fresh) return R({ error: 'tarde' }, 403);
        const text = clean(body.body, 4000); if (text.length < 3) return R({ error: 'texto' }, 400);
        await env.DB.prepare('UPDATE posts SET body=? WHERE id=?').bind(text, id).run();
        return R({ ok: true });
      }
      // Encuestas rápidas: un voto por persona (hash de la IP), resultados agregados
      if (p === '/poll') {
        const poll = clean(req.method === 'POST' ? body.poll : url.searchParams.get('poll'), 40);
        if (!/^[a-z0-9-]{3,40}$/.test(poll)) return R({ error: 'datos' }, 400);
        if (req.method === 'POST') { const opt = clean(body.option, 40); if (!/^[a-z0-9-]{1,40}$/.test(opt)) return R({ error: 'datos' }, 400); await env.DB.prepare('INSERT OR IGNORE INTO polls(poll, option, voter) VALUES(?,?,?)').bind(poll, opt, ipHash).run(); }
        const r = await env.DB.prepare('SELECT option, COUNT(*) n FROM polls WHERE poll=? GROUP BY option').bind(poll).all();
        return R({ results: Object.fromEntries(r.results.map((x) => [x.option, x.n])) });
      }
      // Cuántas personas vigilan una salida (para la ficha)
      if (p === '/watchers') {
        const id = clean(url.searchParams.get('id'), 120);
        const r = await env.DB.prepare("SELECT COUNT(DISTINCT email) n FROM alerts WHERE kind='watch' AND json_extract(payload,'$.id')=?").bind(id).first();
        return R({ n: r?.n || 0 });
      }
      // Doble confirmación del email: el enlace del correo de bienvenida lo marca como confirmado
      if (p === '/confirm') {
        const e = clean(url.searchParams.get('e'), 254).toLowerCase();
        if (!EMAIL.test(e) || url.searchParams.get('t') !== (await confirmToken(env, e))) return new Response('Enlace no válido', { status: 400 });
        await env.DB.prepare('INSERT OR IGNORE INTO confirmed(email) VALUES(?)').bind(e).run();
        return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Email confirmado</title><body style="font-family:system-ui;max-width:520px;margin:60px auto;padding:0 16px"><h1>¡Email confirmado!</h1><p>Ya te llegarán los avisos que has pedido. Puedes darte de baja desde cualquier correo.</p><p><a href="' + SITE + '/">Volver a MejorCrucero</a></p>', { headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Content-Type-Options': 'nosniff' } });
      }
      if (p === '/vote' && req.method === 'POST') {
        const id = parseInt(body.id);
        const ins = await env.DB.prepare('INSERT OR IGNORE INTO votes(post_id, voter) VALUES(?,?)').bind(id, ipHash).run();
        if (ins.meta.changes) await env.DB.prepare('UPDATE posts SET votes=votes+1 WHERE id=?').bind(id).run();
        return R({ ok: true });
      }
      if (p === '/report' && req.method === 'POST') {
        if (await limited(env, 'rep:' + ipHash, 20, 60)) return R({ error: 'rate' }, 429);
        const target = clean(body.target, 200);
        await env.DB.prepare('INSERT INTO reports(target, reason, page) VALUES(?,?,?)').bind(target, clean(body.reason, 1000), clean(body.page, 300)).run();
        const m = /^post:(\d+)$/.exec(target);
        if (m) await env.DB.prepare('UPDATE posts SET reports=reports+1, hidden=CASE WHEN reports+1>=3 THEN 1 ELSE hidden END WHERE id=?').bind(parseInt(m[1])).run();
        return R({ ok: true });
      }
      if (p === '/join' && req.method === 'POST') {
        const thread = clean(body.thread, 140), uid = clean(body.user_id, 40), name = clean(body.name, 40);
        if (!thread.startsWith('salida:') || !THREAD.test(thread) || !uid || name.length < 2) return R({ error: 'datos' }, 400);
        await env.DB.prepare('INSERT OR IGNORE INTO members(thread,user_id,name) VALUES(?,?,?)').bind(thread, uid, name).run();
        const n = await env.DB.prepare('SELECT COUNT(*) n FROM members WHERE thread=?').bind(thread).first();
        return R({ ok: true, members: n.n });
      }
      // Nota de la comunidad por barco (para el MejorCrucero Score)
      if (p === '/ratings') {
        const r = await env.DB.prepare("SELECT thread, AVG(json_extract(rating,'$.general')) avg, COUNT(*) n, SUM(verified) v FROM posts WHERE kind='review' AND hidden=0 AND rating IS NOT NULL AND json_extract(rating,'$.general') IS NOT NULL AND thread LIKE 'barco:%' GROUP BY thread").all();
        return R(Object.fromEntries(r.results.map((x) => [x.thread, { avg: Math.round(x.avg * 100) / 100, n: x.n, v: x.v || 0 }])));
      }
      // Avisos: respuestas a mis mensajes desde una fecha
      if (p === '/notifications') {
        const uid = clean(url.searchParams.get('user_id'), 40), since = clean(url.searchParams.get('since'), 25) || '1970-01-01';
        if (!/^[a-z0-9]{16,40}$/.test(uid)) return R({ items: [] });
        const r = await env.DB.prepare("SELECT c.id, c.thread, c.name, c.kind, substr(c.body,1,140) body, c.created FROM posts c JOIN posts m ON c.parent=m.id WHERE m.user_id=? AND (c.user_id IS NULL OR c.user_id<>?) AND c.hidden=0 AND c.created>? ORDER BY c.id DESC LIMIT 30").bind(uid, uid, since).all();
        return R({ items: r.results });
      }
      // Referidos: quién trae a quién (para insignias y retos)
      if (p === '/ref' && req.method === 'POST') {
        const code = clean(body.code, 40), uid = clean(body.user_id, 40);
        if (!/^[a-z0-9]{16,40}$/.test(code) || code === uid) return R({ ok: false });
        if (await limited(env, 'ref:' + ipHash, 3, 1440)) return R({ ok: true });
        await env.DB.prepare('INSERT INTO events(name,page,target,variant) VALUES(?,?,?,?)').bind('ref', clean(body.page, 200), code, ipHash.slice(0, 12)).run();
        return R({ ok: true });
      }
      if (p === '/stats') {
        const thread = clean(url.searchParams.get('thread'), 140);
        const r = await env.DB.prepare("SELECT rating FROM posts WHERE thread=? AND kind='review' AND hidden=0 AND rating IS NOT NULL").bind(thread).all();
        const acc = {}; let rep = [0, 0];
        for (const row of r.results) {
          const o = JSON.parse(row.rating);
          for (const [k, v] of Object.entries(o)) {
            if (k === 'repetiria') { rep[0] += v ? 1 : 0; rep[1]++; continue; }
            acc[k] = acc[k] || [0, 0]; acc[k][0] += v; acc[k][1]++;
          }
        }
        return R({ reviews: r.results.length, avg: Object.fromEntries(Object.entries(acc).map(([k, [s, n]]) => [k, Math.round((s / n) * 10) / 10])), repetiria: rep[1] ? Math.round((rep[0] / rep[1]) * 100) : null });
      }

      // --- Analítica propia (sin cookies): clics a afiliados, A/B, páginas
      if (p === '/evt' && req.method === 'POST') {
        if (await limited(env, 'evt:' + ipHash, 300, 60)) return R({ ok: true });
        await env.DB.prepare('INSERT INTO events(name,page,target,variant) VALUES(?,?,?,?)').bind(clean(body.name, 40), clean(body.page, 200), clean(body.target, 300), clean(body.variant, 40)).run();
        return R({ ok: true });
      }

      // --- IA: resumen de opiniones y asistente (Workers AI, si está enlazado)
      if (p === '/summary' && req.method === 'GET') {
        const thread = clean(url.searchParams.get('thread'), 140);
        if (!env.AI || !THREAD.test(thread)) return R({ summary: null });
        const cached = await env.DB.prepare('SELECT body, posts, created FROM summaries WHERE thread=?').bind(thread).first();
        const r = await env.DB.prepare("SELECT body FROM posts WHERE thread=? AND kind IN ('review','comment') AND hidden=0 ORDER BY id DESC LIMIT 60").bind(thread).all();
        if (r.results.length < 5) return R({ summary: null, need: 5 - r.results.length });
        if (cached && cached.posts === r.results.length) return R({ summary: cached.body });
        const prompt = `Resume en español, en dos listas cortas ("A favor" y "En contra", máximo 4 puntos cada una), SOLO lo que dicen estas opiniones reales de cruceristas. No inventes nada.\n\n${r.results.map((x) => '- ' + x.body).join('\n').slice(0, 9000)}`;
        const out = await ai(env, { messages: [{ role: 'user', content: prompt }], max_tokens: 400 });
        await env.DB.prepare('INSERT OR REPLACE INTO summaries(thread, body, posts) VALUES(?,?,?)').bind(thread, out.response, r.results.length).run();
        return R({ summary: out.response });
      }
      if (p === '/ask' && req.method === 'POST') {
        if (!env.AI) return R({ answer: null });
        if (await limited(env, 'ask:' + ipHash, 20, 60)) return R({ error: 'rate' }, 429);
        const q = clean(body.q, 600);
        const ctx = clean(body.context, 6000);
        const sys = 'Eres el asistente de MejorCrucero.com. Ayudas a elegir crucero en español. Usa SOLO los datos de barcos del contexto; si no sabes algo (precios, fechas, itinerarios), dilo y sugiere usar las herramientas de la web. Responde breve, directo y con hasta 3 barcos recomendados, cada uno con su motivo. Nombra los barcos exactamente como aparecen en el contexto.';
        const out = await ai(env, { messages: [{ role: 'system', content: sys + '\n\nContexto:\n' + ctx }, { role: 'user', content: q }], max_tokens: 500 });
        return R({ answer: out.response });
      }
      if (p === '/parse-booking' && req.method === 'POST') {
        if (!env.AI) return R({ data: null });
        if (await limited(env, 'parse:' + ipHash, 20, 60)) return R({ error: 'rate' }, 429);
        const text = clean(body.text, 8000);
        const out = await ai(env, { messages: [{ role: 'system', content: 'Extrae de este email de confirmación de crucero un JSON con: ship (nombre del barco), date (fecha de salida YYYY-MM-DD), price (importe total en número), cabin (Interior|Exterior|Balcón|Suite), where (vendedor). Si un dato no aparece, pon null. Responde SOLO el JSON.' }, { role: 'user', content: text }], max_tokens: 200 });
        const m = /\{[\s\S]*\}/.exec(out.response || '');
        let data = null; try { data = m ? JSON.parse(m[0]) : null; } catch {}
        return R({ data });
      }

      // --- Administración
      if (p.startsWith('/admin/')) {
        if (!env.ADMIN_TOKEN || req.headers.get('Authorization') !== 'Bearer ' + env.ADMIN_TOKEN) return R({ error: 'auth' }, 401);
        if (p === '/admin/expert') { await env.DB.prepare('UPDATE users SET expert=? WHERE id=?').bind(body.expert ? 1 : 0, clean(body.user_id, 40)).run(); return R({ ok: true }); }
        if (p === '/admin/hide') { await env.DB.prepare('UPDATE posts SET hidden=? WHERE id=?').bind(body.hidden ? 1 : 0, parseInt(body.id)).run(); return R({ ok: true }); }
        if (p === '/admin/overview') {
          const one = async (sql) => (await env.DB.prepare(sql).first()).n;
          return R({ leads: await one('SELECT COUNT(*) n FROM leads'), alerts: await one('SELECT COUNT(*) n FROM alerts'), posts: await one('SELECT COUNT(*) n FROM posts'), reports: await one('SELECT COUNT(*) n FROM reports'),
            clicks7d: (await env.DB.prepare("SELECT target, COUNT(*) n FROM events WHERE name='aff_click' AND created > datetime('now','-7 days') GROUP BY target ORDER BY n DESC LIMIT 30").all()).results });
        }
        if (p === '/admin/funnel') {
          const days = Math.min(90, parseInt(url.searchParams.get('days')) || 30);
          const ev = (await env.DB.prepare("SELECT name, COUNT(*) n FROM events WHERE created > datetime('now', ?) GROUP BY name ORDER BY n DESC").bind(`-${days} days`).all()).results;
          const pages = (await env.DB.prepare("SELECT page, COUNT(*) n FROM events WHERE name='aff_click' AND created > datetime('now', ?) GROUP BY page ORDER BY n DESC LIMIT 20").bind(`-${days} days`).all()).results;
          const ab = (await env.DB.prepare("SELECT target, variant, COUNT(*) n FROM events WHERE name IN ('ab_view','ab_click') AND created > datetime('now', ?) GROUP BY name, target, variant").bind(`-${days} days`).all()).results;
          const leads = (await env.DB.prepare("SELECT source, COUNT(*) n FROM leads WHERE created > datetime('now', ?) GROUP BY source ORDER BY n DESC LIMIT 30").bind(`-${days} days`).all()).results;
          return R({ days, events: ev, affPages: pages, ab, leads });
        }
        if (p === '/admin/queue') return R((await env.DB.prepare('SELECT id,thread,name,kind,body,reports,mod,created FROM posts WHERE hidden=1 OR reports>0 ORDER BY id DESC LIMIT 200').all()).results);
        if (p === '/admin/reports') return R((await env.DB.prepare('SELECT * FROM reports ORDER BY id DESC LIMIT 500').all()).results);
        if (p === '/admin/leads') return R((await env.DB.prepare('SELECT * FROM leads ORDER BY id DESC LIMIT 5000').all()).results);
        if (p === '/admin/run-alerts') return R(await runAlerts(env));
        if (p === '/admin/outbox') return R((await env.DB.prepare('SELECT id,email,kind,subject,status,err,created,sent FROM outbox ORDER BY id DESC LIMIT 500').all()).results);
        if (p === '/admin/clicks') {
          const days = Math.min(365, parseInt(url.searchParams.get('days')) || 30), w = `-${days} days`;
          const q = async (sql) => (await env.DB.prepare(sql).bind(w).all()).results;
          return R({ days,
            byPartner: await q("SELECT substr(target,1,instr(target||' ',' ')-1) partner, COUNT(*) n FROM events WHERE name='aff_click' AND created > datetime('now', ?) GROUP BY partner ORDER BY n DESC"),
            byPage: await q("SELECT substr(target,instr(target,' ')+1) page, COUNT(*) n FROM events WHERE name='aff_click' AND created > datetime('now', ?) GROUP BY page ORDER BY n DESC LIMIT 50"),
            byDay: await q("SELECT date(created) d, COUNT(*) n FROM events WHERE name='aff_click' AND created > datetime('now', ?) GROUP BY d ORDER BY d") });
        }
        if (p === '/admin/alerts') return R((await env.DB.prepare('SELECT * FROM alerts ORDER BY id DESC LIMIT 5000').all()).results);
      }
      return R({ error: 'not found' }, 404);
    } catch (e) {
      return R({ error: 'server', detail: String(e).slice(0, 200) }, 500);
    }
  },
  async scheduled(event, env, ctx) { ctx.waitUntil(runAlerts(env).catch(() => {})); },
};
