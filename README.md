# MejorCrucero.com

Comparador de cruceros en español. Web estática sin dependencias (Node 22) en **GitHub Pages**, con una API pequeña opcional en **Cloudflare Workers + D1** para la comunidad. **Nada de Lovable.**

## Qué hay
- 343 fichas de barco (Wikipedia), 255 vídeos reales de YouTube, fotos con licencia de Wikimedia Commons (`tools/photos.py`).
- Buscador por destino/mes/puerto/noches; motor de salidas, ofertas, última hora, histórico y calendario (se activa con el feed, ver `docs/feed.md`).
- Navieras con tabla comparativa, 10 comparativas "X vs Y", 8 destinos, 12 meses, 16 puertos, rankings, excursiones.
- 12 herramientas: precio real (2 ofertas, cambio BCE, tarjeta para compartir), alerta de bajada + lectura del email de reserva + email de reclamación, test, asistente IA, comparadores, checklist, cuenta atrás con .ics, mareómetro, conversor horario, buscador de camarotes.
- Comunidad sin registro: opiniones con notas por categoría, preguntas, camarotes con vídeo, grupos por salida con contador, excursiones compartidas, perfiles con insignias, ranking, resumen IA de opiniones.
- Favoritos, vistos, comparador flotante, modo oscuro, PWA sin conexión, OG por barco, A/B y medición de clics sin cookies.

## Editar
| Qué | Dónde |
|---|---|
| Barcos | `src/data/ships.csv`, `src/data/ships_extra.csv` |
| Navieras, puertos, afiliados, API, A/B | `src/data/content.js` |
| Destinos, meses, comparativas | `src/data/destinations.js` |
| Guías | `src/data/guides.js` |
| Plantillas | `src/build.js`, `src/lib.js` |
| Estilos / JS | `public/assets/` |
| API | `backend/worker.js`, `backend/schema.sql` |

Build local: `BASE=/mejorcrucero/ node src/build.js`. Con salidas de prueba: `SAILINGS=test/sailings.fixture.json …` (nunca se publican).
Regenerar fotos: `python3 tools/photos.py`. Imágenes para compartir: `python3 tools/og.py`.

## Pendiente de activar
1. **Dominio**: DNS de mejorcrucero.com → A 185.199.108.153/.109/.110/.111 y `www` CNAME calory89.github.io; variables de repo `BASE=/` y `CNAME=mejorcrucero.com`.
2. **API**: secretos `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID` + variable `DEPLOY_API=true` (o desplegar desde el conector). Después, poner la URL del Worker en `CONFIG.api`.
3. **Afiliados**: `CONFIG.affiliates.*.param`.
4. **Feed de precios**: variable `FEED_URL` (ver `docs/feed.md`).
5. **Emails salientes** (alertas, newsletter): proveedor de envío (Resend u otro) conectado al Worker.
