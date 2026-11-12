#!/usr/bin/env python3
"""Erzeugt die verschlankten Schriftdateien in src/assets/fonts/ aus den Fontsource-Paketen.

Aufruf (nur Entwicklungswerkzeug, keine Laufzeit-Abhängigkeit):
    pip install fonttools brotli
    npm ci && python3 scripts/make-fonts.py

Was passiert:
  - Fraunces (wght + SOFT, normal und kursiv): SOFT wird auf 100 festgelegt (das Design nutzt ausschließlich
    font-variation-settings 'SOFT' 100), wght auf 340-700 begrenzt (genutzt: 340-700).
  - Instrument Sans (wght): 400-700 bleibt (genutzt: 400-700).
  - Alle: Teilmenge auf Latin für DE/EN/ES/Katalanisch + Satzzeichen (UNICODES unten), WOFF2.
  - Ausgabe der metrikangepassten Fallback-Werte (size-adjust usw.) für src/styles/fonts.css.
Die Lizenzen (SIL OFL 1.1) werden nach public/fonts/ kopiert und mit ausgeliefert.
"""
import io
import os
import shutil

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FS = os.path.join(ROOT, 'node_modules', '@fontsource-variable')
OUT = os.path.join(ROOT, 'src', 'assets', 'fonts')

# Basis-Latin, Latin-1, Œ œ ı ŀ, Gedankenstriche, typografische Anführungszeichen, Aufzählungspunkt, Auslassung, Euro, TM, Minus.
UNICODES = (
    list(range(0x20, 0x7F))
    + list(range(0xA0, 0x100))
    + [0x131, 0x152, 0x153, 0x13F, 0x140, 0x2C6, 0x2DC]
    + [0x2013, 0x2014, 0x2018, 0x2019, 0x201A, 0x201C, 0x201D, 0x201E, 0x2022, 0x2026, 0x2039, 0x203A, 0x20AC, 0x2122, 0x2212]
)

JOBS = [
    # (Paket, Quelldatei, Ausgabe, Achsen-Grenzen)
    ('fraunces', 'fraunces-latin-soft-normal.woff2', 'fraunces-soft-normal.woff2', {'SOFT': 100, 'wght': (340, 700)}),
    ('fraunces', 'fraunces-latin-soft-italic.woff2', 'fraunces-soft-italic.woff2', {'SOFT': 100, 'wght': (340, 700)}),
    ('instrument-sans', 'instrument-sans-latin-wght-normal.woff2', 'instrument-sans-wght.woff2', {'wght': (400, 700)}),
]

os.makedirs(OUT, exist_ok=True)
os.makedirs(os.path.join(ROOT, 'public', 'fonts'), exist_ok=True)
for pkg, src, dst, limits in JOBS:
    font = TTFont(os.path.join(FS, pkg, 'files', src))
    font = instancer.instantiateVariableFont(font, limits)
    buf = io.BytesIO()  # Zwischenspeichern und neu laden: der Subsetter braucht eine frisch geparste gvar-Tabelle.
    font.save(buf)
    buf.seek(0)
    font = TTFont(buf)
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['rvrn', 'kern', 'liga', 'calt', 'ccmp', 'locl', 'mark', 'mkmk', 'case', 'tnum']
    opts.name_IDs = [1, 2, 3, 4, 6, 13, 14]
    opts.notdef_outline = True
    opts.hinting = False
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=UNICODES)
    sub.subset(font)
    path = os.path.join(OUT, dst)
    font.flavor = 'woff2'
    font.save(path)
    print(f'{dst}: {os.path.getsize(path) / 1000:.1f} kB')

# Lizenzen (OFL) mitliefern.
for pkg, name in (('fraunces', 'Fraunces'), ('instrument-sans', 'Instrument-Sans')):
    shutil.copyfile(os.path.join(FS, pkg, 'LICENSE'), os.path.join(ROOT, 'public', 'fonts', f'OFL-{name}.txt'))

# Metrikangepasste Fallbacks: Arial (= Liberation Sans) für Text, Times New Roman (= Liberation Serif) für Überschriften.
FREQ = dict(zip('etaoinshrdlcumwfgypbvkjxqz', [12.7, 9.1, 8.2, 7.5, 7.0, 6.7, 6.3, 6.1, 6.0, 4.3, 4.0, 2.8, 2.8, 2.4, 2.4, 2.2, 2.0, 2.0, 1.9, 1.5, 1.0, 0.8, 0.15, 0.15, 0.1, 0.07]))


def weighted_width(font):
    cmap = font.getBestCmap()
    hmtx = font['hmtx']
    upm = font['head'].unitsPerEm
    total = sum(FREQ[c] * hmtx[cmap[ord(c)]][0] for c in FREQ) + 18 * hmtx[cmap[32]][0]
    return total / (sum(FREQ.values()) + 18) / upm


def report(label, variable_path, fallback_path, wght):
    f = TTFont(variable_path)
    limits = {'wght': wght}
    if 'SOFT' in [a.axisTag for a in f['fvar'].axes]:
        limits['SOFT'] = 100
    f = instancer.instantiateVariableFont(f, limits)
    fb = TTFont(fallback_path)
    upm = f['head'].unitsPerEm
    adj = weighted_width(f) / weighted_width(fb)
    asc, desc, gap = f['hhea'].ascent / upm, -f['hhea'].descent / upm, f['hhea'].lineGap / upm
    print(f'{label}: size-adjust {adj * 100:.2f}% · ascent-override {asc / adj * 100:.2f}% · descent-override {desc / adj * 100:.2f}% · line-gap-override {gap / adj * 100:.2f}%')


LIB = '/usr/share/fonts/truetype/liberation'
if os.path.isdir(LIB):
    report('Instrument Sans (450) vs. Arial', os.path.join(FS, 'instrument-sans/files/instrument-sans-latin-wght-normal.woff2'), f'{LIB}/LiberationSans-Regular.ttf', 450)
    report('Fraunces (380) vs. Times New Roman', os.path.join(FS, 'fraunces/files/fraunces-latin-soft-normal.woff2'), f'{LIB}/LiberationSerif-Regular.ttf', 380)
else:
    print('Liberation-Schriften fehlen; Fallback-Metriken nicht neu berechnet (Werte in src/styles/fonts.css bleiben).')
