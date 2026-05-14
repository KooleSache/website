# MAS-to-Standalone Upgrade — Environment Variables

These variables must be set in Netlify's environment-variables UI for the
`/upgrade/` flow to work in production. Set them on the project's
"Site configuration → Environment variables" page in the Netlify dashboard.

| Variable | Visibility | Source | Notes |
|---|---|---|---|
| `PADDLE_VENDOR_AUTH_CODE` | secret | Paddle Classic dashboard → Developer Tools → Authentication | Server-side only |
| `OPENAI_API_KEY` | secret | OpenAI dashboard → API keys | Server-side only |
| `TURNSTILE_SECRET_KEY` | secret | Cloudflare → Turnstile → site → Secret Key | Server-side only |
| `PUBLIC_TURNSTILE_SITE_KEY` | public | Cloudflare → Turnstile → site → Site Key | Exposed to the browser (prefixed `PUBLIC_` so Astro inlines it at build time) |

## Local development

Create `.env` at the project root with the same four variables. Astro will
load them automatically. Do not commit `.env` — it is already in `.gitignore`
(verify; add if missing).

## Verifying after a deploy

1. Visit `/upgrade/` in the deployed site.
2. The Turnstile widget should render. If it does not, `PUBLIC_TURNSTILE_SITE_KEY` is missing or wrong.
3. Submitting a valid receipt should return a checkout URL. If the network response is a 500 with `server_misconfigured`, one of the three secret env vars is missing.
