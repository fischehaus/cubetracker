"""Render PLL diagrams as 700x500 PNGs, matching the OLL asset style."""
from PIL import Image, ImageDraw
import math
import os
_REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # Repo-Root

W, H = 700, 500
BG = (28, 28, 32)
FRAME = (54, 54, 58)
YELLOW = (255, 207, 30)

# WCA side-sticker colors
GREEN = (0, 158, 96)
RED = (220, 50, 47)
BLUE = (33, 80, 178)
ORANGE = (255, 121, 33)
WHITE = (245, 245, 245)
BLACK = (10, 10, 12)
ARROW_BODY = BLACK         # high contrast against yellow stickers
ARROW_HALO = (240, 240, 240)  # light halo so the arrow stays readable on the dark cube frame

# Sticker grid (the 9 top-face stickers), centered in the image
STICKER_W, STICKER_H = 140, 95
GAP = 11
TOTAL_W = 3 * STICKER_W + 2 * GAP   # 442
TOTAL_H = 3 * STICKER_H + 2 * GAP   # 307
GRID_L = (W - TOTAL_W) // 2
GRID_T = (H - TOTAL_H) // 2

STICKER_XS = [GRID_L + i * (STICKER_W + GAP) for i in range(3)]
STICKER_YS = [GRID_T + i * (STICKER_H + GAP) for i in range(3)]
COL_C = [x + STICKER_W // 2 for x in STICKER_XS]
ROW_C = [y + STICKER_H // 2 for y in STICKER_YS]

# Side stickers of the U layer: same width as the top stickers, separated
# from them only by the normal sticker gap — like looking straight down at a
# real cube where the top row of each side face is visible around the edge.
PILL_LONG_H = STICKER_W     # width of top/bottom side stickers
PILL_LONG_V = STICKER_H     # height of left/right side stickers
PILL_THICK = 42
TOP_PILL_Y = GRID_T - GAP - PILL_THICK // 2
BOT_PILL_Y = GRID_T + TOTAL_H + GAP + PILL_THICK // 2
LEFT_PILL_X = GRID_L - GAP - PILL_THICK // 2
RIGHT_PILL_X = GRID_L + TOTAL_W + GAP + PILL_THICK // 2

# Cube body frame: wraps the grid plus the side-sticker ring
FRAME_PAD = 14
CUBE_L = GRID_L - GAP - PILL_THICK - FRAME_PAD
CUBE_R = GRID_L + TOTAL_W + GAP + PILL_THICK + FRAME_PAD
CUBE_T = GRID_T - GAP - PILL_THICK - FRAME_PAD
CUBE_B = GRID_T + TOTAL_H + GAP + PILL_THICK + FRAME_PAD


def draw_base(draw):
    """Cube frame + 9 yellow stickers."""
    draw.rounded_rectangle((CUBE_L, CUBE_T, CUBE_R, CUBE_B), radius=25, fill=FRAME)
    for r in range(3):
        for c in range(3):
            x, y = STICKER_XS[c], STICKER_YS[r]
            draw.rounded_rectangle(
                (x, y, x + STICKER_W, y + STICKER_H), radius=15, fill=YELLOW
            )


def hpill(draw, cx, cy, color):
    draw.rounded_rectangle(
        (cx - PILL_LONG_H // 2, cy - PILL_THICK // 2,
         cx + PILL_LONG_H // 2, cy + PILL_THICK // 2),
        radius=8, fill=color,
    )


def vpill(draw, cx, cy, color):
    draw.rounded_rectangle(
        (cx - PILL_THICK // 2, cy - PILL_LONG_V // 2,
         cx + PILL_THICK // 2, cy + PILL_LONG_V // 2),
        radius=8, fill=color,
    )


def draw_indicators(draw, top, right, bottom, left):
    """3 pills per side. Order: top/bottom are left->right (image coords),
    left/right are top->bottom (image coords)."""
    for i in range(3):
        hpill(draw, COL_C[i], TOP_PILL_Y, top[i])
        hpill(draw, COL_C[i], BOT_PILL_Y, bottom[i])
        vpill(draw, LEFT_PILL_X, ROW_C[i], left[i])
        vpill(draw, RIGHT_PILL_X, ROW_C[i], right[i])




def _bezier_points(p1, p2, curve, steps=40):
    """Return polyline points sampling a quadratic bezier from p1 to p2 with
    perpendicular offset `curve` (positive = right of direction vector)."""
    x1, y1 = p1
    x2, y2 = p2
    angle = math.atan2(y2 - y1, x2 - x1)
    if curve == 0:
        return [p1, p2], angle
    mx, my = (x1 + x2) / 2, (y1 + y2) / 2
    perp_x = -math.sin(angle)
    perp_y = math.cos(angle)
    cx = mx + perp_x * curve
    cy = my + perp_y * curve
    pts = []
    for i in range(steps + 1):
        t = i / steps
        bx = (1 - t) ** 2 * x1 + 2 * (1 - t) * t * cx + t ** 2 * x2
        by = (1 - t) ** 2 * y1 + 2 * (1 - t) * t * cy + t ** 2 * y2
        pts.append((bx, by))
    # Tangent at t=1
    dx = 2 * (x2 - cx)
    dy = 2 * (y2 - cy)
    end_angle = math.atan2(dy, dx)
    return pts, end_angle


def _stroke_polygon(points, half_width):
    """Build a closed polygon outline around a polyline `points` with given
    half-width. Produces a smooth thick stroke without joint artifacts."""
    if len(points) < 2:
        return []
    left = []
    right = []
    n = len(points)
    for i, (x, y) in enumerate(points):
        if i == 0:
            dx, dy = points[1][0] - x, points[1][1] - y
        elif i == n - 1:
            dx, dy = x - points[-2][0], y - points[-2][1]
        else:
            # average of incoming and outgoing direction
            ax = x - points[i - 1][0]
            ay = y - points[i - 1][1]
            bx = points[i + 1][0] - x
            by = points[i + 1][1] - y
            la = math.hypot(ax, ay) or 1
            lb = math.hypot(bx, by) or 1
            dx = ax / la + bx / lb
            dy = ay / la + by / lb
        L = math.hypot(dx, dy) or 1
        nx, ny = -dy / L, dx / L  # perpendicular
        left.append((x + nx * half_width, y + ny * half_width))
        right.append((x - nx * half_width, y - ny * half_width))
    return left + list(reversed(right))


def arrow(draw, p1, p2, color=ARROW_BODY, width=14, head=28, pad=0, curve=0,
          halo_extra=3):
    """Straight arrow from p1 to p2. A thin halo is drawn underneath the body
    so the arrow stays readable when it crosses the dark cube frame between
    stickers. On yellow stickers the body dominates; halo is just a 1-2 px
    rim."""
    x1, y1 = p1
    x2, y2 = p2
    angle = math.atan2(y2 - y1, x2 - x1)
    x1_ = x1 + math.cos(angle) * pad
    y1_ = y1 + math.sin(angle) * pad
    tip_x = x2 - math.cos(angle) * pad
    tip_y = y2 - math.sin(angle) * pad
    body_end_x = tip_x - math.cos(angle) * head * 0.7
    body_end_y = tip_y - math.sin(angle) * head * 0.7

    # Halo (thin)
    draw.line((x1_, y1_, body_end_x, body_end_y), fill=ARROW_HALO, width=width + halo_extra)
    # Body
    draw.line((x1_, y1_, body_end_x, body_end_y), fill=color, width=width)

    # Arrowhead triangle
    perp_x = -math.sin(angle)
    perp_y = math.cos(angle)
    base_cx = tip_x - math.cos(angle) * head
    base_cy = tip_y - math.sin(angle) * head
    half_base = head * 0.62
    ah_l = (base_cx + perp_x * half_base, base_cy + perp_y * half_base)
    ah_r = (base_cx - perp_x * half_base, base_cy - perp_y * half_base)

    # Halo for arrowhead (thin)
    grow = halo_extra // 2 + 1
    tip_o = (tip_x + math.cos(angle) * 1, tip_y + math.sin(angle) * 1)
    bcx_o = base_cx - math.cos(angle) * grow
    bcy_o = base_cy - math.sin(angle) * grow
    hbo = half_base + grow
    ah_l_o = (bcx_o + perp_x * hbo, bcy_o + perp_y * hbo)
    ah_r_o = (bcx_o - perp_x * hbo, bcy_o - perp_y * hbo)
    draw.polygon([tip_o, ah_l_o, ah_r_o], fill=ARROW_HALO)
    draw.polygon([(tip_x, tip_y), ah_l, ah_r], fill=color)


def render(case_name, indicators, arrows):
    """Render one PLL case.

    Convention: Front-up. Image-top = F-side (green), image-bottom = B-side
    (blue), image-right = R-side (red), image-left = L-side (orange).
    All pill colors and position constants in pll_cases.py are defined under
    this convention.

    indicators: dict with keys 'top','right','bottom','left' -> 3-tuples of
      colors. Reading order: top/bottom = left-to-right in image; left/right =
      top-to-bottom in image.
    arrows: list of (from_pos, to_pos, curve) where positions are (col,row)
      into sticker grid. (0,0) = image top-left.
    """
    img = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(img)
    draw_base(d)
    draw_indicators(d, **indicators)
    for src, dst, curve in arrows:
        p1 = (COL_C[src[0]], ROW_C[src[1]])
        p2 = (COL_C[dst[0]], ROW_C[dst[1]])
        arrow(d, p1, p2, curve=curve)
    return img


if __name__ == '__main__':
    out_dir = os.path.join(_REPO, 'webapp', 'frontend', 'src', 'assets', 'pll')
    os.makedirs(out_dir, exist_ok=True)

    from pll_cases import PLL_CASES

    for case_name, spec in PLL_CASES.items():
        arrows = [(src, dst, 0) for src, dst in spec['arrows']]
        img = render(case_name, spec['pills'], arrows)
        out_path = os.path.join(out_dir, f'PLL_{case_name}.png')
        img.save(out_path)
        print(f'Wrote PLL_{case_name}.png')

    print(f'\nDone - {len(PLL_CASES)} cases rendered to {out_dir}')
