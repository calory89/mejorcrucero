// MejorCrucero API — Cloudflare Worker + D1 (+ Workers AI opcional)
// Bindings: DB (D1), AI (Workers AI, opcional), ADMIN_TOKEN (secret), ALLOWED_ORIGINS (texto, separado por comas)
const json = (data, status = 200, origin = '*') => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Cache-Control': 'no-store' },
});
const clean = (s, max = 2000) => String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
const YT = /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
const KINDS = new Set(['comment', 'review', 'question', 'answer', 'cabin', 'excursion', 'diary', 'poll']);
const THREAD = /^(barco|salida|camarote|perfil|guia|naviera|puerto):[a-z0-9:-]{1,120}$/;

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
  if (u.cabins >= 1) b.push('Reportero de camarotes');
  return b;
}

export default {
  async fetch(req, env) {
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

      // --- Leads / newsletter / avisos
      if (p === '/lead' && req.method === 'POST') {
        if (body.website) return R({ ok: true }); // honeypot
        const email = clean(body.email, 254).toLowerCase();
        if (!EMAIL.test(email)) return R({ error: 'email' }, 400);
        if (await limited(env, 'lead:' + ipHash, 20, 60)) return R({ error: 'rate' }, 429);
        await env.DB.prepare('INSERT OR IGNORE INTO leads(email, source) VALUES(?,?)').bind(email, clean(body.source, 120)).run();
        return R({ ok: true });
      }
      if (p === '/alert' && req.method === 'POST') {
        if (body.website) return R({ ok: true });
        const email = clean(body.email, 254).toLowerCase();
        if (email && !EMAIL.test(email)) return R({ error: 'email' }, 400);
        if (await limited(env, 'alert:' + ipHash, 30, 60)) return R({ error: 'rate' }, 429);
        const { website, email: _e, ...rest } = body;
        await env.DB.prepare('INSERT INTO alerts(email, kind, payload) VALUES(?,?,?)').bind(email || null, clean(body.kind || 'price', 40), JSON.stringify(rest).slice(0, 4000)).run();
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
        const u = await env.DB.prepare('SELECT id,name,cruises,lines,created FROM users WHERE id=?').bind(id).first();
        if (!u) return R({ error: 'no' }, 404);
        const st = await env.DB.prepare("SELECT COUNT(*) posts, SUM(kind='cabin') cabins FROM posts WHERE user_id=? AND hidden=0").bind(id).first();
        const posts = await env.DB.prepare('SELECT id,thread,kind,body,created FROM posts WHERE user_id=? AND hidden=0 ORDER BY id DESC LIMIT 30').bind(id).all();
        const full = { ...u, posts: st.posts || 0, cabins: st.cabins || 0 };
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
          ? env.DB.prepare('SELECT id,thread,parent,user_id,name,kind,body,rating,cabin,video,votes,created FROM posts WHERE thread LIKE ? AND hidden=0 ORDER BY id DESC LIMIT 300').bind(thread.slice(0, -1) + '%')
          : env.DB.prepare('SELECT id,thread,parent,user_id,name,kind,body,rating,cabin,video,votes,created FROM posts WHERE thread=? AND hidden=0 ORDER BY votes DESC, id DESC LIMIT 300').bind(thread);
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
        let rating = null;
        if (body.rating && typeof body.rating === 'object') {
          rating = {};
          for (const k of ['general', 'comida', 'camarote', 'animacion', 'ninos', 'limpieza', 'repetiria']) {
            const v = Number(body.rating[k]);
            if (k === 'repetiria') { if (body.rating[k] != null) rating[k] = !!body.rating[k]; } else if (v >= 1 && v <= 5) rating[k] = Math.round(v);
          }
        }
        const r = await env.DB.prepare('INSERT INTO posts(thread,parent,user_id,name,kind,body,rating,cabin,video,ip_hash) VALUES(?,?,?,?,?,?,?,?,?,?) RETURNING id')
          .bind(thread, body.parent ? parseInt(body.parent) : null, clean(body.user_id, 40) || null, name, kind, text, rating ? JSON.stringify(rating) : null, clean(body.cabin, 10) || null, vm ? vm[1] : null, ipHash).first();
        return R({ ok: true, id: r.id });
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
        const out = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', { messages: [{ role: 'user', content: prompt }], max_tokens: 400 });
        await env.DB.prepare('INSERT OR REPLACE INTO summaries(thread, body, posts) VALUES(?,?,?)').bind(thread, out.response, r.results.length).run();
        return R({ summary: out.response });
      }
      if (p === '/ask' && req.method === 'POST') {
        if (!env.AI) return R({ answer: null });
        if (await limited(env, 'ask:' + ipHash, 20, 60)) return R({ error: 'rate' }, 429);
        const q = clean(body.q, 600);
        const ctx = clean(body.context, 6000);
        const sys = 'Eres el asistente de MejorCrucero.com. Ayudas a elegir crucero en español. Usa SOLO los datos de barcos del contexto; si no sabes algo (precios, fechas, itinerarios), dilo y sugiere usar las herramientas de la web. Responde breve, directo y con hasta 3 barcos recomendados, cada uno con su motivo. Nombra los barcos exactamente como aparecen en el contexto.';
        const out = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', { messages: [{ role: 'system', content: sys + '\n\nContexto:\n' + ctx }, { role: 'user', content: q }], max_tokens: 500 });
        return R({ answer: out.response });
      }
      if (p === '/parse-booking' && req.method === 'POST') {
        if (!env.AI) return R({ data: null });
        if (await limited(env, 'parse:' + ipHash, 20, 60)) return R({ error: 'rate' }, 429);
        const text = clean(body.text, 8000);
        const out = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', { messages: [{ role: 'system', content: 'Extrae de este email de confirmación de crucero un JSON con: ship (nombre del barco), date (fecha de salida YYYY-MM-DD), price (importe total en número), cabin (Interior|Exterior|Balcón|Suite), where (vendedor). Si un dato no aparece, pon null. Responde SOLO el JSON.' }, { role: 'user', content: text }], max_tokens: 200 });
        const m = /\{[\s\S]*\}/.exec(out.response || '');
        let data = null; try { data = m ? JSON.parse(m[0]) : null; } catch {}
        return R({ data });
      }

      // --- Administración
      if (p.startsWith('/admin/')) {
        if (!env.ADMIN_TOKEN || req.headers.get('Authorization') !== 'Bearer ' + env.ADMIN_TOKEN) return R({ error: 'auth' }, 401);
        if (p === '/admin/hide') { await env.DB.prepare('UPDATE posts SET hidden=? WHERE id=?').bind(body.hidden ? 1 : 0, parseInt(body.id)).run(); return R({ ok: true }); }
        if (p === '/admin/overview') {
          const one = async (sql) => (await env.DB.prepare(sql).first()).n;
          return R({ leads: await one('SELECT COUNT(*) n FROM leads'), alerts: await one('SELECT COUNT(*) n FROM alerts'), posts: await one('SELECT COUNT(*) n FROM posts'), reports: await one('SELECT COUNT(*) n FROM reports'),
            clicks7d: (await env.DB.prepare("SELECT target, COUNT(*) n FROM events WHERE name='aff_click' AND created > datetime('now','-7 days') GROUP BY target ORDER BY n DESC LIMIT 30").all()).results });
        }
        if (p === '/admin/leads') return R((await env.DB.prepare('SELECT * FROM leads ORDER BY id DESC LIMIT 5000').all()).results);
        if (p === '/admin/alerts') return R((await env.DB.prepare('SELECT * FROM alerts ORDER BY id DESC LIMIT 5000').all()).results);
      }
      return R({ error: 'not found' }, 404);
    } catch (e) {
      return R({ error: 'server', detail: String(e).slice(0, 200) }, 500);
    }
  },
};
