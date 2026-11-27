// Valida que todos los bloques JSON-LD del sitio son JSON correcto, tienen @type y no contienen "undefined", "NaN" ni "null" en textos.
// Uso: node test/schema.mjs  (después del build). Sale con código 1 si algo falla.
import fs from 'node:fs'; import path from 'node:path';
const fails = []; let n = 0, blocks = 0; const types = {};
const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (f.name === 'index.html') check(p); } };
const check = (p) => { n++; const t = fs.readFileSync(p, 'utf8'); for (const m of t.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) { blocks++; let j; try { j = JSON.parse(m[1]); } catch (e) { fails.push(`${p}: JSON inválido`); continue; }
  const arr = Array.isArray(j) ? j : [j]; for (const o of arr.flatMap((x) => x['@graph'] || [x])) { const ty = [].concat(o['@type'] || 'SIN TIPO').join('+'); types[ty] = (types[ty] || 0) + 1; if (ty === 'SIN TIPO') fails.push(`${p}: bloque sin @type`); if (ty === 'FAQPage' && !(o.mainEntity || []).length) fails.push(`${p}: FAQPage vacío`); }
  if (/"(undefined|NaN)"|:\s*NaN|undefined/.test(m[1])) fails.push(`${p}: contiene undefined/NaN`); } };
walk('dist');
console.log(`${n} páginas, ${blocks} bloques JSON-LD:`, Object.entries(types).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([k, v]) => `${k} ${v}`).join(' · '));
if (fails.length) { console.log(`✖ ${fails.length} fallos`); console.log(fails.slice(0, 20).join('\n')); process.exit(1); } else console.log('✔ JSON-LD correcto');
