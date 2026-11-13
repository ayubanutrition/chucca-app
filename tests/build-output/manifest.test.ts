/**
 * (3) Web-App-Manifest je Build: Pflichtfelder für die Installierbarkeit, Symbole in den
 * angegebenen Größen und Typen, maskable-Symbol mit Safe Zone, start_url/scope passend zum Basispfad.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { beforeAll, describe, expect, it } from 'vitest';
import { assertBuilt, BUILDS, type Build, htmlFiles, read, resolveInternal, tags } from './helpers';

interface Icon {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
}
interface Manifest {
  id?: string;
  name?: string;
  short_name?: string;
  description?: string;
  lang?: string;
  start_url?: string;
  scope?: string;
  display?: string;
  background_color?: string;
  theme_color?: string;
  icons?: Icon[];
}

const HEX = /^#[0-9a-f]{6}$/i;
const MIME: Record<string, string> = { png: 'image/png', webp: 'image/webp', jpeg: 'image/jpeg', svg: 'image/svg+xml' };

describe.each(BUILDS)('Manifest in $name', (b: Build) => {
  beforeAll(assertBuilt);
  const m = () => JSON.parse(read(b, 'manifest.webmanifest')) as Manifest;
  const fileOf = (src: string) => {
    const r = resolveInternal(b, src);
    expect(r?.file, src).toBeDefined();
    return path.join(b.dir, r!.file!);
  };

  it('Pflichtfelder für die Installierbarkeit sind gesetzt', () => {
    const mf = m();
    expect(mf.name).toBeTruthy();
    expect(mf.short_name).toBeTruthy();
    expect(mf.short_name!.length).toBeLessThanOrEqual(12);
    expect(['standalone', 'minimal-ui', 'fullscreen']).toContain(mf.display);
    expect(mf.start_url).toBeTruthy();
    expect(mf.lang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/);
    expect(mf.background_color).toMatch(HEX);
    expect(mf.theme_color).toMatch(HEX);
    const sizes = (mf.icons ?? []).filter((i) => (i.purpose ?? 'any').split(' ').includes('any')).map((i) => i.sizes);
    expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));
  });

  it('start_url, scope und id passen zum Basispfad', () => {
    const mf = m();
    expect(mf.start_url).toBe(b.base);
    expect(mf.scope).toBe(b.base);
    expect(mf.id).toBe(b.base);
    // Die Startseite liegt im Geltungsbereich und ist eine vorhandene Datei.
    expect(mf.start_url!.startsWith(mf.scope!)).toBe(true);
    expect(resolveInternal(b, mf.start_url!)?.file).toBe('index.html');
    // Alle Seiten verlinken genau dieses Manifest.
    for (const f of htmlFiles(b)) {
      const links = tags(read(b, f)).filter((t) => t.name === 'link' && t.attrs.rel === 'manifest');
      if (f === '404.html' || f === 'gallery.html') continue; // Fehlerseite und Weiterleitung sind keine App-Seiten
      expect(links.map((l) => l.attrs.href), f).toEqual([`${b.base}manifest.webmanifest`]);
    }
  });

  it('jedes Symbol existiert mit angegebener Größe und angegebenem Typ', async () => {
    const mf = m();
    expect(mf.icons!.length).toBeGreaterThanOrEqual(3);
    for (const icon of mf.icons!) {
      const file = fileOf(icon.src);
      expect(existsSync(file)).toBe(true);
      const meta = await sharp(file).metadata();
      expect(MIME[meta.format ?? ''], `${icon.src}: Typ`).toBe(icon.type);
      expect(`${meta.width}x${meta.height}`, `${icon.src}: Größe`).toBe(icon.sizes);
      expect(['any', 'maskable', 'monochrome', 'any maskable']).toContain(icon.purpose ?? 'any');
    }
  });

  it('apple-touch-icon (180×180) und Favicon existieren und sind verlinkt', async () => {
    const html = read(b, 'index.html');
    const apple = tags(html).find((t) => t.name === 'link' && t.attrs.rel === 'apple-touch-icon');
    expect(apple?.attrs.href).toBe(`${b.base}apple-touch-icon.png`);
    const meta = await sharp(fileOf(apple!.attrs.href!)).metadata();
    expect([meta.width, meta.height]).toEqual([180, 180]);
    expect(tags(html).some((t) => t.name === 'link' && t.attrs.rel === 'icon' && t.attrs.type === 'image/svg+xml')).toBe(true);
  });

  it('Farben stimmen mit <meta name="theme-color"> überein', () => {
    const mf = m();
    const theme = tags(read(b, 'index.html')).find((t) => t.name === 'meta' && t.attrs.name === 'theme-color')?.attrs.content;
    expect(theme?.toLowerCase()).toBe(mf.theme_color!.toLowerCase());
  });

  it('maskable-Symbol: vollflächig deckend, Inhalt in der Safe Zone (Kreis mit 40 % Durchmesser-Radius)', async () => {
    const icon = m().icons!.find((i) => i.purpose === 'maskable');
    expect(icon, 'maskable-Symbol').toBeDefined();
    expect(icon!.sizes).toBe('512x512');
    const { data, info } = await sharp(fileOf(icon!.src)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const bg = [...data.subarray(0, 3)];
    const mf = m();
    expect('#' + bg.map((v) => v.toString(16).padStart(2, '0')).join('')).toBe(mf.background_color!.toLowerCase());
    const cx = info.width / 2;
    const cy = info.height / 2;
    const safe = 0.4 * info.width;
    let maxRadius = 0;
    let transparent = 0;
    let content = 0;
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const o = (y * info.width + x) * 4;
        if (data[o + 3]! < 255) transparent += 1;
        const diff = Math.abs(data[o]! - bg[0]!) + Math.abs(data[o + 1]! - bg[1]!) + Math.abs(data[o + 2]! - bg[2]!);
        if (diff > 24) {
          content += 1;
          maxRadius = Math.max(maxRadius, Math.hypot(x + 0.5 - cx, y + 0.5 - cy));
        }
      }
    }
    expect(transparent, 'Pixel mit Transparenz (die Plattform schneidet zu, Ränder müssen gefüllt sein)').toBe(0);
    expect(content, 'Motiv vorhanden').toBeGreaterThan(1000);
    expect(maxRadius, `Motivradius ${maxRadius.toFixed(0)} px, Safe Zone ${safe} px`).toBeLessThanOrEqual(safe);
  });

  it('das "any"-Symbol mit transparenten Ecken ist nicht als maskable deklariert', () => {
    for (const i of m().icons!) {
      if (i.src.includes('maskable')) expect(i.purpose).toBe('maskable');
      else expect(i.purpose ?? 'any').toBe('any');
    }
  });
});
