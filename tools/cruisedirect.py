"""Mapa de barcos de MejorCrucero -> IDs del buscador de CruiseDirect (para enlazar a la salida exacta).
Uso: python3 tools/cruisedirect.py  (en GitHub Actions; desde la sesión no se llega a cruisedirect.com)
Escribe src/data/cruisedirect.json: { lines: {slug: página}, ships: {slug: id}, checked: fecha }.
El enlace final es /cruise-line/<línea>?f[0]=departure_date:(min:..,max:..)&f[1]=ship:<id> (lo arma src/lib.js cdLink)."""
import csv, html, json, os, re, sys, time, unicodedata, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'src/data/cruisedirect.json')
UA = {'User-Agent': 'Mozilla/5.0 (compatible; MejorCruceroBot/1.0; +https://mejorcrucero.com)', 'Accept-Language': 'en-US,en;q=0.8'}
# slug de naviera en MejorCrucero -> página de naviera en CruiseDirect
LINES = {'carnival': 'carnival-cruise-line', 'norwegian': 'norwegian-cruise-line', 'costa': 'costa-cruises', 'msc': 'msc-cruises',
         'royal-caribbean': 'royal-caribbean', 'celebrity': 'celebrity-cruises', 'princess': 'princess-cruises', 'disney': 'disney-cruise-line',
         'cunard': 'cunard', 'holland-america': 'holland-america', 'virgin-voyages': 'virgin-voyages', 'oceania': 'oceania-cruises',
         'regent': 'regent-seven-seas', 'explora': 'explora-journeys'}


def slugify(s):
    s = unicodedata.normalize('NFD', s); s = ''.join(c for c in s if unicodedata.category(c) != 'Mn').lower().replace('&', 'and')
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


def get(url):
    for i in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r: return r.read().decode('utf-8', 'replace')
        except Exception as e:
            print('reintento', url, e, flush=True); time.sleep(5 * (i + 1))
    return ''


ships = {}
lines_ok = {}
for slug, page in LINES.items():
    h = get(f'https://www.cruisedirect.com/cruise-line/{page}')
    if not h: print('sin respuesta', page); continue
    lines_ok[slug] = page
    for m in re.finditer(r'<a\b[^>]*href="([^"]*ship(?:%3A|:)(\d+)[^"]*)"[^>]*>(.*?)</a>', h, re.S):
        name = html.unescape(re.sub(r'<[^>]+>', ' ', m.group(3)))
        name = re.sub(r'\(\s*[\d,]+\s*\)', '', name)
        name = re.sub(r'\s+', ' ', name).strip()
        if name: ships.setdefault(slugify(name), int(m.group(2)))
    time.sleep(2)

ours = set()
for f in ['ships.csv', 'ships_extra.csv']:
    p = os.path.join(ROOT, 'src/data', f)
    if os.path.exists(p): ours |= {slugify(r['name']) for r in csv.DictReader(open(p))}
raw = json.load(open(os.path.join(ROOT, 'src/data/sailings.json')))
raw = raw['sailings'] if isinstance(raw, dict) else raw
ours |= {x['ship'] for x in raw}
keep = {k: v for k, v in sorted(ships.items()) if k in ours}
print(f'{len(ships)} barcos en CruiseDirect, {len(keep)} coinciden con los nuestros')
active = sorted({x['ship'] for x in raw})
print('con salidas y sin ID:', [s for s in active if s not in keep])
if len(keep) < 20: print('ERROR: muy pocos barcos, no se guarda'); sys.exit(1)
json.dump({'lines': lines_ok, 'ships': keep, 'checked': time.strftime('%Y-%m-%d')}, open(OUT, 'w'), ensure_ascii=False, indent=1)
print('OK')
