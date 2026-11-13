# CHUCCA V4 — gemeinsame Arbeitsregeln

Gilt für alle Menschen und Agenten, die an diesem Repo arbeiten. `CLAUDE.md` ist nur ein Einstieg und wiederholt diese Regeln nicht.

## Start
Lies `README.md`, `docs/00_STATE.md` und `docs/05_PLAN.md`. Weitere Dokumente nur für die aktuelle Aufgabe laden. Jede Information hat genau einen führenden Ort (siehe README, Abschnitt „Dokumente“); andere Dateien verlinken darauf.

## Zusammenarbeit
- Ein integrierender Coding-Agent. Nur reale, tatsächlich ausgeführte Beiträge als Review ausweisen (siehe `docs/06_QA.md`, Abschnitt „Reviews“).
- Isolierter Arbeitsbranch/Worktree; bei paralleler Arbeit klare Dateizuständigkeit, Basis-SHA und Akzeptanz.
- Änderungen anderer erhalten. Keine destruktiven Resets, kein Force-Push.
- Widerspruch zwischen Dokument und Code in `docs/00_STATE.md` berichtigen, nicht still übergehen.
- Vor externen Aktionen (Push auf andere Branches, PR, Deployment, echte Anfragen an den Betrieb) vorhandene Autorisierung prüfen.

## Produkt
- Nur CHUCCA Playa de Palma. Keine Inhalte aus Hamburg oder Cala Ratjada übertragen.
- Fakten, Quellenangaben, Vorschläge und Unbekanntes unterscheiden: jede Angabe in `src/content/published/venue.json` trägt `status`. Öffentlich erscheint nur `confirmed`.
- Nichts erfinden: keine Preise, Öffnungszeiten, Termine, Bewertungen, Buchungsbestätigungen. Beispieldaten leben ausschließlich in `src/content/fixtures/` und erscheinen nur im Vorschau-Build, sichtbar gekennzeichnet.
- Ein Treffplan ist keine Reservierung. Kein Formular meldet Erfolg ohne echte Übergabe.
- DE/EN/ES, Tastatur, Safe Areas und reduzierte Bewegung gehören zum Kernumfang, nicht zur Kür.
- Interne Recherche und Rechtebelege (`src/content/media/catalogue.json`, `source`-Felder) verlassen den Build nie; öffentlich gilt die Feldliste `PUBLIC_MEDIA_FIELDS` in `src/lib/media.ts`.
- Keine Kunden- oder Zugangsdaten in Repo, URLs, Screenshots oder Logs.

## Technik
- Texte nur in `src/i18n/*.ts` (Deutsch definiert den Typ), Inhalte nur in `src/content/`, Logik ohne DOM in `src/lib/`, DOM-Skripte in `src/scripts/`.
- Browserskripte importieren kein Schema und keine Inhaltsdateien (sonst landen interne Felder im Bundle; `tests/e2e/public.spec.ts` prüft das).
- Links immer über `href()`/`withBase()` aus `src/lib/paths.ts` (Hosting im Unterpfad).
- Keine Abhängigkeit allein für einen visuellen Effekt. Gestaltung über Tokens in `src/styles/global.css`.

## Definition of Done pro Aufgabe
Verhalten umgesetzt · `npm run check` grün · sichtbare Änderungen im Browser bei 390 und 1440 px geprüft · Diff gelesen · echte Grenzen benannt · `docs/05_PLAN.md` und `docs/08_HANDOFF.md` aktualisiert.
Status: TODO / DOING / DONE / BLOCKED. DONE braucht Evidenz (Befehl, Test, Screenshot).
Zahlen und Aussagen in Dokumenten: Testzahlen führt `docs/06_QA.md`; wer sie anderswo nennt, nennt Datum und Lauf. Nur Gelaufenes gilt als geprüft, alles andere steht als NOT RUN oder „nicht geprüft“. `npm run docs:check` (Teil von `npm run check`) fängt tote Pfade, unbekannte npm-Skripte und Variablen ab, aber keine veralteten Zahlen: die prüft, wer sie ändert.
Ein bestandener Build ist keine Browserprüfung. Ein Commit ist kein Push. Ein Push ist kein Deployment. Emulation ist kein Gerätetest.
