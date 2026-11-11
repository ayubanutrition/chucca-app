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

**D16 · Schriften selbst gehostet (Fontsource).** Keine Anfragen an Dritte; Kosten: ca. 167 kB Schriften beim ersten Besuch. Status: umgesetzt; Subsetting ist mögliche Optimierung.

**D17 · Arbeitsbranch `claude/trusting-wozniak-wer4jd` statt `rebuild/chucca-v4`.** Vorgabe der Arbeitsumgebung; Worktree unter `.worktrees/chucca-v4`. Status: gilt für diese Session.
