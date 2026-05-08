# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `nvm use` — pin Node to v8 (see `.nvmrc`). Newer Node will not run this stack (Webpack 1, Babel 6, Metalsmith 2).
- `npm start` — dev build via `node index.js` with file-watching, BrowserSync (`metalsmith-serve`), and `metalsmith-webpack-dev-server` with HMR on `http://localhost:8081`.
- `npm run build` — `NODE_ENV=production node index.js`. Switches the pipeline from `webpack-dev-server` to `metalsmith-webpack`, enables `ExtractTextPlugin`, and emits hashed filenames into `_site/`.
- `npm run clean` — `rm -rf _site/`.
- `npm test` — runs `npm run lint` then Jest. Single test: `npx jest _js/checkOSCompatibility.spec.js`.
- `npm run lint` / `npm run lint:js:fix` — ESLint via `eslint-config-okonet` over the whole repo.
- Pre-commit: `husky` runs `lint-staged` (prettier + eslint --fix on staged files). Don't bypass with `--no-verify`.
- Deploy: Netlify auto-deploys on push (no manual deploy command).

## Architecture

This is a marketing/changelog site for the ColorSnapper 2 Mac app. **Not** the app itself — the app payload (DMG) is hosted on S3 and linked from `_includes/buy-links.html`; license purchases go through Paddle.

The site is built by a single orchestration script — `index.js` — which composes a Metalsmith pipeline with an embedded Webpack build. Reading `index.js` end-to-end is the fastest way to understand what happens at build time.

### Pipeline (in order, defined in `index.js`)

1. Source: `./_pages` (configured in `config.js`). Output: `./_site`.
2. Inject metadata from `metadata.js` (site title, Paddle vendor/product IDs, MAS product ID, etc.) plus `config.js` (with `production` flag) so templates can read `{{ site.* }}` and `{{ config.* }}`.
3. `metalsmith-format-date-plugin.js` (local plugin) — adds `formattedDate` to any file with a `date` frontmatter field. Used by the changelog.
4. `metalsmith-collections` groups `changelog/**/*.md` into a `changelog` collection, sorted by `date` desc. `metalsmith-collections-addmeta` then forces every file in that collection to use `page.html`.
5. `metalsmith-markdownit` renders `.md` (HTML allowed, typographer + linkify enabled).
6. `metalsmith-permalinks` rewrites file paths to `:permalink` (frontmatter-driven).
7. `metalsmith-assets` copies `./img` and `./app` verbatim into `_site/`. The `./app` directory contains the Sparkle `appcast.xml`, EULA, and historical release notes consumed by the installed Mac app — **leave its filenames stable**.
8. **Webpack** (split path):
   - Dev: `metalsmith-webpack-dev-server` mounted at `http://localhost:8081` with HMR. Assets are loaded from that origin (see `webpack.config.js` `output.publicPath`).
   - Prod: `metalsmith-webpack` runs once. `ExtractTextPlugin` is enabled only when `NODE_ENV=production` and emits `[name].[hash].css`. The hash is exposed to templates via `webpackStats.hash` and consumed in `_includes/head.html`.
9. `metalsmith-in-place` runs Handlebars on `.html` page contents (so pages can use `{{> partial }}`), then `metalsmith-layouts` wraps each page in a layout from `_layouts/` (also Handlebars). Partials live in `_includes/`.

### Webpack entry / styling

- Single entry: `_js/index.js`. It imports every SCSS partial it needs at the top — there is no separate stylesheet entry. SCSS is loaded as `css!postcss?parser=postcss-scss` and processed by `precss`, `postcss-calc`, and `autoprefixer` (configured inline in `webpack.config.js`). There is no `node-sass`; precss handles the SCSS-ish syntax through PostCSS.
- Browserslist target: `last 2 version, ie >= 10` (defined in `webpack.config.js`, not in `package.json`).
- Babel uses `es2015` + `stage-1` (config under `package.json#babel`).

### Layouts

- `home.html` is the only layout that injects `paddle.js` and calls `Paddle.Setup({ vendor: site.paddle_vendor_id })`. Buy/trial buttons (`_includes/buy-links.html`) rely on this — they only function on pages using `home.html`.
- `default.html` and `page.html` are the generic layouts; `page.html` adds a title header.

### Domain notes

- `_js/checkOSCompatibility.js` parses the user-agent string to gate purchases against macOS version. The check is currently disabled in `_js/index.js` (commented out — see commit `a506683 Disable runtime check`) but the helper and its spec are still live; if you re-enable it, also re-enable the spec coverage.
- `metadata.js` contains the canonical IDs the site depends on (`paddle_product_id`, `paddle_vendor_id`, `mas_product_id`). Changing them affects checkout/affiliate links across the site.
