import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

/** Der Doc-Check (`scripts/docs-check.mjs`) muss tote Pfade, Skripte, Variablen und Abschnittsverweise melden und Gültiges durchlassen. */
const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function run(readme: string): { code: number; out: string } {
  const root = mkdtempSync(join(tmpdir(), 'docs-check-'));
  dirs.push(root);
  mkdirSync(join(root, 'docs'));
  mkdirSync(join(root, 'src'));
  writeFileSync(join(root, 'package.json'), JSON.stringify({ scripts: { check: 'x', test: 'x' } }));
  writeFileSync(join(root, 'src', 'real.ts'), 'export const a = process.env.CHUCCA_REAL;\n');
  writeFileSync(join(root, 'docs', '00_A.md'), '# A\n\n## Pflege\n');
  writeFileSync(join(root, 'README.md'), readme);
  try {
    const out = execFileSync('node', ['scripts/docs-check.mjs', '--root', root], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { code: 0, out };
  } catch (error) {
    const e = error as { status?: number; stderr?: string };
    return { code: e.status ?? 2, out: e.stderr ?? '' };
  }
}

describe('Doc-Check', () => {
  it('lässt vorhandene Pfade, Skripte, Variablen und Überschriften durch', () => {
    const result = run('`src/real.ts`, `docs/00_A.md`, Abschnitt: `docs/00_A.md`, Abschnitt „Pflege“.\n\n`npm run check` und `npm test`, `CHUCCA_REAL=1`, `*.ts`, `dist/`, `https://x.example/a.ts`.\n');
    expect(result.out).toContain('keine toten');
    expect(result.code).toBe(0);
  });

  it('meldet tote Pfade, fehlende Dateien, Skripte, Variablen, Überschriften und Links', () => {
    const result = run('`src/gone.ts` und `nirgends.mjs`.\n\n`npm run fehlt`, `CHUCCA_NOPE`, `docs/00_A.md`, Abschnitt „Weg“.\n\n[Link](docs/zzz.md)\n');
    expect(result.code).toBe(1);
    for (const needle of ['src/gone.ts', 'nirgends.mjs', 'npm-Skript „fehlt“', 'CHUCCA_NOPE', '„Weg“', 'docs/zzz.md']) expect(result.out).toContain(needle);
  });
});
