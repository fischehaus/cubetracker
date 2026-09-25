"""Side-by-side comparison: center-to-center arrows vs edge-to-edge arrows,
using Aa (has adjacent-field arrows) and Ua (medium distances)."""
from PIL import Image, ImageDraw, ImageFont
import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

import render_pll
from cube_sim import PLL_CASES


def render_with_pad(case_name, pad):
    spec = PLL_CASES[case_name]
    img = Image.new('RGB', (render_pll.W, render_pll.H), render_pll.BG)
    d = render_pll.ImageDraw.Draw(img)
    render_pll.draw_base(d)
    render_pll.draw_indicators(d, **spec['pills'])
    for src, dst in spec['arrows']:
        p1 = (render_pll.COL_C[src[0]], render_pll.ROW_C[src[1]])
        p2 = (render_pll.COL_C[dst[0]], render_pll.ROW_C[dst[1]])
        render_pll.arrow(d, p1, p2, pad=pad)
    return img


# Edge-to-edge: pad ~ half a sticker width along the arrow direction
variants = [
    ('Aa zentrum-zu-zentrum', 'Aa', 0),
    ('Aa kante-zu-kante', 'Aa', 62),
    ('Ua zentrum-zu-zentrum', 'Ua', 0),
    ('Ua kante-zu-kante', 'Ua', 62),
]

scale = 0.55
cw, ch = int(700 * scale), int(500 * scale)
pad_px = 14
label_h = 34
out = Image.new('RGB', (2 * cw + 3 * pad_px, 2 * (ch + label_h) + 3 * pad_px), (32, 32, 36))
try:
    font = ImageFont.truetype('arial.ttf', 22)
except Exception:
    font = ImageFont.load_default()

for i, (label, case, pad) in enumerate(variants):
    img = render_with_pad(case, pad).resize((cw, ch), Image.LANCZOS)
    col, row = i % 2, i // 2
    x = pad_px + col * (cw + pad_px)
    y = pad_px + row * (ch + label_h + pad_px)
    d = ImageDraw.Draw(out)
    d.text((x + 4, y + 4), label, fill=(245, 245, 245), font=font)
    out.paste(img, (x, y + label_h))

out_path = os.path.join(os.path.dirname(__file__), 'arrow_style_compare.png')
out.save(out_path)
print(f'Wrote {out_path}')
