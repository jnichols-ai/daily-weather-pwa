import { describe, it, expect } from "vitest";
import { severityFor, enrichRow, SEV } from "../severity";

describe("severityFor", () => {
  it("returns normal for falsy or non-numeric input", () => {
    expect(severityFor(null)).toBe("normal");
    expect(severityFor(undefined)).toBe("normal");
    expect(severityFor(0)).toBe("normal");
    expect(severityFor("")).toBe("normal");
    expect(severityFor("not-a-number")).toBe("normal");
  });

  it("classifies values below the caution threshold as normal", () => {
    expect(severityFor(89)).toBe("normal");
    expect(severityFor(89.9)).toBe("normal");
  });

  it("classifies the caution band (90-102)", () => {
    expect(severityFor(90)).toBe("caution");
    expect(severityFor(102.9)).toBe("caution");
  });

  it("classifies the danger band (103-124)", () => {
    expect(severityFor(103)).toBe("danger");
    expect(severityFor(124.9)).toBe("danger");
  });

  it("classifies extreme at and above 125", () => {
    expect(severityFor(125)).toBe("extreme");
    expect(severityFor(200)).toBe("extreme");
  });

  it("coerces numeric strings", () => {
    expect(severityFor("104")).toBe("danger");
  });
});

describe("enrichRow", () => {
  it("splits a history row's address into city/state and attaches severity fields", () => {
    const row = enrichRow({ address: "Richmond, VA", heatIndexF: 105 });
    expect(row.cityName).toBe("Richmond");
    expect(row.stateName).toBe("VA");
    expect(row.sevKey).toBe("danger");
    expect(row.sevLabel).toBe(SEV.danger.label);
    expect(row.sevBg).toBe(SEV.danger.bg);
    expect(row.sevColor).toBe(SEV.danger.color);
    expect(row.sevBorder).toBe(SEV.danger.border);
    expect(row.sevDot).toBe(SEV.danger.dot);
  });

  it("splits a current-conditions row's name into city/state", () => {
    const row = enrichRow({ name: "Baltimore, MD", heatIndexF: 92 });
    expect(row.cityName).toBe("Baltimore");
    expect(row.stateName).toBe("MD");
    expect(row.sevKey).toBe("caution");
  });

  it("prefers address over name when both are present", () => {
    const row = enrichRow({ address: "Dover, DE", name: "Newark, DE", heatIndexF: 50 });
    expect(row.cityName).toBe("Dover");
  });

  it("falls back to the whole source string when there is no comma-separated state", () => {
    const row = enrichRow({ address: "Somewhere", heatIndexF: 50 });
    expect(row.cityName).toBe("Somewhere");
    expect(row.stateName).toBe("");
  });

  it("handles a missing address/name gracefully", () => {
    const row = enrichRow({ heatIndexF: 50 });
    expect(row.cityName).toBe("");
    expect(row.stateName).toBe("");
    expect(row.sevKey).toBe("normal");
  });

  it("preserves the original row fields", () => {
    const row = enrichRow({ address: "Dover, DE", heatIndexF: 91, tempF: 91, windMph: 5 });
    expect(row.tempF).toBe(91);
    expect(row.windMph).toBe(5);
    expect(row.heatIndexF).toBe(91);
  });
});
