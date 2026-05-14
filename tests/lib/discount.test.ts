import { describe, it, expect } from 'vitest';
import { tierFor, ORIGINAL_PRICE_USD } from '../../src/lib/discount';

const today = new Date('2026-05-14T00:00:00Z');

function monthsBefore(date: Date, months: number): Date {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() - months);
  return d;
}

describe('tierFor', () => {
  it('returns the free tier just under 18 months', () => {
    const purchase = monthsBefore(today, 17);
    const result = tierFor(purchase, today);
    expect(result.tier).toBe('free');
    expect(result.discountPercent).toBe(100);
    expect(result.finalPriceUSD).toBe(0);
    expect(result.originalPriceUSD).toBe(ORIGINAL_PRICE_USD);
  });

  it('returns the half tier exactly at 18 months', () => {
    const purchase = monthsBefore(today, 18);
    const result = tierFor(purchase, today);
    expect(result.tier).toBe('half');
    expect(result.discountPercent).toBe(50);
    expect(result.finalPriceUSD).toBe(ORIGINAL_PRICE_USD * 0.5);
  });

  it('returns the half tier just under 48 months', () => {
    const purchase = monthsBefore(today, 47);
    const result = tierFor(purchase, today);
    expect(result.tier).toBe('half');
  });

  it('returns the quarter tier exactly at 48 months', () => {
    const purchase = monthsBefore(today, 48);
    const result = tierFor(purchase, today);
    expect(result.tier).toBe('quarter');
    expect(result.discountPercent).toBe(25);
    expect(result.finalPriceUSD).toBe(ORIGINAL_PRICE_USD * 0.75);
  });

  it('returns the quarter tier for very old purchases', () => {
    const purchase = monthsBefore(today, 120);
    const result = tierFor(purchase, today);
    expect(result.tier).toBe('quarter');
  });
});
