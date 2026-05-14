import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { verifyTurnstileToken } from '../../src/lib/turnstile';

describe('verifyTurnstileToken', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns true when Cloudflare confirms success', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    );
    const result = await verifyTurnstileToken('a-token', 'secret', '1.2.3.4');
    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns false when Cloudflare reports a bad token', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ success: false }), { status: 200 }),
    );
    const result = await verifyTurnstileToken('bad', 'secret');
    expect(result).toBe(false);
  });

  it('returns false on network errors', async () => {
    fetchMock.mockRejectedValue(new Error('network down'));
    const result = await verifyTurnstileToken('a-token', 'secret');
    expect(result).toBe(false);
  });

  it('returns false on non-200 responses', async () => {
    fetchMock.mockResolvedValue(new Response('boom', { status: 500 }));
    const result = await verifyTurnstileToken('a-token', 'secret');
    expect(result).toBe(false);
  });
});
