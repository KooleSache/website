import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createCoupon } from '../../src/lib/paddle';

describe('createCoupon', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the code Paddle generates', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ success: true, response: { coupon_codes: ['MAS-ABC123'] } }),
        { status: 200 },
      ),
    );

    const result = await createCoupon({
      vendorId: 9922,
      vendorAuthCode: 'secret',
      productId: '499167',
      discountPercent: 25,
      today: new Date('2026-05-14T00:00:00Z'),
    });

    expect(result).toEqual({ code: 'MAS-ABC123' });

    const [callUrl, callInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(callUrl).toBe('https://vendors.paddle.com/api/2.1/product/create_coupon');
    expect(callInit.method).toBe('POST');
    const body = callInit.body as URLSearchParams;
    expect(body.get('vendor_id')).toBe('9922');
    expect(body.get('vendor_auth_code')).toBe('secret');
    expect(body.get('coupon_type')).toBe('product');
    expect(body.get('product_ids')).toBe('499167');
    expect(body.get('discount_type')).toBe('percentage');
    expect(body.get('discount_amount')).toBe('25');
    expect(body.get('allowed_uses')).toBe('1');
    expect(body.get('num_coupons')).toBe('1');
    expect(body.get('recurring')).toBe('0');
    expect(body.get('coupon_prefix')).toBe('MAS-');
    expect(body.get('expires')).toBe('2026-05-21');
  });

  it('throws when Paddle reports failure', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ success: false, error: { message: 'nope' } }), {
        status: 200,
      }),
    );

    await expect(
      createCoupon({
        vendorId: 9922,
        vendorAuthCode: 'secret',
        productId: '499167',
        discountPercent: 100,
      }),
    ).rejects.toThrow(/Paddle/);
  });

  it('throws on network errors', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));

    await expect(
      createCoupon({
        vendorId: 9922,
        vendorAuthCode: 'secret',
        productId: '499167',
        discountPercent: 50,
      }),
    ).rejects.toThrow(/network down/);
  });
});
