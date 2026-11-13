/**
 * (6) Bilder: Alternativtext vorhanden (leer nur bewusst), width/height gesetzt und zum Bild passend,
 * srcset mit sizes, Inline-SVG entweder verborgen oder benannt.
 */
import path from 'node:path';
import sharp from 'sharp';
import { beforeAll, describe, expect, it } from 'vitest';
import { assertBuilt, BUILDS, type Build, htmlFiles, read, resolveInternal, tags } from './helpers';

/**
 * Bewusst ohne Maße und mit leerem alt: das Bild im Lightbox-Dialog. Skript setzt Quelle, Maße und
 * alt je Bild (`src/scripts/lightbox.ts`); im Ruhezustand ist es ein 1×1-Platzhalter.
 */
const SCRIPT_FILLED = (attrs: Record<string, string>) => 'data-lightbox-image' in attrs;

describe.each(BUILDS)('Bilder in $name', (b: Build) => {
  beforeAll(assertBuilt);
  const imgs = () => htmlFiles(b).flatMap((f) => tags(read(b, f)).filter((t) => t.name === 'img').map((t) => ({ f, ...t })));

  it('jedes <img> hat ein alt-Attribut; leer nur bei Skript-befüllten Bildern', () => {
    for (const i of imgs()) {
      expect('alt' in i.attrs, `${i.f}: <img> ohne alt (${i.attrs.src})`).toBe(true);
      if (i.attrs.alt === '') expect(SCRIPT_FILLED(i.attrs), `${i.f}: leeres alt ohne Begründung (${i.attrs.src})`).toBe(true);
      else expect(i.attrs.alt!.trim().length, `${i.f}: alt zu kurz`).toBeGreaterThanOrEqual(10);
    }
  });

  it('jedes <img> hat src; width und height sind positive Ganzzahlen (Ausnahme: Skript-befüllt)', () => {
    for (const i of imgs()) {
      expect(i.attrs.src, `${i.f}: src fehlt`).toBeTruthy();
      if (SCRIPT_FILLED(i.attrs)) continue;
      expect(i.attrs.width, `${i.f}: width (${i.attrs.src})`).toMatch(/^[1-9]\d*$/);
      expect(i.attrs.height, `${i.f}: height (${i.attrs.src})`).toMatch(/^[1-9]\d*$/);
    }
  });

  it('width/height entsprechen dem Seitenverhältnis der Datei (kein Layoutsprung durch falsche Maße)', async () => {
    const seen = new Set<string>();
    for (const i of imgs()) {
      if (SCRIPT_FILLED(i.attrs) || !i.attrs.src || seen.has(i.attrs.src + i.attrs.width)) continue;
      seen.add(i.attrs.src + i.attrs.width);
      const r = resolveInternal(b, i.attrs.src);
      if (!r?.file) continue; // fehlende Dateien meldet links.test.ts
      const meta = await sharp(path.join(b.dir, r.file)).metadata();
      const declared = Number(i.attrs.width) / Number(i.attrs.height);
      const actual = meta.width! / meta.height!;
      expect(Math.abs(declared / actual - 1), `${i.f}: ${i.attrs.src} ${meta.width}x${meta.height} vs ${i.attrs.width}x${i.attrs.height}`).toBeLessThan(0.01);
    }
  });

  it('srcset mit Breitenangaben (w) hat sizes und nur w-Deskriptoren', () => {
    for (const i of imgs()) {
      if (!i.attrs.srcset) continue;
      expect(i.attrs.sizes, `${i.f}: sizes fehlt (${i.attrs.src})`).toBeTruthy();
      for (const c of i.attrs.srcset.split(',')) expect(c.trim(), i.f).toMatch(/^\S+ [1-9]\d*w$/);
    }
  });

  it('Inline-SVG ist verborgen (aria-hidden) oder trägt einen Namen', () => {
    for (const f of htmlFiles(b)) {
      for (const t of tags(read(b, f))) {
        if (t.name !== 'svg') continue;
        const named = t.attrs['aria-label'] !== undefined || t.attrs['aria-labelledby'] !== undefined || t.attrs.role === 'img';
        expect(t.attrs['aria-hidden'] === 'true' || named, `${f}: <svg> weder aria-hidden noch benannt`).toBe(true);
      }
    }
  });

  if (b.isPublic) {
    it('öffentlich: keine Bilddateien eingebunden (keine freigegebenen Fotos)', () => {
      expect(imgs().filter((i) => !SCRIPT_FILLED(i.attrs))).toEqual([]);
    });
  } else {
    it('Vorschau: Konzeptbilder vorhanden und mit „Illustration“ gekennzeichnet', () => {
      const all = imgs().filter((i) => !SCRIPT_FILLED(i.attrs));
      expect(all.length).toBeGreaterThan(5);
      for (const i of all) expect(i.attrs.alt, i.f).toMatch(/Illustration|Ilustración/);
    });
  }
});
