import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createCoupon, couponCodeFor } from '../../src/lib/paddle';

describe('couponCodeFor', () => {
  it('produces the same code for the same email + discount + salt', () => {
    const a = couponCodeFor('user@example.com', 25, 'salt');
    const b = couponCodeFor('user@example.com', 25, 'salt');
    expect(a).toBe(b);
  });

  it('normalizes case and surrounding whitespace', () => {
    const a = couponCodeFor('User@Example.com', 25, 'salt');
    const b = couponCodeFor('  user@example.com  ', 25, 'salt');
    expect(a).toBe(b);
  });

  it('produces different codes for different discounts', () => {
    const a = couponCodeFor('user@example.com', 25, 'salt');
    const b = couponCodeFor('user@example.com', 50, 'salt');
    expect(a).not.toBe(b);
  });

  it('produces different codes for different salts', () => {
    const a = couponCodeFor('user@example.com', 25, 'salt-a');
    const b = couponCodeFor('user@example.com', 25, 'salt-b');
    expect(a).not.toBe(b);
  });

  it('has the MAS- prefix and an 8-char tail', () => {
    expect(couponCodeFor('user@example.com', 25, 'salt')).toMatch(/^MAS-[0-9A-F]{8}$/);
  });
});

describe('createCoupon', () => {
  const fetchMock = vi.fn();
  const baseArgs = {
    vendorId: 9922,
    vendorAuthCode: 'secret',
    productId: '499167',
    customerEmail: 'user@example.com',
    discountPercent: 25,
    today: new Date('2026-05-14T00:00:00Z'),
  };
  const expectedCode = couponCodeFor(baseArgs.customerEmail, baseArgs.discountPercent, baseArgs.vendorAuthCode);

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends the deterministic code to Paddle and returns it on success', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ success: true, response: { coupon_codes: [expectedCode] } }),
        { status: 200 },
      ),
    );

    const result = await createCoupon(baseArgs);
    expect(result).toEqual({ code: expectedCode });

    const [callUrl, callInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(callUrl).toBe('https://vendors.paddle.com/api/2.1/product/create_coupon');
    const body = callInit.body as URLSearchParams;
    expect(body.get('vendor_id')).toBe('9922');
    expect(body.get('coupon_type')).toBe('product');
    expect(body.get('product_ids')).toBe('499167');
    expect(body.get('discount_type')).toBe('percentage');
    expect(body.get('discount_amount')).toBe('25');
    expect(body.get('allowed_uses')).toBe('1');
    expect(body.get('coupon_code')).toBe(expectedCode);
    expect(body.get('expires')).toBe('2026-05-21');
  });

  it('reuses the existing code when Paddle reports the coupon already exists', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ success: false, error: { message: 'Coupon code already taken' } }),
        { status: 200 },
      ),
    );

    const result = await createCoupon(baseArgs);
    expect(result).toEqual({ code: expectedCode });
  });

  it('throws when Paddle reports a non-duplicate failure', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ success: false, error: { message: 'permission denied' } }), {
        status: 200,
      }),
    );

    await expect(createCoupon(baseArgs)).rejects.toThrow(/Paddle/);
  });

  it('throws on network errors', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));
    await expect(createCoupon(baseArgs)).rejects.toThrow(/network down/);
  });
});
