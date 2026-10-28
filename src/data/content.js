// Contenido editorial y de configuración de MejorCrucero.com
// REGLA: nada inventado. Cada cifra tiene fuente (ver SOURCES). Si un dato no está verificado, no se publica.

export const CONFIG = {
  siteName: 'MejorCrucero',
  siteUrl: 'https://mejorcrucero.com',
  tagline: 'Compara y elige tu mejor crucero al mejor precio',
  // Afiliación: rellenar con los IDs reales al darse de alta. Vacío = enlace normal.
  affiliates: {
    cruisedirect: { name: 'CruiseDirect', url: 'https://www.cruisedirect.com/', param: '' }, // va por CJ: activo cuando exista cj.links.cruisedirect.aid
    // Logitravel ES por Awin (aceptado el 28-oct-2026): awinmid 11074, publisher 3132800. Enlaces con lib.js affLink/ltLink
    logitravel: { name: 'Logitravel', url: 'https://www.logitravel.com/cruceros/', param: '', awin: { mid: '11074' } },
    crucerosnet: { name: 'Crucerosnet', url: 'https://www.crucerosnet.com/', param: '' },
    vayacruceros: { name: 'VayaCruceros', url: 'https://www.vayacruceros.com/', param: '' },
    civitatis: { name: 'Civitatis', base: 'https://www.civitatis.com/es/', param: '' }, // p.ej. 'aid=1234'
  },
  // Endpoint POST (JSON) para alertas de precio y newsletter. Vacío = se guardan solo en el dispositivo.
  formEndpoint: '',
  // API propia (Cloudflare Worker en backend/). Vacío = funciones de comunidad en modo "abre pronto".
  api: 'https://mejorcrucero-api.mejorcrucero.workers.dev',
  // Cloudflare Web Analytics (sin cookies). Vacío = desactivado.
  cfBeacon: '37bd2ff83b984ab597913eaa6ba0d248',
  // Tests A/B: variantes de texto que se reparten al azar y se miden con /evt
  ab: { heroCta: ['Ver cruceros', 'Buscar cruceros'], salidaCta: ['Ver precio en {n}', 'Reservar en {n}', 'Ver disponibilidad en {n}'] },
  author: { name: 'Carlos de Ory', role: 'Fundador de MejorCrucero y de Happy Low Cost' },
  // Foro y opiniones con Giscus (GitHub Discussions). Activar tras instalar https://github.com/apps/giscus en el repo.
  giscus: {
    enabled: false,
    repo: 'calory89/mejorcrucero',
    repoId: 'R_kgDOVPR2yg',
    category: 'General',
    categoryId: '',
  },
  happyLowCost: 'https://www.facebook.com/happylowcostofficialpage',
  // CJ (Commission Junction): propiedad "MejorCrucero" = PID 101909239. Solo programas APROBADOS (21-oct-2026).
  awin: { affid: '3132800' },
  cj: {
    pid: '101909239',
    host: 'https://www.kqzyfj.com',
    links: {
      hotel: { aid: '17288959', name: 'Booking.com', what: 'Hoteles', def: 'https://www.booking.com/index.es.html' },
      flight: { aid: '17288982', name: 'Booking.com', what: 'Vuelos', def: 'https://www.booking.com/flights/index.es.html' },
      attr: { aid: '17288984', name: 'Booking.com', what: 'Excursiones y entradas', def: 'https://www.booking.com/attractions/index.es.html' },
      taxi: { aid: '17322565', name: 'Booking.com', what: 'Traslados', def: 'https://www.booking.com/taxi/index.es.html' },
      car: { aid: '12506471', name: 'Holiday Autos', what: 'Alquiler de coches', def: 'https://www.holidayautos.com/es/' },
      vpn: { aid: '13942081', name: 'NordVPN', what: 'VPN para el wifi del barco', def: null },
      orlando: { aid: '12834895', name: 'Undercover Tourist', what: 'Entradas a parques de Orlando', def: null },
    },
  },
};

// Cargos de servicio diarios por persona (USD, mercado EE. UU.). Fuente: Cruzely, actualizado 3-feb-2026.
// En Europa pueden variar o venir incluidos en la tarifa: el usuario siempre puede ajustarlo.
export const LINES = {
  'Royal Caribbean International': { tier: 'estandar', slug: 'royal-caribbean', short: 'Royal Caribbean', web: 'https://www.royalcaribbean.com/', tip: 18.5, tipSuite: 21, color: '#1d4ed8', es: false,
    blurb: 'La naviera de los barcos más grandes del mundo (clase Oasis e Icon): toboganes, parques acuáticos, patinaje sobre hielo y espectáculos tipo Broadway. Ideal para familias y para quien quiere un "resort flotante".' },
  'MSC Cruises': { tier: 'estandar', slug: 'msc', short: 'MSC Cruceros', web: 'https://www.msccruceros.es/', tip: 16, tipSuite: 20, color: '#0b2a5b', es: true,
    blurb: 'Naviera de origen italo-suizo muy presente en el Mediterráneo y con salidas desde puertos españoles. Ambiente internacional, anuncios en varios idiomas incluido el español, y el MSC Yacht Club como "barco dentro del barco".' },
  'Costa Cruises': { tier: 'estandar', slug: 'costa', short: 'Costa Cruceros', web: 'https://www.costacruceros.es/', tip: null, tipSuite: null, color: '#f2b705', es: true,
    blurb: 'Naviera italiana con mucha tradición entre el público español y latino. Barcos como el Costa Smeralda y el Costa Toscana, con salidas habituales desde el Mediterráneo occidental.' },
  'Norwegian Cruise Line': { tier: 'estandar', slug: 'norwegian', short: 'Norwegian (NCL)', web: 'https://www.ncl.com/', tip: 20, tipSuite: 25, color: '#0e7490', es: false,
    blurb: 'Pionera del "freestyle cruising": sin horarios fijos de cena ni código de vestimenta estricto. The Haven es su zona de suites con servicio exclusivo.' },
  'Carnival Cruise Line': { tier: 'estandar', slug: 'carnival', short: 'Carnival', web: 'https://www.carnival.com/', tip: 16, tipSuite: 18, color: '#c2410c', es: false,
    blurb: 'La naviera "divertida" por excelencia en EE. UU., con barcos como el Mardi Gras y la montaña rusa BOLT. Muy orientada al Caribe desde puertos estadounidenses.' },
  'Princess Cruises': { tier: 'premium', slug: 'princess', short: 'Princess', web: 'https://www.princess.com/', tip: 17, tipSuite: 19, color: '#1e3a8a', es: false,
    blurb: 'Ambiente más tranquilo y clásico, buena gastronomía y el sistema MedallionClass. Gran presencia en Alaska y el Mediterráneo.' },
  'Celebrity Cruises': { tier: 'premium', slug: 'celebrity', short: 'Celebrity', web: 'https://www.celebritycruises.com/', tip: 18, tipSuite: 23, color: '#111827', es: false,
    blurb: 'Lujo moderno a precio premium: diseño cuidado, gastronomía destacada y la plataforma Magic Carpet en la clase Edge. Público adulto.' },
  'Disney Cruise Line': { tier: 'premium', slug: 'disney', short: 'Disney Cruise Line', web: 'https://disneycruise.disney.go.com/', tip: 16, tipSuite: 27.25, color: '#7c3aed', es: false,
    blurb: 'La opción de referencia para familias con niños, con personajes, espectáculos y zonas infantiles muy cuidadas. Precio alto.' },
  'P&O Cruises': { tier: 'estandar', slug: 'po-cruises', short: 'P&O Cruises', web: 'https://www.pocruises.com/', tip: null, tipSuite: null, color: '#0f3d5e', es: false,
    blurb: 'Naviera británica pensada para el público del Reino Unido. Barcos como el Arvia y el Iona.' },
  'AIDA Cruises': { tier: 'estandar', slug: 'aida', short: 'AIDA', web: 'https://www.aida.de/', tip: null, tipSuite: null, color: '#db2777', es: false,
    blurb: 'Naviera alemana, muy popular en el mercado germanohablante, reconocible por los labios pintados en la proa.' },
  'TUI Cruises': { tier: 'premium', slug: 'tui-cruises', short: 'TUI Cruises', web: 'https://www.tuicruises.com/', tip: null, tipSuite: null, color: '#0369a1', es: false,
    blurb: 'Naviera alemana de la flota Mein Schiff, con un enfoque "premium todo incluido" para el mercado germanohablante.' },
  'Cunard Line': { tier: 'premium', slug: 'cunard', short: 'Cunard', web: 'https://www.cunard.com/', tip: null, tipSuite: null, color: '#7f1d1d', es: false,
    blurb: 'La naviera de los transatlánticos. El Queen Mary 2 cruza el Atlántico entre Southampton y Nueva York con un estilo clásico y elegante.' },
  'Dream Cruises': { tier: 'estandar', slug: 'dream-cruises', short: 'Dream Cruises', web: null, tip: null, tipSuite: null, color: '#9333ea', es: false,
    blurb: 'Naviera orientada al mercado asiático.' },
  'Aroya Cruises': { tier: 'estandar', slug: 'aroya', short: 'Aroya Cruises', web: null, tip: null, tipSuite: null, color: '#047857', es: false,
    blurb: 'Naviera saudí orientada al mar Rojo y al público de Oriente Medio.' },
  'Holland America Line': { slug: 'holland-america', short: 'Holland America', web: 'https://www.hollandamerica.com/', tip: 17, tipSuite: 19, color: '#0c2d5a', es: false, tier: 'premium',
    blurb: 'Naviera clásica de ambiente tranquilo, con música en vivo y buena oferta en Alaska y Europa.' },
  'Virgin Voyages': { slug: 'virgin-voyages', short: 'Virgin Voyages', web: 'https://www.virginvoyages.com/', tip: 22, tipSuite: 22, color: '#b91c1c', es: false, tier: 'premium',
    blurb: 'Solo para adultos, con diseño moderno y restaurantes incluidos. Tiene barcos con salidas desde Barcelona.' },
  'Oceania Cruises': { slug: 'oceania', short: 'Oceania Cruises', web: 'https://www.oceaniacruises.com/', tip: null, tipSuite: null, color: '#1f2937', es: false, tier: 'lujo',
    blurb: 'Barcos medianos centrados en la gastronomía y en itinerarios con muchos puertos.' },
  'Regent Seven Seas Cruises': { slug: 'regent', short: 'Regent Seven Seas', web: 'https://www.rssc.com/', tip: null, tipSuite: null, color: '#1e293b', es: false, tier: 'lujo',
    blurb: 'Lujo con todo incluido: suites, bebidas, excursiones y propinas en el precio.' },
  'Viking': { slug: 'viking', short: 'Viking', web: 'https://www.vikingcruises.com/', tip: null, tipSuite: null, color: '#7c2d12', es: false, tier: 'lujo',
    blurb: 'Barcos sin casino ni niños, enfocados en cultura y destinos, con muchas inclusiones.' },
  'Explora Journeys': { slug: 'explora', short: 'Explora Journeys', web: 'https://explorajourneys.com/', tip: null, tipSuite: null, color: '#334155', es: false, tier: 'lujo',
    blurb: 'La marca de lujo del grupo MSC: suites con terraza y servicio de alto nivel.' },
  'Azamara': { slug: 'azamara', short: 'Azamara', web: 'https://www.azamara.com/', tip: null, tipSuite: null, color: '#1e3a8a', es: false, tier: 'premium',
    blurb: 'Barcos pequeños con estancias largas en puerto y noches en destino.' },
  'Silversea Cruises': { slug: 'silversea', short: 'Silversea', web: 'https://www.silversea.com/', tip: null, tipSuite: null, color: '#475569', es: false, tier: 'lujo',
    blurb: 'Lujo ultra con barcos pequeños y expediciones a destinos remotos.' },
  'Seabourn': { slug: 'seabourn', short: 'Seabourn', web: 'https://www.seabourn.com/', tip: null, tipSuite: null, color: '#0f172a', es: false, tier: 'lujo',
    blurb: 'Lujo íntimo, todo suites y mucho servicio personalizado.' },
  'Ponant': { slug: 'ponant', short: 'Ponant', web: 'https://www.ponant.com/', tip: null, tipSuite: null, color: '#1d4ed8', es: false, tier: 'lujo',
    blurb: 'Naviera francesa de yates de expedición y lujo, de los Polos al Mediterráneo.' },
  'Celestyal': { slug: 'celestyal', short: 'Celestyal', web: 'https://celestyal.com/', tip: null, tipSuite: null, color: '#0369a1', es: false, tier: 'estandar',
    blurb: 'Especialista griega en islas del Egeo, con barcos medianos y ambiente local.' },
  'Hurtigruten': { slug: 'hurtigruten', short: 'Hurtigruten', web: 'https://www.hurtigruten.com/', tip: null, tipSuite: null, color: '#991b1b', es: false, tier: 'premium',
    blurb: 'La ruta costera de Noruega: barcos que conectan puertos del norte, ideales para auroras.' },
  'Marella Cruises': { slug: 'marella', short: 'Marella', web: 'https://www.tui.co.uk/cruise', tip: null, tipSuite: null, color: '#0e7490', es: false, tier: 'estandar',
    blurb: 'Naviera británica del grupo TUI con muchas inclusiones, orientada al público del Reino Unido.' },
  'Fred. Olsen Cruise Lines': { slug: 'fred-olsen', short: 'Fred. Olsen', web: 'https://www.fredolsencruises.com/', tip: null, tipSuite: null, color: '#14532d', es: false, tier: 'estandar',
    blurb: 'Barcos pequeños y clásicos para el mercado británico.' },
  'Ambassador Cruise Line': { slug: 'ambassador', short: 'Ambassador', web: 'https://www.ambassadorcruiseline.com/', tip: null, tipSuite: null, color: '#1e40af', es: false, tier: 'estandar',
    blurb: 'Naviera británica de barcos clásicos para público adulto.' },
  'Margaritaville at Sea': { slug: 'margaritaville', short: 'Margaritaville at Sea', web: 'https://www.margaritavilleatsea.com/', tip: null, tipSuite: null, color: '#ca8a04', es: false, tier: 'estandar',
    blurb: 'Cruceros cortos y festivos desde Florida.' },
};


// Vídeos reales de YouTube (IDs verificados vía búsqueda el 19-oct-2026). Facade ligero: solo carga el iframe al hacer clic.
export const VIDEOS = {
  'msc-world-europa': [
    ['1ytDMb3w1Ac', 'Tour rápido del MSC World Europa'],
    ['724VLTkVYak', 'MSC World Europa completo en 8 minutos (4K)'],
    ['_5hVJ8irJMM', 'Tour completo y opinión sincera'],
  ],
  'icon-of-the-seas': [
    ['oOTIDNuLdjA', 'Icon of the Seas: cada cubierta y zona (2026)'],
    ['RF2x34p1eQU', 'Icon of the Seas: tour completo'],
    ['wrTyq65mh7s', 'Novedades 2026 y consejos imprescindibles'],
  ],
  'costa-smeralda': [
    ['ZNPiuoiCd4U', 'Costa Smeralda en 10 minutos (4K, 2026)'],
    ['UTjZf9oQqak', 'Tour completo del Costa Smeralda 2026'],
    ['t8P8Q4XkCao', '7 noches por el Mediterráneo: opinión sin patrocinio'],
  ],
  'costa-toscana': [
    ['a-ckTDrBg_Q', 'Así es el Costa Toscana: tour completo en español'],
    ['xnifazHV3AM', 'Costa Toscana completo en 5 minutos (4K)'],
    ['J7ycq4n-sI0', 'Lo bueno, lo malo y lo feo del Costa Toscana'],
  ],
  'msc-grandiosa': [
    ['7F6EoCivKjQ', 'MSC Grandiosa: tour completo 2026 (4K)'],
    ['PSswYv03wco', 'MSC Grandiosa en 5 minutos (4K)'],
    ['CnrrFjZusls', 'Por dentro, cubierta a cubierta'],
  ],
  'wonder-of-the-seas': [
    ['COWPZI4Pp3I', 'Wonder of the Seas: novedades 2026 y consejos'],
    ['LPnOjt78U6M', 'Wonder of the Seas: tour completo'],
    ['_AFqV7Q2faI', 'Recorrido completo del barco'],
  ],
  'msc-euribia': [
    ['VmwfeJvZPtw', 'MSC Euribia: tour completo'],
    ['0UuHPje-qqQ', 'Cubierta a cubierta en 5 minutos'],
    ['ghXkHbOjelk', 'MSC Euribia: tour completo del barco nuevo'],
  ],
  'msc-seashore': [
    ['v146QDdGch4', 'MSC Seashore: el tour definitivo'],
    ['RM3WatVUM0E', 'Por dentro y opinión sincera'],
    ['s60DxsQGRLI', 'Tour completo en 4K'],
  ],
};

// Temas de vídeo para buscar en YouTube desde cada ficha (camarotes, comida, etc.)
export const VIDEO_TOPICS = [
  ['Tour completo', 'ship tour'],
  ['Camarote interior', 'inside cabin'],
  ['Camarote con balcón', 'balcony cabin'],
  ['Suites', 'suite'],
  ['Bufé y restaurantes', 'buffet food'],
  ['Piscinas y toboganes', 'pool deck'],
  ['Niños y familia', 'kids club'],
  ['Opinión sincera', 'honest review'],
];

// Puertos de embarque en España. Excursiones vía Civitatis (slug de destino).
export const HOME_PORTS = [
  { slug: 'barcelona', name: 'Barcelona', civ: 'barcelona', region: 'Cataluña',
    text: 'El gran puerto de cruceros de España y uno de los principales del Mediterráneo. Desde aquí salen itinerarios por el Mediterráneo occidental de casi todas las grandes navieras.' },
  { slug: 'palma', name: 'Palma de Mallorca', civ: 'palma-de-mallorca', region: 'Islas Baleares',
    text: 'Puerto de escala y de embarque muy habitual en itinerarios por el Mediterráneo occidental. Embarcar aquí permite combinar unos días de isla con el crucero.' },
  { slug: 'valencia', name: 'Valencia', civ: 'valencia', region: 'Comunidad Valenciana',
    text: 'Puerto de embarque cómodo para el centro y el este peninsular, con salidas por el Mediterráneo occidental.' },
  { slug: 'malaga', name: 'Málaga', civ: 'malaga', region: 'Andalucía',
    text: 'Puerta de entrada de la Costa del Sol. Escala habitual y punto de embarque para cruceros por el Mediterráneo y rumbo a las islas atlánticas.' },
  { slug: 'alicante', name: 'Alicante', civ: 'alicante', region: 'Comunidad Valenciana',
    text: 'Escala del Mediterráneo con el centro de la ciudad a un paseo de la terminal.' },
  { slug: 'cadiz', name: 'Cádiz', civ: 'cadiz', region: 'Andalucía',
    text: 'Escala atlántica clásica, con fácil acceso a Sevilla y Jerez como excursión.' },
  { slug: 'tarragona', name: 'Tarragona', civ: 'tarragona', region: 'Cataluña',
    text: 'Puerto en crecimiento en el Mediterráneo, con el patrimonio romano de la ciudad cerca del muelle.' },
  { slug: 'bilbao', name: 'Bilbao', civ: 'bilbao', region: 'País Vasco',
    text: 'Escala de los cruceros por el norte de Europa y la costa atlántica; las terminales están en Getxo, con conexión a Bilbao.' },
  { slug: 'vigo', name: 'Vigo', civ: 'vigo', region: 'Galicia',
    text: 'Escala atlántica con la terminal en pleno centro, puerta para excursiones a Santiago de Compostela.' },
  { slug: 'tenerife', name: 'Santa Cruz de Tenerife', civ: 'tenerife', region: 'Canarias',
    text: 'Las Canarias son destino de cruceros en otoño e invierno, con itinerarios entre islas y hacia Madeira.' },
  { slug: 'gran-canaria', name: 'Las Palmas de Gran Canaria', civ: 'gran-canaria', region: 'Canarias',
    text: 'Puerto clave de la temporada de invierno en Canarias, con embarques para recorrer las islas.' },
];

export const AMERICA_PORTS = [
  { slug: 'miami', name: 'Miami', civ: 'miami', region: 'Florida, EE. UU.', text: 'Conocida como la capital mundial de los cruceros: desde aquí salen a diario barcos hacia el Caribe y las Bahamas.' },
  { slug: 'fort-lauderdale', name: 'Fort Lauderdale (Port Everglades)', civ: null, region: 'Florida, EE. UU.', text: 'A pocos kilómetros de Miami, otro de los grandes puertos de salida hacia el Caribe.' },
  { slug: 'port-canaveral', name: 'Port Canaveral', civ: null, region: 'Florida, EE. UU.', text: 'Puerto cercano a Orlando: muy cómodo para combinar parques temáticos y crucero.' },
  { slug: 'san-juan', name: 'San Juan', civ: null, region: 'Puerto Rico', text: 'Puerto de salida hacia el Caribe sur, con el Viejo San Juan junto al muelle.' },
  { slug: 'buenos-aires', name: 'Buenos Aires', civ: 'buenos-aires', region: 'Argentina', text: 'Puerto de la temporada de verano austral, con itinerarios por Uruguay y Brasil.' },
];

export const SCALE_PORTS = [
  ['Roma (Civitavecchia)', 'roma'], ['Nápoles', 'napoles'], ['Florencia (La Spezia / Livorno)', 'florencia'],
  ['Génova', 'genova'], ['Marsella', 'marsella'], ['Malta', 'malta'], ['Atenas (El Pireo)', 'atenas'],
  ['Santorini', 'santorini'], ['Mykonos', 'mykonos'], ['Dubrovnik', 'dubrovnik'], ['Kotor', 'kotor'],
  ['Venecia', 'venecia'], ['Lisboa', 'lisboa'],
];

export const SOURCES = [
  ['Datos de barcos (año, arqueo bruto, pasajeros): Wikipedia, "List of largest cruise ships", consultado el 19-oct-2026', 'https://en.wikipedia.org/wiki/List_of_largest_cruise_ships'],
  ['Cargos de servicio por naviera (USD, mercado EE. UU.): Cruzely, actualizado el 3-feb-2026', 'https://www.cruzely.com/full-guide-to-cruise-ship-gratuities-for-2019-amounts-etiquette-and-more/'],
  ['Cruceristas españoles: Forbes España / CLIA (610.000 en 2024)', 'https://forbes.es/economia/813790/luigi-stefanelli-costa-cruceros-espana-es-un-mercado-estrategico-con-un-peso-cada-vez-mayor/'],
];
