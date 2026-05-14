const ENDPOINT = 'https://vendors.paddle.com/api/2.1/product/create_coupon';
const EXPIRES_AFTER_DAYS = 7;
const COUPON_PREFIX = 'MAS-';

export type CreateCouponArgs = {
  vendorId: number;
  vendorAuthCode: string;
  productId: string;
  discountPercent: number;
  /** Used as the coupon suffix so codes are stable and easy to audit. */
  orderId?: string | null;
  today?: Date;
};

/**
 * The coupon code is just MAS-<order id>. Apple order IDs are globally unique
 * alphanumerics, so two uploads of the same receipt produce the same code and
 * Paddle's dashboard makes it trivial to trace a coupon back to the order.
 */
export function couponCodeFor(orderId: string): string {
  const cleanOrderId = orderId.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return `${COUPON_PREFIX}${cleanOrderId}`;
}

export async function createCoupon(args: CreateCouponArgs): Promise<{ code: string }> {
  const today = args.today ?? new Date();
  const expires = addDays(today, EXPIRES_AFTER_DAYS);

  const params: Record<string, string> = {
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
  };

  // Stable code per order ID; if we couldn't read one, fall back to a
  // random Paddle-generated suffix under the same prefix.
  const stableCode = args.orderId ? couponCodeFor(args.orderId) : null;
  if (stableCode) {
    params.coupon_code = stableCode;
  } else {
    params.coupon_prefix = COUPON_PREFIX;
  }

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    body: new URLSearchParams(params),
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
  });

  const data = (await response.json()) as PaddleResponse;
  if (data.success && data.response?.coupon_codes?.[0]) {
    return { code: data.response.coupon_codes[0] };
  }

  // Same receipt resubmitted: Paddle refuses to overwrite the existing coupon
  // but the stable code is still the one to use.
  const message = data.error?.message ?? '';
  if (stableCode && looksLikeDuplicateCodeError(message)) {
    return { code: stableCode };
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
