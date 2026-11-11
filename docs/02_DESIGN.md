# Design: „Patio nocturno“

Status: umgesetzte Designhypothese. Es gibt kein freigegebenes Brandbook und kein Originallogo im Projekt; Wortmarke, Zeichen und Farben sind Vorschläge.

## Leitidee
Ein warmer Abend im Innenhof an der Playa de Palma: dunkles Pflaumen-Espresso, cremefarbenes Papier, Orange als Licht, Pink als einzelner Neonfaden. Persönlich statt Club, Innenhof statt erfundenem Meerblick.

## Drei Zeichen
1. **Der Bogen** – Bilder stehen in Rundbögen (Hofdurchgang). `.art--arch`.
2. **Das X** – zwei gekreuzte Lichtbalken, Orange über Pink: Wortmarke, Eyebrow-Marke, aktive Chips, Lageskizze. `Mark.astro`, `.eyebrow::before`.
3. **Das Band** – ein Rautenband nach Art der mallorquinischen *Roba de llengües* trennt dunkle und helle Flächen. `--band`, `.band`. Der Mallorca-Bezug entsteht so ohne Strandklischee.

## Farbe (Tokens in `src/styles/global.css`)
| Rolle | Token | Wert |
|---|---|---|
| Grund | `--ink-900` / `--ink-950` | #1b0f17 / #130a10 |
| Fläche | `--ink-800` | #26151f |
| Text | `--cream`, `--cream-dim`, `--cream-mute` | #f7ecdc, #d9c7b6, #b9a596 |
| Papier | `--paper`, `--paper-ink`, `--paper-mute` | #f5e8d5, #23131b, #5c4650 |
| Haupthandlung | `--orange` (auf Papier `--orange-ink`) | #ff8f45 (#a53d0b) |
| Lichtakzent | `--pink` (auf Papier `--pink-ink`) | #f27aa5 (#a1204d) |

Regeln: Orange gehört der Haupthandlung und der kursiven Betonung. Pink nur für Kennzeichnung (Vorschau, Hinweislinie, Beispiel). Die Karte und der Abschluss liegen auf Papier – der Wechsel dunkel/hell gibt den Seiten Rhythmus. Kontraste prüft axe in `core.spec.ts`.

## Typografie (zwei Familien, selbst gehostet, OFL)
- **Fraunces Variable** (SOFT 100) für Überschriften, Drinknamen, Zahlen der „Jetzt“-Leiste. Kursiv in Orange trägt je Überschrift genau eine Betonung.
- **Instrument Sans Variable** für alles Bedienbare und Fließtext.
- Fluide Stufen `--step--1 … --step-5`; Zeilenlänge über `--measure` (34rem); Preise mit `tabular-nums`.

## Layout
- Mobil: Kopf mit Wortmarke und Sprachwahl, feste Leiste unten mit fünf beschrifteten Zielen (Safe Area berücksichtigt). Bei sehr geringer Höhe (200 % Zoom) wird die Leiste statisch.
- Desktop (ab 60rem): eigene Kompositionen – 7/5-Raster im Hero, Kartenkategorien als stehende Randspalte, Planer und Einladungskarte nebeneinander.
- Keine Kartenwand: Wege als große Fragezeilen, Infos als Zeilen mit Linie, Karten nur für die Einladung, das Formular und Termine.

## Komponenten
Navigation (`.topnav`, `.tabbar`), Sprachwahl (`.langs`), Button/Link (`.btn`, `.link`), Chip, Menüzeile (`.drink`), Kategorie, Hinweis (`.notice`), Status (`.status`), Formfeld (`.field`/`.input`), Bild (`Art.astro`), Einladungskarte (`.ticket`), Dialog (`.lightbox`), Leerzustand (`.empty`), Toast.

## Bewegung
Ein kurzer Überblendeffekt zwischen Seiten (native Cross-Document View Transitions, nur bei `prefers-reduced-motion: no-preference`), Hover-/Fokus-Übergänge unter 320 ms, Einblenden der Bildansicht. Keine Daueranimation, kein Parallax, keine Scrollsperre. Die Himmelsstimmung des Heros (`data-sky`) wechselt mit der Tagesphase in Playa de Palma – statisch, nicht animiert.

## Bildregel
Es gibt keine freigegebenen Fotos. Die Vorschau nutzt acht selbst erzeugte Plakat-Illustrationen (`scripts/make-concept-art.mjs`), jede mit der Marke „Konzeptmotiv“. Sie sind bewusst keine fotorealistischen Bilder, damit sie nie für Aufnahmen des Lokals gehalten werden. Die alten V3-Mockups (`atmosphere.webp`, `drink.webp`) werden nicht verwendet. Im öffentlichen Build erscheinen ausschließlich freigegebene Fotos; ohne Fotos trägt die Typografie den Hero allein.

## Abnahme
Screenshots des laufenden Stands: `docs/evidence/`. Geprüfte Breiten und Befunde: `docs/06_QA.md`.
