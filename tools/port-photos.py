"""Foto con licencia libre para cada escala que aún no tiene (Wikipedia ES/EN -> Wikimedia Commons).
Uso: python3 tools/port-photos.py [max]  (pensado para GitHub Actions: desde la sesión Wikipedia da 429)
- Solo escalas que aparecen en sailings.json y no están en port_photos.json.
- Solo licencias libres (CC0, dominio público, CC BY, CC BY-SA). Nunca mapas, banderas, escudos ni SVG.
- Comprueba que la página de Wikipedia está a menos de 80 km de la coordenada de la escala (evita "Santo Tomás" equivocado).
- Guarda 640 y 1280 px en WebP en public/img/puertos/ y autor, licencia y enlace en port_photos.json."""
import json, math, os, re, sys, time, unicodedata, urllib.parse, urllib.request, io, html
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = lambda f: os.path.join(ROOT, 'src/data', f)
IMG = os.path.join(ROOT, 'public/img/puertos')
UA = {'User-Agent': 'MejorCruceroBot/1.0 (https://mejorcrucero.com; carlos@equinoxinvestmentgroup.com) python-urllib'}
MAX = int(sys.argv[1]) if len(sys.argv) > 1 else 400
BAD = re.compile(r'(surrender|war_|wwii|ww2|battle|soldier|troops|lobby|display|map|mapa|karte|carte|flag|bandera|escudo|coat_of_arms|wappen|blason|locator|location|localizaci|logo|seal|sello|\.svg$|\.gif$|\.tif)', re.I)
NOPORT = re.compile(r'(navegaci|date line|cruising|crossing|scenic|en el mar|at sea)', re.I)  # tramos de navegación, no son puertos
FREE = re.compile(r'^(cc0|public domain|pd|cc[ -]by(-sa)?[ -]?\d|cc[ -]by(-sa)?$|cc by-sa|cc by)', re.I)


def get(url, params=None, raw=False):
    if params: url += '?' + urllib.parse.urlencode(params)
    for i in range(6):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40) as r:
                b = r.read()
                return b if raw else json.loads(b)
        except Exception as e:
            print('  reintento', i, str(e)[:80], flush=True); time.sleep(4 * (i + 1))
    return None


def slugify(s):
    s = unicodedata.normalize('NFD', s); s = ''.join(c for c in s if unicodedata.category(c) != 'Mn').lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


def km(a, b, c, d):
    p = math.pi / 180
    h = math.sin((c - a) * p / 2) ** 2 + math.cos(a * p) * math.cos(c * p) * math.sin((d - b) * p / 2) ** 2
    return 12742 * math.asin(math.sqrt(h))


def colorful(im):
    # Fuera fotos en blanco y negro / sepia (fotos históricas) y escaneos casi sin color
    sm = im.convert('HSV').resize((64, 40)).getdata()
    sat = sum(px[1] for px in sm) / (len(sm) * 255)
    return sat > 0.14


def strip(h): return html.unescape(re.sub('<[^>]+>', '', h or '')).strip()


alias = {k: v for k, v in json.load(open(D('port_alias.json'))).items() if not k.startswith('_')}
coords = json.load(open(D('port_coords.json')))
photos = json.load(open(D('port_photos.json')))
raw = json.load(open(D('sailings.json')))
raw = raw['sailings'] if isinstance(raw, dict) else raw
count = {}
for x in raw:
    for p in (x.get('itinerary') or {}).get('ports', []):
        n = alias.get(p['name'].strip(), p['name'].strip())
        count[n] = count.get(n, 0) + 1
todo = [n for n, _ in sorted(count.items(), key=lambda kv: -kv[1]) if n not in photos and n in coords and not NOPORT.search(n)][:MAX]
print(len(todo), 'escalas sin foto con coordenadas', flush=True)
used = {v.get('page') for v in photos.values()}
BP = D('port_photos_block.json')
if os.path.exists(BP): used |= set(json.load(open(BP)).get('pages', []))  # descartadas a mano
os.makedirs(IMG, exist_ok=True)
added = 0


def candidates(lang, title):
    j = get(f'https://{lang}.wikipedia.org/w/api.php', {'action': 'query', 'format': 'json', 'redirects': 1, 'titles': title,
                                                       'prop': 'pageimages|coordinates|images', 'piprop': 'name', 'imlimit': 40})
    if not j: return None, []
    pg = next(iter(j.get('query', {}).get('pages', {}).values()), {})
    co = (pg.get('coordinates') or [None])[0]
    files = []
    if pg.get('pageimage'): files.append(pg['pageimage'])
    for im in pg.get('images', []): files.append(im['title'].split(':', 1)[1].replace(' ', '_'))
    files = [f for i, f in enumerate(files) if f not in files[:i] and not BAD.search(f)]
    return co, files


for n in todo:
    lat, lon, wurl = coords[n][0], coords[n][1], (coords[n][2] if len(coords[n]) > 2 else '')
    tries = []
    m = re.match(r'https://(\w+)\.wikipedia\.org/wiki/(.+)', wurl or '')
    if m: tries.append((m.group(1), urllib.parse.unquote(m.group(2)).replace('_', ' ')))
    tries += [('es', n), ('en', n)]
    got = None
    for lang, title in tries:
        co, files = candidates(lang, title); time.sleep(0.6)
        if co and km(lat, lon, co['lat'], co['lon']) > 80:
            print(f'  {n}: {lang}:{title} está a {km(lat, lon, co["lat"], co["lon"]):.0f} km, descartada'); continue
        for f in files[:12]:
            ii = get('https://commons.wikimedia.org/w/api.php', {'action': 'query', 'format': 'json', 'titles': 'File:' + f, 'prop': 'imageinfo',
                                                                 'iiprop': 'url|extmetadata|size|mime', 'iiurlwidth': 1280}); time.sleep(0.4)
            pg = next(iter((ii or {}).get('query', {}).get('pages', {}).values()), {})
            info = (pg.get('imageinfo') or [None])[0]
            if not info or info.get('mime') not in ('image/jpeg', 'image/png', 'image/webp'): continue
            w, h = info.get('width', 0), info.get('height', 0)
            if w < 1000 or h < 500 or w / max(h, 1) < 1.2: continue  # horizontal y con calidad
            md = info.get('extmetadata', {})
            lic = strip(md.get('LicenseShortName', {}).get('value', ''))
            if not FREE.match(lic): continue
            page = info.get('descriptionurl')
            if page in used: continue
            b = get(info.get('thumburl') or info['url'], raw=True)
            try: im = Image.open(io.BytesIO(b)).convert('RGB')
            except Exception: continue
            if not colorful(im): print(f'  {n}: {f} sin color, descartada'); used.add(page); continue
            got = {'file': f, 'url': info.get('thumburl') or info['url'], 'license': lic, 'author': strip(md.get('Artist', {}).get('value', ''))[:80] or 'Wikimedia Commons', 'page': page, 'im': im}
            break
        if got: break
    if not got: print(f'- {n}: sin foto válida', flush=True); continue
    im = got['im']
    s = slugify(n)
    ratio = round(im.width / im.height, 3)
    for W in (640, 1280):
        im.resize((W, round(W / ratio)), Image.LANCZOS).save(os.path.join(IMG, f'{s}-{W}.webp'), 'WEBP', quality=78, method=6)
    photos[n] = {'slug': s, 'thumb': f'/img/puertos/{s}-640.webp', 'large': f'/img/puertos/{s}-1280.webp', 'ratio': ratio,
                 'author': got['author'], 'license': got['license'], 'page': got['page']}
    used.add(got['page']); added += 1
    print(f'+ {n}: {got["file"]} ({got["license"]})', flush=True)
    if added % 20 == 0: json.dump(photos, open(D('port_photos.json'), 'w'), ensure_ascii=False, indent=1)

# Fotos extra (campo "more") para las escalas más visitadas: así un listado con 48 salidas de la misma ruta no repite foto
EXTRA = int(os.environ.get('EXTRA', '3')); TOPN = int(os.environ.get('EXTRA_TOP', '150'))
for n in [n for n, _ in sorted(count.items(), key=lambda kv: -kv[1]) if n in photos and n in coords][:TOPN]:
    cur = photos[n]; more = cur.setdefault('more', [])
    if len(more) >= EXTRA: continue
    wurl = coords[n][2] if len(coords[n]) > 2 else ''
    m = re.match(r'https://(\w+)\.wikipedia\.org/wiki/(.+)', wurl or '')
    tries = ([(m.group(1), urllib.parse.unquote(m.group(2)).replace('_', ' '))] if m else []) + [('en', n)]
    seen = {cur.get('page')} | {z.get('page') for z in more}
    for lang, title in tries:
        co, files = candidates(lang, title); time.sleep(0.6)
        if co and km(coords[n][0], coords[n][1], co['lat'], co['lon']) > 80: continue
        for f in files[:30]:
            if len(more) >= EXTRA: break
            ii = get('https://commons.wikimedia.org/w/api.php', {'action': 'query', 'format': 'json', 'titles': 'File:' + f, 'prop': 'imageinfo', 'iiprop': 'url|extmetadata|size|mime', 'iiurlwidth': 1280}); time.sleep(0.4)
            pg = next(iter((ii or {}).get('query', {}).get('pages', {}).values()), {})
            info = (pg.get('imageinfo') or [None])[0]
            if not info or info.get('mime') != 'image/jpeg': continue
            w, h = info.get('width', 0), info.get('height', 0)
            if w < 1200 or h < 600 or not (1.25 <= w / max(h, 1) <= 2.2): continue
            md = info.get('extmetadata', {}); lic = strip(md.get('LicenseShortName', {}).get('value', ''))
            if not FREE.match(lic) or info.get('descriptionurl') in seen or info.get('descriptionurl') in used: continue
            b = get(info.get('thumburl') or info['url'], raw=True)
            try: im = Image.open(io.BytesIO(b)).convert('RGB')
            except Exception: continue
            if not colorful(im): used.add(info['descriptionurl']); continue
            k = len(more) + 2; s2 = f"{cur['slug']}-{k}"; ratio = round(im.width / im.height, 3)
            im.resize((640, round(640 / ratio)), Image.LANCZOS).save(os.path.join(IMG, f'{s2}-640.webp'), 'WEBP', quality=76, method=6)
            more.append({'thumb': f'/img/puertos/{s2}-640.webp', 'ratio': ratio, 'author': strip(md.get('Artist', {}).get('value', ''))[:80] or 'Wikimedia Commons', 'license': lic, 'page': info['descriptionurl']})
            seen.add(info['descriptionurl']); used.add(info['descriptionurl']); print(f'+ extra {n}: {f}', flush=True)
        if len(more) >= EXTRA: break
    if not more: cur.pop('more', None)

json.dump(photos, open(D('port_photos.json'), 'w'), ensure_ascii=False, indent=1)
print(f'OK: {added} fotos nuevas, {len(photos)} escalas con foto')
