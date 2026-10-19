// Destinos de crucero. Información general y prudente (temporadas habituales), sin cifras inventadas.
// months: meses en los que las navieras suelen programar más salidas (1=enero).
export const DESTINATIONS = [
  {
    slug: 'mediterraneo-occidental', name: 'Mediterráneo occidental', emoji: '🇮🇹', months: [3, 4, 5, 6, 7, 8, 9, 10, 11],
    ports: ['Barcelona', 'Palma', 'Marsella', 'Génova', 'Roma (Civitavecchia)', 'Nápoles', 'Florencia (La Spezia / Livorno)', 'Valencia'],
    nights: '3 a 7 noches (el clásico es de 7)', fromSpain: true,
    text: 'El crucero más vendido en España: Italia, sur de Francia y Baleares en una semana, con embarque en Barcelona, Valencia o Palma sin coger avión. Es la mejor opción para un primer crucero.',
    sea: 'Normalmente tranquilo en verano. En otoño e invierno el golfo de León (entre Barcelona y Marsella) puede ponerse movido con el viento del norte (mistral).',
    tips: ['Roma y Florencia están a más de una hora del puerto: madruga o contrata traslado.', 'En julio y agosto hace mucho calor en las visitas: lleva agua y gorra.', 'Hay salidas también en invierno, con precios más bajos.'],
  },
  {
    slug: 'mediterraneo-oriental', name: 'Mediterráneo oriental e islas griegas', emoji: '🇬🇷', months: [4, 5, 6, 7, 8, 9, 10],
    ports: ['Atenas (El Pireo)', 'Santorini', 'Mykonos', 'Corfú', 'Dubrovnik', 'Kotor', 'Venecia / Trieste', 'Estambul'],
    nights: '7 a 10 noches', fromSpain: false,
    text: 'Islas griegas, costa croata y Montenegro. Suele implicar volar a Venecia, Trieste, Atenas o similares para embarcar. Paisajes espectaculares y mucho baño.',
    sea: 'El viento meltemi sopla en el Egeo sobre todo en julio y agosto y puede mover el barco y complicar los desembarcos en tender (lancha).',
    tips: ['En Santorini se baja en tender: hay colas, ve de los primeros.', 'Mayo, junio y septiembre combinan buen tiempo y menos gente.', 'Revisa si tu itinerario incluye países fuera de la UE por el documento necesario.'],
  },
  {
    slug: 'caribe', name: 'Caribe', emoji: '🏝️', months: [11, 12, 1, 2, 3, 4],
    ports: ['Miami', 'Fort Lauderdale', 'Cozumel', 'Nassau', 'Saint Thomas', 'Saint Martin', 'Punta Cana / La Romana', 'Barbados'],
    nights: '4 a 8 noches', fromSpain: false,
    text: 'Playas, islas privadas de las navieras y los barcos más grandes del mundo. Se embarca en Florida o en el propio Caribe, así que hay que volar.',
    sea: 'La temporada oficial de huracanes del Atlántico va del 1 de junio al 30 de noviembre: las navieras cambian rutas si hace falta. De diciembre a abril es la época más estable.',
    tips: ['Para entrar en EE. UU. necesitas ESTA o visado y pasaporte.', 'Vuela al puerto al menos un día antes.', 'Las islas privadas de las navieras suelen estar incluidas, pero las actividades no.'],
  },
  {
    slug: 'fiordos-noruegos', name: 'Fiordos noruegos', emoji: '🏔️', months: [5, 6, 7, 8, 9],
    ports: ['Bergen', 'Geiranger', 'Stavanger', 'Ålesund', 'Flåm', 'Kiel / Hamburgo / Copenhague (embarque)'],
    nights: '7 noches', fromSpain: false,
    text: 'Cascadas, glaciares y pueblos de colores navegando entre montañas. Uno de los cruceros más bonitos del mundo, ideal con balcón.',
    sea: 'Dentro de los fiordos el agua suele estar en calma; el tramo por el mar del Norte puede moverse más.',
    tips: ['En junio y julio casi no anochece.', 'Lleva capas y chubasquero: el tiempo cambia rápido.', 'Noruega es cara: las excursiones por libre ahorran mucho.'],
  },
  {
    slug: 'capitales-balticas', name: 'Norte de Europa y Báltico', emoji: '🏰', months: [5, 6, 7, 8, 9],
    ports: ['Copenhague', 'Estocolmo', 'Helsinki', 'Tallin', 'Kiel', 'Oslo'],
    nights: '7 a 12 noches', fromSpain: false,
    text: 'Capitales nórdicas y bálticas en un solo viaje, con mucho patrimonio y ciudades muy paseables.',
    sea: 'El Báltico suele ser tranquilo en verano.',
    tips: ['Las ciudades se recorren bien a pie desde el puerto.', 'Comprueba qué escalas incluye: los itinerarios cambian cada temporada.'],
  },
  {
    slug: 'canarias-y-madeira', name: 'Canarias y Madeira', emoji: '🌋', months: [10, 11, 12, 1, 2, 3, 4],
    ports: ['Santa Cruz de Tenerife', 'Las Palmas de Gran Canaria', 'Lanzarote (Arrecife)', 'La Palma', 'Funchal (Madeira)'],
    nights: '7 noches', fromSpain: true,
    text: 'El crucero de invierno con sol, sin salir de España casi. Volcanes, playas y temperaturas suaves cuando en Europa hace frío.',
    sea: 'En el Atlántico hay más oleaje que en el Mediterráneo, sobre todo en los tramos largos de navegación.',
    tips: ['Embarcar en Canarias evita los días de navegación desde la Península.', 'Lleva chaqueta para la noche en cubierta.'],
  },
  {
    slug: 'alaska', name: 'Alaska', emoji: '🐋', months: [5, 6, 7, 8, 9],
    ports: ['Seattle', 'Vancouver', 'Juneau', 'Ketchikan', 'Skagway', 'Glacier Bay'],
    nights: '7 noches', fromSpain: false,
    text: 'Glaciares, ballenas y naturaleza salvaje por el Pasaje Interior. Un viaje de los que se recuerdan siempre.',
    sea: 'El Pasaje Interior está protegido y suele ser tranquilo.',
    tips: ['Necesitas ESTA o visado para EE. UU. (y eTA si embarcas en Canadá).', 'Las excursiones de avistamiento se agotan: resérvalas pronto.'],
  },
  {
    slug: 'transatlanticos', name: 'Travesías transatlánticas', emoji: '🌊', months: [3, 4, 5, 10, 11],
    ports: ['Barcelona / Málaga / Lisboa / Southampton', 'Madeira o Canarias', 'Miami / Nueva York / Caribe'],
    nights: '12 a 16 noches', fromSpain: true,
    text: 'Cuando los barcos cambian de temporada entre Europa y América hacen "reposicionamientos": muchos días de navegación y, a menudo, precios por noche muy bajos.',
    sea: 'Muchos días seguidos en mar abierto: si te mareas, elige camarote central y bajo.',
    tips: ['Comprueba la edad mínima de bebés: en travesías largas algunas navieras piden 12 meses.', 'Te toca volver en avión: mira el vuelo antes de reservar.'],
  },
];

export const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// Pares de navieras para comparativas (búsquedas "X vs Y")
export const COMPARISONS = [
  ['msc', 'costa'], ['royal-caribbean', 'msc'], ['royal-caribbean', 'norwegian'], ['costa', 'royal-caribbean'], ['msc', 'norwegian'],
  ['celebrity', 'princess'], ['celebrity', 'royal-caribbean'], ['carnival', 'royal-caribbean'], ['disney', 'royal-caribbean'], ['norwegian', 'celebrity'],
];
