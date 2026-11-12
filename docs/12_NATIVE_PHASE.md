# Native Phase: PWA oder App? (Entscheidungsvorlage)

Stand 12.11.2026. Plan-Aufgabe 21. **Keine Entscheidung, kein Projekt, keine Zusage.** Diese Vorlage ordnet Kriterien und Annahmen, damit der Betrieb später entscheiden kann.

## Kennzeichnung
- **[Repo]** im Repository belegt (Code, Test, Dokument).
- **[Annahme]** Einschätzung ohne Test in dieser Umgebung. Plattformverhalten ändert sich mit Betriebssystem- und Browserversionen; vor einer Entscheidung auf aktuellen Geräten und in der aktuellen Herstellerdokumentation prüfen.
- **[Offen]** muss der Betrieb oder ein Gerätetest beantworten.

Nicht geprüft in dieser Umgebung: jedes Gerät, jeder Store-Prozess, jede Preisangabe der Hersteller. Zahlen zu Gebühren stehen deshalb nicht in diesem Dokument.

## Ausgangslage [Repo]
Die PWA ist ein statischer Build ohne Backend, ohne Konto, ohne Tracking (`docs/03_ARCHITECTURE.md`). Sie hat Manifest, Icons und Service Worker (Offline-Kopie im öffentlichen Modus, Update-Hinweis). Kernaufgaben für Gäste: Heute, Karte, Besuch, Treffplan mit Kalenderdatei, Galerie. Geprüft nur im Labor (Chromium; zusätzlich Playwright-Firefox und -WebKit unter Linux). Geräte, Installation und In-App-Browser sind offen (Aufgabe 14). Native App: kein Projekt.

## Was die PWA heute kann [Repo] und was offen ist
| Fähigkeit | Stand |
|---|---|
| Läuft im Browser auf jedem Gerät, nutzbar per Link und QR | [Repo] Browser-Tests in drei Engines |
| Zum Startbildschirm hinzufügen, Standalone-Anzeige | [Repo] Manifest und Icons vorhanden; Installation selbst [Offen] bis Gerätetest |
| Offline-Kopie bereits besuchter Seiten | [Repo] Chromium belegt; Offline in Playwright-WebKit nicht prüfbar (`docs/06_QA.md`) |
| Treffplan teilen, Text kopieren, Kalenderdatei (.ics) | [Repo] Logik getestet; ob das Gerät die Datei öffnet, [Offen] (v. a. In-App-Browser) |
| Sprache, Tastatur, reduzierte Bewegung, Safe Areas | [Repo] im Labor; Safe Areas auf echten Geräten [Offen] |

## Was die PWA voraussichtlich nicht oder nur eingeschränkt kann [Annahme]
| Thema | Einschätzung |
|---|---|
| Push-Nachrichten | Auf Android-Chrome gängig. Auf iOS nach unserer Kenntnis nur für zum Home-Bildschirm hinzugefügte Web-Apps und mit Einwilligung; Verhalten und Mindestversion prüfen. Für das Kernprodukt nicht nötig: keine Konten, keine Bestellungen. |
| Store-Auffindbarkeit | Eine PWA steht nicht automatisch im App Store; auf Android sind Store-Einträge für Web-Apps über Wrapper möglich. Wert für ein einzelnes Lokal gering, da Gäste über Ort, QR und Instagram kommen. |
| Installationshürde | iOS: Hinzufügen über das Teilen-Menü, wenig sichtbar. Android: Installationsangebot des Browsers. Beides ohne Gerätetest nicht belegt. |
| Hintergrund-Aufgaben, Widgets, tiefe Systemintegration | Eingeschränkt gegenüber nativ; für dieses Produkt kein Ziel. |
| Speicher | Browser können Website-Daten bei Platzmangel oder Inaktivität entfernen. Wir speichern nur Präferenz und Entwurf, ein Verlust ist unkritisch. |
| In-App-Browser (Instagram, WhatsApp) | Eingeschränkte Funktionen möglich (Teilen, Download, Service Worker). Mit Aufgabe 14 testen. Eine App löst das nicht, ein Link von dort öffnet weiterhin den Browser. |

## Kriterien für die Entscheidung
| Kriterium | Frage | Tendenz (Bewertung) |
|---|---|---|
| Nutzen für Gäste | Gibt es eine Aufgabe, die die PWA nicht lösen kann? | heute keine bekannt |
| Reichweite | Kommen Gäste über Store-Suche? | unwahrscheinlich; [Offen] Betrieb |
| Wiederkehr | Brauchen Stammgäste Erinnerungen (Push, Treuekarte)? | nicht Teil des Produkts; wäre neue Anforderung |
| Daten und Recht | Neue Datenverarbeitung (Push-Token, Konten)? | würde Datenschutztexte, Einwilligung und Pflege auslösen |
| Aufwand und Pflege | Wer baut, signiert, aktualisiert, beantwortet Store-Rückfragen? | Mehraufwand gegenüber statischem Hosting, laufend |
| Konsistenz | Gleicher Inhalt in zwei Lieferständen? | bei Wrapper gering (gleicher Build), bei echter Native-Neuentwicklung hoch |
| Risiko | Ablehnung im Store, Richtlinienänderungen | bei reinen Web-Wrappern ohne eigene Funktion kann eine Ablehnung drohen [Annahme]; Richtlinien vor Start lesen |

## Optionen
1. **PWA bleibt** (Empfehlung der Vorlage, solange keine Auslöser eintreten). Geringster Aufwand, ein Lieferstand.
2. **Wrapper um den bestehenden Build** (Capacitor o. ä., geteilte Logik aus `src/lib/`; `docs/03_ARCHITECTURE.md`). Store-Präsenz und Zugriff auf Systemfunktionen, ohne Neuentwicklung. Offen: Konten, Signierung, Texte in drei Sprachen, Geräteabnahme, Datenschutzangaben.
3. **Native Neuentwicklung.** Nur bei Anforderungen, die ein Wrapper nicht erfüllt. Für den heutigen Umfang nicht begründet.

## Kosten (qualitativ, keine Beträge)
Einmalig: Entwicklerkonten bei Apple und Google auf den Betreiber [Offen: Gebühren aktuell nachsehen], Signierung, Icons und Store-Grafiken, Store-Texte DE/EN/ES, Datenschutz- und Altersangaben, Geräteabnahme. Laufend: Aktualisierung bei neuen Systemversionen, Prüfzyklen der Stores, Antworten auf Rückfragen. Eine PWA verursacht dagegen nur Hosting und Pflege der Inhalte.

## Auslöser für eine native Phase
Entscheidung frühestens, wenn **alle** zutreffen:
1. Aufgaben 12–14 sind abgeschlossen: bestätigte Inhalte, Host, Gerätetests iPhone und Android.
2. Es gibt eine konkrete, vom Betrieb gewollte Funktion, die die PWA nach Gerätetest nicht erfüllt (z. B. Erinnerungen), oder nachweislich verfehlte Gäste, die in der Praxis den Store erwarten.
3. Der Betrieb benennt Verantwortliche für Konten, Signierung und Pflege.
4. Datenschutzfolgen sind geklärt, falls die Funktion Daten verarbeitet.

Kein Auslöser: Wunsch nach „einer richtigen App“ ohne benannte Funktion.

## Nächster Schritt
Nach Aufgabe 14 diese Tabellen mit Gerätebefunden abgleichen (jede [Annahme] bestätigen oder streichen), dann dem Betrieb Option 1 oder 2 zur Entscheidung vorlegen.
