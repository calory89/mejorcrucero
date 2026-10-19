// Contenido editorial y de configuración de MejorCrucero.com
// REGLA: nada inventado. Cada cifra tiene fuente (ver SOURCES). Si un dato no está verificado, no se publica.

export const CONFIG = {
  siteName: 'MejorCrucero',
  siteUrl: 'https://mejorcrucero.com',
  tagline: 'Compara cruceros en español: barcos, vídeos, precio real y opiniones de cruceristas',
  // Afiliación: rellenar con los IDs reales al darse de alta. Vacío = enlace normal.
  affiliates: {
    logitravel: { name: 'Logitravel', url: 'https://www.logitravel.com/cruceros/', param: '' },
    crucerosnet: { name: 'Crucerosnet', url: 'https://www.crucerosnet.com/', param: '' },
    vayacruceros: { name: 'VayaCruceros', url: 'https://www.vayacruceros.com/', param: '' },
    civitatis: { name: 'Civitatis', base: 'https://www.civitatis.com/es/', param: '' }, // p.ej. 'aid=1234'
  },
  // Endpoint POST (JSON) para alertas de precio y newsletter. Vacío = se guardan solo en el dispositivo.
  formEndpoint: '',
  // Foro y opiniones con Giscus (GitHub Discussions). Activar tras instalar https://github.com/apps/giscus en el repo.
  giscus: {
    enabled: false,
    repo: 'calory89/mejorcrucero',
    repoId: 'R_kgDOVPR2yg',
    category: 'General',
    categoryId: '',
  },
  happyLowCost: 'https://www.facebook.com/happylowcostofficialpage',
};

// Cargos de servicio diarios por persona (USD, mercado EE. UU.). Fuente: Cruzely, actualizado 3-feb-2026.
// En Europa pueden variar o venir incluidos en la tarifa: el usuario siempre puede ajustarlo.
export const LINES = {
  'Royal Caribbean International': { slug: 'royal-caribbean', short: 'Royal Caribbean', web: 'https://www.royalcaribbean.com/', tip: 18.5, tipSuite: 21, color: '#1d4ed8', es: false,
    blurb: 'La naviera de los barcos más grandes del mundo (clase Oasis e Icon): toboganes, parques acuáticos, patinaje sobre hielo y espectáculos tipo Broadway. Ideal para familias y para quien quiere un "resort flotante".' },
  'MSC Cruises': { slug: 'msc', short: 'MSC Cruceros', web: 'https://www.msccruceros.es/', tip: 16, tipSuite: 20, color: '#0b2a5b', es: true,
    blurb: 'Naviera de origen italo-suizo muy presente en el Mediterráneo y con salidas desde puertos españoles. Ambiente internacional, anuncios en varios idiomas incluido el español, y el MSC Yacht Club como "barco dentro del barco".' },
  'Costa Cruises': { slug: 'costa', short: 'Costa Cruceros', web: 'https://www.costacruceros.es/', tip: null, tipSuite: null, color: '#f2b705', es: true,
    blurb: 'Naviera italiana con mucha tradición entre el público español y latino. Barcos como el Costa Smeralda y el Costa Toscana, con salidas habituales desde el Mediterráneo occidental.' },
  'Norwegian Cruise Line': { slug: 'norwegian', short: 'Norwegian (NCL)', web: 'https://www.ncl.com/', tip: 20, tipSuite: 25, color: '#0e7490', es: false,
    blurb: 'Pionera del "freestyle cruising": sin horarios fijos de cena ni código de vestimenta estricto. The Haven es su zona de suites con servicio exclusivo.' },
  'Carnival Cruise Line': { slug: 'carnival', short: 'Carnival', web: 'https://www.carnival.com/', tip: 16, tipSuite: 18, color: '#c2410c', es: false,
    blurb: 'La naviera "divertida" por excelencia en EE. UU., con barcos como el Mardi Gras y la montaña rusa BOLT. Muy orientada al Caribe desde puertos estadounidenses.' },
  'Princess Cruises': { slug: 'princess', short: 'Princess', web: 'https://www.princess.com/', tip: 17, tipSuite: 19, color: '#1e3a8a', es: false,
    blurb: 'Ambiente más tranquilo y clásico, buena gastronomía y el sistema MedallionClass. Gran presencia en Alaska y el Mediterráneo.' },
  'Celebrity Cruises': { slug: 'celebrity', short: 'Celebrity', web: 'https://www.celebritycruises.com/', tip: 18, tipSuite: 23, color: '#111827', es: false,
    blurb: 'Lujo moderno a precio premium: diseño cuidado, gastronomía destacada y la plataforma Magic Carpet en la clase Edge. Público adulto.' },
  'Disney Cruise Line': { slug: 'disney', short: 'Disney Cruise Line', web: 'https://disneycruise.disney.go.com/', tip: 16, tipSuite: 27.25, color: '#7c3aed', es: false,
    blurb: 'La opción de referencia para familias con niños, con personajes, espectáculos y zonas infantiles muy cuidadas. Precio alto.' },
  'P&O Cruises': { slug: 'po-cruises', short: 'P&O Cruises', web: 'https://www.pocruises.com/', tip: null, tipSuite: null, color: '#0f3d5e', es: false,
    blurb: 'Naviera británica pensada para el público del Reino Unido. Barcos como el Arvia y el Iona.' },
  'AIDA Cruises': { slug: 'aida', short: 'AIDA', web: 'https://www.aida.de/', tip: null, tipSuite: null, color: '#db2777', es: false,
    blurb: 'Naviera alemana, muy popular en el mercado germanohablante, reconocible por los labios pintados en la proa.' },
  'TUI Cruises': { slug: 'tui-cruises', short: 'TUI Cruises', web: 'https://www.tuicruises.com/', tip: null, tipSuite: null, color: '#0369a1', es: false,
    blurb: 'Naviera alemana de la flota Mein Schiff, con un enfoque "premium todo incluido" para el mercado germanohablante.' },
  'Cunard Line': { slug: 'cunard', short: 'Cunard', web: 'https://www.cunard.com/', tip: null, tipSuite: null, color: '#7f1d1d', es: false,
    blurb: 'La naviera de los transatlánticos. El Queen Mary 2 cruza el Atlántico entre Southampton y Nueva York con un estilo clásico y elegante.' },
  'Dream Cruises': { slug: 'dream-cruises', short: 'Dream Cruises', web: null, tip: null, tipSuite: null, color: '#9333ea', es: false,
    blurb: 'Naviera orientada al mercado asiático.' },
  'Aroya Cruises': { slug: 'aroya', short: 'Aroya Cruises', web: null, tip: null, tipSuite: null, color: '#047857', es: false,
    blurb: 'Naviera saudí orientada al mar Rojo y al público de Oriente Medio.' },
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
