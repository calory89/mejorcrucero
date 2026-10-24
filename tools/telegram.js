// Publica los chollos nuevos en un canal de Telegram. APAGADO hasta que existan TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID.
// Uso (tras el build): node tools/telegram.js   ·   Guarda lo ya publicado en src/data/telegram-posted.json (máx. 5 por ejecución).
import fs from 'node:fs';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN, CHAT = process.env.TELEGRAM_CHAT_ID;
if (!TOKEN || !CHAT) { console.log('Telegram apagado (falta TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID)'); process.exit(0); }
const SITE = process.env.SITE || 'https://mejorcrucero.com';
const POSTED = 'src/data/telegram-posted.json';
const posted = new Set((() => { try { return JSON.parse(fs.readFileSync(POSTED, 'utf8')); } catch { return []; } })());
const deals = JSON.parse(fs.readFileSync('dist/data/chollos.json', 'utf8'));
const eur = (n) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const esc = (t) => String(t).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
const fresh = deals.filter((d) => d.score >= 85 && !posted.has(`${d.id}:${d.price}`)).slice(0, 5);
let n = 0;
for (const d of fresh) {
  const date = new Date(d.date + 'T12:00:00Z').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  const text = `🚢 <b>${esc(d.title)}</b>\n📅 ${date} · desde ${esc(d.depart_port)}\n💶 Desde <b>${eur(d.price)}</b> por persona${d.real_price && d.real_price !== d.price ? ` (real ${eur(d.real_price)})` : ''}\n⭐ Nota del precio: ${d.score}/100 · ${esc(d.label)}\n\n${SITE}/salidas/${d.id}/?utm_source=telegram`;
  const body = { chat_id: CHAT, text, parse_mode: 'HTML', disable_web_page_preview: false };
  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (r.ok) { posted.add(`${d.id}:${d.price}`); n++; } else console.error('Telegram respondió', r.status);
  await new Promise((res) => setTimeout(res, 1500));
}
fs.writeFileSync(POSTED, JSON.stringify([...posted].slice(-2000)));
console.log(`Telegram: ${n} chollos publicados`);
