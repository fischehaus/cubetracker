"""Render 4 variants of Ua-perm side-by-side so the user can identify which
convention matches their reference."""
from PIL import Image, ImageDraw, ImageFont
import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

from render_pll import (
    W, H, BG, GREEN, RED, BLUE, ORANGE,
    draw_base, draw_indicators, arrow, COL_C, ROW_C,
)
_REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # Repo-Root

# Positions
ULB = (0, 0); UB = (1, 0); URB = (2, 0)
UL  = (0, 1); UC = (1, 1); UR  = (2, 1)
ULF = (0, 2); UF = (1, 2); URF = (2, 2)


def render_variant(pills, arrows, label):
    img = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(img)
    draw_base(d)
    draw_indicators(d, **pills)
    for src, dst in arrows:
        p1 = (COL_C[src[0]], ROW_C[src[1]])
        p2 = (COL_C[dst[0]], ROW_C[dst[1]])
        arrow(d, p1, p2)
    # Add big label at top-left
    try:
        font = ImageFont.truetype('arial.ttf', 60)
    except Exception:
        font = ImageFont.load_default()
    d.text((20, 20), label, fill=(255, 255, 255), font=font)
    return img


variants = [
    # A: UF stays, clockwise cycle (UR-edge at UB)
    {
        'label': 'A',
        'pills': dict(
            top=(BLUE, RED, BLUE), right=(RED, ORANGE, RED),
            bottom=(GREEN, GREEN, GREEN), left=(ORANGE, BLUE, ORANGE),
        ),
        'arrows': [(UB, UR), (UR, UL), (UL, UB)],
    },
    # B: UF stays, counterclockwise cycle (UL-edge at UB)
    {
        'label': 'B',
        'pills': dict(
            top=(BLUE, ORANGE, BLUE), right=(RED, BLUE, RED),
            bottom=(GREEN, GREEN, GREEN), left=(ORANGE, RED, ORANGE),
        ),
        'arrows': [(UB, UL), (UL, UR), (UR, UB)],
    },
    # C: UB stays, clockwise cycle (UF-edge at UR)
    {
        'label': 'C',
        'pills': dict(
            top=(BLUE, BLUE, BLUE), right=(RED, GREEN, RED),
            bottom=(GREEN, ORANGE, GREEN), left=(ORANGE, RED, ORANGE),
        ),
        'arrows': [(UR, UF), (UL, UR), (UF, UL)],
    },
    # D: UB stays, counterclockwise cycle (UF-edge at UL)
    {
        'label': 'D',
        'pills': dict(
            top=(BLUE, BLUE, BLUE), right=(RED, ORANGE, RED),
            bottom=(GREEN, RED, GREEN), left=(ORANGE, GREEN, ORANGE),
        ),
        'arrows': [(UF, UR), (UR, UL), (UL, UF)],
    },
]

# Build 2x2 collage
scale = 0.5
cell_w, cell_h = int(W * scale), int(H * scale)
collage = Image.new('RGB', (cell_w * 2 + 20, cell_h * 2 + 20), (40, 40, 44))
for i, v in enumerate(variants):
    img = render_variant(v['pills'], v['arrows'], v['label'])
    img = img.resize((cell_w, cell_h), Image.LANCZOS)
    col = i % 2
    row = i // 2
    collage.paste(img, (col * (cell_w + 20), row * (cell_h + 20)))

out_path = os.path.join(_REPO, 'webapp', 'frontend', 'src', 'assets', 'pll', '_ua_variants.png')
collage.save(out_path)
print(f'Wrote {out_path}')
