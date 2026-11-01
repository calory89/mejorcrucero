// Revisión de accesibilidad (axe-core) de páginas clave en móvil, en claro y en oscuro.
// Uso: BASE_URL=https://mejorcrucero.com node test/axe.mjs  (necesita playwright y axe-core instalados)
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || 'playwright');
const axeSrc = require('fs').readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const BASE = (process.env.BASE_URL || 'http://localhost:8811').replace(/\/$/, '');
const pages = ['/', '/ofertas/', '/barcos/norwegian-prima/', '/puertos/barcelona/', '/buscar/', '/rankings/', '/herramientas/', '/destinos/caribe/'];
const b = await chromium.launch(); let total = 0;
for (const scheme of ['light', 'dark']) for (const u of pages) {
  const p = await b.newPage({ viewport: { width: 390, height: 900 }, colorScheme: scheme });
  try { await p.goto(BASE + u, { waitUntil: 'load' }); await p.waitForTimeout(1200); await p.addScriptTag({ content: axeSrc });
    const v = await p.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map((x) => `${x.id} (${x.nodes.length}): ${x.nodes[0]?.target}`));
    total += v.length; console.log(`${v.length ? '❌' : '✅'} ${scheme} ${u}${v.length ? '\n   ' + v.join('\n   ') : ''}`);
  } catch (e) { console.log(`⚠️ ${scheme} ${u}: ${e.message.slice(0, 80)}`); }
  await p.close();
}
await b.close(); if (total) { console.log(`${total} fallos de accesibilidad`); process.exit(1); }
