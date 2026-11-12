/** Ports der drei Testserver. Mit `PORT_BASE=5000` lassen sich parallele Läufe (z. B. mehrere Worktrees) trennen. */
const base = Number(process.env.PORT_BASE ?? 4331);
export const PORT = { preview: base, public: base + 1, sub: base + 2 };
export const ORIGIN = {
  preview: `http://127.0.0.1:${PORT.preview}`,
  public: `http://127.0.0.1:${PORT.public}`,
  sub: `http://127.0.0.1:${PORT.sub}`,
};
