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
