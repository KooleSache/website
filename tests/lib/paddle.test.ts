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
