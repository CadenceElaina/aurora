/**
 * Daily session snapshot — pure computation for cross-day session-state integrity (T-030).
 *
 * The session "plan" (which problems make up today's work) is snapshotted once at the
 * start of a calendar day and stays stable for that day, so the completion target never
 * drifts as the live review queue shrinks. Acted-on problems are tracked as *sets*, so a
 * given problem counts at most once and can never appear twice in one day.
 *
 * This module is pure (no DB, no fetch, no side effects) — mirrors src/lib/srs.ts. The
 * server (`/api/session`) is the source of truth; this module decides how a stored row
 * reconciles with a freshly computed plan when a new day begins.
 */

export type SessionPlan = {
  plannedReviewIds: number[];
  plannedNewIds: number[];
};

export type DailySessionSnapshot = SessionPlan & {
  date: string; // "YYYY-MM-DD"
  actedReviewIds: number[];
  actedNewIds: number[];
  completed: boolean;
};

/** Today's calendar day as "YYYY-MM-DD" (caller passes a Date so this stays pure/testable). */
export function sessionDay(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Reconcile a stored session row with today's freshly computed plan.
 *
 * - Same calendar day → the stored plan and progress are authoritative (stable target).
 * - New day, or no stored row → start fresh from `freshPlan` with empty progress.
 */
export function reconcileSessionSnapshot(params: {
  stored: DailySessionSnapshot | null;
  today: string;
  freshPlan: SessionPlan;
}): DailySessionSnapshot {
  const { stored, today, freshPlan } = params;
  if (stored && stored.date === today) {
    return stored;
  }
  return {
    date: today,
    plannedReviewIds: [...freshPlan.plannedReviewIds],
    plannedNewIds: [...freshPlan.plannedNewIds],
    actedReviewIds: [],
    actedNewIds: [],
    completed: false,
  };
}

function addToSet(ids: number[], id: number): number[] {
  return ids.includes(id) ? ids : [...ids, id];
}

/** Record a review action — idempotent (a problemId is added at most once). */
export function addActedReview(snap: DailySessionSnapshot, problemId: number): DailySessionSnapshot {
  return { ...snap, actedReviewIds: addToSet(snap.actedReviewIds, problemId) };
}

/** Record a new-problem action — idempotent. */
export function addActedNew(snap: DailySessionSnapshot, problemId: number): DailySessionSnapshot {
  return { ...snap, actedNewIds: addToSet(snap.actedNewIds, problemId) };
}

/**
 * Remove a problem from today's plan (e.g. it was deferred or skipped), so the target
 * shrinks honestly instead of becoming permanently unreachable.
 */
export function removeFromPlan(snap: DailySessionSnapshot, problemId: number): DailySessionSnapshot {
  return {
    ...snap,
    plannedReviewIds: snap.plannedReviewIds.filter((id) => id !== problemId),
    plannedNewIds: snap.plannedNewIds.filter((id) => id !== problemId),
  };
}

/** The stable session target: how many problems make up today's plan. */
export function sessionTarget(snap: DailySessionSnapshot): number {
  return snap.plannedReviewIds.length + snap.plannedNewIds.length;
}

/**
 * Progress toward the plan: planned problems that have been acted on. Actions on problems
 * outside the plan ("load more") are still recorded in the acted sets but don't count here,
 * so progress can never exceed the target.
 */
export function sessionDone(snap: DailySessionSnapshot): number {
  const actedReview = new Set(snap.actedReviewIds);
  const actedNew = new Set(snap.actedNewIds);
  const reviewDone = snap.plannedReviewIds.filter((id) => actedReview.has(id)).length;
  const newDone = snap.plannedNewIds.filter((id) => actedNew.has(id)).length;
  return reviewDone + newDone;
}

/** Whether every planned problem has been acted on (a non-empty plan that's fully done). */
export function isSessionComplete(snap: DailySessionSnapshot): boolean {
  const target = sessionTarget(snap);
  return target > 0 && sessionDone(snap) >= target;
}
