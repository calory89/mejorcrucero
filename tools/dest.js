// Destino de MejorCrucero a partir del nombre de zona de la naviera (español o inglés) y de los puertos.
// Lo usan los importadores cuando su propio código de zona no basta.
const EAST = /grec|greek|greece|croac|croatia|turqu|turkey|santorin|mykonos|atenas|athens|pireo|piraeus|corf|kotor|dubrovnik|venec|venice|trieste|bari|estambul|istanbul|split|zadar|rodas|rhodes|creta|crete/i;
const FJORD = /noruega|norway|fiord|fjord|bergen|geiranger|stavanger|fl[aå]m|hellesylt|[aå]lesund|olden/i;
export function destFromName(name = '', ports = []) {
  const t = `${name} ${ports.join(' ')}`;
  if (/haw[aá]i/i.test(name)) return 'hawai';
  if (/baja|riviera mexicana|mexican riviera|costa pac[ií]fica|pacific coast/i.test(name)) return 'riviera-mexicana';
  if (/bermud/i.test(name)) return 'bermudas';
  if (/canad|nueva inglaterra|new england/i.test(name)) return 'canada-nueva-inglaterra';
  if (/panam/i.test(name)) return 'canal-de-panama';
  if (/australia|nueva zelanda|new zealand|pac[ií]fico sur|south pacific/i.test(name)) return 'australia-y-pacifico';
  if (/asia|jap[oó]n|japan|china|singap/i.test(name)) return 'asia';
  if (/alaska/i.test(name)) return 'alaska';
  if (/caribe|caribbean|bahamas/i.test(name)) return 'caribe';
  if (/brit[aá]n|british isles|irland|ireland/i.test(name)) return 'islas-britanicas';
  if (/escandinav|scandinavia|b[aá]ltic|baltic|norte de europa|northern europe/i.test(name)) return FJORD.test(t) ? 'fiordos-noruegos' : 'capitales-balticas';
  if (/canari|madeira/i.test(name)) return 'canarias-y-madeira';
  if (/transatl/i.test(name)) return 'transatlanticos';
  if (/sudam|south america|brasil|argentin/i.test(name)) return 'sudamerica';
  if (EAST.test(name)) return 'mediterraneo-oriental';
  if (/medit|spain|espa[ñn]a|portugal|france|francia|ital/i.test(name)) return EAST.test(t) ? 'mediterraneo-oriental' : 'mediterraneo-occidental';
  if (/extraordinar|vuelta al mundo|world/i.test(name)) return 'especiales';
  return null;
}
