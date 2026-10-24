"""Genera dist/og/salidas/<id>.png (1200x630) para las mejores ofertas: lo que se ve al compartir en WhatsApp y redes.
Lee dist/data/og-offers.json (lo escribe el build). Uso: node src/build.js && python3 tools/og-offers.py"""
import json, os
from PIL import Image, ImageDraw, ImageFont
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'dist/og/salidas'); os.makedirs(OUT, exist_ok=True)
def font(sz, bold=False):
    p = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
    return ImageFont.truetype(p, sz) if os.path.exists(p) else ImageFont.load_default()
def eur(n): return f"{int(n):,} €".replace(',', '.')
COL = {'a': '#0f7a43', 'b': '#3c8f4f', 'c': '#a86a00', 'e': '#b23a1d'}
items = json.load(open(os.path.join(ROOT, 'dist/data/og-offers.json'), encoding='utf-8'))
bg = Image.new('RGB', (1200, 630), '#0b2540'); d0 = ImageDraw.Draw(bg)
for y in range(630):
    t = y / 630; d0.line([(0, y), (1200, y)], fill=(int(11 + 6 * t), int(37 + 70 * t), int(64 + 60 * t)))
n = 0
for o in items:
    im = bg.copy(); d = ImageDraw.Draw(im)
    d.text((70, 55), 'MejorCrucero', font=font(38, True), fill='#ffb09c')
    d.text((70, 105), o['when'], font=font(32), fill='#cfe0f3')
    title = o['title']; sz = 70
    while d.textlength(title, font=font(sz, True)) > 1060 and sz > 36: sz -= 4
    d.text((70, 160), title, font=font(sz, True), fill='white')
    sub = o['sub']; ss = 40
    while d.textlength(sub, font=font(ss)) > 1060 and ss > 24: ss -= 2
    d.text((70, 170 + sz + 18), sub, font=font(ss), fill='#e6eef7')
    d.text((70, 430), 'desde', font=font(34), fill='#cfe0f3')
    d.text((70, 470), eur(o['price']), font=font(96, True), fill='white')
    d.text((70 + d.textlength(eur(o['price']), font=font(96, True)) + 24, 530), o['per'], font=font(32), fill='#cfe0f3')
    c = COL.get(o['cls'], '#334')
    d.rounded_rectangle((900, 400, 1130, 580), 26, fill=c)
    d.text((1015, 470), str(o['score']), font=font(92, True), fill='white', anchor='mm')
    d.text((1015, 548), o['label'][:16], font=font(26, True), fill='white', anchor='mm')
    im.save(os.path.join(OUT, f"{o['id']}.png"), optimize=True); n += 1
print(f'{n} imágenes de ofertas')
