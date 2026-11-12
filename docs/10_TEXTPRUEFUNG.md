# Textprüfung (KI-Lektorat)

Stand: Durchsicht von `src/i18n/{en,es,de}.ts`, `src/content/fixtures/{menu.json,events.ts}` und `alt`/`caption` in `src/content/media/catalogue.json`. Das ist ein KI-Lektorat, **keine Freigabe**: Muttersprachliche Personen, am besten mit Bezug zum Lokal, sollten die Texte vor Veröffentlichung lesen.

Nur Werte geändert, keine Schlüssel oder Platzhalter. Die Tabelle zeigt bei den Änderungen nur den geänderten Ausschnitt, nicht den ganzen Satz. Anzahl: 64 Änderungen (EN 17, ES 24, DE 10, Beispielkarte 7, Medien 6). `events.ts` blieb unverändert (Texte unauffällig und als Beispiel gekennzeichnet).

Geprüft ohne Befund: Seitentitel höchstens 59 Zeichen, Meta-Descriptions höchstens 144 Zeichen; `countOne/countMany`; „Treffplan ist keine Reservierung“ bleibt in allen Sprachen klar (`group.note`, `group.facts.reserveTitle`, `visit.inquiry.limited`).

## Wichtigste Änderungen

| Sprache | Schlüssel | vorher (Ausschnitt) | nachher (Ausschnitt) | Grund |
|---|---|---|---|---|
| EN | `meta.titles.today` | today: 'Tonight at CHUCCA · Cocktail bar in Playa de Palma, Mallorca' | today: 'Today at CHUCCA · Cocktail bar in Playa de Palma, Mallorca' | Seite zeigt auch tagsüber Inhalte; DE/ES sagen „heute“/„hoy“ |
| EN | `meta.descriptions.gallery` | gallery: 'Images of CHUCCA Playa de Palma.' | gallery: 'Gallery of CHUCCA, a cocktail bar in Playa de Palma, Mallorca: light, glasses and evening mood.' | Zu knapp, ohne Suchbegriff |
| EN | `meta.descriptions.drinks` | drinks: 'Drinks at CHUCCA Playa de Palma: find out what you are in the mood for – with or without alcohol.' | drinks: 'Drinks at CHUCCA, the cocktail bar in Playa de Palma: find out what you fancy – with or without alcohol.' | Suchbegriff „cocktail bar Playa de Palma“; britisch „fancy“ |
| EN | `meta.descriptions.visit` | visit: 'How to find CHUCCA: Riu Center, Carrer del Llaüt 23, Playa de Palma. Directions and contact.' | visit: 'How to find CHUCCA cocktail bar: Riu Center, Carrer del Llaüt 23, Playa de Palma. Directions and contact.' | Suchbegriff |
| EN | `nav.today` |     today: 'Tonight',     drinks: 'Drinks', |     today: 'Today',     drinks: 'Drinks', | Konsistent mit DE „Heute“/ES „Hoy“; Seite ist nicht nur abends relevant |
| EN | `today.intro` | Browse the menu, get directions and pick a time.' | Browse the menu, find the way and agree a time.' | „pick a time“ klang nach Auswahlliste; „agree a time“ natürlicher |
| EN | `drinks.taste.hint` | hint: 'Pick a mood. The menu shows matching drinks; at the bar it helps you order.' | hint: 'Pick a flavour. The menu shows matching drinks; at the bar it helps you order.' | „mood“ passte nicht zum Gruppenlabel „Flavour“ |
| EN | `drinks.taste.hintNoMenu` | hintNoMenu: 'Pick a mood. It helps you order the right thing at the bar.' | hintNoMenu: 'Pick a flavour. It helps you order the right thing at the bar.' | siehe oben |
| EN | `drinks.taste.texts.free` | free: 'Full flavour, no alcohol. Ask for tonight’s alcohol-free drinks.' | free: 'Full flavour, no alcohol. Ask the team about the alcohol-free options.' | Behauptete ein täglich wechselndes alkoholfreies Angebot; jetzt nur Hinweis zum Nachfragen |
| EN | `drinks.item.priceMissing` | priceMissing: 'Price at the bar' | priceMissing: 'Ask at the bar for the price' | Klarer, dass kein Preis genannt wird |
| EN | `visit.way.mapAlt` | CHUCCA is in the courtyard, roughly level with Balneario 7.' | CHUCCA is drawn in the courtyard, roughly level with Balneario 7 (listing information, not confirmed).' | Ortsangabe im Alternativtext als unbestätigt kennzeichnen |
| EN | `visit.inquiry.people` |       people: 'People', |       people: 'Number of people', | Eindeutigeres Formularlabel |
| EN | `visit.inquiry.template` | we would like to come with {people} people on {date} at {time} (Mallorca local time). Do you have room for us?' | there will be {people} of us on {date} at {time} (Mallorca local time). Do you have room for us?' | Natürlicher als „come with … people“ |
| EN | `nav.home` | home: 'home', | home: 'home page', | Screenreader: „CHUCCA – home page“ statt „home“ |
| EN | `gallery.conceptTitleB` | conceptTitleB: 'we’re going for.' | conceptTitleB: 'we’re after.' | Kürzer, idiomatisch |
| EN | `today.gallery.conceptTitle` | conceptTitle: 'The mood we’re going for' | conceptTitle: 'The mood we’re after' | siehe oben |
| EN | `gallery.emptyBody` | For current impressions, see Instagram.' | For current impressions, head to Instagram.' | Verb |
| ES | `meta.titles.group` | group: 'Planear una quedada · CHUCCA Playa de Palma' | group: 'Organizar una quedada · CHUCCA Playa de Palma' | „Organizar“ ist die übliche Kollokation; passt zur Description |
| ES | `meta.titles.today` | today: 'Hoy en CHUCCA · Coctelería en Playa de Palma, Mallorca' | today: 'Hoy en CHUCCA · Coctelería en la Playa de Palma, Mallorca' | Artikel; Titel bleibt unter 60 Zeichen |
| ES | `meta.descriptions.gallery` | gallery: 'Imágenes de CHUCCA Playa de Palma.' | gallery: 'Galería de CHUCCA, coctelería en la Playa de Palma, Mallorca: luz, copas y ambiente de noche.' | Zu knapp, ohne Suchbegriff |
| ES | `meta.descriptions.drinks` | drinks: 'La carta de CHUCCA Playa de Palma: descubre qué te apetece, con o sin alcohol.' | drinks: 'La carta de CHUCCA, coctelería en la Playa de Palma: descubre qué te apetece, con o sin alcohol.' | Suchbegriff „coctelería Playa de Palma“ |
| ES | `meta.descriptions.visit` | visit: 'Cómo llegar a CHUCCA: Riu Center, | visit: 'Cómo llegar a la coctelería CHUCCA: Riu Center, | Suchbegriff |
| ES | `common.external` | external: 'se abre fuera de la app' | external: 'se abre fuera de esta página' | Es ist eine Web-App; „fuera de la app“ missverständlich |
| ES | `today.now.phaseDay` | phaseDay: 'Faltan {duration} para la puesta de sol.' | phaseDay: 'Puesta de sol en {duration}.' | „Faltan 1 h 5 min“ hat Numerus-Probleme bei zusammengesetzter Dauer; neutral formuliert |
| ES | `today.now.open` | open: 'Abierto ahora, hasta las {time}.' | open: 'Abierto ahora. Hora de cierre: {time}.' | „hasta las 01:00“ wäre falsch (hasta la 1); nachts schließende Bar |
| ES | `drinks.taste.hint` | hint: 'Elige un estilo. La carta | hint: 'Elige un sabor. La carta | Passt zum Gruppenlabel |
| ES | `drinks.taste.hintNoMenu` | hintNoMenu: 'Elige un estilo. Te ayuda a pedir en la barra.' | hintNoMenu: 'Elige un sabor. Te ayuda a pedir lo que te apetece en la barra.' | Vollständiger Satz, gleiche Aussage wie DE/EN |
| ES | `drinks.taste.group` | group: 'Tipo de sabor', | group: 'Sabor', | Kürzer |
| ES | `drinks.taste.texts.free` | free: 'Todo el sabor, sin alcohol. Pregunta por las bebidas sin alcohol de la noche.' | free: 'Todo el sabor, sin alcohol. Pregunta al equipo por las opciones sin alcohol.' | Keine Behauptung eines nächtlichen Angebots |
| ES | `drinks.item.priceMissing` | priceMissing: 'Precio en la barra' | priceMissing: 'Precio: pregúntalo en la barra' | Klarer, dass kein Preis genannt wird |
| ES | `visit.way.unconfirmed` | unconfirmed: 'Información de directorios online, pendiente de confirmar in situ.' | unconfirmed: 'Dato de directorios en línea, aún sin confirmar en el local.' | „in situ“ gestelzt |
| ES | `visit.way.mapAlt` | mapAlt: 'Croquis esquemático: playa y paseo; detrás, la segunda línea con el Riu Center. CHUCCA está en el patio interior, aproximadamente a la altura del Balneario 7.' | mapAlt: 'Croquis: playa y paseo; detrás, la segunda línea con el Riu Center. CHUCCA aparece dibujado en el patio interior, aproximadamente a la altura del Balneario 7 (dato de directorios, sin confirmar).' | Ortsangabe im Alternativtext als unbestätigt kennzeichnen; „esquemático“ doppelt |
| ES | `visit.inquiry.limited` | ni garantiza sitio.' | ni confirma sitio.' | „garantiza“ klingt nach Reservierungsversprechen |
| ES | `visit.inquiry.people` |       people: 'Personas', |       people: 'Número de personas', | Eindeutigeres Formularlabel |
| ES | `visit.inquiry.notePlaceholder` | notePlaceholder: 'p. ej. cumpleaños, mejor fuera' | notePlaceholder: 'p. ej. cumpleaños, si puede ser fuera' | Weniger abrupt |
| ES | `visit.inquiry.template` | nos gustaría ir {people} personas el {date} | somos {people} personas y nos gustaría ir el {date} | Natürlicherer Satzbau |
| ES | `group.deviceTime` | deviceTime: 'En tu dispositivo son las {time} ({zone}).' | deviceTime: 'En tu dispositivo: {time} ({zone}).' | „son las 01:00“ wäre falsch; neutral |
| ES | `group.inviteRoute` | inviteRoute: 'Ruta:' | inviteRoute: 'Cómo llegar:' | Gleiche Wortwahl wie „Cómo llegar“ im Rest der Seite |
| ES | `gallery.emptyBody` | Para ver el ambiente actual, visita Instagram.' | Para ver cómo es el ambiente ahora, pásate por Instagram.' | Natürlicher |
| ES | `today.gallery.title` |       title: 'Un vistazo',       conceptTitle |       title: 'Un vistazo al interior',       conceptTitle | Entspricht DE „Ein Blick hinein“, vollständiger |
| ES | `footer.drinkResponsibly` | drinkResponsibly: 'Disfruta con responsabilidad. Solo se sirve alcohol a mayores de edad.' | drinkResponsibly: 'Consumo responsable. Solo se sirve alcohol a mayores de edad.' | Neutrale Anrede, wie DE |
| DE | `today.intro` | Schaut in die Karte, findet den Weg und macht eine Zeit aus.' | Schaut in die Karte, findet den Weg und verabredet euch.' | „eine Zeit ausmachen“ regional; neutraler |
| DE | `meta.descriptions.gallery` | gallery: 'Bilder von CHUCCA Playa de Palma.' | gallery: 'Galerie von CHUCCA, Cocktailbar an der Playa de Palma auf Mallorca: Licht, Gläser und Abendstimmung.' | Zu knapp, ohne Suchbegriff |
| DE | `meta.descriptions.drinks` | drinks: 'Drinks bei CHUCCA Playa de Palma: Finde heraus | drinks: 'Drinks bei CHUCCA, der Cocktailbar an der Playa de Palma: Finde heraus | Suchbegriff „Cocktailbar Playa de Palma“ |
| DE | `meta.descriptions.visit` | visit: 'So findest du CHUCCA: Riu Center, | visit: 'So findest du die Cocktailbar CHUCCA: Riu Center, | Suchbegriff |
| DE | `drinks.taste.texts.free` | Frag nach den alkoholfreien Drinks des Abends.' | Frag das Team nach den alkoholfreien Optionen.' | Keine Behauptung eines wechselnden Abendangebots |
| DE | `drinks.item.priceMissing` | priceMissing: 'Preis an der Bar' | priceMissing: 'Preis an der Bar erfragen' | Klarer, dass kein Preis genannt wird |
| DE | `visit.way.mapAlt` | CHUCCA liegt im Innenhof, etwa auf Höhe von Balneario 7.' | CHUCCA ist im Innenhof eingezeichnet, etwa auf Höhe von Balneario 7 (Angabe aus Verzeichnissen, nicht bestätigt).' | Ortsangabe im Alternativtext als unbestätigt kennzeichnen |
| DE | `visit.inquiry.people` |       people: 'Personen', |       people: 'Anzahl Personen', | Eindeutigeres Formularlabel |
| DE | `footer.drinkResponsibly` | drinkResponsibly: 'Bitte genießt verantwortungsvoll. Alkohol nur für Erwachsene.' | drinkResponsibly: 'Alkohol nur für Erwachsene. Bitte verantwortungsvoll genießen.' | Anrede-neutral (Fußzeile ist weder Hero noch Formular) |
| DE | `today.now.closedOpens` | Öffnet {day} um {time} Uhr.' | Öffnet am {day} um {time} Uhr.' | Grammatik: „am Montag“ |
| Beispielkarte | `menu.margarita.description.es` | "es": "Cítrica y limpia, con medio borde de sal." | "es": "Cítrica y fresca, con medio borde de sal." | „limpia“ ist Anglizismus (clean) |
| Beispielkarte | `menu.margarita.description.de` | "de": "Zitrisch und klar, mit halbem Salzrand." | "de": "Frisch-zitronig und klar, mit halbem Salzrand." | „zitrisch“ ist kein gängiges Wort |
| Beispielkarte | `menu.espresso-martini.ingredients.es` | "es": "café expreso" | "es": "espresso" | In Cocktailbars üblich: „espresso“ |
| Beispielkarte | `menu.orange-spritz.description.es` | "es": "El aperitivo de la puesta de sol." | "es": "El aperitivo para la puesta de sol." | Natürlichere Präposition |
| Beispielkarte | `menu.garden-tonic.ingredients.es` | "es": "alternativa a la ginebra sin alcohol" | "es": "alternativa sin alcohol a la ginebra" | Natürlichere Wortstellung |
| Beispielkarte | `menu.gin-tonic.prices.size` | "size": "0,3 l" | "size": "30 cl" | Dezimalkomma ist in EN falsch; „cl“ ist sprachneutral und in Spanien üblich |
| Beispielkarte | `menu.gin-tonic.prices.size` | "size": "0,5 l" | "size": "50 cl" | siehe oben |
| Medien | `media.concept-highball.caption.de` | "de": "Frisch und alkoholfrei" | "de": "Etwas Frisches" | Illustration belegt keine Alkoholfreiheit |
| Medien | `media.concept-highball.caption.en` | "en": "Fresh and alcohol-free" | "en": "Something fresh" | siehe oben |
| Medien | `media.concept-highball.caption.es` | "es": "Fresco y sin alcohol" | "es": "Algo fresco" | siehe oben |
| Medien | `media.concept-table.caption.de` | "de": "Ein Tisch für zwei – oder zwölf" | "de": "Ein Abend am Tisch" | Implizierte Platz-/Gruppenzusage |
| Medien | `media.concept-table.caption.en` | "en": "A table for two – or twelve" | "en": "An evening at the table" | siehe oben |
| Medien | `media.concept-table.caption.es` | "es": "Una mesa para dos, o para doce" | "es": "Una noche en la mesa" | siehe oben |

Angepasster Test: `tests/e2e/core.spec.ts` (Größenangabe `0,3 l` wird zu `30 cl`; gleiche Prüfaussage: Die Größe erscheint am Preis).

## Bitte vor Ort prüfen (Unsicherheiten)

1. **Fakten**: „Riu Center, Carrer del Llaüt 23“, „Innenhof“ und „Balneario 7“ stammen aus Verzeichnissen und sind in der Skizze als unbestätigt gekennzeichnet. Von mir nicht geprüft.
2. **Spanische Uhrzeiten**: „a las {time}“ (Öffnung, Einladung, Gruppennachricht) wäre bei 01:xx grammatisch falsch („a la 1:00“). Beim Öffnungsstatus und bei der Gerätezeit habe ich neutral umformuliert; sonst bräuchte es Code, der „la/las“ wählt. Relevant, falls CHUCCA nach Mitternacht öffnet oder Gäste so spät planen.
3. **Spanisch „Hora de cierre: {time}“** ist korrekt, aber nüchterner als „hasta las …“.
4. **Anrede**: Hero und Gruppenseite sprechen die Gruppe an (DE „euch/eure“, ES „vosotros“), Formulare und Bedienung den Einzelnen (DE „du“, ES „tú“). Auf der Gruppenseite mischt das bewusst („Leg fest, wann ihr euch trefft“). Bitte bestätigen, ob das gewünscht ist.
5. **Artikel**: Spanisch „la Playa de Palma“ im Fließtext, in Aufzählungen („Coctelería · Playa de Palma · Mallorca“) ohne Artikel; Seitentitel der Unterseiten behalten den Suchbegriff „CHUCCA Playa de Palma“.
6. **Beispielgetränke** (z. B. „Ananas & Mandel“ mit „Gruß an die Mandelblüte“): reine Beispiele, bleiben im Vorschau-Build; nicht von CHUCCA.
7. **Größenangaben „30 cl / 50 cl“** im Beispiel: sprachneutral gewählt, weil das Feld nicht übersetzt wird (vorher „0,3 l“, im Englischen mit falschem Dezimalkomma). Für den echten Betrieb entscheidet CHUCCA.
8. **„Preis an der Bar erfragen“** setzt voraus, dass Preise dort tatsächlich genannt werden. Im Zweifel auf „Preis nicht angegeben“ ändern.
9. **Footer-Aussagen** („keine Cookies, kein Tracking“, „Alkohol nur für Erwachsene“) habe ich fachlich nicht geprüft.
10. **Mallorquinische Begriffe** („Roba de llengües“, „Zungenstoffe“, „tela de lenguas“): Schreibung und Übersetzung von jemandem mit lokalem Wissen prüfen lassen.
11. **EN „Today“ statt „Tonight“**: bewusst für Konsistenz mit DE/ES. Wer das abendliche Gefühl bevorzugt, kann zurückändern.
12. **Alternativtexte** nicht mit echtem Screenreader (VoiceOver/TalkBack) gehört; ob Länge und Detailgrad angenehm sind, sollte jemand prüfen.
13. **Britisches Englisch** („fancy“, „agree a time“, „flavour“): von mir gewählt, nicht von Muttersprachlern gegengelesen.
14. **Ausnahmetage auf „Besuch“** (`visit.hours.exceptionsTitle`): DE „An diesen Tagen anders“, EN „Different on these days“, ES „Estos días es distinto“ sind nach dem Lektorat entstanden und von keinem Muttersprachler gelesen.

## Nachtrag visuelles Review 2 (12.11.2026) – ungeprüft

KI-Änderung, nicht muttersprachlich gegengelesen:

| Sprache | Schlüssel | vorher | nachher | Grund |
|---|---|---|---|---|
| EN | `drinks.taste.hint` | 'Pick a flavour. The menu shows matching drinks; at the bar it helps you order.' | 'Pick a flavour and the menu shows the drinks that match. It also helps you order at the bar.' | Semikolon-Satz brach auf Tablet in Waise „order.“ um; zwei klare Sätze |

Sonst keine neuen oder geänderten EN/ES-Texte. Beim Durchsehen der EN-Seiten (Heute, Drinks, Besuch, Gruppe, Galerie, 404) fielen keine weiteren Textmängel auf; die übrigen Punkte oben bleiben offen.
