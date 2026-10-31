// Pruebas en navegador (Playwright) contra la web publicada o un servidor local.
// Uso: BASE_URL=https://mejorcrucero.com node test/browser.mjs   (sale con código 1 si algo falla)
// Comprueba: listado (cargar más, ordenar, fotos sin repetir, sin errores JS), puerto más cercano, ficha de barco, oferta y mapa de puertos.
// Guarda capturas en shots/ para revisar a ojo.
const { chromium, devices } = (await import(process.env.PW || 'playwright')).default || (await import(process.env.PW || 'playwright'));
import fs from 'node:fs';
const BASE = (process.env.BASE_URL || 'http://127.0.0.1:8811').replace(/\/$/, '');
const fails = [], ok = [];
const b = await chromium.launch();
const ctx = await b.newContext({ ...devices['iPhone 13'], locale: 'es-ES', geolocation: { latitude: 40.42, longitude: -3.7 }, permissions: ['geolocation'] });
fs.mkdirSync('shots', { recursive: true });
const page = async (u) => { const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); await p.goto(BASE + u, { waitUntil: 'networkidle', timeout: 60000 }); return { p, errs }; };
const check = (name, cond, extra = '') => (cond ? ok : fails).push(name + (extra ? ` (${extra})` : ''));
const vis = (p) => p.evaluate(() => { const ims = [...document.querySelectorAll('#offer-grid .offer-card:not([hidden]) img.ship-photo')]; const s = ims.map((i) => i.getAttribute('src')); return { n: ims.length, uniq: new Set(s).size }; });
try {
  { const { p, errs } = await page('/ofertas/'); let v = await vis(p); check('listado: tarjetas', v.n >= 12, v.n); check('listado: fotos sin repetir', v.uniq === v.n, `${v.uniq}/${v.n}`);
    await p.click('.js-more'); await p.waitForTimeout(3000); v = await vis(p); check('listado: cargar más', v.n >= 40, v.n); check('listado: fotos sin repetir tras cargar más', v.uniq >= v.n - 2, `${v.uniq}/${v.n}`);
    await p.selectOption('.offer-filter select[name=o]', 'price'); await p.waitForTimeout(800);
    const pr = await p.evaluate(() => [...document.querySelectorAll('#offer-grid .offer-card:not([hidden])')].slice(0, 10).map((c) => +c.dataset.price)); check('listado: ordenar por precio', pr.every((x, i) => !i || x >= pr[i - 1]), pr.slice(0, 4).join(','));
    await p.selectOption('.offer-filter select[name=o]', 'near'); await p.waitForTimeout(3000);
    const w = await p.evaluate(() => document.querySelector('#offer-grid .offer-card:not([hidden]) .card-when')?.textContent || ''); check('listado: puerto más cercano (desde Madrid)', /Valencia|Barcelona|Málaga|Alicante|Palma|Cádiz|Tarragona|Bilbao|Vigo/.test(w), w.trim().slice(0, 60));
    await p.screenshot({ path: 'shots/ofertas.png' }); check('listado: sin errores JS', !errs.length, errs[0]); }
  { const { p, errs } = await page('/barcos/norwegian-prima/'); check('ficha: barra de reserva', await p.locator('.m-cta').count() === 1); check('ficha: sin errores JS', !errs.length, errs[0]); await p.screenshot({ path: 'shots/barco.png', fullPage: false }); }
  { const { p, errs } = await page('/ofertas/chollos/'); const href = await p.getAttribute('#offer-grid .offer-card', 'href'); const r = await page(href.replace(/^https?:\/\/[^/]+/, '')); check('oferta: botón reservar', await r.p.locator('.m-cta .btn').count() >= 1); check('oferta: qué incluye', await r.p.locator('#incluye').count() <= 1); check('oferta: sin errores JS', !r.errs.length && !errs.length, r.errs[0] || errs[0]); await r.p.screenshot({ path: 'shots/oferta.png' }); }
  { const { p, errs } = await page('/puertos/'); await p.click('.js-map2'); await p.waitForTimeout(6000); const m = await p.locator('.leaflet-interactive').count(); check('mapa de puertos', m >= 10, m); check('puertos: sin errores JS', !errs.length, errs[0]); }
  { const { p, errs } = await page('/'); await p.screenshot({ path: 'shots/portada.png' }); check('portada: sin errores JS', !errs.length, errs[0]); }
} catch (e) { fails.push('excepción: ' + e.message.slice(0, 200)); }
await b.close();
const out = `## Pruebas en navegador (${BASE})\n\n${ok.map((x) => `- ✅ ${x}`).join('\n')}\n${fails.map((x) => `- ❌ ${x}`).join('\n')}\n`;
console.log(out); if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, out);
process.exit(fails.length ? 1 : 0);
