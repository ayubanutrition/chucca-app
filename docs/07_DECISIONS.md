# Entscheidungen

Format: ID · Datum · Entscheidung · Grund · Konsequenz · Status.

**D01 · 11.11.2026 · Vollständiger Neubau.** Neue Struktur und Oberfläche; fachliche Logik aus V3 wird mit Tests portiert, nichts wird per CSS überlagert. Status: umgesetzt.

**D02 · Web/PWA zuerst, Native getrennt.** Kein natives Projekt in diesem Stand. Status: gilt.

**D03 · Astro 7 + TypeScript, ohne UI-Framework.** Vorgerenderte Seiten, sechs kleine Skripte. Grund: Inhalt muss ohne JavaScript lesbar sein; Interaktion ist punktuell. Konsequenz: ca. 9 kB JS gzip gesamt. Status: umgesetzt.

**D04 · Inhaltstreue.** Öffentlich nur `confirmed`. Fehlende Daten blenden Funktionen aus oder zeigen einen ehrlichen Zustand. Status: verbindlich, durch Tests abgesichert.

**D05 · Keine V3-Mockups, keine fotorealistischen Platzhalter.** Die Vorschau nutzt selbst erzeugte Illustrationen mit Kennzeichnung. Grund: Mockups enthielten eingebrannte UI; fotorealistische KI-Bilder könnten als Lokal missverstanden werden. Nebenbefund: die angebundene Bild-API war mangels Guthaben nicht nutzbar. Status: umgesetzt.

**D06 · Ein öffentlicher Medienvertrag.** Explizite Feldliste statt Vollexport. Status: umgesetzt.

**D07 · Zwei Betriebsmodi in einem Code.** `preview` (Standard) und `public` aus derselben Quelle; Beispieldaten liegen in einem eigenen Ordner. Grund: Vorschau soll vollständig wirken, ohne dass je ein Platzhalter öffentlich wird. Status: umgesetzt.

**D08 · Eigene Routentabelle mit lokalisierten Segmenten.** Statt Astro-i18n-Routing und `@astrojs/sitemap`, die gleiche Pfade je Sprache annehmen. Status: umgesetzt.

**D09 · `/` ist Sprachwahl, keine Auto-Weiterleitung.** Grund: Google rät von Sprach-Redirects ab; `x-default` braucht eine echte Seite. Ausnahme: gemerkte Wahl und V3-Hash-Links. Status: umgesetzt.

**D10 · Öffnungsstatus nur aus bestätigten Daten; stattdessen Sonnenuntergang.** Die „Jetzt“-Leiste zeigt, was sich verlässlich berechnen lässt (Ortszeit, Sonnenuntergang), und sagt offen, dass Öffnungszeiten fehlen. Status: umgesetzt.

**D11 · Gruppenanfrage als vorbereitete Nachricht.** Kein Formularversand ohne betreuten Kanal; der Gast sendet selbst. Status: umgesetzt; Ausbau hängt am Betrieb.

**D12 · Handgeschriebener Service Worker und ICS-Generator.** Keine Abhängigkeit für je unter 100 Zeilen; ICS faltet nach Oktetten (die verbreitete Bibliothek `ics` faltet nach Zeichen). Status: umgesetzt.

**D13 · Service Worker übernimmt nicht ungefragt.** Neue Version wartet auf „Neu laden“, damit ein offenes Formular nicht verloren geht. Status: umgesetzt.

**D14 · Entwurf im Sitzungsspeicher, Übergabe per URL als Ersatz.** V3 hielt den Entwurf nur im Speicher einer Einzelseite; mit echten Seiten braucht es Persistenz. Die URL enthält nur Datum, Uhrzeit, Kennung. Status: umgesetzt.

**D15 · Kein CMS, kein Backend.** Bis ein Pflege- und Anfrageprozess bestätigt ist. Status: gilt.

**D16 · Schriften selbst gehostet, verschlankt.** Keine Anfragen an Dritte. Die Fontsource-Pakete (nur noch Entwicklungsabhängigkeit) liefern die Rohdaten; `scripts/make-fonts.py` erzeugt daraus drei WOFF2 in `src/assets/fonts/` (Fraunces normal und kursiv, Instrument Sans): Fraunces mit festem `SOFT` 100 (das Design nutzt nie einen anderen Wert) und `wght` 340–700, Instrument Sans `wght` 400–700. Eigene `@font-face` in `src/styles/fonts.css`, `font-display: swap`, metrikangepasste Notschriften (`size-adjust` u. a.) gegen Layoutsprünge. Erstbesuch: 166,9 → 102,5 kB (erste Fassung, Latin-1-Teilmenge), dann 105,5 → 84,4 kB (Labor, gleiche Messbedingungen und gleicher Stand der Seiten; Dateien 104,3 → 82,8 kB). Hebel der zweiten Stufe: **Zeichenbestand statt Latin-1**. Die Teilmenge besteht aus einem festen Sockel (ASCII, Pflichtbuchstaben DE/ES/Katalanisch, typografische Satzzeichen, €, ×, −, geschütztes Leerzeichen) plus jedem Zeichen aus den Quelltexten (`src/i18n`, `content`, `components`, `layouts`, `pages`, `scripts`, `styles`); das sind 143 statt 190 Zeichen und spart 21,6 kB (ohne Œ œ ı ŀ, Währungs- und Sonderzeichen, Akzente, die kein Text braucht). Neue Texte nehmen ihre Zeichen beim nächsten `make-fonts.py`-Lauf automatisch auf; `tests/unit/fonts.test.ts` schlägt fehl, solange ein Zeichen des Textbestands in einer der drei Schriften fehlt (Pfeile → ↗ ↓ kommen bewusst aus der Systemschrift). Geprüft und verworfen: Layout-Merkmale weiter kürzen (die Schriften enthalten nur noch `rvrn`, `kern`, `liga`, `locl`, `tnum`; `calt`/`mark`/`mkmk`/`case` fehlten ohnehin, `rvrn` schützt die Zeichenbreiten, `tnum` braucht `tabular-nums`); Namens- und Metadatentabellen (spart nur ca. 0,7 kB, die OFL-Angabe bleibt in der Datei); Fraunces-`wght` auf 340–560 (genutzt wird nichts darüber, spart 4,4 kB, aber jede künftige fette Auszeichnung in Fraunces würde still auf 560 gedeckelt; Reserve bis 700 bleibt); Instrument Sans `wght` kürzen (genutzt 400–700, nichts zu gewinnen); Kursiv auf eine Teilmenge der gesetzten Zeichen (Kursiv trägt Überschriftenbetonungen, Kategorietitel der Karte aus `menu.json` und die Uhrzeit der Termine; eine engere Menge würde bei neuem Inhalt still auf eine Notschrift fallen, der Gewinn wäre nicht nötig). Kein Preload: im Labor verschlechterte er LCP (ca. 750 → 1200 ms), weil die Schriften mit CSS und Hero-Bild um die Bandbreite konkurrierten; die Notschriften halten CLS bei 0. Kein Schriftbild-Unterschied: Pixelvergleich Vorher/Nachher bei 390 und 1440 px für alle fünf Seiten in DE, EN und ES (30 Seitenansichten, Schwelle 8/255 je Kanal) ergab 0 abweichende Pixel; eine einzelne Abweichung durch ein spät geladenes Galeriebild war im Wiederholungslauf verschwunden. Lizenz: OFL-Texte liegen unter `public/fonts/` und im Build. Status: umgesetzt; Pfeile (→ ↗ ↓) fehlen schon im Original und kommen weiterhin aus der Systemschrift.

**D17 · Arbeitsbranch `claude/trusting-wozniak-wer4jd` statt `rebuild/chucca-v4`.** Vorgabe der Arbeitsumgebung; Worktree unter `.worktrees/chucca-v4`. Status: gilt für diese Session.

**D18 · Auslieferungs-Header hostneutral als erzeugte `_headers`.** Der Build schreibt `_headers` (Netlify/Cloudflare-Format) mit Cache-Regeln, Sicherheits-Headern und einer CSP, deren Skript- und Style-Hashes aus den erzeugten Seiten berechnet werden; `X-Robots-Tag` nur in der Vorschau bzw. ohne Site-URL. Grund: Hosting-Ziel offen, Inhalt hängt vom Modus ab, Inline-Skripte (Sprachwahl, 404) und das eingebettete CSS verlangen Hashes statt `unsafe-inline`. Bewusste Lockerung: `style-src-attr 'unsafe-inline'`, weil Komponenten `style=`-Attribute setzen (kein Skriptpfad). Cache-Regeln überlappen nicht, weil Hosts gleichnamige Header zusammenführen. HSTS bleibt Sache des Hosts. Status: umgesetzt und im Browser mit simuliertem Host geprüft; auf einem echten Host nicht geprüft.
