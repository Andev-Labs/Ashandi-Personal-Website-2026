# Ashandi Leonadi — personal website

Static portfolio built from the [Syrofolio](https://github.com/daniasyrofi/syrofolio) template by Dani Asyrofi, used under the Syrofolio Source-Available License 1.0 (see `LICENSE` and `/credits`).

## Develop

Requires Node.js 22+.

```sh
npm ci
npm run dev        # http://127.0.0.1:4310 (override with PORT=...)
```

Edit content in `content/site.json`. Template docs: `docs/customization.md`, `docs/deployment.md`.

## Verify and build

```sh
npm run check
npm test
npm run build      # outputs dist/
```
