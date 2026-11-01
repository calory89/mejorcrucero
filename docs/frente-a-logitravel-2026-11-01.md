# Que nos prefieran antes que a una agencia (1-nov-2026)

Idea: no competimos como agencia (Logitravel es socio). Somos el sitio donde se decide: neutral, con precio real y ayuda después de reservar.

## Hecho hoy
- Asistente de cruceros en la portada y en /herramientas/asistente/:
  - Entiende preguntas como "crucero más barato por el Mediterráneo en noviembre", "barco más nuevo de Costa" o "Caribe en enero por menos de 800 €" y enseña salidas o barcos de nuestros datos.
  - Solo responde a cruceros. Si la pregunta es de otra cosa, lo dice y no contesta.
  - Si se pregunta por algo que no medimos (gimnasio, spa), lo dice y enseña lo que sí medimos.
  - La IA solo interpreta la pregunta; los precios y los barcos salen siempre de la base de datos.
  - Usa la API de Claude (modelo `claude-haiku-5-5`) si existe el secreto `ANTHROPIC_API_KEY` en el Worker; si no, Workers AI.
  - Antispam: trampa para robots, 1,2 s mínimos en la página, 300 caracteres, 4 preguntas por minuto y 30 por hora por persona, 4.000 al día en total y caché de 1 hora.
  - Las preguntas se ven en /admin/ junto a las del buscador.
- 3. Sello "No vendemos cruceros: los comparamos" junto al botón de reservar.
- 8. "No lo reserves si…" en cada oferta, solo con datos que tenemos: días de mar, si hay que volar, crucero corto, tasas sin publicar o pago en dólares.
- 70. Fuera la ventana emergente al intentar salir.
- Datos: la regla de barcos gemelos mezclaba clases distintas. Breakaway y Getaway salían con 3.099 pasajeros en vez de 3.963, con notas infladas. Corregido en 38 barcos.
- Ya existían (☑️): 1 parcial, 4–6, 11–13, 21, 25, 28, 31, 34, 38–50, 55–60, 63, 65, 68–69, 73–74, 86, 91, 94–98.

## Pendiente de Carlos
- 1 y 81: feed de Awin (MSC, Royal Caribbean, comparar agencias).
- 61: caché de Cloudflare.
- 51: primeras opiniones desde Happy Low Cost.
- 92: WhatsApp o Telegram.
- Secreto `ANTHROPIC_API_KEY` en el Worker para usar Claude en el asistente.

## Siguientes (sin datos inventados)
- 15–16: depósitos y cancelación por naviera, con fuente oficial.
- 22: seguimiento del precio de un crucero ya reservado hasta el pago final.
- 35: qué ver en cada escala.
- 66: votación familiar.
- 99: encuesta de satisfacción.
