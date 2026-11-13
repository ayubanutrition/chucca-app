# Anforderungs-Rückverfolgung

Stand 13.11.2026, Basis `f1f226c`. Dieses Dokument ordnet jede prüfbare Anforderung, jedes Akzeptanzkriterium und jedes Verbot der ursprünglichen Beauftragung einem Beleg im Repo zu. Es ist der **führende Ort für die Zuordnung Auftrag → Nachweis**; Testzahlen und Messwerte stehen in `docs/06_QA.md`, offene Lieferungen in `docs/05_PLAN.md`.

**Quellen im Startpaket (nicht im Repo):** `SP` = `START_PROMPT.md` (mit Abschnittsnummer), `AU` = `AUDIT_2026-11-11.md`, `RF` = `README_FIRST.md`, `SO` = `SOURCES.md`, `ST` = `repo-starters/` (AGENTS, CLAUDE, docs 00–08). `AUF` = Aufgabenstellung dieser Prüfung (nennt zusätzlich Recherche, Browserchecks und Reviews; nicht im Paket).

**Status:** ERFÜLLT = Beleg geprüft und trägt die Aussage. TEILWEISE = ein Teil belegt, der Rest benannt. OFFEN-EXTERN = hängt an Betrieb, Host, Gerät, Person oder Autorisierung außerhalb des Repos; nichts erfunden. NICHT ERFÜLLT = machbar, aber nicht umgesetzt (aktuell keine Zeile).

**Wie geprüft:** Jede genannte Datei wurde geöffnet, jeder genannte Test existiert und lief im Gesamtlauf `npm run check` am 13.11.2026 (Exit 0, siehe „Zusammenfassung“). Aussagen über Git-Historie stammen aus `git reflog`, `git ls-remote` und `git tag` am selben Tag. Ein bestandener Test belegt nur, was er prüft: Emulation ist kein Gerätetest, Labor sind keine Felddaten, KI-Lektorat ist keine muttersprachliche Freigabe.

## A. Arbeitsweise, Git, Autorisierung
| ID | Anforderung | Quelle | Status | Beleg |
|---|---|---|---|---|
| A01 | Iststand selbst sichern: Remote, alle Branches, Status, Commits, Assets prüfen | SP §1 | ERFÜLLT | `docs/00_STATE.md` (Tabelle, Baseline). Gegenprobe 13.11.2026: `git ls-remote --heads origin` nennt nur `main` = `8dec65b` und den Arbeitsbranch |
| A02 | Separater Worktree/Branch; Sicherung des Iststands | SP §1 | ERFÜLLT | Worktree `.worktrees/chucca-v4` (`git worktree list`), Branch `claude/trusting-wozniak-wer4jd` (Abweichung vom Namen `rebuild/chucca-v4` begründet in `docs/07_DECISIONS.md` D17), lokaler Tag `backup/pre-v4-2026-11-11` auf `8dec65b` |
| A03 | Kein Force-Push, kein Überschreiben fremder Änderungen | SP §1, ST-AGENTS | ERFÜLLT | `git reflog show origin/claude/trusting-wozniak-wer4jd`: 48 Einträge, alle „update by push“, 0 „forced-update“; `main` unverändert `8dec65b`. Grenze: der Reflog gilt für diesen Klon, nicht für serverseitige Protokolle. Regel in `AGENTS.md` |
| A04 | Nur README im Remote: Referenz nutzen und dokumentieren, keine vorgetäuschte Altcodeprüfung | SP §1 | ERFÜLLT | `docs/00_STATE.md`, „Baseline V3 (aus dem Startpaket, im Repo nicht enthalten)“ |
| A05 | Aktuelle Root-Regeln und Starter nachvollziehbar zusammenführen | SP §1, §2 | ERFÜLLT | `AGENTS.md` und `CLAUDE.md` erweitern die Starter (gleiche Abschnitte, zusätzliche Repo-Regeln); Zusammenführung in `docs/00_STATE.md` |
| A06 | Push, PR, Deployment nur nach bestehender Autorisierung | SP §7, ST-05 | ERFÜLLT | Push nur auf den Arbeitsbranch. Kein PR: `git ls-remote origin 'refs/pull/*'` leer (13.11.2026). Kein Deployment: `.github/workflows/quality.yml` enthält keinen Deploy-Schritt, `docs/08_HANDOFF.md` „Wo es läuft“ |
| A07 | Etappe F: reviewbarer Branch/PR | SP §6 | TEILWEISE | Branch gepusht und prüfbar; PR-Text liegt vor (`docs/13_PR_ENTWURF.md`), **PR nicht geöffnet**, weil nicht beauftragt. OFFEN-EXTERN: Autorisierung zum Öffnen |
| A08 | Unklaren öffentlichen Release als geprüften Stand zur Entscheidung vorlegen | SP §7 | ERFÜLLT | `docs/08_HANDOFF.md` „Was nur die Veröffentlichung blockiert“, `docs/13_PR_ENTWURF.md` |
| A09 | Vorhandene Site-Identität und Zugriffsregeln erhalten | SP §7 | ERFÜLLT | Die geschützte Vorschau wurde nicht berührt (`docs/00_STATE.md`, `docs/03_ARCHITECTURE.md` „Hosting“); es gibt kein Deployment |
| A10 | Nur real verfügbare Tools/Agenten nutzen und ausweisen; keine behaupteten Fremdmodell-Reviews | SP §7, AUF | ERFÜLLT | `docs/00_STATE.md` „Verfügbare Fähigkeiten“, `docs/06_QA.md` „Reviews“ (Zeile „Keine Reviews fremder Modelle“) |
| A11 | Reversible Entscheidungen selbst treffen; nur bei externen Abhängigkeiten fragen, an Unbetroffenem weiterarbeiten | SP §7 | ERFÜLLT | `docs/07_DECISIONS.md`; `docs/05_PLAN.md`: BLOCKED nur bei externer Abhängigkeit |
| A12 | Fakten, Annahmen und externe Abhängigkeiten getrennt führen | SP §2, AUF | ERFÜLLT | `docs/00_STATE.md` „Fakten, Annahmen, offene Abhängigkeiten“; `docs/12_NATIVE_PHASE.md` ([Repo]/[Annahme]/[Offen]); `status` je Angabe in `src/content/published/venue.json` |
| A13 | Abschlussfragen beantworten (fertig? wo läuft es? Commit lokal/remote? getestet? was blockiert?) und 00_STATE, 05_PLAN, 06_QA, 08_HANDOFF aktualisieren | SP §7 | ERFÜLLT | `docs/08_HANDOFF.md`. Beim Prüfen war die Testzahl im Handoff veraltet (254/220/577); am 13.11.2026 auf den Verweis auf `docs/06_QA.md` und den aktuellen Lauf berichtigt |
| A14 | „Fertig“, „hochgeladen“, „veröffentlicht“ nur mit überprüfbarem Ergebnis | SP §7 | ERFÜLLT | `docs/08_HANDOFF.md` „Nicht behaupten“; Veröffentlichung: keine |
| A15 | Nach jeder Etappe Status und Nachweise aktualisieren, keine Prozentzahlen ohne Grundlage | SP §2, ST-05 | ERFÜLLT | `docs/05_PLAN.md` (Status mit Evidenz je Zeile, „Arbeitsprinzip“) |
| A16 | Nicht nach dem Plan stoppen; Kernumfang vollständig liefern | SP §7 | ERFÜLLT | Abschnitte C bis F dieser Tabelle |

## B. Dokumentationspflichten und Recherche
| ID | Anforderung | Quelle | Status | Beleg |
|---|---|---|---|---|
| B01 | Pflichtdateien AGENTS, CLAUDE, docs 00–08, README vorhanden und nicht leer | SP §2 | ERFÜLLT | Alle vorhanden. Wächter: `tests/unit/scope-guards.test.ts` („Pflichtdokumente“) |
| B02 | Eine Information, ein führender Ort; keine Dokumentationsschleifen | SP §2 | ERFÜLLT | `README.md` „Dokumente (je Thema ein führender Ort)“; `AGENTS.md` „Start“; `npm run docs:check` fängt tote Verweise |
| B03 | `CLAUDE.md` als kurzer Einstieg mit Verweisen | SP §2 | ERFÜLLT | `CLAUDE.md` (5 Zeilen Inhalt, verweist auf AGENTS, 00/05/08, README) |
| B04 | `00_STATE`: Iststand, Baseline, Fähigkeiten, offene Fakten | SP §2 | ERFÜLLT | `docs/00_STATE.md` |
| B05 | `01_PRODUCT`: Nutzeraufgaben, Umfang, Seiten, Zustände, Akzeptanz | SP §2 | ERFÜLLT | `docs/01_PRODUCT.md` (Tabellen „Seiten und Akzeptanz“, „Zustände“) |
| B06 | `02_DESIGN`: Art Direction, Tokens, Typografie, Layout, Komponenten, Motion | SP §2 | ERFÜLLT | `docs/02_DESIGN.md` |
| B07 | `03_ARCHITECTURE`: Stack, Struktur, Daten, Sprache, Routing, PWA, Integrationen | SP §2 | ERFÜLLT | `docs/03_ARCHITECTURE.md` |
| B08 | `04_CONTENT_MEDIA`: Quellen, Freigaben, Bildinventar, Content-Lücken, Verantwortliche | SP §2 | ERFÜLLT | `docs/04_CONTENT_MEDIA.md` (Faktenregister, Bestand, Pflege, Quellen). **Lücke beim Prüfen:** Verantwortliche fehlten; ergänzt als Abschnitt „Zuständige Rollen (vorläufig)“, Rollen statt Personen |
| B09 | `05_PLAN`: priorisierte Aufgaben, Abhängigkeiten, Status, Abnahme | SP §2 | ERFÜLLT | `docs/05_PLAN.md` |
| B10 | `06_QA`: tatsächlich ausgeführte Checks, Screenshots, Ergebnisse, Grenzen | SP §2 | ERFÜLLT | `docs/06_QA.md` (inkl. „Nicht geprüft“) |
| B11 | `07_DECISIONS`: Entscheidungen mit Gründen und Konsequenzen | SP §2 | ERFÜLLT | `docs/07_DECISIONS.md` (D01 bis D18) |
| B12 | `08_HANDOFF`: lauffähiger Stand, SHA, Startbefehle, offene Punkte, nächste drei Schritte | SP §2 | ERFÜLLT | `docs/08_HANDOFF.md` (Tabelle „Commits“, „Wo es läuft“, „Nächste drei Schritte“) |
| B13 | `README`: tatsächliches Setup, Befehle, Betriebsmodell | SP §2 | ERFÜLLT | `README.md`; Nachlauf in frischem Klon: `docs/06_QA.md` „CI-Nachlauf im frischen Klon“ |
| B14 | Keine leeren Platzhalter-Dossiers | SP §2 | ERFÜLLT | `tests/unit/scope-guards.test.ts` (Mindestumfang, Überschrift) |
| B15 | Quellenverarbeitung je Angabe: Quelle/Beleg, Beobachtungsdatum, Prüfdatum, Status, Gültigkeit, Rolle; Rollen vorläufig, keine Person erfinden | ST-04 | ERFÜLLT | `src/lib/content/schema.ts` (`status`, `source`, `observedAt`, `verifiedAt`, `validFrom`, `validUntil`; „confirmed“ nur mit Quelle und Datum, `tests/unit/content-media.test.ts` „Datenverträge“); Rollen: `docs/04_CONTENT_MEDIA.md` |
| B16 | Recherche dokumentiert, Grenzen ehrlich | AUF | ERFÜLLT | `docs/09_RESEARCH.md` („Grenzen der Recherche“: Reddit 403, nicht gelesene Quellen; Entscheidungen mit Beleg und Validierung im Repo) |
| B17 | Recherche-Nachweis der Primärquellen aus `SO` (Astro Islands, Astro i18n, web.dev Vitals, WCAG 2.2) | SO | ERFÜLLT | `docs/09_RESEARCH.md` F4–F6 (Astro), `docs/06_QA.md` (Vitals, Labor/Feld getrennt), WCAG als Ziel in `docs/06_QA.md` |
| B18 | Technologieversionen beim Start auf stabile Kompatibilität prüfen | SO, SP §5 | ERFÜLLT | `docs/03_ARCHITECTURE.md` „Stack (geprüft am 11.11.2026)“. Gegenprobe 13.11.2026 (`npm outdated`): Astro, Zod, Vitest, ESLint auf dem neuesten Stand; Playwright 1.63 (1.65 verfügbar), TypeScript 6.0.3 (7.0 verfügbar, Hauptversion bewusst nicht übernommen, Verträglichkeit mit `@astrojs/check` ungeprüft) |
| B19 | Dieses Dokument verlinkt (README, Plan, Handoff) | AUF | ERFÜLLT | `README.md` „Dokumente“, `docs/05_PLAN.md`, `docs/08_HANDOFF.md`; Wächter in `tests/unit/scope-guards.test.ts` |

## C. Produktumfang und Inhalte
| ID | Anforderung | Quelle | Status | Beleg |
|---|---|---|---|---|
| C01 | Zusammenhängender Kernflow Heute → Drinks → Besuch → Gruppe in allen Sprachen | SP §3, §6 C | ERFÜLLT | `tests/e2e/core.spec.ts` „Kernstrecke“, 15 Seiten in „Sprachen“; Screenshots `docs/evidence/heute-de-1440.jpg`, `docs/evidence/drinks-de-390.jpg`, `docs/evidence/besuch-es-390.jpg` |
| C02 | Heute: starke Atmosphäre, eindeutiger Mallorca-Bezug | SP §3.1 | ERFÜLLT | Titel „… Cocktailbar in Playa de Palma, Mallorca“ (`src/i18n/de.ts`, geprüft in `core.spec.ts` „alle Seiten mit eigener Sprache, Titel …“); `docs/evidence/heute-de-1440.jpg`. Atmosphäre ist Designurteil (Review in `docs/06_QA.md`), keine Nutzermessung |
| C03 | Route und Karte früh erreichbar | SP §3.1 | ERFÜLLT | `core.spec.ts` „Route früh erreichbar“ (390 und 1440 px oberhalb der Falz) |
| C04 | Öffnungsstatus ausschließlich aus verlässlichen aktuellen Daten | SP §3.1 | ERFÜLLT | `tests/unit/venue-logic.test.ts` („berechnet ohne bestätigte Daten niemals einen Status“, DST-Nächte), `core.spec.ts` („Jetzt“ ohne erfundenen Status), `tests/e2e/hours-fixture.spec.ts` (Testbuild mit gekennzeichneten Zeiten) |
| C05 | Drinks: strukturierte Karte mit Kategorien, Zutaten, Größen, Preisen (falls bestätigt); ohne JavaScript lesbar | SP §3.2 | ERFÜLLT | `src/components/DrinksView.astro`, `core.spec.ts` „Getränkekarte“; Schema `src/lib/content/schema.ts` |
| C06 | Alkoholfreie Auswahl gleichwertig | SP §3.2 | ERFÜLLT | `core.spec.ts` „… alkoholfreie Auswahl gleichwertig“; `docs/evidence/zustand-drinks-alkoholfrei-de-390.jpg` |
| C07 | Suche/Filter bei sinnvollem Umfang, verständliche Nulltreffer | SP §3.2 | ERFÜLLT | `core.spec.ts` „Kategorien, Suche, Nulltreffer und Zurücksetzen“; `docs/evidence/drinks-nulltreffer-de-390.jpg` |
| C08 | Fehlende Daten nicht erfinden (Preis fehlt, nicht verfügbar, „Karte folgt“) | SP §3.2, §3 | ERFÜLLT | `core.spec.ts` (Preis an der Bar, „Heute nicht verfügbar“), `public.spec.ts` (keine Beispielkarte öffentlich), `docs/01_PRODUCT.md` „Zustände“ |
| C09 | Bestätigte echte Karte mit Preisen | SP §3.2, AU §8 | OFFEN-EXTERN | Betrieb muss liefern (`docs/04_CONTENT_MEDIA.md`, `docs/10_BETREIBER.md`). Vorbereitet: `npm run menu:import`, `npm run content:check`; Trockenlauf mit erfundenen Wegwerfdaten in `docs/08_HANDOFF.md` |
| C10 | Besuch: belegte Adresse, Route, Kontakt | SP §3.3 | ERFÜLLT | `venue.json` (`confirmed` mit Quellenlage), `flows.spec.ts` „Besuch“, `core.spec.ts` (Adresse); Kontakt nur bestätigte Wege (`flows.spec.ts` „zeigt keine unbestätigten Öffnungszeiten oder Kontaktwege“) |
| C11 | Eingangshilfe soweit vorhanden | SP §3.3 | ERFÜLLT | Nur als `source-claim` mit Hinweis und nur in der Vorschau (`docs/04_CONTENT_MEDIA.md` Faktenregister; öffentlich nur wenn `confirmed`, `docs/03_ARCHITECTURE.md` Betriebsmodi) |
| C12 | Verständlicher Anfrageweg, ehrlich begrenzt ohne bestätigten Empfangskanal | SP §3.3, §3 | ERFÜLLT | `flows.spec.ts` „Gruppennachricht wird nur vorbereitet – nie als gesendet oder reserviert gemeldet“; `docs/evidence/zustand-besuch-nachricht-es-390.jpg` |
| C13 | Betreiberbestätigung von Adresse, Eingang, Instagram, Anfragekanal | AU §8, SP §3 | OFFEN-EXTERN | Annahme in `docs/00_STATE.md`; Liste in `docs/04_CONTENT_MEDIA.md` |
| C14 | Gruppenplaner: Europe/Madrid, Datum/Uhrzeit, Einladung, natives Teilen plus Zwischenablage und manuelles Kopieren, ICS | SP §3.4 | ERFÜLLT | `flows.spec.ts` „Gruppenplaner“ (Fehler je Feld, Teilen, Zwischenablage, manuell, ICS), `tests/unit/time-planner.test.ts`, `tests/unit/ics-share.test.ts`; `docs/evidence/zustand-gruppe-fehler-de-390.jpg`, `docs/evidence/zustand-gruppe-manuell-en-390.jpg` |
| C15 | Treffplanung ist keine Reservierung | SP §3.4 | ERFÜLLT | Text in allen Einladungen („keine Reservierung“, `flows.spec.ts` Teilen-Tests in DE/EN/ES); `flows.spec.ts` Gruppennachricht verbietet Reservierungsvokabular |
| C16 | Galerie: kuratierte freigegebene Bilder, responsive Varianten, Credits | SP §3.5 | ERFÜLLT | `flows.spec.ts` „Bilder laden mit responsiven Varianten“; Credit im Dialog (`src/scripts/lightbox.ts`, `docs/evidence/zustand-galerie-bildansicht-de-390.jpg`); Freigabe-Gates `tests/unit/content-media.test.ts` |
| C17 | Lightbox: Tastatur, Escape, Fokus-Rückgabe, Vor/Zurück, benannter Dialog | SP §3.5, AU §3 P2 | ERFÜLLT | `flows.spec.ts` „Bildansicht: …“, `tests/e2e/keyboard.spec.ts` „Lightbox (Galerie)“ |
| C18 | Keine leere Galerie als Hauptversprechen | SP §3.5 | ERFÜLLT | `public.spec.ts` „leere Galerie ist ehrlich, nicht indexiert und nicht in der Navigation“ (die Navigationsaussage wurde beim Prüfen ergänzt: sie war im Titel, aber nicht in den Assertions); `docs/evidence/public-galerie-de-390.jpg` |
| C19 | Echte, freigegebene Fotos des Lokals mit Rechten | SP §3.5, AU §5 | OFFEN-EXTERN | 0 veröffentlichbare Fotos (`docs/04_CONTENT_MEDIA.md` „Medienpipeline“, Bestand); Betrieb liefert Originale und Freigaben |
| C20 | Events: Datenmodell und sinnvolle Darstellung | SP §3.6 | ERFÜLLT | `src/lib/events.ts`, Schema `Event`, `src/components/TodayView.astro`; neu: `tests/e2e/events.spec.ts` (Kennzeichnung „Beispiel“ in DE/EN/ES, keine Buchungsversprechen); `docs/evidence/zustand-heute-termine-de-1440.jpg` |
| C21 | Öffentlich nur aktuelle bestätigte Termine, sonst Modul ausblenden; Abgelaufenes verschwindet | SP §3.6, ST-01 | ERFÜLLT | `public.spec.ts` („keine Termine“), `tests/unit/venue-logic.test.ts` „Termine“, neu `events.spec.ts` („abgelaufene Termine verschwinden … zuletzt das ganze Modul“). Lücke beim Prüfen: der Browser-Zustand von Terminen war ungetestet |
| C22 | Echte, bestätigte Termine | SP §3, ST-04 | OFFEN-EXTERN | `src/content/published/events.json` ist leer; Betrieb liefert |
| C23 | DE/EN/ES vollständig: Navigation, Inhalte, Fehler, Status, Metadaten, Formate, Share-Texte | SP §3.7 | ERFÜLLT | `tests/unit/i18n-sw.test.ts` „Sprachen“ (gleiche Schlüssel, Platzhalter, keine übernommenen deutschen Sätze), `core.spec.ts` „keine Mischsprache“ und Metadaten je Seite, Formate über `Intl` in `src/lib/time.ts`/`menu.ts` (`time-planner.test.ts` „formatiert Daten je Sprache“), Share-Texte in `flows.spec.ts` (ES, EN) |
| C24 | Muttersprachliche Freigabe EN/ES | AU §3, SP §3.7 | OFFEN-EXTERN | Prüfblatt `npm run i18n:review`, Anleitung `docs/15_TEXTREVIEW.md`; KI-Lektorat `docs/10_TEXTPRUEFUNG.md` ist keine Freigabe |
| C25 | Kein Gastkonto, kein Download-Zwang | SP §3 | ERFÜLLT | `tests/unit/scope-guards.test.ts` (kein Passwortfeld, kein Tracking); `docs/01_PRODUCT.md` „Grenzen“; Installation optional |
| C26 | Kein erfundener Live-Betrieb, keine Fake-Bewertungen, Preise, DJ-Termine, Buchungsbestätigungen | SP §3 | ERFÜLLT | Öffentlicher Build ohne Beispieldaten (`public.spec.ts`); `docs/03_ARCHITECTURE.md` JSON-LD ohne Zeiten/Preise/Bewertungen (`tests/build-output/csp-jsonld.test.ts`). Die Vorschau zeigt gekennzeichnete Beispiele (u. a. „DJ-Nacht“, „Beispiel“-Marke), nie öffentlich |
| C27 | Formular meldet Erfolg erst nach echter Übergabe | SP §3 | ERFÜLLT | `tests/e2e/inquiry-send.spec.ts` (Erfolg nur bei 2xx; 4xx, 5xx, Timeout, offline getrennt), `tests/unit/inquiry-send.test.ts`; Sendeweg AUS ohne bestätigten Endpunkt (`docs/03_ARCHITECTURE.md`) |
| C28 | Bestätigter betreuter Empfangskanal / echte Zustellung | SP §3, AU §8 | OFFEN-EXTERN | `docs/05_PLAN.md` Aufgabe 18, `docs/10_BETREIBER.md` Punkt 3; nicht geprüft: echter Endpunkt, echte Zustellung |
| C29 | Nur CHUCCA Playa de Palma, keine Hamburg-/Cala-Ratjada-Inhalte | ST-AGENTS, AU §7 | ERFÜLLT | `tests/unit/scope-guards.test.ts` („kein Inhalt aus Hamburg oder Cala Ratjada“) |

## D. Design
| ID | Anforderung | Quelle | Status | Beleg |
|---|---|---|---|---|
| D01 | Richtung: warme mediterrane Abendstimmung; Espresso/Pflaume, Creme, gezieltes Orange, Pink sparsam; als Hypothese, nicht als Brandbook | SP §4 | ERFÜLLT | `docs/02_DESIGN.md` (Kopfzeile nennt die umgesetzte Designhypothese; Farbtabelle), Tokens in `src/styles/global.css`, `docs/evidence/heute-de-1440.jpg` |
| D02 | Klare Hierarchie, Typografie, wechselnde Kompositionen, Rhythmus | SP §4 | ERFÜLLT | Design-Review und Sichtprüfungen in `docs/06_QA.md` („Reviews“, „Zweite Runde“); Screenshots in `docs/evidence/`. Urteil eines KI-Reviews, kein Nutzertest |
| D03 | Hochwertige Bildausschnitte (mit echten Fotos) | SP §4 | OFFEN-EXTERN | Nur Konzeptillustrationen vorhanden; Fotos fehlen (C19) |
| D04 | Höchstens zwei Schriftfamilien | SP §4 | ERFÜLLT | Fraunces und Instrument Sans (`src/styles/fonts.css`); `tests/unit/scope-guards.test.ts`, `tests/unit/fonts.test.ts` |
| D05 | Desktop eigenständig, Mobile kein zusammengeschobener Desktop | SP §4 | ERFÜLLT | `docs/02_DESIGN.md` „Layout“ (7/5-Raster, Randspalte, Leiste unten); `docs/evidence/heute-de-390.jpg` gegen `docs/evidence/heute-de-1440.jpg` |
| D06 | Haupthandlungen nicht hinter übergroßem Bild | SP §4 | ERFÜLLT | `core.spec.ts` „mobil: Hauptaktionen oberhalb der Falz“ (390 px; Ansicht bei 320 px: `docs/evidence/heute-es-320.jpg`) |
| D07 | Mockups `atmosphere.webp`/`drink.webp` nur Referenz; keine UI-Screenshots als Foto; Texte und Bedienelemente echt | SP §4, AU §3 P1 | ERFÜLLT | Beide Dateien nicht im Repo; Wächter `tests/unit/scope-guards.test.ts` („keine V3-Mockups“); `docs/07_DECISIONS.md` D05 |
| D08 | Keine austauschbare Kartenwand, keine Daueranimation, keine zufälligen Neonverläufe, keine Scrollsperre, keine Dekoration ohne Zweck | SP §4 | ERFÜLLT | Wächter für endlose Animation und `overflow: hidden` auf html/body in `tests/unit/scope-guards.test.ts`. Verläufe: ein 3-px-Linienakzent und Hintergrundlicht (`src/styles/global.css`), Muster mit Funktion als Trenner. Kartenwand/Zweck sind Designurteil (`docs/02_DESIGN.md` „Layout“) |
| D09 | Wenige präzise Übergänge, reduced motion respektieren | SP §4, ST-02 | ERFÜLLT | `core.spec.ts` „reduzierte Bewegung schaltet Übergänge ab“; `docs/02_DESIGN.md` „Bewegung“ |
| D10 | Fehlende Fotos stoppen nichts: gekennzeichnete Konzeptmotive in der Vorschau, keine Echtheitsbehauptung öffentlich | SP §4 | ERFÜLLT | `flows.spec.ts` Galerie („keine Aufnahmen aus dem Lokal“), `public.spec.ts`, `docs/02_DESIGN.md` „Bildregel“ |

## E. Technik, Daten, PWA, SEO
| ID | Anforderung | Quelle | Status | Beleg |
|---|---|---|---|---|
| E01 | Hosting und aktuelle stabile Versionen prüfen; Astro + TypeScript, vorgerendert, kleine interaktive Komponenten, CSS-Tokens; Abweichung begründen | SP §5 | ERFÜLLT | `docs/03_ARCHITECTURE.md`, `docs/07_DECISIONS.md` D03/D08, `docs/11_HOSTING.md`; Versionsprobe siehe B18 |
| E02 | Hosting-Ziel festlegen und Vorschau deployen | SP §5, ST-05 | OFFEN-EXTERN | `docs/05_PLAN.md` Aufgabe 13 BLOCKED (Entscheidung des Betriebs); lokal simulierte Header: `tests/e2e/headers.spec.ts` |
| E03 | Keine Abhängigkeit allein für einen visuellen Effekt | SP §5 | ERFÜLLT | Laufzeitabhängigkeiten nur Astro und Zod (`tests/unit/scope-guards.test.ts`) |
| E04 | Trennung von src, Komponenten, Content, Übersetzungen, Datenmodellen, Interaktionslogik, Build-Output | SP §5 | ERFÜLLT | `docs/03_ARCHITECTURE.md` „Struktur“; Regel „Browserskripte importieren kein Schema“ geprüft in `public.spec.ts` |
| E05 | Eine Lockdatei; reproduzierbare Start-/Build-/Checkbefehle | SP §5 | ERFÜLLT | `package-lock.json` (einzige, Wächter in `scope-guards.test.ts`), `README.md`, CI-Nachlauf im frischen Klon (`docs/06_QA.md`) |
| E06 | Alte Hash-Links sinnvoll abfangen | SP §5 | ERFÜLLT | `core.spec.ts` „alte V3-Links: Hash-Routen und gallery.html führen ans Ziel“; `tests/unit/i18n-sw.test.ts` „kennt die alten V3-Hash-Routen“ |
| E07 | Route und Auswahl beim Sprachwechsel erhalten | SP §5, ST-03 | TEILWEISE | `core.spec.ts` „Sprachwechsel bleibt auf derselben Seite und behält Filter und Geschmack“; `tests/e2e/degraded.spec.ts` (alle Seitenpaare ohne JavaScript) |
| E08 | Schema-validierte Inhalte; Vorschau/Testdaten strikt vom veröffentlichten Bestand getrennt | SP §5 | ERFÜLLT | `src/lib/content/schema.ts`, `src/content/fixtures/` getrennt von `src/content/published/`; `tests/unit/content-media.test.ts` („Betriebsmodi“, „Datenverträge“), `public.spec.ts` („Build enthält keine … Beispieldaten“) |
| E09 | Interne Bildrechte, Recherche, lokale Pfade nie komplett exportieren; explizite öffentliche Feldliste | SP §5, ST-04 | ERFÜLLT | `PUBLIC_MEDIA_FIELDS` in `src/lib/media.ts`; `content-media.test.ts` „exportiert ausschließlich die erlaubten Felder“; `public.spec.ts` durchsucht den Build. Es gibt keine `gallery.json`; `gallery.html` ist nur die V3-Weiterleitung |
| E10 | CMS/Backend nur soweit der Betriebsprozess es braucht | SP §5 | ERFÜLLT | `docs/07_DECISIONS.md` D15; Pflege per CSV/JSON (`docs/04_CONTENT_MEDIA.md` „Pflege“) |
| E11 | Getestete Madrid-/DST-Logik, gültige ICS, stabile Kalenderkennung bewahren | SP §5 | ERFÜLLT | `tests/unit/time-planner.test.ts` (DST-Lücke, doppelte Stunde, Kennung), `tests/unit/ics-independent.test.ts` (unabhängiger Parser node-ical, Faltung, Round-Trip), `flows.spec.ts` „stabile Kennung“ |
| E12 | Share-Abbruch, nicht verfügbare APIs, gesperrter Speicher | SP §5 | ERFÜLLT | `ics-share.test.ts` „Teilen“, `flows.spec.ts`, `tests/e2e/degraded.spec.ts` „Speicher gesperrt“, `core.spec.ts` „funktioniert bei gesperrtem Speicher“ |
| E13 | Private/authentifizierte Inhalte und Formulardaten nicht offline cachen | SP §5, ST-03 | ERFÜLLT | `tests/e2e/sw-browser.spec.ts` „speichert niemals HTML“ (Vorschau), `i18n-sw.test.ts` „fasst … Nicht-GET nicht an“; es gibt keine authentifizierten Inhalte |
| E14 | Öffentliche Offline-Inhalte nur mit klarer Aktualität und Cache-Update-Strategie | SP §5, ST-03 | ERFÜLLT | Update-Strategie belegt (`tests/e2e/sw-update.spec.ts`, `npm run test:sw-update`; network-first, Hinweis „Neu laden“). „Stand der Karte“ kommt aus `menuUpdatedText` (`src/lib/menu.ts`, genutzt in `src/components/DrinksView.astro`): Logik in `tests/unit/menu-updated.test.ts` (5 Tests), Einbindung im Browser in `tests/e2e/menu-fixture.spec.ts` gegen den Testbuild `dist-menu` (`npm run build:menu`, erfundene bestätigte Karte, Datum 2099-03-14): `data-menu-updated` mit lokalisiertem Satz in DE/EN/ES, Kalendertag in drei Zeitzonen stabil, ohne JavaScript vorhanden; in `dist`, `dist-public` und `dist-sub` kein Satz (Karte leer oder Beispielkarte). Grenze: belegt mit erfundenen Daten im Vorschau-Modus; ein öffentlicher Build mit echter Karte ist nicht prüfbar, solange `menu.json` `updatedAt: null` hat; der Hinweis „älter als 90 Tage“ besteht nur im Inhaltsbericht (`tests/unit/content-check.test.ts`), nicht auf der Seite |
| E15 | SEO: URLs, Titel, Beschreibungen, Canonicals, hreflang, Sitemap, korrekte strukturierte Daten | SP §5 | ERFÜLLT | `public.spec.ts` „SEO: Canonical, wechselseitige hreflang, x-default, strukturierte Daten“ und „Sitemap, robots und Manifest“, `tests/build-output/csp-jsonld.test.ts` |
| E16 | Private Vorschauen geschützt und noindex | SP §5, ST-03 | TEILWEISE | noindex belegt (Meta, `X-Robots-Tag`, `robots.txt`: `core.spec.ts`, `headers.spec.ts`). Zugangsschutz ist Sache des Hosts, es gibt keinen: OFFEN-EXTERN (`docs/11_HOSTING.md`) |
| E17 | Manifest, `start_url`, Basispfad, Deep Links am Host prüfen | AU §3 P2 | TEILWEISE | Unterpfad lokal belegt (`tests/e2e/subpath.spec.ts`, `tests/build-output/manifest.test.ts`); am echten Host OFFEN-EXTERN (Aufgabe 16) |
| E18 | PWA: Update, Offline-Wiederherstellung, alte Caches entfernen | ST-03 | ERFÜLLT | `sw-update.spec.ts`, `sw-browser.spec.ts`, `i18n-sw.test.ts` „räumt alte Caches (auch aus V3)“ |
| E19 | Native Phase separat planen (Nutzerwert, Plattformen, Projekt, Signierung, Geräte, Distribution); PWA, Wrapper, native App getrennte Lieferstände | SP Einleitung, §5, ST-03 | ERFÜLLT | `docs/12_NATIVE_PHASE.md`. Lücke beim Prüfen: es gab Kriterien und Optionen, aber keinen Ablauf; ergänzt als „Ausbauplan, falls ein Auslöser eintritt“ (Stufen N0–N5, bedingt, keine Entscheidung) |
| E20 | Entscheidung über native App und Gerätetests iPhone/Android | SP §6 | OFFEN-EXTERN | `docs/05_PLAN.md` Aufgaben 14 und 21 |

## F. Etappen, Prüfungen, Qualität
| ID | Anforderung | Quelle | Status | Beleg |
|---|---|---|---|---|
| F01 | Etappen A–E: Inventar/Baseline, Entscheidungen, Kernflow, Planer/Galerie/Events/Pflege, Feinschliff | SP §6 | ERFÜLLT | `docs/05_PLAN.md` Aufgaben 01–11 mit Evidenz; Lauf `npm run check` Exit 0 |
| F02 | Breiten 320/390/430/768/1440 px | SP §6, ST-02 | ERFÜLLT | `tests/e2e/breakpoint-sweep.spec.ts`, `core.spec.ts` „kein horizontales Scrollen bei … px“; Screenshots `docs/evidence/heute-es-320.jpg`, `heute-de-390.jpg`, `gruppe-en-430.jpg`, `heute-en-768.jpg`, `heute-de-1440.jpg` (am 13.11.2026 neu aufgenommen) |
| F03 | 200 % Zoom | SP §6 | ERFÜLLT | `core.spec.ts` „200 % Zoom (Reflow bei 320 CSS-Pixel Breite …)“, `tests/e2e/a11y-extra.spec.ts` |
| F04 | Tastatur, sichtbarer Fokus | SP §6 | ERFÜLLT | `tests/e2e/keyboard.spec.ts`, `a11y-extra.spec.ts` („Fokus nicht verdeckt“), `core.spec.ts` |
| F05 | Kontrast | SP §6 | ERFÜLLT | axe (WCAG 2.2 A/AA) auf allen Seiten in `core.spec.ts`; `tests/e2e/a11y-modes.spec.ts` (Kontrastmodus). Kein Zertifikat (siehe F10) |
| F06 | Safe Areas | SP §6 | TEILWEISE | Regeln im CSS (`env(safe-area-inset-*)` in `src/styles/global.css`, `viewport-fit=cover`); neu `tests/e2e/safe-areas.spec.ts` prüft mit der Chromium-Insets-Emulation Hoch- und Querformat, Leiste, Bildansicht, Toast. Emulation, nicht iOS: Gerätetest OFFEN-EXTERN (`docs/14_GERAETETEST.md`) |
| F07 | Reduced motion | SP §6 | ERFÜLLT | siehe D09 |
| F08 | WCAG 2.2 AA als Ziel, keine behauptete Zertifizierung | SP §6, ST-06 | ERFÜLLT | `docs/06_QA.md` Kopf (Kopfabsatz: automatisierte Prüfungen begründen keine WCAG-Zertifizierung), `docs/08_HANDOFF.md` „Nicht behaupten“; Screenreader NOT RUN |
| F09 | Typecheck, Lint, Build, Unit/Integration/Browser-Tests | SP §6 | ERFÜLLT | `npm run check` (Befehlskette in `package.json`) |
| F10 | Altchecks zuerst als Regression erhalten | SP §6 | ERFÜLLT | `docs/00_STATE.md` „Was aus V3 portiert wurde“ mit Zuordnung zu Tests (`time-planner.test.ts`, `content-media.test.ts` „V3-Regression“) |
| F11 | Test von DST, Kalender, Sprachen, Gallery-Export, Formularzuständen | SP §6 | ERFÜLLT | siehe E11, C23, E09, C14 und C27 |
| F12 | Browser-Screenshots aller Kernseiten und relevanter Zustände; sichtbare Probleme beheben | SP §6, ST-06 | ERFÜLLT | 25 Dateien in `docs/evidence/` (Seiten in drei Sprachen und fünf Breiten, öffentlicher Build, Zustände: Planerfehler, manuelles Kopieren, vorbereitete Nachricht, Bildansicht mobil/Desktop, Termine, Alkoholfrei, Nulltreffer, 404). **Lücke beim Prüfen:** die 18 älteren Bilder stammten vom 11.11. (vor zwei Review-Runden) und es fehlten Fehler-, Bildansicht- und Terminzustände; alle am 13.11.2026 mit `scripts/screenshot-states.mjs` neu erzeugt |
| F13 | Ladegewichte und Performance reproduzierbar messen | SP §6 | ERFÜLLT | `scripts/measure.mjs`, `tests/build-output/budgets.test.ts`, Lighthouse-Einstellungen in `docs/06_QA.md` „Lighthouse (Labor, 12.11.2026)“ |
| F14 | Ziele LCP ≤ 2,5 s, CLS ≤ 0,1 (Labor ausgewiesen, nicht als Felddaten) | SP §6 | ERFÜLLT | `docs/06_QA.md` „Labormessung“ (LCP unter 1,3 s bei gedrosselter Verbindung, CLS ≤ 0,012) |
| F15 | Ziel INP ≤ 200 ms; Feldwerte nicht aus Labor ableiten | SP §6, ST-06 | TEILWEISE | Neu `scripts/measure-inp.mjs` (Event-Timing im Labor, CPU 4× gedrosselt, 12 echte Eingaben auf vier Seiten): längste Interaktion 64–80 ms in zwei Läufen (Ergebnis in `docs/06_QA.md`). Das ist **kein INP**: Felddaten am 75. Perzentil gibt es nicht, OFFEN-EXTERN |
| F16 | Physische iOS-/Android-Installation und Kalenderimport als geprüft oder offen ausweisen | SP §6 | ERFÜLLT | als NOT RUN ausgewiesen: `docs/06_QA.md` „Nicht geprüft“, `docs/05_PLAN.md` Aufgabe 14 |
| F17 | Gerätetests iPhone/Android inkl. In-App-Browser durchführen | SP §6, AU §6 | OFFEN-EXTERN | Protokoll vorbereitet (`docs/14_GERAETETEST.md`), nichts ausgeführt |
| F18 | Kritische Reviews | AUF | ERFÜLLT | `docs/06_QA.md` „Reviews“, „Zweite Runde“, „Aufräum-Review“ (reale Subagent-Läufe, keine Fremdmodelle); Mutationstests 96,35 % und Fuzzing dort |
| F19 | CI/Reproduzierbarkeit im frischen Klon | SP §6 | ERFÜLLT | `docs/06_QA.md` „CI-Nachlauf im frischen Klon“; ein GitHub-Actions-Lauf wurde nicht abgefragt (dort vermerkt) |
| F20 | Cross-Browser | AUF | ERFÜLLT | `npm run test:e2e:cross` (Firefox, WebKit), Ergebnis `docs/06_QA.md` „Browserübergreifend“; Playwright-WebKit ist nicht iOS-Safari |

## Zusammenfassung
Zählung der Statusspalten dieses Dokuments (Skript siehe Abschnitt „Pflege“); Lauf `npm run check` am 13.11.2026 vor und nach den Ergänzungen, Zahlen in `docs/06_QA.md`.

| Status | Anzahl |
|---|---|
| ERFÜLLT | 99 |
| TEILWEISE | 5 (A07, E16, E17, F06, F15) |
| OFFEN-EXTERN | 10 |
| NICHT ERFÜLLT | 0 |
| zusammen | 114 |

## Lücken im Überblick
**OFFEN-EXTERN (nichts davon ist von uns zu erfinden):** echte Karte und Preise (C09), Betreiberbestätigung (C13), freigegebene Fotos (C19, D03), echte Termine (C22), muttersprachliche Freigabe (C24), betreuter Empfangskanal und echte Zustellung (C28), Hosting, Domain, Zugangsschutz (E02, E16), Host-Prüfung von Manifest und Header (E17), native Entscheidung (E20), Gerätetests und Geräte-Safe-Areas (F06, F17), Feld-INP (F15), Autorisierung für einen PR (A07).

**TEILWEISE:** A07 (PR: Autorisierung), E16 und E17 (Host), F06 (Gerät), F15 (Felddaten) haben den Rest außerhalb des Repos. E14 ist ERFÜLLT: „Stand der Karte“ ist als Logik (`tests/unit/menu-updated.test.ts`) und als Einbindung im Browser (`tests/e2e/menu-fixture.spec.ts`, Testbuild `dist-menu`) belegt; ehrliche Grenze: mit erfundenen Daten im Vorschau-Modus, nicht mit einer echten Karte im öffentlichen Build.

**Beim Prüfen gefundene und geschlossene Lücken:** Verantwortliche in `docs/04_CONTENT_MEDIA.md` (B08); Browserzustand der Termine ungetestet (C21, `tests/e2e/events.spec.ts`); Navigationsaussage der leeren Galerie nicht geprüft (C18); keine Safe-Area-Prüfung (F06, `tests/e2e/safe-areas.spec.ts`); kein Lab-Wert für Interaktionslatenz (F15, `scripts/measure-inp.mjs`); veraltete Screenshots und fehlende Zustandsbilder (F12); Bauplan der Native-Phase ohne Ablauf (E19); veraltete Testzahlen im Handoff (A13); versionierte Testausgabe `.vitest/json/output.json` aus dem Repo entfernt und ignoriert; statische Wächter für Verbote (`tests/unit/scope-guards.test.ts`).

## Pflege
Nach jeder Änderung an Auftrag oder Umfang diese Tabellen anpassen und `npm run docs:check` laufen lassen (prüft Pfade, Skripte, Variablen). Statuswörter bleiben genau: ERFÜLLT, TEILWEISE, OFFEN-EXTERN, NICHT ERFÜLLT. Zählung:
`grep -oE '\| (ERFÜLLT|TEILWEISE|OFFEN-EXTERN|NICHT ERFÜLLT) \|' docs/16_ANFORDERUNGEN.md | sort | uniq -c`
