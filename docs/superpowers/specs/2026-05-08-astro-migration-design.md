# Astro v6 migration — design

**Date:** 2026-05-08
**Scope:** Replace the Metalsmith + Webpack 1 build with Astro v6. Drop dead code (UA, Twitter widget, OS-compat check). Translate the precss-based stylesheets to modern Dart Sass. Preserve every public URL, every piece of page copy, and the visual design. **Visual redesign is explicitly out of scope** and will be planned separately.

## Goals

- Move off a build stack that no longer installs cleanly on modern Node (Webpack 1, Babel 6, Metalsmith 2 — pinned to Node 8 via `.nvmrc`).
- Preserve every public URL: `/`, `/about/`, `/faq/`, `/imprint/`, `/privacy/`, `/digitalychee/`, `/shortcuts/`, `/changelog/`, `/changelog/<version>/`, `/app/appcast.xml`, `/app/eula.pdf`, `/img/*`.
- Preserve the visual design pixel-equivalent (no intentional layout/typography changes).
- Use Astro Content Collections for the changelog.
- Translate `_sass/` from PostCSS+precss to modern Dart Sass.
- Drop unused/dead code: GA Universal Analytics, Twitter follow button, `checkOSCompatibility`, `webpackStats.hash` references, husky/lint-staged, wallaby, Travis.

## Non-goals

- Visual or UX redesign.
- Image optimization via Astro's `<Image>` component (keep images in `public/`, URLs unchanged).
- Adding new analytics. The site goes live with no tracking. (Netlify dashboard remains the only traffic signal.)
- TypeScript-strict refactor. TS is on (Astro default) but `src/scripts/site.ts` is a near-verbatim port of the existing JS, not a rewrite.
- Adding a CSS framework (Tailwind etc.).
- Changing the deployment target. Netlify continues to auto-deploy on push.

## Decisions (locked during brainstorming)

| Decision | Choice |
|---|---|
| Astro version | v6 (latest) |
| Node version | 22 LTS (`.nvmrc` → `22`) |
| Package manager | npm |
| Analytics | None |
| CSS | Modern Dart Sass (`@use`, `color.adjust`, `color.change`) |
| TypeScript | On (Astro default) |
| Migration strategy | Greenfield-in-place on a feature branch; old build files deleted in same diff |

## Target source layout

```
src/
  content.config.ts                ← Zod schema for changelog collection
  site.config.ts                   ← site metadata (Paddle IDs, MAS ID, urls)
  components/
    Head.astro                     ← was _includes/head.html
    Header.astro                   ← was _includes/header.html
    Footer.astro                   ← was _includes/footer.html
    Navigation.astro               ← was _includes/navigation.html
    BuyLinks.astro                 ← was _includes/buy-links.html
    PlayButton.astro               ← was _includes/playButton.html
  layouts/
    BaseLayout.astro               ← was _layouts/default.html (head + header + footer + main.scss + site.ts)
    PageLayout.astro               ← was _layouts/page.html (BaseLayout + post-title wrapper)
    HomeLayout.astro               ← was _layouts/home.html (BaseLayout + Paddle script)
  pages/
    index.astro                    ← was _pages/index.html
    about.md
    faq.md
    imprint.md
    privacy.md
    digitalychee.md
    shortcuts.astro                ← stays HTML (uses raw markup, not markdown)
    changelog/
      index.astro                  ← lists collection sorted by date desc
      [...slug].astro              ← per-version page via getStaticPaths
  content/
    changelog/
      1.0.0.md … 1.6.0.md          ← moved from _pages/changelog/
  styles/
    main.scss                      ← entry; @uses every partial
    _vars.scss, _base.scss, _layout.scss, _home.scss, _buy.scss,
    _tour.scss, _switch.scss, _format.scss, _howto.scss, _timeline.scss,
    _nav.scss, _playButton.scss, _features.scss, _shortcuts.scss,
    _footer.scss, _header.scss, changelog.scss
  scripts/
    site.ts                        ← was _js/index.js
public/
  img/                             ← was ./img
  app/                             ← was ./app (Sparkle appcast — DO NOT rename files inside)
  CNAME
  favicon.png
astro.config.mjs
package.json
tsconfig.json
.nvmrc                             ← 22
netlify.toml                       ← new
README.md                          ← rewritten
CLAUDE.md                          ← rewritten for Astro stack
```

**Files deleted on the branch:** `index.js`, `webpack.config.js`, `metalsmith-format-date-plugin.js`, `config.js`, `metadata.js`, `wallaby.config.js`, `.travis.yml`, `package-lock.json` (regenerated), `_pages/`, `_includes/`, `_layouts/`, `_js/`, `_sass/`, `_images/`, `_site/`. Also delete `index.html` if any leftover at root.

## Astro configuration

`astro.config.mjs`:

```javascript
import { defineConfig } from 'astro';

export default defineConfig({
  site: 'https://colorsnapper.com',
  trailingSlash: 'always',
  build: {
    format: 'directory',  // /faq/index.html so /faq/ resolves directly
  },
});
```

Rationale: `trailingSlash: 'always'` + `format: 'directory'` produces the same URL shape Metalsmith currently emits (`/faq/`, not `/faq.html`), so external links and search engine indexes stay intact.

## Content Collection

`src/content.config.ts`:

```typescript
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const changelog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/changelog' }),
  schema: z.object({
    title: z.string(),         // e.g. "1.6.0"
    date: z.coerce.date(),
  }),
});

export const collections = { changelog };
```

**Routing for the changelog:**

- `src/pages/changelog/index.astro` — calls `getCollection('changelog')`, sorts by `data.date` desc, renders the list (mirrors what `_pages/changelog/index.html` does today).
- `src/pages/changelog/[...slug].astro` — `getStaticPaths()` returns one entry per item; the route uses `entry.id` (which is the version, e.g. `1.6.0`) so URLs are `/changelog/1.6.0/`. Renders the entry's HTML inside `PageLayout`.

The `formattedDate` field that the local `metalsmith-format-date-plugin.js` adds today becomes a one-line helper in the Astro template:

```astro
{date.toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' })}
```

## Site metadata

`src/site.config.ts`:

```typescript
export const site = {
  title: 'ColorSnapper',
  description: 'The color picker for Mac that makes it easy to <em>inspect</em>, <em>adjust</em>, <em>organize</em>, and <em>export</em> precise color values of <em>any pixel</em> on the screen.',
  keywords: '...',  // copied verbatim from metadata.js
  email: 'support@koolesache.com',
  twitterUsername: 'colorsnapper',
  masProductId: '969418666',
  paddleProductId: '499167',
  paddleVendorId: 9922,
  url: 'https://colorsnapper.com',
} as const;
```

`Head.astro`, `BuyLinks.astro`, and `HomeLayout.astro` import from this. None of these values are secret, so no env vars.

## Sass migration

The current `_sass/*.scss` files use PostCSS+precss syntax that Dart Sass does not understand. Translation table:

| Current (precss) | Modern Sass |
|---|---|
| `color($x l(-15%))` | `color.adjust($x, $lightness: -15%)` |
| `color($x l(15%))` | `color.adjust($x, $lightness: 15%)` |
| `color($x a(.85))` | `color.change($x, $alpha: 0.85)` |
| `color($x a(.25))` | `color.change($x, $alpha: 0.25)` |
| `@define-mixin foo $arg { ... }` | `@mixin foo($arg) { ... }` |
| `@(device)` (interpolation) | `#{$device}` |
| `@import './_vars.scss'` | `@use './vars' as *` (or namespaced if there are name clashes) |

`calc($x / 2)` already uses CSS `calc()` and is fine; no change required (Sass does not pre-evaluate CSS `calc`).

Approach: translate `_vars.scss` first (it's the dependency), confirm it compiles, then translate the rest in any order. Dart Sass's compiler is strict — if anything still uses precss-only syntax, the build fails loudly. Browserslist target updates to Astro/Vite defaults (drops `ie >= 10`).

`_sass/main.scss` becomes `src/styles/main.scss` and uses `@use` for every partial. `BaseLayout.astro` imports it once via `import '../styles/main.scss';` so it appears on every page (matching today's behavior of one bundled stylesheet).

## JS migration

`_js/index.js` (~230 lines) ports to `src/scripts/site.ts` with these substantive changes only:

- Delete `initGA()` and its call site (no analytics).
- Delete the import + reference to `checkOSCompatibility` (already commented out).
- Type annotations only where they fall out naturally; the rest stays plain JS-in-`.ts`.

Loaded once from `BaseLayout.astro`:

```astro
<script>
  import '../scripts/site.ts';
</script>
```

Astro bundles and hashes automatically — no manual `webpackStats.hash` plumbing.

## Page-by-page migration

| Source | Destination | Notes |
|---|---|---|
| `_pages/index.html` | `src/pages/index.astro` | Frontmatter `layout: home.html` → uses `HomeLayout`. Handlebars `{{> partial }}` → component imports. `{{{ site.description }}}` → `<Fragment set:html={site.description} />`. |
| `_pages/about.md` | `src/pages/about.md` | `layout: page.html` → frontmatter `layout: ../layouts/PageLayout.astro`. Drop `permalink:` (file path = URL). |
| `_pages/faq.md` | `src/pages/faq.md` | Same pattern. |
| `_pages/imprint.md` | `src/pages/imprint.md` | Same. |
| `_pages/privacy.md` | `src/pages/privacy.md` | Same. |
| `_pages/digitalychee.md` | `src/pages/digitalychee.md` | Same. URL stays `/digitalychee/`. |
| `_pages/shortcuts.html` | `src/pages/shortcuts.astro` | Wraps the existing markup in `PageLayout`; not converted to markdown because it relies on raw `<dl>`/`<dt>`/`<dd>` structure. |
| `_pages/changelog/*.md` | `src/content/changelog/*.md` | Frontmatter (`title`, `date`) unchanged; loaded via collection. |
| `_pages/changelog/index.html` | `src/pages/changelog/index.astro` | Rewritten to use `getCollection('changelog')`. |

## Hygiene cleanup (final list)

**Delete:**
- GA UA snippet from footer.
- Twitter follow button + `widgets.js` from navigation.
- `easypattern` dep + `_js/checkOSCompatibility.{js,spec.js}`.
- `webpackStats.hash` references in head/footer (no longer needed).
- `husky`, `lint-staged` (no pre-commit hooks; small site, can be re-added later if desired).
- `wallaby.config.js`, `.travis.yml`.
- `_images/` directory — **only after** auditing every CSS reference (e.g. `_buy.scss` uses `../_images/mas.svg`) and either confirming the asset exists in `img/` or copying it. See Risks section.

**Audit during implementation (don't pre-delete):**
- `slug:` frontmatter field on some pages (e.g. `_pages/faq.md` has `slug: F.A.Q.`). I did not find any template using it; if grep confirms zero references, drop the field from the migrated frontmatter. If it is used anywhere, preserve it.

**Keep verbatim:**
- All page copy.
- All images and videos (move from `img/` to `public/img/`).
- All Sparkle/release-notes assets in `app/` (move to `public/app/`).
- `CNAME`, `.editorconfig`, `.prettierrc.json`.

**Update:**
- `.nvmrc` → `22`.
- `package.json` → fresh, Astro deps only.
- `README.md` → minimal install/dev/build/deploy section.
- `CLAUDE.md` → rewritten for Astro stack.

## Deploy

`netlify.toml` (new):

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "22"
```

Netlify continues to auto-deploy on every push. No dashboard changes required.

## Verification plan (before merging the branch)

1. `npm install` succeeds on Node 22.
2. `npm run build` succeeds with zero warnings about deprecated Sass APIs.
3. `npm run preview` and visit every URL listed in Goals; visual inspection vs production deploy.
4. `curl http://localhost:4321/app/appcast.xml` returns the same XML production currently serves.
5. Open home page: video tour interactions work (play/pause/hover progress arcs), theme switch swaps `dark`/`light` images, Paddle button opens checkout.
6. Run `astro check` — passes.
7. Lighthouse on a Netlify preview deploy: scores no worse than current production.

## Risks

- **Sass translation completeness.** If any partial uses precss syntax not in the translation table above, Dart Sass fails the build. Mitigation: build is the regression test; iterate.
- **Paddle SDK compatibility.** `_includes/buy-links.html` uses `data-product` + `paddle.js` from `cdn.paddle.com/paddle/paddle.js`. If Paddle has migrated to Paddle Billing v4 with a different SDK call shape, the button may not open checkout. Mitigation: live-test the trial button on a preview deploy; if broken, port to current Paddle SDK in this branch.
- **`/digitalychee/` page contents.** This is a one-off promo page; if it has unusual frontmatter (e.g. references metadata not in the new `site.config.ts`), the build will catch it. Treat as a regular markdown page; resolve any specifics during implementation.
- **`_images/` vs `img/` duplication.** Some SCSS files (e.g. `_buy.scss`) reference `../_images/mas.svg`. Need to confirm these assets exist in `img/` (or copy them) before deleting `_images/`. The migration must update those CSS URLs to point to the final `public/img/` location.

## Open questions

None blocking. Implementation will surface any remaining specifics (digitalychee frontmatter, `_images/` references in CSS, Paddle SDK version).
