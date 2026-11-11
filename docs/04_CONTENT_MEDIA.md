# Inhalte und Medien

Führender Ort für Fakten ist `src/content/published/venue.json` (mit `status`, `source`, `observedAt`). Diese Tabelle fasst zusammen und nennt, was fehlt.

## Faktenregister (Stand 11.11.2026)
| Inhalt | Beleglage | Status im Code | Öffentlich sichtbar |
|---|---|---|---|
| Name/Ort | CHUCCA Playa de Palma; Unternehmensseite mischt Hamburg und Mallorca | – | ja |
| Besucheradresse | Riu Center, Carrer del Llaüt 23, 07610 Palma – Website und Verzeichnisse übereinstimmend (Strategie 25.10.2026) | `confirmed` (Quellenlage, keine Betreiberbestätigung) | ja |
| Instagram | @chucca_palma (Projektquelle, Verzeichnisse) | `confirmed`; `acceptsInquiries: false` | ja, als Kontakt |
| E-Mail, Telefon | veröffentlicht, Erreichbarkeit ungetestet | `source-claim` | nein |
| Öffnungszeiten | Widerspruch 19–00 vs. 20–02 Uhr | `unknown` | nein – Hinweis „noch nicht bestätigt“ |
| Eingang/Lage | „zweite Linie, Höhe Balneario 7, Zugang über Innenhof“ aus Verzeichnissen | `source-claim` | nur Vorschau, mit Hinweis |
| Karte/Preise | keine belastbare aktuelle Karte | `published/menu.json` leer, `pending` | „Die bestätigte Karte folgt.“ |
| Reservierung | kein bestätigter Empfangsweg | – | nur vorbereitete Nachricht, kein Versand |
| Termine | keine bestätigte Liste | `published/events.json` leer | Modul fehlt |
| Fotos | 4 Verweise (MallorcaGuide), Rechte offen, nicht gesichtet | gesperrt | nein |
| Koordinaten | Näherung 39,52 / 2,74 nur für den Sonnenstand | `approxGeo` | nein (Navigation nutzt die Adresse) |

Annahme, die vor dem Release der Betreiber bestätigen sollte: die Adresse. Sie ist die einzige Angabe, die ohne Betreiberbeleg öffentlich erscheint.

## Was der Betrieb liefern muss (blockiert nur die betroffenen öffentlichen Teile)
1. Aktuelle Karte mit Namen, Zutaten, Größen, Preisen, alkoholfreien Drinks; Übersetzungen prüfen.
2. Öffnungszeiten je Wochentag, Saisonzeitraum, Ausnahmen.
3. Betreuter Anfrageweg (Kanal, Zuständigkeit, Antwortzeit) oder die Entscheidung, keinen anzubieten.
4. 8–12 Originalfotos (Eingang, Hof, Bar, Drinks, Menschen mit Einwilligung) samt Nutzungsfreigabe.
5. Bestätigung von Adresse, Eingangsbeschreibung, Instagram; Impressum und Datenschutzhinweis für die Veröffentlichung.
6. Logo/Markenvorgaben, falls vorhanden.

## Pflege (ohne Eingriff in Komponenten)
- **Karte**: `src/content/published/menu.json` füllen, `status: "confirmed"`, `updatedAt` setzen. Vorlage: `src/content/fixtures/menu.json`. Ab dann ersetzt sie die Beispielkarte in beiden Modi.
- **Öffnungszeiten**: in `venue.json` `hours.status: "confirmed"`, `regular` mit sieben Einträgen (Sonntag zuerst; `null` = geschlossen; `close` kleiner als `open` = nach Mitternacht), optional `validFrom`/`validUntil` und `exceptions`.
- **Termine**: Einträge in `published/events.json` mit `kind: "published"`, `status: "confirmed"`.
- **Anfragekanal**: beim Kanal `acceptsInquiries: true` – die Übergabe an ein Backend ist danach eigene Arbeit (`docs/05_PLAN.md`, Aufgabe 08).
- **Fotos**: Datei nach `src/assets/media/`, Katalogeintrag mit `kind: "photograph"`, `rights_status: "approved"` samt Beleg, `venue_verified: true` samt Beleg, `alt` in drei Sprachen. Erst dann erscheint das Bild.
- Prüfen: `npm test` (Schema, Freigaben), danach `npm run build:test && npm run test:e2e`.

Ein CMS ist bewusst nicht eingebaut: Es gibt noch keinen bestätigten Pflegeprozess. Die JSON-Dateien sind so geschnitten, dass ein Git-basiertes CMS später darauf aufsetzen kann.

## Medienpipeline
1. Katalogeintrag (intern, mit Quelle, Rechte- und Standortbeleg).
2. Gates in `src/lib/media.ts`: Rechte freigegeben, Standort verifiziert, echtes Foto, Datei vorhanden, Alternativtext vorhanden. Erst filtern, dann Duplikate entfernen (ID, Quelle ohne Fragment, Datei, SHA-256).
3. Build erzeugt AVIF/WebP-Varianten mit `srcset`/`sizes` (`Art.astro`), Fokuspunkt aus dem Katalog.
4. Ausgeliefert wird nur `MediaPublic`. `tests/e2e/public.spec.ts` durchsucht den öffentlichen Build nach internen Feldern und Quellen.

Aktueller Bestand: 8 Konzeptillustrationen (eigenes Werk, nur Vorschau), 4 gesperrte Verweise, 0 veröffentlichbare Fotos.

## Quellen
Strategie vom 25.10.2026 und Audit vom 11.11.2026 aus dem Startpaket (nicht im Repo): chucca-x.com (Start, Menü, Impressum), instagram.com/chucca_palma, MallorcaGuide-Eintrag. In diesem Durchlauf wurden keine Venue-Quellen neu abgerufen; die Angaben gelten mit ihrem jeweiligen `observedAt`.
