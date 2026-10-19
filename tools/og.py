"""Genera public/og/<barco>.png (1200x630) para compartir cada ficha en WhatsApp y redes."""
import csv, os, re, unicodedata
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTD = os.path.join(ROOT, 'public/og'); os.makedirs(OUTD, exist_ok=True)
def slugify(s):
    s = unicodedata.normalize('NFD', s); s = ''.join(c for c in s if unicodedata.category(c) != 'Mn').lower().replace('&', 'and')
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')
def font(sz, bold=False):
    p = '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
    return ImageFont.truetype(p, sz) if os.path.exists(p) else ImageFont.load_default()
def fmt(n): return f"{int(n):,}".replace(',', '.') if n else '—'
import json
# Usa los datos ya calculados por el build (incluida la nota 0-100): ejecuta antes `node src/build.js`
rows = [{'name': s['name'], 'line': s['lineShort'], 'year': s['year'], 'gt': s['gt'], 'pax': s['pax'], 'sc': s.get('sc')} for s in json.load(open(os.path.join(ROOT, 'dist/data/ships.json')))]
bg = Image.new('RGB', (1200, 630), '#0b2540'); d = ImageDraw.Draw(bg)
for y in range(630):
    t = y / 630; d.line([(0, y), (1200, y)], fill=(int(11 + 4 * t), int(37 + 80 * t), int(64 + 50 * t)))
seen = set()
for r in rows:
    slug = slugify(r['name'])
    if slug in seen: continue
    seen.add(slug)
    im = bg.copy(); d = ImageDraw.Draw(im)
    d.text((70, 60), 'MejorCrucero', font=font(40, True), fill='#ffb09c')
    name = r['name']; sz = 86
    while d.textlength(name, font=font(sz, True)) > (860 if r.get('sc') is not None else 1060) and sz > 40: sz -= 4
    d.text((70, 150), name, font=font(sz, True), fill='white')
    d.text((70, 150 + sz + 20), r['line'], font=font(40), fill='#cfe0f3')
    stats = [(r['year'], 'año'), (fmt(r['gt']), 'arqueo GT'), (fmt(r.get('pax')), 'pasajeros')]
    x = 70
    for v, l in stats:
        d.rounded_rectangle([x, 380, x + 320, 500], radius=20, fill='#12345a')
        d.text((x + 24, 395), str(v), font=font(52, True), fill='white'); d.text((x + 24, 458), l, font=font(26), fill='#cfe0f3'); x += 345
    if r.get('sc') is not None:
        n = r['sc']; col = '#047857' if n >= 85 else '#15803d' if n >= 75 else '#a16207' if n >= 65 else '#c2410c' if n >= 50 else '#b91c1c'
        d.rounded_rectangle([960, 50, 1130, 220], radius=28, fill=col)
        t = str(n); w = d.textlength(t, font=font(96, True)); d.text((1045 - w / 2, 70), t, font=font(96, True), fill='white')
        d.text((985, 180), 'sobre 100', font=font(24), fill='white')
        name_max = 860
    d.text((70, 545), 'Nota 0-100 · Vídeos · Opiniones · Precio real', font=font(32), fill='#fbbf24')
    im.convert('P', palette=Image.ADAPTIVE, colors=48).save(os.path.join(OUTD, slug + '.png'), optimize=True)
print(len(seen), 'imágenes')
