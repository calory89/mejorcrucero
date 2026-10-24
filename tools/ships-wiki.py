"""Añade a src/data/ships_extra.csv los barcos que aparecen en las salidas y aún no tienen ficha.
Lee el artículo de Wikipedia (en) de cada barco y toma del infobox: año de entrada en servicio, arqueo bruto (GT) y pasajeros.
Solo escribe un barco si encuentra el artículo y al menos el arqueo; la fuente queda en la columna source.
Uso: python3 tools/ships-wiki.py [--dry]"""
import csv, json, re, sys, time, urllib.error, urllib.parse, urllib.request, unicodedata

DRY = '--dry' in sys.argv
LINE = {'carnival': 'Carnival Cruise Line', 'norwegian': 'Norwegian Cruise Line', 'costa': 'Costa Cruises', 'msc': 'MSC Cruises'}
UA = {'User-Agent': 'MejorCrucero/1.0 (https://mejorcrucero.com; carlos@equinoxinvestmentgroup.com)'}

def slug(s):
    s = unicodedata.normalize('NFD', s); s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'^-|-$', '', re.sub(r'[^a-z0-9]+', '-', s.lower().replace('&', 'and')))

def api(params):
    q = urllib.parse.urlencode({**params, 'format': 'json', 'formatversion': 2})
    for i in range(6):
        try:
            time.sleep(1.2)
            with urllib.request.urlopen(urllib.request.Request('https://en.wikipedia.org/w/api.php?' + q, headers=UA), timeout=30) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code in (429, 503): time.sleep(5 * (i + 1)); continue
            raise
    return {'error': 'rate'}

def num(txt):
    m = re.search(r'(\d{1,3}(?:[,\s]\d{3})+|\d{4,6})', txt or '')
    return int(re.sub(r'[,\s]', '', m.group(1))) if m else None

def clean(v):
    v = re.sub(r'<ref[^>]*/>|<ref[^>]*>.*?</ref>', '', v or '', flags=re.S)
    v = re.sub(r'\{\{(?:convert|cvt)\|([\d,\.]+)[^}]*\}\}', r'\1', v)
    v = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]*)\]\]', r'\1', v)
    return re.sub(r'\{\{[^}]*\}\}', ' ', v)

def infobox(title):
    j = api({'action': 'parse', 'page': title, 'prop': 'wikitext', 'redirects': 1})
    if 'error' in j: return None, None
    wt = j['parse']['wikitext']; real = j['parse']['title']
    fields = {}
    for m in re.finditer(r'^\s*\|\s*([A-Za-z ]+?)\s*=\s*(.*)$', wt, flags=re.M):
        k = m.group(1).strip().lower()
        if k not in fields: fields[k] = clean(m.group(2))
    return fields, real

def main():
    have = set()
    for f in ['src/data/ships.csv', 'src/data/ships_extra.csv']:
        with open(f, encoding='utf-8') as fh:
            for row in csv.DictReader(fh): have.add(slug(row['name']))
    sailings = json.load(open('src/data/sailings.json', encoding='utf-8'))
    need = {}
    for x in sailings:
        if x['ship'] not in have and x.get('ship_name'): need[x['ship']] = (x['ship_name'], x.get('line'))
    rows = []
    for s, (name, line) in sorted(need.items()):
        f = real = None
        for title in [name, f'{name} (ship)', f'MS {name}', f'{name} (cruise ship)']:
            f, real = infobox(title)
            if f and (f.get('ship tonnage') or f.get('tonnage')): break
        if not f: print('sin artículo:', name); continue
        gt = num(f.get('ship tonnage') or f.get('tonnage'))
        pax = num(f.get('ship capacity') or f.get('capacity'))
        year = None
        for k in ['ship in service', 'ship completed', 'ship maiden voyage', 'ship launched']:
            m = re.search(r'(19|20)\d{2}', f.get(k, ''))
            if m: year = int(m.group(0)); break
        if not gt or gt < 5000 or not year: print('datos insuficientes:', name, gt, year); continue
        src = 'https://en.wikipedia.org/wiki/' + urllib.parse.quote(real.replace(' ', '_'))
        rows.append([name, LINE.get(line, line or ''), year, gt, pax or '', src])
        print('ok:', name, year, gt, pax, src)
    if rows and not DRY:
        with open('src/data/ships_extra.csv', 'a', encoding='utf-8', newline='') as fh:
            csv.writer(fh).writerows(rows)
    print(f'{len(rows)} barcos añadidos de {len(need)} sin ficha')

main()
