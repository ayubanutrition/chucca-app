# CHUCCA Playa de Palma – Was wir für die Website von Ihnen brauchen

*Zum Weiterleiten an Inhaberin/Inhaber bzw. Betriebsleitung. Keine Technikkenntnisse nötig.*

## Worum geht es?

Wir bauen eine kleine, dreisprachige Website (Deutsch, Englisch, Spanisch) für CHUCCA an der Playa de Palma: Karte, Öffnungszeiten, Lage und Eingang, Termine, Fotos. Sie funktioniert auf dem Handy wie am Rechner.

Damit dort nichts Falsches steht, **veröffentlichen wir nur, was Sie uns bestätigt haben**. Bis dahin zeigt die Seite lieber „noch nicht bestätigt“ als eine Vermutung. Beispielinhalte gibt es nur in einer privaten Vorschau, die nicht öffentlich ist und klar gekennzeichnet bleibt.

**Was passiert mit Ihren Angaben?** Sie werden ausschließlich für diese Website verwendet. Fotos erscheinen nur mit Ihrer ausdrücklichen Freigabe. Interne Notizen (z. B. woher ein Foto stammt, Nachweise) verlassen das Projekt nicht und sind auf der Website nicht sichtbar. Die Website sammelt keine Gästedaten, es gibt kein Konto und kein Tracking. (Einzige mögliche Ausnahme: der optionale Sendeweg für Gruppenanfragen in Punkt 3. Er ist aus, solange Sie keinen Endpunkt bestätigt haben.)

**Was ist keine Reservierung?** Die Seite hat einen „Treffplan“, mit dem Gäste Datum und Uhrzeit für eine Gruppe vorbereiten und eine Nachricht kopieren können. Das ist **keine Reservierung**: Heute wird nichts an Sie gesendet und nichts verbindlich gebucht. Ob und wie Gruppenanfragen künftig bei Ihnen ankommen sollen, entscheiden Sie in Punkt 3. Auch mit Sendeweg bleibt es eine Anfrage, keine Reservierung: Erst Ihre Antwort ist eine Zusage.

**Wie gehen Sie vor?** Füllen Sie die Felder aus (am einfachsten direkt in diesem Dokument oder per E-Mail-Antwort). Was Sie nicht wissen, lassen Sie leer oder schreiben „weiß ich nicht“ – wir erfinden nichts. Sie müssen nicht alles auf einmal liefern; jeder Teil schaltet nur seinen eigenen Bereich der Website frei.

---

## 1. Adresse und Eingang bestätigen

Wir haben diese Besucheradresse aus öffentlichen Quellen übernommen:

> Riu Center, Carrer del Llaüt 23, 07610 Palma (Playa de Palma, Mallorca)

- [ ] Die Adresse stimmt so.
- [ ] Die Adresse stimmt nicht. Richtig ist: ______________________________

Zum Eingang kennen wir nur eine Verzeichnisangabe („zweite Linie, etwa auf Höhe Balneario 7, Zugang über den Innenhof des Riu Center“). Das ist **nicht bestätigt**.

- [ ] Die Beschreibung stimmt.
- [ ] Bitte so ändern: ____________________________________________
- [ ] Fotos des Eingangs liegen bei: von der Straße aus gesehen, den Weg durch den Innenhof, das Schild/die Tür (mindestens 3 Fotos, quer, bei Tageslicht).

Bitte bestätigen Sie auch Ihren Instagram-Kanal: [ ] @chucca_palma ist korrekt und wird von Ihnen betreut.

## 2. Öffnungszeiten

Aus den Quellen widersprechen sich die Angaben (täglich 19–24 Uhr bzw. 20–2 Uhr). Bitte tragen Sie die **tatsächlichen** Zeiten ein. Endet ein Abend nach Mitternacht, schreiben Sie die Uhrzeit wie gewohnt (z. B. 02:00).

| Wochentag | geöffnet von | bis | Ruhetag (ja) |
|---|---|---|---|
| Montag | | | |
| Dienstag | | | |
| Mittwoch | | | |
| Donnerstag | | | |
| Freitag | | | |
| Samstag | | | |
| Sonntag | | | |

**Saison:** Diese Zeiten gelten vom ____.____.______ bis ____.____.______
(Anderer Winter-/Sommerplan? Bitte einen zweiten Zeitraum mit eigener Tabelle anfügen.)

**Ausnahmen** (Feiertage, Betriebsferien, Sonderöffnungen):

| Datum | geöffnet von – bis, oder „geschlossen“ | Grund (optional) |
|---|---|---|
| | | |
| | | |

## 3. Kontaktwege und Gruppenanfragen

| Kanal | Wert (bitte prüfen/ergänzen) | Wird er von Ihnen betreut? | Darf öffentlich genannt werden? |
|---|---|---|---|
| Instagram | @chucca_palma | ja / nein | ja / nein |
| E-Mail | ______________ (uns liegt info@chucca.com vor, ungeprüft) | ja / nein | ja / nein |
| Telefon | ______________ (uns liegt eine Nummer vor, ungeprüft) | ja / nein | ja / nein |
| WhatsApp | ______________ | ja / nein | ja / nein |

**Gruppenanfragen** (z. B. Geburtstag, Junggesellenabschied):

- [ ] Wir wollen Gruppenanfragen annehmen – über Kanal: ____________________
- [ ] Wir antworten in der Regel innerhalb von: ______ Stunden / Tagen
- [ ] Zuständig ist: ____________________ (nur intern)
- [ ] Wir bieten **keinen** Anfrageweg an; die Seite zeigt dann nur Lage und Zeiten.

Wichtig: Wir schalten einen Kanal für Anfragen nur frei, wenn Sie hier ausdrücklich zusagen, ihn zu betreuen.

### Optional: Anfrage direkt aus der Website senden („Sendeweg“)

Technisch ist vorbereitet, dass das Gruppenformular auf „Besuch“ eine Anfrage **direkt an einen Dienst von Ihnen** schicken kann, statt nur eine Nachricht zum Kopieren vorzubereiten. Das ist **ausgeschaltet**, bis Sie einen Dienst benennen und ausdrücklich bestätigen. Wir erfinden und raten dafür keine Adresse. Wenn Sie den Sendeweg wollen, brauchen wir von Ihnen:

- [ ] **Der Dienst.** Wer nimmt die Anfragen entgegen (eigenes Postfach-Formular, Formular-Dienstleister, Reservierungssystem, interne Software)? Name des Anbieters: ______________________________
- [ ] **Die Adresse (URL) des Dienstes**, genau so, wie der Anbieter sie nennt: `https://__________________/____`. Bedingungen: nur `https`, ein Hostname (keine IP-Adresse, kein Port), **ohne** Zugangsschlüssel in der Adresse (kein `?key=…`); Schlüssel gehören nicht in eine öffentliche Webseite. Der Dienst muss Anfragen von außen ohne Anmeldung annehmen.
- [ ] **Annahmeregeln des Dienstes** (das klärt der Anbieter, wir richten uns danach):
  - Er nimmt eine `POST`-Anfrage mit JSON an: `{ "people": 8, "date": "2026-12-18", "time": "21:00", "note": "Geburtstag", "locale": "de" }` (`note` nur, wenn der Gast etwas schreibt; `date` und `time` gelten in Ortszeit Mallorca; `locale` ist die Sprache der Seite).
  - Er erlaubt die Website per CORS: Antwort auf die Vorabfrage (`OPTIONS`) mit `Access-Control-Allow-Origin: <Adresse der Website>`, `Access-Control-Allow-Methods: POST` und `Access-Control-Allow-Headers: Content-Type`. Das Hosting-Ziel steht erst mit Aufgabe 13 fest; die Adresse der Website geben wir Ihnen dann zum Eintragen.
  - Er antwortet **nur mit 2xx (z. B. 200 oder 204), wenn die Anfrage wirklich angenommen und bei Ihnen abgelegt ist.** Die Website meldet dem Gast erst nach einer 2xx-Antwort „übermittelt“. Bei fehlerhaften Angaben antwortet er mit 4xx, bei eigenen Störungen mit 5xx. Er leitet nicht um (kein 3xx).
  - Er antwortet innerhalb weniger Sekunden. Die Website bricht nach 10 Sekunden ab und sagt dem Gast, dass unklar ist, ob die Anfrage angekommen ist.
- [ ] **Wer liest die Anfragen und antwortet?** Zuständig (nur intern): ______________________ Antwort in der Regel innerhalb von: ______ Stunden / Tagen.
- [ ] **Wie erfährt der Gast Ihre Antwort?** Das Formular hat bewusst **kein Feld für Name oder Kontakt** (wir erfinden keine Datenerhebung). Ohne Kontaktfeld kann die Anfrage nur gelesen, aber nicht beantwortet werden. Entweder Sie wünschen ein Kontaktfeld (E-Mail oder Telefon), dann braucht es zusätzlich den Datenschutztext unten, **oder** der Sendeweg dient nur als Wunschmeldung, und Gäste müssen für die Zusage selbst über einen Kanal aus Punkt 3 nachfragen. Bitte entscheiden Sie: ______________________
- [ ] **Datenschutz** (rechtlich verbindlich, **liefert der Betrieb bzw. eine Juristin/ein Jurist, wir schreiben ihn nicht**): ein kurzer Hinweistext in Deutsch, Englisch und Spanisch, der am Formular steht. Er muss mindestens sagen: wer die Angaben erhält (Verantwortlicher), wozu sie verwendet werden, wie lange sie gespeichert werden, ob ein Dienstleister beteiligt ist (und wo er sitzt), und wo man Auskunft oder Löschung verlangt. Außerdem ein Eintrag im Datenschutzhinweis (Punkt 7). Bis der Text vorliegt, zeigt das Formular an dieser Stelle einen **sichtbar markierten Platzhalter** („[PLATZHALTER …]“), keinen erfundenen Text.
- [ ] **Bestätigung.** Schriftlich (Mail genügt): „Der Dienst unter der genannten Adresse nimmt Gruppenanfragen von der Website an und wird von uns betreut.“ Datum und Absender tragen wir als Beleg ein.

Was die Website sendet, ist auf das Nötige beschränkt: Personenzahl, Datum, Uhrzeit, die freiwillige Anmerkung und die Sprache der Seite. Keine Cookies, kein Referrer, keine Kennung des Geräts. Das Formular sagt dem Gast vor dem Senden, was gesendet wird. Fällt das Senden aus (Netz, Zeitüberschreitung, Fehler des Dienstes, Ablehnung), bleiben seine Eingaben stehen, und er kann den vorbereiteten Text kopieren und selbst schicken.

## 4. Getränkekarte

Bitte tragen Sie die Karte in die **Tabellenvorlage** `docs/templates/menu-vorlage.csv` ein (öffnet sich in Excel oder Google Tabellen; die vier Zeilen mit „BEISPIEL“ bitte durch Ihre Drinks ersetzen – solange eine solche Zeile stehen bleibt, lehnt die Prüfung die Tabelle ab). Speichern als **„CSV UTF-8“**, damit Umlaute erhalten bleiben.

| Spalte | Was hinein gehört |
|---|---|
| Kategorie | Klassiker, Spritz & Longdrinks, Signature Drinks oder Alkoholfrei (weitere Kategorien nennen Sie uns bitte) |
| Name DE / EN / ES | Name des Drinks in jeder Sprache (auch bei gleichem Namen in alle drei eintragen) |
| Zutaten | Zutaten auf Deutsch, durch Komma getrennt; die Übersetzungen in „Zutaten EN“ und „Zutaten ES“ in gleicher Reihenfolge |
| Größe | z. B. „0,3 l“ – leer, wenn es nur eine Größe gibt |
| Preis € | Endpreis inkl. Steuer, z. B. 9,50 oder 9.50 (ohne Tausenderpunkt; 0 ist nicht erlaubt). Preis unbekannt: Feld leer lassen, der Drink erscheint dann ohne Preis |
| alkoholfrei | ja oder nein |
| Allergene | optional |
| verfügbar | ja oder nein (leer = ja) |

Hat ein Drink mehrere Größen, schreiben Sie **eine Zeile pro Größe** mit demselben deutschen Namen; Zutaten und Übersetzungen genügen in der ersten Zeile.

- [ ] Stand der Karte (Datum): ____.____.______ (Als „Stand“ trägt die Umwandlung den Tag ein, an dem die Tabelle eingelesen wird. Weicht das Datum Ihrer Karte ab, sagen Sie es uns.)
- [ ] Die Preise sind aktuell und gelten für die ganze Saison.
- [ ] Spanische und englische Namen/Zutaten wurden von jemandem mit Sprachkenntnis geprüft.

Allergene: Rechtliche Anforderungen dazu kennen Sie besser als wir; falls Sie Angaben liefern, nehmen wir sie auf, sobald die Website ein Feld dafür hat.

## 5. Termine

Nur bestätigte, zukünftige Termine erscheinen. Für jeden Termin:

| Datum | Beginn | Ende (optional) | Titel (DE / EN / ES) | Kurztext (DE / EN / ES, 1–2 Sätze) |
|---|---|---|---|---|
| | | | | |
| | | | | |

Absagen oder Änderungen melden Sie uns bitte sofort; abgelaufene Termine verschwinden automatisch.

## 6. Fotos

**Wunsch: 8 bis 12 Originalfotos** (quer, möglichst hohe Auflösung, Originaldatei – nicht aus WhatsApp weitergeleitet). Motive:

- [ ] Eingang und Weg durch den Innenhof (siehe Punkt 1)
- [ ] Außenbereich/Terrasse bei Tag und bei Abend
- [ ] Bar und Rückwand
- [ ] Sitzplätze und Atmosphäre
- [ ] Drinks (3–4 typische Drinks, ruhiger Hintergrund)
- [ ] Team bei der Arbeit (nur mit Einwilligung, siehe unten)
- [ ] Gäste (nur mit Einwilligung, siehe unten)

**Nutzungserlaubnis – Textbaustein** (bitte Ihrer Mail oder Datei beilegen und die Lücken ausfüllen):

> „Hiermit bestätige ich, [Name, Funktion], für [Firma/Betrieb], dass ich die beigefügten [Anzahl] Fotos (Dateinamen: ______) selbst gemacht habe bzw. alle Rechte daran besitze oder die Fotografin/den Fotografen [Name] beauftragt habe und die Nutzungsrechte dafür besitze. Ich erlaube die unbefristete/befristete (bis ______) Nutzung dieser Fotos auf der Website von CHUCCA Playa de Palma in allen Sprachfassungen. Auf den Fotos ist das Lokal CHUCCA Playa de Palma zu sehen. Ort, Datum, Unterschrift/E-Mail-Absender.“

**Abgebildete Personen:** Erkennbare Personen müssen eingewilligt haben. Bitte legen Sie je Person eine kurze Einwilligung bei (Name, Foto/Dateiname, „Ich bin mit der Veröffentlichung auf der CHUCCA-Website einverstanden“, Datum, Unterschrift/E-Mail). Bei Minderjährigen unterschreiben die Erziehungsberechtigten. Wenn Sie unsicher sind: Fotos ohne erkennbare Gesichter verwenden.

**Bildbeschreibungen** schreiben wir auf Deutsch, Englisch und Spanisch vor; bitte sagen Sie uns, falls etwas falsch beschrieben ist.

## 7. Rechtliches

Impressum und Datenschutzhinweis sind rechtlich verbindliche Texte. **Diese Texte müssen der Betrieb bzw. eine Juristin/ein Jurist liefern – wir schreiben und prüfen sie nicht.** Wir binden sie nur ein.

- [ ] Betreiber (Firma, Rechtsform, Anschrift laut Handelsregister bzw. Gewerbeanmeldung): ______________________________
- [ ] Vertretungsberechtigte Person: ______________________________
- [ ] Kontakt für das Impressum (E-Mail, Telefon): ______________________________
- [ ] Steuer-/Registernummern, soweit vorgeschrieben: ______________________________
- [ ] Fertiger Impressumstext liegt bei (DE, möglichst auch EN/ES).
- [ ] Fertiger Datenschutzhinweis liegt bei (DE, möglichst auch EN/ES).
- [ ] Wer ist für die Website datenschutzrechtlich verantwortlich? ______________________________
- [ ] Nur falls Sie den Sendeweg für Anfragen wollen (Punkt 3): Hinweistext zur Verwendung der gesendeten Angaben (DE/EN/ES) und Eintrag im Datenschutzhinweis.

Hinweis: Die Website sammelt selbst keine Gästedaten und setzt keine Tracking-Dienste ein. Ihr Hosting-Anbieter kann trotzdem technische Daten verarbeiten – das gehört in den Datenschutzhinweis.

## 8. Markenmaterial

- [ ] Logo (am besten Vektordatei: SVG, PDF oder AI; sonst PNG mit transparentem Hintergrund, mindestens 1000 px breit) – helle und dunkle Variante
- [ ] Farben (Farbcodes, Format #RRGGBB, oder Farbnamen aus Ihrem Styleguide)
- [ ] Schriften (Name und Lizenz – dürfen sie im Web eingesetzt werden?)
- [ ] Bildsprache/Tonalität (z. B. Beispiele, die Ihnen gefallen oder gerade nicht gefallen)
- [ ] Wir haben kein Markenmaterial – bitte vorhandene Gestaltung des Lokals (Schilder, Karten) fotografieren.

---

## QR-Code für den Aufsteller (später)

Sobald feststeht, unter welcher Adresse die Website erreichbar ist, kann ein QR-Code für Tische oder Aufsteller erzeugt werden. Er führt direkt auf die Getränkekarte in der gewünschten Sprache (Deutsch, Englisch oder Spanisch). Dafür gilt:

- **Erst nach der Entscheidung über Hosting und Adresse.** Ein vorher gedruckter Code würde ins Leere führen.
- **Die Karte muss bestätigt sein.** Solange der Betrieb die Karte nicht bestätigt hat, zeigt die öffentliche Seite „Die bestätigte Karte folgt“ und wird von Suchmaschinen ausgeschlossen (`noindex`). Ein Code sollte erst gedruckt werden, wenn dort die echte Karte steht.
- **Kurz-URL optional.** Wer eine lesbare Kurzadresse möchte, richtet sie beim gewählten Anbieter ein und lässt sie auf die Karte weiterleiten. Sie darf keine Tracking-Parameter (`utm_…`) enthalten; die Website arbeitet ohne Tracking.
- **Vor dem Druck mit einem Handy scannen**, in jeder Sprachfassung und bei der gedruckten Größe.

Technik (für die Betreuung):

```sh
node scripts/qr-link.mjs https://<Host>/<Unterpfad-falls-vorhanden> de [https://kurz.example/d] [--out aufsteller-de.svg]
```

Das Skript gibt den Deep-Link aus (z. B. `…/de/drinks/`, `…/en/drinks/`, `…/es/bebidas/`), prüft die URLs (https, keine UTM-Parameter, keine Zugangsdaten) und schreibt ein druckbares SVG ohne externe Verweise. Ohne `--out` heißt die Datei `qr-drinks-<Sprache>.svg` und landet im aktuellen Ordner. Mit Kurz-URL kodiert der Code diese, sonst den Deep-Link. Nicht geprüft: Scanbarkeit nach dem Druck, Kontrast auf dem gewählten Material.

## Texte, die Sie freigeben müssen

Diese Aussagen stehen auf der Website, sind aber keine Angaben von Ihnen. Bitte bestätigen oder ändern (Quelle: `src/i18n/*.ts`):

| Text | Wo | Frage an Sie |
|---|---|---|
| „Alkohol nur für Erwachsene“ / „Alcohol is served to adults only“ / „Solo se sirve alcohol a mayores de edad“ | Fußzeile | Stimmt das so für Ihr Lokal? |
| „Gute Drinks, warmes Licht“ und die Bezeichnung „Cocktailbar“ | Startseite, Meta-Texte | Wollen Sie das so sagen? |
| Schreibweise „Playa de Palma“ mit oder ohne Artikel („la“) | Spanisch | Welche Schreibweise nutzen Sie selbst? |

## Technik für die Betreuung: von der Angabe zur Seite

Nur für die Person, die die Angaben einträgt. Alle Befehle im Projektordner; alle Prüfmeldungen sind deutsch. Ein Fehler (✖, „Fehler“) stoppt den Vorgang, ein Hinweis (⚠) nicht.

1. **Karte einlesen:** `npm run menu:import -- karte.csv` zeigt das Ergebnis nur an (nichts wird überschrieben). Stimmt es: `npm run menu:import -- karte.csv --out src/content/published/menu.json`. Bei Fehlern nennt das Skript Zeile und Spalte der Tabelle und schreibt nichts.
2. **Zeiten, Kanal, Termine, Fotos eintragen:** in `src/content/published/venue.json`, `events.json` und `src/content/media/catalogue.json` (Feldbeschreibung: `docs/04_CONTENT_MEDIA.md`, Abschnitt „Pflege“). Jede Angabe mit `status: "confirmed"` braucht `source` (Quelle, z. B. „Mail vom 12.11.“) und `observedAt` (Datum).
   Optionaler Sendeweg (nur nach schriftlicher Bestätigung des Betriebs, Punkt 3): in `venue.json` den Block `inquiryEndpoint` ergänzen. Er fehlt im Repo absichtlich; solange er fehlt oder nicht bestätigt ist, bleibt der Sendeweg aus. Felder: `url` (https, nur Hostname und Pfad), `method: "POST"`, `acceptsInquiries: true`, `status: "confirmed"`, `source` (Beleg, z. B. „Mail vom …“), `verifiedAt` (Tag der Bestätigung), `privacyNote` (DE/EN/ES, Rechtstext des Betriebs; ohne ihn zeigt die Seite den markierten Platzhalter). Für einen Entwurf ohne Wirkung: `status: "proposal"` und `acceptsInquiries: false`. Aufbau und Regeln: `docs/04_CONTENT_MEDIA.md`, Abschnitt „Pflege“.
3. **Prüfen:** `npm run content:check` nennt Datei, Feld und Grund jedes Fehlers und listet, was öffentlich noch fehlt. Dieselben Fehler stoppen auch den Build.
4. **Bauen:** `npm run build` erzeugt die private Vorschau (`dist/`, mit gekennzeichneten Beispielen). Die öffentliche Fassung ohne Beispiele: `CHUCCA_SITE_URL=https://<Adresse> npm run build:public` → `dist-public/`. Ohne `CHUCCA_SITE_URL` bleibt sie bewusst `noindex`, ohne Sitemap und Canonical.

## Wie läuft es danach?

1. **Prüfen.** Wir tragen Ihre Angaben ein und lassen automatisch prüfen, ob alles vollständig und widerspruchsfrei ist. Offene Punkte schicken wir Ihnen als kurze Liste.
2. **Vorschau.** Sie erhalten einen privaten Link zur Vorschau, den nur Sie und wir kennen. Dort sehen Sie Ihre Karte, Zeiten und Fotos so, wie sie später erscheinen – am besten auf dem Handy.
3. **Rückmeldung.** Sie sagen uns, was geändert werden soll (falsche Preise, Schreibfehler, Foto austauschen). Wir korrigieren, Sie sehen die neue Vorschau.
4. **Freigabe.** Sie bestätigen ausdrücklich, dass alle Angaben stimmen und Fotos und Texte veröffentlicht werden dürfen. Erst jetzt wird die öffentliche Fassung gebaut – sie enthält nur freigegebene Inhalte.
5. **Veröffentlichung und Pflege.** Wir schalten die Seite frei. Änderungen (neue Karte, neue Zeiten, neue Termine) schicken Sie uns jederzeit mit denselben Vorlagen; jede Änderung läuft wieder durch Prüfen und Vorschau. Wir empfehlen, die Karte spätestens nach 90 Tagen erneut zu bestätigen.
