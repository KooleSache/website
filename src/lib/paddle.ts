const ENDPOINT = 'https://vendors.paddle.com/api/2.1/product/create_coupon';
const EXPIRES_AFTER_DAYS = 7;

export type CreateCouponArgs = {
  vendorId: number;
  vendorAuthCode: string;
  productId: string;
  discountPercent: number;
  couponPrefix?: string;
  today?: Date;
};

export async function createCoupon(args: CreateCouponArgs): Promise<{ code: string }> {
  const today = args.today ?? new Date();
  const expires = addDays(today, EXPIRES_AFTER_DAYS);

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
    coupon_prefix: args.couponPrefix ?? 'MAS-',
  });

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    body,
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
  });

  const data = (await response.json()) as PaddleResponse;
  if (!data.success || !data.response?.coupon_codes?.[0]) {
    const message = data.error?.message ?? 'unknown error';
    throw new Error(`Paddle create_coupon failed: ${message}`);
  }

  return { code: data.response.coupon_codes[0] };
}

type PaddleResponse = {
  success: boolean;
  response?: { coupon_codes?: string[] };
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
