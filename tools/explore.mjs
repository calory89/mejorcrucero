// Exploración 3 (solo rama "exploracion"): buscadores oficiales de más navieras. Solo lectura normal de páginas públicas;
// si una web bloquea el acceso automático, se anota y NO se intenta saltar el bloqueo.
import fs from 'node:fs';
import { chromium } from 'playwright';
fs.mkdirSync('explore', { recursive: true });
const SITES = {
  virgin: 'https://www.virginvoyages.com/book/voyage-planner/find-a-voyage',
  viking: 'https://www.vikingcruises.com/oceans/search-cruises/index.html',
  princess: 'https://www.princess.com/cruise-search/results/',
  hal: 'https://www.hollandamerica.com/en/us/cruise-search',
  explora: 'https://www.explorajourneys.com/es/es/cruceros',
  celestyal: 'https://celestyal.com/es/cruises/',
  hx: 'https://www.hx.com/es/cruceros/',
  ponant: 'https://www.ponant.com/es/cruceros',
  marella: 'https://www.tui.co.uk/cruise/search',
  aida: 'https://aida.de/kreuzfahrt/reise-buchen',
  costa_it: 'https://www.costacrociere.it/',
  ncl_uk: 'https://www.ncl.com/uk/en/vacations',
};
const out = {};
const browser = await chromium.launch();
for (const [name, url] of Object.entries(SITES)) {
  const ctx = await browser.newContext({ locale: 'es-ES', viewport: { width: 1366, height: 900 }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36' });
  const page = await ctx.newPage(); const hits = [];
  page.on('response', async (r) => { try { const ct = r.headers()['content-type'] || ''; if (!/json/.test(ct)) return; const b = await r.text(); if (b.length < 1500) return; let keys = null; try { const j = JSON.parse(b); keys = Object.keys(Array.isArray(j) ? j[0] || {} : j).slice(0, 25); } catch {} hits.push({ url: r.url().slice(0, 400), method: r.request().method(), status: r.status(), size: b.length, keys, post: (r.request().postData() || '').slice(0, 1500), sample: b.slice(0, 2500) }); } catch {} });
  let info;
  try { const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); await page.waitForTimeout(6000); for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, 1500); await page.waitForTimeout(1500); } await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {}); info = { status: resp?.status(), final: page.url(), title: await page.title(), text: (await page.innerText('body').catch(() => '')).slice(0, 600) }; } catch (e) { info = { error: String(e).slice(0, 200) }; }
  out[name] = { info, hits: hits.sort((a, b) => b.size - a.size).slice(0, 12) };
  console.log(name, info.status, info.title, hits.length);
  await ctx.close();
}
fs.writeFileSync('explore/explore3.json', JSON.stringify(out, null, 1));
await browser.close();
