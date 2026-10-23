# Cómo funciona MejorCrucero

Web estática generada con Node 22 sin dependencias. GitHub Actions la construye dos veces al día y la publica en GitHub Pages. La comunidad, las alertas y los emails viven en un Worker de Cloudflare con base de datos D1.

## Flujo de datos

1. **Importadores** (`tools/`), en el workflow `Deploy`:
   - `costa.js`: buscador oficial de Costa Cruceros (España). Guarda una muestra del formato en `tools/costa-sample.json`.
   - `msc.js`: MSC Cruceros vía el actor de Apify `sercul/msc-cruises-scraper` (mercado `es_ES`). Solo se ejecuta con el secreto `APIFY_TOKEN`. Muestra en `tools/msc-sample.json`.
   - `import-feed.js`: feed genérico (variable `FEED_URL`), formato en `docs/feed.md`.
   - Todos escriben en `src/data/sailings.json`, conservan las salidas de las demás fuentes y añaden `history` (un punto por cambio de precio). Si una fuente falla, no tocan el fichero.
2. **Build** (`src/build.js`): genera `dist/` con todas las páginas. Las ofertas salen de `src/offers.js`.
3. **Prueba rápida** (`test/smoke.mjs`): si falla, no se publica.
4. **Publicación**: GitHub Pages.

## Ofertas (`src/offers.js`)

- `real(x)`: tarifa + tasas + cuota de servicio. Si la fuente no publica las tasas (`port_charges` nulo), `partial` es verdadero y la web muestra "tasas aparte" en lugar de un precio real incompleto.
- `deal(x)`: **nota del precio** de 0 a 100. Compara el precio por noche con salidas del mismo destino y duración (±60 días). Suma el descuento de catálogo (hasta 15 puntos), estar en mínimo histórico (10) y haber bajado un 5 % o más (5).
- `daysOf(x)`: itinerario normalizado, con un día por fila, los días no listados como navegación y los puertos de varios días fusionados. Las fuentes sin días (`itinerary.flat`) se muestran como "Parada N".
- El listado pinta 48 tarjetas y el resto se carga desde `/data/cards.json` al filtrar o pedir más.

## Nota del barco (`src/score.js`)

Higiene (CDC), espacio por pasajero, tripulación, modernidad y opiniones verificadas. Es "provisional" si cubre menos del 70 % de los puntos posibles. Fórmula pública en `/metodologia/`.

## Datos del navegador (localStorage)

`mc_offer_favs` (guardadas), `mc_offer_recent` (vistas), `mc_filters` (filtros por página), `mc_group` (adultos), `mc_notes` (notas privadas), `mc_watch` (salidas vigiladas), `mc_textsize`, `mc_theme`.

## API (`backend/worker.js`)

`POST /alert` guarda alertas de tipo `price` (crucero ya reservado), `criteria` (destino/mes/presupuesto) y `watch` (salida concreta, con `base` y `target` opcional). `runAlerts` las revisa contra `/data/ofertas.json` y encola los emails. Se envían con Resend cuando existen `RESEND_KEY` y `MAIL_FROM`.

El workflow `Deploy API` solo despliega si la variable de repo `DEPLOY_API` es `true`.

## Reglas

- No inventar datos. Todo número debe tener fuente (ver `SOURCES` en `src/data/content.js`).
- Antes de subir, `BASE=/mejorcrucero/ node src/build.js` debe terminar en "OK" y `node test/smoke.mjs` en "✔".
