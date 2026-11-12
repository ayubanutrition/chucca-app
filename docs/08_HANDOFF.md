# Handoff

Stand 11.11.2026.

## Was fertig ist
V4 als zusammenhängende, ausführbare Web-App: Heute, Drinks, Besuch, Gruppenplaner, Galerie, Event-Zustände; DE/EN/ES mit lokalisierten Routen; Mobile und Desktop; zwei Betriebsmodi; PWA-Grundlage; 62 Unit- und 60 Browser-Tests.

## Wo es läuft
Nur lokal. Kein Deployment, keine öffentliche URL, kein PR.

```sh
npm ci
npm run build && npm run serve   # http://127.0.0.1:4321/
npm run check                    # vollständige Prüfung
```

## Commits
| Stand | SHA | Ort |
|---|---|---|
| Ausgangspunkt `main` | `8dec65b` | Remote und lokal |
| V4 Erstfassung | `cc92395` | Branch `claude/trusting-wozniak-wer4jd`, gepusht |
| Review-Fixes | `c2ac62c` | derselbe Branch |
| Dokumentation, QA, Recherche | `1940e43` | derselbe Branch |
| Service-Worker- und Unterpfad-Tests, Planer-Layout | `7f46e85` | derselbe Branch, gepusht; letzter Stand mit `npm run check` Exit 0 |
Spätere Commits (nur Doku) ändern nichts am Code; maßgeblich ist `git log origin/claude/trusting-wozniak-wer4jd`.

Der Branchname folgt der Vorgabe der Arbeitsumgebung, nicht `rebuild/chucca-v4`.

## Was nur die Veröffentlichung blockiert
1. Betreiberdaten: Karte mit Preisen, Öffnungszeiten, Bestätigung von Adresse und Eingang, Fotos mit Rechten, Impressum/Datenschutz.
2. Entscheidung zu Hosting und Domain (die bestehende geschützte Vorschau war von hier nicht erreichbar und ist unberührt).
3. Gerätetests und muttersprachliche Durchsicht.

Ohne diese Punkte ist der öffentliche Build technisch lauffähig, zeigt aber „Die bestätigte Karte folgt“, keine Zeiten und keine Bilder.

## Nicht behaupten
Keine Veröffentlichung, keine Geräteabnahme, keine Felddaten, keine WCAG-Zertifizierung, keine native App, keine bestätigten Venue-Daten außer den in `docs/04_CONTENT_MEDIA.md` genannten.

## Nächste drei Schritte
1. Betreiberdaten anfordern (Liste in `docs/04_CONTENT_MEDIA.md`) und einpflegen – Aufgabe 12.
2. Hosting festlegen, Vorschau deployen, Service Worker und Unterpfad dort prüfen – Aufgaben 13, 15, 16.
3. Gerätetests auf iPhone und Android inkl. In-App-Browsern – Aufgabe 14.
