# Umsetzungsplan

Status: TODO / DOING / DONE / BLOCKED. DONE mit Evidenz.

| ID | Aufgabe | Status | Evidenz / Blocker |
|---|---|---|---|
| 01 | Repo, Assets, Altcode inventarisieren; Worktree sichern | DONE | `docs/00_STATE.md` |
| 02 | Baseline V3 ausführen | DONE | `docs/00_STATE.md`, „Baseline V3“ |
| 03 | Produkt, Art Direction, Daten und Stack entscheiden | DONE | `docs/01_PRODUCT.md` bis `04_CONTENT_MEDIA.md`, `07_DECISIONS.md` |
| 04 | Struktur, Komponenten, DE/EN/ES-Routen | DONE | 17 Seiten je Build; `i18n-sw.test.ts` |
| 05 | Heute → Drinks → Besuch | DONE | `core.spec.ts`; `docs/evidence/` |
| 06 | Planer, Teilen, Kopierfallback, Kalender | DONE | `time-planner.test.ts`, `ics-share.test.ts`, `flows.spec.ts` |
| 07 | Galerie, Medienpipeline, bedingte Events | DONE | `content-media.test.ts`, `flows.spec.ts`, `public.spec.ts` |
| 08 | Betreiber-Content einpflegen, Anfrageweg anbinden | BLOCKED | Karte, Zeiten, Fotos, Kanal fehlen (`docs/04_CONTENT_MEDIA.md`). Technik ist vorbereitet; Anfrage bleibt „vorbereitete Nachricht“ |
| 09 | Responsive, Barrierefreiheit, Motion, Performance | DONE (Labor) | `docs/06_QA.md`; Gerätetests offen |
| 10 | PWA, SEO, Release-Modi | DONE (ohne Host) | `sw-browser.spec.ts`, `subpath.spec.ts`, `public.spec.ts`. Offen: echter Host |
| 11 | Konsistenzprüfung, Commits, Handoff | DONE | `docs/08_HANDOFF.md` |

## Weitere Aufgaben nach Priorität
Status wie oben; BLOCKED heißt: hängt an einer Entscheidung oder Lieferung außerhalb des Repos.

| ID | Status | Aufgabe | Abhängigkeit | Abnahme |
|---|---|---|---|---|
| 12 | BLOCKED | Betreiberdaten einholen und einpflegen (Karte, Zeiten, Adresse bestätigen, Fotos, Rechtstexte) | Betrieb | Öffentlicher Build zeigt Karte, Zeiten, Fotos; Beispieldaten verschwinden automatisch. Datenweg mit erfundenen Wegwerfdaten am 12.11.2026 Ende-zu-Ende gefahren (CSV → `menu:import` → `content:check` → Public-Build; Karte, Zeiten, Kanal, Foto, Termin erscheinen, Drinks/Galerie indexierbar und in der Sitemap, keine internen Felder im Output); echte Betreiberdaten fehlen weiter |
| 13 | BLOCKED | Hosting-Ziel und Domain festlegen, Vorschau deployen | Entscheidung Betreiber | URL erreichbar; Header für `sw.js`/HTML `no-cache`; `404.html` greift |
| 14 | BLOCKED | Gerätetests iPhone (Safari, Instagram-/WhatsApp-In-App) und Android (Chrome) | 13 | Installation, Standalone, Teilen, ICS-Import, Safe Areas, Lightbox-Scroll |
| 15 | DONE (Chromium, lokal) | Update-Hinweis des Service Workers im Browser prüfen (Offline und Registrierung sind getestet) | 13 | Chromium, lokal: `tests/e2e/sw-update.spec.ts` über `npm run test:sw-update` mit zwei Build-Ständen; Details und Grenzen `docs/06_QA.md`. Auf dem echten Host (Aufgabe 13) mit `sw.js` hinter CDN wiederholen |
| 16 | BLOCKED (lokal DONE) | Unterpfad auf dem echten Host wiederholen | 13 | `subpath.spec.ts`-Fälle gegen die Live-URL (lokal DONE) |
| 17 | BLOCKED | Muttersprachliche Durchsicht EN/ES | Person | Freigabe der Texte |
| 18 | BLOCKED (technisch vorbereitet) | Betreuter Anfrageweg (Formular-Backend oder bestätigter Kanal) | 12, Betreiberentscheidung | Erfolg erst nach echter Zustellung; Fehler- und Timeout-Zustände getestet. Vorbereitet und AUS: optionales `inquiryEndpoint` in `venue.json` (im Repo absent), Senden-Knopf, Zustände sending/success/4xx/5xx/Timeout/offline in DE/EN/ES, CSP-Host nur bei Bestätigung; im Browser gegen einen Mock-Endpunkt im Testbuild `dist-inquiry` geprüft (`tests/e2e/inquiry-send.spec.ts`, `docs/06_QA.md`). Offen und nicht von uns zu erfinden: echter Dienst und Adresse, CORS, Zusage zur Betreuung, Datenschutztext, Kontaktfeld-Entscheidung (`docs/10_BETREIBER.md`, Punkt 3). Nicht geprüft: echter Endpunkt, echte Zustellung |
| 19 | DONE | Schriften subsetten (vorher ca. 167 kB) | – | Erstbesuch ca. 167 → 84,4 kB (Labor; Zwischenstand der ersten Stufe 105,5 kB, zweite Stufe: Zeichenbestand aus den Quelltexten); `scripts/make-fonts.py`, `tests/unit/fonts.test.ts`; `docs/06_QA.md`, D16 |
| 20 | BLOCKED (Werkzeug DONE) | QR-Aufsteller: Deep-Link auf `/…/drinks/` mit lesbarer Kurz-URL | 13 | Werkzeug fertig (`scripts/qr-link.mjs`, `tests/unit/qr-link.test.ts`, 6 Tests; Anleitung `docs/10_BETREIBER.md`). Offen: Host (13), Kurz-URL, Druck und Scan-Test mit echtem Gerät; Drinks bleibt im öffentlichen Modus `noindex`, bis die Karte bestätigt ist |
| 21 | BLOCKED (Vorlage DONE) | Native Phase bewerten | 12–14 | Vorlage liegt vor: `docs/12_NATIVE_PHASE.md` (Kriterien, Annahmen, Auslöser). Entscheidung offen, braucht Ergebnisse aus 12–14 |

## Cross-Browser-Stand (12.11.2026)
Dieselbe Browser-Suite läuft zusätzlich in Playwright-Firefox und -WebKit (`npm run test:e2e:cross`, nicht Teil von `npm run check`; CI-Job `cross-browser` eingerichtet, nicht ausgeführt). Ergebnis (Lauf 13.11.2026, beide Browser zusammen): 1141 bestanden, 2 übersprungen, 0 fehlgeschlagen; 11 Tests nur nach Wiederholung grün (Firefox, Last). Ein echter Fehler in Firefox (Tastaturfokus unter der Tableiste) ist behoben. Offen: Offline-Verhalten in WebKit ungeprüft (Werkzeuggrenze). Playwright-WebKit ist nicht iOS-Safari und ersetzt Aufgabe 14 nicht. Details: `docs/06_QA.md`, „Browserübergreifend“.

## Bekannte Grenzen des Stands
- Der Kalender-Erfolgstext kann nicht prüfen, ob das Gerät die Datei wirklich öffnet (In-App-Browser); der Text weist auf das Kopieren hin.
- Ausnahmetage erscheinen auf „Besuch“ als eigene Liste unter der Wochentabelle (nur künftige, nur innerhalb des bestätigten Zeitraums). Mit den echten Daten bleibt das ungenutzt, bis der Betrieb Zeiten bestätigt hat; die Darstellung wurde mit temporären Testdaten im Browser geprüft, im Repo ist sie nur über Unit-Tests der Logik (`upcomingExceptions`) abgedeckt.
- Eine am letzten gültigen Tag begonnene Schicht läuft über Mitternacht weiter (Status „offen“); erst danach gilt „unbestätigt“. Die Wochentabelle auf „Besuch“ wird dagegen schon um Mitternacht durch den Hinweis ersetzt.
- Die Beispielkarte zeigt den Zustand „nicht verfügbar“ an einem Beispieldrink.

## Arbeitsprinzip
Alle Seiten auf gleichem Niveau halten. Externe Lücken blockieren nur die betroffene öffentliche Aussage. Keine Prozentzahlen, keine Liefertermine ohne Grundlage.
