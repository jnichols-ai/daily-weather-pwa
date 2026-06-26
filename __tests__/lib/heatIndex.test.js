import { describe, it, expect } from 'vitest';
import { calcHeatIndex } from '@/lib/heatIndex.js';

describe('calcHeatIndex', () => {
  // --- null handling ---

  it('returns null when tempF is null', () => {
    expect(calcHeatIndex(null, 50)).toBeNull();
  });

  it('returns null when relHumidityPct is null', () => {
    expect(calcHeatIndex(90, null)).toBeNull();
  });

  it('returns null when both inputs are null', () => {
    expect(calcHeatIndex(null, null)).toBeNull();
  });

  // --- sub-80°F pass-through (NWS behavior) ---

  it('returns the raw temperature when below 80°F', () => {
    expect(calcHeatIndex(79, 100)).toBe(79);
    expect(calcHeatIndex(60, 80)).toBe(60);
    expect(calcHeatIndex(32, 0)).toBe(32);
  });

  it('rounds sub-80°F temperatures to the nearest integer', () => {
    expect(calcHeatIndex(79.4, 50)).toBe(79);
    expect(calcHeatIndex(79.6, 50)).toBe(80);
  });

  // --- Rothfusz regression (≥ 80°F, no adjustments) ---

  it('applies Rothfusz regression at exactly 80°F', () => {
    // At 80°F the regression result differs from the raw temperature.
    // T=80, R=50 → ≈ 80.80 → rounds to 81
    expect(calcHeatIndex(80, 50)).toBe(81);
  });

  it('applies Rothfusz regression above 80°F (normal conditions)', () => {
    // T=90, R=50 → ≈ 94.60 → rounds to 95
    expect(calcHeatIndex(90, 50)).toBe(95);
  });

  // --- low humidity adjustment (R < 13, T 80–112°F) ---

  it('subtracts the low-humidity adjustment when R < 13 and T is 80–112°F', () => {
    // T=95, R=10: base ≈ 90.20, adjustment = 0.75 → 89.45 → rounds to 89
    expect(calcHeatIndex(95, 10)).toBe(89);
  });

  it('does not apply low-humidity adjustment when R ≥ 13', () => {
    // R=13 is the boundary; no adjustment should apply
    expect(calcHeatIndex(95, 13)).toBeGreaterThan(calcHeatIndex(95, 10));
  });

  // --- high humidity adjustment (R > 85, T 80–87°F) ---

  it('adds the high-humidity adjustment when R > 85 and T is 80–87°F', () => {
    // T=82, R=90: base ≈ 91.50, adjustment = +0.50 → 92.00 → rounds to 92
    expect(calcHeatIndex(82, 90)).toBe(92);
  });

  it('does not apply high-humidity adjustment when T > 87°F', () => {
    // At T=88 the high-humidity branch is skipped; result should differ
    expect(calcHeatIndex(88, 90)).not.toBe(calcHeatIndex(82, 90));
  });

  // --- output type ---

  it('always returns an integer for valid inputs', () => {
    expect(Number.isInteger(calcHeatIndex(79, 50))).toBe(true);
    expect(Number.isInteger(calcHeatIndex(90, 50))).toBe(true);
    expect(Number.isInteger(calcHeatIndex(95, 10))).toBe(true);
    expect(Number.isInteger(calcHeatIndex(82, 90))).toBe(true);
  });
});
