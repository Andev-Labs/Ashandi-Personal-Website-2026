# Contributing

Use Node 22 or newer, run `npm ci`, then `npm run dev`.

Keep changes focused. Content belongs in `content/site.json`; structure belongs
in `src/index.html`; runtime modules and styles belong in `public/assets/`.
Generated files in `dist/` are not committed.

Before a pull request, run `npm run check`, `npm test`, and, for interaction
changes, `npx playwright install chromium` followed by `npm run test:browser`.
Read [the motion guidelines](docs/motion-guidelines.md) before changing motion.
Include mobile and desktop screenshots when the appearance changes.

Preserve third-party names and license notices. By submitting a contribution,
you agree that your contribution can be distributed under this repository's
[license](LICENSE). Do not contribute material you cannot license on that basis.
