/** Tabellen-Import der Getränkekarte (src/lib/content/csv.ts). */
import { describe, expect, it } from 'vitest';
import { detectDelimiter, formatIssue, menuFromCsv, parseCsv, parsePriceCents, slugify } from '../../src/lib/content/csv';
import { menuSchema } from '../../src/lib/content/schema';

const HEAD = 'Kategorie;Name DE;Name EN;Name ES;Zutaten;Zutaten EN;Zutaten ES;Größe;Preis €;alkoholfrei;Allergene;verfügbar';
const MOJITO = 'Klassiker;Mojito;Mojito;Mojito;weißer Rum, Minze;white rum, mint;ron blanco, menta;;9,50;nein;;ja';
const run = (...lines: string[]) => menuFromCsv(lines.join('\r\n'), { today: '2026-11-12' });

describe('CSV lesen', () => {
  it('erkennt Semikolon, Komma und Tab', () => {
    expect(detectDelimiter('a;b;c')).toBe(';');
    expect(detectDelimiter('a,b,c')).toBe(',');
    expect(detectDelimiter('a\tb\tc')).toBe('\t');
    expect(detectDelimiter('"a,b";c;d')).toBe(';');
  });
  it('liest Anführungszeichen, Trennzeichen und Zeilenumbrüche in Feldern', () => {
    const rows = parseCsv('a;b\r\n"x;y";"sie sagte ""hi"""\r\n"zwei\nZeilen";z\r\nletzte;Zeile');
    expect(rows.map((r) => r.cells)).toEqual([['a', 'b'], ['x;y', 'sie sagte "hi"'], ['zwei\nZeilen', 'z'], ['letzte', 'Zeile']]);
    expect(rows.map((r) => r.line)).toEqual([1, 2, 3, 5]);
  });
  it('entfernt das BOM aus Excel-Exporten', () => {
    expect(parseCsv('﻿Kategorie;Name')[0]?.cells[0]).toBe('Kategorie');
  });
  it('liest Preise mit Dezimalkomma und Punkt', () => {
    expect(parsePriceCents('9,50')).toEqual({ cents: 950 });
    expect(parsePriceCents('9.5 €')).toEqual({ cents: 950 });
    expect(parsePriceCents('€ 12')).toEqual({ cents: 1200 });
    expect(parsePriceCents('')).toEqual({ cents: null });
    expect(parsePriceCents('neun')).toHaveProperty('error');
    expect(parsePriceCents('0')).toHaveProperty('error');
  });
  it('bildet Kennungen ohne Umlaute und Sonderzeichen', () => {
    expect(slugify('Piña Colada & Co.')).toBe('pina-colada-co');
    expect(slugify('Weißer Spritz')).toBe('weisser-spritz');
  });
});

describe('Karte aus Tabelle', () => {
  it('wandelt eine gültige Tabelle (BOM, Umlaute, Dezimalkomma) in eine schemagültige Karte um', () => {
    const r = menuFromCsv(`﻿${HEAD}\r\n${MOJITO}\r\nAlkoholfrei;Beeren-Spritz;Berry spritz;Spritz de bayas;Beeren;berries;bayas;;7,00;ja;;ja`, { today: '2026-11-12' });
    expect(r.errors).toEqual([]);
    expect(menuSchema.safeParse(r.menu).success).toBe(true);
    expect(r.menu?.updatedAt).toBe('2026-11-12');
    expect(r.menu?.items[0]).toMatchObject({ id: 'mojito', prices: [{ amountCents: 950, currency: 'EUR' }], alcoholFree: false });
    expect(r.menu?.items[0]?.ingredients[0]).toEqual({ de: 'weißer Rum', en: 'white rum', es: 'ron blanco' });
    expect(r.menu?.items[1]).toMatchObject({ id: 'beeren-spritz', alcoholFree: true, tastes: ['free'] });
    expect(r.menu?.categories.map((c) => c.id)).toEqual(['classics', 'free']);
  });
  it('arbeitet auch mit Komma-Trennung und Preis in Anführungszeichen', () => {
    const csv = HEAD.replaceAll(';', ',') + '\n' + 'Klassiker,Mojito,Mojito,Mojito,"Rum, Minze","rum, mint","ron, menta",,"9,50",nein,,ja';
    const r = menuFromCsv(csv, { today: '2026-11-12' });
    expect(r.errors).toEqual([]);
    expect(r.menu?.items[0]?.prices[0]?.amountCents).toBe(950);
    expect(r.menu?.items[0]?.ingredients).toHaveLength(2);
  });
  it('erlaubt Anführungszeichen und Semikolon im Namen', () => {
    const r = run(HEAD, 'Klassiker;"Gin; ""Special"" Tonic";"Gin; ""Special"" Tonic";"Gin; ""Special"" Tonic";Gin;gin;ginebra;;10;nein;;ja');
    expect(r.errors).toEqual([]);
    expect(r.menu?.items[0]?.name.de).toBe('Gin; "Special" Tonic');
  });
  it('fasst mehrere Größen desselben Drinks zusammen', () => {
    const r = run(HEAD, 'Spritz & Longdrinks;Gin Tonic;Gin Tonic;Gin Tonic;Gin;gin;ginebra;0,3 l;10,00;nein;;ja', 'Spritz & Longdrinks;Gin Tonic;;;;;;0,5 l;13,00;nein;;ja');
    expect(r.errors).toEqual([]);
    expect(r.menu?.items).toHaveLength(1);
    expect(r.menu?.items[0]?.prices).toEqual([
      { amountCents: 1000, currency: 'EUR', size: '0,3 l' },
      { amountCents: 1300, currency: 'EUR', size: '0,5 l' },
    ]);
  });
  it('meldet fehlende Übersetzung mit Zeile und Spalte', () => {
    const r = run(HEAD, MOJITO, 'Klassiker;Negroni;;Negroni;Gin;gin;ginebra;;12;nein;;ja');
    expect(r.menu).toBeNull();
    expect(r.errors).toContainEqual(expect.objectContaining({ line: 3, column: 'Name EN' }));
    expect(formatIssue(r.errors[0]!)).toMatch(/^Zeile 3, Spalte „Name EN“: Übersetzung fehlt/);
  });
  it('meldet fehlende Zutaten-Übersetzung und ungleiche Anzahl', () => {
    const r = run(HEAD, 'Klassiker;Mojito;Mojito;Mojito;Rum, Minze;;;;9;nein;;ja', 'Klassiker;Negroni;Negroni;Negroni;Gin, Campari;gin;ginebra, campari;;9;nein;;ja');
    expect(r.errors).toContainEqual(expect.objectContaining({ line: 2, column: 'Zutaten EN' }));
    expect(r.errors).toContainEqual(expect.objectContaining({ line: 3, column: 'Zutaten EN' }));
  });
  it('meldet doppelte IDs und doppelte Größen', () => {
    const dup = run(HEAD, MOJITO, 'Alkoholfrei;Mojito;Mojito;Mojito;Minze;mint;menta;;7;ja;;ja');
    expect(dup.errors[0]).toMatchObject({ line: 3, column: 'Name DE' });
    expect(dup.errors[0]?.message).toMatch(/Doppelte ID „mojito“/);
    const twice = run(HEAD, MOJITO, MOJITO);
    expect(twice.errors[0]).toMatchObject({ line: 3, column: 'Größe' });
  });
  it('meldet unbekannte Kategorien mit Liste der erlaubten', () => {
    const r = run(HEAD, 'Shots;Tequila;Tequila;Tequila;Tequila;tequila;tequila;;4;nein;;ja');
    expect(r.errors[0]).toMatchObject({ line: 2, column: 'Kategorie' });
    expect(r.errors[0]?.message).toContain('Klassiker');
  });
  it('lehnt unklare Ja/Nein-Werte und unlesbare Preise ab, leere Preise nur mit Hinweis', () => {
    const bad = run(HEAD, 'Klassiker;Mojito;Mojito;Mojito;Rum;rum;ron;;neun;vielleicht;;ja');
    expect(bad.errors.map((e) => e.column)).toEqual(['Preis €', 'alkoholfrei']);
    const noPrice = run(HEAD, 'Klassiker;Mojito;Mojito;Mojito;Rum;rum;ron;;;nein;;ja');
    expect(noPrice.errors).toEqual([]);
    expect(noPrice.warnings.some((w) => w.column === 'Preis €')).toBe(true);
  });
  it('verweigert Beispielzeilen und fehlende Spalten, weist auf Allergene hin', () => {
    expect(run(HEAD, MOJITO.replace('Mojito;Mojito;Mojito', 'BEISPIEL Mojito;BEISPIEL Mojito;BEISPIEL Mojito')).errors[0]?.message).toMatch(/BEISPIEL/);
    expect(menuFromCsv('Kategorie;Name DE\nKlassiker;X', { today: '2026-11-12' }).errors.map((e) => e.column)).toContain('Preis €');
    expect(run(HEAD, MOJITO.replace(';;ja', ';Sulfite;ja')).warnings.some((w) => w.column === 'Allergene')).toBe(true);
  });
  it('ignoriert leere Zeilen und #-Kommentare', () => {
    const r = run(HEAD, '# Hinweis', ';;;;;;;;;;;', MOJITO);
    expect(r.errors).toEqual([]);
    expect(r.menu?.items).toHaveLength(1);
  });
});
