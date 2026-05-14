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
