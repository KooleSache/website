export const ORIGINAL_PRICE_USD = 25;

export type DiscountTier = 'free' | 'half' | 'quarter';

export type DiscountResult = {
  tier: DiscountTier;
  discountPercent: 100 | 50 | 25;
  originalPriceUSD: number;
  finalPriceUSD: number;
};

export function tierFor(purchaseDate: Date, today: Date = new Date()): DiscountResult {
  const months = monthsBetween(purchaseDate, today);
  const { tier, discountPercent } = bracketFor(months);
  const finalPriceUSD = round2(ORIGINAL_PRICE_USD * (1 - discountPercent / 100));
  return {
    tier,
    discountPercent,
    originalPriceUSD: ORIGINAL_PRICE_USD,
    finalPriceUSD,
  };
}

function bracketFor(months: number): { tier: DiscountTier; discountPercent: 100 | 50 | 25 } {
  if (months < 18) return { tier: 'free', discountPercent: 100 };
  if (months < 48) return { tier: 'half', discountPercent: 50 };
  return { tier: 'quarter', discountPercent: 25 };
}

function monthsBetween(earlier: Date, later: Date): number {
  const years = later.getUTCFullYear() - earlier.getUTCFullYear();
  const months = later.getUTCMonth() - earlier.getUTCMonth();
  const dayAdjust = later.getUTCDate() < earlier.getUTCDate() ? -1 : 0;
  return years * 12 + months + dayAdjust;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
