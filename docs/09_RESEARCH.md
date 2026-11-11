# Recherche: Belege, Übernahmen, Validierung

Recherche am 11.11.2026 durch einen eigenen Recherche-Subagenten dieser Session (76 Tool-Aufrufe); Auswertung und Umsetzung durch den integrierenden Agenten. Diese Datei hält fest, **was gelesen wurde, was daraus übernommen wurde und wo es im Repo überprüfbar ist**.

## Grenzen der Recherche (ehrlich)
- **Reddit konnte nicht gelesen werden.** reddit.com, old.reddit.com und die `.json`-Endpunkte lieferten 403; Such- und Spiegel-Dienste verweigerten die Domain. Ersatz: drei vollständig gelesene Hacker-News-Diskussionen (über die HN-Algolia-API) und ein kleiner Reddit-Thread über eine Drittanbieter-Momentaufnahme (F36a). Aus r/astrojs, r/PWA, r/restaurateur, r/bartenders, r/Mallorca liegt **nichts** vor. Hacker News ist technikaffin und kein Abbild von Mallorca-Gästen.
- Nicht abrufbar oder nicht gelesen: Baymard, Smashing, Sara Soueidan, neuere Beiträge von Jake Archibald, Econsultancy (403), ein Stack-Overflow-Spiegel (401).
- „Gelesen“ heißt: Seite oder Quelldatei wurde abgerufen (Webseiten über einen zusammenfassenden Abruf – wörtliche Zitate vor Weiterverwendung prüfen). „Nur Snippet“ heißt: nur Suchergebnis gesehen; als Hinweis behandelt, nicht als Beleg.
- Sternzahlen stammen aus der GitHub-Such-API vom 11.11.2026 und sind kein Qualitätsurteil.
- Die im V3-Designbrief genannten Skill-Repositories (impeccable, taste-skill, design-dna, gsap-skills u. a.) wurden **nicht** installiert oder geprüft: Das Projekt kommt ohne Animations- oder Designbibliothek aus (D03, D12).

## Die zehn Entscheidungen, die die Belege geändert oder bestätigt haben
| # | Entscheidung | Wirkung | Belege | Validierung im Repo |
|---|---|---|---|---|
| 1 | Eigene Routentabelle für lokalisierte Segmente | geändert | F4, F11–F13 | `src/i18n/index.ts`; `i18n-sw.test.ts` „Routen“ |
| 2 | `/` ist eine Sprachwahl mit `x-default`, keine Weiterleitung | geändert | F4, F10, F14, F15 | `src/pages/index.astro`; `core.spec.ts` „Einstieg…“ |
| 3 | `compressHTML: true` statt des Astro-7-Standards | geändert | F2 | `astro.config.ts`; Preiszeilen in `core.spec.ts` |
| 4 | Native `@view-transition`, kein `<ClientRouter />` | bestätigt | F9, F32 | `global.css`; „reduzierte Bewegung“ in `core.spec.ts` |
| 5 | Eigene `<dialog>`-Bildansicht ohne Bibliothek | bestätigt, angepasst | F16–F19 | `lightbox.ts`; `flows.spec.ts` „Galerie“ |
| 6 | Eigener ICS-Generator in UTC mit Oktett-Faltung | geändert | F23–F26 | `ics.ts`; `ics-share.test.ts` |
| 7 | Teilen → Zwischenablage → manuelles Kopieren; Abbruch still | bestätigt | F20, F21 | `share.ts`; `flows.spec.ts` |
| 8 | Datum selbst in Europe/Madrid prüfen | geändert | F22 | `planner.ts`; `time-planner.test.ts` |
| 9 | Kleiner eigener Service Worker, kein erzwungenes `skipWaiting` | geändert | F27–F31 | `sw-template.ts`; `i18n-sw.test.ts` „Service Worker“ |
| 10 | Leiste unten mit fünf beschrifteten Zielen; eine lange HTML-Karte mit sichtbaren Preisen | bestätigt | F33–F36 | `Base.astro`, `DrinksView.astro`; „ohne JavaScript“ |

## Befunde im Einzelnen

### Astro 7 (von Astro-5-Wissen kommend)
| ID | Quelle | Aussage | Gegenprüfung / Grenze | Umsetzung |
|---|---|---|---|---|
| F1 | docs.astro.build/en/guides/upgrade-to/v6/ und /v7/; astro.build/blog/astro-7/ (22.06.2026) | Node 22.12+, Vite 8/Rolldown, Rust-Compiler lehnt unsauberes HTML ab | v7-Leitfaden nennt keine eigene Node-Untergrenze | übernommen: `.nvmrc` 22, CI Node 22 |
| F2 | …/reference/configuration-reference/ | `compressHTML` steht seit 7.0 auf `'jsx'`: Leerzeichen zwischen Inline-Elementen können entfallen | betrifft nur `.astro`-Vorlagen | übernommen: `compressHTML: true` |
| F3 | …/guides/content-collections/ | Nur noch Content Layer mit Loadern; `z` aus `astro/zod` | Zod 4 ändert Formatprüfer | **bewusst abgewichen**: Inhalte sind JSON mit direktem Zod-Schema (`src/lib/content/`), damit dieselben Verträge in Vitest ohne Astro laufen |
| F4 | …/guides/internationalization/; Quelltext `packages/astro/src/i18n/index.ts` | Helfer setzen gleiche Pfade je Sprache voraus; Astro erzeugt kein hreflang | – | angepasst: eigene Tabelle `SLUGS`, eigene hreflang-Ausgabe |
| F5 | …/configuration-reference/#base | `base` wird nicht automatisch an Links gehängt | – | übernommen: `withBase()`/`href()` als einziger Weg; `trailingSlash: 'always'` |
| F6 | …/guides/client-side-scripts/ | `<script>` ohne Attribute wird gebündelt; mit Attributen nicht | Modulskripte sind verzögert | übernommen; Sprach-Weiterleitung deshalb `is:inline` im Kopf |
| F7 | …/guides/images/ | `alt` Pflicht, `public/` wird nicht verarbeitet, kein Hochskalieren | – | übernommen: Bilder in `src/assets/media`, `Picture` mit AVIF + WebP |
| F8 | …/guides/fonts/ | Fonts-API ist stabil | Preload sparsam | **nicht übernommen**: Fontsource-CSS genügt; Fonts-API bleibt Option für Subsetting |
| F9 | …/guides/view-transitions/ | `<ClientRouter />` wird laut Doku zunehmend unnötig; unverträglich mit `security.csp` | Persistenz nur mit Router | übernommen: native Übergänge |
| F10 | beide Upgrade-Leitfäden | Endpunkte mit Dateiendung ohne Schrägstrich; `Astro.site` in `getStaticPaths` veraltet | – | beachtet (`manifest.webmanifest.ts`, `gallery.html.ts`) |

### Sprachen, Segmente, hreflang
| ID | Quelle | Aussage | Gegenprüfung / Grenze | Umsetzung |
|---|---|---|---|---|
| F11 | …/integrations-guide/sitemap/ (3.7.4); Quelltext `generate-sitemap.ts` | i18n-Option paart Alternativen über identische Pfade; kein x-default | `serialize()` ginge | abgelehnt: Sitemap aus der Routentabelle in `integrations/chucca-build.ts` |
| F12 | docs.astro.build/en/recipes/i18n/ | Wörterbuch plus Routentabelle; Root-Weiterleitung per Meta-Refresh | Rezept kennt kein hreflang | angepasst: Routen nach stabiler Seiten-ID |
| F13 | github.com/fedeiglesias/astro-localized-routes (0 Sterne, 10.11.2026) | Ein Routenbaum erzeugt Segmente, hreflang, Sitemap | brandneu, übernimmt den `<head>` | Muster übernommen, Abhängigkeit abgelehnt |
| F14 | developers.google.com/search/docs/specialty/international/localized-versions | Jede Fassung listet sich selbst und alle anderen; absolute URLs; x-default für Sprachwahl | – | übernommen; `public.spec.ts` prüft identische Sätze je Seite |
| F15 | …/international/managing-multi-regional-sites | Keine automatische Sprach-Weiterleitung | statischer Host könnte ohnehin nur Meta/JS | übernommen (D09) |

### Bildansicht mit `<dialog>`
| ID | Quelle | Aussage | Gegenprüfung / Grenze | Umsetzung |
|---|---|---|---|---|
| F16 | developer.chrome.com/docs/modern-web-guidance/guides/ui-components/dialog | `showModal()`; keine eigene Rolle, Fokusfalle oder Esc-Behandlung; Name über `aria-labelledby`; Scroll-Eindämmung über `overscroll-behavior` | Parvus sperrt zusätzlich `body` | übernommen; iOS-Durchscrollen bleibt Gerätetest |
| F17 | MDN `<dialog>`, browser-compat-data | `closedby="any"` noch nicht in Safari | – | nicht nötig: Dialog füllt den Bildschirm; sichtbarer Schließen-Knopf |
| F18 | adrianroselli.com/2025/06/where-to-put-focus-when-opening-a-modal-dialog.html (akt. 23.04.2026) | Fokus auf ein Element im Dialog wird am breitesten angesagt | MDN rät von `tabindex` am Dialog ab | übernommen: `autofocus` auf Schließen, Zähler als höfliche Live-Region |
| F19 | github.com/deoostfrees/Parvus (541 Sterne, v3.2.0, `src/js/parvus.js` gelesen); photoswipe.com | Parvus nutzt nativen Dialog und respektiert reduzierte Bewegung; PhotoSwipe macht keine A11y-Zusagen | History-Trick heikel mit bfcache | Muster übernommen (Link auf großes Bild funktioniert ohne JS); History-Eintrag bewusst nicht |

### Teilen, Zwischenablage, Datumseingabe
| ID | Quelle | Aussage | Gegenprüfung / Grenze | Umsetzung |
|---|---|---|---|---|
| F20 | MDN `Navigator.share`; web.dev/articles/web-share | `AbortError` bei Abbruch; Firefox Desktop ohne Web Share; Nutzeraktivierung nötig | `canShare()` vor allem für Dateien | übernommen: dreistufig, kein `await` vor `share()` |
| F21 | browser-compat-data `Clipboard.writeText`; web.dev/articles/async-clipboard | Aufruf nur in der Nutzergeste; WebKit strenger | sichere Herkunft nicht separat belegt | übernommen: try/catch, sonst Textfeld; kein `execCommand` |
| F22 | bugs.webkit.org/show_bug.cgi?id=223128 (offen) | iOS-Datumswähler erzwingt `min`/`max` nicht; Validierung beim Absenden greift | Stand iOS 26 unbestätigt | übernommen: eigene Prüfung mit Meldung am Feld |

### Kalenderexport
| ID | Quelle | Aussage | Gegenprüfung / Grenze | Umsetzung |
|---|---|---|---|---|
| F23 | rfc-editor.org/rfc/rfc5545.txt §3.1, 3.3.5, 3.6.1 | CRLF; Zeilen höchstens 75 Oktette; `PRODID`, `VERSION`, `UID`, `DTSTAMP` Pflicht; `TZID` verlangt `VTIMEZONE` | – | als Testaussagen in `ics-share.test.ts` |
| F24 | github.com/adamgibbons/ics (`fold-line.js`); github.com/sebbo2002/ical-generator (`tools.ts`) | `ics` faltet nach Zeichen, `ical-generator` nach Oktetten | Überlange Zeilen tolerieren die meisten Programme | eigener Generator, Oktett-Faltung, Test mit „ñ 🍹“ |
| F25 | ical-generator README; RFC 5545 §3.2.19 | TZID nur mit VTIMEZONE sinnvoll | UTC verliert die „Wandzeit“ – relevant nur für Serien | UTC übernommen; `DTEND` = Start + 2 h |
| F26 | news.ycombinator.com/item?id=36116650 (29.05.2023, gelesen); Snippets zu In-App-Browsern | ICS-Import auf iOS ist unzuverlässig, besonders aus In-App-Browsern | anekdotisch, 2023 | **offen**: Gerätetest; Text-Einladung bleibt der sichere Weg. Abweichung: UID bleibt zufällig je Entwurf (aus V3 getestetes Verhalten) statt Hash; über den Einladungslink teilen alle dieselbe Kennung |

### Service Worker und PWA
| ID | Quelle | Aussage | Gegenprüfung / Grenze | Umsetzung |
|---|---|---|---|---|
| F27 | web.dev/articles/service-worker-lifecycle | Neuer Worker wartet; `skipWaiting` kann alte Seiten mit neuem Code mischen; URL nie ändern | – | übernommen: feste `sw.js`, Aktivierung nur per Nachricht |
| F28 | developer.chrome.com/docs/workbox/handling-service-worker-updates | Bei network-first ist ein Hinweis weniger nötig, aber sinnvoll | – | übernommen: Toast „Neu laden“ |
| F29 | developer.chrome.com/docs/workbox/caching-strategies-overview; jakearchibald.com/2016/caching-best-practices/ | Navigation network-first, Hash-Assets cache-first | Regeln für geschütztes HTML sind eigenes Urteil | übernommen; Vorschau speichert nie HTML |
| F30 | github.com/vite-pwa/astro (v2.0.2) | Precache aller HTML-Seiten als Standard | bringt Workbox mit | abgelehnt (D12) |
| F31 | web.dev/learn/pwa/installation; webkit.org „News from WWDC25“ | iOS ohne Installationsdialog; ab iOS 26 öffnet jede Home-Screen-Seite als Web-App; getrennter Speicher | – | übernommen: stiller Hinweis auf „Besuch“, `start_url` = Sprachwahl, Navigation ohne Browserleiste nutzbar |

### Seitenübergänge
| ID | Quelle | Aussage | Gegenprüfung / Grenze | Umsetzung |
|---|---|---|---|---|
| F32 | developer.chrome.com/docs/web-platform/view-transitions/cross-document; MDN | Opt-in per `@view-transition`; Chrome/Edge 126, Safari 18.2, Firefox noch nicht | Reduced-Motion-Muster ist übliche Praxis, dort nicht belegt | übernommen als reine Zugabe, 180 ms |

### Navigation und Karte
| ID | Quelle | Aussage | Gegenprüfung / Grenze | Umsetzung |
|---|---|---|---|---|
| F33 | nngroup.com/articles/hamburger-menus/ (2016, 179 Teilnehmende) | Versteckte Navigation senkt Auffindbarkeit um über 20 % | alt, keine Tab-Leisten getestet | übernommen: sichtbare Navigation |
| F34 | nngroup.com/articles/mobile-navigation-patterns/ (2015) | Leisten für höchstens fünf Ziele, mit Beschriftung | kostet dauerhaft Platz | übernommen; bei geringer Höhe wird die Leiste statisch |
| F35 | news.ycombinator.com/item?id=39070246 (214 Punkte) und ?id=33387760 (536 Punkte, 636 Kommentare) | Ärgernisse: nicht zoombare Seiten, Kategorie-Klickpfade ohne Überblick, winzige Schrift, JS-Pflicht, schwaches Netz. Gegenstimmen: QR-Karten erlauben Bestellen im eigenen Tempo; manche wollen ein einziges, zoombares Dokument | Publikum nicht repräsentativ | übernommen: eine lange Seite, Filter nur als Zusatz, Zoom frei, kleine Seite, Druckansicht der Karte |
| F36 | (a) kleiner Reddit-Thread über Momentaufnahme; (b) nngroup.com/articles/qr-code-guidelines/ (2024); (c) CSS-Tricks „A Perfect Table of Contents“ (2022); (d) Anbieterblogs, nur Snippet | QR direkt auf die Zielseite; Punktlinien nur dekorativ; Preis an jedem Eintrag | (a) vier Kommentare | übernommen: Preis rechts mit `tabular-nums`, keine Punktlinien im Text; QR-Empfehlung in `docs/05_PLAN.md` |

### Schriften
web.dev/articles/font-best-practices: WOFF2, variable Schrift lohnt bei mehreren Schnitten, `swap` für Markenschrift, Selbsthosting nicht automatisch schneller. Übernommen: zwei variable Familien, selbst gehostet (keine Dritt-Anfragen). Offen als Optimierung: Subsetting (heute ca. 167 kB Schriften beim ersten Besuch).

## Eigene Messungen und Gegenproben
- Der Verdacht aus F2 und die Befunde der Reviews wurden im Browser nachvollzogen; Ergebnisse stehen in `docs/06_QA.md`.
- Dass Browserskripte kein Schema importieren dürfen, ist kein Recherchebefund, sondern ein eigener Fund: Ein Test fand interne Feldnamen im Client-Bundle; behoben und dauerhaft geprüft (`tests/e2e/public.spec.ts`).
