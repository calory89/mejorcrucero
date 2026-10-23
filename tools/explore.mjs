// Exploración (solo rama "exploracion"): abre los buscadores oficiales de varias navieras en un Chromium automático
// y guarda qué peticiones JSON hacen, para escribir importadores propios sin servicios de terceros.
// Salida: explore/<naviera>.json (URL, método, cuerpo de la petición y una muestra de la respuesta) y una captura.
import fs from 'node:fs';
import { chromium } from 'playwright';

const SITES = {
  msc: ['https://www.msccruceros.es/', 'https://www.msccruceros.es/buscar-crucero', 'https://www.msccruceros.es/cruceros'],
  royal: ['https://www.royalcaribbean.com/esp/es/cruises'],
  ncl: ['https://www.ncl.com/es/es/vacations'],
};
fs.mkdirSync('explore', { recursive: true });
const browser = await chromium.launch();
for (const [name, urls] of Object.entries(SITES)) {
  const ctx = await browser.newContext({ locale: 'es-ES', timezoneId: 'Europe/Madrid', viewport: { width: 1366, height: 900 }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36' });
  const page = await ctx.newPage();
  const hits = [];
  page.on('response', async (r) => {
    try {
      const ct = r.headers()['content-type'] || '';
      if (!/json|graphql/i.test(ct) && !/api|search|graphql/i.test(r.url())) return;
      const body = await r.text(); if (body.length < 800) return;
      let keys = null; try { const j = JSON.parse(body); keys = Object.keys(Array.isArray(j) ? j[0] || {} : j).slice(0, 40); } catch {}
      hits.push({ url: r.url(), status: r.status(), method: r.request().method(), post: (r.request().postData() || '').slice(0, 3000), ct, size: body.length, keys, sample: body.slice(0, 6000) });
    } catch {}
  });
  const pages = [];
  for (const u of urls) {
    try {
      const resp = await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(4000);
      // banner de cookies: rechazar o cerrar si existe (sin aceptar nada que no haga falta)
      for (const t of ['Rechazar', 'Rechazar todo', 'Rechazar todas', 'Solo necesarias', 'Continuar sin aceptar']) { const b = page.getByRole('button', { name: t }).first(); if (await b.count()) { await b.click().catch(() => {}); break; } }
      for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, 1500); await page.waitForTimeout(1200); }
      await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
      const links = await page.$$eval('a[href]', (as) => as.map((a) => a.href).filter((h) => /buscar|search|cruceros?\/|cruise-search|itinerar/i.test(h)).slice(0, 30)).catch(() => []);
      pages.push({ url: u, status: resp?.status(), finalUrl: page.url(), title: await page.title(), links, text: (await page.innerText('body').catch(() => '')).slice(0, 1500) });
      await page.screenshot({ path: `explore/${name}-${pages.length}.png` }).catch(() => {});
    } catch (e) { pages.push({ url: u, error: String(e).slice(0, 300) }); }
  }
  fs.writeFileSync(`explore/${name}.json`, JSON.stringify({ when: new Date().toISOString(), pages, hits: hits.sort((a, b) => b.size - a.size).slice(0, 40) }, null, 1));
  console.log(name, 'páginas', pages.length, 'respuestas JSON', hits.length);
  await ctx.close();
}
await browser.close();
