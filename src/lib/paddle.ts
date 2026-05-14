import crypto from 'node:crypto';

const ENDPOINT = 'https://vendors.paddle.com/api/2.1/product/create_coupon';
const EXPIRES_AFTER_DAYS = 7;

export type CreateCouponArgs = {
  vendorId: number;
  vendorAuthCode: string;
  productId: string;
  customerEmail: string;
  discountPercent: number;
  today?: Date;
};

/**
 * Derive a stable per-(email, discount) coupon code so re-uploading the same
 * receipt reuses the existing coupon instead of minting a new one each time.
 * The auth code doubles as the HMAC salt — leaking the code wouldn't let an
 * attacker reverse it, and we never need to look up the salt.
 */
export function couponCodeFor(
  email: string,
  discountPercent: number,
  salt: string,
): string {
  const hash = crypto
    .createHash('sha256')
    .update(email.trim().toLowerCase())
    .update(':')
    .update(String(discountPercent))
    .update(':')
    .update(salt)
    .digest('hex');
  return `MAS-${hash.slice(0, 8).toUpperCase()}`;
}

export async function createCoupon(args: CreateCouponArgs): Promise<{ code: string }> {
  const today = args.today ?? new Date();
  const expires = addDays(today, EXPIRES_AFTER_DAYS);
  const code = couponCodeFor(args.customerEmail, args.discountPercent, args.vendorAuthCode);

  const body = new URLSearchParams({
    vendor_id: String(args.vendorId),
    vendor_auth_code: args.vendorAuthCode,
    coupon_type: 'product',
    product_ids: args.productId,
    discount_type: 'percentage',
    discount_amount: String(args.discountPercent),
    allowed_uses: '1',
    num_coupons: '1',
    expires: toIsoDate(expires),
    recurring: '0',
    coupon_code: code,
  });

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    body,
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
  });

  const data = (await response.json()) as PaddleResponse;
  if (data.success && data.response?.coupon_codes?.[0]) {
    return { code: data.response.coupon_codes[0] };
  }

  const message = data.error?.message ?? '';
  if (looksLikeDuplicateCodeError(message)) {
    // Paddle already has this exact coupon — same email + same tier
    // produces the same code by design, so reuse it.
    return { code };
  }

  throw new Error(`Paddle create_coupon failed: ${message || 'unknown error'}`);
}

function looksLikeDuplicateCodeError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes('already') || lower.includes('exists') || lower.includes('taken');
}

type PaddleResponse = {
  success: boolean;
  response?: { coupon_codes?: string[] };
  error?: { code?: number; message: string };
};

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
