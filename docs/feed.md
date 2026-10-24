# Feed de salidas y precios

El motor de salidas (buscador, fichas `/salidas/…`, ofertas, última hora, histórico, calendario, comparar salidas, schema Offer) se activa solo cuando `src/data/sailings.json` tiene datos. **Nunca se publican datos de prueba**: `test/sailings.fixture.json` solo sirve para probar en local (`SAILINGS=test/sailings.fixture.json node src/build.js`).

Cada salida:

```json
{
  "id": "msc-world-europa-2027-05-08",
  "ship": "msc-world-europa",                 // slug del barco
  "destination": "mediterraneo-occidental",   // slug de src/data/destinations.js
  "date": "2027-05-08", "nights": 7,
  "depart_port": "Barcelona", "depart_port_slug": "barcelona",
  "adults_only": false,
  "itinerary": { "name": "Mediterráneo occidental", "ports": [ { "day": 1, "name": "Barcelona", "lat": 41.38, "lon": 2.18, "depart": "18:00" } ] },
  "prices": { "interior": 699, "exterior": 799, "balcon": 999, "suite": 1999 },   // por persona, EUR
  "sources": [ { "partner": "Crucerosnet", "url": "https://…enlace de afiliado…", "prices": { "interior": 699 } } ]
}
```

`tools/import-feed.js` (lo ejecuta la Action cada día si existe la variable `FEED_URL`) añade `history` y `updated`.


## Feed de agencia afiliada (MSC, Royal Caribbean y las navieras que bloquean la lectura directa)

Variables del repositorio: `FEED_URL` (obligatoria), `FEED_PARTNER` (nombre de la agencia que se muestra, p. ej. "Logitravel") y `FEED_PREFIX` (por defecto `feed`). Secreto opcional: `FEED_TOKEN` (se envía como `Authorization: Bearer`).

- Formato JSON: el array de arriba, o un objeto `{ "sailings": [...] }`.
- Formato CSV (coma o punto y coma, con cabecera): `line, ship, date, nights, depart_port, zona, ports, interior, exterior, balcon, suite, port_charges, url`. `ports` va separado por `|` en orden de escala.
- Las salidas nuevas entran con id `feed-…`. Si una salida del feed coincide con una que ya tenemos (mismo barco y fecha), su precio se añade como otra fuente y la ficha muestra la tabla "Dónde está más barato".
- El importador nunca borra salidas de otras fuentes y no toca nada si el feed falla o trae menos de 5 salidas útiles.
