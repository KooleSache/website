import OpenAI from 'openai';

const MODEL = 'gpt-4o-mini';

const PROMPT = `You are validating a Mac App Store receipt for the macOS application "ColorSnapper" (also known as "ColorSnapper 2"). The user has uploaded an image or PDF of their purchase receipt. Examine it and return JSON matching the provided schema.

Rules:
- isColorSnapperReceipt: true ONLY if "ColorSnapper" or "ColorSnapper 2" is clearly visible as a product line on the receipt. Otherwise false.
- email: the Apple ID email address shown on the receipt (typically near the top), or null if not clearly legible.
- purchaseDate: the date the ColorSnapper item was purchased, formatted as "yyyy-mm-dd". If the receipt lists multiple products, use the date associated with the ColorSnapper line. Return null if the date is not clearly legible.
- confidence: "high", "medium", or "low" — your overall confidence in the extraction.

Do not infer the date from anything other than text printed on the receipt. Do not guess.`;

const SCHEMA = {
  type: 'object' as const,
  properties: {
    isColorSnapperReceipt: { type: 'boolean' as const },
    email: { type: ['string', 'null'] as const },
    purchaseDate: { type: ['string', 'null'] as const },
    confidence: { type: 'string' as const, enum: ['high', 'medium', 'low'] as const },
  },
  required: ['isColorSnapperReceipt', 'email', 'purchaseDate', 'confidence'] as const,
  additionalProperties: false as const,
};

export type ReceiptExtraction = {
  isColorSnapperReceipt: boolean;
  email: string | null;
  purchaseDate: string | null;
  confidence: 'high' | 'medium' | 'low';
};

export type ExtractReceiptArgs = {
  apiKey: string;
  fileBuffer: Buffer;
  mimeType: string;
};

export async function extractReceipt(args: ExtractReceiptArgs): Promise<ReceiptExtraction> {
  const client = new OpenAI({ apiKey: args.apiKey });
  const dataUrl = `data:${args.mimeType};base64,${args.fileBuffer.toString('base64')}`;

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: PROMPT },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'receipt_extraction', strict: true, schema: SCHEMA },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Vision API returned empty content');
  }

  const parsed = JSON.parse(content) as Partial<ReceiptExtraction>;
  if (
    typeof parsed.isColorSnapperReceipt !== 'boolean' ||
    !('email' in parsed) ||
    !('purchaseDate' in parsed) ||
    !parsed.confidence
  ) {
    throw new Error('Vision API returned invalid JSON shape');
  }

  return parsed as ReceiptExtraction;
}
