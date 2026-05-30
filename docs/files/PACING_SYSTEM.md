# Pacing System Design

> Defines how Aurora manages the balance between new problem coverage and review load, including daily time budgets, queue thresholds, and adaptive recommendations.

**Status:** Implemented (Phases 1–2; later-phase items tracked in [README.md](README.md) Implementation Status)
**Depends on:** `src/lib/srs.ts`, `src/lib/capacity.ts`, `src/lib/pacing.ts`, `dashboard-client.tsx` (forecast + recommendation engine)
**Last updated:** 2026-05-28

---

## Problem Statement

Aurora's current recommendation engine uses ad hoc signals (`peakLoadDays > 2.5`, `drainRate < -0.5`, `acceleration >= 1.25`) derived from trial-and-error rather than principled capacity modeling. The result is that recommendations are sometimes too aggressive (telling users to stop adding new problems when they have plenty of capacity) or too permissive (not warning when queue growth is clearly unsustainable).

The core dynamic: every new problem creates future review load. Users need guidance on *when* to add new problems and *when* to focus on reviews, calibrated to their personal capacity — not a one-size-fits-all heuristic.

---

## Design Goals

1. **Capacity-aware recommendations** — guidance should reflect the user's actual daily time budget, not just raw queue size.
2. **User-set goals** — users declare their daily time commitment during onboarding; the system calibrates around that.
3. **Observable adherence** — track whether users actually follow their declared pace, and use observed behavior to refine recommendations.
4. **Overshoot tolerance** — a few days over threshold is normal variance, not a crisis. Only sustained growth triggers warnings.
5. **Variance in learning rate** — some users retain faster than others. The system should adapt to individual forgetting curves over time, not assume a universal decay rate.
6. **Not cumbersome** — recommendations should feel like a helpful nudge, not a nag. Users who are on track should see minimal interference.

---

## Time Budget Model

### Problem Time vs. Session Time

Every capacity estimate in this system uses **session time**, not problem time. The difference matters:

| Activity | Problem Time | Overhead | **Session Time** |
|---|---|---|---|
| 1 review | 10–25 min | +5–10 min (open, read, breathe between) | **~25 min** |
| 1 new problem | 20–45 min | +10–15 min (study solution, notes, break) | **~45 min** |

LeetCode problems are cognitively dense. The [Pomodoro Technique](https://en.wikipedia.org/wiki/Pomodoro_Technique) exists because sustained deep focus without breaks degrades performance. Nobody does 6 problems in 60 minutes with real engagement — that's 10 min/problem with zero context switching, zero breaks, and zero solution review. In practice, 60 minutes is 2–3 problems done well.

**Per-difficulty variance:** These are medians across the NeetCode 150 difficulty mix. Easy reviews take ~15 min, Medium ~25 min, Hard ~35–40 min. Users working exclusively on Hards will experience lower throughput than the 25-min median suggests. See `CONSTANTS.md` §Per-Difficulty Session Time Estimates for the full breakdown. Per-difficulty capacity modeling is a future enhancement (Phase 3+).

### Daily Time Budget Presets

Offered during onboarding. Users can also set a custom budget.

| Preset | Daily Time | Realistic Problems | Typical Mix | Label |
|---|---|---|---|---|
| Light | 30 min | 1–2 | 1 review or 1 new | "A problem or two when I have time" |
| Moderate | 60 min | 2–3 | 1–2 reviews + 1 new | "Regular daily habit" |
| Focused | 90 min | 3–4 | 2–3 reviews + 1–2 new | "Dedicated prep" |
| Intensive | 120+ min | 4–6 | 3–4 reviews + 1–2 new | "Full-time prep mode" |

### Derived Capacity Constants

From the time budget, we derive:

```
reviewCapacity = floor(dailyMinutes / AVG_REVIEW_SESSION_MINUTES)
newCapacity    = floor((dailyMinutes - reviewLoad * AVG_REVIEW_SESSION_MINUTES) / AVG_NEW_SESSION_MINUTES)
totalCapacity  = floor(dailyMinutes / AVG_PROBLEM_SESSION_MINUTES)
```

Where `AVG_REVIEW_SESSION_MINUTES = 25`, `AVG_NEW_SESSION_MINUTES = 45`, `AVG_PROBLEM_SESSION_MINUTES ≈ 30` (weighted by typical mix).

**Key implication:** A Moderate user (60 min) with 2 reviews due has 60 - 50 = 10 min remaining — not enough for a new problem. This is correct. Reviews eat into new-problem budget, which is the whole point of the pacing system.

### Observed vs. Declared

The declared budget is the *plan*. We also track:

- `observedAvgPerDay` — rolling 7-day average of total attempts/day
- `observedAvgReviewPerDay` — rolling 7-day average of review attempts/day
- `observedAvgNewPerDay` — rolling 7-day average of new problem attempts/day

When observed pace consistently exceeds or falls short of the declared budget, the system can suggest adjusting the goal. See `CONSTANTS.md` §Budget Mismatch Detection for the thresholds: overshoot factor 1.3× over 5 consecutive days triggers a suggestion to increase, undershoot factor 0.5× triggers a suggestion to decrease.

---

## Queue Load Model

### Review Load Formula

Each problem in active learning generates a predictable review load based on its current stability:

```
dailyReviewLoad = Σ(1 / stability_i) for all learning problems
                + Σ(1 / MASTERY_THRESHOLD) for all mastered problems
```

This is already implemented in `dashboard-client.tsx` but not yet connected to the recommendation engine's threshold logic.

### Review Load Per Problem Over Time

A single problem's review burden follows this lifecycle:

| Phase | Stability Range | Reviews/Day | Duration |
|---|---|---|---|
| Fresh (just learned) | 2–5 days | 0.2–0.5 | 1–2 weeks |
| Stabilizing | 5–15 days | 0.07–0.2 | 2–4 weeks |
| Near mastery | 15–45 days | 0.02–0.07 | 4–8 weeks |
| Mastered | 45+ days | < 0.02 | Indefinite |

### Queue Load Ratio

The primary signal for recommendations:

```
queueLoadRatio = projectedDailyDue / reviewCapacity
```

Where `projectedDailyDue` is the back-half average from the 60-day forecast (what the queue is trending toward, not where it is today) and `reviewCapacity` is derived from the user's time budget.

---

## Threshold Zones

### Load Ratio Zones

Five zones, each with distinct guidance:

| Ratio | Zone | Color | Guidance |
|---|---|---|---|
| ≤ 0.6 | Green | `text-green-500` | "Add coverage" — queue is well within capacity |
| 0.6 – 0.85 | Yellow | `text-amber-500` | "Balanced" — add new problems carefully, 1–2/day max |
| 0.85 – 1.1 | Amber | `text-orange-400` | "Review first" — finish reviews before adding new |
| 1.1 – 1.5 | Orange | `text-orange-500` | "Queue heavy" — stop new problems, focus on clearing |
| > 1.5 | Red | `text-red-500` | "Overloaded" — defer low-priority items or accept lapse |

### Absolute Due Count Guardrails

Even with a high declared capacity, certain absolute thresholds provide sanity checks. These reflect session time (with breaks), not raw problem count.

| Daily Due Count | Assessment |
|---|---|
| 0–2 | Light — freely add new |
| 3–4 | Moderate — normal active learning |
| 5–6 | Active — most users should be selective about new problems |
| 7–8 | Heavy — Focused/Intensive users only; others should pause new |
| 8–10 | Very heavy — only sustainable at 2+ hrs/day, and only for reviews |
| 10+ | Unrealistic sustained — treat as a spike, not a baseline |

The absolute ceiling is `MAX_SUSTAINABLE_DUE = min(10, reviewCapacity * 1.2)`. This prevents users with high declared budgets from building queues they can't actually clear.

At 25 min/review session, 8 reviews is **3.3 hours** of review alone with zero new problems. Anyone claiming they sustain 10+ reviews/day is either doing 5-minute glance-and-confirm reviews (which don't build real retention) or doing it for a day or two before burning out.

### Overshoot Tolerance

A few days over threshold is normal variance. The system should flag *sustained* growth, not spikes.

| Condition | Response |
|---|---|
| 1–2 days over threshold, then declining | No warning. Normal variance. |
| 3–4 consecutive days over threshold | Soft warning: "Your queue has been growing — consider pausing new problems." |
| 5+ consecutive days over threshold | Firm warning: "Review first. Queue has grown for {n} consecutive days." |
| Back-half avg > front-half avg by > 10% | Trend warning regardless of absolute level |

### Constants

```typescript
// Queue load ratio zones — 5 zones
const QUEUE_GREEN_RATIO   = 0.6;   // below: freely add new
const QUEUE_YELLOW_RATIO  = 0.85;  // below: add carefully
const QUEUE_AMBER_RATIO   = 1.1;   // below: review first if growing
const QUEUE_ORANGE_RATIO  = 1.5;   // below: queue heavy — stop new
const QUEUE_RED_RATIO     = 2.0;   // above: overloaded

// Overshoot tolerance
const OVERSHOOT_TOLERANCE_DAYS = 3;

// Absolute guardrails
const MAX_SUSTAINABLE_DUE_DEFAULT = 8;

// Forecast slider ranges (Goals mode)
const MAX_FORECAST_REVIEWS = 8;
const MAX_FORECAST_NEW     = 4;

// Forecast horizon
const FORECAST_HORIZON_DAYS = 60;  // 30 hides the mastery relief; 60 shows full cycle

// Session time constants
const AVG_REVIEW_SESSION_MINUTES = 25;
const AVG_NEW_SESSION_MINUTES    = 45;

// Budget mismatch detection
const BUDGET_MISMATCH_WINDOW_DAYS = 5;
const BUDGET_OVERSHOOT_FACTOR = 1.3;
const BUDGET_UNDERSHOOT_FACTOR = 0.5;
```

---

## Recommendation Decision Tree

Replaces the current `computePracticeRecommendation` logic with a principled capacity-based approach.

```
1. Is user on a break (≥ 7 days since last attempt)?
   → "Welcome back" warmup messaging
   → Suggest: "Start with ≤ {min(reviewQueue.length, 5)} reviews today"

2. Compute queueLoadRatio = backHalfAvg / reviewCapacity

3. queueLoadRatio > 1.5 (RED):
   → tone: "danger"
   → "Queue overloaded — consider deferring lower-priority problems"
   → Show: "You have ~{backHalfAvg} due/day but capacity for ~{reviewCapacity}"

4. queueLoadRatio 1.1–1.5 (ORANGE):
   → tone: "danger"
   → "Queue heavy — stop new problems until queue stabilizes"
   → Show target: "Clear to ≤ {capacity × 0.85} due/day before adding new"

5. queueLoadRatio 0.85–1.1 AND queue growing (drainRate < 0):
   → tone: "watch"
   → "Review first — queue is near capacity and growing"
   → Softer if only 1–2 days of growth; firmer if 3+

6. queueLoadRatio 0.85–1.1 AND queue stable/shrinking:
   → tone: "watch" (softer)
   → "Balanced — add 0–1 new today if you have time after reviews"

7. queueLoadRatio 0.6–0.85:
   → tone: "good"
   → "Add coverage" — queue is healthy
   → Show pace target from countdown

8. queueLoadRatio < 0.6:
   → tone: "good"
   → "Add coverage" — queue is light
   → More aggressive new-problem encouragement

9. Special: attemptedCount < 5:
   → tone: "neutral"
   → "Getting started" — too little data for load ratio; guide to first problems
```

---

## User Goal System

### Onboarding Flow

During onboarding (step 3 — "Set Your Goal"), add a time budget selector before the problem set choice:

```
How much time can you practice daily?
  [ ] 30 min — Casual
  [ ] 60 min — Regular        ← default
  [ ] 90 min — Focused
  [ ] 2+ hrs — Intensive
  [ ] Custom: [___] min
```

The time budget is stored in `users.dailyTimeBudgetMinutes` and persisted to localStorage for client-side calculations.

### Goal Persistence

| Field | Storage | Purpose |
|---|---|---|
| `dailyTimeBudgetMinutes` | DB (`users` table) + localStorage | Primary capacity signal |
| `goalType` | localStorage | blind75 / neetcode150 / none |
| `targetDate` | localStorage | Coverage countdown target |
| `plannedNewPerDay` | localStorage | User's self-set new/day target |
| `plannedReviewPerDay` | localStorage | User's self-set review/day target |

### Goal Adjustment Suggestions

When observed pace diverges from declared budget for `BUDGET_MISMATCH_WINDOW_DAYS` (5) consecutive days:

- **Consistently exceeding**: "You're averaging {observed} problems/day — more than your {declared} min budget. Want to update your goal?"
- **Consistently under**: "You're averaging {observed}/day, below your {declared} min target. Adjust your goal to match, or try to fit in one more review today."

These are informational, never blocking. If the user dismisses a budget mismatch suggestion, don't repeat for at least 14 days. See `EDGE_CASES.md` §4.4 (Budget Mismatch Accumulation).

---

## Variance in Learning Rate

### The Problem

The current SRS uses fixed multipliers (2.5× for YES:OPTIMAL, etc.) and a fixed `INITIAL_STABILITY_BASE = 2.0`. In reality:

- Some users retain Two Pointers problems after 1 review but need 5 reviews for DP
- Some users have naturally faster forgetting curves (stability grows slower)
- Prior exposure (from school, work, prior prep) varies wildly

### Current Approach (v1)

Fixed multipliers, no per-user or per-category adaptation. This is defensible for now because:
- We don't have enough user data to calibrate per-user parameters
- FSRS's own research shows fixed parameters work reasonably well for most users
- Per-user adaptation requires a minimum of ~50–100 reviews to be statistically meaningful

### Future Approach (v2 — tracked, not yet designed)

When we have sufficient review data (from extended public usage or a pilot deployment):

1. **Per-user multiplier calibration** — observe actual retention rates at each stability level and adjust the base multiplier to match. If a user forgets faster than expected (R predicted 0.8, actual success 0.6), their effective multiplier should be lower.

2. **Per-category difficulty scaling** — if a user's DP problems consistently have lower retention than their Array problems at the same stability, apply a category-specific stability discount.

3. **Confidence calibration** — use `computeMetacognitionGap` data to weight confidence modifiers differently for users who are systematically overconfident or underconfident.

This is tracked as a research direction, not a near-term implementation task. See `ADAPTIVE_SRS.md` for the full design, including known issues with EMA volatility near the retrievability floor.

---

## Implementation Plan

### Phase 1: Time Budget Goal (Onboarding + Settings)

- Add `dailyTimeBudgetMinutes` to `users` schema
- Add time budget selector to onboarding step 3
- Add time budget to Settings panel
- Derive `reviewCapacity` and `newCapacity` from budget
- Store in localStorage for client-side forecast calculations

### Phase 2: Load Ratio Thresholds

- Replace ad hoc threshold constants in `computePracticeRecommendation` with load ratio zones
- Wire `reviewCapacity` into the recommendation decision tree
- Add overshoot tracking (consecutive days over threshold)
- Update recommendation tone/messaging to match new 5-zone system
- Extend forecast horizon from 30 to 60 days (`FORECAST_HORIZON_DAYS`)

### Phase 3: Goal Adherence Tracking

- Track daily adherence: did the user hit their review/new targets?
- Surface adherence in the Activity chart or a dedicated widget
- Suggest goal adjustments when observed pace diverges from declared (budget mismatch detection)
- Begin collecting per-user `avgReviewMinutes` from observed solve times

### Phase 4: Forecast Refinement

- Use load ratio to color-code forecast bars (Green/Yellow/Amber/Orange/Red zones)
- Add a "target line" on the forecast showing the user's sustainable capacity
- Show explicit "new problems safe to add" count based on remaining capacity

---

## Open Questions

1. **Should the time budget affect the SRS algorithm itself, or only the recommendation layer?**
   Current design: recommendation only. The SRS computes stability/retrievability identically regardless of budget. Only the "should you add new problems today" guidance changes.

2. **How to handle users who don't set a time budget?**
   Default to 60 min (Moderate). Use observed pace to infer actual capacity after 7+ days.

3. **Should the forecast Goals mode auto-populate from the time budget?**
   Yes — if the user sets 90 min, Goals mode should default to ~3 rev/d + 1 new/d. User can still override.

4. **What happens when a user changes their time budget mid-prep?**
   Recalculate all derived constants immediately. No retroactive changes to SRS state. The forecast and recommendations update on next render.

5. **Should the queue forecast extend beyond 30 days?**
   Yes — 60 days. A 30-day forecast hides the stabilization that happens when early problems graduate to mastery (stability ≥ 45 days, around week 5–8). Users see a growing queue for 30 days and think it will grow forever. A 60-day horizon shows the full cycle: ramp-up → peak review load → mastery relief → declining queue. This is especially important for Focused/Intensive users who hit peak load around week 4–5 and need to see that the pressure is temporary.

   **Implementation note:** The current codebase (`dashboard-client.tsx`) still uses `MAX_DAYS = 30`. Extending to 60 is Phase 2 work.

---

## Future Direction: Post-Mastery Interleaving

The [interleaving ADR](../decisions/2026-04-20-interleaving.md) rejected interleaving as a review queue ordering strategy — correctly, because NeetCode 150 is a dependency-ordered curriculum where category mastery must precede cross-category mixing.

However, interleaving becomes appropriate *after* mastery. The research progression:

1. **Sequential mastery** — user works through categories in order (Arrays → Two Pointers → Stack → ...). This is the current model.
2. **Category completion** — user finishes Blind 75 or NeetCode 150 within a category track.
3. **Full coverage** — user has attempted all problems in their goal set.
4. **Post-mastery interleaving** — once problems are individually mastered (stability ≥ 45 days), interleaved review across categories strengthens *pattern discrimination* — the ability to recognize which technique applies when you don't know the category in advance.

This maps directly to the interview scenario: you don't know if a problem is a Two Pointers or Sliding Window problem until you recognize the pattern. Interleaved review after mastery trains exactly this skill.

**Implementation note:** This is a future feature. When built, it should be a separate review mode ("Interview Prep" or "Mixed Review") that pulls from mastered problems across all categories, with a slight bias toward the user's weakest categories. It should *not* replace the urgency-sorted queue — it's a supplemental mode for users who've reached a high readiness tier (A or S).

---

## References

- FSRS calibration research: [github.com/open-spaced-repetition/fsrs4anki](https://github.com/open-spaced-repetition/fsrs4anki)
- Current implementation: `src/lib/srs.ts`, `src/app/dashboard/dashboard-client.tsx`
- Queue forecast: `queueProjection` and `queueProjectionGoals` in `dashboard-client.tsx`
- Recommendation engine: `computePracticeRecommendation` in `dashboard-client.tsx`
