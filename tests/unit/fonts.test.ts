import { readFileSync, readdirSync, statSync } from 'node:fs';
import { brotliDecompressSync } from 'node:zlib';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Zeichenabdeckung der verschlankten Schriften (src/assets/fonts/, erzeugt von scripts/make-fonts.py).
 * Liest nur die cmap-Tabelle direkt aus der WOFF2-Datei (cmap ist nicht transformiert), ohne Abhängigkeit.
 */
const DIR = join(process.cwd(), 'src/assets/fonts');

const KNOWN_TAGS = ['cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca', 'prep', 'CFF ', 'VORG', 'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS', 'GSUB', 'EBSC', 'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc', 'bsln', 'cvar', 'fdsc', 'feat', 'fmtx', 'fvar', 'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx', 'opbd', 'prop', 'trak', 'Zapf', 'Silf', 'Glat', 'Gloc', 'Feat', 'Sill'];

function readTables(file: string): Map<string, Buffer> {
  const buf = readFileSync(file);
  expect(buf.toString('latin1', 0, 4)).toBe('wOF2');
  const numTables = buf.readUInt16BE(12);
  const compressedSize = buf.readUInt32BE(20);
  let pos = 48;
  const base128 = (): number => {
    let value = 0;
    for (let i = 0; i < 5; i++) {
      const byte = buf[pos++]!;
      value = value * 128 + (byte & 0x7f);
      if ((byte & 0x80) === 0) return value;
    }
    throw new Error('UIntBase128');
  };
  const entries: { tag: string; length: number }[] = [];
  for (let i = 0; i < numTables; i++) {
    const flags = buf[pos++]!;
    const index = flags & 0x3f;
    const tag = index === 63 ? ((pos += 4), buf.toString('latin1', pos - 4, pos)) : KNOWN_TAGS[index]!;
    const version = flags >> 6;
    const origLength = base128();
    const isGlyfLoca = tag === 'glyf' || tag === 'loca';
    const transformed = isGlyfLoca ? version !== 3 : version !== 0;
    entries.push({ tag, length: transformed ? base128() : origLength });
  }
  const data = brotliDecompressSync(buf.subarray(pos, pos + compressedSize));
  const tables = new Map<string, Buffer>();
  let offset = 0;
  for (const { tag, length } of entries) {
    tables.set(tag, data.subarray(offset, offset + length));
    offset += length;
  }
  return tables;
}

function codepoints(file: string): Set<number> {
  const cmap = readTables(file).get('cmap')!;
  const count = cmap.readUInt16BE(2);
  const result = new Set<number>();
  for (let i = 0; i < count; i++) {
    const platform = cmap.readUInt16BE(4 + i * 8);
    const offset = cmap.readUInt32BE(8 + i * 8);
    const format = cmap.readUInt16BE(offset);
    if (platform !== 0 && platform !== 3) continue;
    if (format === 4) {
      const segX2 = cmap.readUInt16BE(offset + 6);
      const ends = offset + 14;
      const starts = ends + segX2 + 2;
      const deltas = starts + segX2;
      const rangeOffsets = deltas + segX2;
      for (let s = 0; s < segX2 / 2; s++) {
        const end = cmap.readUInt16BE(ends + s * 2);
        const start = cmap.readUInt16BE(starts + s * 2);
        const rangeOffset = cmap.readUInt16BE(rangeOffsets + s * 2);
        for (let c = start; c <= end && c < 0xffff; c++) {
          let glyph = c; // Standardfall: idRangeOffset 0
          if (rangeOffset !== 0) {
            const at = rangeOffsets + s * 2 + rangeOffset + (c - start) * 2;
            glyph = cmap.readUInt16BE(at);
          }
          if (glyph !== 0) result.add(c);
        }
      }
    } else if (format === 12) {
      const groups = cmap.readUInt32BE(offset + 12);
      for (let g = 0; g < groups; g++) {
        const start = cmap.readUInt32BE(offset + 16 + g * 12);
        const end = cmap.readUInt32BE(offset + 20 + g * 12);
        for (let c = start; c <= end; c++) result.add(c);
      }
    }
  }
  return result;
}

/** Quellen für sichtbaren Text; muss mit CORPUS_DIRS in scripts/make-fonts.py übereinstimmen. */
const CORPUS_DIRS = ['i18n', 'content', 'components', 'layouts', 'pages', 'scripts', 'styles'];
const CORPUS_EXT = /\.(ts|astro|json|css)$/;
/** Zeichen, die bewusst aus der Systemschrift kommen: Pfeile (→ ↗ ↓ …). */
const SYSTEM_ONLY = (cp: number): boolean => cp >= 0x2190 && cp < 0x2200;

function corpus(): Set<string> {
  const found = new Set<string>();
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (CORPUS_EXT.test(name)) for (const c of readFileSync(path, 'utf8')) found.add(c);
    }
  };
  for (const d of CORPUS_DIRS) walk(join(process.cwd(), 'src', d));
  return found;
}

const FILES = ['fraunces-soft-normal.woff2', 'fraunces-soft-italic.woff2', 'instrument-sans-wght.woff2'] as const;

/** Pflichtzeichen: Deutsch, Englisch, Spanisch, Katalanisch, Satz- und Währungszeichen der Seiten. */
const REQUIRED = `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,:;!?'"()[]{}/\\@#&%+-=_*|~<>`
  + 'ÄÖÜäöüß' + 'ÁÉÍÓÚáéíóúÑñ¿¡Üü' + 'ÀÈÒàèòÇçÏï' + '·€–—„“”‘’…•×«»';

describe('Schriften: Zeichenabdeckung', () => {
  for (const file of FILES) {
    it(`${file} enthält alle Pflichtzeichen`, () => {
      const set = codepoints(join(DIR, file));
      const missing = [...REQUIRED].filter((c) => !set.has(c.codePointAt(0)!));
      expect(missing).toEqual([]);
      expect(set.has(0x6c) && set.has(0xb7)).toBe(true); // l·l
    });
  }

  it('jedes Zeichen der Quelltexte steht in allen drei Schriften (außer Systemschrift-Zeichen)', () => {
    const sets = FILES.map((f) => ({ f, set: codepoints(join(DIR, f)) }));
    const missing: string[] = [];
    for (const c of corpus()) {
      const cp = c.codePointAt(0)!;
      if (cp <= 0x7e || SYSTEM_ONLY(cp)) continue;
      for (const { f, set } of sets) if (!set.has(cp)) missing.push(`${c} (U+${cp.toString(16).toUpperCase().padStart(4, '0')}) fehlt in ${f}`);
    }
    // Fehlschlag heißt: `python3 scripts/make-fonts.py` ausführen (nimmt das Zeichen automatisch auf). Fehlt es in der
    // Quellschrift, bewusst Systemschrift in Kauf nehmen und SYSTEM_ONLY erweitern.
    expect(missing).toEqual([]);
  });

  it('Gesamtgewicht der drei Dateien bleibt unter 100 kB (Richtwert für den Erstbesuch)', () => {
    const total = FILES.reduce((sum, f) => sum + statSync(join(DIR, f)).size, 0);
    expect(total).toBeLessThan(100_000);
  });

  it('Lizenztexte (OFL) liegen im Build-Ordner', () => {
    for (const name of ['OFL-Fraunces.txt', 'OFL-Instrument-Sans.txt']) {
      expect(readFileSync(join(process.cwd(), 'public/fonts', name), 'utf8')).toContain('SIL OPEN FONT LICENSE');
    }
  });
});
