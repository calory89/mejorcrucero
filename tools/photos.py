"""Busca una foto con licencia libre de cada barco (Wikipedia -> Wikimedia Commons), en lotes de 50.
Uso: python3 tools/photos.py -> escribe src/data/photos.json con autor, licencia y enlace."""
import csv, json, re, time, urllib.parse, urllib.request, html, os, unicodedata
UA = {'User-Agent': 'MejorCruceroBot/1.0 (https://github.com/calory89/mejorcrucero) python-urllib'}
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'src/data/photos.json')
def get(url, params):
    url = url + '?' + urllib.parse.urlencode(params)
    for i in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r: return json.load(r)
        except Exception as e:
            print('reintento', e, flush=True); time.sleep(5 * (i + 1))
    return {}
def slugify(s):
    s = unicodedata.normalize('NFD', s); s = ''.join(c for c in s if unicodedata.category(c) != 'Mn').lower().replace('&', 'and')
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')
def strip(h): return html.unescape(re.sub('<[^>]+>', '', h or '')).strip()
ships = []
for f in ['ships.csv', 'ships_extra.csv']:
    p = os.path.join(ROOT, 'src/data', f)
    if os.path.exists(p): ships += list(csv.DictReader(open(p)))
res = json.load(open(OUT)) if os.path.exists(OUT) else {}
# Barcos cuya foto de Wikipedia es de OTRO barco (nombre reutilizado o gemelo): sin foto mejor que foto falsa
WRONG = {'star-princess', 'rotterdam', 'msc-world-america'}
todo = [s for s in ships if slugify(s['name']) not in res and slugify(s['name']) not in WRONG]
img = {}
for variant in ['{} (ship)', 'MS {}', '{}', 'MV {}']:
    pend = [s for s in todo if slugify(s['name']) not in img]
    for k in range(0, len(pend), 50):
        batch = pend[k:k + 50]
        titles = {variant.format(s['name']): s for s in batch}
        j = get('https://en.wikipedia.org/w/api.php', {'action': 'query', 'format': 'json', 'prop': 'pageimages|description', 'piprop': 'name', 'redirects': 1, 'titles': '|'.join(titles)})
        time.sleep(0.5)
        q = j.get('query', {})
        back = {}
        for n in q.get('normalized', []): back[n['to']] = n['from']
        for r in q.get('redirects', []): back[r['to']] = back.get(r['from'], r['from'])
        for pg in q.get('pages', {}).values():
            if 'pageimage' not in pg: continue
            orig = back.get(pg['title'], pg['title'])
            s = titles.get(orig)
            if not s: continue
            desc = (pg.get('description') or '').lower()
            if desc and not re.search(r'ship|cruise|vessel|liner', desc): continue
            if re.search(r'\.(svg|gif)$', pg['pageimage'], re.I): continue
            img[slugify(s['name'])] = pg['pageimage']
    print(variant, len(img), flush=True)
files = list(img.items())
for k in range(0, len(files), 50):
    batch = files[k:k + 50]
    j = get('https://commons.wikimedia.org/w/api.php', {'action': 'query', 'format': 'json', 'prop': 'imageinfo', 'iiprop': 'url|extmetadata|size', 'iiurlwidth': 960, 'titles': '|'.join('File:' + f for _, f in batch)})
    time.sleep(0.5)
    q = j.get('query', {})
    norm = {n['to']: n['from'] for n in q.get('normalized', [])}
    byfile = {}
    for pg in q.get('pages', {}).values():
        if 'imageinfo' in pg: byfile[norm.get(pg['title'], pg['title'])] = pg['imageinfo'][0]
    for slug, f in batch:
        ii = byfile.get('File:' + f) or byfile.get('File:' + f.replace('_', ' '))
        if not ii: continue
        md = ii.get('extmetadata', {})
        lic = strip(md.get('LicenseShortName', {}).get('value'))
        if not re.search(r'^(CC BY|CC-BY|CC0|Public domain|PD)', lic or '', re.I): continue
        thumb = ii.get('thumburl')
        if not thumb: continue
        w, h = ii.get('width', 4), ii.get('height', 3)
        res[slug] = {'thumb': thumb.replace('/960px-', '/500px-') if '/960px-' in thumb else thumb, 'large': thumb, 'ratio': round(w / h, 3),
                     'author': (strip(md.get('Artist', {}).get('value')) or 'Autor en Wikimedia Commons')[:80], 'license': lic, 'page': ii.get('descriptionurl')}
    print('commons', k, len(res), flush=True)
json.dump(res, open(OUT, 'w'), ensure_ascii=False, indent=0)
print('DONE', len(res), 'de', len(ships))
