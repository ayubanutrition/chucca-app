# Go-Live-Runbook: von der Vorschau zum öffentlichen Betrieb

**Status: vorbereitet, nichts davon ausgeführt.** Stand 16.11.2026, Basis `24dcb25`. Kein Host, keine Domain, keine Betreiberdaten, keine Gerätetests, keine Textdurchsicht: Alle Schritte unten stehen auf NOT RUN, bis jemand sie ausführt und das Ergebnis in die genannten Dokumente einträgt. Das Dokument erfindet nichts; wo eine Angabe vom Hersteller eines Hosts stammt, steht „Herstellerangabe, ungeprüft“.

Es verbindet die offenen Lieferungen aus `docs/05_PLAN.md` (Aufgaben 12, 13, 14, 15, 16, 17, 18, 20) zu einer Reihenfolge mit Abhängigkeiten, Prüfbefehlen und Abbruchkriterien. Die Inhalte der Lieferungen stehen weiter dort, wo sie führend sind: Betreiberunterlage `docs/10_BETREIBER.md`, Header und Hosts `docs/11_HOSTING.md`, Geräteprotokoll `docs/14_GERAETETEST.md`, Textdurchsicht `docs/15_TEXTREVIEW.md`, Rückverfolgung `docs/16_ANFORDERUNGEN.md`, Prüfstand `docs/06_QA.md`.

## Regeln für dieses Runbook
- Jeder Befehl läuft im Repo-Wurzelordner nach `npm ci`. Parallele Worktrees trennen ihre Testserver mit `PORT_BASE` (z. B. `PORT_BASE=12500`); Playwright braucht einmal `npx playwright install chromium`.
- „Abbruch“ heißt: stoppen, Ursache klären, nicht überbrücken und nicht „trotzdem“ veröffentlichen. Ein Abbruch an einem Schritt blockiert nur die davon abhängigen Schritte (Graph unten).
- Kein Schritt hier verlangt Zugangsdaten im Repo, in URLs, Screenshots oder Logs (`AGENTS.md`). Zugänge zum Host liegen beim Hosting-Admin.
- Ein Commit ist kein Push, ein Push ist kein Deployment (`AGENTS.md`). Das Deployment der öffentlichen Fassung ist eine eigene, ausdrücklich autorisierte Handlung.
- Rollen: **Betrieb** (Inhaberin/Inhaber bzw. Betriebsleitung), **Betreuung** (Person mit Repo-Zugriff, trägt ein und baut), **Hosting-Admin** (richtet Host, Domain, Header ein; kann Betreuung oder Dienstleister sein), **Prüfperson** (Geräte, Muttersprache EN/ES), **Recht** (Impressum, Datenschutz; liefert der Betrieb bzw. eine Juristin/ein Jurist, wir schreiben und prüfen sie nicht).

## 1. Reihenfolge und Abhängigkeiten

```
G0 Ausgangsstand ──► G1 Betreiberdaten (12) ──► G2 content:check + lokale Vorschau
                                                      │
                          G3 Hosting-Entscheidung (13) ◄┘   (G3 hängt nicht an G1; die Entscheidung
                                    │                         kann früher fallen, die URL braucht G1 nicht)
                                    ▼
                     G4 Host, Domain, HTTPS, Header, CSP; Vorschau dort (13, 15, 16)
                       │                │                          │
                       ▼                ▼                          ▼
           G5a Gerätetests (14)   G5b Textdurchsicht (17)   G6 Anfragekanal (18)
                       │                │                   (braucht G1 und die URL aus G4)
                       └───────┬────────┘                          │
                               ▼                                   │
                  G7 QR-Aufsteller vorbereiten (20)  ◄─────────────┘
                  (braucht G4 und bestätigte Karte aus G1)
                               ▼
                  G8 Freigabe-Checkliste (Abschnitt 3) und Betreiber-Freigabe
                               ▼
                  G9 erster öffentlicher Build, Deployment, Smoke-Test, QR drucken
```

Parallel möglich: G5a und G5b (und G6, soweit der Betrieb liefert). Reihenfolgezwang: G1 vor G2; G3 vor G4; G4 vor G5a, G6, G7 (alle brauchen die echte URL); G8 erst, wenn G5a, G5b, G6, G7 entweder fertig oder bewusst als offen angenommen sind (Entscheidung 2.4).

Die Schritte im Einzelnen. „Danach pflegen“ nennt, welche Dokumente die ausführende Person im selben Zug ändert; Testzahlen nennt nur `docs/06_QA.md` (mit Datum und Lauf), Status der Aufgaben nur `docs/05_PLAN.md` und `docs/16_ANFORDERUNGEN.md`.

### G0 · Ausgangsstand prüfen
- **Wer:** Betreuung.
- **Befehle:** `git status --short` (leer erwartet), `git log -1 --format=%h` (Stand notieren), `npm ci`, dann `npm run check; echo "exit=$?"`.
- **Erwartet:** `exit=0`. Zahlen weichen von `docs/06_QA.md` nur bei neuen Tests ab; wer sie ändert, trägt sie dort mit Datum ein.
- **Abbruch:** Exit ungleich 0, oder nicht eingecheckte Änderungen, die niemand erklären kann. Erst beheben, nicht weiterbauen.
- **Danach pflegen:** nichts, wenn der Stand unverändert grün ist.

### G1 · Betreiberdaten einholen und eintragen (Aufgabe 12)
- **Wer liefert was:** Betrieb liefert die Punkte 1 bis 8 aus `docs/10_BETREIBER.md` (Adresse/Eingang bestätigt, Zeiten, Kanäle, Karte als CSV, Termine, Fotos mit Nutzungserlaubnis und Einwilligungen, Rechtstexte, Marke) **schriftlich**. Recht liefert Impressum und Datenschutzhinweis. Betreuung trägt ein.
- **Befehle (nur für Teile, die geliefert sind):**
  - Karte: `npm run menu:import -- karte.csv` (Vorschau, schreibt nichts), dann `npm run menu:import -- karte.csv --out src/content/published/menu.json`.
  - Zeiten, Kanal, Termine, Fotos: von Hand in `src/content/published/venue.json`, `src/content/published/events.json`, `src/content/media/catalogue.json`; Feldregeln `docs/04_CONTENT_MEDIA.md`, Abschnitt „Pflege“. Jede Angabe mit `status: "confirmed"` braucht `source` (Beleg) und `observedAt` (Datum).
  - Prüfen: `npm run content:check` (siehe G2).
- **Erwartet:** Jeder eingetragene Teil schaltet nur seinen Bereich frei; was fehlt, bleibt „noch nicht bestätigt“ (`docs/10_BETREIBER.md`, Einleitung). Der Datenweg wurde am 12.11.2026 mit erfundenen Wegwerfdaten Ende-zu-Ende gefahren (`docs/08_HANDOFF.md`), mit echten Daten noch nie.
- **Abbruch:** Angabe ohne schriftliche Bestätigung des Betriebs; Foto ohne Nutzungserlaubnis oder ohne Einwilligung erkennbarer Personen; Kanal ohne Zusage, ihn zu betreuen. Solche Angaben bleiben `proposal` oder `unknown` (nichts erfinden, `AGENTS.md`).
- **Offene Lücke, nicht technisch lösbar:** Rechtstexte liegen nicht im Repo (`npm run content:check` meldet das als Hinweis, nicht als Fehler). Ob ein öffentlicher Betrieb ohne sie vertretbar ist, entscheidet der Betrieb mit Rechtsberatung; dieses Runbook trifft diese Entscheidung nicht (Entscheidung 2.4).
- **Danach pflegen:** `docs/05_PLAN.md` Zeile 12 (Evidenz: Datum, Befehl, welche Teile echt sind), `docs/16_ANFORDERUNGEN.md` (C09, C13, C19, C22 je nach Teil; Zählung neu mit dem Befehl aus deren Abschnitt „Pflege“), `docs/04_CONTENT_MEDIA.md` (Faktenregister), `docs/06_QA.md` (nur Zahlen, die sich ändern, mit Datum).

### G2 · Inhaltsprüfung und lokale Vorschau
- **Wer:** Betreuung baut, Betrieb sichtet.
- **Befehle:** `npm run content:check; echo "exit=$?"`, dann `npm run build && npm run serve` (Vorschau unter `http://127.0.0.1:4321/`), optional `node scripts/screenshot-states.mjs` für Belegbilder.
- **Erwartet:** `exit=0`; Abschnitt „Was blockiert den öffentlichen Build?“ meldet „Nichts“; Abschnitt „Was fehlt im öffentlichen Auftritt“ listet genau das, was der Betrieb noch nicht geliefert hat (Zeilen, die nicht mehr erscheinen, sind eingetragen). Der Betrieb sieht die Vorschau auf Bildschirm oder Handy und gibt Rückmeldung (`docs/10_BETREIBER.md`, Abschnitt „Wie läuft es danach?“). Die Vorschau enthält weiterhin gekennzeichnete Beispiele für noch fehlende Teile; sie sind nicht Teil der öffentlichen Fassung.
- **Abbruch:** Fehler (✖) in `content:check`; der Betrieb widerspricht einer Angabe.
- **Danach pflegen:** `docs/05_PLAN.md` Zeile 12; Korrekturen laufen zurück nach G1.

### G3 · Hosting-Entscheidung (Aufgabe 13, Teil 1)
- **Wer:** Betrieb entscheidet; Betreuung legt die Vorlage 2.1 und 2.2 vor.
- **Befehle:** keine.
- **Erwartet:** schriftliche Entscheidung zu Hosting-Ziel, Domain/Subdomain oder Unterpfad, Vorschau-Schutz (Abschnitte 2.1, 2.2, 2.5). Die Domain-Form steht fest, bevor ein QR-Code entsteht (G7), weil ein Wechsel der Domain nach dem Druck jeden Aufsteller entwertet.
- **Abbruch:** keine Entscheidung. Dann bleibt alles ab G4 BLOCKED; G1, G2, G5b laufen weiter.
- **Danach pflegen:** `docs/07_DECISIONS.md` (neue Entscheidungsnummer mit Optionen und Grund), `docs/05_PLAN.md` Zeile 13, `docs/16_ANFORDERUNGEN.md` (E02).

### G4 · Host, Domain, HTTPS, Header, CSP, Vorschau auf dem Host (Aufgabe 13, 15, 16)
- **Wer:** Hosting-Admin richtet ein; Betreuung baut und prüft.
- **Befehle:**
  1. Vorschau-Fassung bauen (noindex, mit Beispielen): `CHUCCA_SITE_URL=https://<Vorschau-Host> npm run build` (bei Unterpfad zusätzlich `CHUCCA_BASE=/pfad/`). Der Ordner `dist/` wird hochgeladen; der Upload-Weg ist hostabhängig und nicht Teil des Repos.
  2. Die Header des Hosts gegen `docs/11_HOSTING.md` einrichten. Auf Hosts ohne `_headers`-Unterstützung die erzeugte CSP-Zeile bei **jedem** Deployment neu aus der erzeugten Datei übernehmen (die Hashes ändern sich mit dem Build).
  3. `node scripts/smoke-live.mjs https://<Vorschau-Host>/ --mode preview` (Abschnitt „Smoke-Test“ unten).
  4. Von Hand: `curl -sI https://<Vorschau-Host>/de/`, `curl -sI https://<Vorschau-Host>/sw.js`, `curl -sI https://<Vorschau-Host>/_astro/<Datei>` (Dateiname aus dem Quelltext der Seite); eine Seite in Chromium mit offener Konsole.
  5. Aufgabe 15 auf dem Host: Service-Worker-Update mit zwei Ständen von Hand (Schrittfolge in Abschnitt 5, Punkt „SW-Update“); lokal belegt durch `npm run test:sw-update`, auf einem Host nie ausgeführt.
  6. Aufgabe 16: Manifest, `start_url`, Deep-Links und 404 am Host; `scripts/smoke-live.mjs` deckt Manifest, Start-URL, Scope und 404-Status ab. Die Browserfälle aus `tests/e2e/subpath.spec.ts` lassen sich nicht gegen eine fremde URL richten (die Konfiguration kennt nur lokale Ursprünge); sie bleiben lokal DONE, am Host zählt der Smoke-Test plus G5a.
- **Erwartet:** Smoke-Test Exit 0; `curl` zeigt `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Robots-Tag: noindex, nofollow`, `Cache-Control: no-cache` auf HTML und `sw.js`, `immutable` auf `_astro`; HTTPS erzwungen; unbekannter Pfad liefert Status 404; keine CSP-Verstöße in der Konsole.
- **Abbruch:** CSP fehlt oder passt nicht zu den Hashes (Seite funktioniert dann nicht); `sw.js` wird gecacht (Updates kommen nie an); 404 liefert Status 200; Vorschau ist indexierbar. Nicht öffentlich schalten, Header korrigieren, Schritt wiederholen.
- **Danach pflegen:** `docs/05_PLAN.md` Zeilen 13, 15, 16 (Evidenz: Befehl, Datum, Host-Art, nicht die URL, falls sie nicht öffentlich werden soll); `docs/06_QA.md` Abschnitt „Nicht geprüft“ (Zeilen „Deployment, echte URL, Cache-Header auf einem Host“ und „CSP in echtem Safari, Verhalten hinter CDN/Proxy“ nur ändern, was wirklich gelaufen ist); `docs/16_ANFORDERUNGEN.md` (E02, E16, E17); `docs/11_HOSTING.md` (was am echten Host anders war; Herstellerangaben, die sich bestätigt haben, als „geprüft am …“ kennzeichnen).

### G5a · Gerätetests (Aufgabe 14), parallel zu G5b
- **Wer:** Prüfpersonen mit iPhone (Safari, Standalone, Instagram-, WhatsApp-In-App) und Android (Chrome); Betreuung wertet aus.
- **Befehle:** keine im Repo; die Prüfperson folgt `docs/14_GERAETETEST.md` gegen die Vorschau-URL aus G4 und füllt `docs/templates/geraetetest-ergebnis.csv` aus. Auswertung: `docs/14_GERAETETEST.md`, Abschnitt „Auswertung durch die Betreuung“.
- **Erwartet:** Pflichtgeräte G1 bis G5 des Protokolls ausgefüllt (nicht zu verwechseln mit den Schritten G0 bis G9 hier). Funde werden behoben und die betroffenen Schritte wiederholt.
- **Abbruch:** ein Fund der Schwere „blockiert“ (Seite nicht bedienbar, Daten falsch, Installation unmöglich) bleibt offen. Fehlt ein Pflichtgerät, bleibt Aufgabe 14 BLOCKED; ein Go mit dieser Lücke ist nur nach Entscheidung 2.4 zulässig und wird in den Dokumenten als NOT RUN ausgewiesen.
- **Danach pflegen:** `docs/05_PLAN.md` Zeile 14 (DONE erst mit ausgefüllten Pflichtgeräten), `docs/06_QA.md` Abschnitt „Nicht geprüft“ (Zeilen zu iPhone/Android und In-App-Browsern), `docs/16_ANFORDERUNGEN.md` (F17, F06, E20), `docs/12_NATIVE_PHASE.md` (Auslöser neu bewerten, Aufgabe 21).

### G5b · Muttersprachliche Textdurchsicht EN/ES (Aufgabe 17), parallel zu G5a
- **Wer:** je eine muttersprachliche Prüfperson EN und ES; Betreuung erzeugt das Blatt und arbeitet ein.
- **Befehle:** `npm run i18n:review` (schreibt nach `reports/i18n-review/`, nicht im Repo versioniert), nach Einarbeitung erneut, dazu `npm test`.
- **Erwartet:** Rückmeldungen je Zeile; alle „nein“ eingearbeitet oder begründet abgelehnt; `docs/10_TEXTPRUEFUNG.md` nennt, wer wann welchen Umfang geprüft hat. Regeln: `docs/15_TEXTREVIEW.md`, Teil 5.
- **Abbruch:** Änderung an Platzhaltern oder Schlüsseln (bricht `tests/unit/i18n-sw.test.ts`); Formulierung, die wie eine Reservierungszusage klingt. Das KI-Lektorat ersetzt die Durchsicht nicht.
- **Danach pflegen:** `docs/05_PLAN.md` Zeile 17, `docs/10_TEXTPRUEFUNG.md`, `docs/16_ANFORDERUNGEN.md` (C24), `docs/06_QA.md` (Zahlen, falls Texte Tests ändern).

### G6 · Anfragekanal (Aufgabe 18)
- **Wer:** Betrieb entscheidet und liefert (Dienst, Adresse, CORS-Freigabe für die Herkunft aus G4, Betreuungszusage, Datenschutztext, Kontaktfeld-Entscheidung; `docs/10_BETREIBER.md`, Punkt 3); Betreuung trägt ein.
- **Befehle:** Eintrag `inquiryEndpoint` in `src/content/published/venue.json` (Felder und Regeln `docs/04_CONTENT_MEDIA.md`, Abschnitt „Pflege“), dann `npm run content:check` und `npm run check; echo "exit=$?"`. Ohne Sendeweg (Entscheidung 2.3, Option A oder B): nichts zu tun, der Standard bleibt „vorbereitete Nachricht“.
- **Erwartet:** Der Build öffnet die CSP für genau einen Host (`connect-src` und `form-action`); mit Hosts ohne `_headers` muss die CSP-Zeile neu übernommen werden (G4, Punkt 2). Ein Test gegen den **echten** Dienst (eine Anfrage, vom Betrieb vorab ausdrücklich erlaubt und als Test gekennzeichnet; vorher `AGENTS.md`, „Zusammenarbeit“, Autorisierung) zeigt: Annahme nur bei 2xx, Zustellung beim Betrieb bestätigt, CORS-Antwort richtig.
- **Abbruch:** Dienst ohne schriftliche Betreuungszusage; kein Datenschutztext (die Seite zeigt dann den markierten Platzhalter, der nicht öffentlich bleiben darf); Dienst antwortet 2xx ohne Ablage; Weiterleitung (3xx).
- **Danach pflegen:** `docs/05_PLAN.md` Zeile 18, `docs/16_ANFORDERUNGEN.md` (C28), `docs/06_QA.md` Abschnitt „Nicht geprüft“ (Zeile „Echte Anfrage … Anfrage-Endpunkt“), `docs/11_HOSTING.md`, falls die CSP-Ausnahme aktiv wird.

### G7 · QR-Aufsteller vorbereiten (Aufgabe 20)
- **Wer:** Betreuung erzeugt, Betrieb wählt Kurz-URL und Druck, Prüfperson scannt.
- **Voraussetzungen:** Domain steht fest (G3, G4); Karte vom Betrieb bestätigt (G1), sonst zeigt die Drinks-Seite „Die bestätigte Karte folgt“ und bleibt `noindex`; Kurz-URL (optional, ohne Tracking-Parameter) leitet auf die Drinks-Seite weiter.
- **Befehl:** `node scripts/qr-link.mjs https://<Domain>/<Unterpfad-falls-vorhanden> de --out <Datei>.svg` (ebenso `en`, `es`); mit Kurz-URL als drittem Argument. Details `docs/10_BETREIBER.md`, Abschnitt „QR-Code für den Aufsteller“.
- **Erwartet:** Ausgabe nennt den Deep-Link (`…/de/drinks/`, `…/en/drinks/`, `…/es/bebidas/`); SVG ohne externe Verweise. Der Deep-Link muss am Host Status 200 liefern (G9, Smoke-Test).
- **Abbruch:** Link führt auf `noindex`-Platzhalterseite, obwohl der Betrieb die Karte als bestätigt führt (Eintrag prüfen); Domain ändert sich später. **Nicht drucken**, bevor G9 abgeschlossen ist.
- **Danach pflegen:** `docs/05_PLAN.md` Zeile 20 (DONE erst nach Scan-Test mit echtem Gerät an der Live-URL und gedrucktem Muster, Material und Größe genannt), `docs/16_ANFORDERUNGEN.md`, `docs/10_BETREIBER.md` nur bei geänderter Anleitung.

### G8 · Freigabe
Abschnitt 3 vollständig durchgehen; dazu die schriftliche Freigabe des Betriebs (`docs/10_BETREIBER.md`, Abschnitt „Wie läuft es danach?“, Schritt 4: ausdrücklich, dass alle Angaben stimmen und Fotos und Texte veröffentlicht werden dürfen). Ohne beides kein G9.

### G9 · Erster öffentlicher Build, Deployment, Smoke-Test
- **Wer:** Betreuung baut; Hosting-Admin deployt (ausdrücklich autorisiert); Betreuung prüft live.
- **Befehle:** Abschnitt 3, Punkte 4 und 14 bis 16.
- **Erwartet:** `node scripts/smoke-live.mjs https://<Domain>/` Exit 0, Warnungen gelesen und begründet; Sitemap bei der Suchmaschine einzureichen ist Sache des Betriebs (nicht Teil des Repos).
- **Kurzwiederholung am öffentlichen Host:** Schritte A und I aus `docs/14_GERAETETEST.md` auf einem iPhone (G1) und einem Android-Gerät (G5), weil G5a gegen die Vorschau-Fassung lief und die öffentliche Fassung andere Inhalte und einen anderen Service-Worker-Cache hat.
- **Abbruch/Rückfall:** Abschnitt 4.
- **Danach pflegen:** `docs/05_PLAN.md` (neue Zeile für den Go-Live mit Datum, Commit und Smoke-Ergebnis), `docs/08_HANDOFF.md` („Wo es läuft“, „Nicht behaupten“), `docs/06_QA.md` (Smoke-Lauf live, Datum), `docs/16_ANFORDERUNGEN.md` (E02, E16, E17), `docs/00_STATE.md` (Iststand).

## 2. Entscheidungsvorlagen

Grundlage ist `docs/11_HOSTING.md`. **Geprüft** ist dort nur: Der Build erzeugt `_headers` hostneutral, und `scripts/serve.mjs` simuliert sie so, dass `tests/e2e/headers.spec.ts` Header und CSP im Browser prüft. **Nicht geprüft** ist alles, was ein echter Host tut. Keine Option hier wurde auf einem echten Host ausprobiert; Preise und Vertragsbedingungen wurden nicht recherchiert und stehen deshalb nicht da.

### 2.1 Hosting-Ziel
| Option | Header-Weg | Was im Repo vorliegt | Folgen / offene Punkte |
|---|---|---|---|
| A · Netlify oder Cloudflare Pages (statisch) | erzeugte `_headers` unverändert deployen | `_headers` wird gebaut und lokal simuliert. Dass beide Hosts die Datei selbst lesen, ist **Herstellerangabe, ungeprüft**. Cloudflare-Limits (100 Regeln, 2000 Zeichen je Zeile) ebenfalls Herstellerangabe, Stand nicht erneut abgefragt; die längste Zeile (CSP) hatte bei der Messung in `docs/11_HOSTING.md` 509 Zeichen | Geringster Konfigurationsaufwand: keine Übersetzung, CSP-Hashes kommen mit dem Build. Zugangsschutz für die Vorschau ist eine Funktion des Anbieters (Herstellerangabe, ungeprüft); das Repo hat keinen. Abhängigkeit von einem Anbieter und dessen Datenverarbeitung: gehört in den Datenschutzhinweis (Recht) |
| B · Vercel | `vercel.json` aus `docs/11_HOSTING.md` | Vorlage vorhanden, **nicht gegen einen echten Host geprüft**; sie übersetzt die erzeugte `_headers` | CSP-Zeile und Permissions-Policy müssen bei jedem Deployment aus der erzeugten Datei übernommen werden (CI-Schritt nötig, im Repo nicht vorhanden). Rest wie A |
| C · eigener Server mit nginx | Include-Datei aus `docs/11_HOSTING.md` | Vorlage vorhanden, **nicht geprüft** | Betreiber des Servers zuständig für HTTPS, HSTS, Updates, Backups; CSP-Übernahme je Deployment wie B; mehr Verantwortung, am meisten Kontrolle |
| D · Unterpfad einer bestehenden Domain | wie A bis C, mit `CHUCCA_BASE=/pfad/` | Unterpfad lokal geprüft (`tests/e2e/subpath.spec.ts`, `dist-sub`); am Host nicht | `robots.txt` im Unterpfad wird von Suchmaschinen nicht gelesen (der Build warnt); `_headers` für einen Unterpfad braucht bei A eine eigene Site oder Regeln mit Präfix; Domainwechsel später = Neubau, neue Canonicals, neue QR-Codes |

Empfehlung der Betreuung (Folgerung aus dem Repo-Stand, kein Test): A oder B bei vorhandener eigener Domain; C nur, wenn der Betrieb ohnehin einen Server betreibt. Entscheidet der Betrieb anders, ändert sich nur der Header-Weg, nicht der Build.

### 2.2 Domain und URL-Form
- **Eigene Domain oder Subdomain** (empfohlen, weil `robots.txt`, Sitemap und Manifest dann an der Wurzel liegen). Folge: `CHUCCA_SITE_URL=https://<Domain>` im Build; `CHUCCA_BASE` bleibt leer.
- **Unterpfad** (Option D oben). Folge: `CHUCCA_BASE` setzen, `robots.txt` greift nicht, Manifest-`scope` folgt dem Pfad.
- **Irreversibel nach Druck:** Wird die URL in QR-Codes gedruckt (G7), kostet ein Wechsel Neudruck oder eine dauerhafte Weiterleitung der alten Adresse.
- HSTS: Wert und Zeitpunkt gehören zur Domain-Entscheidung; ein zu lang gesetzter Wert lässt sich nicht zurücknehmen (Herstellerangabe zum Browserverhalten, ungeprüft). Erst setzen, wenn HTTPS auf allen Unterdomains zuverlässig läuft.

### 2.3 Anfragekanal
| Option | Wirkung | Voraussetzung |
|---|---|---|
| A · Kein Anfrageweg | Seite zeigt Lage und Zeiten; Treffplan bleibt „vorbereitete Nachricht“ zum Kopieren | keine |
| B · Bestätigter Kanal als Link (z. B. Instagram, E-Mail) | Link unter der vorbereiteten Nachricht (`acceptsInquiries: true` beim Kanal) | schriftliche Zusage des Betriebs, den Kanal zu betreuen; Kanal `confirmed` mit Quelle und Datum |
| C · Sendeweg (`inquiryEndpoint`) | Anfrage geht direkt an einen Dienst; Erfolg erst nach 2xx | alles aus `docs/10_BETREIBER.md`, Punkt 3: Dienst, Adresse, CORS, Zusage, Datenschutztext, Entscheidung zum Kontaktfeld; CSP-Ausnahme für genau einen Host |

Folgen: C ist die einzige Option, bei der die Website Daten von Gästen überträgt; sie ist bislang nur gegen einen Mock geprüft (`docs/06_QA.md`). Ohne Kontaktfeld kann der Betrieb Anfragen lesen, aber nicht beantworten. In allen Fällen gilt: Ein Treffplan ist keine Reservierung.

### 2.4 Go mit offenen Punkten oder warten
| Offener Punkt | Go ohne ihn | Folge |
|---|---|---|
| Gerätetests (G5a) | möglich als bewusste Entscheidung des Betriebs; technisch blockiert nichts | Die Seite ist nur im Labor und in Playwright-Engines geprüft (`docs/06_QA.md`); iOS-Safari, In-App-Browser, Safe Areas am Gerät sind unbekannt. Dokumente führen die Lücke weiter als NOT RUN; keine „Geräteabnahme“ behaupten |
| Textdurchsicht EN/ES (G5b) | möglich | Texte sind nur KI-lektoriert; Fehler in zwei von drei Sprachen möglich. „Freigabe“ nicht behaupten |
| Echte Karte | möglich | Seite zeigt „Die bestätigte Karte folgt“, Drinks bleibt `noindex`, kein QR-Druck |
| Zeiten, Fotos, Termine | möglich | Bereiche zeigen „noch nicht bestätigt“ bzw. entfallen |
| Anfragekanal | möglich (Option A) | siehe 2.3 |
| Rechtstexte | **Entscheidung des Betriebs mit Rechtsberatung, nicht von uns** | Dieses Runbook gibt dazu keine Rechtsauskunft |

Die Entscheidung wird schriftlich festgehalten (Datum, Person, Punkte) und in `docs/07_DECISIONS.md` eingetragen.

### 2.5 Schutz der Vorschau
- **Nur `noindex`** (Standard der Vorschau-Fassung: Meta, `X-Robots-Tag`, `robots.txt` mit `Disallow: /`): verhindert Indexierung, schützt nicht vor Aufruf. Die URL darf dann nicht öffentlich verbreitet werden.
- **Zugangsschutz des Hosts** (Herstellerfunktion, ungeprüft; im Repo keiner, `docs/16_ANFORDERUNGEN.md` E16): nötig, wenn Beispieldaten oder unbestätigte Angaben nicht öffentlich sichtbar sein dürfen. Gerätetests brauchen dann Zugang für die Prüfpersonen (Zugangsdaten nie in URLs oder Repo).
- **Getrennter Vorschau-Host** neben dem öffentlichen: vermeidet, dass dieselbe Domain erst „noindex“ und dann „index“ liefert und installierte PWAs mit altem Service Worker zurückbleiben. Die bestehende geschützte Alt-Vorschau bleibt unberührt, bis G9 bestanden ist.

## 3. Freigabe-Checkliste vor dem ersten öffentlichen Build

Jeden Punkt abhaken und Ergebnis mit Datum festhalten (z. B. im Commit-Text oder in `docs/05_PLAN.md`). Ein roter Punkt stoppt die Freigabe.

1. **Sauberer Stand.** `git status --short` ohne Ausgabe; `git log -1 --format=%h` notieren (dieser Stand wird gebaut und im Rückfallplan genannt).
2. **Abhängigkeiten.** `npm ci` ohne Fehler.
3. **Inhalte.** `npm run content:check; echo "exit=$?"` → `exit=0`, Abschnitt „Was blockiert den öffentlichen Build?“ meldet „Nichts“. Jede Zeile unter „Was fehlt im öffentlichen Auftritt“ ist eine bewusste, nach 2.4 angenommene Lücke.
4. **Öffentlicher Build** mit der echten Adresse:
   ```sh
   CHUCCA_MODE=public CHUCCA_SITE_URL=https://<Domain> npm run build:public
   ```
   Bei Unterpfad zusätzlich `CHUCCA_BASE=/pfad/`. Das Skript `build:public` setzt den Modus selbst; die doppelte Angabe ist harmlos. Erwartet: Log-Zeile `mode=public`, keine Warnung „Öffentlicher Build ohne CHUCCA_SITE_URL“, Ausgabe in `dist-public/`. Seitenzahl und Größen wie in `docs/06_QA.md` (Abweichung erklären).
5. **Leak-Prüfung** (jede Zeile: keine Ausgabe erwartet):
   ```sh
   grep -rIlE 'rights_status|rights_evidence|authorization_evidence|venue_evidence|source_url|observedAt|TESTFIXTURE|fixture-|Beispielkarte|Sample menu|Carta de ejemplo|Konzeptillustration|mallorcaguide|lumaguide' dist-public
   find dist-public -name 'concept-*'
   find dist-public/_astro -regextype posix-extended -regex '.*\.(webp|avif|png|jpe?g)'
   grep -rIlE 'noindex' dist-public/de/index.html dist-public/en/index.html dist-public/es/index.html
   ```
   Die dritte Zeile darf nur Dateien zeigen, die im Katalog freigegeben sind (`rights_status` approved, Beleg vorhanden; sonst gehört das Bild nicht in den Build). Die vierte darf nichts zeigen: Startseiten sind im öffentlichen Modus indexierbar. Alle Kontaktwerte in der Ausgabe müssen bestätigten Einträgen entsprechen:
   ```sh
   grep -rIohE '[A-Za-z0-9._-]+@[A-Za-z0-9.-]+' dist-public | sort -u
   ```
   Die Suchbegriffe entsprechen der Prüfung in `tests/e2e/public.spec.ts` (dort gegen einen Testbuild); diese Prüfung gilt dem echten Build.
6. **Gesamtprüfung.** `npm run check; echo "exit=$?"` → `exit=0`. Nicht über eine Pipe auswerten (der Exit-Code ginge verloren).
7. **Sitemap, robots, hreflang (Stichprobe).**
   ```sh
   cat dist-public/robots.txt
   grep -o '<loc>[^<]*</loc>' dist-public/sitemap.xml
   grep -ho '<link rel="canonical"[^>]*>' dist-public/de/index.html
   grep -ho '<link rel="alternate" hreflang="[^>]*>' dist-public/de/index.html
   ```
   Erwartet: `robots.txt` ohne `Disallow: /` und mit `Sitemap: https://<Domain>/sitemap.xml`; jede `<loc>` beginnt mit der Site-URL; Drinks und Galerie stehen nur dann in der Sitemap, wenn Karte bzw. Fotos bestätigt sind (sonst `noindex` und nicht aufgeführt); Canonical der Seite zeigt auf sich selbst; hreflang `de`, `en`, `es` und `x-default`.
8. **CSP-Hashes (lokal).** `npm run test:dist` prüft die Hash-Logik gegen die Testbuilds (Teil von `npm run check`). Für den echten Build: Probelauf des Smoke-Tests gegen einen lokalen Server mit einem Build, dessen Site-URL der lokale Ursprung ist (der Smoke-Test vergleicht Hashes in den Inline-Skripten mit der gesendeten CSP und verlangt, dass Canonicals und Sitemap auf die Basis-URL zeigen):
   ```sh
   CHUCCA_MODE=public CHUCCA_SITE_URL=http://127.0.0.1:12540 npx astro build --outDir /tmp/chucca-probe
   node scripts/serve.mjs /tmp/chucca-probe 12540 &
   node scripts/smoke-live.mjs http://127.0.0.1:12540/; echo "exit=$?"
   kill %1
   ```
   Das probt Build, Header-Erzeugung und Smoke-Test, **nicht** den Host. Den Smoke-Test gegen `dist-public` mit der echten Adresse lokal laufen zu lassen scheitert absichtlich (Sitemap und Canonicals zeigen auf einen anderen Host).
9. **Manifest und Start-URL am echten Host.** Erst nach dem Deployment möglich (Punkt 15); lokal belegt durch `tests/build-output/manifest.test.ts` und `tests/e2e/subpath.spec.ts`.
10. **Gerätetests.** Pflichtgeräte G1 bis G5 in `docs/14_GERAETETEST.md` ausgefüllt, oder die Lücke ist nach 2.4 angenommen.
11. **Textdurchsicht.** `docs/10_TEXTPRUEFUNG.md` nennt EN und ES mit Person und Datum, oder die Lücke ist nach 2.4 angenommen.
12. **Anfragekanal.** Entscheidung 2.3 getroffen; bei Option C Test gegen den echten Dienst (G6) bestanden; sonst bleibt `inquiryEndpoint` absent.
13. **Betreiber-Freigabe schriftlich** (G8) und Entscheidung 2.4 festgehalten; Rechtstexte eingebunden oder bewusst (nach Rechtsberatung) offen.
14. **Archivieren, was deployt wird.** Außerhalb des Repos: `tar -czf chucca-public-<Commit>.tar.gz dist-public` (enthält nur öffentliche Dateien, keine Zugangsdaten). Das Archiv ist die Grundlage für den Rückfall (Abschnitt 4).
15. **Nach dem Deployment** (Hosting-Admin deployt `dist-public/`):
    ```sh
    node scripts/smoke-live.mjs https://<Domain>/ ; echo "exit=$?"
    curl -sI https://<Domain>/de/
    curl -sI https://<Domain>/sw.js
    ```
    Erwartet: Exit 0 (Warnungen einzeln bewertet; `Strict-Transport-Security` fehlt als Warnung, bis die Domain-Entscheidung HSTS festlegt). Ein Browseraufruf mit offener Konsole zeigt keine CSP-Fehler; das Manifest zeigt `start_url` und `scope` der Domain (Chromium: Entwicklerwerkzeuge, Anwendung, Manifest).
16. **QR und Probe.** Jetzt erst druckfertig machen (G7), mit einem Handy in jeder Sprachfassung scannen.
17. **Dokumente.** `docs/05_PLAN.md`, `docs/08_HANDOFF.md`, `docs/06_QA.md`, `docs/16_ANFORDERUNGEN.md`, `docs/00_STATE.md` auf den gelaufenen Stand gebracht, danach `npm run docs:check; echo "exit=$?"` → `exit=0`.

## Smoke-Test (`scripts/smoke-live.mjs`)
Prüft von außen, was ein Host falsch machen kann. **Nur lesend:** ausschließlich GET und HEAD, nur gegen den Host der angegebenen Basis-URL, Weiterleitungen werden gemeldet und nicht verfolgt, Sitemap-Einträge auf fremden Hosts werden als Fehler gemeldet und nicht abgerufen, keine Anmeldedaten in der URL erlaubt, ein 404-Probeaufruf auf einen zufälligen, nicht vorhandenen Pfad.

```sh
node scripts/smoke-live.mjs <Basis-URL> [--mode public|preview] [--json] [--verbose] [--timeout <ms>]
```
Exit 0: kein FAIL (WARN erlaubt). Exit 1: mindestens ein FAIL. Exit 2: falscher Aufruf. Standard ist `--mode public`; `--mode preview` erwartet statt Canonical und Sitemap `noindex` (Meta und `X-Robots-Tag`) und `Disallow: /`.

| Prüfung | Quelle der Erwartung |
|---|---|
| `/`, `/de/`, `/en/`, `/es/` und jede URL der Sitemap: Status 200, HTML | `docs/11_HOSTING.md` |
| `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Content-Security-Policy` mit `default-src 'none'`, ohne `unsafe-eval` und ohne `unsafe-inline` bei Skripten | `src/lib/headers.ts` |
| CSP enthält die SHA-256-Hashes aller Inline-Skripte und `<style>`-Blöcke der jeweiligen Seite | `src/lib/headers.ts` (gleiche Berechnung) |
| `Cache-Control` der HTML-Seiten und von `sw.js` revalidiert (`no-cache`, `no-store` oder `max-age=0`); ein `_astro`-Asset `public, max-age=31536000, immutable` | `docs/11_HOSTING.md` |
| öffentlich: Canonical zeigt auf die Seite selbst, hreflang `de`/`en`/`es`/`x-default` auf eigenem Host, kein `noindex`; `robots.txt` mit passender Sitemap-Zeile; Sitemap-URLs nur auf der Basis-URL | `integrations/chucca-build.ts` |
| `manifest.webmanifest`: Typ `application/manifest+json`, `start_url` und `scope` gleich Basispfad, `display: standalone`, Icons erreichbar | `src/pages/manifest.webmanifest.ts` |
| `sw.js`: JavaScript, nicht gecacht, `nosniff` | `docs/11_HOSTING.md` |
| unbekannter Pfad: Status 404 mit HTML-Seite (kein Soft-404); `_headers` nicht öffentlich lesbar (WARN) | `docs/11_HOSTING.md` |
| https im öffentlichen Modus; HSTS vorhanden (WARN) | `docs/11_HOSTING.md` |

Nicht abgedeckt: Verhalten im Browser (Service-Worker-Update, Offline, Installation), Inhalte, Barrierefreiheit, Gerätetests, Verhalten hinter einem CDN bei wiederholten Aufrufen, Header auf Pfaden, die nicht abgerufen werden. Ein grüner Smoke-Test ist kein Gerätetest und keine Freigabe. Tests: `tests/unit/smoke-live.test.ts` (Mini-Auftritt hinter `scripts/serve.mjs`, Fehlerfälle, Nachweis, dass nur GET gesendet wird); Zahlen `docs/06_QA.md`.

## 4. Rückfallplan

Grundsatz: Der Rückfall ist vor dem Deployment vorbereitet, nicht danach erfunden. Es wird nichts erzwungen: kein Force-Push, kein Zurücksetzen fremder Änderungen (`AGENTS.md`).

**Was die Sicherung `backup/pre-v4-2026-11-11` ist (geprüft am 16.11.2026):** ein lokaler Tag auf `8dec65b` mit genau einer Datei, `README.md`. `git ls-tree -r --name-only backup/pre-v4-2026-11-11` zeigt das. Er sichert den Ausgangszustand von `main`, **nicht** eine lauffähige Vorgängerseite. Ein Rückfall „auf den Tag“ stellt daher keine Website wieder her. Der Tag ist in diesem Klon lokal (`docs/00_STATE.md`); ob er auf `origin` liegt, ist nicht festgestellt.

Vor G9 prüfen:
```sh
git tag --list 'backup/*'
git rev-parse --short backup/pre-v4-2026-11-11
git ls-remote --tags origin 'backup/*'
```
Erwartet: Tag vorhanden, `8dec65b`. Die dritte Zeile fragt `origin` (das eigene Remote) ab; bleibt sie leer, existiert der Tag nur lokal, und er geht mit diesem Klon verloren. Das Pushen eines Tags ist ein externer Schritt und braucht die Autorisierung der verantwortlichen Person.

**Rückfall der Website (Normalfall).**
1. **Host-Ebene zuerst.** Vor dem ersten Go-Live Stand und Kennung des bisherigen Deployments notieren (bei einem Hoster mit Deployment-Verlauf: Herstellerfunktion „früheres Deployment wieder aktivieren“, ungeprüft). Fällt der Smoke-Test nach G9 durch oder meldet der Betrieb falsche Inhalte, wird dieses Deployment reaktiviert, oder die Domain zeigt wieder auf die bisherige (geschützte) Vorschau, die bis dahin unberührt bleibt.
2. **Archiv.** Das Archiv aus Abschnitt 3, Punkt 14, des letzten guten Stands wird erneut ausgeliefert; `dist-public/` des fehlerhaften Stands wird nicht „repariert“, sondern ersetzt.
3. **Service Worker.** Der Rückfall auf einen älteren Build stellt eine ältere `sw.js` bereit. Browser, die den neueren Worker schon haben, bleiben bei ihm, bis ein Build mit anderer Kennung sie ablöst. Deshalb nicht auf einen älteren Stand zurückrollen, wenn ein neuer, korrigierter Stand schnell gebaut werden kann: Ein Fix-Build bekommt automatisch eine neue Build-Kennung (`CHUCCA_BUILD_ID` oder Zeitstempel) und löst alte Caches ab.
4. **Inhaltsfehler** (falscher Preis, falsches Foto): Datei korrigieren oder Eintrag auf `proposal` zurückstufen, `npm run content:check`, neu bauen, neu deployen. Ein falsches Foto sofort entfernen (Katalogeintrag `rights_status` zurücknehmen) und neu bauen.
5. **Suchmaschinen.** Ein zurückgezogener Inhalt kann zwischengespeichert bleiben; Löschung bei der Suchmaschine beantragt der Betrieb.

**Rückfall im Repo (ohne Force-Push).**
```sh
git switch -c rollback/<Datum> <letzter-guter-Commit>
git revert --no-edit <fehlerhafter-Commit>    # alternativ: auf neuem Branch zum guten Stand zurückkehren
npm run check; echo "exit=$?"
```
Jede Korrektur ist ein neuer Commit auf einem neuen Branch; Veröffentlichen des Branchs ist ein eigener, autorisierter Schritt. Vor G9 sollte der gebaute Commit mit einem lokalen annotierten Tag markiert werden (`git tag -a golive-<Datum> -m "erster öffentlicher Build"`), damit der „letzte gute Commit“ benannt ist; das Pushen des Tags ist ebenfalls autorisierungspflichtig.

## 5. Nach dem Go-Live: Wartung und Beobachtung

**Wartung.**
- **Karte spätestens nach 90 Tagen bestätigen lassen** (Empfehlung aus `docs/10_BETREIBER.md`, kein Mechanismus im Repo: nichts erinnert automatisch). Stand der Karte: Feld `updatedAt` in `src/content/published/menu.json` (wird beim Import auf den Importtag gesetzt). Prüfbefehl: `grep -n updatedAt src/content/published/menu.json`. Die Betreuung trägt einen Termin im Kalender des Betriebs ein. Neue Karte: `npm run menu:import -- karte.csv --out src/content/published/menu.json`, `npm run content:check`, neu bauen, Smoke-Test, deployen.
- **Termine pflegen.** `src/content/published/events.json`; abgelaufene Termine verschwinden automatisch, Absagen meldet der Betrieb sofort. Jede Änderung läuft durch `npm run content:check` und einen neuen Build.
- **Öffnungszeiten.** Gelten in `venue.json` nur im Zeitraum `validFrom` bis `validUntil`; danach zeigt die Seite „unbestätigt“ (`src/lib/hours.ts`). Ende des Zeitraums im Kalender vermerken, Saisonwechsel einplanen. Ausnahmetage (`exceptions`) vor Feiertagen und Betriebsferien eintragen.
- **Kanal- und Anfragebetreuung.** Antwortzeiten und Zuständige sind Sache des Betriebs; bei Option C die Zustellung regelmäßig stichprobenartig prüfen lassen (Dienst-seitig).
- **Abhängigkeits-Updates.** Das Repo hat keinen automatischen Update-Dienst (nicht festgestellt: keine entsprechende Konfiguration unter `.github`). Vorgehen: `npm outdated` und `npm audit` lesen, Updates einzeln in einem Branch einspielen, `npm run check; echo "exit=$?"`, bei Astro-, Playwright- oder Vitest-Sprüngen zusätzlich `npm run test:e2e:cross` (läuft nicht in `npm run check`). Danach Build mit neuer Kennung deployen; die Zahlen in `docs/06_QA.md` neu eintragen. Die Node-Version steht in `.nvmrc`.
- **Neue Texte oder Sprachen.** Texte nur in `src/i18n/`; neue Texte brauchen wieder eine muttersprachliche Durchsicht (`docs/15_TEXTREVIEW.md`).
- **Zertifikat und Domain.** Verlängerung und Ablauf der Domain liegen beim Hosting-Admin; ein abgelaufenes Zertifikat macht die Seite unerreichbar. Ablaufdaten notieren.

**Beobachtung (Monitoring).**
- **Kein eigenes Tracking.** Die Website sammelt keine Gästedaten und enthält keine Messskripte (`docs/10_BETREIBER.md`). Es gibt deshalb **keine eigenen Felddaten**; auch INP ist bisher nur eine Labornäherung (`scripts/measure-inp.mjs`, 64 bis 80 ms längste Interaktion in zwei Läufen unter gedrosselten Bedingungen, `docs/06_QA.md`, kein Wert aus dem Feld). Feldwerte (Core Web Vitals am 75. Perzentil, Ziel INP ≤ 200 ms) kommen, wenn überhaupt, aus öffentlichen Berichten der Browserhersteller oder von Suchmaschinen; ob sie für eine Seite mit wenig Verkehr überhaupt vorliegen, ist Herstellerangabe und ungeprüft. Ein Messskript einzubauen wäre eine Entscheidung des Betriebs mit Datenschutztext (Recht) und ändert die CSP; das ist nicht vorgesehen.
- **Regelmäßiger Smoke-Test.** `node scripts/smoke-live.mjs https://<Domain>/` nach jedem Deployment und mindestens monatlich (zeigt abgelaufene Zertifikate, veränderte Header, gecachten `sw.js`). Er ist nur lesend und darf beliebig oft laufen.
- **SW-Update beobachten.** Nach jedem Deployment auf einem Gerät, das die Seite schon besucht hat: Öffnen, nach kurzer Zeit erscheint der Hinweis „Eine neue Version ist bereit.“ (bzw. EN/ES), „Neu laden“ zeigt den neuen Stand. Von Hand, wenn der Host sich ändert oder nach einer Header-Änderung (Aufgabe 15 am Host):
  1. Stand v1 mit fester Kennung bauen und deployen: `CHUCCA_BUILD_ID=golive-v1 CHUCCA_MODE=public CHUCCA_SITE_URL=https://<Domain> npm run build:public`.
  2. Seite in einem frischen Browserprofil öffnen, einmal laden lassen (Service Worker aktiv).
  3. Stand v2 mit `CHUCCA_BUILD_ID=golive-v2` bauen und deployen.
  4. Seite neu laden: Hinweis erscheint, Seite bleibt zunächst v1; Klick auf „Neu laden“ lädt genau einmal neu und zeigt v2.
  Erwartet wie in `docs/06_QA.md` (Update-Hinweis des Service Workers). Bleibt der Hinweis aus, ist fast immer `sw.js` im CDN gecacht: `curl -sI https://<Domain>/sw.js` prüfen.
- **Was der Betrieb meldet.** Falsche Angaben, Anfragen ohne Antwort, Gäste, die den QR-Code nicht scannen können: jede Meldung wird mit Datum festgehalten und löst einen Eintrag in `docs/05_PLAN.md` aus.
