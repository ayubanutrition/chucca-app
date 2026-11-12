# Handoff

Stand 11.11.2026.

## Was fertig ist
V4 als zusammenhängende, ausführbare Web-App: Heute, Drinks, Besuch, Gruppenplaner, Galerie, Event-Zustände; DE/EN/ES mit lokalisierten Routen; Mobile und Desktop; zwei Betriebsmodi; PWA-Grundlage; 252 Unit- und 477 Browser-Tests.

## Browserübergreifend (12.11.2026)
`npm run test:e2e:cross` führt die Browser-Suite in Playwright-Firefox und -WebKit aus (Linux, headless): je 476 bestanden, je 1 übersprungen, 0 fehlgeschlagen, 6 Tests erst nach Wiederholung grün. Behoben: Tastaturfokus unter der festen Tableiste in Firefox (`src/scripts/app.ts`). Nicht geprüft: Offline in WebKit (Werkzeugfehler), `prefers-contrast` in Firefox (nicht emulierbar). Ohne Browser-Installation (`npx playwright install --with-deps firefox webkit`) läuft der Befehl nicht; `npm run check` bleibt bei Chromium. Playwright-WebKit ist nicht iOS-Safari, Gerätetests (Aufgabe 14) bleiben offen. Details: `docs/06_QA.md`.

## Vorbereitet, aber noch nicht nutzbar
- QR-Aufsteller: `node scripts/qr-link.mjs <Basis-URL> <de|en|es> [Kurz-URL]` (Aufgabe 20). Erst nach der Hostentscheidung sinnvoll; Anleitung in `docs/10_BETREIBER.md`. Neue devDependency `qrcode-generator` (MIT), nicht im Produktbuild.
- Entscheidungsvorlage PWA vs. native: `docs/12_NATIVE_PHASE.md` (Aufgabe 21).

## Wo es läuft
Nur lokal. Kein Deployment, keine öffentliche URL, kein PR.

```sh
npm ci
npm run build && npm run serve   # http://127.0.0.1:4321/
npm run check                    # vollständige Prüfung
```

## Commits
| Stand | SHA | Ort |
|---|---|---|
| Ausgangspunkt `main` | `8dec65b` | Remote und lokal |
| V4 Erstfassung | `cc92395` | Branch `claude/trusting-wozniak-wer4jd`, gepusht |
| Review-Fixes | `c2ac62c` | derselbe Branch |
| Dokumentation, QA, Recherche | `1940e43` | derselbe Branch |
| Service-Worker- und Unterpfad-Tests, Planer-Layout | `7f46e85` | derselbe Branch, gepusht |
| Sieben Agenten-Branches integriert, Audit-Mängel behoben | siehe `git log` (Merge-Commits der Branches `worktree-agent-*`) | derselbe Branch; letzter Stand mit `npm run check` Exit 0 |
Spätere Commits (nur Doku) ändern nichts am Code; maßgeblich ist `git log origin/claude/trusting-wozniak-wer4jd`.

Der Branchname folgt der Vorgabe der Arbeitsumgebung, nicht `rebuild/chucca-v4`.

## Was nur die Veröffentlichung blockiert
1. Betreiberdaten: Karte mit Preisen, Öffnungszeiten, Bestätigung von Adresse und Eingang, Fotos mit Rechten, Impressum/Datenschutz.
2. Entscheidung zu Hosting und Domain (die bestehende geschützte Vorschau war von hier nicht erreichbar und ist unberührt).
3. Gerätetests und muttersprachliche Durchsicht.

Ohne diese Punkte ist der öffentliche Build technisch lauffähig, zeigt aber „Die bestätigte Karte folgt“, keine Zeiten und keine Bilder.

## Nicht behaupten
Keine Veröffentlichung, keine Geräteabnahme, keine Felddaten, keine WCAG-Zertifizierung, keine native App, keine bestätigten Venue-Daten außer den in `docs/04_CONTENT_MEDIA.md` genannten.

## Nächste drei Schritte
1. Betreiberdaten anfordern (Liste in `docs/04_CONTENT_MEDIA.md`) und einpflegen – Aufgabe 12.
2. Hosting festlegen, Vorschau deployen, Service Worker und Unterpfad dort prüfen – Aufgaben 13, 15, 16.
3. Gerätetests auf iPhone und Android inkl. In-App-Browsern – Aufgabe 14.

## Betreiber-Datenweg (Trockenlauf 12.11.2026)
Mit erfundenen Daten in einer Wegwerfkopie durchgespielt (nichts davon im Repo): Tabelle → `npm run menu:import` → `venue.json` (Zeiten, Kanal bestätigt) + Fotoeintrag + Termin → `npm run content:check` → öffentlicher Build mit `CHUCCA_SITE_URL`. Ergebnis: Karte, Zeiten/Status, Kanal, Foto und Termin erscheinen; Drinks und Galerie ohne `noindex` und in der Sitemap; keine Rechte-/Quellenfelder und kein Fixture-/Konzepttext im Output. Dabei behoben: rohe Zod-Ausgabe beim Build-Abbruch (jetzt deutsche Meldung mit Datei und Feld), `confirmed` ohne Wochentage und freigegebenes Foto ohne Datei ließen den Build still durch, doppelte Medien-/Termin-IDs wurden nicht gemeldet, Startseite zeigte ohne JavaScript „Zeiten nicht bestätigt“ trotz bestätigter Zeiten, Doku (`menu:import`, Zeilenzahl der Vorlage, Fotodateinamen) lückenhaft. Nicht gefahren: echte Betreiberdaten, Scan/Druck des QR-Codes, Gerätetest.

## Test-Build mit erfundenen Öffnungszeiten
`npm run build:hours` baut `dist-hours/` mit Fixture-Zeiten (Jahr 2099, Kennung `TESTFIXTURE-HOURS`) für `tests/e2e/hours-fixture.spec.ts`. Nur Vorschau-Modus; der Schalter bricht Public-Builds und andere Ziele ab. Details: `docs/06_QA.md`, `docs/03_ARCHITECTURE.md`.
