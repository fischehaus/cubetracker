"""57 OLL patterns, extracted from the validated original PNGs
by extract_oll.py. top: 3x3 booleans (True=yellow), row 0 = image
top. sides: per side 3 booleans, same reading order as PLL pills."""

OLL_PATTERNS = {
    'OLL_01': {
        'top': [[False, False, False], [False, True, False], [False, False, False]],
        'sides': {'top': [False, True, False], 'right': [True, True, True], 'bottom': [False, True, False], 'left': [True, True, True]},
    },
    'OLL_02': {
        'top': [[False, False, False], [False, True, False], [False, False, False]],
        'sides': {'top': [True, True, True], 'right': [False, True, True], 'bottom': [False, True, False], 'left': [False, True, True]},
    },
    'OLL_03': {
        'top': [[False, False, False], [False, True, False], [True, False, False]],
        'sides': {'top': [True, True, False], 'right': [True, True, False], 'bottom': [False, True, True], 'left': [False, True, False]},
    },
    'OLL_04': {
        'top': [[False, False, False], [False, True, False], [False, False, True]],
        'sides': {'top': [False, True, True], 'right': [False, True, False], 'bottom': [True, True, False], 'left': [True, True, False]},
    },
    'OLL_05': {
        'top': [[True, True, False], [True, True, False], [False, False, False]],
        'sides': {'top': [False, False, False], 'right': [True, True, False], 'bottom': [False, True, True], 'left': [False, False, True]},
    },
    'OLL_06': {
        'top': [[False, True, True], [False, True, True], [False, False, False]],
        'sides': {'top': [False, False, False], 'right': [False, False, True], 'bottom': [True, True, False], 'left': [True, True, False]},
    },
    'OLL_07': {
        'top': [[False, True, False], [True, True, False], [True, False, False]],
        'sides': {'top': [True, False, False], 'right': [True, True, False], 'bottom': [False, True, True], 'left': [False, False, False]},
    },
    'OLL_08': {
        'top': [[False, True, False], [False, True, True], [False, False, True]],
        'sides': {'top': [False, False, True], 'right': [False, False, False], 'bottom': [True, True, False], 'left': [True, True, False]},
    },
    'OLL_09': {
        'top': [[False, True, False], [True, True, False], [False, False, True]],
        'sides': {'top': [False, False, True], 'right': [False, True, False], 'bottom': [True, True, False], 'left': [True, False, False]},
    },
    'OLL_10': {
        'top': [[False, False, True], [True, True, False], [False, True, False]],
        'sides': {'top': [True, True, False], 'right': [False, True, False], 'bottom': [False, False, True], 'left': [False, False, True]},
    },
    'OLL_11': {
        'top': [[False, True, True], [True, True, False], [False, False, False]],
        'sides': {'top': [True, False, False], 'right': [False, True, False], 'bottom': [False, True, True], 'left': [False, False, True]},
    },
    'OLL_12': {
        'top': [[True, True, False], [False, True, True], [False, False, False]],
        'sides': {'top': [False, False, True], 'right': [False, False, True], 'bottom': [True, True, False], 'left': [False, True, False]},
    },
    'OLL_13': {
        'top': [[False, False, False], [True, True, True], [True, False, False]],
        'sides': {'top': [True, True, False], 'right': [True, False, False], 'bottom': [False, True, True], 'left': [False, False, False]},
    },
    'OLL_14': {
        'top': [[False, False, False], [True, True, True], [False, False, True]],
        'sides': {'top': [False, True, True], 'right': [False, False, False], 'bottom': [True, True, False], 'left': [True, False, False]},
    },
    'OLL_15': {
        'top': [[True, False, False], [True, True, True], [False, False, False]],
        'sides': {'top': [False, True, False], 'right': [True, False, False], 'bottom': [False, True, True], 'left': [False, False, True]},
    },
    'OLL_16': {
        'top': [[False, False, True], [True, True, True], [False, False, False]],
        'sides': {'top': [False, True, False], 'right': [False, False, True], 'bottom': [True, True, False], 'left': [True, False, False]},
    },
    'OLL_17': {
        'top': [[True, False, False], [False, True, False], [False, False, True]],
        'sides': {'top': [False, True, False], 'right': [True, True, False], 'bottom': [True, True, False], 'left': [False, True, False]},
    },
    'OLL_18': {
        'top': [[True, False, True], [False, True, False], [False, False, False]],
        'sides': {'top': [False, True, False], 'right': [False, True, False], 'bottom': [True, True, True], 'left': [False, True, False]},
    },
    'OLL_19': {
        'top': [[True, False, True], [False, True, False], [False, False, False]],
        'sides': {'top': [False, True, False], 'right': [False, True, True], 'bottom': [False, True, False], 'left': [False, True, True]},
    },
    'OLL_20': {
        'top': [[True, False, True], [False, True, False], [True, False, True]],
        'sides': {'top': [False, True, False], 'right': [False, True, False], 'bottom': [False, True, False], 'left': [False, True, False]},
    },
    'OLL_21': {
        'top': [[False, True, False], [True, True, True], [False, True, False]],
        'sides': {'top': [True, False, True], 'right': [False, False, False], 'bottom': [True, False, True], 'left': [False, False, False]},
    },
    'OLL_22': {
        'top': [[False, True, False], [True, True, True], [False, True, False]],
        'sides': {'top': [False, False, True], 'right': [False, False, False], 'bottom': [False, False, True], 'left': [True, False, True]},
    },
    'OLL_23': {
        'top': [[False, True, False], [True, True, True], [True, True, True]],
        'sides': {'top': [True, False, True], 'right': [False, False, False], 'bottom': [False, False, False], 'left': [False, False, False]},
    },
    'OLL_24': {
        'top': [[False, True, True], [True, True, True], [False, True, True]],
        'sides': {'top': [True, False, False], 'right': [False, False, False], 'bottom': [True, False, False], 'left': [False, False, False]},
    },
    'OLL_25': {
        'top': [[False, True, True], [True, True, True], [True, True, False]],
        'sides': {'top': [False, False, False], 'right': [False, False, False], 'bottom': [False, False, True], 'left': [True, False, False]},
    },
    'OLL_26': {
        'top': [[False, True, True], [True, True, True], [False, True, False]],
        'sides': {'top': [False, False, False], 'right': [False, False, True], 'bottom': [True, False, False], 'left': [True, False, False]},
    },
    'OLL_27': {
        'top': [[False, True, False], [True, True, True], [True, True, False]],
        'sides': {'top': [True, False, False], 'right': [True, False, False], 'bottom': [False, False, True], 'left': [False, False, False]},
    },
    'OLL_28': {
        'top': [[True, True, True], [True, True, False], [True, False, True]],
        'sides': {'top': [False, False, False], 'right': [False, True, False], 'bottom': [False, True, False], 'left': [False, False, False]},
    },
    'OLL_29': {
        'top': [[False, True, True], [True, True, False], [False, False, True]],
        'sides': {'top': [True, False, False], 'right': [False, True, False], 'bottom': [True, True, False], 'left': [False, False, False]},
    },
    'OLL_30': {
        'top': [[False, True, False], [True, True, False], [True, False, True]],
        'sides': {'top': [False, False, False], 'right': [True, True, False], 'bottom': [False, True, False], 'left': [True, False, False]},
    },
    'OLL_31': {
        'top': [[False, True, True], [False, True, True], [False, False, True]],
        'sides': {'top': [True, False, False], 'right': [False, False, False], 'bottom': [True, True, False], 'left': [False, True, False]},
    },
    'OLL_32': {
        'top': [[True, True, False], [True, True, False], [True, False, False]],
        'sides': {'top': [False, False, True], 'right': [False, True, False], 'bottom': [False, True, True], 'left': [False, False, False]},
    },
    'OLL_33': {
        'top': [[False, False, True], [True, True, True], [False, False, True]],
        'sides': {'top': [True, True, False], 'right': [False, False, False], 'bottom': [True, True, False], 'left': [False, False, False]},
    },
    'OLL_34': {
        'top': [[False, False, False], [True, True, True], [True, False, True]],
        'sides': {'top': [False, True, False], 'right': [True, False, False], 'bottom': [False, True, False], 'left': [True, False, False]},
    },
    'OLL_35': {
        'top': [[True, False, False], [False, True, True], [False, True, True]],
        'sides': {'top': [False, True, False], 'right': [True, False, False], 'bottom': [True, False, False], 'left': [False, True, False]},
    },
    'OLL_36': {
        'top': [[True, True, False], [False, True, True], [False, False, True]],
        'sides': {'top': [False, False, True], 'right': [False, False, False], 'bottom': [False, True, False], 'left': [False, True, True]},
    },
    'OLL_37': {
        'top': [[True, True, False], [True, True, False], [False, False, True]],
        'sides': {'top': [False, False, False], 'right': [True, True, False], 'bottom': [True, True, False], 'left': [False, False, False]},
    },
    'OLL_38': {
        'top': [[False, True, True], [True, True, False], [True, False, False]],
        'sides': {'top': [True, False, False], 'right': [False, True, True], 'bottom': [False, True, False], 'left': [False, False, False]},
    },
    'OLL_39': {
        'top': [[False, False, True], [True, True, True], [True, False, False]],
        'sides': {'top': [True, True, False], 'right': [False, False, True], 'bottom': [False, True, False], 'left': [False, False, False]},
    },
    'OLL_40': {
        'top': [[True, False, False], [True, True, True], [False, False, True]],
        'sides': {'top': [False, True, True], 'right': [False, False, False], 'bottom': [False, True, False], 'left': [False, False, True]},
    },
    'OLL_41': {
        'top': [[False, True, False], [True, True, False], [True, False, True]],
        'sides': {'top': [True, False, True], 'right': [False, True, False], 'bottom': [False, True, False], 'left': [False, False, False]},
    },
    'OLL_42': {
        'top': [[True, False, True], [True, True, False], [False, True, False]],
        'sides': {'top': [False, True, False], 'right': [False, True, False], 'bottom': [True, False, True], 'left': [False, False, False]},
    },
    'OLL_43': {
        'top': [[False, True, True], [False, True, True], [False, False, True]],
        'sides': {'top': [False, False, False], 'right': [False, False, False], 'bottom': [False, True, False], 'left': [True, True, True]},
    },
    'OLL_44': {
        'top': [[True, True, False], [True, True, False], [True, False, False]],
        'sides': {'top': [False, False, False], 'right': [True, True, True], 'bottom': [False, True, False], 'left': [False, False, False]},
    },
    'OLL_45': {
        'top': [[False, False, True], [True, True, True], [False, False, True]],
        'sides': {'top': [False, True, False], 'right': [False, False, False], 'bottom': [False, True, False], 'left': [True, False, True]},
    },
    'OLL_46': {
        'top': [[True, True, False], [False, True, False], [True, True, False]],
        'sides': {'top': [False, False, False], 'right': [True, True, True], 'bottom': [False, False, False], 'left': [False, True, False]},
    },
    'OLL_47': {
        'top': [[False, True, False], [False, True, True], [False, False, False]],
        'sides': {'top': [True, False, False], 'right': [True, False, True], 'bottom': [True, True, False], 'left': [False, True, False]},
    },
    'OLL_48': {
        'top': [[False, True, False], [True, True, False], [False, False, False]],
        'sides': {'top': [False, False, True], 'right': [False, True, False], 'bottom': [False, True, True], 'left': [True, False, True]},
    },
    'OLL_49': {
        'top': [[False, True, False], [False, True, True], [False, False, False]],
        'sides': {'top': [False, False, True], 'right': [False, False, False], 'bottom': [False, True, True], 'left': [True, True, True]},
    },
    'OLL_50': {
        'top': [[False, False, False], [False, True, True], [False, True, False]],
        'sides': {'top': [False, True, True], 'right': [False, False, False], 'bottom': [False, False, True], 'left': [True, True, True]},
    },
    'OLL_51': {
        'top': [[False, False, False], [True, True, True], [False, False, False]],
        'sides': {'top': [True, True, False], 'right': [True, False, True], 'bottom': [True, True, False], 'left': [False, False, False]},
    },
    'OLL_52': {
        'top': [[False, True, False], [False, True, False], [False, True, False]],
        'sides': {'top': [True, False, False], 'right': [True, True, True], 'bottom': [True, False, False], 'left': [False, True, False]},
    },
    'OLL_53': {
        'top': [[False, True, False], [False, True, True], [False, False, False]],
        'sides': {'top': [True, False, True], 'right': [False, False, False], 'bottom': [True, True, True], 'left': [False, True, False]},
    },
    'OLL_54': {
        'top': [[False, True, False], [True, True, False], [False, False, False]],
        'sides': {'top': [True, False, True], 'right': [False, True, False], 'bottom': [True, True, True], 'left': [False, False, False]},
    },
    'OLL_55': {
        'top': [[False, False, False], [True, True, True], [False, False, False]],
        'sides': {'top': [True, True, True], 'right': [False, False, False], 'bottom': [True, True, True], 'left': [False, False, False]},
    },
    'OLL_56': {
        'top': [[False, False, False], [True, True, True], [False, False, False]],
        'sides': {'top': [False, True, False], 'right': [True, False, True], 'bottom': [False, True, False], 'left': [True, False, True]},
    },
    'OLL_57': {
        'top': [[True, False, True], [True, True, True], [True, False, True]],
        'sides': {'top': [False, True, False], 'right': [False, False, False], 'bottom': [False, True, False], 'left': [False, False, False]},
    },
}
