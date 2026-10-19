# MejorCrucero.com

Comparador de cruceros en español: fichas de barco, vídeos, precio real con propinas, alerta de bajada de precio, test "¿qué crucero es para mí?", comparador de barcos, grupos por salida y guías.

**Web estática sin dependencias** (Node 22). Se despliega sola en GitHub Pages con cada push a `main`. **Nada de Lovable.**

## Editar
| Qué | Dónde |
|---|---|
| Barcos (año, GT, pasajeros) | `src/data/ships.csv` |
| Navieras, vídeos, puertos, afiliados, endpoint de formularios, foro | `src/data/content.js` |
| Guías | `src/data/guides.js` |
| Plantillas de páginas | `src/build.js` |
| Estilos / JS del navegador | `public/assets/` |

`node src/build.js` genera `dist/`. Para probar en local: `BASE=/ node src/build.js && npx serve dist`.

## Pendiente de activar
1. **Dominio**: apuntar DNS de mejorcrucero.com a GitHub Pages (A → 185.199.108.153, .109, .110, .111; `www` CNAME → calory89.github.io) y crear variables de repo `BASE=/` y `CNAME=mejorcrucero.com`.
2. **Afiliados**: rellenar `CONFIG.affiliates.*.param` en `content.js` (Logitravel, Crucerosnet, VayaCruceros, Civitatis).
3. **Foro**: instalar https://github.com/apps/giscus en este repo, poner `categoryId` y `enabled: true` en `CONFIG.giscus`.
4. **Emails** (alertas y newsletter): poner una URL que acepte POST JSON en `CONFIG.formEndpoint`.

## Reglas
- Ningún dato inventado: cada cifra con fuente (`SOURCES` en `content.js`). Nada de precios ni opiniones falsas.
- Vídeos: solo IDs reales de YouTube.
