import { describe, it, expect } from 'vitest';
import { tierFor } from '../../src/lib/discount';

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
  });

  it('returns the half tier exactly at 18 months', () => {
    const purchase = monthsBefore(today, 18);
    const result = tierFor(purchase, today);
    expect(result.tier).toBe('half');
    expect(result.discountPercent).toBe(50);
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
  });

  it('returns the quarter tier for very old purchases', () => {
    const purchase = monthsBefore(today, 120);
    const result = tierFor(purchase, today);
    expect(result.tier).toBe('quarter');
  });
});
