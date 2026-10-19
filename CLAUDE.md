# MejorCrucero — reglas del repo
- NUNCA usar Lovable ni gastar créditos de Lovable. La web vive en GitHub (Pages + Actions); la API opcional en Cloudflare Workers (backend/).
- No inventar datos: barcos, precios, opiniones, vídeos o cifras siempre con fuente verificable (ver SOURCES en src/data/content.js).
- Después de cambiar algo: `BASE=/mejorcrucero/ node src/build.js` debe terminar en "OK" antes de hacer push.
