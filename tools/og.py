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
rows = []
for f in ['ships.csv', 'ships_extra.csv']:
    p = os.path.join(ROOT, 'src/data', f)
    if os.path.exists(p): rows += list(csv.DictReader(open(p)))
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
    while d.textlength(name, font=font(sz, True)) > 1060 and sz > 40: sz -= 4
    d.text((70, 150), name, font=font(sz, True), fill='white')
    d.text((70, 150 + sz + 20), r['line'], font=font(40), fill='#cfe0f3')
    stats = [(r['year'], 'año'), (fmt(r['gt']), 'arqueo GT'), (fmt(r.get('pax')), 'pasajeros')]
    x = 70
    for v, l in stats:
        d.rounded_rectangle([x, 380, x + 320, 500], radius=20, fill='#12345a')
        d.text((x + 24, 395), str(v), font=font(52, True), fill='white'); d.text((x + 24, 458), l, font=font(26), fill='#cfe0f3'); x += 345
    d.text((70, 545), 'Vídeos · Opiniones · Precio real · Foro', font=font(32), fill='#fbbf24')
    im.convert('P', palette=Image.ADAPTIVE, colors=48).save(os.path.join(OUTD, slug + '.png'), optimize=True)
print(len(seen), 'imágenes')
