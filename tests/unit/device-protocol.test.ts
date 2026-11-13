/** Geräte-Prüfprotokoll (docs/14_GERAETETEST.md) und CSV-Vorlage (docs/templates/geraetetest-ergebnis.csv): Konsistenz, ehrliche Vorbelegung, Beschriftungen aus den i18n-Dateien. */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LOCALES, LOCALE_NAMES, dictionary } from '../../src/i18n';
import { flatten } from '../../scripts/i18n-review-core';
import { parseCsv } from './csv-helper';

const root = resolve(import.meta.dirname, '../..');
const read = (file: string): string => readFileSync(join(root, file), 'utf8');
const md = read('docs/14_GERAETETEST.md');
const csvText = read('docs/templates/geraetetest-ergebnis.csv');

const table = parseCsv(csvText);
const [head = [], ...rows] = table;
const col = (name: string): number => head.indexOf(name);

/** Abschnitt zwischen zwei Überschriften. */
function section(from: string, to: string): string {
  const start = md.indexOf(`\n${from}`);
  const end = md.indexOf(`\n${to}`);
  expect(start, from).toBeGreaterThan(-1);
  expect(end, to).toBeGreaterThan(start);
  return md.slice(start, end);
}

const catalogue = section('## Schritte und erwartete Ergebnisse', '## Ankreuzlisten je Gerät');
const checklists = section('## Ankreuzlisten je Gerät', '## Wie melde ich einen Fund?');
const stepIds = [...catalogue.matchAll(/^\| ([A-J]\d\d)(?: \(optional\))? \| /gm)].map((m) => m[1] ?? '');
const checkRows = [...checklists.matchAll(/^\| (G\d-[A-J]\d\d) \| (.+?) \| \[( |x)\] \| \[( |x)\] \| \[( |x)\] \|/gm)];

describe('Geräte-Prüfprotokoll: Aufbau', () => {
  it('nennt die Pflichtgeräte und optionalen Geräte der Aufgabe', () => {
    for (const text of ['iPhone, Safari', 'Standalone', 'Instagram', 'WhatsApp', 'Android, Chrome', 'Samsung Internet', 'Firefox']) expect(md, text).toContain(text);
  });

  it('behandelt alle geforderten Themen', () => {
    for (const topic of ['Installation', 'Sprache wechseln', 'Sonnenstand', 'Suche', 'Google Maps', 'Apple Karten', 'Adresse kopieren', 'Teilen', 'ICS-Import', 'Plan per Link', 'Lightbox', 'Safe Area', 'Tastatur', 'Offline', 'Update-Hinweis', 'Dunkel', 'Bewegung reduzieren', 'Textgröße']) {
      expect(md.toLowerCase(), topic).toContain(topic.toLowerCase());
    }
  });

  it('Schrittnummern sind eindeutig und lückenlos je Bereich', () => {
    expect(new Set(stepIds).size).toBe(stepIds.length);
    expect(stepIds.length).toBeGreaterThan(40);
    for (const area of 'ABCDEFGHIJ') {
      const nums = stepIds.filter((id) => id.startsWith(area)).map((id) => Number(id.slice(1)));
      expect(nums.length, area).toBeGreaterThan(0);
      expect(nums, area).toEqual(nums.map((_, i) => i + 1));
    }
  });

  it('jede Ankreuzzeile verweist auf einen Schritt des Katalogs, ohne Doppelungen', () => {
    const keys = checkRows.map((m) => m[1] ?? '');
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) expect(stepIds, key).toContain(key.split('-')[1]);
    // jeder Katalogschritt gilt für mindestens ein Gerät
    for (const id of stepIds) expect(keys.some((k) => k.endsWith(`-${id}`)), id).toBe(true);
  });

  it('Vorbelegung ist ehrlich: nichts ist als PASS oder FAIL angekreuzt', () => {
    expect(checkRows.length).toBeGreaterThan(200);
    for (const m of checkRows) expect([m[3], m[4], m[5]], m[1]).toEqual([' ', ' ', 'x']);
    expect(md).toContain('Paket vorbereitet, nichts ausgeführt');
    expect(md).not.toMatch(/\bgeprüft am\b|bestanden/i);
  });

  it('enthält den Abschnitt „Wie melde ich einen Fund?“ mit Gerät, Version, Schritt, Screenshot', () => {
    const found = md.slice(md.indexOf('## Wie melde ich einen Fund?'));
    for (const word of ['Gerät', 'Betriebssystem', 'Version', 'Schritt', 'Screenshot']) expect(found, word).toContain(word);
  });

  it('Vorschau-Adresse ist ein Platzhalter, keine erfundene URL', () => {
    expect(md).toContain('`<VORSCHAU-URL>`');
    expect(md).not.toMatch(/https?:\/\/(?!127\.0\.0\.1|localhost)/);
  });
});

describe('Geräte-Prüfprotokoll: CSV-Vorlage', () => {
  it('UTF-8 mit BOM, Semikolon, CRLF, feste Kopfzeile', () => {
    expect(csvText.startsWith('﻿')).toBe(true);
    expect(csvText.endsWith('\r\n')).toBe(true);
    expect(head).toEqual(['Kennung', 'Geraet', 'Pflicht', 'Bereich', 'Schritt', 'Ergebnis', 'Notiz', 'Screenshot', 'Modell', 'OS_Version', 'Browser_Version', 'Systemsprache', 'Buildtyp', 'Adresse_Build', 'Pruefperson', 'Datum']);
    for (const row of rows) expect(row, row[0]).toHaveLength(head.length);
  });

  it('eine Zeile je Gerät und Schritt, deckungsgleich mit den Ankreuzlisten', () => {
    const csvKeys = rows.map((r) => r[col('Kennung')] ?? '');
    expect(new Set(csvKeys).size).toBe(csvKeys.length);
    expect([...csvKeys].sort()).toEqual(checkRows.map((m) => m[1] ?? '').sort());
    for (const key of csvKeys) expect(key).toMatch(/^G[1-7]-[A-J]\d\d$/);
  });

  it('alle Ergebnisse stehen auf NOT RUN, der Rest ist leer', () => {
    for (const row of rows) {
      expect(row[col('Ergebnis')], row[0]).toBe('NOT RUN');
      for (const name of ['Notiz', 'Screenshot', 'Modell', 'OS_Version', 'Browser_Version', 'Systemsprache', 'Buildtyp', 'Adresse_Build', 'Pruefperson', 'Datum']) expect(row[col(name)], `${row[0]} ${name}`).toBe('');
    }
  });

  it('Pflichtgeräte G1 bis G5 sind als Pflicht gekennzeichnet, G6 und G7 optional', () => {
    for (const row of rows) {
      const device = (row[col('Kennung')] ?? '').slice(0, 2);
      const pflicht = row[col('Pflicht')];
      if (device === 'G6' || device === 'G7') expect(pflicht, row[0]).toBe('optional');
      else expect(['ja', 'optional'], row[0]).toContain(pflicht);
    }
    for (const device of ['G1', 'G2', 'G3', 'G4', 'G5']) expect(rows.some((r) => r[col('Kennung')]?.startsWith(device) && r[col('Pflicht')] === 'ja'), device).toBe(true);
  });
});

describe('Geräte-Prüfprotokoll: Beschriftungen stimmen mit der App überein', () => {
  const values: string[] = [];
  for (const locale of LOCALES) values.push(...flatten(dictionary(locale) as never).values());
  values.push(...Object.values(LOCALE_NAMES));
  for (const locale of LOCALES) values.push(`${dictionary(locale).nav.today} →`);
  // Texte, die nicht im Wörterbuch stehen: Offline-Seite des Service Workers.
  values.push(read('src/lib/sw-template.ts'));

  const escapeRe = (t: string): string => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const placeholderRe = (value: string): RegExp => new RegExp(`^${escapeRe(value).replace(/\\\{\w+\\\}/g, '.+')}$`);

  /** Findet ein in „…“ zitiertes Stück in den App-Texten. `…` und `{x}` im Zitat stehen für beliebigen Text. */
  function appears(quoted: string): boolean {
    const wild = /…|\{[^}]*\}/.test(quoted);
    if (wild) {
      const parts = quoted.split(/\s*(?:…|\{[^}]*\})\s*/).filter(Boolean);
      return values.some((value) => {
        let from = 0;
        for (const part of parts) {
          const at = value.indexOf(part, from);
          if (at < 0) return false;
          from = at + part.length;
        }
        return true;
      });
    }
    return values.some((value) => value === quoted || placeholderRe(value).test(quoted) || ((quoted.length >= 8 || value.length >= 40) && value.includes(quoted)));
  }

  const quotes = [...catalogue.matchAll(/„([^“]+)“/g)].map((m) => m[1] ?? '');

  it('im Katalog stehen zitierte App-Texte', () => {
    expect(quotes.length).toBeGreaterThan(100);
  });

  it('jeder in „…“ zitierte Text kommt in den i18n-Dateien, den Sprachnamen oder dem Service Worker vor', () => {
    const missing = [...new Set(quotes)].filter((q) => !appears(q));
    expect(missing).toEqual([]);
  });

  it('die Prüffunktion erkennt Fehler (falsch geschriebene Beschriftung fällt auf)', () => {
    expect(appears('Treffpunkt teilen')).toBe(true);
    expect(appears('Treffpunkt teilne')).toBe(false);
    expect(appears('Bild 3 von 9')).toBe(true);
    expect(appears('Ihr trefft euch am … um … Uhr.')).toBe(true);
    expect(appears('Ihr trefft euch um … am … Uhr.')).toBe(false);
  });
});

describe('Verknüpfung der Prüfpakete', () => {
  it('README, Plan und QA verlinken die neuen Dateien', () => {
    const readme = read('README.md');
    const plan = read('docs/05_PLAN.md');
    for (const file of ['docs/14_GERAETETEST.md', 'docs/15_TEXTREVIEW.md', 'docs/templates/geraetetest-ergebnis.csv']) expect(readme, file).toContain(file);
    expect(plan).toContain('docs/14_GERAETETEST.md');
    expect(plan).toContain('docs/15_TEXTREVIEW.md');
    expect(read('docs/06_QA.md')).toContain('docs/14_GERAETETEST.md');
  });

  it('Aufgaben 14 und 17 bleiben BLOCKED und sind als „Paket vorbereitet“ gekennzeichnet', () => {
    for (const id of ['14', '17']) {
      const line = read('docs/05_PLAN.md')
        .split('\n')
        .find((l) => l.startsWith(`| ${id} |`));
      expect(line, id).toBeDefined();
      expect(line, id).toMatch(/BLOCKED/);
      expect(line, id).toMatch(/Paket vorbereitet/);
      expect(line, id).not.toMatch(/\| DONE/);
    }
  });
});
