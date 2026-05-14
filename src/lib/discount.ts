export type DiscountTier = 'free' | 'half' | 'quarter';

export type DiscountResult = {
  tier: DiscountTier;
  discountPercent: 100 | 50 | 25;
};

export function tierFor(purchaseDate: Date, today: Date = new Date()): DiscountResult {
  const months = monthsBetween(purchaseDate, today);
  return bracketFor(months);
}

function bracketFor(months: number): DiscountResult {
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
