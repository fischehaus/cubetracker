"""Render the 57 OLL diagrams in the new style (same geometry as the PLL
renders): 9 top stickers + side-sticker ring directly adjacent to the grid.

Patterns come from oll_patterns.py (extracted from the validated originals).
Yellow = sticker shows yellow; grey = sticker shows a side color (which one
is irrelevant for OLL).
"""
from PIL import Image
import os

from render_pll import (
    W, H, BG, FRAME, YELLOW, ImageDraw,
    CUBE_L, CUBE_R, CUBE_T, CUBE_B,
    STICKER_XS, STICKER_YS, STICKER_W, STICKER_H,
    COL_C, ROW_C, hpill, vpill,
    TOP_PILL_Y, BOT_PILL_Y, LEFT_PILL_X, RIGHT_PILL_X,
)
from oll_patterns import OLL_PATTERNS
_REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # Repo-Root

GREY = (160, 160, 160)


def render_oll(pattern):
    img = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((CUBE_L, CUBE_T, CUBE_R, CUBE_B), radius=25, fill=FRAME)

    # 9 top stickers
    for r in range(3):
        for c in range(3):
            x, y = STICKER_XS[c], STICKER_YS[r]
            color = YELLOW if pattern['top'][r][c] else GREY
            d.rounded_rectangle((x, y, x + STICKER_W, y + STICKER_H),
                                radius=15, fill=color)

    # side-sticker ring
    sides = pattern['sides']
    for i in range(3):
        hpill(d, COL_C[i], TOP_PILL_Y, YELLOW if sides['top'][i] else GREY)
        hpill(d, COL_C[i], BOT_PILL_Y, YELLOW if sides['bottom'][i] else GREY)
        vpill(d, LEFT_PILL_X, ROW_C[i], YELLOW if sides['left'][i] else GREY)
        vpill(d, RIGHT_PILL_X, ROW_C[i], YELLOW if sides['right'][i] else GREY)
    return img


if __name__ == '__main__':
    out_dir = os.path.join(_REPO, 'webapp', 'frontend', 'src', 'assets', 'oll')
    for name, pattern in OLL_PATTERNS.items():
        img = render_oll(pattern)
        img.save(os.path.join(out_dir, f'{name}.png'))
    print(f'Rendered {len(OLL_PATTERNS)} OLL diagrams to {out_dir}')
