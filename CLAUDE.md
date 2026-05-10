# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `nvm use` — Node 22 (`.nvmrc`)
- `npm run dev` — Astro dev server with HMR on `http://localhost:4321`
- `npm run build` — production build into `dist/`
- `npm run preview` — serve `dist/` locally
- `npm run check` — `astro check` (TypeScript + Content Collection schema validation)
- Deploy: Netlify auto-deploys on push (config in `netlify.toml`)

## Architecture

Static marketing/changelog site for ColorSnapper 2 (Mac app). Built with Astro v6.

### Routing

File-based via `src/pages/`. `trailingSlash: 'always'` + `format: 'directory'` in `astro.config.mjs` produce URLs like `/faq/` (not `/faq.html`). Public URLs preserved from the previous Metalsmith setup.

### Content Collection: changelog

`src/content/changelog/<version>.md` — 27 markdown files with `title` + `date` frontmatter, validated by the Zod schema in `src/content.config.ts`. The list page (`src/pages/changelog/index.astro`) calls `getCollection('changelog')` and sorts by date desc; the detail route (`src/pages/changelog/[...slug].astro`) renders one entry per URL.

The collection's `glob` loader uses a custom `generateId` that preserves filenames verbatim — without it, Astro's default slugifier strips dots so `1.6.0.md` would route to `/changelog/160/` instead of `/changelog/1.6.0/`.

### Layouts

- `BaseLayout.astro` — head + header + footer + `main.scss` import + `site.ts` script. Used by every non-home page.
- `PageLayout.astro` — wraps `BaseLayout` with the post-title heading structure used by static pages and changelog entries. Reads `title` from `Astro.props.frontmatter` (markdown callers) with a fallback to `Astro.props` (`.astro` callers like `shortcuts.astro`).
- `HomeLayout.astro` — like `BaseLayout` but does NOT render `<Header>` (the home page has its own hero/nav) and DOES load Paddle via `<script src="https://cdn.paddle.com/paddle/paddle.js">` plus a `Paddle.Setup({ vendor: ... })` inline call.

### Site config

`src/site.config.ts` exports a typed `site` object with title, description, Paddle vendor/product IDs, MAS product ID, and URL. None of these are secrets — they appear in HTML today.

### Styles

`src/styles/main.scss` is the single entry; it `@use`s 16 partials. Modern Dart Sass — uses `@use 'sass:color'`, `color.adjust`, `color.change`, and `#{}` for interpolation. The previous codebase used PostCSS+precss; do not bring back that syntax.

CSS image references point to `/img/_images/...` (assets moved from the original `_images/` to `public/img/_images/` during migration).

### `public/app/` is load-bearing

Sparkle appcast (`public/app/appcast.xml`) and `public/app/eula.pdf` are consumed by the installed Mac app. Don't rename or restructure.

### Vanilla JS interactivity

`src/scripts/site.ts` (~200 lines) handles video tour interactions and the home page's light/dark theme switch (swaps `dark`/`light` in image filenames). Imported once from layouts via `<script>import '../scripts/site.ts'</script>`. No framework. The file has `// @ts-nocheck` at the top — it's a verbatim port of vanilla JS DOM code.
