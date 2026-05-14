import { describe, it, expect, vi, beforeEach } from 'vitest';

const verifyTurnstileToken = vi.fn();
const extractReceipt = vi.fn();
const createCoupon = vi.fn();

vi.mock('../../src/lib/turnstile', () => ({ verifyTurnstileToken }));
vi.mock('../../src/lib/vision', () => ({ extractReceipt }));
vi.mock('../../src/lib/paddle', () => ({ createCoupon }));

const ENV = {
  TURNSTILE_SECRET_KEY: 'turnstile-secret',
  OPENAI_API_KEY: 'openai-key',
  PADDLE_VENDOR_AUTH_CODE: 'paddle-secret',
};

beforeEach(() => {
  verifyTurnstileToken.mockReset();
  extractReceipt.mockReset();
  createCoupon.mockReset();
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
      orderId: null,
      purchaseDate: null,
      confidence: 'high',
    });
    const res = await call(buildForm());
    expect(res.status).toBe(422);
  });

  it('falls back to the lowest tier when date is missing', async () => {
    verifyTurnstileToken.mockResolvedValue(true);
    extractReceipt.mockResolvedValue({
      isColorSnapperReceipt: true,
      email: 'a@example.com',
      orderId: 'MLB92NJF9H',
      purchaseDate: null,
      confidence: 'low',
    });
    createCoupon.mockResolvedValue({ code: 'MAS-XYZ123' });

    const res = await call(buildForm());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.discountPercent).toBe(25);
    expect(body.dateMissing).toBe(true);
    expect(body.couponCode).toBe('MAS-XYZ123');
    expect(body.suggestedEmail).toBe('a@example.com');
  });

  it('passes orderId to createCoupon for stable codes', async () => {
    verifyTurnstileToken.mockResolvedValue(true);
    extractReceipt.mockResolvedValue({
      isColorSnapperReceipt: true,
      email: null,
      orderId: 'MLB92NJF9H',
      purchaseDate: '2026-01-01',
      confidence: 'high',
    });
    createCoupon.mockResolvedValue({ code: 'MAS-MLB92NJF9H' });

    const res = await call(buildForm());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.couponCode).toBe('MAS-MLB92NJF9H');
    expect(body.discountPercent).toBe(100);
    expect(body.suggestedEmail).toBeNull();
    expect(createCoupon).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'MLB92NJF9H',
        discountPercent: 100,
      }),
    );
  });

  it('returns 502 when Paddle throws', async () => {
    verifyTurnstileToken.mockResolvedValue(true);
    extractReceipt.mockResolvedValue({
      isColorSnapperReceipt: true,
      email: 'a@example.com',
      orderId: 'MLB92NJF9H',
      purchaseDate: '2026-01-01',
      confidence: 'high',
    });
    createCoupon.mockRejectedValue(new Error('paddle down'));

    const res = await call(buildForm());
    expect(res.status).toBe(502);
  });
});
