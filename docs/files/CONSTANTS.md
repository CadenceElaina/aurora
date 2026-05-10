# Constants & Thresholds Reference

> Single source of truth for every numeric constant in the pacing, queue management, and recommendation systems. When a constant changes, update it here first, then propagate to code.

**Status:** Reference — constants defined but not yet wired into implementation
**Last updated:** 2026-05-10

---

## Time Cost Constants

### Problem Time vs. Session Time

A critical distinction: **problem time** is the clock on the coding task itself. **Session time** is the wall-clock time a user actually spends, including breaks, context switching, reading the problem statement, checking the solution video, getting water, and the mental recovery between cognitively dense tasks.

LeetCode problems are about as cognitively intensive as work gets. The [Pomodoro Technique](https://en.wikipedia.org/wiki/Pomodoro_Technique) exists because humans can't sustain deep focus without breaks — and every SRS system that ignores this overestimates throughput.

| Activity | Problem Time | Overhead (breaks, setup, context switch) | **Session Time** |
|---|---|---|---|
| 1 review (known problem) | 10–25 min | +5–10 min | **~20–30 min** |
| 1 new problem (learn + attempt) | 20–45 min | +10–15 min | **~35–55 min** |

**Aurora uses session time, not problem time, for all capacity calculations.**

| Constant | Value | Unit | Derivation |
|---|---|---|---|
| `AVG_REVIEW_SESSION_MINUTES` | 25 | min | Median session time for a review: open problem, re-solve, check, breathe |
| `AVG_NEW_SESSION_MINUTES` | 45 | min | Median session time for a new problem: read, attempt, study solution, notes |
| `AVG_EASY_NEW_SESSION_MINUTES` | 25 | min | Session time for a new Easy problem (less overhead than Medium/Hard) |
| `AVG_PROBLEM_SESSION_MINUTES` | 30 | min | Weighted average assuming ~60% reviews, ~40% new |

These are defaults. Future versions may personalize based on observed solve times per user.

### Why These Numbers, Not Lower

- "I can review Two Sum in 5 minutes" — yes, but you also need to open it, read it, decide your approach, code it, and verify. Even a trivial Easy takes 10+ min of session time.
- "I can do 6 problems in 60 minutes" — that's 10 min/problem with zero breaks. Try it for a week straight and see if you sustain it. Most people cannot.
- The numbers above are *medians across the NeetCode 150 difficulty mix*. An Easy review may take 15 min; a Hard new problem may take 60 min. The average accounts for the mix.

### Per-Difficulty Session Time Estimates (Informational)

These are not yet used in capacity calculations but represent the realistic range. Users with heavily skewed difficulty distributions (e.g., grinding only Hards) will experience throughput lower than the median-based defaults suggest.

| Difficulty | Review Session | New Problem Session | Notes |
|---|---|---|---|
| Easy | ~15 min | ~25 min | Pattern recognition + quick verify |
| Medium | ~25 min | ~45 min | The median case; most NeetCode 150 problems |
| Hard | ~35–40 min | ~55–65 min | Multi-step reasoning, tricky edge cases |

**Future enhancement (Phase 3+):** Derive per-user `avgReviewMinutes` and `avgNewMinutes` from observed `solveTimeMinutes`, optionally weighted by difficulty. This would improve capacity estimates for users with non-typical difficulty mixes.

---

## Daily Capacity Presets

All derived from session time (including breaks and overhead), not raw problem time.

| Preset | `dailyTimeBudgetMinutes` | Realistic Total Problems | Typical Mix | Label |
|---|---|---|---|---|
| Light | 30 | **1–2** | 1 review, maybe 1 new | "A problem or two when I have time" |
| Moderate | 60 | **2–3** | 1–2 reviews + 1 new | "Regular daily habit" |
| Focused | 90 | **3–4** | 2–3 reviews + 1–2 new | "Dedicated prep" |
| Intensive | 120+ | **4–6** | 3–4 reviews + 1–2 new | "Full-time prep mode" |

**Why these are lower than the previous version:**

The original estimates (4–6 for 60 min, 6–9 for 90 min) assumed zero overhead between problems — pure problem-time throughput. Nobody actually operates that way. A 60-minute session with two problems and a 5-minute break between them is a *good* session, not a slow one.

Capacity derivation (using session-time constants):
```
reviewCapacity = floor(dailyTimeBudgetMinutes / AVG_REVIEW_SESSION_MINUTES)
newCapacity    = floor(remainingMinutes / AVG_NEW_SESSION_MINUTES)
  where remainingMinutes = dailyTimeBudgetMinutes - (expectedDailyDue * AVG_REVIEW_SESSION_MINUTES)
totalCapacity  = floor(dailyTimeBudgetMinutes / AVG_PROBLEM_SESSION_MINUTES)
```

| Preset | `reviewCapacity` | `newCapacity` (if 0 reviews due) | `totalCapacity` |
|---|---|---|---|
| Light (30 min) | 1 | 0 | 1 |
| Moderate (60 min) | 2 | 1 | 2 |
| Focused (90 min) | 3 | 2 | 3 |
| Intensive (120 min) | 4 | 2 | 4 |

Note: `newCapacity` is what's left *after* reviews. A Moderate user with 2 reviews due has 60 - 50 = 10 min left — not enough for a new problem. This is correct and intended: reviews eat into new-problem budget.

---

## Queue Load Ratio Zones

The primary signal for queue management recommendations. Ratio = `projectedDailyDue / reviewCapacity`.

| Constant | Value | Zone | Meaning |
|---|---|---|---|
| `QUEUE_GREEN_RATIO` | 0.6 | Green | Freely add new problems |
| `QUEUE_YELLOW_RATIO` | 0.85 | Yellow | Add carefully — 1–2 new/day max |
| `QUEUE_AMBER_RATIO` | 1.1 | Amber | Review first — new only if reviews done |
| `QUEUE_ORANGE_RATIO` | 1.5 | Orange | Queue heavy — stop new problems, focus on clearing |
| `QUEUE_RED_RATIO` | 2.0 | Red | Overloaded — defer or accept lapse |

**Five zones, not four.** The Orange zone (1.1–1.5) captures the critical "queue is heavy but not yet hopeless" state where the user should stop adding new problems entirely and focus on clearing. Red (> 1.5) means the queue has grown beyond what the user can clear at their current pace without deferring items.

`projectedDailyDue` is the **back-half average** from the 60-day forecast — i.e., the average daily due count in days 31–60 of the simulation. This represents where the queue is *heading*, not where it is today.

---

## Absolute Guardrails

Even with high declared capacity, these caps prevent unrealistic queue growth. The numbers reflect session time (with breaks), not pure problem time.

| Constant | Value | Purpose |
|---|---|---|
| `MAX_SUSTAINABLE_DUE_DEFAULT` | 8 | Absolute daily due ceiling for a typical user (60 min budget) |
| `MAX_SUSTAINABLE_DUE` | `min(10, reviewCapacity × 1.2)` | Per-user cap, slightly above their declared capacity |
| `MAX_FORECAST_REVIEWS` | 8 | UI slider maximum for Goals-mode Rev/d |
| `MAX_FORECAST_NEW` | 4 | UI slider maximum for Goals-mode New/d |
| `MAX_FORECAST_TOTAL` | 10 | Soft cap: warn if Rev/d + New/d exceeds this |
| `TOTAL_TIME_WARNING_HOURS` | 3 | If Rev/d + New/d implies > 3 hrs/day, show "this pace requires X hrs/day" |

**Why the ceiling is 8–10, not 12–15:**

At 25 min/review session, 8 reviews = 3.3 hours. 10 reviews = 4.2 hours. That's a full workday of LeetCode with zero new problems. Nobody sustains 12+ reviews/day for more than a day or two — and if they do, those are 5-minute "glance and confirm" reviews, not real problem-solving sessions. The system should model what users actually do, not what they aspire to on their most motivated Saturday.

For users who genuinely attempt 10+ problems in a day (rare, binge pattern), the system should treat it as a spike, not a baseline.

---

## Overshoot Tolerance

Defines when transient queue growth becomes a sustained problem worth warning about.

| Constant | Value | Purpose |
|---|---|---|
| `OVERSHOOT_TOLERANCE_DAYS` | 3 | Consecutive days over threshold before soft warning |
| `OVERSHOOT_FIRM_DAYS` | 5 | Consecutive days over threshold before firm warning |
| `TREND_THRESHOLD` | 0.10 | Back-half avg must exceed front-half avg by >10% to flag "growing" |

---

## Budget Mismatch Detection

Detects when a user's observed behavior consistently diverges from their declared time budget, enabling a suggestion to adjust.

| Constant | Value | Purpose |
|---|---|---|
| `BUDGET_MISMATCH_WINDOW_DAYS` | 5 | Minimum consecutive days of divergence before suggesting adjustment |
| `BUDGET_OVERSHOOT_FACTOR` | 1.3 | Observed pace > declared × 1.3 → suggest increasing budget |
| `BUDGET_UNDERSHOOT_FACTOR` | 0.5 | Observed pace < declared × 0.5 → suggest decreasing budget |

**Derivation:** If a user declares 60 min (Moderate, ~2–3 problems/day) but averages 4+ problems/day for 5 days, they're operating at a Focused pace and should be told so — both so the recommendations calibrate correctly and so the forecast reflects their actual capacity.

The undershoot threshold is more lenient (0.5× vs 1.3×) because falling short of a goal is normal; the system should only suggest lowering the bar when the shortfall is dramatic and sustained.

---

## SRS Engine Constants (existing — for reference)

These are already defined in `src/lib/srs.ts`. Listed here for cross-reference.

| Constant | Value | Location | Purpose |
|---|---|---|---|
| `MIN_STABILITY` | 0.5 days | `srs.ts` | Floor for stability clamping |
| `MAX_STABILITY` | 365 days | `srs.ts` | Ceiling for stability clamping |
| `INITIAL_STABILITY_BASE` | 2.0 days | `srs.ts` | Base stability for first attempt |
| `MASTERY_THRESHOLD` | 45 days | `srs.ts` | Stability at which a problem is "mastered" |
| `RETRIEVABILITY_FLOOR` | 0.3 | `srs.ts` | R never decays below this from time alone |

---

## Review Load Constants

Used in the coverage projection and queue forecast simulations.

| Constant | Value | Location | Purpose |
|---|---|---|---|
| `AVG_REVIEW_MULTIPLIER` | 2.2 | `dashboard-client.tsx` | Expected stability growth per successful review (coverage projection) |
| `AVG_MULTIPLIER` (forecast) | 2.0 | `dashboard-client.tsx` | Stability multiplier used in queue forecast simulation |
| `INITIAL_STABILITY` (forecast) | 2 | `dashboard-client.tsx` | Stability assigned to new problems injected in Goals-mode forecast |

---

## Recommendation Tone Constants

| Constant | Value | Purpose |
|---|---|---|
| `MIN_ATTEMPTS_FOR_RECOMMENDATION` | 5 | Below this, show "Getting started" instead of data-driven guidance |
| `BREAK_DETECTION_DAYS` | 7 | Days since last attempt to trigger "Welcome back" messaging |
| `WARMUP_TARGET_REVIEWS` | `min(reviewQueue.length, 10)` | Suggested review count for first session after a break |

---

## Pace Tracking Windows

| Constant | Value | Purpose |
|---|---|---|
| `PACE_WINDOW_DAYS` | 7 | Rolling window for avgPerDay, avgNewPerDay, avgReviewPerDay |
| `CONSISTENCY_WINDOW_DAYS` | 14 | Window for the consistency readiness component |
| `GOAL_DIVERGENCE_DAYS` | 7 | Days of divergence before suggesting goal adjustment |
| `FORECAST_HORIZON_DAYS` | 60 | How far the queue forecast simulates |

**Why 60 days, not 30:**

A 30-day forecast hides the stabilization that happens in weeks 5–8 when early problems start graduating to mastery (stability ≥ 45 days). Users see a growing queue for 30 days and panic — but if the forecast extended to day 45–60, they'd see the queue plateau and start declining as mastery frees capacity. The 60-day horizon shows the full learning cycle: ramp-up → peak load → mastery relief. This is especially important for users in the "Focused" and "Intensive" presets who will hit peak queue load around week 4–5.

**Implementation note:** The current codebase (`dashboard-client.tsx`) still uses `MAX_DAYS = 30`. Extending to 60 is tracked as Phase 2 in the implementation plan. Until then, the 30-day forecast may show an alarming upward trend that the 60-day view would contextualize as temporary.

---

## Onboarding & Calibration Tracking

| Constant | Value | Purpose |
|---|---|---|
| `TIME_TO_FIRST_WARNING_TRACK` | yes | Log the number of practice days before each user first hits a Yellow+ recommendation |

**Why track this:** If most new users hit "Review first" within 5 days, the zone thresholds may be too tight for the onboarding experience (the system nags before users have built enough context to understand why). If nobody hits it for 3+ weeks, the thresholds are too loose to provide useful guidance. This is a leading indicator of zone boundary calibration and is cheap to log as a one-time event per user.

---

## Ranges for Testing and Evaluation

When testing the forecast and recommendation system, use these ranges as the realistic input space. All values account for session time (including breaks and overhead).

### Reviews/Day

| Range | Label | Notes |
|---|---|---|
| 0 | None | New user, or all caught up |
| 1 | Minimal | Light user, one quick review |
| 2–3 | Light | Casual daily practice (~60–75 min) |
| 3–4 | Moderate | Regular habit (~90 min) |
| 4–6 | Active | Dedicated prep (~2 hrs) |
| 6–8 | Heavy | Pre-interview push (~2.5–3 hrs of reviews alone) |
| 8+ | Binge / unrealistic sustained | May happen for 1 day; not sustainable across a week |

### New/Day

| Range | Label | Notes |
|---|---|---|
| 0 | Review-only | Clearing backlog, no new coverage |
| 0.5–1 | Conservative | 1 new every 1–2 days; sustainable long-term |
| 1–2 | Standard | Daily practice with 1 new problem most days |
| 2–3 | Aggressive | Only if reviews are light; generates significant future load |
| 3+ | Sprint / unrealistic sustained | 3 new = ~2.25 hrs of new alone; nearly impossible alongside reviews |

### Total/Day (Reviews + New combined)

| Range | Label | Session Time | Notes |
|---|---|---|---|
| 1 | Minimal | ~25–45 min | Light user |
| 2–3 | Light | ~50–90 min | Regular practice |
| 3–4 | Moderate | ~90–120 min | Dedicated daily habit |
| 4–6 | Focused | ~2–3 hrs | Serious prep; sustainable for weeks |
| 6–8 | Heavy | ~3–4 hrs | Pre-interview sprint; sustainable for 1–2 weeks max |
| 8–10 | Maximum | ~4–5 hrs | Full-day dedication; maybe 1–2 times ever |
| 10+ | Unrealistic | ~5+ hrs | Not a real sustained pace for anyone |

### What These Ranges Mean for the System

- The **forecast slider maximums** should match these ranges: Rev/d capped at 8, New/d at 4
- **Test scenarios** should span Light through Heavy; anything above Heavy is edge-case testing only
- **Recommendations** should never assume throughput above the Focused range (4–6/day) as a sustainable baseline
- If a user's observed pace exceeds Heavy for 3+ consecutive days, the system should suggest they set a higher time budget (or accept that their observed pace is aspirational)

---

## How to Use This Document

1. **Before changing any threshold**: check here first. If the constant exists, update it here and propagate.
2. **When adding a new constant**: add it to the appropriate section with value, purpose, and derivation.
3. **When testing**: use the "Ranges for Testing" section to define test matrix boundaries.
4. **When calibrating**: compare observed user data against these ranges. If real usage patterns diverge significantly, update the ranges and note the evidence.
