# Automated MAS-to-Standalone Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-service `/upgrade/` page that lets former MAS customers upload their receipt, auto-extracts the email + purchase date via OpenAI vision, computes a date-tiered discount, and opens a Paddle overlay checkout with the discount baked into a per-submission pay link.

**Architecture:** Astro v6 static site with the Netlify adapter installed so a single API route (`/api/upgrade-request`) runs server-side as a Netlify Function. The function calls Cloudflare Turnstile to verify the submitter is human, OpenAI vision to extract receipt data, and Paddle Classic `generate_pay_link` to mint a one-time discounted checkout URL. No database, no email service, no persistent storage.

**Tech Stack:** Astro v6, TypeScript, Vitest, `@astrojs/netlify`, OpenAI SDK, Paddle Classic API, Cloudflare Turnstile.

**Spec:** `docs/superpowers/specs/2026-05-14-mas-auto-migration-design.md`

---

## File Structure

**Create:**
- `vitest.config.ts` — Vitest configuration
- `src/lib/discount.ts` — pure tier calculator (`tierFor(date)`)
- `src/lib/redactEmail.ts` — pure email-redaction helper
- `src/lib/turnstile.ts` — Cloudflare Turnstile `siteverify` wrapper
- `src/lib/paddle.ts` — Paddle Classic `generate_pay_link` wrapper
- `src/lib/vision.ts` — OpenAI vision receipt-extraction wrapper
- `src/pages/api/upgrade-request.ts` — SSR endpoint orchestrating the flow
- `src/pages/upgrade.astro` — form page
- `src/scripts/upgrade.ts` — client-side form handler + Paddle overlay opener
- `src/styles/_upgrade.scss` — page-specific styles
- `tests/lib/discount.test.ts`
- `tests/lib/redactEmail.test.ts`
- `tests/lib/turnstile.test.ts`
- `tests/lib/paddle.test.ts`
- `tests/lib/vision.test.ts`
- `tests/api/upgrade-request.test.ts`

**Modify:**
- `package.json` — add `vitest`, `@astrojs/netlify`, `openai` and a `test` script
- `astro.config.mjs` — register `@astrojs/netlify` adapter
- `src/pages/faq.md` — replace manual instructions with link to `/upgrade/`
- `src/pages/privacy.md` — add OpenAI processing notice
- `src/styles/main.scss` — `@use` the new `_upgrade.scss` partial

---

## Task 1: Set up Vitest test infrastructure

**Files:**
- Create: `vitest.config.ts`, `tests/smoke.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Install Vitest**

Run:
```bash
npm install --save-dev vitest @types/node
```

Expected: dependencies added to `package.json`, `package-lock.json` updated.

- [ ] **Step 2: Add the `test` script to `package.json`**

In the `scripts` block, add a `test` line:

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check",
    "test": "vitest run"
  }
}
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 4: Write a smoke test**

Create `tests/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('vitest smoke', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run the test and confirm it passes**

Run: `npm test`
Expected: `1 passed`. Vitest output shows `tests/smoke.test.ts` green.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts tests/smoke.test.ts
git commit -m "Set up Vitest test infrastructure"
```

---

## Task 2: Install the Astro Netlify adapter

**Files:**
- Modify: `package.json`, `astro.config.mjs`

- [ ] **Step 1: Install the adapter**

Run:
```bash
npm install @astrojs/netlify
```

- [ ] **Step 2: Update `astro.config.mjs` to register the adapter**

Replace the file with:

```js
import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';

export default defineConfig({
  site: 'https://colorsnapper.com',
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  markdown: {
    syntaxHighlight: false,
  },
  adapter: netlify(),
});
```

- [ ] **Step 3: Confirm the static build still works**

Run: `npm run build`
Expected: build completes without errors. Existing pages still appear under `dist/`.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json astro.config.mjs
git commit -m "Install @astrojs/netlify adapter"
```

---

## Task 3: Implement `lib/discount.ts` — discount tier calculator

**Files:**
- Create: `src/lib/discount.ts`
- Test: `tests/lib/discount.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/discount.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { tierFor, ORIGINAL_PRICE_USD } from '../../src/lib/discount';

const today = new Date('2026-05-14T00:00:00Z');

function monthsBefore(date: Date, months: number): Date {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() - months);
  return d;
}

describe('tierFor', () => {
  it('returns the free tier just under 18 months', () => {
    const purchase = monthsBefore(today, 17);
    const result = tierFor(purchase, today);
    expect(result.tier).toBe('free');
    expect(result.discountPercent).toBe(100);
    expect(result.finalPriceUSD).toBe(0);
    expect(result.originalPriceUSD).toBe(ORIGINAL_PRICE_USD);
  });

  it('returns the half tier exactly at 18 months', () => {
    const purchase = monthsBefore(today, 18);
    const result = tierFor(purchase, today);
    expect(result.tier).toBe('half');
    expect(result.discountPercent).toBe(50);
    expect(result.finalPriceUSD).toBe(ORIGINAL_PRICE_USD * 0.5);
  });

  it('returns the half tier just under 48 months', () => {
    const purchase = monthsBefore(today, 47);
    const result = tierFor(purchase, today);
    expect(result.tier).toBe('half');
  });

  it('returns the quarter tier exactly at 48 months', () => {
    const purchase = monthsBefore(today, 48);
    const result = tierFor(purchase, today);
    expect(result.tier).toBe('quarter');
    expect(result.discountPercent).toBe(25);
    expect(result.finalPriceUSD).toBe(ORIGINAL_PRICE_USD * 0.75);
  });

  it('returns the quarter tier for very old purchases', () => {
    const purchase = monthsBefore(today, 120);
    const result = tierFor(purchase, today);
    expect(result.tier).toBe('quarter');
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npm test`
Expected: `tests/lib/discount.test.ts` fails — module not found.

- [ ] **Step 3: Implement `src/lib/discount.ts`**

```ts
export const ORIGINAL_PRICE_USD = 25;

export type DiscountTier = 'free' | 'half' | 'quarter';

export type DiscountResult = {
  tier: DiscountTier;
  discountPercent: 100 | 50 | 25;
  originalPriceUSD: number;
  finalPriceUSD: number;
};

export function tierFor(purchaseDate: Date, today: Date = new Date()): DiscountResult {
  const months = monthsBetween(purchaseDate, today);
  const { tier, discountPercent } = bracketFor(months);
  const finalPriceUSD = round2(ORIGINAL_PRICE_USD * (1 - discountPercent / 100));
  return {
    tier,
    discountPercent,
    originalPriceUSD: ORIGINAL_PRICE_USD,
    finalPriceUSD,
  };
}

function bracketFor(months: number): { tier: DiscountTier; discountPercent: 100 | 50 | 25 } {
  if (months < 18) return { tier: 'free', discountPercent: 100 };
  if (months < 48) return { tier: 'half', discountPercent: 50 };
  return { tier: 'quarter', discountPercent: 25 };
}

function monthsBetween(earlier: Date, later: Date): number {
  const years = later.getUTCFullYear() - earlier.getUTCFullYear();
  const months = later.getUTCMonth() - earlier.getUTCMonth();
  const dayAdjust = later.getUTCDate() < earlier.getUTCDate() ? -1 : 0;
  return years * 12 + months + dayAdjust;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npm test`
Expected: 5 tests in `tests/lib/discount.test.ts` pass (plus the smoke test).

- [ ] **Step 5: Verify `ORIGINAL_PRICE_USD` matches the live Paddle price**

Open the Paddle dashboard, find product `499167` (the value of `paddleProductId` in `src/site.config.ts`), and confirm the USD price. If it is not `25`, update the constant and adjust the failing assertions in the test accordingly.

This is an explicit human-in-the-loop step. The constant is the single source of truth for the displayed and charged price; if it drifts from Paddle's product price, the displayed `$Y` figure on the success card will mismatch the listed price elsewhere on the site.

- [ ] **Step 6: Commit**

```bash
git add src/lib/discount.ts tests/lib/discount.test.ts
git commit -m "Add discount tier calculator"
```

---

## Task 4: Implement `lib/redactEmail.ts` — email redaction helper

**Files:**
- Create: `src/lib/redactEmail.ts`
- Test: `tests/lib/redactEmail.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/redactEmail.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { redactEmail } from '../../src/lib/redactEmail';

describe('redactEmail', () => {
  it('redacts a normal email', () => {
    expect(redactEmail('andrey@okonet.dev')).toBe('a****y@o*****t.dev');
  });

  it('redacts short local parts', () => {
    expect(redactEmail('ab@example.com')).toBe('a*@e******e.com');
  });

  it('redacts very short local parts', () => {
    expect(redactEmail('a@b.com')).toBe('a@b.com');
  });

  it('returns the original input for malformed addresses', () => {
    expect(redactEmail('not-an-email')).toBe('not-an-email');
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npm test -- tests/lib/redactEmail.test.ts`
Expected: failures — module not found.

- [ ] **Step 3: Implement `src/lib/redactEmail.ts`**

```ts
export function redactEmail(email: string): string {
  const at = email.indexOf('@');
  if (at <= 0 || at === email.length - 1) return email;

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const dot = domain.lastIndexOf('.');
  if (dot <= 0) return email;

  const domainName = domain.slice(0, dot);
  const tld = domain.slice(dot + 1);

  return `${maskMiddle(local)}@${maskMiddle(domainName)}.${tld}`;
}

function maskMiddle(s: string): string {
  if (s.length <= 1) return s;
  if (s.length === 2) return `${s[0]}*`;
  return `${s[0]}${'*'.repeat(s.length - 2)}${s[s.length - 1]}`;
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npm test -- tests/lib/redactEmail.test.ts`
Expected: all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/redactEmail.ts tests/lib/redactEmail.test.ts
git commit -m "Add email redaction helper"
```

---

## Task 5: Implement `lib/turnstile.ts` — Turnstile verification

**Files:**
- Create: `src/lib/turnstile.ts`
- Test: `tests/lib/turnstile.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/turnstile.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { verifyTurnstileToken } from '../../src/lib/turnstile';

describe('verifyTurnstileToken', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns true when Cloudflare confirms success', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    );
    const result = await verifyTurnstileToken('a-token', 'secret', '1.2.3.4');
    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns false when Cloudflare reports a bad token', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ success: false }), { status: 200 }),
    );
    const result = await verifyTurnstileToken('bad', 'secret');
    expect(result).toBe(false);
  });

  it('returns false on network errors', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));
    const result = await verifyTurnstileToken('a-token', 'secret');
    expect(result).toBe(false);
  });

  it('returns false on non-200 responses', async () => {
    fetchMock.mockResolvedValue(new Response('boom', { status: 500 }));
    const result = await verifyTurnstileToken('a-token', 'secret');
    expect(result).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npm test -- tests/lib/turnstile.test.ts`
Expected: module not found.

- [ ] **Step 3: Implement `src/lib/turnstile.ts`**

```ts
const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verifyTurnstileToken(
  token: string,
  secret: string,
  remoteIP?: string,
): Promise<boolean> {
  if (!token || !secret) return false;

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIP) body.append('remoteip', remoteIP);

  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      body,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    });
    if (!response.ok) return false;
    const data = (await response.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npm test -- tests/lib/turnstile.test.ts`
Expected: 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/turnstile.ts tests/lib/turnstile.test.ts
git commit -m "Add Cloudflare Turnstile verification helper"
```

---

## Task 6: Implement `lib/paddle.ts` — Paddle Classic pay-link generator

**Files:**
- Create: `src/lib/paddle.ts`
- Test: `tests/lib/paddle.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/paddle.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generatePayLink } from '../../src/lib/paddle';

describe('generatePayLink', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the URL Paddle sends back', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ success: true, response: { url: 'https://pay.paddle.com/abc' } }),
        { status: 200 },
      ),
    );

    const result = await generatePayLink({
      vendorId: 9922,
      vendorAuthCode: 'secret',
      productId: '499167',
      customerEmail: 'a@example.com',
      finalPriceUSD: 12.5,
      today: new Date('2026-05-14T00:00:00Z'),
    });

    expect(result).toEqual({ url: 'https://pay.paddle.com/abc' });

    const [callUrl, callInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(callUrl).toBe('https://vendors.paddle.com/api/2.0/product/generate_pay_link');
    expect(callInit.method).toBe('POST');
    const body = callInit.body as URLSearchParams;
    expect(body.get('vendor_id')).toBe('9922');
    expect(body.get('vendor_auth_code')).toBe('secret');
    expect(body.get('product_id')).toBe('499167');
    expect(body.get('prices')).toBe('USD:12.50');
    expect(body.get('customer_email')).toBe('a@example.com');
    expect(body.get('expires')).toBe('2026-05-21');
  });

  it('throws when Paddle reports failure', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ success: false, error: { message: 'nope' } }), {
        status: 200,
      }),
    );

    await expect(
      generatePayLink({
        vendorId: 9922,
        vendorAuthCode: 'secret',
        productId: '499167',
        customerEmail: 'a@example.com',
        finalPriceUSD: 0,
      }),
    ).rejects.toThrow(/Paddle/);
  });

  it('throws on network errors', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));

    await expect(
      generatePayLink({
        vendorId: 9922,
        vendorAuthCode: 'secret',
        productId: '499167',
        customerEmail: 'a@example.com',
        finalPriceUSD: 0,
      }),
    ).rejects.toThrow(/network down/);
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npm test -- tests/lib/paddle.test.ts`
Expected: module not found.

- [ ] **Step 3: Implement `src/lib/paddle.ts`**

```ts
const ENDPOINT = 'https://vendors.paddle.com/api/2.0/product/generate_pay_link';
const EXPIRES_AFTER_DAYS = 7;

export type GeneratePayLinkArgs = {
  vendorId: number;
  vendorAuthCode: string;
  productId: string;
  customerEmail: string;
  finalPriceUSD: number;
  today?: Date;
};

export async function generatePayLink(args: GeneratePayLinkArgs): Promise<{ url: string }> {
  const today = args.today ?? new Date();
  const expires = addDays(today, EXPIRES_AFTER_DAYS);

  const body = new URLSearchParams({
    vendor_id: String(args.vendorId),
    vendor_auth_code: args.vendorAuthCode,
    product_id: args.productId,
    prices: `USD:${args.finalPriceUSD.toFixed(2)}`,
    customer_email: args.customerEmail,
    marketing_consent: '0',
    expires: toIsoDate(expires),
  });

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    body,
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
  });

  const data = (await response.json()) as PaddleResponse;
  if (!data.success || !data.response?.url) {
    const message = data.error?.message ?? 'unknown error';
    throw new Error(`Paddle generate_pay_link failed: ${message}`);
  }

  return { url: data.response.url };
}

type PaddleResponse = {
  success: boolean;
  response?: { url: string };
  error?: { message: string };
};

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npm test -- tests/lib/paddle.test.ts`
Expected: 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/paddle.ts tests/lib/paddle.test.ts
git commit -m "Add Paddle Classic pay-link generator"
```

---

## Task 7: Implement `lib/vision.ts` — OpenAI receipt extraction

**Files:**
- Create: `src/lib/vision.ts`
- Test: `tests/lib/vision.test.ts`
- Modify: `package.json` (dependency)

- [ ] **Step 1: Install the OpenAI SDK**

Run: `npm install openai`

Expected: `openai` added to `dependencies` in `package.json`.

- [ ] **Step 2: Write the failing tests**

Create `tests/lib/vision.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { extractReceipt } from '../../src/lib/vision';

const createMock = vi.fn();

vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = { completions: { create: createMock } };
    },
  };
});

describe('extractReceipt', () => {
  it('returns the parsed JSON when the model responds', async () => {
    createMock.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              isColorSnapperReceipt: true,
              email: 'a@example.com',
              purchaseDate: '2025-08-01',
              confidence: 'high',
            }),
          },
        },
      ],
    });

    const result = await extractReceipt({
      apiKey: 'sk-test',
      fileBuffer: Buffer.from('fake'),
      mimeType: 'image/png',
    });

    expect(result).toEqual({
      isColorSnapperReceipt: true,
      email: 'a@example.com',
      purchaseDate: '2025-08-01',
      confidence: 'high',
    });
  });

  it('throws when the model returns empty content', async () => {
    createMock.mockResolvedValue({ choices: [{ message: { content: '' } }] });

    await expect(
      extractReceipt({
        apiKey: 'sk-test',
        fileBuffer: Buffer.from('fake'),
        mimeType: 'image/png',
      }),
    ).rejects.toThrow(/empty/i);
  });

  it('throws when the JSON does not match the schema', async () => {
    createMock.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ wrong: 'shape' }) } }],
    });

    await expect(
      extractReceipt({
        apiKey: 'sk-test',
        fileBuffer: Buffer.from('fake'),
        mimeType: 'image/png',
      }),
    ).rejects.toThrow(/invalid/i);
  });
});
```

- [ ] **Step 3: Run the tests and confirm they fail**

Run: `npm test -- tests/lib/vision.test.ts`
Expected: module not found.

- [ ] **Step 4: Implement `src/lib/vision.ts`**

```ts
import OpenAI from 'openai';

const MODEL = 'gpt-4o-mini';

const PROMPT = `You are validating a Mac App Store receipt for the macOS application "ColorSnapper" (also known as "ColorSnapper 2"). The user has uploaded an image or PDF of their purchase receipt. Examine it and return JSON matching the provided schema.

Rules:
- isColorSnapperReceipt: true ONLY if "ColorSnapper" or "ColorSnapper 2" is clearly visible as a product line on the receipt. Otherwise false.
- email: the Apple ID email address shown on the receipt (typically near the top), or null if not clearly legible.
- purchaseDate: the date the ColorSnapper item was purchased, formatted as "yyyy-mm-dd". If the receipt lists multiple products, use the date associated with the ColorSnapper line. Return null if the date is not clearly legible.
- confidence: "high", "medium", or "low" — your overall confidence in the extraction.

Do not infer the date from anything other than text printed on the receipt. Do not guess.`;

const SCHEMA = {
  type: 'object' as const,
  properties: {
    isColorSnapperReceipt: { type: 'boolean' as const },
    email: { type: ['string', 'null'] as const },
    purchaseDate: { type: ['string', 'null'] as const },
    confidence: { type: 'string' as const, enum: ['high', 'medium', 'low'] as const },
  },
  required: ['isColorSnapperReceipt', 'email', 'purchaseDate', 'confidence'] as const,
  additionalProperties: false as const,
};

export type ReceiptExtraction = {
  isColorSnapperReceipt: boolean;
  email: string | null;
  purchaseDate: string | null;
  confidence: 'high' | 'medium' | 'low';
};

export type ExtractReceiptArgs = {
  apiKey: string;
  fileBuffer: Buffer;
  mimeType: string;
};

export async function extractReceipt(args: ExtractReceiptArgs): Promise<ReceiptExtraction> {
  const client = new OpenAI({ apiKey: args.apiKey });
  const dataUrl = `data:${args.mimeType};base64,${args.fileBuffer.toString('base64')}`;

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: PROMPT },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'receipt_extraction', strict: true, schema: SCHEMA },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Vision API returned empty content');
  }

  const parsed = JSON.parse(content) as Partial<ReceiptExtraction>;
  if (
    typeof parsed.isColorSnapperReceipt !== 'boolean' ||
    !('email' in parsed) ||
    !('purchaseDate' in parsed) ||
    !parsed.confidence
  ) {
    throw new Error('Vision API returned invalid JSON shape');
  }

  return parsed as ReceiptExtraction;
}
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `npm test -- tests/lib/vision.test.ts`
Expected: 3 tests green.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/lib/vision.ts tests/lib/vision.test.ts
git commit -m "Add OpenAI vision receipt extraction"
```

---

## Task 8: Implement `pages/api/upgrade-request.ts` — endpoint orchestration

**Files:**
- Create: `src/pages/api/upgrade-request.ts`
- Test: `tests/api/upgrade-request.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/api/upgrade-request.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const verifyTurnstileToken = vi.fn();
const extractReceipt = vi.fn();
const generatePayLink = vi.fn();

vi.mock('../../src/lib/turnstile', () => ({ verifyTurnstileToken }));
vi.mock('../../src/lib/vision', () => ({ extractReceipt }));
vi.mock('../../src/lib/paddle', () => ({ generatePayLink }));

const ENV = {
  TURNSTILE_SECRET_KEY: 'turnstile-secret',
  OPENAI_API_KEY: 'openai-key',
  PADDLE_VENDOR_AUTH_CODE: 'paddle-secret',
};

beforeEach(() => {
  verifyTurnstileToken.mockReset();
  extractReceipt.mockReset();
  generatePayLink.mockReset();
  for (const [key, value] of Object.entries(ENV)) {
    process.env[key] = value;
  }
});

async function call(formData: FormData) {
  const { POST } = await import('../../src/pages/api/upgrade-request');
  const request = new Request('http://localhost/api/upgrade-request', {
    method: 'POST',
    body: formData,
  });
  return POST({ request, clientAddress: '1.2.3.4' } as Parameters<typeof POST>[0]);
}

function buildForm(opts: { token?: string; file?: Blob | null } = {}): FormData {
  const fd = new FormData();
  fd.set('turnstileToken', opts.token ?? 'token');
  if (opts.file !== null) {
    fd.set('receipt', opts.file ?? new Blob(['fake'], { type: 'image/png' }), 'receipt.png');
  }
  return fd;
}

describe('POST /api/upgrade-request', () => {
  it('returns 403 when Turnstile rejects the token', async () => {
    verifyTurnstileToken.mockResolvedValue(false);
    const res = await call(buildForm());
    expect(res.status).toBe(403);
  });

  it('returns 400 when no file is uploaded', async () => {
    verifyTurnstileToken.mockResolvedValue(true);
    const fd = new FormData();
    fd.set('turnstileToken', 'token');
    const res = await call(fd);
    expect(res.status).toBe(400);
  });

  it('returns 400 when file is too large', async () => {
    verifyTurnstileToken.mockResolvedValue(true);
    const bigBlob = new Blob([new Uint8Array(6 * 1024 * 1024)], { type: 'image/png' });
    const res = await call(buildForm({ file: bigBlob }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when file has wrong MIME type', async () => {
    verifyTurnstileToken.mockResolvedValue(true);
    const badBlob = new Blob(['text'], { type: 'text/plain' });
    const res = await call(buildForm({ file: badBlob }));
    expect(res.status).toBe(400);
  });

  it('returns 422 when vision says not a ColorSnapper receipt', async () => {
    verifyTurnstileToken.mockResolvedValue(true);
    extractReceipt.mockResolvedValue({
      isColorSnapperReceipt: false,
      email: null,
      purchaseDate: null,
      confidence: 'high',
    });
    const res = await call(buildForm());
    expect(res.status).toBe(422);
  });

  it('returns 422 when email is missing', async () => {
    verifyTurnstileToken.mockResolvedValue(true);
    extractReceipt.mockResolvedValue({
      isColorSnapperReceipt: true,
      email: null,
      purchaseDate: '2025-08-01',
      confidence: 'medium',
    });
    const res = await call(buildForm());
    expect(res.status).toBe(422);
  });

  it('falls back to the lowest tier when date is missing', async () => {
    verifyTurnstileToken.mockResolvedValue(true);
    extractReceipt.mockResolvedValue({
      isColorSnapperReceipt: true,
      email: 'a@example.com',
      purchaseDate: null,
      confidence: 'low',
    });
    generatePayLink.mockResolvedValue({ url: 'https://pay.paddle.com/abc' });

    const res = await call(buildForm());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.discountPercent).toBe(25);
    expect(body.dateMissing).toBe(true);
    expect(body.checkoutUrl).toBe('https://pay.paddle.com/abc');
    expect(body.redactedEmail).toBe('a@e******e.com');
  });

  it('happy path returns checkout URL, tier and redacted email', async () => {
    verifyTurnstileToken.mockResolvedValue(true);
    extractReceipt.mockResolvedValue({
      isColorSnapperReceipt: true,
      email: 'andrey@okonet.dev',
      purchaseDate: '2026-01-01',
      confidence: 'high',
    });
    generatePayLink.mockResolvedValue({ url: 'https://pay.paddle.com/xyz' });

    const res = await call(buildForm());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.discountPercent).toBe(100);
    expect(body.finalPrice).toBe(0);
    expect(body.checkoutUrl).toBe('https://pay.paddle.com/xyz');
    expect(body.redactedEmail).toBe('a****y@o*****t.dev');
    expect(generatePayLink).toHaveBeenCalledWith(
      expect.objectContaining({ customerEmail: 'andrey@okonet.dev', finalPriceUSD: 0 }),
    );
  });

  it('returns 502 when Paddle throws', async () => {
    verifyTurnstileToken.mockResolvedValue(true);
    extractReceipt.mockResolvedValue({
      isColorSnapperReceipt: true,
      email: 'a@example.com',
      purchaseDate: '2026-01-01',
      confidence: 'high',
    });
    generatePayLink.mockRejectedValue(new Error('paddle down'));

    const res = await call(buildForm());
    expect(res.status).toBe(502);
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npm test -- tests/api/upgrade-request.test.ts`
Expected: module not found.

- [ ] **Step 3: Implement `src/pages/api/upgrade-request.ts`**

```ts
import type { APIRoute } from 'astro';
import { site } from '../../site.config';
import { tierFor, ORIGINAL_PRICE_USD } from '../../lib/discount';
import { redactEmail } from '../../lib/redactEmail';
import { verifyTurnstileToken } from '../../lib/turnstile';
import { extractReceipt } from '../../lib/vision';
import { generatePayLink } from '../../lib/paddle';

export const prerender = false;

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'application/pdf']);

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const env = readEnv();
  if (!env) return json(500, { error: 'server_misconfigured' });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json(400, { error: 'invalid_request' });
  }

  const token = form.get('turnstileToken');
  if (typeof token !== 'string' || !token) {
    return json(403, { error: 'missing_token' });
  }

  const turnstileOk = await verifyTurnstileToken(token, env.turnstileSecret, clientAddress);
  if (!turnstileOk) return json(403, { error: 'bad_token' });

  const file = form.get('receipt');
  if (!(file instanceof Blob) || file.size === 0) {
    return json(400, { error: 'missing_file' });
  }
  if (file.size > MAX_FILE_BYTES) {
    return json(400, { error: 'file_too_large' });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return json(400, { error: 'unsupported_file_type' });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let extraction;
  try {
    extraction = await extractReceipt({
      apiKey: env.openAIKey,
      fileBuffer: buffer,
      mimeType: file.type,
    });
  } catch {
    return json(502, { error: 'vision_failed' });
  }

  if (!extraction.isColorSnapperReceipt) {
    return json(422, { error: 'not_colorsnapper_receipt' });
  }
  if (!extraction.email) {
    return json(422, { error: 'email_unreadable' });
  }

  const purchaseDate = extraction.purchaseDate ? new Date(extraction.purchaseDate) : null;
  const tier = purchaseDate && !Number.isNaN(purchaseDate.getTime())
    ? tierFor(purchaseDate)
    : tierFor(new Date(0)); // missing date => lowest tier
  const dateMissing = !extraction.purchaseDate;

  let payLink;
  try {
    payLink = await generatePayLink({
      vendorId: site.paddleVendorId,
      vendorAuthCode: env.paddleAuth,
      productId: site.paddleProductId,
      customerEmail: extraction.email,
      finalPriceUSD: tier.finalPriceUSD,
    });
  } catch {
    return json(502, { error: 'paddle_failed' });
  }

  return json(200, {
    checkoutUrl: payLink.url,
    discountPercent: tier.discountPercent,
    originalPrice: ORIGINAL_PRICE_USD,
    finalPrice: tier.finalPriceUSD,
    redactedEmail: redactEmail(extraction.email),
    dateMissing,
  });
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function readEnv():
  | { turnstileSecret: string; openAIKey: string; paddleAuth: string }
  | null {
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
  const openAIKey = process.env.OPENAI_API_KEY;
  const paddleAuth = process.env.PADDLE_VENDOR_AUTH_CODE;
  if (!turnstileSecret || !openAIKey || !paddleAuth) return null;
  return { turnstileSecret, openAIKey, paddleAuth };
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npm test -- tests/api/upgrade-request.test.ts`
Expected: 9 tests green.

- [ ] **Step 5: Run the full test suite to confirm nothing regressed**

Run: `npm test`
Expected: all tests across all files pass.

- [ ] **Step 6: Commit**

```bash
git add src/pages/api/upgrade-request.ts tests/api/upgrade-request.test.ts
git commit -m "Add /api/upgrade-request endpoint"
```

---

## Task 9: Build `src/pages/upgrade.astro` — form page

**Files:**
- Create: `src/pages/upgrade.astro`, `src/styles/_upgrade.scss`
- Modify: `src/styles/main.scss`

- [ ] **Step 1: Create the page**

Create `src/pages/upgrade.astro`:

```astro
---
import PageLayout from '../layouts/PageLayout.astro';
import { site } from '../site.config';

const turnstileSiteKey = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY;
---

<PageLayout title="Upgrade from Mac App Store">
  <section class="upgrade">
    <p class="upgrade__intro">
      Upload your Mac App Store receipt (screenshot or PDF) and we'll automatically
      apply a discount based on when you originally bought ColorSnapper. Your
      license will be sent to the email shown on the receipt.
    </p>

    <form class="upgrade__form" id="upgrade-form" novalidate>
      <label class="upgrade__drop" for="receipt-input">
        <span class="upgrade__drop-text">
          Drop your receipt here, or click to choose a file<br />
          <small>PNG, JPG, WebP, or PDF · up to 5 MB</small>
        </span>
        <input
          id="receipt-input"
          name="receipt"
          type="file"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          required
        />
      </label>

      <div
        class="cf-turnstile upgrade__turnstile"
        data-sitekey={turnstileSiteKey}
      ></div>

      <button class="upgrade__submit" type="submit">Verify and continue</button>
      <p class="upgrade__error" id="upgrade-error" hidden></p>
    </form>

    <section class="upgrade__result" id="upgrade-result" hidden></section>

    <p class="upgrade__fallback">
      Receipt not recognized, or something else not working?
      <a href={`mailto:${site.email}`}>Email {site.email}</a> and we'll help.
    </p>
  </section>

  <script
    src="https://challenges.cloudflare.com/turnstile/v0/api.js"
    async
    defer
    is:inline
  ></script>
  <script
    src="https://cdn.paddle.com/paddle/paddle.js"
    is:inline
  ></script>
  <script define:vars={{ vendorId: site.paddleVendorId }} is:inline>
    Paddle.Setup({ vendor: vendorId });
  </script>
  <script>
    import '../scripts/upgrade.ts';
  </script>
</PageLayout>
```

- [ ] **Step 2: Create the stylesheet**

Create `src/styles/_upgrade.scss`:

```scss
.upgrade {
  max-width: 36rem;
  margin: 0 auto;
}

.upgrade__intro {
  margin-bottom: 1.5rem;
}

.upgrade__form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.upgrade__drop {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 8rem;
  padding: 1rem;
  border: 2px dashed #c2c2c2;
  border-radius: 8px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;

  &.is-hover {
    border-color: #4f7cff;
    background-color: #f4f7ff;
  }

  input[type='file'] {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }
}

.upgrade__drop-text small {
  display: inline-block;
  margin-top: 0.5rem;
  color: #666;
}

.upgrade__submit {
  align-self: flex-start;
  padding: 0.75rem 1.25rem;
  font: inherit;
  cursor: pointer;
}

.upgrade__error {
  color: #c0392b;
}

.upgrade__result {
  padding: 1.5rem;
  background-color: #f4f7ff;
  border-radius: 8px;
}

.upgrade__fallback {
  margin-top: 2rem;
  color: #666;
}
```

- [ ] **Step 3: Wire the partial into `src/styles/main.scss`**

Open `src/styles/main.scss` and add `@use 'upgrade';` next to the other partial `@use` lines (alphabetical order if the file is sorted).

- [ ] **Step 4: Run the dev server and load the page**

Run: `npm run dev`
Open `http://localhost:4321/upgrade/`.
Expected: the form renders, drop zone is visible, Turnstile widget appears below it, Paddle script loads without console errors.

(Until the client script in Task 10 exists, submitting the form does nothing useful — that is fine for now.)

- [ ] **Step 5: Commit**

```bash
git add src/pages/upgrade.astro src/styles/_upgrade.scss src/styles/main.scss
git commit -m "Add /upgrade/ form page"
```

---

## Task 10: Build `src/scripts/upgrade.ts` — client-side wiring

**Files:**
- Create: `src/scripts/upgrade.ts`

The client script intentionally avoids `innerHTML` for any content that mixes server data into the DOM. All server-provided strings (the redacted email in particular) are placed via `textContent` only. The success and final states are constructed with `createElement` so there is no XSS surface even if a future change loosens server-side validation.

- [ ] **Step 1: Create the client script**

Create `src/scripts/upgrade.ts`:

```ts
// @ts-nocheck
type SuccessResponse = {
  checkoutUrl: string;
  discountPercent: number;
  originalPrice: number;
  finalPrice: number;
  redactedEmail: string;
  dateMissing: boolean;
};

const ERROR_MESSAGES: Record<string, string> = {
  bad_token: 'Please refresh the page and try again.',
  missing_token: 'Please complete the verification challenge and try again.',
  missing_file: 'Please choose a receipt file to upload.',
  file_too_large: 'That file is larger than 5 MB. Please upload a smaller file.',
  unsupported_file_type: 'Please upload a PNG, JPG, WebP, or PDF file.',
  not_colorsnapper_receipt:
    "This doesn't look like a ColorSnapper Mac App Store receipt. Please try a different file or email support.",
  email_unreadable:
    "We couldn't read the email on your receipt. Please email support and we'll help.",
  vision_failed: 'Something went wrong reading your receipt. Please try again in a moment.',
  paddle_failed: 'Something went wrong creating your checkout. Please try again in a moment.',
};

const form = document.getElementById('upgrade-form') as HTMLFormElement | null;
const fileInput = document.getElementById('receipt-input') as HTMLInputElement | null;
const dropLabel = form?.querySelector<HTMLLabelElement>('.upgrade__drop');
const errorEl = document.getElementById('upgrade-error') as HTMLParagraphElement | null;
const resultEl = document.getElementById('upgrade-result') as HTMLElement | null;
const submitBtn = form?.querySelector<HTMLButtonElement>('.upgrade__submit');

if (form && fileInput && dropLabel && errorEl && resultEl && submitBtn) {
  bindDropZone(dropLabel, fileInput);
  form.addEventListener('submit', handleSubmit);
}

function bindDropZone(label: HTMLLabelElement, input: HTMLInputElement) {
  ['dragenter', 'dragover'].forEach((name) =>
    label.addEventListener(name, (e) => {
      e.preventDefault();
      label.classList.add('is-hover');
    }),
  );
  ['dragleave', 'drop'].forEach((name) =>
    label.addEventListener(name, (e) => {
      e.preventDefault();
      label.classList.remove('is-hover');
    }),
  );
  label.addEventListener('drop', (e) => {
    const dt = (e as DragEvent).dataTransfer;
    if (dt?.files?.[0]) {
      input.files = dt.files;
    }
  });
}

async function handleSubmit(e: SubmitEvent) {
  e.preventDefault();
  hideError();

  if (!fileInput?.files?.[0]) {
    showError('Please choose a receipt file to upload.');
    return;
  }

  const tokenEl = document.querySelector<HTMLInputElement>(
    'input[name="cf-turnstile-response"]',
  );
  const token = tokenEl?.value ?? '';
  if (!token) {
    showError(ERROR_MESSAGES.missing_token);
    return;
  }

  const fd = new FormData();
  fd.set('receipt', fileInput.files[0]);
  fd.set('turnstileToken', token);

  setLoading(true);
  try {
    const res = await fetch('/api/upgrade-request', { method: 'POST', body: fd });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      showError(ERROR_MESSAGES[data.error] ?? 'Something went wrong. Please try again.');
      return;
    }

    showResult(data as SuccessResponse);
  } catch (err) {
    showError('Network error. Please try again.');
  } finally {
    setLoading(false);
  }
}

function clearChildren(el: HTMLElement) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

function appendParagraph(parent: HTMLElement, build: (p: HTMLParagraphElement) => void) {
  const p = document.createElement('p');
  build(p);
  parent.appendChild(p);
}

function showResult(data: SuccessResponse) {
  form!.hidden = true;
  resultEl!.hidden = false;
  clearChildren(resultEl!);

  const heading = document.createElement('h2');
  heading.textContent = 'Receipt verified';
  resultEl!.appendChild(heading);

  appendParagraph(resultEl!, (p) => {
    p.appendChild(document.createTextNode('You qualify for '));
    const pct = document.createElement('strong');
    pct.textContent = `${data.discountPercent}% off`;
    p.appendChild(pct);
    p.appendChild(document.createTextNode(' — your price is '));
    const price = document.createElement('strong');
    price.textContent = `$${data.finalPrice.toFixed(2)}`;
    p.appendChild(price);
    p.appendChild(document.createTextNode('.'));
  });

  appendParagraph(resultEl!, (p) => {
    p.appendChild(document.createTextNode('License will be sent to '));
    const email = document.createElement('strong');
    email.textContent = data.redactedEmail;
    p.appendChild(email);
    p.appendChild(document.createTextNode(' after checkout.'));
  });

  if (data.dateMissing) {
    appendParagraph(resultEl!, (p) => {
      const em = document.createElement('em');
      em.textContent =
        'We could not read the purchase date on your receipt, so we applied our minimum discount. Email support if you think you qualified for more.';
      p.appendChild(em);
    });
  }

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'open-checkout';
  btn.textContent = 'Continue to checkout';
  btn.addEventListener('click', () => openCheckout(data.checkoutUrl));
  resultEl!.appendChild(btn);
}

function openCheckout(url: string) {
  Paddle.Checkout.open({
    override: url,
    successCallback: () => {
      clearChildren(resultEl!);
      const heading = document.createElement('h2');
      heading.textContent = 'Thanks!';
      resultEl!.appendChild(heading);
      appendParagraph(resultEl!, (p) => {
        p.textContent =
          "We've sent your license to the email shown on your receipt. If you don't see it shortly, check your spam folder, then email support.";
      });
    },
  });
}

function showError(message: string) {
  errorEl!.textContent = message;
  errorEl!.hidden = false;
}

function hideError() {
  errorEl!.hidden = true;
  errorEl!.textContent = '';
}

function setLoading(loading: boolean) {
  submitBtn!.disabled = loading;
  submitBtn!.textContent = loading ? 'Verifying…' : 'Verify and continue';
}
```

- [ ] **Step 2: Smoke test the page in dev**

Run: `npm run dev`. Open `http://localhost:4321/upgrade/`.

Verify:
- Drop zone responds to drag-enter (border color changes)
- Choosing a file via the file picker updates the underlying input
- Submitting without a file shows an inline error
- (Full end-to-end success path requires the env vars from Task 13 set in the local dev environment — defer the success-path smoke test to manual testing in Task 14.)

- [ ] **Step 3: Commit**

```bash
git add src/scripts/upgrade.ts
git commit -m "Add /upgrade/ client-side form handler"
```

---

## Task 11: Update FAQ to link to the new page

**Files:**
- Modify: `src/pages/faq.md`

- [ ] **Step 1: Edit the FAQ**

Open `src/pages/faq.md` and replace the body of the section titled `## Why ColorSnapper isn't available on the Mac App Store anymore?` so that it reads:

```markdown
## Why ColorSnapper isn't available on the Mac App Store anymore?

Unfortunately, we had to remove the Mac App Store version after Apple decided to block any further updates all of the sudden (we didn't change how the application works but they claim that we're using their Screen Recording API inappropriately). If you bought ColorSnapper on the Mac App Store, you can [upgrade to the standalone version here](/upgrade/) — upload your MAS receipt and we'll automatically apply a discount based on when you bought it.
```

- [ ] **Step 2: Smoke test the FAQ page**

Run: `npm run dev`. Open `http://localhost:4321/faq/`. Confirm the section renders the new link and clicking it navigates to `/upgrade/`.

- [ ] **Step 3: Commit**

```bash
git add src/pages/faq.md
git commit -m "Link FAQ to automated upgrade flow"
```

---

## Task 12: Update Privacy policy

**Files:**
- Modify: `src/pages/privacy.md`

- [ ] **Step 1: Add a new section to `privacy.md`**

Open `src/pages/privacy.md`. After the existing `## Data protection` section and before `## Notice concerning the party responsible for this website`, add:

```markdown
## Mac App Store upgrade requests

If you submit a Mac App Store receipt through our automated upgrade page at
[/upgrade/](/upgrade/), the uploaded image or PDF is sent to OpenAI for
automated extraction of the purchase date and Apple ID email shown on the
receipt. We do not store the uploaded file or the extracted data on our own
servers. The extracted email is only used to prefill the Paddle checkout so
the resulting license is delivered to the original purchaser.
```

- [ ] **Step 2: Smoke test the privacy page**

Run: `npm run dev`. Open `http://localhost:4321/privacy/`. Confirm the new section appears in the correct place.

- [ ] **Step 3: Commit**

```bash
git add src/pages/privacy.md
git commit -m "Add /upgrade/ note to privacy policy"
```

---

## Task 13: Document and configure environment variables

**Files:**
- Create: `docs/superpowers/runbooks/mas-auto-migration-env.md`

- [ ] **Step 1: Create the runbook**

Create `docs/superpowers/runbooks/mas-auto-migration-env.md`:

```markdown
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
```

- [ ] **Step 2: Check `.gitignore` covers `.env`**

Run: `grep -n "^\.env" .gitignore || echo "missing"`
If the output is `missing`, append `.env` to `.gitignore` and commit it.

- [ ] **Step 3: Set env vars in Netlify**

This step is operator-driven, not automated. Log into the Netlify dashboard, navigate to the project's environment variables page, and add the four variables listed in the runbook with the appropriate values.

- [ ] **Step 4: Commit the runbook**

```bash
git add docs/superpowers/runbooks/mas-auto-migration-env.md
git commit -m "Document /upgrade/ environment variables"
```

---

## Task 14: Final smoke test before deploy

**Files:** none.

- [ ] **Step 1: Run the full test suite locally**

Run: `npm test`
Expected: all tests pass across `tests/lib/*` and `tests/api/*`.

- [ ] **Step 2: Run the type checker**

Run: `npm run check`
Expected: no errors.

- [ ] **Step 3: Run a production build locally**

Run: `npm run build`
Expected: build completes. `dist/` contains the static pages and a Netlify Function entry for the new API route.

- [ ] **Step 4: Manual smoke test against the live Netlify deploy**

After merging to `master` and waiting for Netlify to deploy:

1. **Receipt not a ColorSnapper purchase:** Upload an unrelated screenshot (e.g. an Amazon receipt). Expect the "this doesn't look like a ColorSnapper MAS receipt" error message in the form.

2. **Real recent receipt (< 18 months):** Upload a real receipt from the last 18 months. Expect the success card to show 100% off and `$0.00`. Click "Continue to checkout" and confirm Paddle's overlay opens with the right product and a $0 total. Do not complete the purchase unless you intend to.

3. **Real ~2-year-old receipt:** Upload a real 18–48 month receipt. Expect 50% off. Confirm checkout overlay shows the half-price total.

4. **Real 5+-year-old receipt:** Upload a real 4+ year receipt. Expect 25% off.

5. **Receipt with unreadable date:** Upload a deliberately cropped or low-quality receipt where the email is visible but the date is not. Expect the success card with the 25% tier and the "we couldn't read the date" hint.

6. **Receipt with unreadable email:** Upload a deliberately cropped receipt where the date is visible but the email is not. Expect the "we couldn't read the email" error.

7. **Bot defense:** Open the page, disable JavaScript briefly to skip Turnstile, and submit. Expect a 403 response.

If all seven scenarios behave as described, the feature is ready.

- [ ] **Step 5: Close the loop**

Confirm the FAQ link from `/faq/` lands on the new page and the privacy policy section is live. No commit needed.

---

## Self-Review Results

After writing the plan I checked it against the spec:

- **Spec coverage:** Every spec section maps to a task. The discount tiers, the vision extraction shape, the failure-mode table, abuse considerations, env vars, FAQ + privacy updates, and the manual smoke checklist are all present.
- **Placeholder scan:** No TBDs, no "implement later," no "similar to Task N." The one operator-driven step (Task 13, Step 3 — setting env vars in Netlify) is explicit about being manual.
- **Type consistency:** `tierFor`, `DiscountResult`, `ReceiptExtraction`, `ExtractReceiptArgs`, `GeneratePayLinkArgs`, `verifyTurnstileToken` and `redactEmail` signatures are consistent across the tasks that reference them.
- **XSS guard:** The client script in Task 10 builds all DOM nodes via `createElement` + `textContent` rather than `innerHTML`, so the redacted-email and other server-provided strings cannot inject HTML even if server-side validation regresses.
- **Known design caveats restated:** The Paddle zero-total pay link and `Paddle.Checkout.open({ override })` behaviors are flagged in the spec's "Implementation risks" section. The manual smoke test (Task 14, Step 4, scenarios 2 and 7) is where these get confirmed end-to-end.
