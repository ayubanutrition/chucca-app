# Entwurf: Pull-Request-Text (V4-Neubau)

Nur ein Textentwurf. Es wurde kein Pull Request geöffnet; das geschieht erst auf ausdrückliche Anweisung. Im Repo liegt keine PR-Vorlage (nur `.github/workflows/quality.yml`, Stand 13.11.2026); auf GitHub konnte nicht nachgesehen werden, ob eine organisationsweite Vorlage gilt.

**Titel:** CHUCCA V4 – vollständiger Neubau (Astro, TypeScript, DE/EN/ES)

**Inhalt:** Mobile-first-PWA mit vollständigem Desktop-Layout: Heute, Drinks, Besuch, Gruppenplanung, Galerie, Event-Zustände. Zwei Betriebsmodi (Vorschau mit gekennzeichneten Beispieldaten, öffentlich nur mit bestätigten Daten). Keine erfundenen Betriebsangaben.

**Umfang:** rund 180 Dateien und rund 50 Commits gegenüber `main` (13.11.2026: 178 Dateien, 49 Commits; maßgeblich `git diff --stat 8dec65b..HEAD`). Der Altstand V3 liegt nicht im Repo.

**Prüfung (Stand `docs/06_QA.md`):** `npm run check` Exit 0 – Doc-Check, Typecheck, Lint, 254 Unit-Tests, vier Builds, 220 Tests der Build-Ausgabe, 577 Chromium-E2E-Tests (gegen Vorschau, öffentlich, Unterpfad und den Test-Build mit Fixture-Zeiten), 7 Service-Worker-Update-Tests. Zusatzlauf Firefox/WebKit (`npm run test:e2e:cross`), Lighthouse im Labor, axe-Prüfungen, Breakpoint-Sweep.

**Nicht geprüft / extern offen:** Betreiberdaten (Karte, Preise, Zeiten, Fotos, Rechtstexte), Hosting und Domain, Tests auf echten iOS-/Android-Geräten, Screenreader, muttersprachliche EN/ES-Durchsicht, bestätigter Anfragekanal, QR-Aufsteller-Druck.

**Hinweise für Reviewer:** Einstieg `AGENTS.md`, `docs/00_STATE.md`, `docs/08_HANDOFF.md`. Neue devDependencies: `qrcode-generator`, `@vitest/coverage-v8`.
