# Produkt

## Ziel
Gäste entscheiden, ob CHUCCA zu ihrem Abend passt, und organisieren den Besuch – ohne Konto, ohne Installation. Vier Fragen leiten alles: Passt es zu uns? Was gibt es zu trinken? Wie kommen wir hin? Wie bringen wir die Gruppe zusammen?

Arbeitssegmente (keine gemessene Gästestatistik): spontane Paare und Kleingruppen, Gruppenorganisatoren, wiederkehrende Gäste.

## Seiten und Akzeptanz
| Seite | Aufgabe | Umgesetzt als | Akzeptanz (geprüft in) |
|---|---|---|---|
| Heute `/{de,en,es}/` | Ort, Stimmung, nächster Schritt | Hero mit Route und Drinks oberhalb der Falz; „Jetzt“-Leiste mit Madrider Uhrzeit, Sonnenuntergang und ehrlichem Öffnungsstatus; drei Wege; Termine und Bildvorschau nur bei Bestand | `core.spec.ts` Kernstrecke |
| Drinks | Angebot und Preis verstehen | Eine lange, auch ohne JavaScript lesbare Karte; Kategorien, Zutaten, Größen, Preise; Suche; Geschmackskompass; alkoholfreie Auswahl als eigene Kategorie und eigener Filter | `core.spec.ts` Getränkekarte |
| Besuch | Hinfinden, Kontakt | Adresse, Google/Apple Maps, Teilen/Kopieren, Wegskizze (nur mit Beleglage), Öffnungszeiten-Zustand, Instagram, vorbereitete Gruppennachricht | `flows.spec.ts` Besuch |
| Gruppe | Verabredung planen | Datum/Uhrzeit in Europe/Madrid, Live-Einladungskarte, Teilen → Zwischenablage → manuelles Kopieren, ICS | `flows.spec.ts` Gruppenplaner |
| Galerie | Ort einschätzen | Raster mit responsiven Varianten, Bildansicht mit Tastatur; öffentlich nur freigegebene Fotos | `flows.spec.ts` Galerie |
| Sprachwahl `/` | Einstieg | Drei Sprachen, Vorschlag nach Browser, keine Zwangsumleitung | `core.spec.ts` |

Events haben bewusst keine eigene Seite: sie erscheinen auf „Heute“, sobald bestätigte, nicht abgelaufene Termine existieren.

## Zustände
| Bereich | Zustände |
|---|---|
| Karte | bestätigt · Beispielkarte (nur Vorschau, gekennzeichnet) · „folgt“ (öffentlich ohne Daten) · gefiltert · Nulltreffer · Preis fehlt · nicht verfügbar |
| Öffnung | unbestätigt (Standard) · geöffnet bis · geschlossen, öffnet am · geschlossen |
| Termine | keine (Modul fehlt) · bestätigt · Beispiel (nur Vorschau) · abgelaufen (verschwindet clientseitig) |
| Bilder | Foto · Konzeptmotiv (gekennzeichnet) · leer · Ladefehler |
| Teilen | geteilt · kopiert · abgebrochen (keine Meldung) · manuelles Kopieren |
| Planer | leer · gültig · Fehler je Feld (Datum, Uhrzeit, Zeitumstellung, Vergangenheit) · Plan aus Link |
| Gruppennachricht | nicht gesendet/vorbereitet · kopiert. „Gesendet“ existiert nicht, solange kein betreuter Kanal bestätigt ist |
| Verbindung | online · offline (Hinweis; im öffentlichen Modus zuletzt geladene Seite) |

## Grenzen
Kein Buchungssystem, keine Zahlungen, keine Anmeldung, keine Live-Auslastung, kein Tracking. Die native App ist eine eigene Phase (siehe `docs/03_ARCHITECTURE.md`, „Native Phase“).

## Erfolgskriterien (zu beobachten, nicht behauptet)
Erstnutzer finden Route und Karte ohne Erklärung, teilen eine Einladung und unterscheiden Treffplan und Reservierung. Kennzahlen erst mit bewusst eingerichteter Messung; aktuell wird nichts gemessen.
