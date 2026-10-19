// MejorCrucero Score (0–100): nota objetiva por barco con datos públicos verificables.
// La fórmula se publica en /metodologia/. Nada de pesos ocultos ni de notas compradas.
export const YEAR_NOW = 2026;
const clamp = (x) => Math.max(0, Math.min(1, x));

export const PARTS = [
  { k: 'higiene', label: 'Higiene', max: 25, how: 'Media de las últimas (hasta 3) inspecciones sanitarias oficiales del CDC de EE. UU. (Vessel Sanitation Program, nota 0–100), solo si la última es de los últimos 4 años. 100 = 25 puntos; 70 o menos = 0. El CDC considera suspenso 85 o menos.' },
  { k: 'espacio', label: 'Espacio por pasajero', max: 25, how: 'Arqueo bruto dividido entre pasajeros a doble ocupación. 55 o más = 25 puntos; 25 o menos = 0.' },
  { k: 'servicio', label: 'Tripulación por pasajero', max: 15, how: 'Pasajeros por cada tripulante. 1,2 o menos = 15 puntos; 3 o más = 0.' },
  { k: 'modernidad', label: 'Modernidad', max: 15, how: 'Edad del barco (nuevo = 15 puntos, 30 años o más = 0) con un extra de hasta 4 puntos si tuvo una reforma importante en los últimos 8 años.' },
  { k: 'comunidad', label: 'Opiniones verificadas', max: 20, how: 'Nota media de las opiniones de la comunidad de MejorCrucero (1 a 5 estrellas), solo con 5 opiniones o más, y suavizada hacia 3,5 cuando hay pocas.' },
];

export function scoreShip(s, { vsp, community }) {
  const parts = [];
  const v = vsp?.[s.name];
  // Solo inspecciones de los últimos 4 años: una nota de 2014 no dice nada del barco de hoy.
  if (v && +String(v.date).slice(0, 4) >= YEAR_NOW - 4) {
    const val = v.avg3 ?? v.score;
    parts.push({ k: 'higiene', frac: clamp((val - 70) / 30), detail: `${String(Math.round(val * 10) / 10).replace('.', ',')}/100 en ${v.n > 1 ? `las ${v.n} últimas inspecciones` : 'la última inspección'} del CDC (${v.date})`, source: v.source });
  }
  if (s.ratio) parts.push({ k: 'espacio', frac: clamp((s.ratio - 25) / 30), detail: `${String(s.ratio).replace('.', ',')} GT por pasajero`, source: s.source });
  if (s.pax && s.crew && s.pax / s.crew >= 0.5 && s.pax / s.crew <= 5) { // fuera de ese rango el dato es casi seguro erróneo
    const r = s.pax / s.crew;
    parts.push({ k: 'servicio', frac: clamp((3 - r) / 1.8), detail: `${String(Math.round(r * 100) / 100).replace('.', ',')} pasajeros por tripulante (${s.crew.toLocaleString('es-ES')} tripulantes)`, source: s.specSource || s.source });
  }
  {
    const age = Math.max(0, YEAR_NOW - s.year);
    let frac = clamp(1 - age / 30);
    const refit = s.refit && YEAR_NOW - s.refit <= 8 && s.refit > s.year;
    if (refit) frac = Math.min(1, frac + 4 / 15);
    parts.push({ k: 'modernidad', frac, detail: `${age <= 0 ? 'Nuevo' : age + (age === 1 ? ' año' : ' años')}${refit ? `, reformado en ${s.refit}` : ''}`, source: s.specSource || s.source });
  }
  const c = community?.['barco:' + s.slug];
  if (c && c.n >= 5) {
    const bay = (c.avg * c.n + 3.5 * 5) / (c.n + 5);
    parts.push({ k: 'comunidad', frac: clamp((bay - 1) / 4), detail: `${String(c.avg.toFixed(1)).replace('.', ',')}/5 con ${c.n} opiniones`, source: null });
  }
  // Sin nota si no hay al menos espacio + otros dos componentes: preferimos "sin datos" a una nota floja.
  const have = new Set(parts.map((p) => p.k));
  if (!have.has('espacio') || parts.length < 3) return null;
  let got = 0, max = 0;
  const out = parts.map((p) => { const P = PARTS.find((x) => x.k === p.k); const pts = Math.round(p.frac * P.max * 10) / 10; got += pts; max += P.max; return { ...p, label: P.label, max: P.max, pts }; });
  const total = Math.round((got / max) * 100);
  return { total, parts: out, coverage: Math.round((max / 100) * 100), missing: PARTS.filter((P) => !have.has(P.k)).map((P) => P.label) };
}

export const scoreLabel = (n) => (n == null ? 'Sin nota' : n >= 85 ? 'Excelente' : n >= 75 ? 'Muy bueno' : n >= 65 ? 'Bueno' : n >= 50 ? 'Correcto' : 'Flojo');
export const scoreClass = (n) => (n == null ? 'sc-na' : n >= 85 ? 'sc-a' : n >= 75 ? 'sc-b' : n >= 65 ? 'sc-c' : n >= 50 ? 'sc-d' : 'sc-e');

// Etiquetas automáticas a partir de datos (no opiniones)
export function tagsFor(s, L) {
  const t = [];
  if (s.gt >= 160000) t.push(['familias', 'Ideal para familias']);
  if (s.tier === 'lujo') t.push(['lujo', 'Lujo']);
  if (s.tier === 'premium') t.push(['premium', 'Ambiente cuidado']);
  if (L?.es) t.push(['espanol', 'Español a bordo']);
  if (s.ratio && s.ratio >= 45) t.push(['espacioso', 'Muy espacioso']);
  if (s.gt < 70000) t.push(['pequeno', 'Barco pequeño']);
  if (YEAR_NOW - s.year <= 3) t.push(['nuevo', 'Recién estrenado']);
  if (s.lineSlug === 'virgin-voyages') t.push(['adultos', 'Solo adultos']);
  if (s.pax && s.crew && s.pax / s.crew <= 1.6) t.push(['servicio', 'Mucha tripulación']);
  return t;
}
