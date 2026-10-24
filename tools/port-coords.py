"""Coordenadas de las escalas que aún no tienen, a partir de Wikipedia (artículo del puerto o ciudad).
Escribe src/data/port_coords.json: {"Nombre": [lat, lon, "url del artículo"]}. Solo para dibujar el croquis de la ruta.
Uso: python3 tools/port-coords.py   (lee src/data/sailings.json; respeta los límites de Wikipedia con pausas)"""
import json, os, re, sys, time, urllib.error, urllib.parse, urllib.request

OUT = 'src/data/port_coords.json'
UA = {'User-Agent': 'MejorCrucero/1.0 (https://mejorcrucero.com; carlos@equinoxinvestmentgroup.com)'}
SKIP = re.compile(r'navegaci|at sea|cruising|crucero escénico|scenic', re.I)

def api(host, params):
    q = urllib.parse.urlencode({**params, 'format': 'json', 'formatversion': 2})
    for i in range(6):
        try:
            time.sleep(1.1)
            with urllib.request.urlopen(urllib.request.Request(f'https://{host}/w/api.php?' + q, headers=UA), timeout=30) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code in (429, 503): time.sleep(5 * (i + 1)); continue
            return {}
        except Exception:
            time.sleep(3)
    return {}

def lookup(name):
    for host in ['es.wikipedia.org', 'en.wikipedia.org']:
        j = api(host, {'action': 'query', 'generator': 'search', 'gsrsearch': name, 'gsrlimit': 3, 'prop': 'coordinates|info', 'inprop': 'url', 'coprimary': 'primary'})
        pages = sorted((j.get('query') or {}).get('pages', []), key=lambda p: p.get('index', 99))
        for p in pages:
            c = (p.get('coordinates') or [None])[0]
            # El título del artículo debe contener la primera palabra del nombre (evita coincidencias lejanas)
            first = re.split(r'[\s,(/]', name.strip())[0].lower()
            if c and first[:4] in p['title'].lower():
                return [round(c['lat'], 4), round(c['lon'], 4), p.get('fullurl')]
    return None

def main():
    have = json.load(open(OUT, encoding='utf-8')) if os.path.exists(OUT) else {}
    sailings = json.load(open('src/data/sailings.json', encoding='utf-8'))
    names = {}
    for x in sailings:
        for p in (x.get('itinerary') or {}).get('ports', []):
            n = p.get('name', '').strip()
            if n and not SKIP.search(n) and n not in have and p.get('lat') is None: names[n] = names.get(n, 0) + 1
    known = set()
    try:
        src = open('src/offers.js', encoding='utf-8').read()
        known = {m.group(1) for m in re.finditer(r"\['([^']+)',\s*-?\d", src)}
    except Exception: pass
    todo = [n for n, _ in sorted(names.items(), key=lambda kv: -kv[1]) if n not in known]
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 400
    found = 0
    for n in todo[:limit]:
        r = lookup(n)
        if r: have[n] = r; found += 1; print('ok', n, r[:2])
        else: print('no', n)
    json.dump(dict(sorted(have.items())), open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    print(f'{found} coordenadas nuevas; {len(have)} en total; {len(todo) - found} sin encontrar')

main()
