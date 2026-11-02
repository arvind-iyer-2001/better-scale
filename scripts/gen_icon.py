"""Renders the app icon and splash glyph with Pillow.
Run: uv run --with pillow python scripts/gen_icon.py
Design: analog scale dial over two footprints, red needle, on black."""
import math, pathlib
from PIL import Image, ImageDraw

root = pathlib.Path(__file__).resolve().parent.parent
SS = 4  # supersampling
RED, WHITE, GREY = (250, 17, 79), (255, 255, 255), (142, 142, 147)

def glyph(size, fg_white=True, ink=WHITE):
    """Glyph drawn in a 260x260 design space scaled to `size`, transparent background."""
    k = size * SS / 260
    img = Image.new('RGBA', (size * SS, size * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    P = lambda x, y: (x * k, y * k)
    def line(a, b, w, col):
        d.line([P(*a), P(*b)], fill=col, width=round(w * k))
        for q in (a, b):
            r = w * k / 2; x, y = P(*q); d.ellipse([x - r, y - r, x + r, y + r], fill=col)
    cx, cy = 130, 120
    for i in range(9):
        t = math.radians(180 + i * 22.5)
        line((cx + 60 * math.cos(t), cy + 60 * math.sin(t)), (cx + 72 * math.cos(t), cy + 72 * math.sin(t)), 5, GREY)
    pts = [(cx + 80 * math.cos(math.radians(a)), cy + 80 * math.sin(math.radians(a))) for a in range(180, 361, 3)]
    pts += [(cx - 80, cy)]
    for a, b in zip(pts, pts[1:]):
        line(a, b, 8, ink)
    t = math.radians(305)
    line((cx, cy), (cx + 52 * math.cos(t), cy + 52 * math.sin(t)), 7, RED)
    for r, col in ((10, ink), (4, RED)):
        x, y = P(cx, cy); rr = r * k; d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=col)
    for fx in (98, 162):
        for (ex, ey, rx, ry) in ((fx, 188, 28, 32), (fx + (3 if fx < 130 else -3), 228, 19, 22)):
            x0, y0 = P(ex - rx, ey - ry); x1, y1 = P(ex + rx, ey + ry)
            d.ellipse([x0, y0, x1, y1], fill=ink)
    return img.resize((size, size), Image.LANCZOS)

def on_black(size, inset=0.0):
    bg = Image.new('RGB', (size, size), (0, 0, 0))
    g = glyph(round(size * (1 - 2 * inset)))
    off = round(size * inset)
    bg.paste(g, (off, off), g)
    return bg

if __name__ == '__main__':
    on_black(1024, 0.06).save(root / 'assets' / 'icon.png')
    glyph(600).save(root / 'assets' / 'splash-icon.png')
    print('ok')
