# CHUCCA · Playa de Palma

Mobile Web-App/PWA mit vollständiger Desktop-Fassung für die Cocktailbar CHUCCA im Riu Center, Playa de Palma, Mallorca. Dreisprachig (DE/EN/ES), statisch vorgerendert, ohne Konto, ohne Tracking.

Stand V4 (11.11.2026): vollständiger Neubau. Private Vorschau mit gekennzeichneten Beispieldaten und Konzeptmotiven; ein öffentlicher Build zeigt ausschließlich bestätigte Inhalte. Nicht deployt. Details: `docs/00_STATE.md`.

## Start
Voraussetzung: Node ≥ 22.

```sh
npm ci
npm run dev          # Entwicklung: http://localhost:4321/
npm run build        # Vorschau-Build nach dist/
npm run serve        # dist/ ausliefern: http://127.0.0.1:4321/
```

## Prüfen
```sh
npm run typecheck    # astro check (TypeScript strictest)
npm run lint         # ESLint
npm test             # Vitest: Zeit/DST, ICS, Planer, Teilen, Inhalte, Medien, Sprachen, Service Worker
npm run build:test   # vier Builds: dist/ (Vorschau), dist-public/ (öffentlich, Test-URL), dist-sub/ (Unterpfad), dist-hours/ (nur Test: Zeiten-Fixture)
npm run test:dist    # Build-Ausgabe: HTML-Validität, Links, Manifest, JSON-LD, CSP-Hashes, Bilder
npm run test:e2e     # Playwright gegen alle drei Builds, inkl. axe
npm run test:sw-update # Update-Pfad des Service Workers mit zwei Build-Ständen (Playwright)
npm run check        # alles in dieser Reihenfolge
```
Beim ersten Mal lokal: `npx playwright install chromium`.

## Betriebsmodi
| Variable | Wirkung |
|---|---|
| `CHUCCA_MODE=public` | nur bestätigte Inhalte, keine Beispieldaten, keine Konzeptmotive |
| `CHUCCA_SITE_URL=https://…` | Canonical, hreflang, Sitemap, Link zum Plan in Einladungen; ohne sie bleibt auch der öffentliche Build `noindex` |
| `CHUCCA_BASE=/pfad/` | Hosting im Unterpfad |

Öffentlicher Build: `CHUCCA_SITE_URL=https://example.org npm run build:public` → `dist-public/`.

## Inhalte pflegen
Karte, Öffnungszeiten, Termine, Fotos: `docs/04_CONTENT_MEDIA.md`, Abschnitt „Pflege“. Texte der Oberfläche: `src/i18n/`.
`npm run content:check` prüft alle Inhalte gegen die Schemata und fasst auf Deutsch zusammen, was bestätigt ist und was den öffentlichen Build noch blockiert (Exit-Code 1 nur bei Schema-Verstößen). Eine ausgefüllte Kartentabelle (`docs/templates/menu-vorlage.csv`) wandelt `npm run menu:import -- datei.csv [--out pfad.json]` um; ohne `--out` wird nichts überschrieben (Unterlage für den Betrieb: `docs/10_BETREIBER.md`).

## Hilfsskripte
`node scripts/make-concept-art.mjs` (Konzeptmotive), `node scripts/make-icons.mjs` (Icons), `node scripts/screenshots.mjs` (QA-Screenshots), `node scripts/measure.mjs` (Labormessung), `python3 scripts/make-fonts.py` (Schriftteilmengen neu erzeugen; braucht `pip install fonttools brotli` und `npm ci`, schreibt `src/assets/fonts/`, Lizenzen nach `public/fonts/`).

## Dokumente (je Thema ein führender Ort)
| Datei | Führend für |
|---|---|
| `AGENTS.md` | Arbeitsregeln, Definition of Done |
| `docs/00_STATE.md` | Iststand, Baseline, was aus V3 stammt |
| `docs/01_PRODUCT.md` | Aufgaben, Seiten, Zustände, Akzeptanz |
| `docs/02_DESIGN.md` | Art Direction, Tokens, Komponenten |
| `docs/03_ARCHITECTURE.md` | Stack, Struktur, Modi, PWA, SEO, Native-Phase |
| `docs/04_CONTENT_MEDIA.md` | Faktenregister, Pflege, Medienpipeline |
| `docs/05_PLAN.md` | Aufgaben und Status |
| `docs/06_QA.md` | Ausgeführte Prüfungen, Messwerte, Grenzen |
| `docs/07_DECISIONS.md` | Entscheidungen |
| `docs/08_HANDOFF.md` | Übergabe, nächste Schritte |
| `docs/09_RESEARCH.md` | Recherche, Übernahmen, Validierung |
| `docs/11_HOSTING.md` | Header, CSP, Abbildung auf Hosts |
| `docs/12_NATIVE_PHASE.md` | Entscheidungsvorlage PWA vs. native |
