import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createCoupon, couponCodeFor } from '../../src/lib/paddle';

describe('couponCodeFor', () => {
  it('is just MAS- + the uppercased order ID', () => {
    expect(couponCodeFor('MLB92NJF9H')).toBe('MAS-MLB92NJF9H');
  });

  it('normalizes case and surrounding whitespace', () => {
    expect(couponCodeFor('  mlb92njf9h  ')).toBe('MAS-MLB92NJF9H');
  });

  it('strips disallowed characters from the order ID', () => {
    expect(couponCodeFor('ABC-123/x')).toBe('MAS-ABC123X');
  });

  it('produces different codes for different orders', () => {
    expect(couponCodeFor('MLB92NJF9H')).not.toBe(couponCodeFor('OTHER1234'));
  });
});

describe('createCoupon', () => {
  const fetchMock = vi.fn();
  const today = new Date('2026-05-14T00:00:00Z');
  const baseArgs = {
    vendorId: 9922,
    vendorAuthCode: 'secret',
    productId: '499167',
    discountPercent: 25,
    today,
  };

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the order-ID-based code when an order ID is provided', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ success: true, response: { coupon_codes: ['MAS-MLB92NJF9H'] } }),
        { status: 200 },
      ),
    );

    const result = await createCoupon({ ...baseArgs, orderId: 'MLB92NJF9H' });
    expect(result.code).toBe('MAS-MLB92NJF9H');

    const [, callInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = callInit.body as URLSearchParams;
    expect(body.get('coupon_code')).toBe('MAS-MLB92NJF9H');
    expect(body.get('coupon_prefix')).toBeNull();
    expect(body.get('discount_amount')).toBe('25');
    expect(body.get('expires')).toBe('2026-05-21');
  });

  it('falls back to a Paddle-generated code when the order ID is missing', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ success: true, response: { coupon_codes: ['MAS-ABCD1234'] } }),
        { status: 200 },
      ),
    );

    const result = await createCoupon({ ...baseArgs, orderId: null });
    expect(result.code).toBe('MAS-ABCD1234');

    const [, callInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = callInit.body as URLSearchParams;
    expect(body.get('coupon_prefix')).toBe('MAS-');
    expect(body.get('coupon_code')).toBeNull();
  });

  it('reuses the stable code when Paddle reports duplicate', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ success: false, error: { message: 'Coupon code already taken' } }),
        { status: 200 },
      ),
    );

    const result = await createCoupon({ ...baseArgs, orderId: 'MLB92NJF9H' });
    expect(result.code).toBe('MAS-MLB92NJF9H');
  });

  it('throws on a non-duplicate Paddle failure', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ success: false, error: { message: 'permission denied' } }), {
        status: 200,
      }),
    );

    await expect(createCoupon({ ...baseArgs, orderId: 'X' })).rejects.toThrow(/Paddle/);
  });

  it('throws on network errors', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));
    await expect(createCoupon({ ...baseArgs, orderId: 'X' })).rejects.toThrow(/network down/);
  });
});
