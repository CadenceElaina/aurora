# Learning Variance & Adaptive SRS

> How Aurora should handle the reality that users retain at different rates, and the roadmap for moving from fixed parameters to personalized scheduling.

**Status:** Research direction — v1 uses fixed parameters; this doc defines the path to v2 (Phases 0–1 done: predictedR is logged; Phases 2–3 apply/display PDF — not started)
**Last updated:** 2026-05-28

---

## The Problem

Aurora's SRS uses identical multipliers for all users:

```
YES:OPTIMAL → 2.5×
YES:SUBOPTIMAL → 2.0×
PARTIAL → 1.1×
NO:NONE → 0.5×
```

In reality, users vary significantly in retention rate:

- A user with strong pattern recognition may retain a Two Pointers problem after 1 review. The 2.5× multiplier is too conservative — they'd be fine at 3.5×.
- A user new to algorithms may need 5 reviews of the same problem before it sticks. The 2.5× multiplier is too aggressive — they fail at the predicted review time and their stability yo-yos.
- The same user may retain Arrays problems easily but struggle with DP problems. Category-level variance exists alongside user-level variance.

### Why This Matters for Pacing

If the SRS overpredicts retention (multiplier too high), the queue underestimates future review load — the user adds new problems thinking they have capacity, then gets hit with failed reviews that halve stability and spike the queue.

If the SRS underpredicts retention (multiplier too low), the user reviews too often — wasting time on problems they already know, which delays coverage and frustrates engaged users.

The pacing system can only be as good as the underlying SRS predictions.

---

## Current State (v1): Fixed Parameters

### What We Have

- Fixed `INITIAL_STABILITY_BASE = 2.0`
- Fixed `BASE_MULTIPLIERS` table
- Fixed confidence modifiers (+0.3, +0.1, 0, -0.2, -0.4)
- `computeModelCalibration` in `analytics.ts` — can measure predicted-vs-actual accuracy but doesn't feed back into the algorithm

### Why This Is Acceptable for Now

1. **Small user base** — with < 50 active users, per-user calibration would be fitting noise
2. **FSRS research** — the original [FSRS](https://github.com/open-spaced-repetition/fsrs4anki/wiki) paper shows that fixed parameters produce "good enough" scheduling for ~80% of users when the parameters are well-chosen
3. **Confidence modifier acts as a manual correction** — users who consistently report low confidence get shorter intervals, partially compensating for faster forgetting
4. **The pacing system adds a second layer** — even if the SRS slightly mispredicts, the queue management thresholds catch the resulting queue growth before it becomes a crisis

### What's Missing

- No feedback loop from review outcomes to multiplier values
- No per-category adjustment (DP might need different multipliers than Arrays)
- No detection of systematically miscalibrated users

---

## Signals Available for Calibration

### Per-Review Calibration Data Point

Every time a user reviews a problem, we can observe:

```
predictedR = computeRetrievability(stability, daysSinceLastReview)
actualOutcome = YES | PARTIAL | NO
```

If `predictedR = 0.85` and the user fails (NO), the model overestimated retention for that problem. Over many reviews, the aggregate pattern reveals the user's actual [forgetting curve](https://en.wikipedia.org/wiki/Forgetting_curve).

This is exactly what `computeModelCalibration` computes — it buckets predicted R values and compares to actual success rates. The `isWellCalibrated` flag triggers when mean absolute error > 0.1.

### Per-User Calibration Signal

After 50+ reviews, we can compute a **personal difficulty factor** (PDF):

```
PDF = actual_success_rate / predicted_success_rate
```

If PDF < 0.9: user forgets faster than predicted → reduce multipliers
If PDF > 1.1: user retains better than predicted → increase multipliers
If 0.9 ≤ PDF ≤ 1.1: model is well-calibrated for this user

### Per-Category Calibration Signal

Same computation, but grouped by problem category:

```
PDF_category = actual_success_rate_in_category / predicted_success_rate_in_category
```

This reveals that a user might be well-calibrated overall (PDF ≈ 1.0) but underpredicted in DP (PDF = 0.7) and overpredicted in Arrays (PDF = 1.2).

---

## Adaptive SRS Design (v2)

### Prerequisite Data Volume

| Level | Minimum Reviews | Confidence |
|---|---|---|
| Per-user adjustment | 50 reviews | Low — directional only |
| Per-user adjustment | 100 reviews | Moderate — reliable PDF |
| Per-category adjustment | 20 reviews per category | Low — noisy |
| Per-category adjustment | 50 reviews per category | Moderate — actionable |

Most users reach 100 reviews in 4–6 weeks of regular practice. Per-category data accumulates slower — a user working through the curriculum in order may have 50 Arrays reviews but only 5 Graphs reviews.

### Proposed Adjustment Mechanism

Don't change the base multiplier table. Instead, apply a personal scaling factor:

```
effectiveMultiplier = baseMultiplier * userPDF
```

Where `userPDF` is updated after each review:

```
// Additive residual — bounded update matching FSRS optimizer semantics
const ALPHA = 0.1; // learning rate
const predicted = computeRetrievability(stability, daysSince);
const actual = outcome === "YES" ? 1.0 : outcome === "PARTIAL" ? 0.5 : 0.0;
userPDF = userPDF + ALPHA * (actual - predicted);
// then clamp to [0.5, 2.0]
```

This is Option A from the [SRS Update Formulations](SRS_UPDATE_FORMULATIONS.md) evaluation. The update is bounded to [−ALPHA, +ALPHA] per review regardless of where R sits, eliminating the volatility problem from the original multiplicative design.

The pure function is implemented as `computePDFUpdate` in `src/lib/srs.ts`.

### Per-Category Extension

```
categoryPDF[category] = categoryPDF[category] * (1 - ALPHA) + (actual / predicted) * ALPHA;
effectiveMultiplier = baseMultiplier * userPDF * categoryPDF[category];
```

### Guardrails

- `userPDF` clamped to [0.5, 2.0] — prevents runaway adjustment from a few bad reviews
- `categoryPDF` clamped to [0.6, 1.6] — narrower range, less data
- Adjustment only starts after `MIN_REVIEWS_FOR_CALIBRATION = 50` reviews
- Adjustment is gradual (ALPHA = 0.1) — takes ~30 reviews for a significant shift
- Per-step ratio capped at 2.0 to limit volatility from low-R reviews (see above)

### Storage

```sql
ALTER TABLE "user" ADD COLUMN "personal_difficulty_factor" REAL DEFAULT 1.0;
-- Or per-category in a separate table:
CREATE TABLE user_category_calibration (
  user_id UUID REFERENCES "user"(id),
  category VARCHAR(100),
  difficulty_factor REAL DEFAULT 1.0,
  review_count INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, category)
);
```

---

## What Users Would See

### In the Dashboard

No explicit "your learning rate is X" number. Instead, the system silently adjusts intervals. Users notice:

- Problems they find easy get spaced further apart automatically
- Problems they struggle with come back sooner
- Their queue stabilizes faster because the model is better calibrated

### In Insights

The Insights page could show:

- **Calibration health**: "Your SRS predictions match your actual retention within {n}%" — good calibration means the system is working well for you
- **Category-level signals**: "You retain Arrays problems longer than average but DP problems shorter — scheduling is adjusted accordingly"
- **Trend**: "Your retention rate has improved 12% over the last month" — encouraging signal that practice is working

### In Admin/Research

The admin dashboard would show:

- Aggregate PDF distribution across users (is the fixed 2.5× multiplier too high for most users?)
- Category-level calibration patterns (is DP systematically harder to retain than Arrays?)
- Data to inform adjustments to the base multiplier table

---

## Implementation Phases

### Phase 0: Observation — ✅ Done

- `computeModelCalibration` (`analytics.ts`) is surfaced on the Insights page (`src/app/insights/page.tsx`) as a read-only metric

### Phase 1: Track Predicted R at Review Time — ✅ Done

- `predictedR` is recorded alongside each attempt: column `predicted_r` on `attempts` (`schema.ts`), computed at insert time in `/api/attempts` from the pre-update SRS state
- No algorithmic changes — data collection only

### Phase 2: Compute and Display PDF — ⏳ Not started

- After 50+ reviews, compute `userPDF` and display in Insights
- Show per-category calibration if category has 20+ reviews
- Still no algorithmic changes — the user sees "the model is {well/poorly} calibrated for you"

### Phase 3: Apply PDF to Multipliers — ⏳ Not started

- Multiply base multipliers by `userPDF` in `computeNewStability` and `computeInitialStability`
- Store `userPDF` in the `users` table
- Recalculate on each review (exponential moving average)
- This is the behavioral change — intervals actually adjust

### Phase 4: Per-Category Calibration

- Separate `categoryPDF` stored in a calibration table
- Applied on top of `userPDF`
- Requires more data per category — may only activate for categories with 50+ reviews

---

## Risks

| Risk | Mitigation |
|---|---|
| **Overfitting to noise** | ALPHA = 0.1 averages over ~30 reviews; clamping prevents extremes; per-step ratio cap at 2.0 |
| **Cold start instability** | PDF only activates after 50 reviews; fixed multipliers used until then |
| **Volatility near R floor** | Cap per-step ratio; consider additive formulation; lower ALPHA for break-returning users |
| **Users game the system** | If a user intentionally fails to get easier intervals, their PDF drops but stability also drops — the system is self-correcting because low stability = more frequent reviews, which is what "gaming" would produce anyway |
| **Complexity** | The user never sees the PDF mechanism. Their experience is just "the app seems to know when I need to review." Complexity is internal only. |
| **Regression** | If PDF makes things worse, the system can be reverted to fixed multipliers by setting `userPDF = 1.0` for all users — no data loss |

---

## Open Research Questions

1. **What ALPHA value produces the best calibration?** Too high = volatile; too low = slow to adapt. FSRS uses 0.1; we should validate with Aurora-specific data.

2. **Should category PDF be independent or relative to user PDF?** If userPDF = 0.8 and categoryPDF = 1.2, the effective factor is 0.96 — the category-level adjustment partially cancels the user-level one. Is that correct, or should they be additive?

3. **How do confidence modifiers interact with PDF?** If a user's PDF compensates for their forgetting rate, do confidence modifiers still add value, or are they redundant? Preliminary answer: confidence captures *within-session* signal (how the user felt during this specific attempt) while PDF captures *across-session* signal (how the user retains generally). Both are useful.

4. **Does prior exposure (years of experience, CS degree) predict PDF?** If so, we could offer a "prior experience" question during onboarding that initializes PDF closer to the user's likely value, reducing the cold start period.

5. **EMA update formulation — resolved.** Option A (additive residual) is the production implementation as of 2026-05-14. Option C (Beta-Binomial with decay) is the experimental arm for the 2214 pilot study. Full analysis of all three options (additive, log-odds, Beta-Binomial) with mathematical derivations and research study design: [SRS_UPDATE_FORMULATIONS.md](SRS_UPDATE_FORMULATIONS.md).

---

## References

- FSRS parameter optimization: [github.com/open-spaced-repetition/fsrs4anki/wiki](https://github.com/open-spaced-repetition/fsrs4anki/wiki)
- Ebbinghaus forgetting curve: [Wikipedia](https://en.wikipedia.org/wiki/Forgetting_curve)
- Exponential moving average: [Wikipedia](https://en.wikipedia.org/wiki/Moving_average#Exponential_moving_average)
- Current calibration implementation: `src/lib/analytics.ts` → `computeModelCalibration`
- Current SRS implementation: `src/lib/srs.ts`
