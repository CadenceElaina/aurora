import { describe, it, expect } from "vitest";
import { deriveCapacity, classifyLoadZone } from "@/lib/pacing";

describe("deriveCapacity", () => {
  // ── Zero reviews due: full budget available for new ──
  it("Light budget, 0 due", () => {
    expect(deriveCapacity(30, 0)).toEqual({ reviewCapacity: 1, newCapacity: 0 });
  });

  it("Moderate budget, 0 due", () => {
    expect(deriveCapacity(60, 0)).toEqual({ reviewCapacity: 2, newCapacity: 1 });
  });

  it("Focused budget, 0 due", () => {
    expect(deriveCapacity(90, 0)).toEqual({ reviewCapacity: 3, newCapacity: 2 });
  });

  it("Intensive budget, 0 due", () => {
    expect(deriveCapacity(120, 0)).toEqual({ reviewCapacity: 4, newCapacity: 2 });
  });

  // ── Reviews consuming budget ──
  it("60 min, 2 reviews due → no new capacity", () => {
    // 2 × 25 = 50 min consumed → 10 remaining → floor(10/45) = 0
    expect(deriveCapacity(60, 2)).toEqual({ reviewCapacity: 2, newCapacity: 0 });
  });

  it("90 min, 1 review due → 1 new", () => {
    // 1 × 25 = 25 min consumed → 65 remaining → floor(65/45) = 1
    expect(deriveCapacity(90, 1)).toEqual({ reviewCapacity: 3, newCapacity: 1 });
  });

  it("90 min, 2 reviews due → 0 new", () => {
    // 2 × 25 = 50 min consumed → 40 remaining → floor(40/45) = 0
    expect(deriveCapacity(90, 2)).toEqual({ reviewCapacity: 3, newCapacity: 0 });
  });

  it("120 min, 2 reviews due → 1 new", () => {
    // 2 × 25 = 50 min consumed → 70 remaining → floor(70/45) = 1
    expect(deriveCapacity(120, 2)).toEqual({ reviewCapacity: 4, newCapacity: 1 });
  });

  // ── Edge cases ──
  it("zero budget floors at reviewCapacity 1", () => {
    expect(deriveCapacity(0, 0)).toEqual({ reviewCapacity: 1, newCapacity: 0 });
  });

  it("reviews exceed budget → newCapacity 0, reviewCapacity unchanged", () => {
    // 30 min budget, 3 reviews due → 3 × 25 = 75 > 30
    // reviewCapacity = floor(30/25) = 1 (capacity stays independent of due count)
    // remaining = max(0, 30 - 75) = 0 → newCapacity = 0
    expect(deriveCapacity(30, 3)).toEqual({ reviewCapacity: 1, newCapacity: 0 });
  });

  it("custom budget 45 min", () => {
    // floor(45/25) = 1 review; floor(45/45) = 1 new (if 0 due)
    expect(deriveCapacity(45, 0)).toEqual({ reviewCapacity: 1, newCapacity: 1 });
  });

  it("custom budget 45 min, 1 due", () => {
    // 1 × 25 = 25 consumed → 20 remaining → floor(20/45) = 0
    expect(deriveCapacity(45, 1)).toEqual({ reviewCapacity: 1, newCapacity: 0 });
  });
});

describe("classifyLoadZone", () => {
  it("green: ratio ≤ 0.6", () => {
    expect(classifyLoadZone(0.0)).toBe("green");
    expect(classifyLoadZone(0.3)).toBe("green");
    expect(classifyLoadZone(0.6)).toBe("green");
  });

  it("yellow: 0.6 < ratio ≤ 0.85", () => {
    expect(classifyLoadZone(0.61)).toBe("yellow");
    expect(classifyLoadZone(0.85)).toBe("yellow");
  });

  it("amber: 0.85 < ratio ≤ 1.1", () => {
    expect(classifyLoadZone(0.86)).toBe("amber");
    expect(classifyLoadZone(1.1)).toBe("amber");
  });

  it("orange: 1.1 < ratio ≤ 1.5", () => {
    expect(classifyLoadZone(1.11)).toBe("orange");
    expect(classifyLoadZone(1.5)).toBe("orange");
  });

  it("red: ratio > 1.5", () => {
    expect(classifyLoadZone(1.51)).toBe("red");
    expect(classifyLoadZone(3.0)).toBe("red");
  });

  // Budget sensitivity: same due count, different zones
  it("3 due for Light user (cap 1) → red", () => {
    expect(classifyLoadZone(3 / 1)).toBe("red");
  });

  it("3 due for Moderate user (cap 2) → orange", () => {
    expect(classifyLoadZone(3 / 2)).toBe("orange");
  });

  it("3 due for Intensive user (cap 4) → yellow", () => {
    expect(classifyLoadZone(3 / 4)).toBe("yellow");
  });
});
