# Astro v6 Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Metalsmith + Webpack 1 build with Astro v6 while preserving every public URL and the visual design pixel-equivalent. Drop dead code (UA, Twitter widget, OS-compat check). Translate the precss-based stylesheets to modern Dart Sass.

**Architecture:** Greenfield-in-place on the `astro-migration` branch. Old build files are deleted in Task 1. Static markdown pages map 1:1 to `src/pages/*.md`. The home page becomes an `.astro` page using a `HomeLayout` that loads the Paddle script. The 28 changelog markdown files become a Content Collection with a Zod schema, rendered via `getStaticPaths()` for `/changelog/<version>/` URLs and listed on `/changelog/`.

**Tech Stack:** Astro v6, Node 22 LTS, npm, Dart Sass, TypeScript (Astro default), Netlify (static hosting).

**Note on testing:** This is a static marketing site with no test infrastructure. Verification at each task is: (a) `npm run build` succeeds, (b) `npm run check` (astro check) passes, and (c) `npm run preview` followed by visiting affected URLs. There is no unit-test layer to add or maintain — that would be invented complexity for a 6-page brochure site.

**Spec reference:** `docs/superpowers/specs/2026-05-08-astro-migration-design.md`

---

## File structure (target)

```
src/
  content.config.ts
  site.config.ts
  components/
    Head.astro, Header.astro, Footer.astro, Navigation.astro,
    BuyLinks.astro, PlayButton.astro
  layouts/
    BaseLayout.astro, PageLayout.astro, HomeLayout.astro
  pages/
    index.astro, about.md, faq.md, imprint.md, privacy.md,
    digitalychee.md, shortcuts.astro,
    changelog/index.astro, changelog/[...slug].astro
  content/
    changelog/<version>.md   (28 files moved from _pages/changelog/)
  styles/
    main.scss + 18 translated partials
  scripts/
    site.ts
public/
  img/, app/, CNAME, favicon.png
astro.config.mjs, package.json, tsconfig.json
.nvmrc, netlify.toml, README.md, CLAUDE.md
```

---

## Task 1: Tear down the old build

**Files:**
- Delete: `index.js`, `webpack.config.js`, `metalsmith-format-date-plugin.js`, `config.js`, `metadata.js`, `wallaby.config.js`, `.travis.yml`, `package-lock.json`, `package.json`
- Delete: `_pages/`, `_includes/`, `_layouts/`, `_js/`, `_sass/`, `_site/`
- Keep (will move later): `img/`, `app/`, `_images/`, `CNAME`

**Why first:** The current `package.json` won't `npm install` cleanly on Node 22 (Webpack 1 / Babel 6 era deps). We need a clean slate before scaffolding Astro.

- [ ] **Step 1: Confirm we're on the migration branch**

```bash
git branch --show-current
```

Expected output: `astro-migration`. If not, `git checkout astro-migration`.

- [ ] **Step 1a: Capture the pre-deletion commit ref**

Later tasks recover original files via `git show`. Save the current HEAD now so subsequent tasks don't have to count commits.

```bash
git rev-parse HEAD > /tmp/PRE_ASTRO_REF
cat /tmp/PRE_ASTRO_REF
```

Expected: a 40-character SHA prints. Subsequent tasks reference it as `$(cat /tmp/PRE_ASTRO_REF)`.

- [ ] **Step 2: Delete the old build entry points and configs**

```bash
rm -f index.js webpack.config.js metalsmith-format-date-plugin.js config.js metadata.js wallaby.config.js .travis.yml package-lock.json package.json
```

- [ ] **Step 3: Delete the old source directories**

```bash
rm -rf _pages _includes _layouts _js _sass _site
```

`_images/`, `img/`, `app/`, and `CNAME` stay for now — they move to `public/` in Task 3.

- [ ] **Step 4: Update `.nvmrc` to Node 22**

```bash
echo "22" > .nvmrc
```

- [ ] **Step 5: Verify the working tree is clean of old code**

```bash
ls
```

Expected: `CLAUDE.md`, `CNAME`, `_images/`, `app/`, `docs/`, `img/`, `.nvmrc`, `.editorconfig`, `.gitattributes`, `.gitignore`, `.idea/`, `.prettierrc.json`, `README.md`. No `index.js`, no `_pages/`, no `package.json`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Remove Metalsmith/Webpack build before Astro scaffolding

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Bootstrap Astro v6

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `src/env.d.ts`

- [ ] **Step 1: Activate Node 22**

```bash
nvm install 22 && nvm use
node -v
```

Expected: `v22.x.x`.

- [ ] **Step 2: Create minimal `package.json`**

Create `package.json`:

```json
{
  "name": "colorsnapper.com",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check"
  }
}
```

- [ ] **Step 3: Install Astro v6 + Sass + TypeScript tooling**

```bash
npm install astro@^6 sass
npm install --save-dev @astrojs/check typescript
```

Expected: `astro` resolves to a 6.x version. `npm ls astro` confirms.

- [ ] **Step 4: Create `astro.config.mjs`**

```javascript
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://colorsnapper.com',
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
});
```

- [ ] **Step 5: Create `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"]
}
```

- [ ] **Step 6: Create `src/env.d.ts`**

```typescript
/// <reference path="../.astro/types.d.ts" />
```

- [ ] **Step 7: Update `.gitignore`**

Open `.gitignore` and ensure these lines are present (add if missing):

```
node_modules/
dist/
.astro/
.DS_Store
```

- [ ] **Step 8: Verify Astro builds an empty site**

```bash
mkdir -p src/pages
cat > src/pages/index.astro <<'EOF'
---
---
<html><body>placeholder</body></html>
EOF
npm run build
```

Expected: build succeeds, writes `dist/index.html`.

- [ ] **Step 9: Remove the placeholder**

```bash
rm src/pages/index.astro
```

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "Bootstrap Astro v6 with TypeScript and Sass

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Move public assets

**Files:**
- Move: `img/` → `public/img/`
- Move: `app/` → `public/app/`
- Move: `CNAME` → `public/CNAME`
- Move: `_images/*` → `public/img/_images/` (kept under `_images` subfolder to avoid renames in CSS — see step 4)

**Why this approach for `_images/`:** The 18 SCSS partials reference `../_images/foo.svg` from many files. Putting the assets at `/img/_images/foo.svg` means we only have to change the CSS prefix once (`../_images/` → `/img/_images/`) without renaming individual files or worrying about collisions.

- [ ] **Step 1: Create the public directory and move static assets**

```bash
mkdir -p public
mv img public/img
mv app public/app
mv CNAME public/CNAME
```

- [ ] **Step 2: Move `_images/` under `public/img/_images/`**

```bash
mv _images public/img/_images
```

- [ ] **Step 3: Confirm there are no remaining root-level asset folders**

```bash
ls -d img app _images CNAME 2>/dev/null
```

Expected: nothing prints (all moved).

- [ ] **Step 4: Verify the build copies them through**

```bash
mkdir -p src/pages && cat > src/pages/index.astro <<'EOF'
---
---
<html><body>placeholder</body></html>
EOF
npm run build
ls dist/img/digitalychee.png dist/app/appcast.xml dist/CNAME dist/img/_images/mas.svg
```

Expected: all four paths resolve. `digitalychee.png`, `appcast.xml`, `CNAME`, and `mas.svg` exist in the build output.

- [ ] **Step 5: Remove the placeholder**

```bash
rm src/pages/index.astro
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Move static assets under public/

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Site config

**Files:**
- Create: `src/site.config.ts`

- [ ] **Step 1: Create `src/site.config.ts`**

This replaces the old `metadata.js` + `config.js`. Values copied verbatim from those files.

```typescript
export const site = {
  title: 'ColorSnapper',
  description:
    'The color picker for Mac that makes it easy to <em>inspect</em>, <em>adjust</em>, <em>organize</em>, and <em>export</em> precise color values of <em>any pixel</em> on the screen.',
  keywords:
    'color picker mac, color picker, colorpicker, color, picker, mac, color value, application, app, osx, apple, pick retina pixel mac, HiDPI pixel, adjust, export, favorite, favourite, manage, retina, HiDPI, precision, gesture, shortcut, css, cocoa, rgb, hsl, hex, swift, uicolor, .NET, colour, pixel, web, screen, photoshop, illustrator, bgcolor, fgcolor, background, foreground',
  email: 'support@koolesache.com',
  twitterUsername: 'colorsnapper',
  masProductId: '969418666',
  paddleProductId: '499167',
  paddleVendorId: 9922,
  url: 'https://colorsnapper.com',
} as const;
```

- [ ] **Step 2: Commit**

```bash
git add src/site.config.ts
git commit -m "Add site config (replaces metadata.js/config.js)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Components — Head, Header, Footer, Navigation, PlayButton, BuyLinks

**Files:**
- Create: `src/components/Head.astro`
- Create: `src/components/Header.astro`
- Create: `src/components/Navigation.astro`
- Create: `src/components/Footer.astro`
- Create: `src/components/PlayButton.astro`
- Create: `src/components/BuyLinks.astro`

**Notes:** Twitter follow button and GA UA snippet are **deleted** (not ported). The `webpackStats.hash` references in head/footer become unnecessary — Astro auto-loads the bundled stylesheet via the `<style>` import in `BaseLayout` (Task 6).

- [ ] **Step 1: Create `src/components/Head.astro`**

```astro
---
import { site } from '../site.config';

interface Props {
  title: string;
  pageUrl: string;
}

const { title, pageUrl } = Astro.props;
---
<head>
  <meta charset="utf-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />

  <title>{site.title} &mdash; {title}</title>
  <meta name="description" content={site.description} />
  <meta name="keywords" content={site.keywords} />
  <meta name="google-site-verification" content="frv_pvwjkYtqV8pv5hktqoSVzmCqDiSiuIQgbZwn_s8" />

  <link rel="shortcut icon" href="/img/favicon.png" type="image/x-icon" />
  <link rel="canonical" href={`${site.url}${pageUrl}`} />

  <link href="https://fonts.googleapis.com/css?family=Lato:100,300,700,300italic" rel="stylesheet" type="text/css" />
</head>
```

Note: the description contains HTML (`<em>`) — Astro's expression escaping is fine here because the `meta` `content=` attribute renders literal text. The `<em>` tags will appear in the description as-is, matching the current site's behavior.

- [ ] **Step 2: Create `src/components/Navigation.astro`**

(Twitter button removed; mailto support link kept.)

```astro
<div class="nav__links">
  <a href="/changelog/" title="Changelog" class="nav__link">What's New</a>
  <a href="/shortcuts/" title="Keyboard Shortcuts" class="nav__link">Shortcuts</a>
  <a href="/faq/" title="Frequently Asked Questions" class="nav__link">F.A.Q.</a>
</div>
<div class="nav__social">
  <a href="mailto:support@koolesache.com" title="Contact support" class="nav__link">Contact support</a>
</div>
```

- [ ] **Step 3: Create `src/components/Header.astro`**

```astro
---
import { site } from '../site.config';
import Navigation from './Navigation.astro';
---
<header class="header">
  <div class="wrapper">
    <nav class="nav nav_top">
      <div class="nav__home">
        <a href="/" title="ColorSnapper 2 Home Page" class="nav__logo">{site.title}</a>
      </div>
      <Navigation />
    </nav>
  </div>
</header>
```

- [ ] **Step 4: Create `src/components/Footer.astro`**

(GA UA snippet and `webpackStats.hash` script tag are deleted.)

```astro
---
import Navigation from './Navigation.astro';
---
<footer class="footer">
  <div class="wrapper footer__wrapper">
    <div class="footer__links">
      <nav class="nav nav_footer">
        <Navigation />
      </nav>
      <nav class="nav nav_secondary">
        <a href="/imprint/" title="Imprint">Imprint</a>
        <a href="/privacy/" title="Privacy Policy">Privacy Policy</a>
        <a href="/app/eula.pdf" title="End User License Agreement">EULA</a>
      </nav>
    </div>
    <p>Made with <span class="footer__heart">❤</span> in Vienna, Austria</p>
    <p class="footer__copyright">&copy; Koole Sache, 2016&mdash;2019.</p>
  </div>
</footer>
```

- [ ] **Step 5: Create `src/components/PlayButton.astro`**

This is the inner SVG fragment that the home page wraps in its own `<svg>` elements (with per-instance `data-video` attributes). No props — just shared markup.

Create `src/components/PlayButton.astro`:

```astro
<g transform="translate(50, 50)">
  <circle r="40" cx="0" cy="0" stroke="none" class="playButton__bg"></circle>
  <path class="playButton__play" d="M-15,-20 L25,0 L-15,20" fill="#fff"></path>
  <g class="playButton__pause">
    <rect width="10" height="40" x="-15" y="-20"></rect>
    <rect width="10" height="40" x="5" y="-20"></rect>
  </g>
  <g class="playButton__load">
    <path transform="translate(-20,-26)" d="M18,9.05 L18,16 L29,8 L18,0 L18,7.05 C7.975,7.574 0,15.844 0,26 C0,31.247 2.126,35.997 5.565,39.435 L6.979,38.021 C3.903,34.944 2,30.694 2,26 C2,16.949 9.08,9.571 18,9.05 C18,9.05 9.08,9.571 18,9.05 L18,9.05 L18,9.05 Z M32.435,12.565 L31.021,13.979 C34.097,17.056 36,21.306 36,26 C36,35.051 28.92,42.429 20,42.95 L20,36 L9,44 L20,52 L20,44.95 C30.026,44.426 38,36.156 38,26 C38,20.753 35.873,16.003 32.435,12.565 L32.435,12.565 Z"></path>
  </g>
  <circle class="playButton__progress playButton__progress_buffer" r="45" cx="0" cy="0"></circle>
  <circle class="playButton__progress playButton__progress_time" r="45" cx="0" cy="0"></circle>
</g>
```

- [ ] **Step 6: Create `src/components/BuyLinks.astro`**

```astro
---
import { site } from '../site.config';
---
<section class="buy">
  <div class="wrapper">
    <a
      class="buy__btn buy__btn_download buy-download"
      href="https://s3.amazonaws.com/cs2-binaries/ColorSnapper2.dmg"
      >Try ColorSnapper For Free</a
    >

    <p>
      or
      <a
        class="buy__trial buy-paddle paddle_button"
        href="#"
        data-product={site.paddleProductId}
        data-theme="none"
        data-allow-quantity="true"
      >
        purchase a license
      </a>
    </p>

    <p class="buy__req">Works on all macOS version starting 10.11</p>
  </div>
</section>
```

- [ ] **Step 7: Verify TypeScript types are happy**

```bash
npm run check
```

Expected: 0 errors. Astro check may report missing `astro:content` types until Task 10 — that's fine; only fail on actual TS errors in `src/components/`.

- [ ] **Step 8: Commit**

```bash
git add src/components/ src/site.config.ts
git commit -m "Add Head/Header/Footer/Navigation/BuyLinks/PlayButton components

Drops Twitter follow button and GA UA snippet (dead).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Layouts — BaseLayout, PageLayout, HomeLayout

**Files:**
- Create: `src/layouts/BaseLayout.astro`
- Create: `src/layouts/PageLayout.astro`
- Create: `src/layouts/HomeLayout.astro`

**Notes:** `BaseLayout` is the common skeleton (head + header + footer + main stylesheet + site script). `PageLayout` wraps content in the `.post` heading structure. `HomeLayout` is `BaseLayout` plus the Paddle script (only home loads Paddle).

The stylesheet at `src/styles/main.scss` is imported by `BaseLayout` so it appears on every page. It's created and populated in Task 7.

- [ ] **Step 1: Create `src/layouts/BaseLayout.astro`**

```astro
---
import Head from '../components/Head.astro';
import Header from '../components/Header.astro';
import Footer from '../components/Footer.astro';
import '../styles/main.scss';

interface Props {
  title: string;
}

const { title } = Astro.props;
const pageUrl = Astro.url.pathname;
---
<!DOCTYPE html>
<html>
  <Head title={title} pageUrl={pageUrl} />
  <body>
    <Header />
    <div class="page-content">
      <slot />
    </div>
    <Footer />
    <script>
      import '../scripts/site.ts';
    </script>
  </body>
</html>
```

- [ ] **Step 2: Create `src/layouts/PageLayout.astro`**

```astro
---
import BaseLayout from './BaseLayout.astro';

interface Props {
  title: string;
}

const { title } = Astro.props;
---
<BaseLayout title={title}>
  <div class="post">
    <header class="header">
      <div class="wrapper">
        <h1 class="post-title">{title}</h1>
      </div>
    </header>
    <article class="post-content">
      <div class="wrapper">
        <slot />
      </div>
    </article>
  </div>
</BaseLayout>
```

- [ ] **Step 3: Create `src/layouts/HomeLayout.astro`**

The home layout differs from `BaseLayout` in that it does NOT include the `<Header>` component — the home page renders its own custom hero with navigation embedded. It DOES need to load Paddle.

```astro
---
import Head from '../components/Head.astro';
import Footer from '../components/Footer.astro';
import { site } from '../site.config';
import '../styles/main.scss';

interface Props {
  title: string;
}

const { title } = Astro.props;
const pageUrl = Astro.url.pathname;
---
<!DOCTYPE html>
<html>
  <Head title={title} pageUrl={pageUrl} />
  <body>
    <slot />
    <Footer />
    <script src="https://cdn.paddle.com/paddle/paddle.js" is:inline></script>
    <script is:inline define:vars={{ vendorId: site.paddleVendorId }}>
      Paddle.Setup({ vendor: vendorId });
    </script>
    <script>
      import '../scripts/site.ts';
    </script>
  </body>
</html>
```

- [ ] **Step 4: Commit**

```bash
git add src/layouts/
git commit -m "Add BaseLayout, PageLayout, HomeLayout

HomeLayout loads Paddle SDK; BaseLayout includes the main stylesheet
and site.ts. webpackStats.hash plumbing is gone — Astro hashes assets
automatically.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Sass migration

**Files:**
- Create: `src/styles/main.scss`
- Create: `src/styles/_vars.scss`, `_base.scss`, `_layout.scss`, `_home.scss`, `_buy.scss`, `_tour.scss`, `_switch.scss`, `_format.scss`, `_howto.scss`, `_timeline.scss`, `_nav.scss`, `_playButton.scss`, `_features.scss`, `_shortcuts.scss`, `_footer.scss`, `_header.scss`, `changelog.scss`

**Translation rules** (from spec §"Sass migration"):

| Current (precss) | Modern Sass |
|---|---|
| `color($x l(N%))` | `color.adjust($x, $lightness: N%)` |
| `color($x a(.N))` | `color.change($x, $alpha: 0.N)` |
| `@define-mixin foo $arg { ... }` | `@mixin foo($arg) { ... }` |
| `@(device)` (interp) | `#{$device}` |
| `&_$(format)` (selector interp) | `&_#{$format}` |
| `$(i)` in `content`/`calc` | `#{$i}` |
| `@import './_vars.scss'` | `@use 'vars' as *` |
| `../_images/foo.png` | `/img/_images/foo.png` |

`@use` requires importing the Sass color module **once** at the top of files that use color functions:

```scss
@use 'sass:color';
@use 'vars' as *;
```

Then `color.adjust(...)` and `color.change(...)` are namespaced.

**Source for translations:** Copy each old partial using the ref captured in Task 1:

```bash
git show $(cat /tmp/PRE_ASTRO_REF):_sass/_vars.scss
```

- [ ] **Step 1: Create the styles directory**

```bash
mkdir -p src/styles
```

- [ ] **Step 2: Translate `_vars.scss` first (it's the dependency)**

Create `src/styles/_vars.scss`:

```scss
@use 'sass:color';

$base-font-family: -apple-system, Roboto, BlinkMacSystemFont, "Helvetica Neue", "Segoe UI", Oxygen, Ubuntu, Cantarell, "Open Sans", sans-serif;
$second-font-family: Lato, Helvetica, Arial, sans-serif;
$base-font-size: 14px;
$small-font-size: $base-font-size * 0.875;
$base-line-height: 1.7;

$spacing-unit: 30px;
$switch-border-radius: 5px;

$text-color: #2f2f2f;
$background-color: #fff;
$brand-color: #2a7ae2;
$nav-color: color.change($text-color, $alpha: 0.85);

$grey-color: #828282;
$grey-color-light: color.adjust($grey-color, $lightness: 40%);
$grey-color-dark: color.adjust($grey-color, $lightness: -25%);

$content-width: 960px;

$on-palm: 600px;
$on-laptop: 800px;

@mixin media-query($device) {
  @media screen and (max-width: $device) {
    @content;
  }
}
```

- [ ] **Step 3: Create `src/styles/main.scss`**

```scss
@use 'vars';
@use 'base';
@use 'layout';
@use 'home';
@use 'buy';
@use 'tour';
@use 'switch';
@use 'format';
@use 'howto';
@use 'timeline';
@use 'nav';
@use 'playButton';
@use 'features';
@use 'shortcuts';
@use 'footer';
@use 'header';
@use 'changelog';
```

Note: `_format.scss` becomes `format`, `_buy.scss` becomes `buy`, etc. Sass `@use` strips the leading underscore and the extension.

- [ ] **Step 4: Translate the remaining 16 partials**

For each of `_base.scss`, `_layout.scss`, `_home.scss`, `_buy.scss`, `_tour.scss`, `_switch.scss`, `_format.scss`, `_howto.scss`, `_timeline.scss`, `_nav.scss`, `_playButton.scss`, `_features.scss`, `_shortcuts.scss`, `_footer.scss`, `_header.scss`, and `changelog.scss`:

  1. Read the original from the pre-deletion commit: `git show <ref>:_sass/<name>.scss`.
  2. Create `src/styles/<name>.scss`.
  3. Replace the top `@import './_vars.scss';` with:
     ```scss
     @use 'sass:color';
     @use 'vars' as *;
     ```
     (Drop the `@use 'sass:color'` line if the partial doesn't use any color functions.)
  4. Apply the translation table mechanically:
     - `color($x l(N%))` → `color.adjust($x, $lightness: N%)`
     - `color($x a(.N))` → `color.change($x, $alpha: 0.N)`
     - `&_$(format)` → `&_#{$format}` (in `_format.scss` and `_timeline.scss`)
     - `$(i)` → `#{$i}` (in `_timeline.scss`)
     - `url('../_images/...')` → `url('/img/_images/...')` (in `_buy.scss`, `_home.scss`, `_howto.scss`, `_nav.scss`, `_tour.scss`, `_format.scss`)
  5. `@define-mixin` does not appear outside `_vars.scss` per the audit; if you find one, translate per the table.

- [ ] **Step 5: Build to verify Sass compiles**

```bash
npm run build
```

Expected: build either succeeds or reports specific Sass errors. Fix each error against the translation table — the most common cause will be a missed `color()` call.

- [ ] **Step 6: Spot-check the output CSS**

```bash
ls dist/_astro/*.css
```

Expected: at least one hashed CSS file. Open it and grep for any leftover `color(` or `$(` or `_images` strings — there should be none.

```bash
grep -E "color\(|\\\$\(|_images/" dist/_astro/*.css
```

Expected: only matches like `_images/` paths in `url()` (which are correct as `/img/_images/...`). No `color(...)` function calls remain.

- [ ] **Step 7: Commit**

```bash
git add src/styles/
git commit -m "Translate stylesheets from precss to modern Dart Sass

Color functions migrated to sass:color module; mixin syntax updated;
selector interpolation switched to #{} form; image paths point to
/img/_images/.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Static markdown pages (about, faq, imprint, privacy, digitalychee)

**Files:**
- Create: `src/pages/about.md`, `faq.md`, `imprint.md`, `privacy.md`, `digitalychee.md`

**Source:** Copy each from `_pages/<name>.md` in the pre-deletion commit. Frontmatter changes:
- Replace `layout: page.html` with `layout: ../layouts/PageLayout.astro`.
- Drop `permalink:` (Astro's file path equals the URL).
- Drop `slug:` (confirmed unused — see spec §"Hygiene cleanup → Audit during implementation").

- [ ] **Step 1: Create `src/pages/about.md` from the captured ref**

```bash
git show $(cat /tmp/PRE_ASTRO_REF):_pages/about.md > src/pages/about.md
```

Open the file and replace the frontmatter:

Before:
```yaml
---
layout: page.html
title: About ColorSnapper
slug: About
permalink: /about/
---
```

After:
```yaml
---
layout: ../layouts/PageLayout.astro
title: About ColorSnapper
---
```

- [ ] **Step 2: Repeat for the other four pages**

Run for each of `faq.md`, `imprint.md`, `privacy.md`, `digitalychee.md`:

```bash
git show $(cat /tmp/PRE_ASTRO_REF):_pages/faq.md > src/pages/faq.md
git show $(cat /tmp/PRE_ASTRO_REF):_pages/imprint.md > src/pages/imprint.md
git show $(cat /tmp/PRE_ASTRO_REF):_pages/privacy.md > src/pages/privacy.md
git show $(cat /tmp/PRE_ASTRO_REF):_pages/digitalychee.md > src/pages/digitalychee.md
```

For each, replace the frontmatter using the same transformation as Step 1 (swap `layout:` to `../layouts/PageLayout.astro`, drop `slug:` and `permalink:`).

- [ ] **Step 3: Build and verify URLs render**

```bash
npm run build && npm run preview &
```

Then in another terminal:

```bash
for path in /about/ /faq/ /imprint/ /privacy/ /digitalychee/; do
  echo -n "$path -> "
  curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:4321$path"
done
```

Expected: all five return `200`.

Stop the preview server: `kill %1` or Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add src/pages/about.md src/pages/faq.md src/pages/imprint.md src/pages/privacy.md src/pages/digitalychee.md
git commit -m "Port static markdown pages to Astro

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Shortcuts page

**Files:**
- Create: `src/pages/shortcuts.astro`

**Why `.astro` not `.md`:** The shortcuts page uses raw HTML (`<dl>`, `<dt>`, `<dd>`) heavily and embeds footnote markup that Markdown won't preserve cleanly. Cheaper to keep it as HTML inside an Astro page.

- [ ] **Step 1: Recover the original**

```bash
git show $(cat /tmp/PRE_ASTRO_REF):_pages/shortcuts.html > /tmp/shortcuts.html
```

- [ ] **Step 2: Create `src/pages/shortcuts.astro`**

```astro
---
import PageLayout from '../layouts/PageLayout.astro';
---
<PageLayout title="Keyboard Shortcuts">
  <!-- paste the body of /tmp/shortcuts.html here, EXCLUDING the YAML frontmatter (lines 1-6) -->
</PageLayout>
```

Paste the body of `/tmp/shortcuts.html` (everything after the closing `---` of the frontmatter) inside the `<PageLayout>` element.

- [ ] **Step 3: Build and verify**

```bash
npm run build
npm run preview &
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4321/shortcuts/
```

Expected: `200`. Stop the preview.

- [ ] **Step 4: Commit**

```bash
git add src/pages/shortcuts.astro
git commit -m "Port shortcuts page

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Changelog content collection

**Files:**
- Create: `src/content.config.ts`
- Create: `src/content/changelog/<version>.md` (28 files moved from `_pages/changelog/`)
- Create: `src/pages/changelog/index.astro`
- Create: `src/pages/changelog/[...slug].astro`

- [ ] **Step 1: Create the content collection schema**

Create `src/content.config.ts`:

```typescript
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const changelog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/changelog' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
  }),
});

export const collections = { changelog };
```

- [ ] **Step 2: Move the changelog markdown files**

```bash
mkdir -p src/content/changelog
OLD=$(cat /tmp/PRE_ASTRO_REF)
git ls-tree -r --name-only "$OLD" | grep '^_pages/changelog/.*\.md$' | while read f; do
  name=$(basename "$f")
  git show "$OLD:$f" > "src/content/changelog/$name"
done
ls src/content/changelog/ | wc -l
```

Expected: `28`.

- [ ] **Step 3: Create `src/pages/changelog/index.astro`**

```astro
---
import { getCollection } from 'astro:content';
import PageLayout from '../../layouts/PageLayout.astro';
import { render } from 'astro:content';

const entries = (await getCollection('changelog'))
  .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

const rendered = await Promise.all(
  entries.map(async (entry) => {
    const { Content } = await render(entry);
    return { entry, Content };
  })
);
---
<PageLayout title="What's New">
  <ul class="changelog">
    {rendered.map(({ entry, Content }) => (
      <li class="changelog__item">
        <time datetime={entry.data.date.toISOString()} class="changelog__date">
          {entry.data.date.toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' })}
        </time>
        <div class="changelog__content">
          <h2 class="changelog__title">{entry.data.title}</h2>
          <section class="changelog__body"><Content /></section>
        </div>
      </li>
    ))}
  </ul>
</PageLayout>
```

- [ ] **Step 4: Create `src/pages/changelog/[...slug].astro`**

Per-version detail page. Astro requires a `getStaticPaths()` for catch-all routes.

```astro
---
import { getCollection, render } from 'astro:content';
import PageLayout from '../../layouts/PageLayout.astro';
import type { GetStaticPaths } from 'astro';

export const getStaticPaths: GetStaticPaths = async () => {
  const entries = await getCollection('changelog');
  return entries.map((entry) => ({
    params: { slug: entry.id.replace(/\.md$/, '') },
    props: { entry },
  }));
};

const { entry } = Astro.props;
const { Content } = await render(entry);
---
<PageLayout title={`ColorSnapper ${entry.data.title}`}>
  <time datetime={entry.data.date.toISOString()} class="changelog__date">
    {entry.data.date.toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric' })}
  </time>
  <Content />
</PageLayout>
```

- [ ] **Step 5: Build, then verify URLs**

```bash
npm run build
npm run preview &
sleep 1
for path in /changelog/ /changelog/1.0.0/ /changelog/1.6.0/; do
  echo -n "$path -> "
  curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:4321$path"
done
ls dist/changelog/ | head -5
```

Expected: all three return `200`. `dist/changelog/` contains 28 subdirectories plus `index.html`.

Stop the preview.

- [ ] **Step 6: Commit**

```bash
git add src/content.config.ts src/content/ src/pages/changelog/
git commit -m "Add changelog content collection with list and detail pages

Replaces metalsmith-collections + metalsmith-format-date-plugin with
Astro Content Collections. URLs preserved: /changelog/ and
/changelog/<version>/.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Home page (index.astro)

**Files:**
- Create: `src/pages/index.astro`

**Source:** `_pages/index.html` from the pre-deletion commit. The home is the most complex page (~370 lines of markup with multiple `tour`/`features` sections, video tags, theme switch). Convert mechanically.

- [ ] **Step 1: Recover the original**

```bash
git show $(cat /tmp/PRE_ASTRO_REF):_pages/index.html > /tmp/index.html
```

- [ ] **Step 2: Create `src/pages/index.astro`**

```astro
---
import HomeLayout from '../layouts/HomeLayout.astro';
import Navigation from '../components/Navigation.astro';
import BuyLinks from '../components/BuyLinks.astro';
import PlayButton from '../components/PlayButton.astro';
import { site } from '../site.config';
---
<HomeLayout title="The Color Picker App for Mac">
  <!-- paste the body of /tmp/index.html here, with these substitutions: -->
  <!-- {{> navigation }}    -> <Navigation /> -->
  <!-- {{> buy-links }}     -> <BuyLinks /> -->
  <!-- {{> playButton }}    -> <PlayButton /> -->
  <!-- {{{ site.description }}} -> <Fragment set:html={site.description} /> -->
  <!-- Drop the YAML frontmatter (lines 1-4 of the original). -->
</HomeLayout>
```

The original `_pages/index.html` has these Handlebars tokens:
- 1× `{{> navigation }}` → `<Navigation />`
- 2× `{{> buy-links }}` → `<BuyLinks />`
- ~6× `{{> playButton }}` → `<PlayButton />`
- 1× `{{{ site.description }}}` (inside `<p>`) → `<Fragment set:html={site.description} />`

Do those substitutions, then paste into the layout.

- [ ] **Step 3: Build and verify**

```bash
npm run build
npm run preview &
sleep 1
curl -s http://localhost:4321/ | grep -E "ColorSnapper 2|paddle_button" | head -3
```

Expected: output contains `<h1 class="home__logo">ColorSnapper 2</h1>` and a `paddle_button` link.

Stop the preview.

- [ ] **Step 4: Commit**

```bash
git add src/pages/index.astro
git commit -m "Port home page

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: Site script (videos, theme switch)

**Files:**
- Create: `src/scripts/site.ts`

**Source:** `_js/index.js` from the pre-deletion commit. Port mostly verbatim. Changes:
- Delete the SCSS imports at the top of the file (Astro imports SCSS via `BaseLayout`/`HomeLayout`, not via JS).
- Delete the `import checkOSCompatibility from './checkOSCompatibility'` line.
- Delete the `initGA()` function and its call site (`initGA(['buy-mas', 'buy-paddle', 'buy-download'])`).

- [ ] **Step 1: Recover the original**

```bash
git show $(cat /tmp/PRE_ASTRO_REF):_js/index.js > /tmp/site.js
```

- [ ] **Step 2: Create `src/scripts/site.ts`**

Open `/tmp/site.js`. Copy lines starting from the first non-import/non-blank line (i.e. start at `const CIRCLE_LENGTH = ...`) into `src/scripts/site.ts`.

In the new file:
1. Delete the `function initGA(classNames) { ... }` block.
2. Delete the line `initGA(['buy-mas', 'buy-paddle', 'buy-download'])` inside `DOMContentLoaded`.
3. Add `// @ts-nocheck` at the top of the file. Rationale: this is a verbatim port of vanilla JS DOM code; converting it to strict TS is redesign-territory.

The first lines of the resulting file:

```typescript
// @ts-nocheck

const CIRCLE_LENGTH = Math.PI * 45 * 2
const forEach = Array.prototype.forEach
let currentlyPlayingVideo = null

function pauseVideoPlayback(video) {
  if (video) video.pause()
}

// ... etc, paste the rest unchanged ...
```

- [ ] **Step 3: Build to confirm the script bundles**

```bash
npm run build
ls dist/_astro/*.js
```

Expected: at least one hashed JS file exists. Inspect briefly to confirm it contains code from `site.ts` (e.g., `grep -l "CIRCLE_LENGTH" dist/_astro/*.js`).

- [ ] **Step 4: Commit**

```bash
git add src/scripts/site.ts
git commit -m "Port site.ts (video tour + theme switch)

Drops initGA() and OS-compat check; SCSS imports moved into Astro
layouts.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 13: Deploy config + docs

**Files:**
- Create: `netlify.toml`
- Modify: `README.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Create `netlify.toml`**

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "22"
```

- [ ] **Step 2: Rewrite `README.md`**

```markdown
# colorsnapper.com

Public website for ColorSnapper 2, a Mac color picker app.

## Development

1. `nvm use` (Node 22)
2. `npm install`
3. `npm run dev` — serves on `http://localhost:4321`

## Build

```bash
npm run build       # output → dist/
npm run preview     # serve dist/ locally
npm run check       # astro check (TypeScript + content schema)
```

## Deploy

Netlify auto-deploys on push to `master`. Build config lives in `netlify.toml`.
```

- [ ] **Step 3: Rewrite `CLAUDE.md`**

Replace the entire file with content reflecting the Astro stack:

```markdown
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

`src/content/changelog/<version>.md` — 28 markdown files with `title` + `date` frontmatter, validated by the Zod schema in `src/content.config.ts`. The list page (`src/pages/changelog/index.astro`) calls `getCollection('changelog')` and sorts by date desc; the detail route (`src/pages/changelog/[...slug].astro`) renders one entry per URL.

### Layouts

- `BaseLayout.astro` — head + header + footer + `main.scss` import + `site.ts` script. Used by every non-home page.
- `PageLayout.astro` — wraps `BaseLayout` with the post-title heading structure used by static pages and changelog entries.
- `HomeLayout.astro` — like `BaseLayout` but does NOT render `<Header>` (the home page has its own hero/nav) and DOES load Paddle via `<script src="https://cdn.paddle.com/paddle/paddle.js">` plus a `Paddle.Setup({ vendor: ... })` inline call.

### Site config

`src/site.config.ts` exports a typed `site` object with title, description, Paddle vendor/product IDs, MAS product ID, and URL. None of these are secrets — they appear in HTML today.

### Styles

`src/styles/main.scss` is the single entry; it `@use`s 16 partials. Modern Dart Sass — uses `@use 'sass:color'`, `color.adjust`, `color.change`, and `#{}` for interpolation. The previous codebase used PostCSS+precss; do not bring back that syntax.

CSS image references point to `/img/_images/...` (assets moved from the original `_images/` to `public/img/_images/` during migration).

### `public/app/` is load-bearing

Sparkle appcast (`public/app/appcast.xml`) and `public/app/eula.pdf` are consumed by the installed Mac app. Don't rename or restructure.

### Vanilla JS interactivity

`src/scripts/site.ts` (~200 lines) handles video tour interactions and the home page's light/dark theme switch (swaps `dark`/`light` in image filenames). Imported once from layouts via `<script>import '../scripts/site.ts'</script>`. No framework.
```

- [ ] **Step 4: Commit**

```bash
git add netlify.toml README.md CLAUDE.md
git commit -m "Add Netlify config; rewrite README and CLAUDE.md for Astro

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 14: Final verification

- [ ] **Step 1: Clean rebuild from scratch**

```bash
rm -rf dist/ .astro/ node_modules/
npm install
npm run check
npm run build
```

Expected: all three commands exit 0. No deprecation warnings about Sass APIs.

- [ ] **Step 2: Walk every public URL on the preview server**

```bash
npm run preview &
sleep 1
for path in / /about/ /faq/ /imprint/ /privacy/ /digitalychee/ /shortcuts/ /changelog/ /changelog/1.0.0/ /changelog/1.6.0/ /app/appcast.xml /app/eula.pdf /img/digitalychee.png /img/_images/mas.svg /CNAME; do
  echo -n "$path -> "
  curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:4321$path"
done
```

Expected: every line ends in `200`.

- [ ] **Step 3: Visual check in a browser**

Open `http://localhost:4321/` and verify:
- The hero, tour sections, video posters render without broken images.
- Hover on a `.features__item` → its associated video plays/highlights.
- Click the theme switch → images for the `overlayTour` swap between light and dark variants.
- The "purchase a license" link opens the Paddle overlay (NOT a 404). If Paddle reports SDK issues, that's the risk flagged in the spec — escalate to the user before merging.

Then visit `/changelog/`, `/changelog/1.6.0/`, `/faq/`, and `/shortcuts/` and confirm they render with the same layout structure as the live site.

Stop the preview server.

- [ ] **Step 4: Diff check against the production site (optional but recommended)**

```bash
curl -s https://colorsnapper.com/faq/ | grep -oE "<h2[^>]*>[^<]+</h2>" | sort -u > /tmp/prod-faq-h2.txt
npm run preview &
sleep 1
curl -s http://localhost:4321/faq/ | grep -oE "<h2[^>]*>[^<]+</h2>" | sort -u > /tmp/local-faq-h2.txt
diff /tmp/prod-faq-h2.txt /tmp/local-faq-h2.txt
```

Expected: no diff (same set of FAQ headings).

- [ ] **Step 5: Push the branch and open a PR for review**

```bash
git push -u origin astro-migration
gh pr create --title "Migrate website from Metalsmith/Webpack to Astro v6" --body "$(cat <<'EOF'
## Summary
- Replace Metalsmith + Webpack 1 (Node 8) with Astro v6 (Node 22)
- Translate stylesheets from PostCSS+precss to modern Dart Sass
- Drop GA UA snippet, Twitter follow button, OS-compat check
- Move changelog (28 markdown files) into an Astro Content Collection

## Test plan
- [x] `npm run build` succeeds with no Sass deprecation warnings
- [x] `npm run check` passes
- [x] All public URLs return 200 on preview (verified via curl)
- [x] Visual inspection: home tour interactions, theme switch, Paddle button
- [x] `/app/appcast.xml` and `/app/eula.pdf` URLs unchanged (Sparkle dependency)
- [ ] Netlify preview deploy reviewed before merge

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 6: After Netlify preview deploys, review it**

Open the Netlify preview URL (in PR comments). Repeat Step 3 (visual check) against the deployed preview. Run Lighthouse — scores should be no worse than current production.

If any regression appears, address it on the same branch before merging.

---

## Spec coverage check

| Spec section | Tasks |
|---|---|
| Goals: Move off old build | 1, 2 |
| Goals: Preserve URLs | 8, 9, 10, 11, 14 |
| Goals: Preserve visual design | 7, 11 |
| Goals: Content Collections for changelog | 10 |
| Goals: Translate Sass | 7 |
| Goals: Drop dead code | 1, 5, 12 |
| Astro config (`trailingSlash`, `format`) | 2 |
| Site metadata (`site.config.ts`) | 4 |
| Components | 5 |
| Layouts | 6 |
| Sass migration table | 7 |
| JS migration | 12 |
| Page-by-page table | 8, 9, 10, 11 |
| Hygiene cleanup | 1, 5 (UA + Twitter), 12 (OS check + GA call) |
| `slug:` audit (drop if unused) | 8 (confirmed unused; dropped) |
| `_images/` reference audit | 7 (paths rewritten to `/img/_images/`) |
| Deploy / `netlify.toml` | 13 |
| README + CLAUDE.md updates | 13 |
| Verification plan | 14 |
| Risk: Paddle SDK | 14 (Step 3) |
| Risk: digitalychee specifics | 8 |
