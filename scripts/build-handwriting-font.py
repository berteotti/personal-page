"""Trace IMG_8482.jpg into the note font. Usage: python3 scripts/build-handwriting-font.py PHOTO ORIGINAL_PHOTO
Requires Pillow, numpy, scipy, scikit-image, fonttools and brotli (build-time only).
Coordinates refer to the photo rotated 90° counterclockwise at 2016 × 1134.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, label
from skimage.measure import approximate_polygon, find_contours
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont

# Character: left, top, right, bottom, writing baseline in IMG_8482.jpg.
BOXES = {
    'a': (155,290,229,351,340), 'b': (262,255,326,356,344),
    'c': (355,285,411,359,348), 'd': (442,251,490,353,341),
    'e': (515,296,566,354,344), 'f': (599,259,647,386,341),
    'g': (669,289,730,389,342), 'h': (765,258,830,357,342),
    'i': (862,276,906,359,345), 'j': (925,283,970,398,345),
    'k': (985,260,1048,354,340), 'l': (1075,233,1132,342,327),
    'm': (1154,276,1234,347,332), 'n': (1254,275,1323,344,329),
    'o': (1334,275,1385,338,326), 'p': (1388,273,1435,357,326),
    'q': (1438,272,1498,370,325), 'r': (1503,273,1560,344,330),
    's': (1569,283,1627,346,334), 't': (1628,228,1685,346,333),
    'u': (1685,277,1730,342,330), 'v': (1733,273,1798,345,331),
    'x': (1806,275,1860,344,331), 'y': (1866,271,1919,365,326),
    'z': (1930,267,1990,330,318),
    'A': (150,433,226,532,519), 'B': (254,441,317,534,520),
    'C': (331,453,387,526,517), 'D': (423,441,480,526,514),
    'E': (489,440,540,526,516), 'F': (567,442,631,517,506),
    'G': (665,442,720,517,506), 'H': (753,437,816,521,508),
    'I': (846,442,876,517,505), 'J': (906,444,951,523,512),
    'K': (977,435,1041,518,506), 'L': (1076,432,1129,506,496),
    'M': (1152,429,1219,510,499), 'N': (1241,445,1304,509,497),
    'O': (1322,435,1370,506,494), 'P': (1377,424,1422,504,493),
    'Q': (1434,422,1492,498,485), 'R': (1496,414,1547,496,484),
    'S': (1546,423,1596,503,490), 'T': (1596,419,1649,489,478),
    'U': (1650,419,1697,490,479), 'V': (1706,415,1758,491,480),
    'X': (1772,412,1834,494,482), 'Y': (1842,409,1894,494,482),
    'Z': (1898,412,1980,487,476),
    '.': (164,631,193,666,655), ',': (232,620,260,685,652),
    '!': (309,562,340,672,658), '?': (384,554,427,678,663),
    ':': (465,595,495,670,655), ';': (529,594,558,696,655),
    "'": (605,538,628,582,620), '"': (670,532,716,584,620),
    '-': (749,608,806,633,660), '(': (847,553,884,673,660),
    ')': (908,553,946,673,660), '&': (974,580,1046,672,660),
    '@': (1083,573,1160,659,647),
}
# W/w were omitted on the separated sheet; retain them from IMG_8481.jpg.
ORIGINAL_BOXES = {'W': (934,216,997,294,284), 'w': (817,614,883,664,655)}


def read_ink(photo):
    rgb = np.asarray(Image.open(photo).convert('RGB').rotate(90, expand=True).resize((4032, 2268)), dtype=float)
    # Blue ink separates from the warm paper and the print showing through it.
    return gaussian_filter(rgb[:, :, 2] - (rgb[:, :, 0] + rgb[:, :, 1]) / 2, .7) > -8


def build(photo, original_photo):
    ink = read_ink(photo)
    original_ink = read_ink(original_photo)
    glyphs = {}
    metrics = {}
    cmap = {}
    for char, (left, top, right, bottom, baseline) in (BOXES | ORIGINAL_BOXES).items():
        source = original_ink if char in ORIGINAL_BOXES else ink
        mask = source[top*2:bottom*2, left*2:right*2].copy()
        components, _ = label(mask)
        sizes = np.bincount(components.ravel())
        mask &= sizes[components] >= 18
        ys, xs = np.nonzero(mask)
        assert len(xs), f'No ink for {char}'
        x_min, x_max = xs.min(), xs.max()
        pen = TTGlyphPen(None)
        for contour in find_contours(np.pad(mask, 1), .5):
            points = approximate_polygon(contour, tolerance=.7)
            if len(points) < 4:
                continue
            points = [(round((x - 1 - x_min) * 4.5 + 24), round((baseline * 2 - top * 2 - y + 1) * 4.5)) for y, x in points]
            pen.moveTo(points[0])
            for point in points[1:-1]:
                pen.lineTo(point)
            pen.closePath()
        name = f'uni{ord(char):04X}'
        glyphs[name] = pen.glyph()
        metrics[name] = (round((x_max - x_min) * 4.5 + 65), 24)
        cmap[ord(char)] = name

    # Use the photographed quote strokes for typographic quotes too.
    for char in '‘’':
        cmap[ord(char)] = cmap[ord("'")]
    for char in '“”':
        cmap[ord(char)] = cmap[ord('"')]
    glyphs['space'] = TTGlyphPen(None).glyph()
    metrics['space'] = (260, 0)
    cmap[32] = cmap[160] = 'space'
    missing = TTGlyphPen(None)
    missing.moveTo((40, 0)); missing.lineTo((40, 600)); missing.lineTo((440, 600)); missing.lineTo((440, 0)); missing.closePath()
    missing.moveTo((80, 40)); missing.lineTo((400, 40)); missing.lineTo((400, 560)); missing.lineTo((80, 560)); missing.closePath()
    glyphs['.notdef'] = missing.glyph()
    metrics['.notdef'] = (480, 40)
    builder = FontBuilder(1000, isTTF=True)
    builder.setupGlyphOrder(['.notdef', *[name for name in glyphs if name != '.notdef']])
    builder.setupCharacterMap(cmap)
    builder.setupGlyf(glyphs)
    builder.setupHorizontalMetrics(metrics)
    builder.setupHorizontalHeader(ascent=1000, descent=-500)
    builder.setupNameTable({'familyName': 'Leonardo Hand', 'styleName': 'Regular', 'uniqueFontIdentifier': 'LeonardoHand-Regular-2', 'fullName': 'Leonardo Hand Regular', 'psName': 'LeonardoHand-Regular', 'version': 'Version 1.100', 'copyright': 'Handwriting by Leonardo Berteotti.'})
    builder.setupOS2(sTypoAscender=1000, sTypoDescender=-500, sTypoLineGap=0, usWinAscent=1000, usWinDescent=500, sxHeight=340, sCapHeight=650)
    builder.setupPost()
    builder.setupMaxp()
    destination = Path(__file__).resolve().parents[1] / 'public/fonts/leonardo-hand.woff2'
    builder.font.flavor = 'woff2'
    builder.save(destination)
    # A runnable check that the saved font contains real outlines for both alphabets.
    saved = TTFont(destination)
    for char in ''.join(BOXES | ORIGINAL_BOXES) + '‘’“”':
        assert saved['glyf'][saved.getBestCmap()[ord(char)]].numberOfContours > 0, char
    assert saved['glyf'][saved.getBestCmap()[ord("'")]].yMin > 300
    for name in saved.getGlyphOrder():
        glyph = saved['glyf'][name]
        if glyph.numberOfContours:
            assert glyph.yMax <= 1000 and glyph.yMin >= -500, name
    print(f'{destination}: {destination.stat().st_size:,} bytes; both alphabets verified')


if __name__ == '__main__':
    build(sys.argv[1], sys.argv[2])
