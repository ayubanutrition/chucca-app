# Architektur

## Stack (geprüft am 11.11.2026)
Astro 7.4.11 (statisch vorgerendert) · TypeScript 6.0 (strictest) · Zod 4 · Vitest 5 · Playwright 1.63 + axe-core · ESLint 10. Keine UI-Bibliothek, kein Backend. Node ≥ 22 (`.nvmrc`). Eine Lockdatei: `package-lock.json`.
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
| `scripts/` | Konzeptmotive, Icons, Testserver, Screenshots, Labormessung |
| `tests/unit`, `tests/e2e` | Vitest und Playwright |
| `dist/`, `dist-public/` | Erzeugter Output (nicht versioniert) |

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

## Sprache und Routen
Lokalisierte Segmente aus einer Tabelle (`SLUGS`): `/de/besuch/`, `/en/visit/`, `/es/visita/` usw. Sprachschalter, Canonical, hreflang, Sitemap und Tests lesen dieselbe Tabelle. Astros eingebautes i18n-Routing wird nicht genutzt, weil es gleiche Pfade je Sprache voraussetzt (`docs/09_RESEARCH.md`, F4/F11).
Der Sprachwechsel führt zur gleichen Seite und nimmt Query und Hash mit (Filter, Entwurf). `/` ist eine Sprachwahl; weitergeleitet wird nur bei gemerkter Wahl oder alten V3-Hashes (`#heute`, `#drinks`, `#besuch`).

## Datenverträge (`src/lib/content/schema.ts`)
- **Venue**: Name, Besucheradresse, Zeitzone, Kartenlinks, Kontaktwege, Öffnungszeiten, Eingang – jede Gruppe mit `status`, `source`, `observedAt`. `venueFor(mode)` erzeugt daraus die Besuchersicht ohne interne Felder.
- **Menu/Drink**: ID, Kategorie, lokalisierter Name/Beschreibung/Zutaten, Preise in Cent mit optionaler Größe, `alcoholFree`, Geschmack, Verfügbarkeit. Veröffentlichte Drinks verlangen `status: confirmed` und `updatedAt`.
- **Event**: Datum/Start/Ende in Ortszeit Madrid, `status`, `hideAfter`.
- **MediaInternal → MediaPublic**: öffentlich nur `id, kind, alt, caption, credit, focus, tags` (`PUBLIC_MEDIA_FIELDS`).
- **Meetup (Draft)**: Datum, Uhrzeit, Kennung. Keine Namen, keine Kontakte.

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
Empfehlung: erst nach bestätigtem Content und gemessenem Bedarf. Nutzen gegenüber der PWA wären Store-Präsenz und Push; beides ist für das Kernprodukt nicht nötig. Weg der Wahl wäre ein Wrapper (Capacitor) um diesen Build mit geteilter Logik aus `src/lib/`; dafür offen: Apple-/Google-Konten des Betreibers, Signierung, Store-Texte in drei Sprachen, Geräteabnahme, Datenschutzangaben. PWA, Wrapper und native App bleiben getrennte Lieferstände.
