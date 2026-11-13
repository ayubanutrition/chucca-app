# Architektur

## Stack (geprüft am 11.11.2026)
Astro 7.4.11 (statisch vorgerendert) · TypeScript 6.0 (strictest) · Zod 4 · Vitest 5 · Playwright 1.63 + axe-core · ESLint 10. Keine UI-Bibliothek, kein Backend. Node ≥ 22 (`.nvmrc`: 22; Prüfstand: 22.23.4). Eine Lockdatei: `package-lock.json`. Gegenprobe 13.11.2026 mit `npm outdated`: Astro, Zod, Vitest, ESLint aktuell; Playwright 1.63 (1.65 verfügbar) und TypeScript 6.0.3 (7.0 verfügbar) bewusst nicht gehoben, ohne Verträglichkeitsprüfung.
Interaktivität sind sechs kleine TypeScript-Module (zusammen ca. 9 kB gzip), je Seite nur das benötigte.

## Struktur
| Pfad | Inhalt |
|---|---|
| `src/pages/` | Routen: `/` (Sprachwahl), `[locale]/` (Heute), `[locale]/[slug]/` (übrige Seiten), `404`, `manifest.webmanifest`, `gallery.html` (V3-Weiterleitung) |
| `src/layouts/Base.astro` | Hülle: Metadaten, Navigation, Sprachwahl, Fuß |
| `src/components/` | Je Seite eine View, dazu `Art`, `Icon`, `Mark` |
| `src/i18n/` | `de.ts` (Referenz, definiert den Typ), `en.ts`, `es.ts`, Routentabelle in `index.ts` |
| `src/content/published/` | Veröffentlichter Bestand: `venue.json`, `menu.json`, `events.json` |
| `src/content/fixtures/` | Beispieldaten nur für die Vorschau |
| `src/content/media/catalogue.json` | Interner Medienkatalog inkl. Rechte-/Recherchefeldern |
| `src/lib/` | Logik ohne DOM: Zeit, Planer, ICS, Teilen, Öffnungsstatus, Sonnenstand, Karte, Medien, Termine, Inhalte, Service-Worker-Vorlage |
| `src/scripts/` | DOM-Skripte der Seiten |
| `integrations/chucca-build.ts` | Schreibt nach dem Build `sw.js`, `robots.txt`, `sitemap.xml` |
| `scripts/` | Werkzeuge: Konzeptmotive, Icons, Schriftteilmengen (`make-fonts.py`), Testserver (`serve.mjs`, `serve-update.mjs`), Update-Builds (`build-update.mjs`), Inhalts- und CSV-Werkzeuge (`content-check.ts`, `menu-from-csv.ts`, über `run-ts.mjs`), QR-Aufsteller, Doc-Check, Screenshots, Labormessung; Aufruf je Skript: `README.md` |
| `tests/unit`, `tests/build-output`, `tests/e2e` | Vitest (`vitest.config.ts`), Vitest über die fertigen Ausgabeordner (`vitest.dist.config.ts`, `npm run test:dist`) und Playwright (`playwright.config.ts`, `playwright.update.config.ts`) |
| `dist/`, `dist-public/`, `dist-sub/`, `dist-hours/`, `dist-inquiry/` | Erzeugter Output von `npm run build:test` (nicht versioniert) |
| `.github/workflows/quality.yml` | CI: dieselben Schritte wie `npm run check`, dazu der Job `cross-browser` |

## Schriften
Drei selbst gehostete WOFF2 (`src/assets/fonts/`, erzeugt von `scripts/make-fonts.py` aus den Fontsource-Paketen, SIL OFL; Lizenzen in `public/fonts/`). Eingebunden über `src/styles/fonts.css` (Vite hasht die Dateien nach `_astro/`, Unterpfad-fest); der Service Worker legt alle `_astro/*.woff2` vorab ab. Familiennamen und Tokens bleiben unverändert; metrikangepasste Notschriften stehen in den Tokens hinter den Webschriften. Zeichenbestand: fester Sockel plus alle Zeichen aus `src/i18n`, `content`, `components`, `layouts`, `pages`, `scripts`, `styles` (vom Skript automatisch abgeleitet; neue Texte → `python3 scripts/make-fonts.py` erneut ausführen). Zeichenabdeckung und Gewichtsgrenze (< 100 kB): `tests/unit/fonts.test.ts`, das bei jedem Zeichen im Textbestand ohne Glyphe (außer Pfeilen aus der Systemschrift) fehlschlägt. Gesamtgewicht der drei Dateien ca. 82,8 kB. Begründung und Zahlen: D16.

## Betriebsmodi
`CHUCCA_MODE` steuert, was der Build enthält (`src/config/mode.ts`, `src/lib/content/index.ts`):

| | `preview` (Standard) | `public` |
|---|---|---|
| Indexierung | `noindex`, `robots.txt` sperrt alles | indexierbar, wenn `CHUCCA_SITE_URL` gesetzt ist; sonst weiter `noindex` |
| Karte/Termine | Beispieldaten, gekennzeichnet | nur bestätigter Bestand, sonst „folgt“ bzw. kein Modul |
| Bilder | Konzeptmotive, gekennzeichnet | nur freigegebene Fotos |
| Eingangsangabe | mit Hinweis „unbestätigt“ | nur wenn `confirmed` |
| Kontaktwege | nur `confirmed` | nur `confirmed` |
| Service Worker | HTML wird nie gespeichert | zuletzt geladene Seiten als Offline-Kopie (network-first) |
| Einladung | ohne Link auf die Seite | mit Link zum Plan |

`CHUCCA_BASE` setzt einen Unterpfad; alle Links laufen über `src/lib/paths.ts`.

**Optionaler Sendeweg für Gruppenanfragen (Aufgabe 18, technisch vorbereitet, AUS):** `venue.json` kann einen `inquiryEndpoint` tragen (Schema und Regeln: `src/lib/content/schema.ts`, `src/lib/inquiry-endpoint.ts`); im Repo ist er absent. `venueFor()` liefert `inquiry` nur bei bestätigtem Endpunkt (`activeEndpoint`: `confirmed` + `acceptsInquiries` + `source` + `verifiedAt` + gültige https-Adresse), sonst `null`. `VisitView.astro` rendert dann den Senden-Knopf, den Datenhinweis und `data-inquiry-origin` am Formular; ohne Endpunkt ist das HTML der Seite unverändert. `src/scripts/visit.ts` sendet über `src/lib/inquiry-send.ts` (reine Logik ohne DOM): ein `fetch` (POST, JSON, `credentials: omit`, `redirect: error`, `referrerPolicy: no-referrer`) mit `AbortController` und 10 s Zeitgrenze, Busy-Flag vor dem ersten `await` (Doppelklick = ein Versand), Eingabefelder während des Sendens schreibgeschützt. Ergebnis `sent` nur bei HTTP 2xx; 4xx `rejected`, sonstige Antworten `server`, Zeitgrenze `timeout`, Netzfehler oder `navigator.onLine === false` `offline`. Jeder Fehler bewahrt Eingabe und vorbereiteten Text (Rückfall „Text kopieren“). Texte: `visit.send` in `src/i18n/*.ts`. Die CSP wird aus dem Output abgeleitet: `integrations/chucca-build.ts` liest `data-inquiry-origin` aus den erzeugten Seiten und reicht die Herkunft an `buildHeadersFile` weiter (`src/lib/headers.ts`); nur dann steht der Host in `connect-src` und `form-action`, sonst bleiben `connect-src 'self'` und `form-action 'none'`.

**Testschalter `CHUCCA_TEST_INQUIRY=1`** (`npm run build:inquiry` → `dist-inquiry/`): setzt nur im Vorschau-Modus den gekennzeichneten Test-Endpunkt `src/content/fixtures/inquiry.ts` (Host `inquiries.chucca-test.invalid`, löst nie auf; Marker `TESTFIXTURE-INQUIRY` im HTML), damit der Sendeweg im Browser gegen einen Mock getestet werden kann. Kein Produktmodus: `astro.config.ts` lehnt ihn mit `CHUCCA_MODE=public` und zusammen mit `CHUCCA_TEST_HOURS` ab, die Build-Integration bricht ab, wenn das Ausgabeziel nicht `dist-inquiry` ist oder ein `.invalid`-Endpunkt in einem anderen Build auftaucht. `dist`, `dist-public`, `dist-sub` und `dist-hours` enthalten weder Marker noch Host noch Hooks (`tests/e2e/inquiry-send.spec.ts`, `tests/build-output/inquiry-csp.test.ts`).

**Testschalter `CHUCCA_TEST_HOURS=1`** (`npm run build:hours` → `dist-hours/`): ersetzt nur im Vorschau-Modus die unbestätigten Öffnungszeiten durch die gekennzeichnete Fixture `src/content/fixtures/hours.ts` (erfundene Zeiten in 2099), damit Öffnungsstatus und Ausnahmetage im Browser testbar sind. Kein Produktmodus: Der Schalter wird mit `CHUCCA_MODE=public` abgelehnt, und die Build-Integration bricht ab, wenn das Ausgabeziel nicht `dist-hours` ist. `dist`, `dist-public` und `dist-sub` enthalten die Fixture nie (Leak-Tests in `tests/e2e/hours-fixture.spec.ts`). Der Testserver läuft auf `PORT_BASE + 5`.

## Sprache und Routen
Lokalisierte Segmente aus einer Tabelle (`SLUGS`): `/de/besuch/`, `/en/visit/`, `/es/visita/` usw. Sprachschalter, Canonical, hreflang, Sitemap und Tests lesen dieselbe Tabelle. Astros eingebautes i18n-Routing wird nicht genutzt, weil es gleiche Pfade je Sprache voraussetzt (`docs/09_RESEARCH.md`, F4/F11).
Der Sprachwechsel führt zur gleichen Seite und nimmt Query und Hash mit (Filter, Entwurf). `/` ist eine Sprachwahl; weitergeleitet wird nur bei gemerkter Wahl oder alten V3-Hashes (`#heute`, `#drinks`, `#besuch`).

## Datenverträge (`src/lib/content/schema.ts`)
- **Venue**: Name, Besucheradresse, Zeitzone, Kartenlinks, Kontaktwege, Öffnungszeiten, Eingang – jede Gruppe mit `status`, `source`, `observedAt`. `venueFor(mode)` erzeugt daraus die Besuchersicht ohne interne Felder.
- **Menu/Drink**: ID, Kategorie, lokalisierter Name/Beschreibung/Zutaten, Preise in Cent mit optionaler Größe, `alcoholFree`, Geschmack, Verfügbarkeit. Veröffentlichte Drinks verlangen `status: confirmed` und `updatedAt`.
- **Event**: Datum/Start/Ende in Ortszeit Madrid, `status`, `hideAfter`.
- **MediaInternal → MediaPublic**: öffentlich nur `id, kind, alt, caption, credit, focus, tags` (`PUBLIC_MEDIA_FIELDS`).
- **Meetup (Draft)**: Datum, Uhrzeit, Kennung. Keine Namen, keine Kontakte.
- **Inquiry-Endpunkt (optional)**: `inquiryEndpoint` in der Venue (Adresse, Methode, `acceptsInquiries`, Herkunftsangaben, `privacyNote`); öffentlich erreicht die Seite nur Adresse und Datenschutzhinweis (`VenuePublic.inquiry`).

## Zustand im Browser
| Schlüssel | Ort | Inhalt |
|---|---|---|
| `chucca-locale` | localStorage | bewusst gewählte Sprache |
| `chucca-taste` | localStorage | Geschmacksrichtung (validiert) |
| `chucca-plan-draft` | sessionStorage | Entwurf des Treffplans |

Alle Zugriffe sind fehlertolerant (`src/lib/storage.ts`). Bei gesperrtem Speicher wandert der Entwurf beim Sprachwechsel über die URL (`d`, `t`, `id`). Es gibt keine Cookies und keine Anfragen an Dritte.

## Zeit und Kalender
Alle Zeiten gelten in Europe/Madrid (`src/lib/time.ts`, aus V3 portiert). Nicht existierende und doppelte Ortszeiten der Zeitumstellung werden abgelehnt. ICS: UTC-Zeiten ohne TZID, Faltung nach Oktetten, CRLF, stabile UID je Entwurf (`src/lib/ics.ts`).

## PWA
Manifest mit Basis-Pfad, Icons (192/512/maskable/apple-touch). Service Worker aus `src/lib/sw-template.ts`: nur GET und eigene Herkunft; `/_astro/` cache-first, übrige Assets network-first; Navigation network-first; neue Version wartet, bis die Seite sie über den Hinweis „Neu laden“ aktiviert. Alte Caches (`chucca-*`, auch V3) werden entfernt. Der Update-Pfad ist im Browser belegt (`tests/e2e/sw-update.spec.ts`; die Build-Kennung steht auch als `<meta name="chucca-build">` im HTML und lässt sich mit `CHUCCA_BUILD_ID` festlegen).

## SEO
Je Seite Titel, Beschreibung, Open Graph; im öffentlichen Modus mit Site-URL zusätzlich Canonical, wechselseitige hreflang inkl. `x-default`, `sitemap.xml`, JSON-LD `BarOrPub` (nur Name, Adresse, Instagram – keine Zeiten, Preise oder Bewertungen).

## Hosting
Reiner statischer Output; jeder Static-Host genügt. Die bestehende private Vorschau (`chucca-x-experience…chatgpt.site`) ist aus diesem Arbeitsbereich nicht erreichbar und wurde nicht verändert. Der Host muss `404.html` als Fehlerseite ausliefern, HTTPS erzwingen und die Header aus der beim Build erzeugten `_headers` senden: `/_astro/*` ein Jahr `immutable`; HTML, `sw.js`, Manifest, `robots.txt`, `sitemap.xml` `no-cache`; dazu `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy` und eine strikte CSP mit Hashes der Inline-Skripte/-Styles (kein `unsafe-eval`, kein `unsafe-inline` für Skripte). Im Vorschau-Modus und ohne Site-URL kommt `X-Robots-Tag: noindex, nofollow` hinzu.
`_headers` (Format Netlify/Cloudflare Pages) entsteht in `integrations/chucca-build.ts` aus `src/lib/headers.ts`, weil der Inhalt vom Modus abhängt und die Hashes aus den erzeugten Seiten stammen. `scripts/serve.mjs` liest dieselbe Datei, damit Browsertests die Header eines Hosts sehen. Abbildung auf Vercel und nginx, Begründung der CSP-Direktiven und Grenzen: `docs/11_HOSTING.md`.

## Performance-Budget
Initialer mobiler Transfer ≤ 1 MB, initiales JS ≤ 100 kB gzip. Messwerte: `docs/06_QA.md`.

## Native Phase (nicht begonnen)
Empfehlung: erst nach bestätigtem Content und gemessenem Bedarf. Nutzen gegenüber der PWA wären Store-Präsenz und Push; beides ist für das Kernprodukt nicht nötig. Weg der Wahl wäre ein Wrapper (Capacitor) um diesen Build mit geteilter Logik aus `src/lib/`; dafür offen: Apple-/Google-Konten des Betreibers, Signierung, Store-Texte in drei Sprachen, Geräteabnahme, Datenschutzangaben. PWA, Wrapper und native App bleiben getrennte Lieferstände. Kriterien, Annahmen und Auslöser: `docs/12_NATIVE_PHASE.md`.
