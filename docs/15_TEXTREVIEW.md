# Muttersprachliche Textdurchsicht EN/ES (Aufgabe 17)

**Status: Paket vorbereitet, keine Durchsicht erfolgt.** Aufgabe 17 in `docs/05_PLAN.md` bleibt BLOCKED, bis mindestens eine Person je Sprache (Englisch, Spanisch) die Texte gelesen und freigegeben hat. Bisher gibt es nur ein KI-Lektorat (`docs/10_TEXTPRUEFUNG.md`); das ist keine Freigabe. Auch die deutschen Texte sind von keiner zweiten Person gegengelesen.

Dieses Dokument richtet sich an Prüfpersonen ohne Entwicklerwissen (Teil 1 bis 4) und an die Betreuung, die die Rückmeldungen einarbeitet (Teil 5).

## 1. Was Sie bekommen
Die Betreuung erzeugt das Prüfblatt aus den Quelldateien und gibt Ihnen zwei Dateien:

| Datei | Wofür |
|---|---|
| `i18n-review.html` | Zum **Lesen** im Browser (Handy oder Rechner, ohne Internet). Alle Texte in drei Spalten Deutsch, English, Español, mit Suche und Filtern. Hier nichts eintragen. |
| `i18n-review.csv` | Zum **Ausfüllen** in Excel oder Google Tabellen (UTF-8, Semikolon als Trennzeichen). Gleiche Zeilen wie die HTML-Fassung. |

Die Dateien liegen nur bei Ihnen und bei der Betreuung. Sie sind nicht Teil der Website und werden nicht veröffentlicht.

## 2. Was Sie tun
1. Die HTML-Datei öffnen und einmal durchlesen, um ein Gefühl für die Seite zu bekommen. Wenn möglich zusätzlich die Vorschau der Website in Ihrer Sprache ansehen (Adresse von der Betreuung): Texte wirken im Zusammenhang anders als in einer Tabelle.
2. In der CSV Ihre Sprache prüfen (nur **EN** oder nur **ES**; Deutsch lesen Sie zum Vergleich). Pro Zeile:
   - **Freigabe (ja/nein):** `ja`, wenn der Text für Sie natürlich, richtig und passend klingt. `nein`, wenn nicht. Leer lassen, wenn Sie die Zeile nicht beurteilen können.
   - **Korrekturvorschlag:** bei `nein` der vollständige Ersatztext in Ihrer Sprache. Platzhalter in geschweiften Klammern wie `{time}`, `{count}`, `{date}` **unverändert** übernehmen (die Website setzt dort Werte ein).
   - **Kommentar:** warum, Alternativen, Unsicherheit. Auch ein Satz wie „klingt etwas steif, aber verständlich“ hilft.
   - **Sprache der Rückmeldung:** `EN` oder `ES` in jede Zeile, die Sie beurteilt haben.
3. Die Datei unter einem Namen mit Ihrem Kürzel und der Sprache speichern (z. B. `i18n-review-ES-<Kürzel>.csv`, als „CSV UTF-8“) und an die Betreuung zurückschicken.

Sie müssen nicht alles beurteilen. Eine Teilprüfung ist willkommen, wenn klar ist, welche Zeilen fehlen.

## 3. Worauf achten
- **Passt der Text zur Marke?** Es gibt kein freigegebenes Brandbook (`docs/02_DESIGN.md`). Der folgende Ton ist eine Beobachtung dessen, was die vorhandenen Texte tun, und keine Vorgabe der Marke. Widersprechen Sie, wenn er Ihnen falsch erscheint:
  - kurz, warm und direkt, ohne Werbesprache und ohne Versprechen (keine „besten Cocktails“, keine Zusagen für Plätze);
  - die Einzelperson wird geduzt (DE „du“, ES „tú“); die Gruppe in Überschrift und Planer wird mit „ihr“ angesprochen (DE „euch“, ES „vosotros“, z. B. „Leg fest, wann ihr euch bei CHUCCA trefft“). Bitte bestätigen, ob das gewünscht ist (offener Punkt 4 in `docs/10_TEXTPRUEFUNG.md`);
  - ehrlich über Unbekanntes: Was der Betrieb noch nicht bestätigt hat, steht als „noch nicht bestätigt“. **Ein Treffplan ist keine Reservierung**: Dieser Satz muss in allen drei Sprachen klar bleiben (z. B. `group.note`, `visit.inquiry.limited`). Bitte keine Formulierung, die wie eine Zusage klingt.
- **Bewusste Eigenheiten, nicht „korrigieren“:**
  - Deutsche Überschriften sind oft zweiteilig und spielen mit dem Satzbau (z. B. „Was trinken wir?“, „Eine Zeit. Ein Treffpunkt.“, „Kommt vorbei.“, „Ein Blick hinein.“). Die Teile `titleA` und `titleB` werden in der Seite in zwei Schriftstilen gesetzt. Eine gute Übersetzung hat denselben Rhythmus, muss aber kein Wortspiel nachbauen; sinngemäß und natürlich ist richtig. Zwei Teile bitte nicht zu einem verschmelzen.
  - Mallorquinische Begriffe und Namen bleiben: *Roba de llengües* (das Zungenmuster der mallorquinischen Stoffe, in Bildtexten und im Rautenband der Gestaltung), *Balneario 7* (Strandabschnitt), *Carrer del Llaüt*, *Riu Center*, *Playa de Palma*. Gefragt ist, ob Schreibung und Erklärung stimmen (z. B. „tela de lenguas“), nicht, ob sie übersetzt werden sollen.
  - Zahlen- und Zeitformate (24-Stunden-Uhr, „Ortszeit Mallorca“) bleiben; ob sie in Ihrer Sprache natürlich klingen, ist eine gute Anmerkung.
- **Länge und Layout:** In der Spalte `Längenhinweis` stehen Faustregeln (Titel über 60 Zeichen, Beschreibung über 155, Tabbar-Beschriftung über 10, Knopf über 28, langer Text über 200 Zeichen, und wenn EN/ES mehr als das 1,5-Fache von DE messen). Das ist **keine Layoutmessung**. Bei Hinweisen kurz abwägen, ob ein kürzerer Text genauso gut ist; sagen Sie es im Kommentar. Ein längerer Text ist kein Fehler, solange er passt; ob er passt, zeigt erst das Gerät (`docs/14_GERAETETEST.md`).
- **Bereits bekannte Zweifel:** In der Spalte `Bekannter Zweifel` steht, wenn ein Text im KI-Lektorat geändert wurde (Vermerk KI-Änderung, mit Grund) oder zu einem offenen Punkt aus `docs/10_TEXTPRUEFUNG.md` gehört (Vermerk Offener Punkt mit Nummer). Diese Zeilen bitte besonders genau prüfen. Typische Fälle: spanische Uhrzeiten („a las 1:00“ wäre falsch, „a la 1:00“ richtig), britisches Englisch („flavour“, „fancy“), Anrede, Artikel vor „Playa de Palma“.
- **Gekennzeichnete Beispieldaten:** Zeilen der Art „Beispielkarte“, „Beispieltermin“, „Konzeptmotiv“ und „Ortsangabe, unbestätigt“ sind Platzhalter und stammen nicht von CHUCCA. Sie erscheinen nur in der privaten Vorschau und werden später durch Texte des Betriebs ersetzt. Prüfen Sie dort nur, ob die Sprache natürlich ist; „Freigabe ja“ bedeutet hier nicht, dass der Inhalt stimmt (z. B. Drinknamen und Zutaten sind erfunden).
- **Nicht im Blatt:** wenige feste Texte außerhalb der Wörterbücher, nämlich die Auswahlseite beim Start (`src/pages/index.astro`), die Offline-Seite des Service Workers (`src/lib/sw-template.ts`, dreisprachig in einem Block) und der Name im Manifest (`src/pages/manifest.webmanifest.ts`). Bitte bei der Gelegenheit mitlesen und im Kommentar einer beliebigen Zeile melden.

## 4. Spalten des Blatts
| Spalte | Bedeutung |
|---|---|
| `Schlüssel` | Eindeutige Kennung des Textes (siehe Teil 5). In Rückmeldungen immer mit angeben. |
| `Kontext/Seite` | Wo der Text erscheint (Seite oder Bereich) |
| `DE`, `EN`, `ES` | Aktueller Text |
| `Freigabe (ja/nein)`, `Korrekturvorschlag`, `Kommentar`, `Sprache der Rückmeldung (DE/EN/ES)` | **Ihre Spalten** |
| `Art` | Oberfläche, oder Beispielkarte / Beispieltermin / Konzeptmotiv / Ortsangabe, unbestätigt (alles Platzhalter) |
| `Datei` | Datei, in der der Text steht (für die Betreuung) |
| `Zeichen DE/EN/ES` | Länge in Zeichen je Sprache |
| `Längenhinweis` | Faustregel-Hinweis, siehe oben |
| `Bekannter Zweifel` | KI-Änderung oder offener Punkt aus `docs/10_TEXTPRUEFUNG.md` |

## 5. Für die Betreuung: Prüfblatt erzeugen und Rückmeldungen einarbeiten
**Erzeugen.** Im Repo (nach `npm ci`):

```sh
npm run i18n:review                       # schreibt nach reports/i18n-review/
npm run i18n:review -- --out <Ordner>     # anderer Ausgabeordner
```

Das Skript `scripts/i18n-review-sheet.mjs` liest `src/i18n/{de,en,es}.ts`, die Beispielkarte und -termine (`src/content/fixtures/`), `alt` und `caption` der Bilder und den Eingangshinweis in `src/content/published/venue.json`. Rechtebelege und Quellen aus `src/content/media/catalogue.json` werden **nicht** übernommen. Es braucht kein Netz und keine neue Abhängigkeit (nutzt Vite, das mit Astro kommt). Der Ordner `reports/` ist in `.gitignore` und liegt außerhalb der Build-Verzeichnisse; das Blatt gelangt nie in `dist*`. Jedes Mal neu erzeugen, wenn sich Texte ändern; das Datum steht in der HTML-Datei. Ein Test (`tests/unit/i18n-review.test.ts`) stellt sicher, dass jeder Schlüssel genau einmal vorkommt und DE, EN, ES vollständig sind.

**Schlüssel zu Datei.** Der Schlüssel ist der Punktpfad im Wörterbuch; die Spalte `Datei` nennt die Quelle.

| Schlüssel beginnt mit | Datei | Hinweis |
|---|---|---|
| `meta.`, `nav.`, `common.`, `today.`, `drinks.`, `visit.`, `group.`, `gallery.`, `footer.`, `notFound.`, `offlinePage.` | `src/i18n/de.ts`, `src/i18n/en.ts`, `src/i18n/es.ts` | Pfad folgen: `visit.inquiry.people` ist in `en.ts` das Feld `people` im Objekt `inquiry` im Objekt `visit`. Listen tragen den Index, `visit.hours.days.0` ist der erste Eintrag (Sonntag). |
| `menu.category.<id>.…`, `menu.<id>.name` / `.description` / `.ingredients.<n>` | `src/content/fixtures/menu.json` | nur Vorschau; Feld `de`, `en` oder `es` des Eintrags |
| `events.<id>.title` / `.summary` | `src/content/fixtures/events.ts` | nur Vorschau |
| `media.<id>.alt` / `.caption` | `src/content/media/catalogue.json` | Felder `alt` und `caption` |
| `venue.entrance.note` | `src/content/published/venue.json` | Quellenangabe, Status unbestätigt |

**Regeln beim Einarbeiten.**
- Nur den **Wert** ändern, nie Schlüssel oder Platzhalter. Deutsch definiert den Typ (`src/i18n/de.ts`), `en.ts` und `es.ts` müssen dieselben Schlüssel und Platzhalter haben (`tests/unit/i18n-sw.test.ts` prüft das).
- Widersprechen sich zwei Prüfpersonen derselben Sprache, entscheidet die Betreuung und hält den Grund fest; offene Fragen bleiben in `docs/10_TEXTPRUEFUNG.md`.
- Ändert ein Text die Länge deutlich (Titel, Beschreibung, Tabbar, Knöpfe), `npm test` und `npm run check` laufen lassen und die Seite bei 390 und 1440 px ansehen (`AGENTS.md`, Definition of Done).
- Nach dem Einarbeiten: `npm run i18n:review` neu erzeugen und die Änderungstabelle in `docs/10_TEXTPRUEFUNG.md` um die neuen Werte mit Quelle der Änderung („Muttersprachler EN, Kürzel, Datum“) ergänzen.

**Wann ist Aufgabe 17 DONE?** Erst wenn für EN und für ES je eine muttersprachliche Person die Texte durchgesehen hat, alle Zeilen mit `nein` eingearbeitet oder begründet abgelehnt sind und in `docs/10_TEXTPRUEFUNG.md` steht, wer wann welchen Umfang geprüft hat. Eine Teilprüfung bleibt eine Teilprüfung und wird so ausgewiesen. Die Spanisch- und Englisch-Prüfung in `docs/06_QA.md`, Abschnitt „Nicht geprüft“, bleibt bis dahin NOT RUN.
