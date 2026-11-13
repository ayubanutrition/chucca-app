# Geräte-Prüfprotokoll (Aufgabe 14)

**Status: Paket vorbereitet, nichts ausgeführt.** Aufgabe 14 in `docs/05_PLAN.md` bleibt BLOCKED, bis diese Prüfung auf echten Geräten gelaufen und ausgewertet ist. Es gibt noch keine Ergebnisse; jede Zeile steht auf NOT RUN. Emulation und Playwright ersetzen den Gerätetest nicht (`docs/06_QA.md`, Abschnitt „Nicht geprüft“).

Dieses Dokument ist für Prüfpersonen ohne Entwicklerwissen geschrieben. Ergebnisse kommen in die Datei `docs/templates/geraetetest-ergebnis.csv` (eine Zeile je Gerät und Schritt, schon mit NOT RUN vorbelegt) oder, auf Papier, in die Ankreuzfelder unten. Nicht beides.

## Die Regeln in fünf Sätzen
1. Nur eintragen, was Sie selbst auf diesem Gerät gesehen haben. Was Sie nicht prüfen konnten, bleibt **NOT RUN** (mit Grund in der Notiz).
2. **PASS** heißt: das erwartete Ergebnis ist genau so eingetreten. **FAIL**: es weicht ab (auch ein kleiner Unterschied). Bei Zweifel FAIL mit Notiz.
3. Manche Schritte sind Beobachtungen ohne Sollwert (z. B. wohin ein Link führt). Dort PASS, wenn nichts kaputt ist, und das Beobachtete in die Notiz schreiben.
4. Keine echten Anfragen an CHUCCA senden, keine Zugangsdaten, Namen oder private Nachrichten in Notizen und Screenshots. Beim Teilen an sich selbst oder in eine Testgruppe senden.
5. Die App zeigt in der Vorschau Beispieldaten (gekennzeichnet). Preise, Termine und Fotos der Vorschau sind erfunden und kein Fund. Fakten über das Lokal (Adresse, Zeiten) sind nicht bestätigt; die Prüfung bestätigt sie auch nicht.

## Voraussetzungen
- **Adresse der Vorschau:** `<VORSCHAU-URL>` (Platzhalter: es gibt noch kein Hosting, Aufgabe 13). Die Betreuung trägt die Adresse vor der Prüfung ein und nennt, ob es der Vorschau-Build oder der öffentliche Build ist. Ist ein Zugang nötig, erhalten Sie ihn getrennt; er gehört nie in Notizen, URLs oder Screenshots.
- **Buildtyp** im Lauf notieren (Spalte `Buildtyp` der CSV): `vorschau` (mit gekennzeichneten Beispieldaten) oder `oeffentlich`. Die Erwartungen unten gelten für `vorschau`; Abweichungen im öffentlichen Build sind bei den Schritten genannt.
- **Gerät:** geladen, mit Netz (WLAN oder Mobilfunk), Flugmodus erreichbar, Systemsprache und Zeitzone notieren.
- **Apps:** Apple Kalender oder Google Kalender, eine Messenger-App zum Senden an sich selbst (z. B. WhatsApp „Notizen an mich“), Karten-App.
- **Zeit:** etwa 45 bis 60 Minuten je Gerät. Schritte mit „(optional)“ dürfen entfallen.
- **Browserdaten:** vor dem ersten Lauf die Website-Daten für die Vorschau-Adresse löschen, damit Sprache und Entwürfe nicht aus früheren Besuchen stammen.
- **Beschriftungen:** In „…“ steht Text, der in der App so erscheint (je nach Sprache); in ›…‹ steht eine Beschriftung des Betriebssystems oder Browsers, die je nach Version abweichen kann.

## Gerätematrix

| ID | Gerät | Pflicht | Hinweis |
|---|---|---|---|
| G1 | iPhone, Safari | Pflicht | Normaler Safari-Tab. Safari hat keine eigene Versionsnummer; die iOS-Version (›Einstellungen > Allgemein > Info‹) genügt. |
| G2 | iPhone, Standalone („Zum Home-Bildschirm“) | Pflicht | Symbol vom Home-Bildschirm starten, nicht aus Safari. Vorher mit G1 installieren (Schritt A05 in G1). |
| G3 | Instagram-In-App-Browser | Pflicht | Link in einer Direktnachricht an sich selbst oder in einer Story/Bio öffnen. Plattform (iOS oder Android) und Instagram-Version notieren. |
| G4 | WhatsApp-In-App-Browser | Pflicht | Link in einem WhatsApp-Chat antippen (z. B. „Notizen an mich“). Plattform (iOS oder Android) und WhatsApp-Version notieren. |
| G5 | Android, Chrome | Pflicht | Normaler Chrome-Tab. Chrome-Version unter ›Einstellungen > Über Chrome‹. |
| G6 | Android, Samsung Internet | optional | Nur auf Samsung-Geräten oder wenn installiert. |
| G7 | Android, Firefox | optional | Firefox für Android. |

Zu jedem Gerät in der CSV eintragen: Modell, Betriebssystem mit Version, Browser mit Version (bei In-App-Browsern die Version der App), Sprache des Systems. Ohne diese Angaben ist ein Fund nicht nachvollziehbar.

## Schritte und erwartete Ergebnisse

Die Schrittnummer (z. B. `E07`) gilt für alle Geräte; in der CSV lautet die Kennung `Gerät-Schritt` (z. B. `G5-E07`). Welche Schritte für welches Gerät gelten, steht in den Gerätetabellen darunter.

### A · Start, Sprache, Installation

| Nr. | Name | Schritt | Erwartetes Ergebnis | gilt für |
|---|---|---|---|---|
| A01 | Startadresse öffnen | Die Startadresse `<VORSCHAU-URL>` öffnen (frische Sitzung; war schon eine Sprache gewählt, springt die Seite direkt dorthin: dann zuerst die Website-Daten löschen oder dies als Beobachtung notieren). | Auswahlseite mit der Überschrift „Playa de Palma“ und „Mallorca“ sowie drei Links „Deutsch“, „English“, „Español“ (darunter je „Heute →“, „Today →“, „Hoy →“). Der Link zur Gerätesprache ist hell hervorgehoben. | alle |
| A02 | Deutsch wählen | Auf „Deutsch“ tippen. | Seite „Heute“ auf Deutsch. Unten (Handy) steht die Tabbar mit „Heute“, „Drinks“, „Besuch“, „Gruppe“, „Galerie“; „Heute“ ist hervorgehoben. Oben rechts drei Sprachlinks DE, EN, ES (zugänglicher Name „Sprache wählen“). | alle |
| A03 | Sprache wechseln | In der Kopfzeile auf EN, dann auf ES, dann wieder auf DE tippen. Vorher auf „Besuch“ wechseln, damit die Seite mitwechseln kann. | Dieselbe Seite erscheint in der anderen Sprache (Adresse wechselt: `/de/besuch/`, `/en/visit/`, `/es/visita/`); die gewählte Sprache ist markiert; Tabbar-Beschriftungen wechseln mit („Visit“/„Visita“ usw.). Alle Beschriftungen sind vollständig lesbar. | alle |
| A04 | Sprache wird gemerkt | Tab beziehungsweise App schließen, die Startadresse `<VORSCHAU-URL>` erneut öffnen. | Die Seite springt direkt in die zuletzt gewählte Sprache, ohne Auswahlseite. In In-App-Browsern kann der Speicher getrennt oder flüchtig sein: dann Beobachtung notieren (kein Fehler der App). | alle |
| A05 | Zum Startbildschirm hinzufügen | iPhone: in Safari ›Teilen‹ antippen und ›Zum Home-Bildschirm‹ wählen. Android: Browsermenü, ›App installieren‹ oder ›Zum Startbildschirm hinzufügen‹ (Wortlaut je Version). Danach auf „Besuch“ den Aufklapper „CHUCCA auf dem Startbildschirm“ öffnen und den Text mit dem Vorgehen vergleichen. | Symbol mit CHUCCA-Zeichen und Namen „CHUCCA“ liegt auf dem Startbildschirm. Der Aufklapper nennt auf dem iPhone „Teilen“ und „Zum Home-Bildschirm“ (DE), „Share“ und „Add to Home Screen“ (EN), „Compartir“ und „Añadir a pantalla de inicio“ (ES) und sagt, dass es keine App aus dem App Store ist. Notieren, ob der Browser einen Installationsdialog anbot und wie er hieß. | G1, G5, G6, G7 |
| A06 | Start als Standalone | Das Symbol vom Home-Bildschirm starten (nicht über den Browser). | App öffnet ohne Browserleiste. Statuszeile (Uhrzeit, Akku) ist lesbar und wird von nichts überdeckt; die Kopfzeile der Seite beginnt unterhalb der Statuszeile beziehungsweise Notch. Farbe der Statuszeile im Screenshot festhalten. Es erscheint die Auswahlseite oder die gespeicherte Sprache (iOS kann den Speicher der installierten App von Safari trennen: beobachten und notieren). | G2 |
| A07 | Links im Standalone | Zwischen den Tabs wechseln, dann auf „Besuch“ einen Kartenlink („In Google Maps öffnen“) antippen, danach zurück zu CHUCCA wechseln. | Der Tab-Wechsel bleibt im App-Fenster. Der Kartenlink öffnet die Karten-App beziehungsweise den Browser; die Rückkehr zu CHUCCA ist möglich. Notieren, wohin der Link führt. | G2 |

### B · Heute (Uhrzeit, Sonnenstand, Status)

| Nr. | Name | Schritt | Erwartetes Ergebnis | gilt für |
|---|---|---|---|---|
| B01 | Uhrzeit in Mallorca-Zeit | Seite „Heute“ öffnen und den Kasten „Jetzt an der Playa de Palma“ ansehen. Mit einer Uhr in Mallorca-Zeit (Europe/Madrid) vergleichen. | Kurzdatum und Uhrzeit (z. B. Fr., 13. Nov. · 21:05, je Sprache anders formatiert) zeigen die Ortszeit Mallorca, nicht die Gerätezeit. Wer in derselben Zeitzone testet, kann das nicht unterscheiden: dann `Zeitzone gleich` notieren. | alle |
| B02 | Sonnenstand | Im Kasten die Sonnenzeile und den Satz darunter lesen. Mit der Wetter-App oder einer Sonnentabelle für Playa de Palma vergleichen. | Eine Uhrzeit bei „Sonnenuntergang heute“ (nach Sonnenuntergang „Sonnenuntergang morgen“), grob passend (die Rechnung ist eine Näherung, laut `docs/06_QA.md` auf etwa 2 Minuten). Der Satz passt zur Tageszeit: „Noch … bis zum Sonnenuntergang.“, „Goldene Stunde – die Sonne geht in … unter.“, „Blaue Stunde. Die Lichter gehen an.“ oder „Die Nacht hat begonnen.“ (EN/ES sinngleich). | alle |
| B03 | Kein erfundener Status | Die Zeile bei „Öffnungszeiten“ im Kasten lesen. | Solange der Betrieb keine Zeiten bestätigt hat: „Aktuelle Öffnungszeiten sind noch nicht bestätigt. Schau vor dem Losgehen kurz bei CHUCCA auf Instagram vorbei.“ Es erscheint weder „Jetzt geöffnet“ noch „Gerade geschlossen“. Erscheint eines davon, ist das FAIL (nur im eigens gebauten Zeiten-Testbuild wäre es erwartet, der ist nicht Teil dieser Prüfung). Der Link „Instagram öffnen“ führt zu Instagram. | alle |
| B04 | Beispieltermine gekennzeichnet | Auf „Heute“ zum Abschnitt „Demnächst bei CHUCCA“ scrollen (falls vorhanden). | Der Abschnitt trägt den Hinweis „Beispieltermine für die Vorschau – kein bestätigtes Programm.“ Termine ohne diesen Hinweis wären FAIL. Fehlt der Abschnitt, NOT RUN mit Notiz. | alle |
| B05 | Uhr läuft weiter | Zu einer anderen App wechseln, mindestens eine Minute warten, zurückkehren. | Die Uhrzeit im Kasten zeigt wieder die aktuelle Zeit (kein eingefrorener Wert). | alle |

### C · Drinks (Suche, Filter)

| Nr. | Name | Schritt | Erwartetes Ergebnis | gilt für |
|---|---|---|---|---|
| C01 | Karte als Beispiel gekennzeichnet | Seite „Drinks“ öffnen. | Die Karte trägt die Kennzeichnung „Beispielkarte“ und den Hinweis „Diese Karte ist ein Platzhalter für die Vorschau. Namen, Zutaten und Preise sind Beispiele und keine bestätigte CHUCCA-Karte.“ Über der Liste steht die Anzahl mit dem Wort „Drinks“. Die gezeigten Preise sind Beispiele und kein Fund. | alle |
| C02 | Suche | In das Feld „Drinks oder Zutaten suchen“ (Platzhalter „z. B. Minze, Mojito, Tonic“) tippen und `minze` eingeben, danach `MINZE`. | Die Tastatur öffnet sich und das Feld bleibt sichtbar. Die Eingabetaste trägt je nach Tastatur eine Suchen-Beschriftung. Die Anzahl wird kleiner, es bleiben nur passende Drinks, Abschnitte ohne Treffer verschwinden. Groß-/Kleinschreibung ändert das Ergebnis nicht. | alle |
| C03 | Kein Treffer | `xyzzy` eingeben, dann den Knopf „Filter zurücksetzen“ antippen. | „Nichts gefunden.“ mit dem Knopf „Filter zurücksetzen“. Danach ist die Liste wieder vollständig, das Suchfeld leer und fokussiert. | alle |
| C04 | Geschmacksrichtung | Bei der Gruppe „Geschmacksrichtung“ nacheinander „Frisch“, „Fruchtig“, „Klassisch“, „Alkoholfrei“ antippen; denselben Knopf nochmals antippen. | Der gewählte Knopf wirkt gedrückt (hervorgehoben), eine Überschrift (z. B. „Frisch & lebendig“) und ein Text erscheinen, die Liste wird gefiltert. Erneutes Antippen hebt die Auswahl auf. Die Auswahl bleibt nach dem Neuladen bestehen (Browserspeicher; im privaten Modus darf sie fehlen). | alle |
| C05 | Sprunglinks | Bei „Springe zu“ eine Kategorie antippen. | Die Seite scrollt zum Abschnitt; dessen Überschrift ist sichtbar und liegt nicht unter der Tabbar. | alle |
| C06 (optional) | Filter im Link (optional) | Einen Filter setzen, die Adresse kopieren und in einem neuen Tab öffnen. | Die Adresse enthält die Auswahl (`?q=…` beziehungsweise `?g=…`), der neue Tab zeigt dieselbe Auswahl. | alle |

### D · Besuch (Karten, Adresse)

| Nr. | Name | Schritt | Erwartetes Ergebnis | gilt für |
|---|---|---|---|---|
| D01 | Adresse | Seite „Besuch“ öffnen, Abschnitt „Adresse“ lesen. | Adresse mit Riu Center, Carrer del Llaüt 23, 07610 Palma sichtbar und vollständig lesbar. Der Hinweis zum Eingang im Abschnitt „Der Weg hinein“ ist als „Angabe aus Verzeichnissen – vor Ort noch nicht bestätigt.“ gekennzeichnet. Prüfperson vor Ort: Stimmen Adresse und Eingangshinweis? Das ist eine Beobachtung, kein PASS/FAIL der App. | alle |
| D02 | Google Maps | „In Google Maps öffnen“ antippen. | Google Maps öffnet (App oder Browser) mit einer Suche nach CHUCCA, Carrer del Llaüt 23, Playa de Palma. Notieren, was Maps zeigt (Pin, Name, richtige Stelle?). Rückkehr zu CHUCCA ist möglich. | alle |
| D03 | Apple Karten | „In Apple Karten öffnen“ antippen. | iPhone: Karten-App öffnet mit der Adresse. Android: der Link öffnet im Browser (Apple Karten im Web) oder die Auswahl einer Karten-App; keine Fehlerseite und kein Absturz. Notieren, was erscheint. | alle |
| D04 | Adresse kopieren | „Adresse kopieren“ antippen, den Text in Notizen oder eine Nachricht einfügen. | Meldung „Adresse kopiert.“; eingefügt wird `CHUCCA · Riu Center, Carrer del Llaüt 23, 07610 Palma, Mallorca`. Funktioniert die Zwischenablage nicht (z. B. In-App-Browser), erscheint stattdessen das markierte Feld „Text zum Kopieren“ mit dem Hinweis „Kopieren hat hier nicht funktioniert. Markiere den Text und kopiere ihn von Hand.“; das gilt als PASS. | alle |
| D05 | Treffpunkt teilen | „Treffpunkt teilen“ antippen; einmal ein Ziel wählen, einmal abbrechen. | Das Teilen-Menü des Systems öffnet mit dem Text „Treffpunkt: CHUCCA · Riu Center, Carrer del Llaüt 23, Playa de Palma“ und dem Google-Maps-Link. Nach dem Teilen: „Treffpunkt geteilt.“ Beim Abbrechen erscheint keine Meldung. Ohne Teilen-Menü: „Treffpunkt kopiert. Jetzt in deine Gruppe einfügen.“ oder das Feld „Text zum Kopieren“. | alle |
| D06 | Öffnungszeiten ehrlich | Abschnitt „Öffnungszeiten“ auf „Besuch“ lesen. | Solange nicht bestätigt: „Die aktuellen Zeiten sind noch nicht bestätigt, deshalb zeigen wir hier keine. Frag vor dem Besuch kurz bei CHUCCA nach.“ Keine Zeitentabelle. Eine Zeitentabelle ohne Betreiberbestätigung wäre FAIL. | alle |
| D07 | Gruppennachricht vorbereiten | Im Abschnitt „Mit einer Gruppe kommen“ „Anzahl Personen“ 6 lassen, ein künftiges „Datum“ und eine „Uhrzeit“ wählen, „Nachricht vorbereiten“ antippen. | Es erscheint ein Textfeld „Deine vorbereitete Nachricht“ mit dem Anfragetext, dazu „Vorbereitet – noch nicht gesendet. Schick den Text selbst an CHUCCA.“ Es wird nichts an CHUCCA gesendet. „Text kopieren“ meldet „Nachricht kopiert – noch nicht gesendet. Füge sie in deine Nachricht an CHUCCA ein.“ beziehungsweise zeigt das Kopierfeld. | alle |

### E · Gruppenplaner (Gruppe)

| Nr. | Name | Schritt | Erwartetes Ergebnis | gilt für |
|---|---|---|---|---|
| E01 | Datum und Uhrzeit wählen | Seite „Gruppe“ öffnen, das Feld „Datum“ antippen, einen künftigen Tag wählen; das Feld „Uhrzeit“ antippen, 21:00 wählen. | Das System öffnet seine eigene Auswahl (iPhone: Datum und Zeit per Rad oder Kompaktauswahl; Android: Kalender- und Uhrdialog). Die Werte stehen danach im Feld. Die Karte „Treffen bei CHUCCA“ zeigt das ausgeschriebene Datum und `21:00` sowie „Ortszeit Mallorca“. Vergangene Tage sind im Datumswähler nicht wählbar, soweit der Browser das unterstützt (sonst siehe E03). | alle |
| E02 (optional) | Abweichende Gerätezeit (optional) | Nur wenn möglich: die Zeitzone des Geräts auf eine andere als Mallorca stellen (z. B. London), „Gruppe“ neu laden, Datum und Uhrzeit setzen. Danach die Zeitzone zurückstellen. | Unter der Karte erscheint „Auf deinem Gerät entspricht das {Zeit} Uhr ({Zone}).“ (EN: „That’s … where you are“, ES: „En tu dispositivo: …“). Bei gleicher Zeitzone wie Mallorca erscheint die Zeile nicht. | alle |
| E03 | Fehlermeldung Datum | Das Feld „Datum“ leer lassen (oder zurücksetzen) und „Einladung teilen“ antippen. | Meldung „Bitte ein gültiges Datum zwischen heute und dem 31. Dezember 2100 wählen.“ Der Fokus springt ins Feld „Datum“; es öffnet sich kein Teilen-Menü. | alle |
| E04 (optional) | Zeitumstellung (optional) | Datum 28.03.2027, Uhrzeit 02:30 eingeben, „Einladung teilen“ antippen. Danach 03:30 versuchen. | Bei 02:30: „Diese Ortszeit existiert wegen der Zeitumstellung nicht oder kommt zweimal vor. Bitte eine andere Uhrzeit wählen.“ Bei 03:30 geht es weiter. | alle |
| E05 | Einladung teilen | Datum und Uhrzeit setzen, „Einladung teilen“ antippen und in WhatsApp (oder eine Notiz) senden; einmal abbrechen. | Teilen-Menü mit dem Titel „Treffen bei CHUCCA“ und dem Text: eine Zeile „CHUCCA · … Uhr (…)“ (Datum, Uhrzeit und „Ortszeit Mallorca“), die Adresse „Riu Center, Carrer del Llaüt 23 · Playa de Palma“ und „Private Verabredung, keine Reservierung. Öffnungszeiten und Plätze bitte direkt mit CHUCCA klären.“ Im Vorschau-Build hängt der Google-Maps-Link an (ein Plan-Link gehört erst in den öffentlichen Build; dort zusätzlich eine Zeile „Route: …“ und der Link zum Plan). Nach dem Senden: „Einladung geteilt.“ Beim Abbrechen keine Meldung. | alle |
| E06 | Einladung kopieren | „Einladung kopieren“ antippen, Text einfügen. | Meldung „Einladung kopiert.“; der eingefügte Text entspricht E05. Funktioniert die Zwischenablage nicht: Feld „Text zum Kopieren“ (PASS, wie D04). | alle |
| E07 | Kalender: Datei erzeugen | „Im Kalender speichern“ antippen. | Meldung „Kalenderdatei erstellt. Öffnet sich nichts, kopiere die Einladung als Text.“ Eine Datei `chucca-meetup.ics` wird geladen oder angeboten. In In-App-Browsern sind Downloads oft gesperrt: dann Beobachtung (Fehlermeldung, nichts passiert) notieren. | alle |
| E08 | ICS-Import Apple Kalender | Die Datei aus E07 öffnen und dem Apple Kalender hinzufügen (G3 und G4 nur, wenn auf einem iPhone geprüft). | Der Termin erscheint mit Titel „CHUCCA · Treffen“ (EN „CHUCCA · Meetup“, ES „CHUCCA · Quedada“), zur gewählten Mallorca-Zeit (Anzeige in der Gerätezeitzone), Dauer 2 Stunden, Ort `CHUCCA, Riu Center, Carrer del Llaüt 23, 07610 Palma, Mallorca`, Notiz mit dem Hinweis „Private Verabredung, keine Reservierung …“ und dem Maps-Link. Zeitzone und Uhrzeit im Screenshot festhalten. | G1, G2, G3, G4 |
| E09 | ICS-Import Google Kalender | Die Datei aus E07 mit Google Kalender öffnen/importieren (Android: Datei öffnen mit ›Kalender‹; iPhone: nur, falls Google Kalender installiert ist, sonst NOT RUN). | Gleiches Ergebnis wie E08: Titel, richtige Uhrzeit (Mallorca-Zeit in die Gerätezeitzone umgerechnet), 2 Stunden, Ort, Notiz. Gibt es keine Möglichkeit zu importieren, ist das eine Beobachtung (Gerät/Version nennen). | alle |
| E10 | Plan per Link öffnen | Vorschau-Build: den Link von Hand zusammensetzen und in einem Chat versenden, dann dort antippen: `<VORSCHAU-URL>de/gruppe/?d=JJJJ-MM-TT&t=21:00&id=geraetetest01` (künftiges Datum einsetzen). Öffentlicher Build: den Link aus einer geteilten Einladung antippen. | Die Felder „Datum“ und „Uhrzeit“ sind vorbefüllt; ein Hinweis „Ihr trefft euch am … um … Uhr.“ mit „Du hast diesen Plan über einen Link geöffnet. Speichere ihn im Kalender oder passe ihn an.“ erscheint. Die Adresszeile zeigt danach keine `?d=…`-Parameter mehr. Eine Änderung eines Feldes blendet den Hinweis aus. | alle |
| E11 | Entwurf bleibt | Datum und Uhrzeit setzen, die Seite neu laden, danach die Sprache wechseln. | Nach dem Neuladen stehen die Werte weiterhin in den Feldern (nur für diese Sitzung gespeichert). Beim Sprachwechsel bleiben sie erhalten. | alle |

### F · Galerie und Bildansicht (Lightbox)

| Nr. | Name | Schritt | Erwartetes Ergebnis | gilt für |
|---|---|---|---|---|
| F01 | Galerie öffnen | Seite „Galerie“ öffnen. | Hinweis „Vorschau mit gezeichneten Konzeptmotiven. Es sind keine Aufnahmen aus dem Lokal – echte Fotos erscheinen hier erst nach Freigabe.“ Bilder tragen die Kennzeichnung „Konzeptmotiv“. Im öffentlichen Build ohne freigegebene Fotos stattdessen „Noch keine freigegebenen Fotos.“ (dann F02 bis F06 NOT RUN). | alle |
| F02 | Bildansicht öffnen | Ein Bild antippen. | Vollbild-Dialog („Bildansicht“) mit Zähler „Bild 1 von N“, Bildtitel, Bild unverzerrt; oben rechts das Schließen-Symbol (Name „Bildansicht schließen“). Die Seite wechselt nicht. Die Ansicht füllt die sichtbare Höhe, auch wenn Browserleisten ein- oder ausfahren. | alle |
| F03 | Blättern | Mit den Pfeil-Symbolen („Nächstes Bild“, „Vorheriges Bild“) und durch Wischen nach links und rechts blättern; am Ende weiterblättern. | Der Zähler zählt mit („Bild 2 von N“ …), Titel und Bild wechseln, nach dem letzten Bild folgt wieder das erste. | alle |
| F04 | Scrollen in der Bildansicht | Bei offener Bildansicht senkrecht wischen und ziehen, auch am Rand. | Die Seite dahinter scrollt nicht mit; Bild, Zähler und Bildunterschrift bleiben stehen und sichtbar. Jedes Durchscrollen oder Springen der Hintergrundseite ist FAIL (bitte Browser, Version, Geste notieren). | alle |
| F05 | Schließen | Die Bildansicht über das Schließen-Symbol beenden; ein zweites Mal die Zurück-Geste beziehungsweise Zurück-Taste (Android) versuchen. | Mit dem Symbol schließt die Ansicht, die Galerie steht an derselben Scrollposition, nicht am Seitenanfang. Was die Zurück-Geste tut (Ansicht schließen oder Seite verlassen), notieren; dafür gibt es keinen Sollwert. | alle |
| F06 | Safe Areas im Querformat | Bildansicht öffnen und das Gerät ins Querformat drehen (Gerät mit Notch oder Home-Indikator). | Zähler, Schließen-Symbol, Pfeile und Bildunterschrift liegen nicht unter Notch, abgerundeten Ecken oder Home-Indikator; Bild ist erkennbar. | alle |

### G · Tabbar und Safe Areas

| Nr. | Name | Schritt | Erwartetes Ergebnis | gilt für |
|---|---|---|---|---|
| G01 | Tabbar vollständig | Auf jeder der fünf Seiten die Tabbar unten ansehen, in DE, EN und ES. | Fünf Einträge mit Symbol und Beschriftung („Heute“/„Today“/„Hoy“, „Drinks“/„Drinks“/„Carta“, „Besuch“/„Visit“/„Visita“, „Gruppe“/„Group“/„Grupo“, „Galerie“/„Gallery“/„Galería“). Die aktuelle Seite ist hervorgehoben, keine Beschriftung ist abgeschnitten oder umgebrochen. | alle |
| G02 | Home-Indikator | Auf einem iPhone ohne Home-Taste: die Tabbar unten ansehen und einen Eintrag antippen. Android mit Gestenleiste: dasselbe. | Die Tabbar sitzt oberhalb des Home-Indikators beziehungsweise der Gestenleiste; die Symbole werden nicht vom Indikator überdeckt; Antippen trifft zuverlässig. | alle |
| G03 | Seitenende | Auf „Besuch“ und „Drinks“ ganz nach unten scrollen. | Fußzeile mit Adresse und den Sätzen „Kein Konto, keine Cookies, kein Tracking. …“ und „Alkohol nur für Erwachsene. Bitte verantwortungsvoll genießen.“ ist vollständig lesbar und liegt nicht unter der Tabbar. | alle |
| G04 | Querformat | Gerät ins Querformat drehen; „Heute“ und „Besuch“ ansehen. | Inhalt und Tabbar liegen nicht hinter Notch oder seitlichen Rundungen; es entsteht kein horizontales Scrollen. (Bei sehr niedriger Höhe darf die Tabbar mitscrollen.) | alle |
| G05 | Browserleiste ein- und ausfahren | Auf einer langen Seite hoch- und herunterscrollen, bis die Browserleisten ein- und ausfahren. | Kein weißer Streifen, kein Springen des Layouts, die Tabbar bleibt unten fest. | G1, G3, G4, G5, G6, G7 |

### H · Tastatur und Formulare

| Nr. | Name | Schritt | Erwartetes Ergebnis | gilt für |
|---|---|---|---|---|
| H01 | Tastatur überlappt Formular | Auf „Besuch“ im Abschnitt „Mit einer Gruppe kommen“ das Feld „Anmerkung (optional)“ antippen und etwas tippen. | Die Tastatur öffnet sich, das aktive Feld bleibt sichtbar (nicht von Tastatur, Tabbar oder Meldung verdeckt). Der Knopf „Nachricht vorbereiten“ ist durch Scrollen erreichbar. | alle |
| H02 | Zahlenfeld | Das Feld „Anzahl Personen“ antippen und 12 eintippen; danach 1 und 41 versuchen und „Nachricht vorbereiten“ antippen. | Es erscheint eine numerische Tastatur. Bei 1 oder 41: „Bitte eine Personenzahl zwischen 2 und 40 angeben.“; das Feld ist markiert und fokussiert. | alle |
| H03 | Auswahl und Tabbar | Auf „Gruppe“ das Feld „Datum“ öffnen. | Die Systemauswahl liegt vollständig sichtbar über der Seite; die Tabbar verdeckt keine Bedienelemente der Auswahl. Nach dem Schließen ist die Seite unverändert bedienbar. | alle |

### I · Offline und Update

| Nr. | Name | Schritt | Erwartetes Ergebnis | gilt für |
|---|---|---|---|---|
| I01 | Offline-Hinweis | Eine Seite offen lassen, Flugmodus einschalten, dann wieder ausschalten. | Bei Flugmodus erscheint ein Band „Du bist offline. Karten, Instagram und Teilen brauchen eine Verbindung.“; nach dem Ausschalten verschwindet es wieder. | alle |
| I02 | Offline nach Besuch | Heute und Besuch online öffnen, die Seite danach mindestens einmal neu laden (damit der Service Worker aktiv ist), Flugmodus einschalten, die Seite neu laden und zu einer noch nicht besuchten Seite wechseln. | Vorschau-Build (privat, kein Seiten-Cache): Offline-Seite mit „Du bist offline. Verbinde dich wieder, um CHUCCA zu öffnen.“, dazu englisch und spanisch untereinander und „Erneut versuchen · Try again · Reintentar“. Öffentlicher Build: bereits besuchte Seiten erscheinen offline samt Offline-Band, unbekannte Seiten zeigen die Offline-Seite. Buildtyp im Lauf eintragen. In In-App-Browsern ist unklar, ob ein Service Worker läuft: nur beobachten. | alle |
| I03 | Wieder online | Auf der Offline-Seite Flugmodus ausschalten und „Erneut versuchen“ antippen. | Die Seite lädt normal. | alle |
| I04 | Update-Hinweis | Nur mit Absprache: Erst die Seite mindestens zweimal öffnen (damit der Service Worker die Seite steuert). Dann veröffentlicht die Betreuung eine neue Build-Version unter derselben Adresse. Danach die Seite öffnen oder neu laden. Ohne neue Version: NOT RUN. | Ein Hinweis „Eine neue Version ist bereit.“ mit dem Knopf „Neu laden“ erscheint. Erst beim Antippen lädt die Seite genau einmal neu und der Hinweis verschwindet. Ohne Antippen lädt nichts von selbst neu. | G1, G2, G5, G6, G7 |

### J · Darstellung (Dunkel/Hell, Bewegung, Textgröße)

| Nr. | Name | Schritt | Erwartetes Ergebnis | gilt für |
|---|---|---|---|---|
| J01 | Systemdarstellung Dunkel/Hell | Die Systemdarstellung auf Hell und auf Dunkel stellen und jeweils „Heute“, „Drinks“, „Besuch“, „Gruppe“ ansehen. | Die Seite ist bewusst dunkel und hat keine Hell-Variante; sie sieht in beiden Systemmodi gleich aus. Prüfen, dass Text, Eingabefelder (Suche, Datum, Uhrzeit) und die Systemauswahl in beiden Modi lesbar bleiben. Abweichungen mit Screenshot melden. | alle |
| J02 | Bewegung reduzieren | iPhone: ›Bedienungshilfen > Bewegung > Bewegung reduzieren‹. Android: ›Animationen entfernen‹ (Bedienungshilfen). Danach zwischen Seiten wechseln und die Bildansicht öffnen. | Funktion unverändert; Seitenwechsel ohne weiche Überblendung, keine auffälligen Animationen. | alle |
| J03 | Systemschriftgröße | Die Schriftgröße im System auf die größte Stufe stellen (iPhone: ›Anzeige & Helligkeit > Textgröße‹ beziehungsweise Bedienungshilfen; Android: ›Schriftgröße‹ und ›Anzeigegröße‹), die Seiten „Heute“, „Drinks“, „Besuch“, „Gruppe“ ansehen. Danach zurückstellen. | Notieren, ob der Text mitwächst (die Seite folgt der Systemschrift nur, soweit der Browser das unterstützt; es gibt dafür keinen Sollwert). In jedem Fall: nichts überlappt, nichts ist abgeschnitten, Knöpfe und Tabbar bleiben bedienbar, kein horizontales Scrollen. | alle |
| J04 | Seitenzoom 200 % | Im Browser auf etwa 200 % vergrößern (Safari ›aA‹ > Prozentwert; Chrome ›Seite vergrößern‹ in den Einstellungen; im Standalone nicht verfügbar) und die vier Hauptseiten ansehen. | Texte bleiben lesbar und vollständig, kein Abschneiden von Knöpfen, das Formular auf „Gruppe“ bleibt bedienbar. | G1, G3, G4, G5, G6, G7 |

## Ankreuzlisten je Gerät

Pro Zeile genau eins ankreuzen (`x` in die Klammer). Die Vorbelegung ist NOT RUN, weil noch nichts gelaufen ist. Details zu Schritt und Erwartung stehen oben unter der Nummer.

### G1 · iPhone, Safari (Pflicht)

Modell: ____________ · OS und Version: ____________ · Browser/App und Version: ____________ · Prüfperson: ____________ · Datum: ____________ · Buildtyp: ____________

| Kennung | Schritt | PASS | FAIL | NOT RUN | Notiz |
|---|---|---|---|---|---|
| G1-A01 | Startadresse öffnen | [ ] | [ ] | [x] |  |
| G1-A02 | Deutsch wählen | [ ] | [ ] | [x] |  |
| G1-A03 | Sprache wechseln | [ ] | [ ] | [x] |  |
| G1-A04 | Sprache wird gemerkt | [ ] | [ ] | [x] |  |
| G1-A05 | Zum Startbildschirm hinzufügen | [ ] | [ ] | [x] |  |
| G1-B01 | Uhrzeit in Mallorca-Zeit | [ ] | [ ] | [x] |  |
| G1-B02 | Sonnenstand | [ ] | [ ] | [x] |  |
| G1-B03 | Kein erfundener Status | [ ] | [ ] | [x] |  |
| G1-B04 | Beispieltermine gekennzeichnet | [ ] | [ ] | [x] |  |
| G1-B05 | Uhr läuft weiter | [ ] | [ ] | [x] |  |
| G1-C01 | Karte als Beispiel gekennzeichnet | [ ] | [ ] | [x] |  |
| G1-C02 | Suche | [ ] | [ ] | [x] |  |
| G1-C03 | Kein Treffer | [ ] | [ ] | [x] |  |
| G1-C04 | Geschmacksrichtung | [ ] | [ ] | [x] |  |
| G1-C05 | Sprunglinks | [ ] | [ ] | [x] |  |
| G1-C06 | Filter im Link (optional) | [ ] | [ ] | [x] | (optional) |
| G1-D01 | Adresse | [ ] | [ ] | [x] |  |
| G1-D02 | Google Maps | [ ] | [ ] | [x] |  |
| G1-D03 | Apple Karten | [ ] | [ ] | [x] |  |
| G1-D04 | Adresse kopieren | [ ] | [ ] | [x] |  |
| G1-D05 | Treffpunkt teilen | [ ] | [ ] | [x] |  |
| G1-D06 | Öffnungszeiten ehrlich | [ ] | [ ] | [x] |  |
| G1-D07 | Gruppennachricht vorbereiten | [ ] | [ ] | [x] |  |
| G1-E01 | Datum und Uhrzeit wählen | [ ] | [ ] | [x] |  |
| G1-E02 | Abweichende Gerätezeit (optional) | [ ] | [ ] | [x] | (optional) |
| G1-E03 | Fehlermeldung Datum | [ ] | [ ] | [x] |  |
| G1-E04 | Zeitumstellung (optional) | [ ] | [ ] | [x] | (optional) |
| G1-E05 | Einladung teilen | [ ] | [ ] | [x] |  |
| G1-E06 | Einladung kopieren | [ ] | [ ] | [x] |  |
| G1-E07 | Kalender: Datei erzeugen | [ ] | [ ] | [x] |  |
| G1-E08 | ICS-Import Apple Kalender | [ ] | [ ] | [x] |  |
| G1-E09 | ICS-Import Google Kalender | [ ] | [ ] | [x] |  |
| G1-E10 | Plan per Link öffnen | [ ] | [ ] | [x] |  |
| G1-E11 | Entwurf bleibt | [ ] | [ ] | [x] |  |
| G1-F01 | Galerie öffnen | [ ] | [ ] | [x] |  |
| G1-F02 | Bildansicht öffnen | [ ] | [ ] | [x] |  |
| G1-F03 | Blättern | [ ] | [ ] | [x] |  |
| G1-F04 | Scrollen in der Bildansicht | [ ] | [ ] | [x] |  |
| G1-F05 | Schließen | [ ] | [ ] | [x] |  |
| G1-F06 | Safe Areas im Querformat | [ ] | [ ] | [x] |  |
| G1-G01 | Tabbar vollständig | [ ] | [ ] | [x] |  |
| G1-G02 | Home-Indikator | [ ] | [ ] | [x] |  |
| G1-G03 | Seitenende | [ ] | [ ] | [x] |  |
| G1-G04 | Querformat | [ ] | [ ] | [x] |  |
| G1-G05 | Browserleiste ein- und ausfahren | [ ] | [ ] | [x] |  |
| G1-H01 | Tastatur überlappt Formular | [ ] | [ ] | [x] |  |
| G1-H02 | Zahlenfeld | [ ] | [ ] | [x] |  |
| G1-H03 | Auswahl und Tabbar | [ ] | [ ] | [x] |  |
| G1-I01 | Offline-Hinweis | [ ] | [ ] | [x] |  |
| G1-I02 | Offline nach Besuch | [ ] | [ ] | [x] |  |
| G1-I03 | Wieder online | [ ] | [ ] | [x] |  |
| G1-I04 | Update-Hinweis | [ ] | [ ] | [x] |  |
| G1-J01 | Systemdarstellung Dunkel/Hell | [ ] | [ ] | [x] |  |
| G1-J02 | Bewegung reduzieren | [ ] | [ ] | [x] |  |
| G1-J03 | Systemschriftgröße | [ ] | [ ] | [x] |  |
| G1-J04 | Seitenzoom 200 % | [ ] | [ ] | [x] |  |

### G2 · iPhone, Standalone („Zum Home-Bildschirm“) (Pflicht)

Modell: ____________ · OS und Version: ____________ · Browser/App und Version: ____________ · Prüfperson: ____________ · Datum: ____________ · Buildtyp: ____________

| Kennung | Schritt | PASS | FAIL | NOT RUN | Notiz |
|---|---|---|---|---|---|
| G2-A01 | Startadresse öffnen | [ ] | [ ] | [x] | Standalone: stattdessen A06; A01 nur, wenn die Startadresse erneut im Browser geprüft wird. |
| G2-A02 | Deutsch wählen | [ ] | [ ] | [x] |  |
| G2-A03 | Sprache wechseln | [ ] | [ ] | [x] |  |
| G2-A04 | Sprache wird gemerkt | [ ] | [ ] | [x] |  |
| G2-A06 | Start als Standalone | [ ] | [ ] | [x] |  |
| G2-A07 | Links im Standalone | [ ] | [ ] | [x] |  |
| G2-B01 | Uhrzeit in Mallorca-Zeit | [ ] | [ ] | [x] |  |
| G2-B02 | Sonnenstand | [ ] | [ ] | [x] |  |
| G2-B03 | Kein erfundener Status | [ ] | [ ] | [x] |  |
| G2-B04 | Beispieltermine gekennzeichnet | [ ] | [ ] | [x] |  |
| G2-B05 | Uhr läuft weiter | [ ] | [ ] | [x] |  |
| G2-C01 | Karte als Beispiel gekennzeichnet | [ ] | [ ] | [x] |  |
| G2-C02 | Suche | [ ] | [ ] | [x] |  |
| G2-C03 | Kein Treffer | [ ] | [ ] | [x] |  |
| G2-C04 | Geschmacksrichtung | [ ] | [ ] | [x] |  |
| G2-C05 | Sprunglinks | [ ] | [ ] | [x] |  |
| G2-C06 | Filter im Link (optional) | [ ] | [ ] | [x] | (optional) |
| G2-D01 | Adresse | [ ] | [ ] | [x] |  |
| G2-D02 | Google Maps | [ ] | [ ] | [x] | Notieren, ob Karten-App oder Browser öffnet. |
| G2-D03 | Apple Karten | [ ] | [ ] | [x] | Notieren, ob Karten-App oder Browser öffnet. |
| G2-D04 | Adresse kopieren | [ ] | [ ] | [x] |  |
| G2-D05 | Treffpunkt teilen | [ ] | [ ] | [x] |  |
| G2-D06 | Öffnungszeiten ehrlich | [ ] | [ ] | [x] |  |
| G2-D07 | Gruppennachricht vorbereiten | [ ] | [ ] | [x] |  |
| G2-E01 | Datum und Uhrzeit wählen | [ ] | [ ] | [x] |  |
| G2-E02 | Abweichende Gerätezeit (optional) | [ ] | [ ] | [x] | (optional) |
| G2-E03 | Fehlermeldung Datum | [ ] | [ ] | [x] |  |
| G2-E04 | Zeitumstellung (optional) | [ ] | [ ] | [x] | (optional) |
| G2-E05 | Einladung teilen | [ ] | [ ] | [x] |  |
| G2-E06 | Einladung kopieren | [ ] | [ ] | [x] |  |
| G2-E07 | Kalender: Datei erzeugen | [ ] | [ ] | [x] | Standalone kann Downloads anders behandeln: genau notieren, was passiert. |
| G2-E08 | ICS-Import Apple Kalender | [ ] | [ ] | [x] |  |
| G2-E09 | ICS-Import Google Kalender | [ ] | [ ] | [x] |  |
| G2-E10 | Plan per Link öffnen | [ ] | [ ] | [x] |  |
| G2-E11 | Entwurf bleibt | [ ] | [ ] | [x] |  |
| G2-F01 | Galerie öffnen | [ ] | [ ] | [x] |  |
| G2-F02 | Bildansicht öffnen | [ ] | [ ] | [x] |  |
| G2-F03 | Blättern | [ ] | [ ] | [x] |  |
| G2-F04 | Scrollen in der Bildansicht | [ ] | [ ] | [x] |  |
| G2-F05 | Schließen | [ ] | [ ] | [x] |  |
| G2-F06 | Safe Areas im Querformat | [ ] | [ ] | [x] |  |
| G2-G01 | Tabbar vollständig | [ ] | [ ] | [x] |  |
| G2-G02 | Home-Indikator | [ ] | [ ] | [x] |  |
| G2-G03 | Seitenende | [ ] | [ ] | [x] |  |
| G2-G04 | Querformat | [ ] | [ ] | [x] |  |
| G2-H01 | Tastatur überlappt Formular | [ ] | [ ] | [x] |  |
| G2-H02 | Zahlenfeld | [ ] | [ ] | [x] |  |
| G2-H03 | Auswahl und Tabbar | [ ] | [ ] | [x] |  |
| G2-I01 | Offline-Hinweis | [ ] | [ ] | [x] |  |
| G2-I02 | Offline nach Besuch | [ ] | [ ] | [x] | Besonders wichtig im Standalone. |
| G2-I03 | Wieder online | [ ] | [ ] | [x] |  |
| G2-I04 | Update-Hinweis | [ ] | [ ] | [x] |  |
| G2-J01 | Systemdarstellung Dunkel/Hell | [ ] | [ ] | [x] |  |
| G2-J02 | Bewegung reduzieren | [ ] | [ ] | [x] |  |
| G2-J03 | Systemschriftgröße | [ ] | [ ] | [x] |  |

### G3 · Instagram-In-App-Browser (Pflicht)

Modell: ____________ · OS und Version: ____________ · Browser/App und Version: ____________ · Prüfperson: ____________ · Datum: ____________ · Buildtyp: ____________

| Kennung | Schritt | PASS | FAIL | NOT RUN | Notiz |
|---|---|---|---|---|---|
| G3-A01 | Startadresse öffnen | [ ] | [ ] | [x] |  |
| G3-A02 | Deutsch wählen | [ ] | [ ] | [x] |  |
| G3-A03 | Sprache wechseln | [ ] | [ ] | [x] |  |
| G3-A04 | Sprache wird gemerkt | [ ] | [ ] | [x] | Speicher des In-App-Browsers kann getrennt sein. |
| G3-B01 | Uhrzeit in Mallorca-Zeit | [ ] | [ ] | [x] |  |
| G3-B02 | Sonnenstand | [ ] | [ ] | [x] |  |
| G3-B03 | Kein erfundener Status | [ ] | [ ] | [x] |  |
| G3-B04 | Beispieltermine gekennzeichnet | [ ] | [ ] | [x] |  |
| G3-B05 | Uhr läuft weiter | [ ] | [ ] | [x] |  |
| G3-C01 | Karte als Beispiel gekennzeichnet | [ ] | [ ] | [x] |  |
| G3-C02 | Suche | [ ] | [ ] | [x] |  |
| G3-C03 | Kein Treffer | [ ] | [ ] | [x] |  |
| G3-C04 | Geschmacksrichtung | [ ] | [ ] | [x] |  |
| G3-C05 | Sprunglinks | [ ] | [ ] | [x] |  |
| G3-C06 | Filter im Link (optional) | [ ] | [ ] | [x] | (optional) |
| G3-D01 | Adresse | [ ] | [ ] | [x] |  |
| G3-D02 | Google Maps | [ ] | [ ] | [x] | Öffnet ggf. im externen Browser oder in der Karten-App. |
| G3-D03 | Apple Karten | [ ] | [ ] | [x] | Öffnet ggf. im externen Browser oder in der Karten-App. |
| G3-D04 | Adresse kopieren | [ ] | [ ] | [x] |  |
| G3-D05 | Treffpunkt teilen | [ ] | [ ] | [x] |  |
| G3-D06 | Öffnungszeiten ehrlich | [ ] | [ ] | [x] |  |
| G3-D07 | Gruppennachricht vorbereiten | [ ] | [ ] | [x] |  |
| G3-E01 | Datum und Uhrzeit wählen | [ ] | [ ] | [x] |  |
| G3-E02 | Abweichende Gerätezeit (optional) | [ ] | [ ] | [x] | (optional) |
| G3-E03 | Fehlermeldung Datum | [ ] | [ ] | [x] |  |
| G3-E04 | Zeitumstellung (optional) | [ ] | [ ] | [x] | (optional) |
| G3-E05 | Einladung teilen | [ ] | [ ] | [x] |  |
| G3-E06 | Einladung kopieren | [ ] | [ ] | [x] |  |
| G3-E07 | Kalender: Datei erzeugen | [ ] | [ ] | [x] | Downloads in In-App-Browsern oft gesperrt: Beobachtung genügt. |
| G3-E08 | ICS-Import Apple Kalender | [ ] | [ ] | [x] |  |
| G3-E09 | ICS-Import Google Kalender | [ ] | [ ] | [x] |  |
| G3-E10 | Plan per Link öffnen | [ ] | [ ] | [x] | Link in einer Instagram-Direktnachricht an sich selbst antippen. |
| G3-E11 | Entwurf bleibt | [ ] | [ ] | [x] |  |
| G3-F01 | Galerie öffnen | [ ] | [ ] | [x] |  |
| G3-F02 | Bildansicht öffnen | [ ] | [ ] | [x] |  |
| G3-F03 | Blättern | [ ] | [ ] | [x] |  |
| G3-F04 | Scrollen in der Bildansicht | [ ] | [ ] | [x] |  |
| G3-F05 | Schließen | [ ] | [ ] | [x] |  |
| G3-F06 | Safe Areas im Querformat | [ ] | [ ] | [x] |  |
| G3-G01 | Tabbar vollständig | [ ] | [ ] | [x] |  |
| G3-G02 | Home-Indikator | [ ] | [ ] | [x] |  |
| G3-G03 | Seitenende | [ ] | [ ] | [x] |  |
| G3-G04 | Querformat | [ ] | [ ] | [x] |  |
| G3-G05 | Browserleiste ein- und ausfahren | [ ] | [ ] | [x] |  |
| G3-H01 | Tastatur überlappt Formular | [ ] | [ ] | [x] |  |
| G3-H02 | Zahlenfeld | [ ] | [ ] | [x] |  |
| G3-H03 | Auswahl und Tabbar | [ ] | [ ] | [x] |  |
| G3-I01 | Offline-Hinweis | [ ] | [ ] | [x] |  |
| G3-I02 | Offline nach Besuch | [ ] | [ ] | [x] | Service Worker ungewiss: nur beobachten. |
| G3-I03 | Wieder online | [ ] | [ ] | [x] |  |
| G3-J01 | Systemdarstellung Dunkel/Hell | [ ] | [ ] | [x] |  |
| G3-J02 | Bewegung reduzieren | [ ] | [ ] | [x] |  |
| G3-J03 | Systemschriftgröße | [ ] | [ ] | [x] |  |
| G3-J04 | Seitenzoom 200 % | [ ] | [ ] | [x] |  |

### G4 · WhatsApp-In-App-Browser (Pflicht)

Modell: ____________ · OS und Version: ____________ · Browser/App und Version: ____________ · Prüfperson: ____________ · Datum: ____________ · Buildtyp: ____________

| Kennung | Schritt | PASS | FAIL | NOT RUN | Notiz |
|---|---|---|---|---|---|
| G4-A01 | Startadresse öffnen | [ ] | [ ] | [x] |  |
| G4-A02 | Deutsch wählen | [ ] | [ ] | [x] |  |
| G4-A03 | Sprache wechseln | [ ] | [ ] | [x] |  |
| G4-A04 | Sprache wird gemerkt | [ ] | [ ] | [x] | Speicher des In-App-Browsers kann getrennt sein. |
| G4-B01 | Uhrzeit in Mallorca-Zeit | [ ] | [ ] | [x] |  |
| G4-B02 | Sonnenstand | [ ] | [ ] | [x] |  |
| G4-B03 | Kein erfundener Status | [ ] | [ ] | [x] |  |
| G4-B04 | Beispieltermine gekennzeichnet | [ ] | [ ] | [x] |  |
| G4-B05 | Uhr läuft weiter | [ ] | [ ] | [x] |  |
| G4-C01 | Karte als Beispiel gekennzeichnet | [ ] | [ ] | [x] |  |
| G4-C02 | Suche | [ ] | [ ] | [x] |  |
| G4-C03 | Kein Treffer | [ ] | [ ] | [x] |  |
| G4-C04 | Geschmacksrichtung | [ ] | [ ] | [x] |  |
| G4-C05 | Sprunglinks | [ ] | [ ] | [x] |  |
| G4-C06 | Filter im Link (optional) | [ ] | [ ] | [x] | (optional) |
| G4-D01 | Adresse | [ ] | [ ] | [x] |  |
| G4-D02 | Google Maps | [ ] | [ ] | [x] | Öffnet ggf. im externen Browser oder in der Karten-App. |
| G4-D03 | Apple Karten | [ ] | [ ] | [x] | Öffnet ggf. im externen Browser oder in der Karten-App. |
| G4-D04 | Adresse kopieren | [ ] | [ ] | [x] |  |
| G4-D05 | Treffpunkt teilen | [ ] | [ ] | [x] |  |
| G4-D06 | Öffnungszeiten ehrlich | [ ] | [ ] | [x] |  |
| G4-D07 | Gruppennachricht vorbereiten | [ ] | [ ] | [x] |  |
| G4-E01 | Datum und Uhrzeit wählen | [ ] | [ ] | [x] |  |
| G4-E02 | Abweichende Gerätezeit (optional) | [ ] | [ ] | [x] | (optional) |
| G4-E03 | Fehlermeldung Datum | [ ] | [ ] | [x] |  |
| G4-E04 | Zeitumstellung (optional) | [ ] | [ ] | [x] | (optional) |
| G4-E05 | Einladung teilen | [ ] | [ ] | [x] |  |
| G4-E06 | Einladung kopieren | [ ] | [ ] | [x] |  |
| G4-E07 | Kalender: Datei erzeugen | [ ] | [ ] | [x] | Downloads in In-App-Browsern oft gesperrt: Beobachtung genügt. |
| G4-E08 | ICS-Import Apple Kalender | [ ] | [ ] | [x] |  |
| G4-E09 | ICS-Import Google Kalender | [ ] | [ ] | [x] |  |
| G4-E10 | Plan per Link öffnen | [ ] | [ ] | [x] | Der Link steht im WhatsApp-Chat: dort antippen. |
| G4-E11 | Entwurf bleibt | [ ] | [ ] | [x] |  |
| G4-F01 | Galerie öffnen | [ ] | [ ] | [x] |  |
| G4-F02 | Bildansicht öffnen | [ ] | [ ] | [x] |  |
| G4-F03 | Blättern | [ ] | [ ] | [x] |  |
| G4-F04 | Scrollen in der Bildansicht | [ ] | [ ] | [x] |  |
| G4-F05 | Schließen | [ ] | [ ] | [x] |  |
| G4-F06 | Safe Areas im Querformat | [ ] | [ ] | [x] |  |
| G4-G01 | Tabbar vollständig | [ ] | [ ] | [x] |  |
| G4-G02 | Home-Indikator | [ ] | [ ] | [x] |  |
| G4-G03 | Seitenende | [ ] | [ ] | [x] |  |
| G4-G04 | Querformat | [ ] | [ ] | [x] |  |
| G4-G05 | Browserleiste ein- und ausfahren | [ ] | [ ] | [x] |  |
| G4-H01 | Tastatur überlappt Formular | [ ] | [ ] | [x] |  |
| G4-H02 | Zahlenfeld | [ ] | [ ] | [x] |  |
| G4-H03 | Auswahl und Tabbar | [ ] | [ ] | [x] |  |
| G4-I01 | Offline-Hinweis | [ ] | [ ] | [x] |  |
| G4-I02 | Offline nach Besuch | [ ] | [ ] | [x] | Service Worker ungewiss: nur beobachten. |
| G4-I03 | Wieder online | [ ] | [ ] | [x] |  |
| G4-J01 | Systemdarstellung Dunkel/Hell | [ ] | [ ] | [x] |  |
| G4-J02 | Bewegung reduzieren | [ ] | [ ] | [x] |  |
| G4-J03 | Systemschriftgröße | [ ] | [ ] | [x] |  |
| G4-J04 | Seitenzoom 200 % | [ ] | [ ] | [x] |  |

### G5 · Android, Chrome (Pflicht)

Modell: ____________ · OS und Version: ____________ · Browser/App und Version: ____________ · Prüfperson: ____________ · Datum: ____________ · Buildtyp: ____________

| Kennung | Schritt | PASS | FAIL | NOT RUN | Notiz |
|---|---|---|---|---|---|
| G5-A01 | Startadresse öffnen | [ ] | [ ] | [x] |  |
| G5-A02 | Deutsch wählen | [ ] | [ ] | [x] |  |
| G5-A03 | Sprache wechseln | [ ] | [ ] | [x] |  |
| G5-A04 | Sprache wird gemerkt | [ ] | [ ] | [x] |  |
| G5-A05 | Zum Startbildschirm hinzufügen | [ ] | [ ] | [x] |  |
| G5-B01 | Uhrzeit in Mallorca-Zeit | [ ] | [ ] | [x] |  |
| G5-B02 | Sonnenstand | [ ] | [ ] | [x] |  |
| G5-B03 | Kein erfundener Status | [ ] | [ ] | [x] |  |
| G5-B04 | Beispieltermine gekennzeichnet | [ ] | [ ] | [x] |  |
| G5-B05 | Uhr läuft weiter | [ ] | [ ] | [x] |  |
| G5-C01 | Karte als Beispiel gekennzeichnet | [ ] | [ ] | [x] |  |
| G5-C02 | Suche | [ ] | [ ] | [x] |  |
| G5-C03 | Kein Treffer | [ ] | [ ] | [x] |  |
| G5-C04 | Geschmacksrichtung | [ ] | [ ] | [x] |  |
| G5-C05 | Sprunglinks | [ ] | [ ] | [x] |  |
| G5-C06 | Filter im Link (optional) | [ ] | [ ] | [x] | (optional) |
| G5-D01 | Adresse | [ ] | [ ] | [x] |  |
| G5-D02 | Google Maps | [ ] | [ ] | [x] |  |
| G5-D03 | Apple Karten | [ ] | [ ] | [x] |  |
| G5-D04 | Adresse kopieren | [ ] | [ ] | [x] |  |
| G5-D05 | Treffpunkt teilen | [ ] | [ ] | [x] |  |
| G5-D06 | Öffnungszeiten ehrlich | [ ] | [ ] | [x] |  |
| G5-D07 | Gruppennachricht vorbereiten | [ ] | [ ] | [x] |  |
| G5-E01 | Datum und Uhrzeit wählen | [ ] | [ ] | [x] |  |
| G5-E02 | Abweichende Gerätezeit (optional) | [ ] | [ ] | [x] | (optional) |
| G5-E03 | Fehlermeldung Datum | [ ] | [ ] | [x] |  |
| G5-E04 | Zeitumstellung (optional) | [ ] | [ ] | [x] | (optional) |
| G5-E05 | Einladung teilen | [ ] | [ ] | [x] |  |
| G5-E06 | Einladung kopieren | [ ] | [ ] | [x] |  |
| G5-E07 | Kalender: Datei erzeugen | [ ] | [ ] | [x] |  |
| G5-E09 | ICS-Import Google Kalender | [ ] | [ ] | [x] |  |
| G5-E10 | Plan per Link öffnen | [ ] | [ ] | [x] |  |
| G5-E11 | Entwurf bleibt | [ ] | [ ] | [x] |  |
| G5-F01 | Galerie öffnen | [ ] | [ ] | [x] |  |
| G5-F02 | Bildansicht öffnen | [ ] | [ ] | [x] |  |
| G5-F03 | Blättern | [ ] | [ ] | [x] |  |
| G5-F04 | Scrollen in der Bildansicht | [ ] | [ ] | [x] |  |
| G5-F05 | Schließen | [ ] | [ ] | [x] |  |
| G5-F06 | Safe Areas im Querformat | [ ] | [ ] | [x] |  |
| G5-G01 | Tabbar vollständig | [ ] | [ ] | [x] |  |
| G5-G02 | Home-Indikator | [ ] | [ ] | [x] |  |
| G5-G03 | Seitenende | [ ] | [ ] | [x] |  |
| G5-G04 | Querformat | [ ] | [ ] | [x] |  |
| G5-G05 | Browserleiste ein- und ausfahren | [ ] | [ ] | [x] |  |
| G5-H01 | Tastatur überlappt Formular | [ ] | [ ] | [x] |  |
| G5-H02 | Zahlenfeld | [ ] | [ ] | [x] |  |
| G5-H03 | Auswahl und Tabbar | [ ] | [ ] | [x] |  |
| G5-I01 | Offline-Hinweis | [ ] | [ ] | [x] |  |
| G5-I02 | Offline nach Besuch | [ ] | [ ] | [x] |  |
| G5-I03 | Wieder online | [ ] | [ ] | [x] |  |
| G5-I04 | Update-Hinweis | [ ] | [ ] | [x] |  |
| G5-J01 | Systemdarstellung Dunkel/Hell | [ ] | [ ] | [x] |  |
| G5-J02 | Bewegung reduzieren | [ ] | [ ] | [x] |  |
| G5-J03 | Systemschriftgröße | [ ] | [ ] | [x] |  |
| G5-J04 | Seitenzoom 200 % | [ ] | [ ] | [x] |  |

### G6 · Android, Samsung Internet (optional)

Modell: ____________ · OS und Version: ____________ · Browser/App und Version: ____________ · Prüfperson: ____________ · Datum: ____________ · Buildtyp: ____________

| Kennung | Schritt | PASS | FAIL | NOT RUN | Notiz |
|---|---|---|---|---|---|
| G6-A01 | Startadresse öffnen | [ ] | [ ] | [x] |  |
| G6-A02 | Deutsch wählen | [ ] | [ ] | [x] |  |
| G6-A03 | Sprache wechseln | [ ] | [ ] | [x] |  |
| G6-A04 | Sprache wird gemerkt | [ ] | [ ] | [x] |  |
| G6-A05 | Zum Startbildschirm hinzufügen | [ ] | [ ] | [x] | Samsung Internet: Menü ›Seite hinzufügen zu‹ > ›Startbildschirm‹ (Wortlaut je Version). |
| G6-B01 | Uhrzeit in Mallorca-Zeit | [ ] | [ ] | [x] |  |
| G6-B02 | Sonnenstand | [ ] | [ ] | [x] |  |
| G6-B03 | Kein erfundener Status | [ ] | [ ] | [x] |  |
| G6-B04 | Beispieltermine gekennzeichnet | [ ] | [ ] | [x] |  |
| G6-B05 | Uhr läuft weiter | [ ] | [ ] | [x] |  |
| G6-C01 | Karte als Beispiel gekennzeichnet | [ ] | [ ] | [x] |  |
| G6-C02 | Suche | [ ] | [ ] | [x] |  |
| G6-C03 | Kein Treffer | [ ] | [ ] | [x] |  |
| G6-C04 | Geschmacksrichtung | [ ] | [ ] | [x] |  |
| G6-C05 | Sprunglinks | [ ] | [ ] | [x] |  |
| G6-C06 | Filter im Link (optional) | [ ] | [ ] | [x] | (optional) |
| G6-D01 | Adresse | [ ] | [ ] | [x] |  |
| G6-D02 | Google Maps | [ ] | [ ] | [x] |  |
| G6-D03 | Apple Karten | [ ] | [ ] | [x] |  |
| G6-D04 | Adresse kopieren | [ ] | [ ] | [x] |  |
| G6-D05 | Treffpunkt teilen | [ ] | [ ] | [x] |  |
| G6-D06 | Öffnungszeiten ehrlich | [ ] | [ ] | [x] |  |
| G6-D07 | Gruppennachricht vorbereiten | [ ] | [ ] | [x] |  |
| G6-E01 | Datum und Uhrzeit wählen | [ ] | [ ] | [x] |  |
| G6-E02 | Abweichende Gerätezeit (optional) | [ ] | [ ] | [x] | (optional) |
| G6-E03 | Fehlermeldung Datum | [ ] | [ ] | [x] |  |
| G6-E04 | Zeitumstellung (optional) | [ ] | [ ] | [x] | (optional) |
| G6-E05 | Einladung teilen | [ ] | [ ] | [x] |  |
| G6-E06 | Einladung kopieren | [ ] | [ ] | [x] |  |
| G6-E07 | Kalender: Datei erzeugen | [ ] | [ ] | [x] |  |
| G6-E09 | ICS-Import Google Kalender | [ ] | [ ] | [x] |  |
| G6-E10 | Plan per Link öffnen | [ ] | [ ] | [x] |  |
| G6-E11 | Entwurf bleibt | [ ] | [ ] | [x] |  |
| G6-F01 | Galerie öffnen | [ ] | [ ] | [x] |  |
| G6-F02 | Bildansicht öffnen | [ ] | [ ] | [x] |  |
| G6-F03 | Blättern | [ ] | [ ] | [x] |  |
| G6-F04 | Scrollen in der Bildansicht | [ ] | [ ] | [x] |  |
| G6-F05 | Schließen | [ ] | [ ] | [x] |  |
| G6-F06 | Safe Areas im Querformat | [ ] | [ ] | [x] |  |
| G6-G01 | Tabbar vollständig | [ ] | [ ] | [x] |  |
| G6-G02 | Home-Indikator | [ ] | [ ] | [x] |  |
| G6-G03 | Seitenende | [ ] | [ ] | [x] |  |
| G6-G04 | Querformat | [ ] | [ ] | [x] |  |
| G6-G05 | Browserleiste ein- und ausfahren | [ ] | [ ] | [x] |  |
| G6-H01 | Tastatur überlappt Formular | [ ] | [ ] | [x] |  |
| G6-H02 | Zahlenfeld | [ ] | [ ] | [x] |  |
| G6-H03 | Auswahl und Tabbar | [ ] | [ ] | [x] |  |
| G6-I01 | Offline-Hinweis | [ ] | [ ] | [x] |  |
| G6-I02 | Offline nach Besuch | [ ] | [ ] | [x] |  |
| G6-I03 | Wieder online | [ ] | [ ] | [x] |  |
| G6-I04 | Update-Hinweis | [ ] | [ ] | [x] |  |
| G6-J01 | Systemdarstellung Dunkel/Hell | [ ] | [ ] | [x] |  |
| G6-J02 | Bewegung reduzieren | [ ] | [ ] | [x] |  |
| G6-J03 | Systemschriftgröße | [ ] | [ ] | [x] |  |
| G6-J04 | Seitenzoom 200 % | [ ] | [ ] | [x] |  |

### G7 · Android, Firefox (optional)

Modell: ____________ · OS und Version: ____________ · Browser/App und Version: ____________ · Prüfperson: ____________ · Datum: ____________ · Buildtyp: ____________

| Kennung | Schritt | PASS | FAIL | NOT RUN | Notiz |
|---|---|---|---|---|---|
| G7-A01 | Startadresse öffnen | [ ] | [ ] | [x] |  |
| G7-A02 | Deutsch wählen | [ ] | [ ] | [x] |  |
| G7-A03 | Sprache wechseln | [ ] | [ ] | [x] |  |
| G7-A04 | Sprache wird gemerkt | [ ] | [ ] | [x] |  |
| G7-A05 | Zum Startbildschirm hinzufügen | [ ] | [ ] | [x] | Firefox: Menü ›Installieren‹ beziehungsweise ›Zum Startbildschirm hinzufügen‹ (Wortlaut je Version). |
| G7-B01 | Uhrzeit in Mallorca-Zeit | [ ] | [ ] | [x] |  |
| G7-B02 | Sonnenstand | [ ] | [ ] | [x] |  |
| G7-B03 | Kein erfundener Status | [ ] | [ ] | [x] |  |
| G7-B04 | Beispieltermine gekennzeichnet | [ ] | [ ] | [x] |  |
| G7-B05 | Uhr läuft weiter | [ ] | [ ] | [x] |  |
| G7-C01 | Karte als Beispiel gekennzeichnet | [ ] | [ ] | [x] |  |
| G7-C02 | Suche | [ ] | [ ] | [x] |  |
| G7-C03 | Kein Treffer | [ ] | [ ] | [x] |  |
| G7-C04 | Geschmacksrichtung | [ ] | [ ] | [x] |  |
| G7-C05 | Sprunglinks | [ ] | [ ] | [x] |  |
| G7-C06 | Filter im Link (optional) | [ ] | [ ] | [x] | (optional) |
| G7-D01 | Adresse | [ ] | [ ] | [x] |  |
| G7-D02 | Google Maps | [ ] | [ ] | [x] |  |
| G7-D03 | Apple Karten | [ ] | [ ] | [x] |  |
| G7-D04 | Adresse kopieren | [ ] | [ ] | [x] |  |
| G7-D05 | Treffpunkt teilen | [ ] | [ ] | [x] |  |
| G7-D06 | Öffnungszeiten ehrlich | [ ] | [ ] | [x] |  |
| G7-D07 | Gruppennachricht vorbereiten | [ ] | [ ] | [x] |  |
| G7-E01 | Datum und Uhrzeit wählen | [ ] | [ ] | [x] |  |
| G7-E02 | Abweichende Gerätezeit (optional) | [ ] | [ ] | [x] | (optional) |
| G7-E03 | Fehlermeldung Datum | [ ] | [ ] | [x] |  |
| G7-E04 | Zeitumstellung (optional) | [ ] | [ ] | [x] | (optional) |
| G7-E05 | Einladung teilen | [ ] | [ ] | [x] |  |
| G7-E06 | Einladung kopieren | [ ] | [ ] | [x] |  |
| G7-E07 | Kalender: Datei erzeugen | [ ] | [ ] | [x] |  |
| G7-E09 | ICS-Import Google Kalender | [ ] | [ ] | [x] |  |
| G7-E10 | Plan per Link öffnen | [ ] | [ ] | [x] |  |
| G7-E11 | Entwurf bleibt | [ ] | [ ] | [x] |  |
| G7-F01 | Galerie öffnen | [ ] | [ ] | [x] |  |
| G7-F02 | Bildansicht öffnen | [ ] | [ ] | [x] |  |
| G7-F03 | Blättern | [ ] | [ ] | [x] |  |
| G7-F04 | Scrollen in der Bildansicht | [ ] | [ ] | [x] |  |
| G7-F05 | Schließen | [ ] | [ ] | [x] |  |
| G7-F06 | Safe Areas im Querformat | [ ] | [ ] | [x] |  |
| G7-G01 | Tabbar vollständig | [ ] | [ ] | [x] |  |
| G7-G02 | Home-Indikator | [ ] | [ ] | [x] |  |
| G7-G03 | Seitenende | [ ] | [ ] | [x] |  |
| G7-G04 | Querformat | [ ] | [ ] | [x] |  |
| G7-G05 | Browserleiste ein- und ausfahren | [ ] | [ ] | [x] |  |
| G7-H01 | Tastatur überlappt Formular | [ ] | [ ] | [x] |  |
| G7-H02 | Zahlenfeld | [ ] | [ ] | [x] |  |
| G7-H03 | Auswahl und Tabbar | [ ] | [ ] | [x] |  |
| G7-I01 | Offline-Hinweis | [ ] | [ ] | [x] |  |
| G7-I02 | Offline nach Besuch | [ ] | [ ] | [x] |  |
| G7-I03 | Wieder online | [ ] | [ ] | [x] |  |
| G7-I04 | Update-Hinweis | [ ] | [ ] | [x] |  |
| G7-J01 | Systemdarstellung Dunkel/Hell | [ ] | [ ] | [x] |  |
| G7-J02 | Bewegung reduzieren | [ ] | [ ] | [x] |  |
| G7-J03 | Systemschriftgröße | [ ] | [ ] | [x] |  |
| G7-J04 | Seitenzoom 200 % | [ ] | [ ] | [x] |  |

## Wie melde ich einen Fund?

Ein Fund ist jede Abweichung vom erwarteten Ergebnis (FAIL) und alles, was Sie für einen Fehler halten. Bitte je Fund eine Zeile in der CSV (Ergebnis `FAIL`) oder einen Eintrag mit diesen Angaben:

1. **Gerät:** Modell (z. B. „iPhone 14“, „Pixel 8“) und Kennung aus der Matrix (z. B. G2).
2. **Betriebssystem und Browser mit Versionsnummer** (z. B. „iOS 18.2, Safari“; „Android 15, Chrome 131“; bei In-App-Browsern: App und Version).
3. **Schritt:** die Kennung (z. B. `G5-F04`) und kurz, was Sie getan haben.
4. **Erwartet und tatsächlich:** ein Satz je Seite („Erwartet: Seite scrollt nicht mit. Tatsächlich: Hintergrund scrollt.“).
5. **Screenshot oder Bildschirmaufnahme:** Dateiname in die Spalte `Screenshot` eintragen. Persönliche Daten (Namen, Nummern, Nachrichten) vorher unkenntlich machen oder weglassen.
6. **Wie oft:** jedes Mal, manchmal, einmalig; Sprache der Seite (DE/EN/ES).

Nicht melden, sondern in der Notiz festhalten: Beobachtungen ohne Sollwert (z. B. wohin ein Link führt). Fehler im Betriebssystem oder Browser selbst bitte als solche kennzeichnen.

## CSV-Vorlage

`docs/templates/geraetetest-ergebnis.csv`: UTF-8 mit BOM, Semikolon als Trennzeichen, Zeilenende CRLF (öffnet sich in Excel und Google Tabellen wie `docs/templates/menu-vorlage.csv`). Eine Zeile je Gerät und Schritt.

| Spalte | Inhalt |
|---|---|
| `Kennung` | Gerät-Schritt, z. B. `G5-E07` (nicht ändern) |
| `Geraet`, `Bereich`, `Schritt` | Vorgabe (nicht ändern) |
| `Pflicht` | `ja` für Pflichtgeräte, `optional` sonst; `optional` auch bei optionalen Schritten |
| `Ergebnis` | `PASS`, `FAIL` oder `NOT RUN` (Vorbelegung `NOT RUN`) |
| `Notiz` | Beobachtung, bei FAIL: erwartet/tatsächlich |
| `Screenshot` | Dateiname(n), durch Komma getrennt |
| `Modell`, `OS_Version`, `Browser_Version`, `Systemsprache` | je Zeile des Geräts gleich ausfüllen |
| `Buildtyp`, `Adresse_Build` | `vorschau` oder `oeffentlich`; die geprüfte Adresse (ohne Zugangsdaten) |
| `Pruefperson`, `Datum` | Kürzel oder Name nach Absprache; `JJJJ-MM-TT` |

## Auswertung durch die Betreuung
- Aufgabe 14 gilt erst als DONE, wenn alle Pflichtgeräte (G1 bis G5) ausgefüllt sind und jedes FAIL entweder behoben und erneut geprüft oder in `docs/06_QA.md` als Grenze beschrieben ist.
- Schritte auf NOT RUN bleiben in `docs/06_QA.md`, Abschnitt „Nicht geprüft“, stehen.
- Die Betreuung überträgt Ergebnisse mit Datum und Gerät in `docs/06_QA.md`; dieses Protokoll bleibt unverändert die Vorlage.

## Nicht Teil dieser Prüfung
Screenreader (VoiceOver, TalkBack), Leistung und Ladezeiten im Mobilfunknetz, die Richtigkeit von Adresse, Öffnungszeiten und Karte, die Antwort von CHUCCA auf Anfragen, Desktop-Browser. Das steht entweder in anderen Aufgaben oder bleibt als „nicht geprüft“ offen.

