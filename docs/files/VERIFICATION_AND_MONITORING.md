# Verification & Monitoring Protocol

> How to verify the pacing system is implemented correctly, and how to confirm it continues working as expected over time.

**Status:** Active — use during implementation and after deployment
**Depends on:** PACING_SYSTEM.md, CONSTANTS.md, EVALUATION_PROTOCOL.md
**Last updated:** 2026-05-10

---

## Part 1: Implementation Verification

Use this section when an agent completes a phase. Each phase has acceptance criteria that must pass before merging.

---

### Phase 1: Time Budget Goal

**What's being built:** `dailyTimeBudgetMinutes` schema field, onboarding selector, Settings panel, `deriveCapacity()` function.

#### 1.1 Schema Verification

```sql
-- After migration, verify the column exists with correct default
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'user' AND column_name = 'daily_time_budget_minutes';

-- Expected: integer, DEFAULT 60
```

- [ ] Column exists in `src/db/schema.ts` with `integer` type and `.default(60)`
- [ ] Existing users are unaffected (default covers them)
- [ ] `npx drizzle-kit push` succeeds without error
- [ ] New sign-ups get `daily_time_budget_minutes = 60` in the DB

#### 1.2 Unit Tests — `deriveCapacity()`

These are the authoritative test cases. Every one must pass. They use session-time constants (`AVG_REVIEW_SESSION_MINUTES = 25`, `AVG_NEW_SESSION_MINUTES = 45`).

```typescript
// tests/unit/pacing.test.ts

import { describe, it, expect } from "vitest";
import { deriveCapacity } from "@/lib/pacing";

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
```

**Pass criteria:** All 12 tests pass. `deriveCapacity` must be a pure function (no side effects, no DB calls).

#### 1.3 Unit Tests — `classifyLoadZone()`

```typescript
import { describe, it, expect } from "vitest";
import { classifyLoadZone } from "@/lib/pacing";

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
```

**Pass criteria:** All 11 tests pass. Zone boundaries are inclusive on the lower end (`≤`), exclusive on the upper.

#### 1.4 Onboarding UI Verification

Run these manually in the browser (dev or preview deploy):

- [ ] New unauthenticated user → Demo mode → onboarding shows time budget selector
- [ ] Time budget selector appears *before* the problem set choice (Blind 75 / NeetCode 150)
- [ ] Presets: 30 / 60 / 90 / 120+ min displayed with labels (Casual / Regular / Focused / Intensive)
- [ ] Default selection is 60 min (Regular)
- [ ] Custom input accepts values 10–480, rejects outside range
- [ ] Selecting a preset stores the value; completing onboarding persists to DB
- [ ] Mobile: selector renders without overflow or clipping (test at 375px width)

#### 1.5 Settings Panel Verification

- [ ] Settings panel (gear icon on countdown widget) shows "Daily Budget" field
- [ ] Current budget displays correctly (reads from DB on page load)
- [ ] Changing budget updates localStorage immediately
- [ ] Changing budget persists to DB on Save
- [ ] Recommendation updates within the same page session (no reload required)
- [ ] Forecast Goals mode auto-populates Rev/d and New/d from the new budget

#### 1.6 Persistence Verification

```
Test sequence:
1. Sign in → set budget to 90 min via Settings → verify DB has 90
2. Close browser → reopen → verify dashboard reads 90 from DB
3. Open a different browser → sign in → verify 90 (DB is source of truth)
4. Clear localStorage → reload → verify 90 (recovers from DB)
5. Change to 60 via Settings → verify both DB and localStorage update
```

- [ ] DB and localStorage agree after every change
- [ ] DB wins on any conflict (page load reads DB, writes to both)

#### 1.7 Demo Mode Verification

- [ ] Unauthenticated users see the budget selector in onboarding
- [ ] Demo dashboard uses a sensible default budget (60 min)
- [ ] Changing budget in demo mode updates recommendations client-side
- [ ] No API calls are attempted for budget changes in demo mode

---

### Phase 2: Load Ratio Thresholds

**What's being built:** Replace ad hoc recommendation thresholds with load-ratio zones, overshoot tracking, 30→60 day forecast extension.

#### 2.1 Recommendation Engine Verification

For each scenario, set up the state (or mock it) and verify the recommendation output:

```
Test matrix — verify tone and title match expectations:

| Budget | Due/day (back-half avg) | Ratio  | Expected Zone | Expected Tone |
|--------|------------------------|--------|---------------|---------------|
| 60 min | 0.5                    | 0.25   | Green         | "good"        |
| 60 min | 1.2                    | 0.60   | Green         | "good"        |
| 60 min | 1.5                    | 0.75   | Yellow        | "good"        |
| 60 min | 2.0                    | 1.00   | Amber         | "watch"       |
| 60 min | 2.5                    | 1.25   | Orange        | "danger"      |
| 60 min | 3.5                    | 1.75   | Red           | "danger"      |
| 30 min | 1.5                    | 1.50   | Orange        | "danger"      |
| 120 min| 3.0                    | 0.75   | Yellow        | "good"        |
| 120 min| 6.0                    | 1.50   | Orange        | "danger"      |
```

- [ ] Each row produces the expected zone classification
- [ ] Budget-sensitive: same absolute due count produces different zones at different budgets
- [ ] Trend-aware: a declining queue at ratio 1.0 produces softer messaging than a growing queue at ratio 1.0
- [ ] `attemptedCount < 5` always produces "Getting started" regardless of ratio

#### 2.2 Overshoot Tracking

```
Simulate consecutive days over threshold:

Day 1: ratio 1.2 → no warning (1 day)
Day 2: ratio 1.3 → no warning (2 days)
Day 3: ratio 1.1 → soft warning triggers (3 consecutive days)
Day 4: ratio 0.8 → warning clears (streak broken)
Day 5: ratio 1.2 → no warning (streak reset to 1)
```

- [ ] Warning appears on day 3 (not before)
- [ ] Warning clears when ratio drops below threshold
- [ ] Streak counter resets after a below-threshold day
- [ ] Firm warning at 5 consecutive days (verify messaging changes)

#### 2.3 Forecast Extension (30 → 60 days)

- [ ] `MAX_DAYS` constant changed from 30 to 60 in `dashboard-client.tsx`
- [ ] Forecast chart renders 60 bars (not 30)
- [ ] Chart remains readable at 60 bars (bar width doesn't collapse to sub-pixel)
- [ ] Back-half average is computed from days 31–60 (not 16–30)
- [ ] Front-half average is computed from days 1–30 (not 1–15)
- [ ] Trend label ("↑ Growing", "→ Stable", "↓ Improving") uses 30/30 split, not 15/15
- [ ] Mobile: chart scrolls horizontally or condenses gracefully at 375px width
- [ ] Performance: forecast computation stays under 5ms (60-day sim with 50 items)

#### 2.4 Integration — Recommendation + Forecast Agreement

The recommendation and the forecast should never visually contradict each other:

- [ ] If recommendation says "Add coverage" (Green), the forecast trend should not show "↑ Growing"
- [ ] If recommendation says "Review first" (Amber+), the forecast should show a non-trivial queue
- [ ] If the forecast shows "↓ Improving", the recommendation should not say "Overloaded"

---

### Phase 3: Goal Adherence Tracking

**What's being built:** Budget mismatch detection, adherence surfacing, `daysToFirstWarning` tracking.

#### 3.1 Budget Mismatch Detection

```
Test sequence:
1. User declares 60 min budget (Moderate)
2. User averages 4.5 problems/day for 5 consecutive days (that's ~135 min, > 60 × 1.3)
3. System should surface: "You're averaging 4.5/day — that's a Focused pace"
4. User dismisses the suggestion
5. Suggestion should not reappear for 14 days
6. On day 20, if still exceeding, suggestion reappears
```

- [ ] Overshoot detection fires at `observed > declared × 1.3` for 5 consecutive days
- [ ] Undershoot detection fires at `observed < declared × 0.5` for 5 consecutive days
- [ ] Dismiss persists (localStorage key with timestamp)
- [ ] Cooldown: no repeat within 14 days of dismissal
- [ ] Suggestion is informational (no blocking modal, no forced action)

#### 3.2 Time-to-First-Warning Event

- [ ] On the first time a user's recommendation reaches Yellow or above, log a one-time event
- [ ] Event payload: `{ userId, daysActive, budgetPreset, zone, timestamp }`
- [ ] "daysActive" = count of distinct days with ≥1 attempt, not calendar days since signup
- [ ] Event fires exactly once per user (idempotent — check a flag before logging)

---

### Phase 4: Forecast Refinement

#### 4.1 Zone-Colored Forecast Bars

- [ ] Bars below the user's capacity line are Green
- [ ] Bars near capacity are Yellow/Amber
- [ ] Bars above capacity are Orange/Red
- [ ] Colors match the 5-zone definitions exactly
- [ ] A capacity reference line is drawn on the chart (dashed, labeled with rev/d capacity)

---

## Part 2: Ongoing Monitoring

Use this section after the pacing system is deployed. These checks validate that the system is doing what we expect with real users over time.

---

### 2.1 Health Metrics (Check Weekly)

Collect these from the admin dashboard or a lightweight analytics query. The goal is to catch miscalibration early.

#### Metric: Zone Distribution

```sql
-- Approximate: what zone are users landing in right now?
-- Run against recent recommendation snapshots or compute from current state
```

| Zone | Expected Distribution | Red Flag |
|---|---|---|
| Green | 40–60% of active users | < 20% → thresholds too tight |
| Yellow | 20–30% | < 10% → thresholds too loose |
| Amber | 10–20% | > 40% → constants or capacity model is wrong |
| Orange | 5–10% | > 20% → review burden is too high systemically |
| Red | < 5% | > 10% → something is fundamentally broken |

**What to do if distribution is off:** Check `AVG_REVIEW_SESSION_MINUTES` and `AVG_NEW_SESSION_MINUTES` against observed solve times. If users are consistently faster or slower than the constants assume, the capacity model will be miscalibrated in a predictable direction.

#### Metric: Recommendation Follow Rate

Track how often users' next action matches the recommendation:

| Recommendation | Expected Follow Rate | Red Flag |
|---|---|---|
| "Add coverage" (Green) | 60–80% add a new problem | < 30% → users don't trust the guidance |
| "Review first" (Amber) | 50–70% do a review next | < 25% → messaging isn't compelling |
| "Queue heavy" (Orange) | 40–60% do a review next | < 20% → users are ignoring warnings |
| "Overloaded" (Red) | User defers or does a review | < 15% at Red is expected (frustrated users) |

**What to do if follow rate is low:** The recommendation may be correct but the *messaging* is wrong. Users respond better to "here's what will happen if you don't" than "you should do X." Consider adding the projected queue size if ignored.

#### Metric: Time-to-First-Warning Distribution

After 50+ users have reached their first warning, plot the distribution:

| Days to First Warning | Assessment |
|---|---|
| < 5 for most users | Thresholds too tight; nags before users have context |
| 5–14 | Healthy; users build enough queue to encounter the dynamics |
| > 21 | Too loose; unsustainable queues grow unchecked for 3 weeks |
| Never (30+ active days) | Acceptable for Light users; concerning if Moderate+ |

#### Metric: Recovery Time After Warning

For users who received an Amber+ warning and then complied (review rate increased):

| Recovery Days | Assessment |
|---|---|
| 3–7 | System is calibrated correctly |
| 7–14 | Slightly optimistic capacity model or slow-draining queue |
| > 14 | Capacity constants are too aggressive; users can't clear at predicted rate |
| Never recovered | User churned or gave up; investigate if systemic |

---

### 2.2 Calibration Checkpoints (Check Monthly)

#### Session Time Constant Validation

Compare the system's assumed session times against observed data:

```sql
-- Average solve time by difficulty (reviews only — problems with prior attempts)
SELECT
  p.difficulty,
  AVG(a.solve_time_minutes) as avg_solve,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY a.solve_time_minutes) as median_solve,
  COUNT(*) as n
FROM attempt a
JOIN problem p ON a.problem_id = p.id
JOIN user_problem_state ups ON a.user_id = ups.user_id AND a.problem_id = ups.problem_id
WHERE a.solve_time_minutes IS NOT NULL
  AND a.solve_time_minutes > 0
  AND a.solve_time_minutes < 120  -- cap outliers
  AND ups.total_attempts > 1      -- reviews only (not first attempt)
GROUP BY p.difficulty;
```

| Constant | Assumed | Trigger to Recalibrate |
|---|---|---|
| `AVG_REVIEW_SESSION_MINUTES` (25) | Median review solve time + 10 min overhead | If median review solve > 20 or < 10 with n > 200 |
| `AVG_NEW_SESSION_MINUTES` (45) | Median first-attempt solve time + 15 min overhead | If median first solve > 40 or < 20 with n > 100 |

**Critical:** Use *median*, not mean. Mean is skewed by distracted sessions (45 min for an Easy) and speed runners (3 min for a Medium).

#### Queue Load Ratio Zone Boundary Validation

For each zone, check whether users in that zone actually experience what the zone predicts:

```
For users currently in Yellow ("Balanced — add carefully"):
  - Do they maintain stable queues over the next 7 days?
  - If > 30% tip into Orange within 7 days: QUEUE_YELLOW_RATIO is too high (should be lower)
  - If < 5% ever reach Orange: QUEUE_YELLOW_RATIO is too low (should be higher)

For users currently in Orange ("Queue heavy"):
  - Do they recover to Yellow within 7 days if they stop adding new problems?
  - If most don't: capacity constants or multiplier assumptions are wrong
```

#### SRS Accuracy (Predicted R vs. Actual Outcome)

This is the deepest calibration check. It validates whether the SRS engine's retrievability predictions match reality.

```sql
-- Requires Phase 1 of ADAPTIVE_SRS.md: recording predictedR at review time
-- Once that column exists:
SELECT
  CASE
    WHEN predicted_r < 0.5 THEN '0.3-0.5'
    WHEN predicted_r < 0.65 THEN '0.5-0.65'
    WHEN predicted_r < 0.8 THEN '0.65-0.8'
    WHEN predicted_r < 0.9 THEN '0.8-0.9'
    ELSE '0.9-1.0'
  END as r_bucket,
  COUNT(*) as n,
  AVG(CASE WHEN solved_independently = 'YES' THEN 1.0 ELSE 0.0 END) as actual_success_rate
FROM attempt a
WHERE predicted_r IS NOT NULL
GROUP BY 1
ORDER BY 1;
```

**Well-calibrated:** Each bucket's `actual_success_rate` is within 0.1 of its midpoint. E.g., the 0.65–0.8 bucket should have ~72% success rate.

**Overpredicting (too optimistic):** Actual success rate is consistently *below* the predicted midpoint. Users fail more often than expected. → Reduce `INITIAL_STABILITY_BASE` or base multipliers.

**Underpredicting (too conservative):** Actual success rate is consistently *above* the predicted midpoint. Users are reviewing problems they already know. → Increase multipliers (carefully).

---

### 2.3 User Behavior Monitors (Automated Alerts)

Set these up as lightweight checks that run on a schedule (daily or weekly). They don't require a monitoring stack — a cron job that queries the DB and logs to stdout (or sends a Slack webhook) is sufficient.

#### Alert: Queue Explosion

```
Condition: Any user has > 30 problems due on a single day
           AND their budget is Moderate or lower (≤ 60 min)
Action:    Log for review. Check if their SRS states make sense
           or if a bug created impossible review schedules.
Frequency: Daily
```

This catches systematic bugs (e.g., all stabilities collapsing to 0.5 due to a migration error) before users report them.

#### Alert: Recommendation Stuck

```
Condition: A user has seen the same recommendation tone ("danger" or "watch")
           for 14+ consecutive days despite active practice (≥ 1 attempt/day)
Action:    Check if the user's capacity model is miscalibrated.
           They might be doing reviews but the load ratio isn't dropping
           because new problems keep entering the queue (review-only advice
           is being ignored, or the system isn't detecting their reviews).
Frequency: Weekly
```

#### Alert: Zero-Budget Users

```
Condition: A user has NULL or 0 for dailyTimeBudgetMinutes
           AND has > 10 attempts (not a brand-new user)
Action:    The migration didn't cover them, or the onboarding was skipped.
           These users get no capacity-calibrated recommendations.
Frequency: Weekly (during Phase 1 rollout), then monthly
```

#### Alert: Session Time Drift

```
Condition: Rolling 30-day median solve time for reviews deviates > 40%
           from AVG_REVIEW_SESSION_MINUTES (25)
           across all users with > 50 review attempts
Action:    The session-time constants may need recalibration.
           Check if the user base has shifted (more experienced users
           = faster reviews, or expansion to harder problems = slower).
Frequency: Monthly
```

---

## Part 4: Runbook — When Things Go Wrong

### Problem: Users are all stuck in Orange/Red

**Likely cause:** `AVG_REVIEW_SESSION_MINUTES` is too low (capacity is overestimated), or `INITIAL_STABILITY_BASE` is too low (reviews come back too fast).

**Diagnostic:**
1. Check median observed review time. If > 30 min, the 25-min constant is too optimistic.
2. Check the stability distribution of due problems. If most have stability < 3 days, the initial stability or multipliers are too conservative.

**Fix:** Increase `AVG_REVIEW_SESSION_MINUTES` (reduces capacity → zones shift → Green zone gets smaller, but users stop being told they have more capacity than they do). Or increase `INITIAL_STABILITY_BASE` so first reviews come later.

### Problem: Nobody ever hits a warning

**Likely cause:** Zone boundaries are too loose, or users are self-regulating before the system needs to intervene (which is actually fine if retention is healthy).

**Diagnostic:**
1. Check time-to-first-warning distribution. If most users never trigger Yellow, check whether their queues are genuinely small or whether the back-half average computation is smoothing away real growth.
2. Check if users with growing queues have low load ratios because their declared budget is high. A user who set 120 min but practices 30 min/day has a misleadingly low ratio.

**Fix:** If retention is healthy and users aren't burning out, this may not be a problem. Only intervene if users are building unsustainable queues without warning.

### Problem: Recommendations oscillate rapidly

**Likely cause:** The user's 7-day pace average is volatile (e.g., they practice in bursts), causing the ratio to cross zone boundaries every few days.

**Diagnostic:** Check if the recommendation tone changes more than 2x per week for the same user.

**Fix:** Add hysteresis: once a user enters a zone, they must cross the *next* zone's boundary to trigger a change, not just re-cross the same boundary. For example, once in Amber, they must drop to ratio < 0.6 (Green threshold) to get "Add coverage" again, not just < 0.85 (Yellow threshold). This prevents flickering.

### Problem: Agent implemented deriveCapacity with wrong constants

**Diagnostic:** Run the unit tests. If `deriveCapacity(60, 0)` returns `{ reviewCapacity: 4, newCapacity: 2 }` instead of `{ reviewCapacity: 2, newCapacity: 1 }`, the agent used problem-time constants (15/30) instead of session-time constants (25/45).

**Fix:** Check that the constants at the top of the file match `CONSTANTS.md`. The test suite is the authoritative check — if the tests pass, the constants are correct.

---

## Appendix: Monitoring Query Templates

### A. Current Zone Distribution (All Active Users)

```sql
-- "Active" = at least 1 attempt in the past 14 days
-- Requires dailyTimeBudgetMinutes on the user and a materialized backHalfAvg
-- (or compute it client-side and log snapshots)

-- Simplified version: just check if users have overdue problems relative to capacity
WITH active_users AS (
  SELECT DISTINCT user_id
  FROM attempt
  WHERE created_at > NOW() - INTERVAL '14 days'
),
user_load AS (
  SELECT
    u.id,
    u.daily_time_budget_minutes,
    GREATEST(1, FLOOR(u.daily_time_budget_minutes / 25.0)) as review_capacity,
    COUNT(ups.id) FILTER (WHERE ups.next_review_at <= NOW()) as due_count
  FROM "user" u
  JOIN active_users au ON u.id = au.user_id
  LEFT JOIN user_problem_state ups ON u.id = ups.user_id
  GROUP BY u.id, u.daily_time_budget_minutes
)
SELECT
  CASE
    WHEN due_count::float / review_capacity <= 0.6 THEN 'green'
    WHEN due_count::float / review_capacity <= 0.85 THEN 'yellow'
    WHEN due_count::float / review_capacity <= 1.1 THEN 'amber'
    WHEN due_count::float / review_capacity <= 1.5 THEN 'orange'
    ELSE 'red'
  END as zone,
  COUNT(*) as user_count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) as pct
FROM user_load
GROUP BY 1
ORDER BY ARRAY_POSITION(ARRAY['green','yellow','amber','orange','red'], zone);
```

### B. Recommendation Follow Rate (Past 7 Days)

```sql
-- Requires recommendation_action event log
-- If not yet instrumented, approximate by checking what the user did
-- within 30 minutes of their last dashboard load

-- Placeholder: implement when event logging is in place
```

### C. Session Time Drift Check

```sql
SELECT
  DATE_TRUNC('week', a.created_at) as week,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY a.solve_time_minutes) as median_review_time,
  COUNT(*) as n
FROM attempt a
JOIN user_problem_state ups ON a.user_id = ups.user_id AND a.problem_id = ups.problem_id
WHERE a.solve_time_minutes IS NOT NULL
  AND a.solve_time_minutes > 0
  AND a.solve_time_minutes < 120
  AND ups.total_attempts > 1  -- reviews only
  AND a.created_at > NOW() - INTERVAL '12 weeks'
GROUP BY 1
ORDER BY 1;

-- Plot: if the weekly median drifts > 40% from 25 min, recalibrate
```
