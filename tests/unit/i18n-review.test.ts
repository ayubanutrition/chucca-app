/** Review-Blatt für Muttersprachler (scripts/i18n-review-core.ts, `npm run i18n:review`). */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LOCALES, dictionary } from '../../src/i18n';
import { CSV_COLUMNS, KIND_LABELS, OPEN_POINTS, collectRows, contextFor, escapeHtml, flatten, lengthHints, parseTextCheckChanges, toCsv, toHtml, type ReviewRow } from '../../scripts/i18n-review-core';

const root = resolve(import.meta.dirname, '../..');
const rows = collectRows({ root });
const ui = rows.filter((r) => r.kind === 'ui');

/** Minimaler CSV-Leser (Semikolon, Anführungszeichen, CRLF) für die Rückprobe. */
function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const body = text.replace(/^﻿/, '');
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (quoted) {
      if (c === '"' && body[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ';') {
      row.push(cell);
      cell = '';
    } else if (c === '\r' && body[i + 1] === '\n') {
      row.push(cell);
      out.push(row);
      row = [];
      cell = '';
      i++;
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    out.push(row);
  }
  return out;
}

describe('Review-Blatt: Vollständigkeit', () => {
  const reference = flatten(dictionary('de') as never);

  it('jeder Schlüssel der Oberfläche erscheint genau einmal', () => {
    const keys = ui.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect([...keys].sort()).toEqual([...reference.keys()].sort());
    expect(keys.length).toBeGreaterThan(200);
  });

  it('alle Schlüssel des Blatts sind eindeutig, auch mit Beispiel- und Bilddaten', () => {
    const keys = rows.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it.each(LOCALES)('%s: Text jedes Schlüssels stimmt mit dem Wörterbuch überein', (locale) => {
    const flat = flatten(dictionary(locale) as never);
    for (const row of ui) expect(row[locale], row.key).toBe(flat.get(row.key));
  });

  it('DE/EN/ES-Parität: kein leerer Text, gleiche Platzhalter in allen Sprachen', () => {
    const holders = (t: string): string[] => [...t.matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? '').sort();
    for (const row of rows) {
      for (const locale of LOCALES) expect(row[locale].trim(), `${row.key} ${locale}`).not.toBe('');
      expect(holders(row.en), row.key).toEqual(holders(row.de));
      expect(holders(row.es), row.key).toEqual(holders(row.de));
    }
  });

  it('Beispiel-, Konzept- und Ortsdaten sind gekennzeichnet und tragen ihre Quelldatei', () => {
    const others = rows.filter((r) => r.kind !== 'ui');
    expect(others.length).toBeGreaterThan(0);
    for (const row of others) {
      expect(row.key).toMatch(/^(menu|events|media|venue)\./);
      expect(row.file).toMatch(/^src\/content\//);
    }
    expect(others.some((r) => r.kind === 'fixture-menu')).toBe(true);
    expect(others.some((r) => r.kind === 'fixture-event')).toBe(true);
    expect(others.some((r) => r.kind === 'concept-media')).toBe(true);
    expect(rows.filter((r) => r.kind === 'ui').every((r) => r.file.startsWith('src/i18n/'))).toBe(true);
  });

  it('Bilddaten: nur alt und caption, keine Rechte- oder Quellenfelder', () => {
    for (const row of rows.filter((r) => r.key.startsWith('media.'))) expect(row.key).toMatch(/\.(alt|caption)$/);
    const text = JSON.stringify(rows);
    expect(text).not.toMatch(/source_url|rights_evidence|authorization_evidence|mallorcaguide|lumaguide/);
  });
});

describe('Review-Blatt: Kontext, Hinweise, bekannte Zweifel', () => {
  it('jeder Oberflächenschlüssel hat einen Kontext; nichts landet unter „Sonstiges“', () => {
    for (const row of ui) expect(row.context, row.key).not.toBe('Sonstiges');
    expect(contextFor('visit.inquiry.people')).toMatch(/Gruppenanfrage/);
    expect(contextFor('visit.share')).toBe('Besuch');
    expect(contextFor('unbekannt.x')).toBe('Sonstiges');
  });

  it('Längenhinweise nach Faustregel', () => {
    const t = (de: string, en = de, es = de) => ({ de, en, es });
    expect(lengthHints('meta.titles.today', t('x'.repeat(61)))).toHaveLength(1);
    expect(lengthHints('meta.titles.today', t('x'.repeat(60)))).toEqual([]);
    expect(lengthHints('meta.descriptions.visit', t('x'.repeat(156)))[0]).toMatch(/Beschreibung/);
    expect(lengthHints('nav.gallery', t('Galerie', 'Galleries!!', 'Galería'))[0]).toMatch(/Tabbar/);
    expect(lengthHints('group.share', t('Einladung teilen', 'Share invitation', 'Compartir la invitación a todos'))[0]).toMatch(/Knopf/);
    expect(lengthHints('footer.privacy', t('x'.repeat(201)))[0]).toMatch(/Langer Text/);
    expect(lengthHints('nav.visit', t('Besuch', 'Visit', 'Visita'))).toEqual([]);
    expect(lengthHints('x.kurz', t('Zwölf Zeichen', 'Zwölf Zeichen', 'x'.repeat(30)))[0]).toMatch(/ES ist 2\.3×/);
  });

  it('Hinweise erscheinen im echten Bestand nur zusammen mit konkreten Zahlen', () => {
    for (const row of rows) for (const hint of row.hints) expect(hint, row.key).toMatch(/\d/);
  });

  it('liest die Änderungstabelle aus docs/10_TEXTPRUEFUNG.md', () => {
    const changes = parseTextCheckChanges(readFileSync(join(root, 'docs/10_TEXTPRUEFUNG.md'), 'utf8'));
    expect(changes.length).toBeGreaterThan(40);
    expect(changes.some((c) => c.key === 'nav.today' && c.lang === 'EN')).toBe(true);
    const sample = parseTextCheckChanges('| EN | `a.b` | vorher | nachher | weil |\n| nur | Text |');
    expect(sample).toEqual([{ lang: 'EN', key: 'a.b', reason: 'weil' }]);
  });

  it('bekannte Zweifel hängen an den richtigen Zeilen', () => {
    const byKey = new Map(rows.map((r) => [r.key, r]));
    expect(byKey.get('nav.today')?.known.join(' ')).toMatch(/Offener Punkt 11/);
    expect(byKey.get('nav.today')?.known.join(' ')).toMatch(/KI-Änderung \(EN\)/);
    expect(byKey.get('drinks.item.priceMissing')?.known.join(' ')).toMatch(/Punkt 8/);
    expect(byKey.get('visit.hours.exceptionsTitle')?.known.join(' ')).toMatch(/Punkt 14/);
    // Spanisch „a las“ wird am Text erkannt, nicht am Schlüssel.
    const aLas = rows.filter((r) => /\ba las\b/i.test(r.es));
    const point2 = OPEN_POINTS.find((p) => p.n === 2);
    expect(point2?.match?.({ de: '', en: '', es: 'Abrimos a las 20:00' })).toBe(true);
    expect(point2?.match?.({ de: '', en: '', es: 'Abierto ahora.' })).toBe(false);
    for (const row of aLas) expect(row.known.join(' '), row.key).toMatch(/Punkt 2/);
    // Mallorquinische Begriffe in den Bildtexten.
    expect(rows.some((r) => r.key.startsWith('media.') && r.known.join(' ').includes('Punkt 10'))).toBe(true);
    // Änderungen an Beispieldaten werden über den Schlüssel ohne Sprachsuffix gefunden.
    expect(byKey.get('media.concept-highball.caption')?.known.join(' ')).toMatch(/KI-Änderung/);
  });
});

describe('Review-Blatt: Ausgabe', () => {
  const csv = toCsv(rows);
  const table = parseCsv(csv);

  it('CSV: BOM, Semikolon, CRLF, Kopfzeile mit den geforderten Spalten', () => {
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv.endsWith('\r\n')).toBe(true);
    const head = table[0] ?? [];
    expect(head).toEqual([...CSV_COLUMNS]);
    for (const name of ['Schlüssel', 'Kontext/Seite', 'DE', 'EN', 'ES', 'Freigabe (ja/nein)', 'Korrekturvorschlag', 'Kommentar']) expect(head).toContain(name);
  });

  it('CSV: eine Zeile je Text, jede Zeile gleich breit, Rückprobe stimmt', () => {
    expect(table).toHaveLength(rows.length + 1);
    for (const line of table) expect(line).toHaveLength(CSV_COLUMNS.length);
    const keys = table.slice(1).map((line) => line[0]);
    expect(new Set(keys).size).toBe(rows.length);
    table.slice(1).forEach((line, i) => {
      const row = rows[i] as ReviewRow;
      expect(line.slice(0, 5)).toEqual([row.key, row.context, row.de, row.en, row.es]);
      // Zum Ausfüllen leer:
      expect(line.slice(5, 9)).toEqual(['', '', '', '']);
      expect(line[9]).toBe(KIND_LABELS[row.kind]);
    });
  });

  it('CSV: Anführungszeichen, Semikolon und Zeilenumbruch im Text bleiben erhalten', () => {
    const tricky: ReviewRow = { key: 'k', file: 'f', kind: 'ui', context: 'c', de: 'a;b', en: 'sie sagte "hi"', es: 'zwei\nZeilen', lengths: '3/13/11', hints: [], known: [] };
    const parsed = parseCsv(toCsv([tricky]));
    expect(parsed[1]?.slice(2, 5)).toEqual(['a;b', 'sie sagte "hi"', 'zwei\nZeilen']);
  });

  it('HTML: eigenständig und offline (keine externen Adressen), maskiert Text, jede Zeile einmal', () => {
    const html = toHtml(rows, { generatedAt: '2026-11-13' });
    expect(html).toContain('<!doctype html>');
    expect(html).not.toMatch(/(?:src|href)\s*=\s*["']?(?:https?:)?\/\//i);
    expect(html).not.toMatch(/<link\b|@import|<script[^>]+src=/i);
    expect((html.match(/<tr id="/g) ?? []).length).toBe(rows.length);
    expect(html).toContain('lang="es"');
    expect(html).toContain('keine Layoutmessung');
    const evil = toHtml([{ key: 'k', file: 'f', kind: 'ui', context: 'c', de: '<img src=x onerror=alert(1)>', en: 'a & b', es: '"q"', lengths: '1/1/1', hints: [], known: [] }], { generatedAt: 'x' });
    expect(evil).not.toContain('<img src=x');
    expect(evil).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(escapeHtml(`<>&"'`)).toBe('&lt;&gt;&amp;&quot;&#39;');
  });

  it('Skript schreibt CSV und HTML in den angegebenen Ordner und nirgends sonst', () => {
    const out = mkdtempSync(join(tmpdir(), 'chucca-i18n-review-'));
    try {
      const log = execFileSync(process.execPath, [join(root, 'scripts/i18n-review-sheet.mjs'), '--out', out], { cwd: root, encoding: 'utf8' });
      expect(log).toContain(`${rows.length} Texte`);
      expect(readFileSync(join(out, 'i18n-review.csv'), 'utf8')).toBe(csv);
      expect(readFileSync(join(out, 'i18n-review.html'), 'utf8')).toContain('<tr id="nav.today"');
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  }, 60_000);

  it('Ausgabeordner ist gitignored und liegt außerhalb der Build-Verzeichnisse', () => {
    expect(readFileSync(join(root, '.gitignore'), 'utf8')).toMatch(/^reports\/$/m);
    expect(existsSync(join(root, 'public/i18n-review.csv'))).toBe(false);
    const script = readFileSync(join(root, 'scripts/i18n-review-sheet.mjs'), 'utf8');
    expect(script).toContain("'reports/i18n-review'");
    expect(script).not.toMatch(/dist/);
  });
});
