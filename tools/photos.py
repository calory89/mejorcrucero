"""Busca una foto con licencia libre de cada barco en Wikipedia/Wikimedia Commons.
Uso: python3 tools/photos.py  -> escribe src/data/photos.json (autor, licencia, enlace)."""
import csv, json, re, time, urllib.parse, urllib.request, html, os, sys
UA = {'User-Agent': 'MejorCruceroBot/1.0 (https://github.com/calory89/mejorcrucero; datos de barcos)'}
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'src/data/photos.json')
def get(url):
    for i in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=20) as r:
                return json.load(r)
        except Exception as e:
            if '429' in str(e): time.sleep(5 * (i + 1)); continue
            return None
    return None
def slugify(s):
    import unicodedata
    s = unicodedata.normalize('NFD', s); s = ''.join(c for c in s if unicodedata.category(c) != 'Mn').lower().replace('&', 'and')
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')
def strip(h): return html.unescape(re.sub('<[^>]+>', '', h or '')).strip()
ships = []
for f in ['ships.csv', 'ships_extra.csv']:
    p = os.path.join(ROOT, 'src/data', f)
    if os.path.exists(p): ships += list(csv.DictReader(open(p)))
res = json.load(open(OUT)) if os.path.exists(OUT) else {}
OK_LIC = re.compile(r'^(CC BY|CC BY-SA|CC0|Public domain|PD|Attribution)', re.I)
for i, s in enumerate(ships):
    slug = slugify(s['name'])
    if slug in res: continue
    found = None
    for t in [s['name'] + ' (ship)', 'MS ' + s['name'], 'MV ' + s['name'], s['name']]:
        j = get('https://en.wikipedia.org/api/rest_v1/page/summary/' + urllib.parse.quote(t.replace(' ', '_')))
        time.sleep(0.25)
        if not j or j.get('type') != 'standard' or 'originalimage' not in j: continue
        text = (j.get('description', '') + ' ' + j.get('extract', '')).lower()
        if not re.search(r'cruise|ship|vessel|liner', text): continue
        if s['name'].lower().split()[-1] not in (j.get('title', '') + j.get('extract', '')).lower(): continue
        found = j; break
    if not found: continue
    fname = urllib.parse.unquote(found['originalimage']['source'].split('/')[-1])
    if fname.lower().endswith(('.svg', '.gif')): continue
    info = get('https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode({'action': 'query', 'format': 'json', 'prop': 'imageinfo', 'iiprop': 'url|extmetadata|size', 'iiurlwidth': 640, 'titles': 'File:' + fname}))
    time.sleep(0.25)
    try:
        page = next(iter(info['query']['pages'].values())); ii = page['imageinfo'][0]
    except Exception: continue
    md = ii.get('extmetadata', {})
    lic = strip(md.get('LicenseShortName', {}).get('value'))
    if not OK_LIC.search(lic or ''): continue
    thumb = ii.get('thumburl'); w, h = ii.get('width', 4), ii.get('height', 3)
    res[slug] = {'thumb': thumb, 'large': thumb.replace('/640px-', '/1280px-') if '/640px-' in thumb and w >= 1280 else thumb, 'ratio': round(w / h, 3), 'author': strip(md.get('Artist', {}).get('value'))[:80] or 'Autor en Wikimedia Commons', 'license': lic, 'page': ii.get('descriptionurl')}
    if i % 10 == 0:
        json.dump(res, open(OUT, 'w'), ensure_ascii=False, indent=0); print(i, len(res), flush=True)
json.dump(res, open(OUT, 'w'), ensure_ascii=False, indent=0)
print('DONE', len(res), 'de', len(ships))
