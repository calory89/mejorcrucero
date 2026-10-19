// Importa salidas y precios a src/data/sailings.json desde un feed JSON normalizado.
// FEED_URL debe devolver un array con el esquema documentado en docs/feed.md.
// Cuando tengamos el XML de Crucerosnet / Logitravel o la API de Widgety, se añade aquí su adaptador.
import fs from 'node:fs';
const url = process.env.FEED_URL;
if (!url) { console.log('Sin FEED_URL: no se importa nada'); process.exit(0); }
const prev = JSON.parse(fs.readFileSync('src/data/sailings.json', 'utf8') || '[]');
const r = await fetch(url, { headers: process.env.FEED_TOKEN ? { Authorization: 'Bearer ' + process.env.FEED_TOKEN } : {} });
if (!r.ok) { console.error('Feed no disponible', r.status); process.exit(0); }
const data = await r.json();
const today = new Date().toISOString().slice(0, 10);
const out = data.filter((x) => x.id && x.ship && x.date >= today && x.nights > 0 && x.prices).map((x) => {
  const old = prev.find((o) => o.id === x.id);
  const min = Math.min(...Object.values(x.prices).filter((v) => v > 0));
  const history = [...(old?.history || [])];
  if (!history.length || history[history.length - 1].price !== min) history.push({ date: today, price: min });
  return { ...x, history: history.slice(-60), updated: new Date().toISOString() };
});
fs.writeFileSync('src/data/sailings.json', JSON.stringify(out));
console.log('Salidas importadas:', out.length);
