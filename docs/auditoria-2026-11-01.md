# MejorCrucero: auditoría completa (1-nov-2026, tras el rediseño)

## Nota: 63/100

| Área | Nota | Por qué |
|---|---|---|
| Datos y cobertura | 50 | 2.664 salidas, pero de solo 4 navieras (Carnival, Costa, Norwegian, Celestyal). Faltan MSC y Royal Caribbean. Solo 339 salidas (13 %) salen de España. |
| Promesa "precio real" | 60 | Costa y Carnival publican sus tasas. A las 775 de Norwegian les faltan las tasas, por eso muchas tarjetas dicen "Tasas aparte". Además, el número grande es la tarifa y no el precio real. |
| Diseño visual | 68 | El estilo nuevo tiene personalidad y más foto. Quedan incoherencias: azul eléctrico suelto, emojis como iconos, rojo en notas buenas y navieras y guías sin foto. |
| UX y usabilidad | 58 | En los listados hay demasiado antes del primer resultado, existen dos buscadores y las fichas tienen botones repetidos. |
| Móvil | 55 | Tarjetas de ~750 px (una por pantalla), primer resultado de /ofertas/ a ~2.400 px y tablas cortadas. |
| Velocidad (Lighthouse móvil) | 72 | Portada 81, listado 76, oferta 68, barco 69, puerto 83. CLS de 0,19 en el listado y 0,18 en el barco. Caché corta y un error de Cloudflare en la consola. |
| Accesibilidad | 85 | Lighthouse 100 y axe sin fallos en 8 páginas, en claro y oscuro. En la calculadora había un botón invisible (ya arreglado). |
| SEO técnico | 85 | Lighthouse SEO 100, sitemaps, schema, IndexNow y llms.txt. Riesgo: miles de listados parecidos entre sí. |
| Confianza y contenido | 62 | A favor: fuentes y fecha de comprobación. En contra: comunidad vacía (0 opiniones), "Mínimo histórico" en casi todo, 7 ofertas con nota 100 entre las 24 primeras y Allura con 4 premios. |
| Conversión | 58 | La ficha de oferta es buena. Pero la naviera manda a Logitravel como botón principal, el ranking no lleva a ofertas y el amarillo se usa también para compartir. |

Fuentes de la nota:
- revisión independiente con capturas en móvil y escritorio, claro y oscuro (nota 62);
- Lighthouse en la web publicada;
- axe;
- recuento de los datos;
- pruebas en navegador.

### Ya arreglado durante la auditoría
- /comparativas/: la letra salía gigante y se salía de las tarjetas.
- Móvil: la barra de "Comparar" quedaba tapada por la barra inferior.
- Calculadora: el botón "Descargar tarjeta" era invisible y el resultado no se leía en modo oscuro.

## 100 mejoras

### Precio real y datos (lo que más pesa)
1. Que el número grande de cada tarjeta sea el precio real cuando se conoce, y la tarifa en pequeño.
2. "Más barato" debe ordenar por precio real, no por tarifa.
3. Renombrar los órdenes: "Precio real", "Tarifa", "€ por noche", "Mejor oferta".
4. Norwegian: buscar fuente oficial de sus tasas (web de EE. UU. o de otro país) para las 775 salidas.
5. Cuando falten tasas, mostrar "precio real estimado" solo si hay fuente para estimarlo; si no, bajar esas salidas en "Mejor oferta".
6. Importar MSC (feed de Awin, pendiente de Carlos).
7. Importar Royal Caribbean (mismo feed).
8. Más salidas desde España: priorizar en los importadores los barcos que salen de Barcelona, Valencia, Málaga, Palma y Canarias.
9. "Mínimo histórico" solo con 4 o más comprobaciones y 14 días de historial.
10. Nota del precio 100 solo para el 2 % más barato. Explicar el reparto ("top 5 %").
11. No decir "Precio normal" si la oferta está en mínimo histórico, o explicar la diferencia.
12. Unificar los recuentos ("caribe": 1.147 en el buscador frente a 1.129 en el listado).
13. Avisar en la ficha cuándo se comprobó el precio por última vez y si ha cambiado desde ayer.
14. Quitar de "Embarca sin salir de España" los puertos sin salidas (Bilbao, Vigo) o marcarlos "sin salidas ahora".

### Listados y buscador
15. Que el primer resultado de /ofertas/ quede a una pantalla del título.
16. Pasar los ~40 chips de destino y temporada a un carrusel horizontal o a un desplegable.
17. Meter "Guardar búsqueda", "Compartir", "Vista lista" y "Sorpréndeme" en un menú "Más".
18. Tarjeta compacta en móvil (foto de 120 px o miniatura a la izquierda) para ver 2 o 3 por pantalla.
19. Que la pastilla flotante "N ofertas · Filtros" no tape precios (margen inferior en el listado).
20. Una sola tarjeta de oferta en toda la web (listado, /buscar/, Mis cruceros).
21. Unificar /buscar/ y /ofertas/ en un solo buscador.
22. Buscador: coincidencia por palabra completa ("caribe" no debe dar "Royal Caribbean").
23. Buscador: destino, puerto y barco primero; comparativas y guías después.
24. Panel de filtros en móvil: agrupar en "Lo básico" y "Más filtros" (hoy son 18 en una columna).
25. Controles segmentados con indicación de que hay más a la derecha.
26. Recordar el último orden elegido.
27. Botón "Limpiar filtros" visible cuando hay alguno activo.
28. Texto de ejemplo del buscador adaptado a cada listado (en Caribe no "islas griegas").

### Ficha de oferta
29. Tabla "Precio por tipo de camarote" en tarjetas apiladas en móvil.
30. Desglose de precio sin etiquetas partidas en 3 o 4 líneas.
31. Pestañas fijas: fondo opaco sin transparencias, pestaña activa marcada y flecha "más".
32. "Compartir por WhatsApp" en botón secundario: el amarillo solo para Reservar.
33. Quitar el hueco blanco bajo la descripción en escritorio.
34. Coherencia "8 noches" / "4 días de mar" en todos los tamaños.
35. Mostrar arriba "Misma ruta más barata" cuando exista (ya está en la caja de precio, pero llevarlo también al móvil).
36. Galería de fotos de las escalas con deslizar.
37. Hora de llegada y salida de cada escala en la tarjeta del itinerario en móvil, sin cortes.

### Ficha de barco
38. Un solo botón principal ("Ver 58 salidas") y uno secundario ("Comparar").
39. Fusionar "Seguir barco" y "Guardar".
40. Foto arriba en móvil, como en las ofertas.
41. Unidad en "Espacio" (GT por pasajero) en todas las tarjetas.
42. Notas por apartado con barras en marino, no en azul eléctrico.
43. Vídeos: solo 85 de 343 barcos tienen; buscar más vídeos con licencia de canales oficiales.
44. Plegar en móvil "Ficha técnica" y "Dónde estará" con resumen de una línea.

### Navieras, destinos, puertos y premios
45. Naviera: el botón principal a las ofertas de la propia web; Logitravel como secundario.
46. Naviera: foto de cabecera (barco insignia) como en destinos y puertos.
47. Naviera: separar los botones apilados.
48. Destino y listado del mismo destino: títulos que se diferencien ("Guía del Caribe" frente a "Ofertas al Caribe") y enlaces cruzados.
49. "Cruceros por el Caribe" con artículo donde corresponda.
50. "Mejor época: enero a diciembre" sustituido por los meses con más salidas.
51. Crédito de foto legible (fondo oscuro detrás).
52. Premios: un premio por barco, o explicar por qué se repite (Allura gana 4).
53. Premios: botón "Ver salidas" en los ganadores con salidas.
54. Premios: foto de MSC World America cuando haya una con licencia.
55. Ranking: notas en marino o escala neutra (el rojo solo para chollos).
56. Ranking: filtro "Con salidas a la venta" y enlace "Ver ofertas" en cada fila.
57. Ranking: un solo control para ver más.

### Diseño y coherencia del estilo nuevo
58. Quitar el azul eléctrico que queda: estados activos, barras, mapa, volver arriba.
59. Un único azul para los enlaces, de la paleta.
60. Iconos propios (SVG de línea) en lugar de emojis en herramientas, guías y destinos.
61. Banderín de sección en todos los títulos de sección (falta en algunos).
62. Foto de cabecera también en guías y herramientas.
63. Guías en escritorio: índice y texto centrados, sin huecos.
64. Bordes gruesos solo en tarjetas pulsables; en tablas y cajas informativas, borde fino.
65. Revisar el amarillo: reservarlo para la acción principal de cada pantalla.
66. Modo oscuro de la portada: caja del buscador en oscuro.
67. Modo oscuro: separar la cabecera del fondo con un borde.
68. Icono de ajustes: uno de tema ("Aa" o sol/luna) que no se confunda con filtros, y que no desaparezca al abrirse.
69. Menú hamburguesa en grupos (Ofertas, Explorar, Herramientas, Sobre nosotros), sin repetir la barra inferior.
70. Botón del hero con el mismo texto en móvil y escritorio.
71. Quitar el hueco navy bajo el bloque de newsletter y la franja blanca sobre la barra inferior.
72. Animación de entrada única en la portada; nada más.
73. Fotos de destino propias para cada tarjeta de destino (hoy algunas repiten puerto).

### Móvil
74. Textos de cabecera sin cortar con "…": acortar o "Leer más".
75. Mapa por mes visible directamente en móvil con vista ligera.
76. Barra inferior: "Alertas" por "Chollos" (lo que más se usa), si los datos de clics lo confirman.
77. Zonas de toque de 44 px en chips y enlaces pequeños.
78. Evitar tablas anchas en todas las páginas (pasar a tarjetas).

### Velocidad
79. Caché larga en Cloudflare (pendiente de Carlos): la mayor mejora, 1,2 MB de ahorro.
80. Arreglar el desplazamiento de contenido (CLS 0,19 en el listado y 0,18 en el barco): reservar alto a la cabecera con foto y a las fuentes.
81. Precargar la fuente nueva con `font-display: optional` o con métricas de ajuste para que no salte el texto.
82. Imágenes de cabecera a la medida (srcset con 960 px) para no bajar la de 1.280 en móviles.
83. Quitar 173 KB de JavaScript sin usar: separar el de herramientas del de listados.
84. Retrasar Clarity y GA un poco más (bloquean 550 ms).
85. Una sola etiqueta de Google Analytics (hay dos).
86. Quitar el error de Cloudflare Web Analytics de la consola (token de Carlos o quitar la etiqueta).
87. Bajar los nodos de la portada (1.232) plegando secciones.

### Confianza y comunidad
88. Conseguir las primeras opiniones reales: pedirlas a la comunidad de Happy Low Cost.
89. Comunidad: mostrar arriba la actividad real (mensajes, miembros) o un estado vacío con ejemplo y llamada a la acción.
90. Quitar o completar el "Sorteo" (hoy "recibir las bases cuando se publiquen").
91. "Tu primer crucero: guía completa" dice "2 min de lectura": revisar el cálculo.
92. Mis cruceros vacío: ejemplos visuales de lo que verás.
93. Página "Quiénes somos" con foto real del equipo (si Carlos la facilita).
94. Sello visible "precios comprobados hoy a las HH:MM" en cada listado.

### Conversión y negocio
95. Enlace "Ver ofertas" en todo lo que hoy no lleva a ninguna (ranking, premios, comparativas).
96. Alerta de precio en un toque desde cada tarjeta (corazón = vigilar).
97. Formulario "te ayudamos a reservar" más visible en las ofertas caras.
98. Pruebas A/B del texto del botón Reservar, medidas en /admin/.
99. Newsletter con chollos según el puerto de salida elegido en la portada.
100. Informe semanal automático en /admin/ con búsquedas sin resultado, velocidad real y clics por agencia.

## Estado tras implementar (1-nov, noche)

✅ hecho · ⏳ depende de Carlos · ⛔ no se puede sin datos o no compensa · ➡️ siguiente tanda

**Precio y datos:**
- ✅ Hechos: 1, 2, 3, 9, 10, 11, 14.
- 5 ✅ parcial: las salidas sin tasas van detrás en "Mejor oferta" y dicen "La naviera no publica las tasas".
- ⏳ Pendientes de Carlos: 6 y 7 (feed de Awin).
- ➡️ Para la siguiente tanda: 4, 8, 12 y 13.

**Listados y buscador:**
- ✅ Hechos: 15 (primer resultado de 2.400 a 1.000 px en móvil), 16, 17, 18 (tarjeta de 750 a 420 px), 19, 22, 23 y 27 (ya existía).
- ➡️ Para la siguiente tanda: 20, 21, 24, 25, 26 y 28.

**Oferta:**
- ✅ Hechos: 31, 32 y 34.
- 29 y 30 ✅ parcial: en móvil, la tabla quita la columna de tarifa y el desglose usa etiquetas anchas.
- ➡️ Para la siguiente tanda: 33, 35, 36 y 37.

**Barco:**
- ✅ Hechos: 38, 40, 41 y 42.
- 39 ✅ parcial: "Guardar" pasa a ser solo el corazón.
- ➡️ Para la siguiente tanda: 43 y 44.

**Navieras, destinos y premios:**
- ✅ Hechos: 45, 46, 47, 49, 51, 52, 53, 55 y 56.
- 50 ✅ parcial: ahora dice "todo el año".
- 54 ⛔: no hay foto con licencia.
- ➡️ Para la siguiente tanda: 48 y 57.

**Diseño:**
- ✅ Hechos: 58, 64, 65, 66, 67, 68 y 71 (en tandas anteriores).
- 70 se queda como está: es una prueba A/B en marcha.
- ➡️ Para la siguiente tanda: 59, 60, 61, 62, 63, 69, 72 y 73.

**Móvil:**
- ✅ Hechos: 74 y 75.
- ➡️ Para la siguiente tanda: 76, 77 y 78.

**Velocidad:**
- ✅ Hechos: 80 (el aviso de moneda ya no empuja la página), 84 (analítica a los 5 s y en reposo) y 86 (etiqueta de Cloudflare apagada hasta tener token).
- ⏳ Pendientes de Carlos: 79 y 85 (¿qué etiqueta de Google Analytics es la buena?).
- ➡️ Para la siguiente tanda: 81, 82, 83 y 87.

**Confianza:**
- ✅ Hechos: 90 (fuera el sorteo a medias), 91 (título honesto) y 94.
- ⏳ Pendientes de Carlos: 88 y 93.
- ➡️ Para la siguiente tanda: 89 y 92.

**Conversión:**
- 95 ✅ parcial: ranking y premios ya enlazan a las salidas.
- ➡️ Para la siguiente tanda: 96, 97, 98, 99 y 100.

### Seguridad (revisión independiente del código y la API)
- Sal secreta para los enlaces de confirmar y de baja. Si no hay secreto en Cloudflare, se crea una aleatoria en la base de datos. Los enlaces de baja antiguos valen hasta el 1-ene-2027.
- Clave privada por navegador: ya nadie puede firmar mensajes ni editar perfiles como otro usuario o como Experto (comprobado en producción: "permiso").
- Seguir un barco exige confirmar el email y tiene límite de peticiones.
- Alertas:
  - solo guardan los campos necesarios (ya no guardan el número de reserva ni el vendedor);
  - el nombre del barco se valida;
  - como máximo 30 por email;
  - todo lo que llega al correo va escapado.
- Reportes: uno por persona y mensaje.
- Límites de peticiones en votos, encuestas, perfil, grupos, resúmenes y administración.
- El panel de administración compara la clave en tiempo constante, no carga analítica (Clarity grababa la sesión) y guarda la clave solo durante la sesión.
- Fotos: se comprueba el tamaño antes de abrirlas y que el contenido sea de verdad JPEG, PNG o WebP.
- Corregido XSS en el mapa de escalas, en el widget para blogs y en el JSON metido en páginas.
- Los enlaces del feed de agencias solo pueden ser https.
- Política de seguridad de contenidos (CSP) en todas las páginas, sin errores.
- La API no devuelve detalles de error internos.
- Permisos mínimos en GitHub Actions, wrangler en versión fija y entradas por variable.
- ⏳ Pendiente de Carlos: secretos `SALT` y `ADMIN_TOKEN` en el Worker, y cabeceras HSTS y frame-ancestors en Cloudflare.

### Indexación (Google y buscadores con IA)
- robots.txt da la bienvenida explícita a GPTBot, ClaudeBot, PerplexityBot, Google-Extended, Applebot y otros, con las mismas reglas que el resto.
- llms-full.txt con el ranking, los destinos y las guías; llms.txt enlaza a él.
- 137 listados con menos de 5 salidas pasan a noindex: se pueden seguir visitando, pero no compiten con las páginas buenas.
- Títulos de destino con artículo ("Cruceros por el Caribe").
