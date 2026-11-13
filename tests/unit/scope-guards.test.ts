import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Wächter für Verbote des Auftrags, die sich statisch prüfen lassen (Zuordnung: `docs/16_ANFORDERUNGEN.md`).
 * Sie ersetzen keine Sichtprüfung; sie verhindern, dass ein späterer Eingriff ein Verbot still bricht.
 */
const ROOT = new URL('../..', import.meta.url).pathname;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}
const TEXT = /\.(?:ts|astro|css|json|mjs)$/;
const sources = walk(join(ROOT, 'src')).filter((f) => TEXT.test(f));
const read = (file: string): string => readFileSync(file, 'utf8');
const rel = (file: string): string => relative(ROOT, file);

describe('Umfang: nur CHUCCA Playa de Palma', () => {
  it('kein Inhalt aus Hamburg oder Cala Ratjada im Quellbestand', () => {
    const hits = sources.filter((f) => /Hamburg|Anleger\s?15|Cala[\s-]?Ratjada/i.test(read(f))).map(rel);
    expect(hits).toEqual([]);
  });
});

describe('Bildregel: keine V3-Mockups', () => {
  it('atmosphere/drink-Mockups sind weder versioniert noch verlinkt', () => {
    const tracked = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' }).split('\n');
    expect(tracked.filter((f) => /(?:^|\/)(?:atmosphere|drink)\.(?:webp|png)$/.test(f))).toEqual([]);
    expect(sources.filter((f) => /atmosphere\.(?:webp|png)|drink\.(?:webp|png)/.test(read(f))).map(rel)).toEqual([]);
  });
});

describe('Design: höchstens zwei Schriftfamilien, keine Daueranimation, keine Scrollsperre', () => {
  const css = sources.filter((f) => f.endsWith('.css'));
  it('genau zwei Webschriftfamilien (die Notschriften heißen „… Fallback“)', () => {
    const families = new Set<string>();
    for (const file of css) for (const m of read(file).matchAll(/@font-face\s*\{[^}]*font-family:\s*'([^']+)'/g)) if (!/Fallback$/.test(m[1] ?? '')) families.add(m[1] ?? '');
    expect([...families].sort()).toEqual(['Fraunces Variable', 'Instrument Sans Variable']);
  });
  it('Schriftfamilien kommen nur über die zwei Tokens in die Oberfläche', () => {
    const literal = sources
      .filter((f) => /\.(?:css|astro)$/.test(f) && !f.endsWith('fonts.css'))
      .flatMap((f) => [...read(f).matchAll(/font-family:\s*([^;}"]+)/g)].map((m) => `${rel(f)}: ${(m[1] ?? '').trim()}`))
      .filter((line) => !/var\(--font-(?:display|text)\)|inherit|monospace$/.test(line.split(': ').slice(1).join(': ')) && !line.includes('--font-'));
    // Die Token-Definition selbst steht in global.css (`--font-display:` / `--font-text:`), nicht als font-family.
    expect(literal).toEqual([]);
  });
  it('keine endlose Animation', () => {
    expect(css.filter((f) => /animation[^;{}]*\binfinite\b/.test(read(f))).map(rel)).toEqual([]);
  });
  it('html und body werden nie auf overflow: hidden gesetzt (keine Scrollsperre)', () => {
    const offenders = css.filter((f) => /(?:^|[}\s,])(?:html|body)\b[^{}]*\{[^}]*overflow(?:-y)?\s*:\s*hidden/.test(read(f)));
    expect(offenders.map(rel)).toEqual([]);
  });
});

describe('Abhängigkeiten und Gastzugang', () => {
  it('Laufzeitabhängigkeiten: nur Astro und Zod, ein Lockfile', () => {
    const pkg = JSON.parse(read(join(ROOT, 'package.json'))) as { dependencies: Record<string, string> };
    expect(Object.keys(pkg.dependencies).sort()).toEqual(['astro', 'zod']);
    const locks = readdirSync(ROOT).filter((f) => /^(?:package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?)$/.test(f));
    expect(locks).toEqual(['package-lock.json']);
  });
  it('kein Gastkonto, kein Passwortfeld, kein Tracking im Quellbestand', () => {
    const views = sources.filter((f) => /\.(?:astro|ts)$/.test(f) && !f.includes('/content/'));
    expect(views.filter((f) => /type=["']password["']|autocomplete=["'](?:username|current-password|new-password)["']/.test(read(f))).map(rel)).toEqual([]);
    expect(views.filter((f) => /googletagmanager|google-analytics|gtag\(|fbq\(|plausible|matomo|hotjar|segment\.com/i.test(read(f))).map(rel)).toEqual([]);
  });
});

describe('Pflichtdokumente (kein leeres Platzhalter-Dossier)', () => {
  const required = ['AGENTS.md', 'CLAUDE.md', 'README.md', ...['00_STATE', '01_PRODUCT', '02_DESIGN', '03_ARCHITECTURE', '04_CONTENT_MEDIA', '05_PLAN', '06_QA', '07_DECISIONS', '08_HANDOFF', '09_RESEARCH', '16_ANFORDERUNGEN'].map((n) => `docs/${n}.md`)];
  it.each(required)('%s existiert, hat eine Überschrift und echten Inhalt', (file) => {
    const text = read(join(ROOT, file));
    expect(text.trim().length, file).toBeGreaterThan(250);
    expect(text, file).toMatch(/^# /m);
  });
  it('README und Plan verlinken die Anforderungs-Rückverfolgung', () => {
    for (const file of ['README.md', 'docs/05_PLAN.md', 'docs/08_HANDOFF.md']) expect(read(join(ROOT, file)), file).toContain('16_ANFORDERUNGEN.md');
  });
});
