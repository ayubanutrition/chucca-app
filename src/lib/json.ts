/** JSON für <script type="application/json">: „<“ wird maskiert, damit kein Inhalt das Skript-Element schließen kann. */
export const safeJson = (value: unknown): string => JSON.stringify(value).replace(/</g, '\\u003c');
