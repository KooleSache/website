import { describe, it, expect, vi, beforeEach } from 'vitest';

const verifyTurnstileToken = vi.fn();
const extractReceipt = vi.fn();
const generatePayLink = vi.fn();

vi.mock('../../src/lib/turnstile', () => ({ verifyTurnstileToken }));
vi.mock('../../src/lib/vision', () => ({ extractReceipt }));
vi.mock('../../src/lib/paddle', () => ({ generatePayLink }));

const ENV = {
  TURNSTILE_SECRET_KEY: 'turnstile-secret',
  OPENAI_API_KEY: 'openai-key',
  PADDLE_VENDOR_AUTH_CODE: 'paddle-secret',
};

beforeEach(() => {
  verifyTurnstileToken.mockReset();
  extractReceipt.mockReset();
  generatePayLink.mockReset();
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
      purchaseDate: null,
      confidence: 'high',
    });
    const res = await call(buildForm());
    expect(res.status).toBe(422);
  });

  it('returns 422 when email is missing', async () => {
    verifyTurnstileToken.mockResolvedValue(true);
    extractReceipt.mockResolvedValue({
      isColorSnapperReceipt: true,
      email: null,
      purchaseDate: '2025-08-01',
      confidence: 'medium',
    });
    const res = await call(buildForm());
    expect(res.status).toBe(422);
  });

  it('falls back to the lowest tier when date is missing', async () => {
    verifyTurnstileToken.mockResolvedValue(true);
    extractReceipt.mockResolvedValue({
      isColorSnapperReceipt: true,
      email: 'a@example.com',
      purchaseDate: null,
      confidence: 'low',
    });
    generatePayLink.mockResolvedValue({ url: 'https://pay.paddle.com/abc' });

    const res = await call(buildForm());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.discountPercent).toBe(25);
    expect(body.dateMissing).toBe(true);
    expect(body.checkoutUrl).toBe('https://pay.paddle.com/abc');
    expect(body.redactedEmail).toBe('a@e*****e.com');
  });

  it('happy path returns checkout URL, tier and redacted email', async () => {
    verifyTurnstileToken.mockResolvedValue(true);
    extractReceipt.mockResolvedValue({
      isColorSnapperReceipt: true,
      email: 'andrey@okonet.dev',
      purchaseDate: '2026-01-01',
      confidence: 'high',
    });
    generatePayLink.mockResolvedValue({ url: 'https://pay.paddle.com/xyz' });

    const res = await call(buildForm());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.discountPercent).toBe(100);
    expect(body.finalPrice).toBe(0);
    expect(body.checkoutUrl).toBe('https://pay.paddle.com/xyz');
    expect(body.redactedEmail).toBe('a****y@o****t.dev');
    expect(generatePayLink).toHaveBeenCalledWith(
      expect.objectContaining({ customerEmail: 'andrey@okonet.dev', finalPriceUSD: 0 }),
    );
  });

  it('returns 502 when Paddle throws', async () => {
    verifyTurnstileToken.mockResolvedValue(true);
    extractReceipt.mockResolvedValue({
      isColorSnapperReceipt: true,
      email: 'a@example.com',
      purchaseDate: '2026-01-01',
      confidence: 'high',
    });
    generatePayLink.mockRejectedValue(new Error('paddle down'));

    const res = await call(buildForm());
    expect(res.status).toBe(502);
  });
});
