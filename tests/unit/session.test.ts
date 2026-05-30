import { describe, it, expect } from "vitest";
import {
  sessionDay,
  reconcileSessionSnapshot,
  addActedReview,
  addActedNew,
  removeFromPlan,
  sessionTarget,
  sessionDone,
  isSessionComplete,
  type DailySessionSnapshot,
} from "@/lib/session";

function snap(over: Partial<DailySessionSnapshot> = {}): DailySessionSnapshot {
  return {
    date: "2026-05-30",
    plannedReviewIds: [1, 2, 3],
    plannedNewIds: [10],
    actedReviewIds: [],
    actedNewIds: [],
    completed: false,
    ...over,
  };
}

describe("sessionDay", () => {
  it("formats a Date as YYYY-MM-DD", () => {
    expect(sessionDay(new Date("2026-05-30T14:00:00Z"))).toBe("2026-05-30");
  });
});

describe("reconcileSessionSnapshot", () => {
  const freshPlan = { plannedReviewIds: [7, 8], plannedNewIds: [20] };

  it("keeps the stored plan and progress on the same day (stable target)", () => {
    const stored = snap({ actedReviewIds: [1], completed: false });
    const r = reconcileSessionSnapshot({ stored, today: "2026-05-30", freshPlan });
    expect(r).toBe(stored); // unchanged — stored is authoritative for the day
    expect(r.plannedReviewIds).toEqual([1, 2, 3]);
    expect(r.actedReviewIds).toEqual([1]);
  });

  it("rebuilds from the fresh plan on a new day with empty progress", () => {
    const stored = snap({ date: "2026-05-29", actedReviewIds: [1, 2], completed: true });
    const r = reconcileSessionSnapshot({ stored, today: "2026-05-30", freshPlan });
    expect(r.date).toBe("2026-05-30");
    expect(r.plannedReviewIds).toEqual([7, 8]);
    expect(r.plannedNewIds).toEqual([20]);
    expect(r.actedReviewIds).toEqual([]);
    expect(r.actedNewIds).toEqual([]);
    expect(r.completed).toBe(false);
  });

  it("starts fresh when there is no stored row", () => {
    const r = reconcileSessionSnapshot({ stored: null, today: "2026-05-30", freshPlan });
    expect(r.date).toBe("2026-05-30");
    expect(r.plannedReviewIds).toEqual([7, 8]);
    expect(r.completed).toBe(false);
  });
});

describe("acted-on sets are idempotent (no double-count, no twice-in-a-day)", () => {
  it("adding the same review id twice is a no-op", () => {
    let s = snap();
    s = addActedReview(s, 1);
    s = addActedReview(s, 1);
    expect(s.actedReviewIds).toEqual([1]);
    expect(sessionDone(s)).toBe(1);
  });

  it("addActedNew dedupes too", () => {
    let s = snap();
    s = addActedNew(s, 10);
    s = addActedNew(s, 10);
    expect(s.actedNewIds).toEqual([10]);
  });

  it("a load-more action on a problem outside the plan is recorded but does not exceed target", () => {
    let s = snap(); // target = 4
    s = addActedReview(s, 1);
    s = addActedReview(s, 99); // not in plan ("load more")
    expect(s.actedReviewIds).toEqual([1, 99]);
    expect(sessionTarget(s)).toBe(4);
    expect(sessionDone(s)).toBe(1); // only the planned one counts toward progress
  });
});

describe("target / completion", () => {
  it("target is the planned count and is stable", () => {
    expect(sessionTarget(snap())).toBe(4);
  });

  it("isSessionComplete only when every planned problem is acted on", () => {
    let s = snap(); // plan: reviews [1,2,3], new [10]
    expect(isSessionComplete(s)).toBe(false);
    s = addActedReview(s, 1);
    s = addActedReview(s, 2);
    s = addActedReview(s, 3);
    expect(isSessionComplete(s)).toBe(false); // new not done yet
    s = addActedNew(s, 10);
    expect(isSessionComplete(s)).toBe(true);
  });

  it("an empty plan is never 'complete'", () => {
    expect(isSessionComplete(snap({ plannedReviewIds: [], plannedNewIds: [] }))).toBe(false);
  });

  it("removeFromPlan shrinks the target so a deferred problem doesn't block completion", () => {
    let s = snap(); // target 4
    s = addActedReview(s, 1);
    s = addActedReview(s, 2);
    s = addActedNew(s, 10);
    expect(isSessionComplete(s)).toBe(false); // problem 3 still pending
    s = removeFromPlan(s, 3); // user defers problem 3
    expect(sessionTarget(s)).toBe(3);
    expect(isSessionComplete(s)).toBe(true);
  });
});

/* Cross-day end-to-end: plan 5 → act 3 → "reload" same day → next day fresh. */
describe("cross-day integrity scenario", () => {
  it("same-day reload keeps target and progress; next day resets", () => {
    const day1Plan = { plannedReviewIds: [1, 2, 3, 4], plannedNewIds: [10] }; // 5 total
    let s = reconcileSessionSnapshot({ stored: null, today: "2026-05-30", freshPlan: day1Plan });
    s = addActedReview(s, 1);
    s = addActedReview(s, 2);
    s = addActedReview(s, 3);
    expect(sessionTarget(s)).toBe(5);
    expect(sessionDone(s)).toBe(3);
    expect(isSessionComplete(s)).toBe(false);

    // Simulate a page reload on the same day: the stored snapshot reconciles to itself,
    // even though the live queue would now compute a smaller fresh plan.
    const reloaded = reconcileSessionSnapshot({
      stored: s,
      today: "2026-05-30",
      freshPlan: { plannedReviewIds: [4], plannedNewIds: [10] }, // shrunken live queue
    });
    expect(sessionTarget(reloaded)).toBe(5); // target did NOT drift
    expect(sessionDone(reloaded)).toBe(3);

    // Next day: fresh plan, progress cleared.
    const day2 = reconcileSessionSnapshot({
      stored: reloaded,
      today: "2026-05-31",
      freshPlan: { plannedReviewIds: [4, 5], plannedNewIds: [11] },
    });
    expect(day2.date).toBe("2026-05-31");
    expect(sessionTarget(day2)).toBe(3);
    expect(sessionDone(day2)).toBe(0);
    expect(day2.completed).toBe(false);
  });
});
