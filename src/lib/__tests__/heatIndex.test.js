import { describe, it, expect } from "vitest";
import { calcHeatIndex } from "../heatIndex";

describe("calcHeatIndex", () => {
  it("returns null when temperature is missing", () => {
    expect(calcHeatIndex(null, 50)).toBeNull();
  });

  it("returns null when humidity is missing", () => {
    expect(calcHeatIndex(85, null)).toBeNull();
  });

  it("returns the rounded air temp below 80F regardless of humidity", () => {
    expect(calcHeatIndex(79.6, 90)).toBe(80);
    expect(calcHeatIndex(50, 10)).toBe(50);
    expect(calcHeatIndex(79.4, 0)).toBe(79);
  });

  it("returns the air temp unchanged right at the 80F boundary", () => {
    expect(calcHeatIndex(80, 40)).toBe(80);
  });

  it("applies the Rothfusz regression above 80F with no adjustment in range", () => {
    // R between 13 and 85 so neither adjustment branch fires.
    expect(calcHeatIndex(90, 50)).toBe(95);
    expect(calcHeatIndex(100, 55)).toBe(124);
  });

  it("applies the low-humidity adjustment (subtracts) for 80F<=T<=112F and R<13", () => {
    // Unadjusted regression at 100F/10% rounds to 95; the low-RH adjustment pulls it to 94.
    expect(calcHeatIndex(100, 10)).toBe(94);
  });

  it("does not apply the low-humidity adjustment once T exceeds 112F", () => {
    // 113F/10% is one degree past the adjustment's upper bound.
    expect(calcHeatIndex(113, 10)).toBe(108);
    expect(calcHeatIndex(112, 10)).toBe(107);
  });

  it("applies the high-humidity adjustment (adds) for 80F<=T<=87F and R>85", () => {
    // Unadjusted regression at 80F/95% rounds to 86; the high-RH adjustment pushes it to 88.
    expect(calcHeatIndex(80, 95)).toBe(88);
  });

  it("does not apply the high-humidity adjustment once T exceeds 87F", () => {
    expect(calcHeatIndex(88, 90)).toBe(113);
  });

  it("handles extreme heat index values", () => {
    expect(calcHeatIndex(110, 80)).toBeGreaterThan(160);
  });
});
