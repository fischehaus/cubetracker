"""Extract the 57 OLL patterns from the existing (validated) OLL PNGs.

The old images are the ground truth for which case looks how. This script
reads each PNG pixel-wise and writes oll_patterns.py with, per case:
  - top:   3x3 booleans (True = yellow, False = grey), row 0 = image top
  - sides: dict top/right/bottom/left -> 3 booleans (True = yellow side
           sticker at that position), reading order like the PLL pills
           (top/bottom: left->right, left/right: top->bottom)

Validation: the U-face center is always yellow, and every edge/corner piece
shows exactly one yellow sticker (top face XOR one side). Any parsing error
trips the validator.
"""
from PIL import Image
import os
_REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # Repo-Root

ASSET_DIR = os.path.join(_REPO, 'webapp', 'frontend', 'src', 'assets', 'oll')
OUT = os.path.join(os.path.dirname(__file__), 'oll_patterns.py')

YELLOW = (255, 207, 30)
GREY = (160, 160, 160)

# Old-image geometry (measured): grid left/top 129/96, sticker 140x95, gap 11
COL_C = [199, 350, 501]
ROW_C = [143, 249, 355]


def is_yellow(px):
    return all(abs(a - b) <= 12 for a, b in zip(px, YELLOW))


def is_grey(px):
    return all(abs(a - b) <= 12 for a, b in zip(px, GREY))


def yellow_runs(img, fixed, lo, hi, axis):
    """Find centers of yellow runs along a scan line.
    axis='x': scan x in [lo,hi) at y=fixed; axis='y': scan y at x=fixed."""
    runs = []
    in_run = False
    start = 0
    for v in range(lo, hi):
        px = img.getpixel((v, fixed) if axis == 'x' else (fixed, v))
        if is_yellow(px):
            if not in_run:
                in_run = True
                start = v
        else:
            if in_run:
                in_run = False
                if v - start >= 8:  # ignore tiny anti-aliasing slivers
                    runs.append((start + v - 1) // 2)
    if in_run and hi - start >= 8:
        runs.append((start + hi - 1) // 2)
    return runs


def nearest(centers, value):
    return min(range(3), key=lambda i: abs(centers[i] - value))


def parse(path):
    img = Image.open(path).convert('RGB')

    top = []
    for r in range(3):
        row = []
        for c in range(3):
            px = img.getpixel((COL_C[c], ROW_C[r]))
            if is_yellow(px):
                row.append(True)
            elif is_grey(px):
                row.append(False)
            else:
                raise ValueError(f'{path}: top cell ({c},{r}) neither yellow nor grey: {px}')
        top.append(row)

    sides = {k: [False, False, False] for k in ('top', 'right', 'bottom', 'left')}
    # Scan lines sit slightly off the pill center lines: the old renders have
    # a 1-px seam through each pill's exact middle (x=60/640, y=34/466).
    for cx in yellow_runs(img, 30, 80, 620, 'x'):
        sides['top'][nearest(COL_C, cx)] = True
    for cx in yellow_runs(img, 470, 80, 620, 'x'):
        sides['bottom'][nearest(COL_C, cx)] = True
    for cy in yellow_runs(img, 56, 70, 430, 'y'):
        sides['left'][nearest(ROW_C, cy)] = True
    for cy in yellow_runs(img, 644, 70, 430, 'y'):
        sides['right'][nearest(ROW_C, cy)] = True
    return top, sides


def validate(name, top, sides):
    assert top[1][1], f'{name}: center not yellow'
    # edges: (top-cell, side-sticker)
    edges = [
        (top[0][1], sides['top'][1]),
        (top[1][2], sides['right'][1]),
        (top[2][1], sides['bottom'][1]),
        (top[1][0], sides['left'][1]),
    ]
    for i, (t, s) in enumerate(edges):
        assert t != s, f'{name}: edge {i} has {int(t)+int(s)} yellow stickers (need exactly 1)'
    # corners: (top-cell, side1, side2)
    corners = [
        (top[0][0], sides['top'][0], sides['left'][0]),
        (top[0][2], sides['top'][2], sides['right'][0]),
        (top[2][0], sides['bottom'][0], sides['left'][2]),
        (top[2][2], sides['bottom'][2], sides['right'][2]),
    ]
    for i, trio in enumerate(corners):
        n = sum(map(int, trio))
        assert n == 1, f'{name}: corner {i} has {n} yellow stickers (need exactly 1)'


def main():
    patterns = {}
    for i in range(1, 58):
        name = f'OLL_{i:02d}'
        top, sides = parse(os.path.join(ASSET_DIR, f'{name}.png'))
        validate(name, top, sides)
        patterns[name] = {'top': top, 'sides': sides}

    with open(OUT, 'w', encoding='utf-8') as f:
        f.write('"""57 OLL patterns, extracted from the validated original PNGs\n')
        f.write('by extract_oll.py. top: 3x3 booleans (True=yellow), row 0 = image\n')
        f.write('top. sides: per side 3 booleans, same reading order as PLL pills."""\n\n')
        f.write('OLL_PATTERNS = {\n')
        for name, p in patterns.items():
            f.write(f'    {name!r}: {{\n')
            f.write(f'        \'top\': {p["top"]},\n')
            f.write(f'        \'sides\': {p["sides"]},\n')
            f.write('    },\n')
        f.write('}\n')
    print(f'Extracted and validated {len(patterns)} patterns -> {OUT}')


if __name__ == '__main__':
    main()
