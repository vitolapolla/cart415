"""Draws Encore's launcher icons and splash screens for the Android project (needs Pillow)."""
from pathlib import Path
from PIL import Image, ImageDraw

RES = Path(__file__).resolve().parent.parent / 'android/app/src/main/res'
BG = (11, 11, 16)
A, B = (167, 139, 250), (244, 114, 182)
BARS = [(14, 26, 12), (24, 18, 28), (34, 12, 40), (44, 22, 20)]  # x, y, height on a 64-unit grid; width 6


def gradient(size):
    img = Image.new('RGB', (size, size))
    px = img.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * (size - 1))
            px[x, y] = tuple(round(A[i] + (B[i] - A[i]) * t) for i in range(3))
    return img


def bars(draw, size, scale, offset, color):
    for x, y, h in BARS:
        draw.rounded_rectangle([offset + x * scale, offset + y * scale, offset + (x + 6) * scale, offset + (y + h) * scale], radius=3 * scale, fill=color)


def icon(size, round_=False):
    g = gradient(size).convert('RGBA')
    mask = Image.new('L', (size, size), 0)
    md = ImageDraw.Draw(mask)
    if round_:
        md.ellipse([0, 0, size - 1, size - 1], fill=255)
    else:
        md.rounded_rectangle([0, 0, size - 1, size - 1], radius=size // 4, fill=255)
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    out.paste(g, mask=mask)
    inset = size * 0.12 if round_ else 0
    scale = (size - 2 * inset) / 64
    bars(ImageDraw.Draw(out), size, scale, inset, BG + (255,))
    return out


def foreground(size):
    # Adaptive icons: 108dp canvas, keep artwork inside the central 66dp.
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    scale = size * (60 / 108) / 64
    bars(ImageDraw.Draw(out), size, scale, (size - 64 * scale) / 2, BG + (255,))
    return out


for name, px in {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}.items():
    d = RES / f'mipmap-{name}'
    icon(px).save(d / 'ic_launcher.png')
    icon(px, True).save(d / 'ic_launcher_round.png')
    foreground(round(px * 108 / 48)).save(d / 'ic_launcher_foreground.png')

for splash in RES.glob('drawable*/splash.png'):
    w, h = Image.open(splash).size
    img = Image.new('RGB', (w, h), BG)
    s = min(w, h) // 4
    img.paste(icon(s), ((w - s) // 2, (h - s) // 2), icon(s))
    img.save(splash)
print('icons written')
