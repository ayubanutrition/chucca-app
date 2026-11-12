import { describe, expect, it } from 'vitest';
import { buildQrLink, drinksDeepLink, QrLinkError, renderQrSvg } from '../../scripts/qr-link-core';
import { pagePath, SLUGS } from '../../src/i18n';

describe('QR-Deep-Link', () => {
  it('führt je Sprache auf die lokalisierte Drinks-Route', () => {
    expect(drinksDeepLink('https://chucca.example', 'de')).toBe('https://chucca.example/de/drinks/');
    expect(drinksDeepLink('https://chucca.example/', 'en')).toBe('https://chucca.example/en/drinks/');
    expect(drinksDeepLink('https://chucca.example', 'es')).toBe('https://chucca.example/es/bebidas/');
  });

  it('liest die Route aus der Routentabelle und kennt den Unterpfad', () => {
    for (const locale of ['de', 'en', 'es'] as const) {
      expect(drinksDeepLink('https://h.example', locale)).toBe(`https://h.example${pagePath(locale, 'drinks')}`);
      expect(SLUGS[locale].drinks).not.toBe('');
    }
    expect(drinksDeepLink('https://h.example/preview/app/?x=1#y', 'es')).toBe('https://h.example/preview/app/es/bebidas/');
  });

  it('weist ungültige Eingaben mit klarer Meldung ab', () => {
    expect(() => drinksDeepLink('chucca', 'de')).toThrow(QrLinkError);
    expect(() => drinksDeepLink('chucca', 'de')).toThrow(/keine gültige URL/);
    expect(() => drinksDeepLink('http://chucca.example', 'de')).toThrow(/https/);
    expect(() => drinksDeepLink('https://u:p@chucca.example', 'de')).toThrow(/Zugangsdaten/);
    expect(() => drinksDeepLink('https://chucca.example', 'fr')).toThrow(/Unbekannte Sprache/);
    expect(() => drinksDeepLink('https://chucca.example/?utm_source=qr', 'de')).toThrow(/UTM/);
    expect(() => buildQrLink('https://chucca.example', 'de', 'kurz')).toThrow(/Kurz-URL/);
    expect(() => buildQrLink('https://chucca.example', 'de', 'https://k.example/x?utm_medium=a')).toThrow(/UTM/);
  });

  it('kodiert die Kurz-URL, wenn angegeben, sonst den Deep-Link', () => {
    expect(buildQrLink('https://chucca.example', 'en').encoded).toBe('https://chucca.example/en/drinks/');
    const short = buildQrLink('https://chucca.example', 'en', 'https://k.example/d');
    expect(short.encoded).toBe('https://k.example/d');
    expect(short.deepLink).toBe('https://chucca.example/en/drinks/');
  });

  it('erzeugt ein SVG ohne externe Referenzen und ohne Skripte', () => {
    const { svg } = buildQrLink('https://chucca.example', 'de');
    expect(svg.startsWith('<svg ')).toBe(true);
    expect(svg).toContain('viewBox="0 0 ');
    expect(svg).not.toMatch(/<(script|image|use|style|foreignObject|a)[\s>]/i);
    expect(svg).not.toMatch(/xlink|href=|url\(|@import|data:|javascript:/i);
    const urls = [...svg.matchAll(/https?:\/\/[^"'<\s]+/g)].map((m) => m[0]);
    expect(urls.filter((u) => u !== 'http://www.w3.org/2000/svg' && !u.startsWith('https://chucca.example'))).toEqual([]);
  });

  it('maskiert Sonderzeichen im Titel und lässt eine Ruhezone', () => {
    const svg = renderQrSvg('https://chucca.example/a?b=1&c="2"', { title: 'a<b&"c' });
    expect(svg).toContain('a&lt;b&amp;&quot;c');
    expect(svg).not.toContain('a<b');
    const first = /<path d="M(\d+) (\d+)/.exec(svg);
    expect(first).not.toBeNull();
    expect(Number(first![1])).toBeGreaterThanOrEqual(4);
    expect(Number(first![2])).toBeGreaterThanOrEqual(4);
  });
});
