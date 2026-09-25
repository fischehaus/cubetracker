"""Render a 7x3 collage of all 21 PLL cases with case labels for QA review."""
from PIL import Image, ImageDraw, ImageFont
import os
_REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # Repo-Root

ASSET_DIR = os.path.join(_REPO, 'webapp', 'frontend', 'src', 'assets', 'pll')

CASES_LAYOUT = [
    ['Aa', 'Ab', 'E',  'F',  'Ga', 'Gb', 'Gc'],
    ['Gd', 'H',  'Ja', 'Jb', 'Na', 'Nb', 'Ra'],
    ['Rb', 'T',  'Ua', 'Ub', 'V',  'Y',  'Z' ],
]

scale = 0.3
cell_w = int(700 * scale)
cell_h = int(500 * scale) + 30  # extra room for label
pad = 8
collage_w = 7 * (cell_w + pad) + pad
collage_h = 3 * (cell_h + pad) + pad

collage = Image.new('RGB', (collage_w, collage_h), (32, 32, 36))
try:
    font = ImageFont.truetype('arial.ttf', 24)
except Exception:
    font = ImageFont.load_default()

for r, row in enumerate(CASES_LAYOUT):
    for c, case in enumerate(row):
        img = Image.open(os.path.join(ASSET_DIR, f'PLL_{case}.png'))
        img = img.resize((cell_w, cell_h - 30), Image.LANCZOS)
        x = pad + c * (cell_w + pad)
        y = pad + r * (cell_h + pad)
        # Draw label above
        d = ImageDraw.Draw(collage)
        d.text((x + 4, y), case, fill=(245, 245, 245), font=font)
        collage.paste(img, (x, y + 28))

out_path = os.path.join(os.path.dirname(__file__), 'pll_collage_review.png')
collage.save(out_path)
print(f'Wrote {out_path}  ({collage_w}x{collage_h})')
