// Doc-Check: meldet tote Verweise in den Dokumenten (README.md, AGENTS.md, CLAUDE.md, docs/*.md).
// Geprüft wird nur, was sich eindeutig prüfen lässt:
//   1. Pfade in Backticks, Codeblöcken und Markdown-Links, die auf eine Datei oder einen Ordner im Repo zeigen sollen
//   2. `npm run <skript>` / `npm test`: das Skript muss in package.json stehen
//   3. Umgebungsvariablen CHUCCA_*, PORT_BASE, CROSS_BROWSER: muss in Code, Tests oder Konfiguration vorkommen
//   4. Abschnittsverweise der Form `docs/NN_X.md`, Abschnitt „Titel“: die Überschrift muss existieren
// Testzahlen, Zeiten und Versionsangaben werden bewusst NICHT geprüft (fehleranfällig, siehe docs/06_QA.md).
// Aufruf: node scripts/docs-check.mjs [--root <Ordner>]   (Exit 1 bei Funden; --root nur für den Test mit Beispielordner)
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join, posix, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Namen, die erst der Build erzeugt oder die nur als frühere/fremde Dateien genannt werden. */
const NOT_IN_REPO = new Set([
  '_headers', 'sw.js', 'sitemap.xml', 'robots.txt', '404.html', 'gallery.html', 'index.html', 'manifest.webmanifest', 'mutation.json',
  // V3-Altstand, im Repo nicht enthalten (docs/00_STATE.md, docs/02_DESIGN.md)
  'planner.js', 'atmosphere.webp', 'drink.webp', 'media_library.py',
  // fremde Dateien, die der Text nur beschreibt
  // Dateien aus fremden Repositories oder vom Betrieb gelieferte Beispielnamen (docs/09_RESEARCH.md, README.md)
  'ical.js', 'generate-sitemap.ts', 'fold-line.js', 'tools.ts', 'vercel.json', 'karte.csv', 'datei.csv', 'parvus.js',
]);
const TOP = /^(?:\.github|\.nvmrc|src|docs|tests|scripts|integrations|public)(?:\/|$)/;
const FILE_EXT = /^\w[\w.-]*\.(?:md|ts|mjs|json|astro|yml|yaml|css|py|csv|js|webp|svg|png|jpg)$/;
const SKIP_DIRS = new Set(['node_modules', '.git', '.astro', 'dist', 'dist-public', 'dist-sub', 'dist-hours', 'dist-update', 'test-results']);
const ENV_VAR = /\b(?:CHUCCA_[A-Z0-9_]+|PORT_BASE|CROSS_BROWSER)\b/g;

/** @param {string} root @returns {string[]} alle Dateien (Pfade relativ, mit /) */
function walk(root, dir = root, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(root, full, out);
    else out.push(relative(root, full).split(sep).join('/'));
  }
  return out;
}

/** Zerlegt ein Wort aus dem Text in einen prüfbaren Repo-Pfad oder `null`. */
function toPathCandidate(raw) {
  let t = raw.replace(/^[("'„“]+|[)"'“”.,;:]+$/g, '');
  if (!t || /[<>*{}$|=\s…]|:\/\//.test(t) || /^(?:dist|\/|~|#|\.\.)/.test(t)) return null;
  t = t.replace(/#.*$/, '').replace(/:\d+(?::\d+)?$/, '');
  if (!t) return null;
  if (t.includes('/')) return TOP.test(t) ? t : null;
  return t === '.nvmrc' || FILE_EXT.test(t) ? t : null;
}

/** Überschriften einer Markdown-Datei (ohne #). */
function headings(text) {
  return [...text.matchAll(/^#{1,6}\s+(.+?)\s*$/gm)].map((m) => m[1].replace(/`/g, ''));
}

/**
 * @param {{ root: string, docs?: string[] }} options
 * @returns {string[]} Fundstellen als „datei:zeile: Meldung“
 */
export function checkDocs({ root, docs }) {
  const files = walk(root);
  const fileSet = new Set(files);
  const baseNames = new Set(files.map((f) => basename(f)));
  const docFiles = docs ?? files.filter((f) => /^(?:README|AGENTS|CLAUDE)\.md$|^docs\/[^/]+\.md$/.test(f));
  const scripts = new Set(Object.keys(JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).scripts ?? {}));
  const sourceText = files
    .filter((f) => !/^docs\//.test(f) && !/\.(?:md|webp|png|jpg|svg|woff2|avif)$/.test(f) && f !== 'package-lock.json' && f !== 'tests/unit/docs-check.test.ts')
    .map((f) => readFileSync(join(root, f), 'utf8'))
    .join('\n');
  const problems = [];

  for (const doc of docFiles) {
    const text = readFileSync(join(root, doc), 'utf8');
    const lines = text.split('\n');
    const seen = new Set();
    const report = (line, message) => {
      const key = `${line}|${message}`;
      if (!seen.has(key)) {
        seen.add(key);
        problems.push(`${doc}:${line}: ${message}`);
      }
    };

    lines.forEach((line, index) => {
      const no = index + 1;

      // npm-Skripte (überall im Text, auch ohne Backticks)
      for (const m of line.matchAll(/\bnpm run ([A-Za-z0-9:_.-]+)/g)) {
        if (!scripts.has(m[1])) report(no, `npm-Skript „${m[1]}“ steht nicht in package.json`);
      }
      if (/\bnpm (?:test|t)\b/.test(line) && !scripts.has('test')) report(no, 'npm test: kein Skript „test“');

      // Umgebungsvariablen
      for (const m of line.matchAll(ENV_VAR)) {
        if (!sourceText.includes(m[0])) report(no, `Variable ${m[0]} kommt in keinem Code, Test oder Skript vor`);
      }

      // Pfade: Backticks und Codeblock-Zeilen; ganze Spannen und ihre Wörter
      const spans = [...line.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
      const fenced = /^\s{0,3}(?:```|~~~)/.test(line);
      const candidates = new Set();
      for (const span of spans) {
        candidates.add(span);
        for (const word of span.split(/\s+/)) candidates.add(word);
      }
      if (fenced) for (const word of line.split(/\s+/)) candidates.add(word);
      for (const m of line.matchAll(/\bdocs\/[\w./-]+\.md\b/g)) candidates.add(m[0]);
      for (const raw of candidates) {
        const p = toPathCandidate(raw);
        if (!p || NOT_IN_REPO.has(basename(p))) continue;
        if (p.includes('/')) {
          const bare = p.replace(/\/$/, '');
          if (!fileSet.has(bare) && !files.some((f) => f.startsWith(`${bare}/`))) report(no, `Pfad „${p}“ existiert nicht`);
        } else if (!baseNames.has(p)) {
          report(no, `Datei „${p}“ existiert nirgends im Repo`);
        }
      }

      // Markdown-Links auf relative Ziele
      for (const m of line.matchAll(/\]\(([^)\s]+)\)/g)) {
        const target = m[1].replace(/#.*$/, '');
        if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
        const resolved = posix.normalize(posix.join(posix.dirname(doc), target));
        if (!fileSet.has(resolved)) report(no, `Link-Ziel „${m[1]}“ existiert nicht`);
      }

      // Abschnittsverweise: `docs/NN_X.md`, Abschnitt „Titel“
      for (const m of line.matchAll(/`(docs\/[\w./-]+\.md)`[^`„“\n]{0,30}„([^“]+)“/g)) {
        if (!fileSet.has(m[1])) continue;
        const wanted = m[2].toLowerCase();
        const found = headings(readFileSync(join(root, m[1]), 'utf8')).some((h) => h.toLowerCase().includes(wanted));
        if (!found) report(no, `„${m[2]}“ ist keine Überschrift in ${m[1]}`);
      }
    });
  }
  return problems;
}

function main() {
  const rootArg = process.argv.indexOf('--root');
  const root = rootArg > 0 && process.argv[rootArg + 1] ? resolve(process.argv[rootArg + 1]) : resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const problems = checkDocs({ root });
  if (problems.length > 0) {
    console.error(`Doc-Check: ${problems.length} Fund(e)\n${problems.map((p) => `  ${p}`).join('\n')}`);
    process.exit(1);
  }
  console.log('Doc-Check: keine toten Pfade, Skripte, Variablen oder Abschnittsverweise.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
