// Exploración 2 (solo rama "exploracion"): fechas y precios de NCL y buscador Algolia de MSC.
import fs from 'node:fs';
import { chromium } from 'playwright';
fs.mkdirSync('explore', { recursive: true });
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const out = {};
const browser = await chromium.launch();
async function visit(name, url, filter) {
  const ctx = await browser.newContext({ locale: 'es-ES', timezoneId: 'Europe/Madrid', viewport: { width: 1366, height: 900 }, userAgent: UA });
  const page = await ctx.newPage(); const hits = [];
  page.on('request', (q) => { if (filter.test(q.url())) hits.push({ url: q.url(), method: q.method(), headers: Object.fromEntries(Object.entries(q.headers()).filter(([k]) => /algolia|api-key|auth|x-/i.test(k))), post: (q.postData() || '').slice(0, 4000) }); });
  page.on('response', async (r) => { if (!filter.test(r.url())) return; const h = hits.find((x) => x.url === r.url() && !x.sample); try { const b = await r.text(); if (h) { h.status = r.status(); h.size = b.length; h.sample = b.slice(0, 15000); } } catch {} });
  let info = {};
  try { const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); await page.waitForTimeout(5000); for (let i = 0; i < 5; i++) { await page.mouse.wheel(0, 1200); await page.waitForTimeout(1500); } await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {}); info = { status: resp?.status(), final: page.url(), title: await page.title(), text: (await page.innerText('body').catch(() => '')).slice(0, 2500) }; await page.screenshot({ path: `explore/${name}.png` }).catch(() => {}); } catch (e) { info = { error: String(e).slice(0, 300) }; }
  await ctx.close(); return { info, hits };
}
// NCL: una ficha de itinerario y la búsqueda con más resultados
out.ncl_builder = await visit('ncl-builder', 'https://www.ncl.com/es/es/vacation-builder?itineraryCode=EPIC7PCVNPIMBJGECCZMPCV', /ncl\.com\/.*\/api\//);
try { const r = await fetch('https://www.ncl.com/es/es/api/v2/vacations/search?filterConfig=search-filters-configuration&limit=50&offset=0', { headers: { 'User-Agent': UA, Accept: 'application/json', 'Accept-Language': 'es-ES' } }); const t = await r.text(); out.ncl_search_direct = { status: r.status, size: t.length, total: (() => { try { return JSON.parse(t).total; } catch { return null; } })(), sample: t.slice(0, 1500) }; } catch (e) { out.ncl_search_direct = { error: String(e) }; }
// MSC: buscador con Algolia
out.msc_search = await visit('msc-search', 'https://www.msccruceros.es/search', /algolia|\/api\//i);
try { const t = await (await fetch('https://www.msccruceros.es/static/be535f7f8311f6dd6598ca7084d9c7b6eac926afd3a9343e5ae5cc13461ebd10/apps/search-bar/index.js', { headers: { 'User-Agent': UA } })).text();
  const ctxs = []; for (const m of t.matchAll(/algolia/gi)) { if (ctxs.length > 25) break; ctxs.push(t.slice(Math.max(0, m.index - 200), m.index + 300)); }
  out.msc_js = { size: t.length, appIds: [...new Set(t.match(/["'][A-Z0-9]{10}["']/g) || [])].slice(0, 20), keys: [...new Set(t.match(/["'][a-f0-9]{32}["']/g) || [])].slice(0, 20), ctxs };
} catch (e) { out.msc_js = { error: String(e) }; }
fs.writeFileSync('explore/explore2.json', JSON.stringify(out, null, 1));
await browser.close();
console.log('ok');
