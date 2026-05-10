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
