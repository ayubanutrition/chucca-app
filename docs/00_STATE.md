# Aktueller Projektstand

Stand: 11.11.2026, nach Umsetzung von V4.

| Gegenstand | Status | Evidenz |
|---|---|---|
| Remote `main` | unverändert, nur `README.md` | `8dec65b4fd27ea36e0441b22b86234e6e50deb83` (`git ls-remote`, 11.11.2026) |
| Arbeitsbranch | `claude/trusting-wozniak-wer4jd`, gepusht | siehe `docs/08_HANDOFF.md` |
| Worktree | `.worktrees/chucca-v4` neben dem unveränderten Checkout von `main` | `git worktree list` |
| Sicherung | lokaler Tag `backup/pre-v4-2026-11-11` auf `8dec65b` | `git tag` (nicht gepusht; `main` liegt ohnehin auf dem Remote) |
| V4 | umgesetzt: Heute, Drinks, Besuch, Gruppe, Galerie, Event-Zustände, DE/EN/ES, Mobile und Desktop | `npm run check` grün, `docs/06_QA.md` |
| Deployment | keines | – |
| PR | keiner (nicht beauftragt) | – |
| Native App | kein Projekt | – |

## Baseline V3 (aus dem Startpaket, im Repo nicht enthalten)
Am 11.11.2026 im entpackten Startpaket erneut ausgeführt: `npm run check` PASS, `npm test` PASS (Planner: Zeitzone/DST, UID, Validierung), `python3 -m unittest` 6/6 PASS, `media_library.py audit` 4 gesamt / 0 veröffentlichbar. Der lokale V3-Import `78761be…` und der Checkpoint `bc78bab…` waren in dieser Umgebung nicht als Git-Historie vorhanden, nur als Dateien des Pakets.

## Was aus V3 portiert wurde
| V3 | V4 | Regression |
|---|---|---|
| `planner.js` `toInstant`, Madrid/DST | `src/lib/time.ts` | `time-planner.test.ts` (identische Fälle) |
| stabile Kalenderkennung je Entwurf | `src/lib/planner.ts` | dito, plus Browser (`flows.spec.ts`) |
| ICS mit UTC, Escaping, UTF-8-Faltung | `src/lib/ics.ts` (+ `DTEND`, `METHOD`) | `ics-share.test.ts` |
| Fehler am Feld mit `aria-invalid`/`aria-describedby` | `src/scripts/planner.ts` | `flows.spec.ts` |
| Teilen: Abbruch ohne Erfolg, Clipboard, manuelles Kopieren | `src/lib/share.ts` | Unit und Browser |
| fehlertoleranter Speicher, validierte Präferenzen | `src/lib/storage.ts`, `menu.ts` | Unit und Browser |
| Mediengates (Rechte, Standort, Foto), Dedupe | `src/lib/media.ts` | `content-media.test.ts` (6 portierte Fälle) |
| Service Worker: kein HTML bei geschützter Vorschau, alte Caches löschen | `src/lib/sw-template.ts` | `i18n-sw.test.ts` |
| Geschmackswahl (4 Richtungen) | Geschmackskompass der Karte | Browser |

Nicht übernommen: Hash-Routing (alte Links werden weitergeleitet), `gallery.html` als eigene Oberfläche, die Bild-Mockups, der Python-Vollexport der Medien.

## Fakten, Annahmen, offene Abhängigkeiten
- **Fakten** (im Repo belegt): alles unter „Evidenz“ oben; Testergebnisse in `docs/06_QA.md`.
- **Annahmen**: Besucheradresse und Instagram gelten als bestätigt, weil mehrere Quellen übereinstimmen – eine Betreiberbestätigung fehlt. Farben, Wortmarke und Zeichen sind Designvorschläge. Näherungskoordinaten dienen nur dem Sonnenstand.
- **Offen, extern**: Karte/Preise, Öffnungszeiten, Anfragekanal, Fotos mit Rechten, Rechtstexte, Hosting-Ziel und Domain, Gerätetests. Liste: `docs/04_CONTENT_MEDIA.md`; Wirkung: `docs/05_PLAN.md`.

## Verfügbare Fähigkeiten in dieser Session (tatsächlich genutzt)
Shell, Node 22, Chromium/Playwright, Git-Push auf den Arbeitsbranch, drei Subagents (Recherche, Design-Review, Code-Review). Nicht verfügbar oder nicht nutzbar: die geschützte Altvorschau (Login), Reddit (403), die Bildgenerierung über die angebundene OpenAI-Schnittstelle (kein Guthaben), physische Geräte, ein Deployment-Ziel.

## Wahrheitsregeln
Historische Prüfung ≠ neue Prüfung. Medienverweis ≠ Foto ≠ Nutzungsfreigabe. Konzeptmotiv ≠ Aufnahme. Emulation ≠ Gerät. Labor ≠ Felddaten. PWA ≠ native App.
