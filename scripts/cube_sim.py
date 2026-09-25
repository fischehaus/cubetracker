"""Exact cube simulator for generating the PLL diagrams.

The 21 case diagrams are DERIVED from the reference algorithms in the
user's source table: case state = inverse(algorithm) applied to a solved
cube. No hand-authored permutations anymore.

Frame (validated end-to-end against the user-confirmed Ua diagram):
  Solved colors: U=yellow, F=blue, R=red, L=orange, B=green, D=white.
  Diagram = top-down view of the U face with F at the BOTTOM of the image:
    image-top    = B side (green base)
    image-bottom = F side (blue base)
    image-right  = R side (red base)
    image-left   = L side (orange base)
  Grid cells (col, row): row 0 = back row (top of image), col 0 = left.

Arrow convention: from a piece's current position to its home position
("follow the arrow to solve").
"""

from render_pll import GREEN, RED, BLUE, ORANGE

# --- internal color chars -------------------------------------------
# B = blue (front), G = green (back)
FACE_COLOR = {
    (0, 1, 0): 'Y', (0, -1, 0): 'W',
    (0, 0, 1): 'B', (0, 0, -1): 'G',
    (1, 0, 0): 'R', (-1, 0, 0): 'O',
}

_TANGENTS = {
    (0, 1, 0): ((1, 0, 0), (0, 0, 1)),
    (0, -1, 0): ((1, 0, 0), (0, 0, 1)),
    (0, 0, 1): ((1, 0, 0), (0, 1, 0)),
    (0, 0, -1): ((1, 0, 0), (0, 1, 0)),
    (1, 0, 0): ((0, 1, 0), (0, 0, 1)),
    (-1, 0, 0): ((0, 1, 0), (0, 0, 1)),
}


def solved_state():
    """Sticker map {(position, normal): color}. Positions: face coordinate
    +-2 on the normal axis, tangent coordinates in {-1, 0, 1}."""
    st = {}
    for n, (u, w) in _TANGENTS.items():
        for a in (-1, 0, 1):
            for b in (-1, 0, 1):
                pos = tuple(2 * n[i] + a * u[i] + b * w[i] for i in range(3))
                st[(pos, n)] = FACE_COLOR[n]
    return st


# --- 90-degree rotations (exact integer math) ------------------------
def _rx_cw(v):   # like R: front -> up
    x, y, z = v
    return (x, z, -y)

def _rx_ccw(v):  # like L: front -> down
    x, y, z = v
    return (x, -z, y)

def _ry_cw(v):   # like U: front -> left
    x, y, z = v
    return (-z, y, x)

def _ry_ccw(v):
    x, y, z = v
    return (z, y, -x)

def _rz_cw(v):   # like F: up -> right
    x, y, z = v
    return (y, -x, z)

def _rz_ccw(v):
    x, y, z = v
    return (-y, x, z)


# Move = (layer predicate on position, rotation function)
MOVES = {
    'U': (lambda p: p[1] >= 1, _ry_cw),
    'D': (lambda p: p[1] <= -1, _ry_ccw),
    'R': (lambda p: p[0] >= 1, _rx_cw),
    'L': (lambda p: p[0] <= -1, _rx_ccw),
    'F': (lambda p: p[2] >= 1, _rz_cw),
    'B': (lambda p: p[2] <= -1, _rz_ccw),
    'M': (lambda p: p[0] == 0, _rx_ccw),   # middle slice, follows L
    'r': (lambda p: p[0] >= 0, _rx_cw),    # wide R = R + M'
    'x': (lambda p: True, _rx_cw),         # whole-cube rotation like R
    'y': (lambda p: True, _ry_cw),         # whole-cube rotation like U
    'z': (lambda p: True, _rz_cw),
}


def apply_move(st, token):
    base = token[0]
    layer, rot = MOVES[base]
    times = 2 if token.endswith('2') else (3 if token.endswith("'") else 1)
    for _ in range(times):
        new = {}
        for (pos, n), c in st.items():
            if layer(pos):
                new[(rot(pos), rot(n))] = c
            else:
                new[(pos, n)] = c
        st = new
    return st


def apply_alg(st, alg):
    for tok in alg.split():
        st = apply_move(st, tok)
    return st


def invert_alg(alg):
    out = []
    for tok in reversed(alg.split()):
        if tok.endswith('2'):
            out.append(tok)
        elif tok.endswith("'"):
            out.append(tok[:-1])
        else:
            out.append(tok + "'")
    return ' '.join(out)


def _centers_ok(st):
    for n in _TANGENTS:
        pos = (2 * n[0], 2 * n[1], 2 * n[2])
        if st[(pos, n)] != FACE_COLOR[n]:
            return False
    return True


def normalize(st):
    """Rotate the whole cube until centers are back in the home frame
    (algs containing x/y leave a net rotation). Returns (state, seq) where
    seq is the rotation token sequence that was applied."""
    from itertools import product
    if _centers_ok(st):
        return st, ()
    for ln in range(1, 7):
        for seq in product(('x', 'y'), repeat=ln):
            s2 = st
            for t in seq:
                s2 = apply_move(s2, t)
            if _centers_ok(s2):
                return s2, seq
    raise RuntimeError('no orientation found')


def case_state_for(alg):
    """Build the case state C that `alg` solves, in the standard frame.

    Subtlety: for algs with a net cube rotation (x/y inside the alg), simply
    applying inverse(alg) to solved and re-orienting gives a WRONG state (the
    rotation conjugates the permutation onto a different layer). Correct:
    find rotation N with N(alg(solved)) center-normalized, then
    C = inverse(alg) applied to N^-1(solved). Then alg(C) = solved up to
    orientation, and C lives in the standard frame.
    """
    s1 = apply_alg(solved_state(), alg)
    _, seq = normalize(s1)
    # N^-1(solved): apply the inverse rotation sequence to a solved cube
    pre = solved_state()
    for t in reversed(seq):
        pre = apply_move(pre, t + "'")
    case = apply_alg(pre, invert_alg(alg))
    case, extra = normalize(case)  # should already be normalized
    assert extra == (), f'case for {alg!r} not in standard frame'
    return case


def check_pll(st, name):
    """A valid PLL state: everything below the U layer solved, top all yellow.
    Catches any algorithm transcription error."""
    for (pos, n), c in st.items():
        if n == (0, 1, 0):
            assert c == 'Y', f'{name}: top face not yellow at {pos}'
        elif pos[1] <= 0:
            assert c == FACE_COLOR[n], f'{name}: lower sticker wrong at {pos} {n}: {c}'


# --- diagram extraction ----------------------------------------------

# edge piece home cell by its side color (tx, tz): front = z+1
_HOME_EDGE = {'B': (0, 1), 'G': (0, -1), 'R': (1, 0), 'O': (-1, 0)}


def case_data(st):
    """Extract pills (image sides) and solve-arrows (grid cells) from a
    normalized PLL state."""
    pills = dict(
        top=tuple(st[((tx, 1, -2), (0, 0, -1))] for tx in (-1, 0, 1)),
        bottom=tuple(st[((tx, 1, 2), (0, 0, 1))] for tx in (-1, 0, 1)),
        right=tuple(st[((2, 1, tz), (1, 0, 0))] for tz in (-1, 0, 1)),
        left=tuple(st[((-2, 1, tz), (-1, 0, 0))] for tz in (-1, 0, 1)),
    )

    arrows = []
    # edges
    for tx, tz in ((0, -1), (1, 0), (0, 1), (-1, 0)):
        c = st[((2 * tx, 1, 2 * tz), (tx, 0, tz))]
        hx, hz = _HOME_EDGE[c]
        if (hx, hz) != (tx, tz):
            arrows.append(((tx + 1, tz + 1), (hx + 1, hz + 1)))
    # corners (two side stickers each)
    for tx, tz in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
        cx = st[((2 * tx, 1, tz), (tx, 0, 0))]
        cz = st[((tx, 1, 2 * tz), (0, 0, tz))]
        cols = {cx, cz}
        hx = 1 if 'R' in cols else -1
        hz = 1 if 'B' in cols else -1
        if (hx, hz) != (tx, tz):
            arrows.append(((tx + 1, tz + 1), (hx + 1, hz + 1)))
    return pills, arrows


# --- reference algorithms (from the user's source table) --------------
ALGS = {
    'Aa': "x L2 D2 L' U' L D2 L' U L'",
    'Ab': "x' L2 D2 L U L' D2 L U' L",
    'E':  "x' L' U L D' L' U' L D L' U' L D' L' U L D",
    'F':  "R' U' F' R U R' U' R' F R2 U' R' U' R U R' U R",
    'Ga': "R2 U R' U R' U' R U' R2 U' D R' U R D'",
    'Gb': "R' U' R U D' R2 U R' U R U' R U' R2 D",
    'Gc': "R2 U' R U' R U R' U R2 U D' R U' R' D",
    'Gd': "R U R' U' D R2 U' R U' R' U R' U R2 D'",
    'H':  "M2 U M2 U2 M2 U M2",
    'Ja': "x R2 F R F' R U2 r' U r U2",
    'Jb': "R U R' F' R U R' U' R' F R2 U' R'",
    'Na': "R U R' U R U R' F' R U R' U' R' F R2 U' R' U2 R U' R'",
    'Nb': "R' U R U' R' F' U' F R U R' F R' F' R U' R",
    'Ra': "R U' R' U' R U R D R' U' R D' R' U2 R'",
    'Rb': "R2 F R U R U' R' F' R U2 R' U2 R",
    'T':  "R U R' U' R' F R2 U' R' U' R U R' F'",
    'Ua': "M2 U M U2 M' U M2",
    'Ub': "M2 U' M U2 M' U' M2",
    'V':  "R' U R' U' y R' F' R2 U' R' U R' F R F",
    'Y':  "F R U' R' U' R U R' F' R U R' U' R' F R F'",
    'Z':  "M' U M2 U M2 U M' U2 M2",
}


def _is_edge_cell(cell):
    return (cell[0] == 1) != (cell[1] == 1)


# Manual AUF override per case (0-3 extra U turns applied to the canonical
# pick). Use when the source diagram shows the other of two equally-canonical
# AUF variants — adjust after visually comparing with the source.
AUF_OVERRIDE = {}


def auf_canonical(st, name=''):
    """Some reference algorithms solve their case only up to a final U turn
    (AUF). The source diagrams show the canonical orientation. Selection:
    maximize (min(solved_corners, solved_edges), total_solved, solved_corners).
    The min-term picks the 3+3 form for G perms (over 2+4 variants); the
    corner tiebreak picks the edges-only form for H/Z/U."""
    best = None
    best_data = None
    s = st
    for k in range(4):
        pills, arrows = case_data(s)
        moved_edges = sum(1 for a, _b in arrows if _is_edge_cell(a))
        moved_corners = len(arrows) - moved_edges
        sc = 4 - moved_corners
        se = 4 - moved_edges
        score = (min(sc, se), sc + se, sc)
        if best is None or score > best[0]:
            best = (score, s)
            best_data = (pills, arrows)
        elif score == best[0] and (pills, arrows) != best_data:
            print(f'NOTE: {name}: second canonical AUF variant exists '
                  f'(score={score}) — verify against source, use AUF_OVERRIDE to flip')
        s = apply_move(s, 'U')
    result = best[1]
    for _ in range(AUF_OVERRIDE.get(name, 0)):
        result = apply_move(result, 'U')
    return result


# --- build all cases ---------------------------------------------------
_COLOR_MAP = {'G': GREEN, 'R': RED, 'B': BLUE, 'O': ORANGE}

PLL_CASES = {}
INTERNAL = {}  # char-based pills + arrows, for inspection/diffing
for _name, _alg in ALGS.items():
    _st = auf_canonical(case_state_for(_alg), _name)
    check_pll(_st, _name)
    _pills, _arrows = case_data(_st)
    INTERNAL[_name] = {'pills': _pills, 'arrows': _arrows}
    PLL_CASES[_name] = {
        'pills': {k: tuple(_COLOR_MAP[c] for c in v) for k, v in _pills.items()},
        'arrows': _arrows,
    }

# End-to-end anchor: the user explicitly confirmed these Ua pills.
assert INTERNAL['Ua']['pills'] == dict(
    top=('G', 'G', 'G'),       # image top (back side): all green
    bottom=('B', 'R', 'B'),    # image bottom (front side): blue-RED-blue
    right=('R', 'O', 'R'),     # red-ORANGE-red
    left=('O', 'B', 'O'),      # orange-BLUE-orange
), f"Ua anchor mismatch: {INTERNAL['Ua']['pills']}"


if __name__ == '__main__':
    # Move self-tests
    st0 = solved_state()
    for tok in ('U', 'D', 'R', 'L', 'F', 'B', 'M', 'r', 'x', 'y'):
        s = st0
        for _ in range(4):
            s = apply_move(s, tok)
        assert s == st0, f'{tok}^4 != identity'
    s = st0
    for _ in range(6):
        s = apply_alg(s, "R U R' U'")
    assert s == st0, 'sexy move order != 6'
    # U moves front edge to the left
    s = apply_move(st0, 'U')
    assert s[((-2, 1, 0), (-1, 0, 0))] == 'B', 'U direction wrong'
    print('Self-tests OK\n')

    _CELL = {
        (0, 0): 'BL', (1, 0): 'B ', (2, 0): 'BR',
        (0, 1): 'L ', (2, 1): 'R ',
        (0, 2): 'FL', (1, 2): 'F ', (2, 2): 'FR',
    }
    for name in ALGS:
        d = INTERNAL[name]
        p = d['pills']
        arr = ', '.join(f"{_CELL[a].strip()}>{_CELL[b].strip()}" for a, b in d['arrows'])
        print(f"{name:3s} top={''.join(p['top'])} right={''.join(p['right'])} "
              f"bottom={''.join(p['bottom'])} left={''.join(p['left'])}  "
              f"arrows[{len(d['arrows'])}]: {arr}")
