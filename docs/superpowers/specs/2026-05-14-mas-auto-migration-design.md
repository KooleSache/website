# Automated MAS-to-Standalone Migration

**Status:** Design approved, pending implementation plan
**Author:** Andrey Okonetchnikov
**Date:** 2026-05-14

## Problem

Apple removed ColorSnapper from the Mac App Store within the last 12 months. Affected customers contact support@ asking for a path to the standalone version. Today this is handled manually: customers email a copy of their MAS invoice, and support replies with two static coupon codes (50% off and 100% off) and lets the customer choose. The volume is steady enough to be tedious, and the static codes are trivially shareable once a recipient posts them publicly.

## Goal

Replace the manual email-and-coupon flow with a self-service web flow that:

- Verifies the request from the uploaded MAS receipt itself (no honor system)
- Issues a per-submission discounted Paddle checkout URL (no shareable codes)
- Computes the discount automatically from the receipt's purchase date, so customers don't pick their own tier
- Routes the license email through Paddle to the address shown on the receipt (binding the upgrade to the original purchaser's mailbox)
- Runs unattended in the success path — only failures need human attention

## Non-goals

- Apple cryptographic receipt validation (`verifyReceipt` / App Store Server API). We no longer have an active App Store Connect relationship; we treat the receipt as a visual artifact.
- Migration of customers currently in the manual email queue — Andrey will clear those by hand.
- Persistent storage of submissions. No database, no blob store, no audit log on our side. Paddle's dashboard is the system of record for completed upgrades.
- Defending against image-manipulation attacks (photoshopped receipts). Detecting these algorithmically is unreliable and the population we serve is unlikely to attempt it.

## User flow

1. Customer follows a link from `faq.md` (the "Why isn't ColorSnapper on the Mac App Store?" answer) to `/upgrade/`.
2. The page shows one drop zone: "Upload your Mac App Store receipt (screenshot or PDF, ≤ 5 MB)." Plus a Cloudflare Turnstile widget and a visible fallback line: "Receipt not recognized? Email support@colorsnapper.com."
3. Customer drops the file. The Turnstile token is captured client-side. The form posts a multipart request to `/api/upgrade-request`.
4. The server:
   - Verifies the Turnstile token against Cloudflare's `siteverify`. Bad token → 403.
   - Validates file size and MIME type. Bad file → 400.
   - Sends the file to OpenAI vision (`gpt-4o-mini`) with a JSON-schema-constrained prompt that returns `{ isColorSnapperReceipt, email, purchaseDate, confidence }`.
   - If `isColorSnapperReceipt` is false → 422 with a friendly "this doesn't look like a ColorSnapper MAS receipt" message.
   - If `email` is missing/unreadable → 422 with "we couldn't read the email on this receipt — please email support@."
   - If `purchaseDate` is missing/unreadable but email is present → continue with the lowest tier (25% off). Returned response includes a hint that the date couldn't be read.
   - Computes the discount tier from `purchaseDate`.
   - Calls Paddle Classic `generate_pay_link` with `product_id = paddleProductId`, `customer_email = extracted email`, and a `prices` override for the discounted USD amount.
   - Returns `{ checkoutUrl, discountPercent, finalPrice, redactedEmail }`.
5. The page swaps the form for a success card:
   > Receipt verified. You qualify for **{discountPercent}% off** — your price is **${finalPrice}**. The license will be sent to **{redactedEmail}** after checkout.
   > **[Continue to checkout]**
6. Clicking the button opens the Paddle overlay checkout on the current page via `Paddle.Checkout.open({ override: checkoutUrl, successCallback })`. The user never leaves `/upgrade/`. On a successful purchase, the `successCallback` swaps the UI to a "thanks — check your inbox for your license" state. If the user closes the overlay without buying, the success card remains and they can click again.
7. Paddle emails the license to the email it has on file. Done.

## Architecture

```
┌─────────────────┐  POST multipart   ┌──────────────────────┐
│ /upgrade page   │ ─────────────────▶│  Astro SSR endpoint  │
│ (single upload) │ ◀───────────────── │  (Netlify Function)  │
└─────────────────┘   { ..., url }     └─────────┬────────────┘
                                                 │
                          ┌──────────────────────┼──────────────────────┐
                          ▼                      ▼                      ▼
                ┌──────────────────┐  ┌──────────────────────┐  ┌──────────────────┐
                │ Cloudflare       │  │ OpenAI vision        │  │ Paddle Classic   │
                │ Turnstile        │  │ extract receipt JSON │  │ generate pay link│
                │ siteverify       │  │                      │  │ (price override) │
                └──────────────────┘  └──────────────────────┘  └──────────────────┘
```

The site stays static-first. The Netlify adapter is installed so a single route (`src/pages/api/upgrade-request.ts`) can run server-side via `export const prerender = false`. Every other page continues to build statically as today.

The function is stateless. No database, no blob storage, no email service. The screenshot transits the function in memory and is dropped when the response returns.

## Components

### `src/pages/upgrade.astro`

The form page. Static. Loads two third-party scripts:

- `https://challenges.cloudflare.com/turnstile/v0/api.js` — Turnstile widget
- `https://cdn.paddle.com/paddle/paddle.js` — Paddle Classic JS (same script used in `HomeLayout.astro`)

An inline `Paddle.Setup({ vendor: paddleVendorId })` call initializes the SDK once on page load (vendor id sourced from `site.config.ts`). Imports `src/scripts/upgrade.ts` once.

### `src/scripts/upgrade.ts`

Client-side TypeScript. Responsibilities:

- Wire up drag-and-drop and file selection
- Read the Turnstile token from the widget
- Build the `FormData` and POST to `/api/upgrade-request`
- On success: replace the form with the success card showing the tier, redacted email, and a "Continue to checkout" button
- On error: replace the form with a friendly error card matching the failure-mode table
- On "Continue to checkout" click: call `Paddle.Checkout.open({ override: checkoutUrl, successCallback })`. The `successCallback` swaps the success card for a final "thanks — check your inbox" state.

No framework — same vanilla style as `site.ts`.

### `src/pages/api/upgrade-request.ts`

The SSR endpoint. Composition:

```ts
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData();
  // 1. Turnstile verify
  // 2. File validation
  // 3. Vision extraction
  // 4. Discount calculation
  // 5. Paddle pay link
  // Return JSON.
};
```

Each numbered step is its own helper in `src/lib/*` so the endpoint stays a short orchestration layer.

### `src/lib/discount.ts`

Pure function. No I/O.

```ts
export type DiscountResult = {
  tier: 'free' | 'half' | 'quarter';
  discountPercent: 100 | 50 | 25;
  originalPriceUSD: number;
  finalPriceUSD: number;
};

export function tierFor(purchaseDate: Date, today: Date = new Date()): DiscountResult;
```

Boundaries (computed against `today` so tests can pin time):

| Months since purchase | Tier | Discount |
|---|---|---|
| `< 18` | `free` | 100% |
| `>= 18 && < 48` | `half` | 50% |
| `>= 48` | `quarter` | 25% |

`originalPriceUSD` is a constant in this file, set to match the current Paddle product price. We do not fetch live pricing — if the Paddle price ever changes, this constant must be updated by hand. The constant only affects the displayed `$Y` figure on the success card; the `prices` override sent to Paddle is computed from `originalPriceUSD * (1 - discountPercent/100)`, so price drift would cause an inconsistency between displayed and charged amounts. Worth a one-line check whenever the Paddle price changes.

### `src/lib/vision.ts`

OpenAI client wrapper. One exported function:

```ts
export type ReceiptExtraction = {
  isColorSnapperReceipt: boolean;
  email: string | null;
  purchaseDate: string | null; // ISO 8601 yyyy-mm-dd
  confidence: 'high' | 'medium' | 'low';
};

export async function extractReceipt(
  fileBuffer: Buffer,
  mimeType: string,
): Promise<ReceiptExtraction>;
```

Model: `gpt-4o-mini`. Uses `response_format: { type: 'json_schema', json_schema: ... }` so the response is guaranteed to match the type.

Prompt (sketch):

> You are validating a Mac App Store receipt. Look for the product name "ColorSnapper" or "ColorSnapper 2" on the receipt. Extract:
> - `isColorSnapperReceipt`: true only if ColorSnapper is clearly listed.
> - `email`: the Apple ID email shown on the receipt (typically near the top), or null if not legible.
> - `purchaseDate`: the date the customer purchased ColorSnapper, in `yyyy-mm-dd` format, or null if not legible.
> - `confidence`: how sure you are overall.
> Do not infer the date from anything other than text printed on the receipt. If the receipt lists multiple products, use the date next to ColorSnapper.

### `src/lib/paddle.ts`

Paddle Classic API client. One exported function:

```ts
export async function generatePayLink(args: {
  customerEmail: string;
  finalPriceUSD: number;
}): Promise<{ url: string }>;
```

Calls `POST https://vendors.paddle.com/api/2.0/product/generate_pay_link` with:

- `vendor_id` (from `site.config.ts` — `paddleVendorId`)
- `vendor_auth_code` (env: `PADDLE_VENDOR_AUTH_CODE`)
- `product_id` (from `site.config.ts` — `paddleProductId`)
- `prices=["USD:<finalPriceUSD>"]`
- `customer_email`
- `marketing_consent=0`
- `expires` (today + 7 days, ISO date — short window limits exposure if a link leaks before the legitimate purchaser uses it)

### `src/lib/turnstile.ts`

One exported function: `verify(token: string, remoteIP?: string): Promise<boolean>`. Calls `POST https://challenges.cloudflare.com/turnstile/v0/siteverify` with `secret` (env) and `response` (the token).

## Configuration changes

### `astro.config.mjs`

Add the Netlify adapter:

```js
import netlify from '@astrojs/netlify';

export default defineConfig({
  // ...existing config preserved...
  adapter: netlify(),
});
```

`output` stays at its current default (`'static'`). The single API route opts into SSR with `export const prerender = false`.

### `package.json`

New dependencies:

- `@astrojs/netlify` — adapter
- `openai` — vision client

No `resend`, no email service.

### Netlify env vars (added in the Netlify UI)

- `PADDLE_VENDOR_AUTH_CODE` (secret)
- `OPENAI_API_KEY` (secret)
- `TURNSTILE_SECRET_KEY` (secret)
- `PUBLIC_TURNSTILE_SITE_KEY` (public — exposed to the browser)

### `src/pages/faq.md`

Replace the existing manual-instructions sentence:

> Please [contact us](mailto:support@colorsnapper.com) with a copy of your MAS invoice we'll email you a coupon code to upgrade to the latest version.

with a link to the new page:

> If you bought ColorSnapper on the Mac App Store, you can [upgrade to the standalone version here](/upgrade/) — upload your MAS receipt and we'll automatically apply a discount based on when you bought it.

### `src/pages/privacy.md`

Add a sentence noting that uploaded receipts are sent to OpenAI for automated extraction and are not stored on our servers.

## Failure modes

| Failure | HTTP | UX | Operator action |
|---|---|---|---|
| Missing/invalid Turnstile token | 403 | "Please refresh and try again." | None |
| File too large or wrong MIME | 400 | "Please upload a screenshot or PDF up to 5 MB." | None |
| Vision: not a ColorSnapper receipt | 422 | "This doesn't look like a ColorSnapper MAS receipt. Email support@ if you think this is wrong." | None unless customer emails |
| Vision: email unreadable | 422 | "We couldn't read the email on your receipt. Please email support@ with the receipt and we'll help." | Manual response when customer emails |
| Vision: date unreadable, email OK | 200 | Customer is offered the 25% tier. Success card includes a small "We couldn't read the date, so we applied our minimum discount — email support@ if you think you qualified for more." | Manual review when customer emails |
| Paddle API error | 502 | "Something went wrong generating your checkout. Please try again in a moment, or email support@." | Check logs |
| OpenAI API error | 502 | Same as above | Check logs |

There is intentionally no audit email and no stored copy of the submission. If a customer disputes the outcome, they resubmit (or email the receipt to support@, where it can be reviewed by hand). Paddle's dashboard remains the source of truth for completed upgrades.

## Abuse considerations

| Attack | Mitigation |
|---|---|
| Bot floods the endpoint to burn our OpenAI budget | Cloudflare Turnstile blocks automation before any vision call. |
| Customer manipulates date to get a better tier | Date is read from the screenshot, not entered. To manipulate, they'd have to photoshop the receipt — high friction, low expected occurrence. Accepted risk. |
| Customer uses someone else's receipt (e.g. forum screenshot) | License is delivered to the email shown on that receipt. Without access to the original purchaser's mailbox, the attacker can't redeem. Self-policing. |
| Customer photoshops their own email onto a stranger's receipt | Algorithmically undetectable. Audit visibility on the Paddle side; if anomalous volume appears, revisit. Accepted risk. |
| Pay-link URL gets shared on social media | Pay links are generated with `expires = today + 7 days`. The short window limits damage if a URL leaks before the original purchaser uses it. After expiry, the URL produces a Paddle error and the customer must resubmit. |

## Implementation risks and items to verify

These are things the design assumes but should be confirmed during implementation. None are design blockers; each has a clear fallback.

1. **Paddle Classic accepts zero-total pay links via `prices` override.** If `prices=["USD:0.00"]` is rejected, the `free` tier needs to fall back to a pre-created 100%-off coupon attached via `coupon_code`. One-line change.
2. **Paddle Classic locks the prefilled `customer_email` on the checkout page.** If not, the customer could overwrite it — which weakens the email-binding defense but isn't a fraud vector by itself (the customer has already passed the receipt check). Accept as-is.
3. **OpenAI `gpt-4o-mini` reliably handles screenshot variations** — different macOS versions, App Store layouts, languages, low-resolution phone-camera photos of a screen. Expected to be fine but worth a smoke test against ~10 real receipts before launch.
4. **Turnstile widget loads cleanly inside the form** without disrupting the existing site CSS. Standard integration; low risk.
5. **`Paddle.Checkout.open({ override })` accepts pay-link URLs generated by `generate_pay_link`.** Documented behavior in Paddle Classic, but worth a manual confirmation during integration: open a generated URL via the overlay and confirm checkout completes and `successCallback` fires.

## Testing

- **Unit (Vitest or node:test):** `discount.ts` boundary table — 17m → free, 18m → half, 47m → half, 48m → quarter, plus a frozen-`today` test.
- **Integration (node:test against the endpoint):** Mock the OpenAI, Paddle, and Turnstile clients. Verify each failure mode in the table above produces the right HTTP status and JSON shape.
- **Manual smoke:**
  - Submit a real recent receipt — expect `free` tier and a working Paddle URL with $0 total.
  - Submit a real ~2-year-old receipt — expect `half`.
  - Submit a real 5+-year-old receipt — expect `quarter`.
  - Submit a clearly-not-a-receipt image — expect 422.
  - Submit a junked-up receipt where vision can read email but not date — expect 200 with the 25%-tier hint.

## Out of scope (future iterations)

- Telemetry / analytics on conversion of the `/upgrade/` page.
- Multi-language UI for the upgrade page itself (the form is essentially label-free; the success/error messages are English-only for v1).
- Customer-facing dispute flow that doesn't require emailing support@.
