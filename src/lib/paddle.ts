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
    'prices[]': `USD:${args.finalPriceUSD.toFixed(2)}`,
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
