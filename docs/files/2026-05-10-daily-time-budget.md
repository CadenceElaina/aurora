# ADR: Daily Time Budget Goal System

**Date:** 2026-05-10
**Status:** Phase 1 Implemented — Phase 2 pending
**Scope:** Onboarding, `users` schema, dashboard pacing, recommendation engine

---

## Context

Aurora's recommendation engine currently uses observed pace (7-day rolling average of attempts/day) as the sole capacity signal. This has two problems:

1. **Cold start** — new users have no history, so recommendations default to generic "Getting started" messaging that can't distinguish a 30-min/day student from a 3-hour/day pre-interview sprinter.

2. **No anchor** — when we tell a user "your queue is growing," they have no context for what "growing" means relative to their capacity. A queue of 8 due/day is fine for someone with 90 min; it's a crisis for someone with 30 min.

The solution: ask users to declare their daily time commitment, derive capacity constants from it, and use those to calibrate all pacing recommendations.

---

## Decision

### 1. Add a time budget selector to onboarding

Step 3 of the onboarding flow ("Set Your Goal") will prepend a time budget selector before the problem set choice:

```
How much time can you practice daily?
  ○ 30 min — Casual
  ○ 60 min — Regular          ← default
  ○ 90 min — Focused
  ○ 2+ hrs — Intensive
  ○ Custom: [___] min
```

The selector uses predefined presets with a custom override. Presets reduce decision fatigue; custom accommodates edge cases.

### 2. Store in the database

Add `daily_time_budget_minutes INTEGER DEFAULT 60` to the `users` table. This is the source of truth. Also cache in localStorage for client-side calculations (forecast, recommendations).

**Why DB and not just localStorage:**
- Persists across browsers and devices
- Available to server-side analytics and admin dashboard
- Survives localStorage clears
- Available for cohort-level analysis in multi-user deployments

### 3. Derive capacity from budget

```typescript
const AVG_REVIEW_SESSION_MINUTES = 25;
const AVG_NEW_SESSION_MINUTES = 45;

function deriveCapacity(budgetMinutes: number, currentDailyDue: number) {
  const reviewMinutes = currentDailyDue * AVG_REVIEW_SESSION_MINUTES;
  const reviewCapacity = Math.max(1, Math.floor(budgetMinutes / AVG_REVIEW_SESSION_MINUTES));
  const remainingMinutes = Math.max(0, budgetMinutes - reviewMinutes);
  const newCapacity = Math.floor(remainingMinutes / AVG_NEW_SESSION_MINUTES);
  return { reviewCapacity, newCapacity };
}
```

**Critical: these use session-time constants (25 min/review, 45 min/new), not problem-time constants.** See `CONSTANTS.md` §Time Cost Constants for the derivation and rationale. An earlier draft of this ADR used 15/30; those values underestimate session time by ~40% and produce capacity estimates that are too optimistic.

`reviewCapacity` is the maximum reviews/day the user can sustain. `newCapacity` is how many new problems they can add *after* doing reviews. Both feed into the queue load ratio.

### 4. Wire into recommendations

Replace `peakLoadDays`, `drainRate`, and `acceleration` threshold checks with:

```typescript
const queueLoadRatio = backHalfAvg / reviewCapacity;
```

Use the zone thresholds from `CONSTANTS.md` (Green ≤ 0.6 / Yellow ≤ 0.85 / Amber ≤ 1.1 / Orange ≤ 1.5 / Red > 1.5) to determine recommendation tone and messaging.

### 5. Allow adjustment in Settings

The Settings panel (gear icon on countdown widget) gets a "Daily Budget" field alongside the existing target date and problem count. Changes take effect immediately — no need to re-run onboarding.

### 6. Detect budget mismatch

When observed pace diverges from declared budget for `BUDGET_MISMATCH_WINDOW_DAYS` (5) consecutive days:

- Observed pace > declared × 1.3 → suggest increasing budget: "You're averaging {n}/day — that's a {preset} pace. Want to update your goal?"
- Observed pace < declared × 0.5 → suggest decreasing budget: "You're averaging {n}/day, below your target. Adjust your goal to match?"

These are informational nudges, never blocking. See `CONSTANTS.md` §Budget Mismatch Detection.

---

## Alternatives Considered

| Option | Outcome | Reason |
|---|---|---|
| **A. Infer capacity from observed pace only** | Rejected | No signal for new users; conflates ability with intention |
| **B. Ask for "problems per day" directly** | Rejected | Users don't know their throughput in problems; time is more intuitive |
| **C. Ask for "hours per week" instead of per day** | Rejected | Daily budget is a better match for the daily recommendation cycle; weekly introduces averaging artifacts |
| **D. Don't ask; use 60 min default for everyone** | Partially adopted | 60 min is the fallback, but explicit declaration is better when available |

---

## Schema Change

```sql
ALTER TABLE "user" ADD COLUMN "daily_time_budget_minutes" INTEGER DEFAULT 60;
```

No migration script needed — default value covers existing users.

---

## Unit Test Plan

### deriveCapacity — expected values

These use session-time constants: 25 min/review, 45 min/new.

```typescript
// Zero reviews due — newCapacity is the full budget divided by new-problem session time
deriveCapacity(30, 0)  → { reviewCapacity: 1, newCapacity: 0 }  // floor(30/25)=1; floor(30/45)=0
deriveCapacity(60, 0)  → { reviewCapacity: 2, newCapacity: 1 }  // floor(60/25)=2; floor(60/45)=1
deriveCapacity(90, 0)  → { reviewCapacity: 3, newCapacity: 2 }  // floor(90/25)=3; floor(90/45)=2
deriveCapacity(120, 0) → { reviewCapacity: 4, newCapacity: 2 }  // floor(120/25)=4; floor(120/45)=2

// Reviews consume budget, reducing newCapacity
deriveCapacity(60, 2)  → { reviewCapacity: 2, newCapacity: 0 }  // 2×25=50 min used → 10 left → floor(10/45)=0
deriveCapacity(90, 1)  → { reviewCapacity: 3, newCapacity: 1 }  // 1×25=25 min used → 65 left → floor(65/45)=1
deriveCapacity(90, 2)  → { reviewCapacity: 3, newCapacity: 0 }  // 2×25=50 min used → 40 left → floor(40/45)=0
deriveCapacity(120, 2) → { reviewCapacity: 4, newCapacity: 1 }  // 2×25=50 min used → 70 left → floor(70/45)=1

// Edge: zero budget → floor at 1 review capacity to prevent division by zero
deriveCapacity(0, 0) → { reviewCapacity: 1, newCapacity: 0 }
```

---

## Impact on Existing Features

| Feature | Change |
|---|---|
| Onboarding | New step before problem set selector |
| Settings panel | New "Daily Budget" field |
| `computePracticeRecommendation` | Threshold logic replaces ad hoc checks |
| Queue forecast (Actual mode) | No change — still uses observed pace |
| Queue forecast (Goals mode) | Auto-populates Rev/d and New/d from budget |
| Readiness score | No change — readiness is output quality, not input capacity |
| Admin dashboard | Can aggregate and display budget distributions |

---

## Consequences

- Users get calibrated recommendations from their first session
- The recommendation engine has a principled capacity model instead of magic numbers
- Goal adherence tracking becomes possible (observed vs. declared)
- Budget mismatch detection surfaces when the declared goal doesn't match behavior
- Future: per-user `avgReviewMinutes` can replace the fixed 25-min assumption once we have enough solve-time data; per-difficulty session times (Easy ~15, Medium ~25, Hard ~40) can further improve accuracy for users with skewed difficulty distributions
