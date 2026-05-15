import { describe, it, expect, vi } from 'vitest';
import { extractReceipt } from '../../src/lib/vision';

const createMock = vi.fn();

vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = { completions: { create: createMock } };
    },
  };
});

describe('extractReceipt', () => {
  it('returns the parsed JSON when the model responds', async () => {
    createMock.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              isColorSnapperReceipt: true,
              email: 'a@example.com',
              orderId: 'MLB92NJF9H',
              purchaseDate: '2025-08-01',
              confidence: 'high',
            }),
          },
        },
      ],
    });

    const result = await extractReceipt({
      apiKey: 'sk-test',
      fileBuffer: Buffer.from('fake'),
      mimeType: 'image/png',
    });

    expect(result).toEqual({
      isColorSnapperReceipt: true,
      email: 'a@example.com',
      orderId: 'MLB92NJF9H',
      purchaseDate: '2025-08-01',
      confidence: 'high',
    });
  });

  it('throws when the model returns empty content', async () => {
    createMock.mockResolvedValue({ choices: [{ message: { content: '' } }] });

    await expect(
      extractReceipt({
        apiKey: 'sk-test',
        fileBuffer: Buffer.from('fake'),
        mimeType: 'image/png',
      }),
    ).rejects.toThrow(/empty/i);
  });

  it('throws when the JSON does not match the schema', async () => {
    createMock.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ wrong: 'shape' }) } }],
    });

    await expect(
      extractReceipt({
        apiKey: 'sk-test',
        fileBuffer: Buffer.from('fake'),
        mimeType: 'image/png',
      }),
    ).rejects.toThrow(/invalid/i);
  });
});
