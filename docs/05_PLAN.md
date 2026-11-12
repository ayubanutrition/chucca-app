# Umsetzungsplan

Status: TODO / DOING / DONE / BLOCKED. DONE mit Evidenz.

| ID | Aufgabe | Status | Evidenz / Blocker |
|---|---|---|---|
| 01 | Repo, Assets, Altcode inventarisieren; Worktree sichern | DONE | `docs/00_STATE.md` |
| 02 | Baseline V3 ausführen | DONE | `docs/00_STATE.md`, „Baseline V3“ |
| 03 | Produkt, Art Direction, Daten und Stack entscheiden | DONE | `docs/01`–`04`, `07` |
| 04 | Struktur, Komponenten, DE/EN/ES-Routen | DONE | 17 Seiten je Build; `i18n-sw.test.ts` |
| 05 | Heute → Drinks → Besuch | DONE | `core.spec.ts`; `docs/evidence/` |
| 06 | Planer, Teilen, Kopierfallback, Kalender | DONE | `time-planner.test.ts`, `ics-share.test.ts`, `flows.spec.ts` |
| 07 | Galerie, Medienpipeline, bedingte Events | DONE | `content-media.test.ts`, `flows.spec.ts`, `public.spec.ts` |
| 08 | Betreiber-Content einpflegen, Anfrageweg anbinden | BLOCKED | Karte, Zeiten, Fotos, Kanal fehlen (`docs/04_CONTENT_MEDIA.md`). Technik ist vorbereitet; Anfrage bleibt „vorbereitete Nachricht“ |
| 09 | Responsive, Barrierefreiheit, Motion, Performance | DONE (Labor) | `docs/06_QA.md`; Gerätetests offen |
| 10 | PWA, SEO, Release-Modi | DONE (ohne Host) | `sw-browser.spec.ts`, `subpath.spec.ts`, `public.spec.ts`. Offen: echter Host, Update-Hinweis im Browser |
| 11 | Konsistenzprüfung, Commits, Handoff | DONE | `docs/08_HANDOFF.md` |

## Offene Aufgaben nach Priorität
| ID | Aufgabe | Abhängigkeit | Abnahme |
|---|---|---|---|
| 12 | Betreiberdaten einholen und einpflegen (Karte, Zeiten, Adresse bestätigen, Fotos, Rechtstexte) | Betrieb | Öffentlicher Build zeigt Karte, Zeiten, Fotos; Beispieldaten verschwinden automatisch |
| 13 | Hosting-Ziel und Domain festlegen, Vorschau deployen | Entscheidung Betreiber | URL erreichbar; Header für `sw.js`/HTML `no-cache`; `404.html` greift |
| 14 | Gerätetests iPhone (Safari, Instagram-/WhatsApp-In-App) und Android (Chrome) | 13 | Installation, Standalone, Teilen, ICS-Import, Safe Areas, Lightbox-Scroll |
| 15 | Update-Hinweis des Service Workers im Browser prüfen (Offline und Registrierung sind getestet) | 13 | Test mit zwei Builds nacheinander oder manuelles Protokoll |
| 16 | Unterpfad auf dem echten Host wiederholen | 13 | `subpath.spec.ts`-Fälle gegen die Live-URL (lokal DONE) |
| 17 | Muttersprachliche Durchsicht EN/ES | Person | Freigabe der Texte |
| 18 | Betreuter Anfrageweg (Formular-Backend oder bestätigter Kanal) | 12 | Erfolg erst nach echter Zustellung; Fehler- und Timeout-Zustände getestet |
| 19 | Schriften subsetten (vorher ca. 167 kB) | DONE | Erstbesuch 102,5 → 84,4 kB (Labor, zweite Stufe: Zeichenbestand aus den Quelltexten); `scripts/make-fonts.py`, `tests/unit/fonts.test.ts`; `docs/06_QA.md`, D16 |
| 20 | QR-Aufsteller: Deep-Link auf `/…/drinks/` mit lesbarer Kurz-URL | 13 | gedruckter Code führt direkt zur Karte |
| 21 | Native Phase bewerten | 12–14 | Entscheidungsvorlage nach `docs/03_ARCHITECTURE.md` |

## Bekannte Grenzen des Stands
- Der Kalender-Erfolgstext kann nicht prüfen, ob das Gerät die Datei wirklich öffnet (In-App-Browser); der Text weist auf das Kopieren hin.
- Ausnahmetage der Öffnungszeiten wirken auf den Status, werden in der Wochentabelle aber noch nicht einzeln aufgeführt.
- Läuft ein bestätigter Zeitraum (`validUntil`) während einer Schicht aus, springt der Status um Mitternacht auf „unbestätigt“.
- Die Beispielkarte zeigt den Zustand „nicht verfügbar“ an einem Beispieldrink.

## Arbeitsprinzip
Alle Seiten auf gleichem Niveau halten. Externe Lücken blockieren nur die betroffene öffentliche Aussage. Keine Prozentzahlen, keine Liefertermine ohne Grundlage.
