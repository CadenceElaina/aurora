# SRS Update Formulations

> Reference document for the EMA update mechanism used to adapt per-user scheduling (personal difficulty factor / PDF).
> Covers the problem, three candidate formulations, the chosen implementation, and the research study design.

**Status:** Option A implemented (production). Option C is the experimental arm for the 2214 pilot study.
**Last updated:** 2026-05-14
**See also:** `ADAPTIVE_SRS.md` for the full adaptive SRS design; `src/lib/srs.ts → computePDFUpdate`.

---

## The Problem

Aurora's adaptive SRS (Phase 3 of `ADAPTIVE_SRS.md`) maintains a **personal difficulty factor** (PDF) per user that scales the base multiplier table. After each review the system observes a binary-ish outcome (`YES` / `PARTIAL` / `NO`) against a predicted retrievability `R ∈ [0, 1]` and updates the PDF via an exponential moving average (EMA).

The original design used a **multiplicative ratio** as the EMA signal:

```
signal = actual / predicted          // e.g., 1.0 / 0.32 = 3.125
PDF_new = PDF_old × (1 − α) + signal × α
```

This is numerically unstable. When a user succeeds at a problem near the retrievability floor (predicted R ≈ 0.32), the ratio explodes to ≈3.1, and even at α = 0.1 the PDF shifts by ≈ 0.2 in a single step — nearly 20% of the clamped adjustment range from one data point. The original FSRS optimizer avoids this by using an **additive** loss rather than a ratio. That instability is why we evaluated alternatives.

---

## Option A — Additive Residual (Current Implementation)

### Formula

```
actual   = 1.0 (YES) | 0.5 (PARTIAL) | 0.0 (NO)
residual = actual − predicted_R          // ∈ (−1, 1)
PDF_new  = PDF_old + α × residual
```

`PDF_new` is then clamped to [0.5, 2.0] and α = 0.1.

### Worked example

| predicted R | outcome | residual | Δ (α = 0.1) |
|-------------|---------|----------|-------------|
| 0.32        | YES     | +0.68    | +0.068      |
| 0.32        | NO      | −0.32    | −0.032      |
| 0.90        | YES     | +0.10    | +0.010      |
| 0.90        | NO      | −0.90    | −0.090      |

**The update is bounded to [−α, +α] regardless of where R sits.** The ratio formulation could produce a Δ of ≈ 0.31 in the first row; Option A produces 0.068. Maximum single-step movement is 0.1.

### Semantics

The PDF drifts upward (toward 2.0) when the user consistently outperforms predictions — problems they were expected to forget but didn't. It drifts downward (toward 0.5) when they underperform. Starting at 1.0 (neutral), the PDF becomes the scaling factor applied to every base multiplier:

```
effectiveMultiplier = baseMultiplier × userPDF
```

### Why this is the right production choice

- Proven: this is essentially the update FSRS's optimizer runs (loss = actual − predicted, apply gradient).
- Stable: max update per review = α = 0.1, no matter how surprised the model is.
- Interpretable: a residual of +0.68 means "the user performed 68% better than expected on this review."
- Simple to test: the unit tests in `srs.test.ts` cover the pure function directly.

### Known limitation

Option A treats success at R = 0.32 and success at R = 0.90 as qualitatively different magnitudes of surprise (residuals of 0.68 vs 0.10), which is correct, but treats them as **linearly** different. Whether the true surprise is linear in R or non-linear (as log-odds would argue) is an open question that real Aurora data can answer once Phase 1 data collection is in place.

---

## Option B — Log-Odds (Logit Space)

### Motivation

Probabilities live on [0, 1], a bounded interval. Equal-size additive steps near 0.5 represent different amounts of belief change than the same steps near 0.01 or 0.99. The **logit transform** maps probabilities to an unbounded scale where equal steps have equal semantic weight:

```
logit(p) = ln(p / (1 − p))    // maps (0, 1) → (−∞, +∞)
sigmoid(x) = 1 / (1 + e^−x)  // inverse: maps (−∞, +∞) → (0, 1)
```

| p    | logit(p) |
|------|----------|
| 0.10 | −2.20    |
| 0.25 | −1.10    |
| 0.50 |  0.00    |
| 0.75 | +1.10    |
| 0.90 | +2.20    |

Note the symmetry: 0.10 and 0.90 are equidistant from center (±2.20). The logit scale compresses extremes — going from 0.90 to 0.99 in probability is only a +2.2 step in logit space, not the tiny Δ = 0.09 it looks like in probability space.

### Formula

```
L_old    = logit(PDF_old)   // or logit(predicted_R), depending on what you track
signal   = logit(actual)    // transform the observed outcome into logit space
L_new    = (1 − α) × L_old + α × signal
PDF_new  = sigmoid(L_new)   // convert back to [0, 1]
```

The update happens on an unbounded real line. The sigmoid at the end ensures the result is always a valid probability — no clamping needed.

### Why it helps vs Option A

The logit of a ratio `actual / predicted` compresses that 3.1 ratio to `ln(3.1) ≈ 1.13`, much smaller than the raw ratio. Updates near the floor are naturally damped, and updates near the ceiling are naturally expanded — matching the information-theoretic reality that surprising predictions are worth more signal.

### Why it's not the current choice

The semantics change: the EMA now runs in log-odds space, and the result (after sigmoid) no longer directly represents "how much to scale the base multiplier." It requires more bookkeeping and is harder to reason about during debugging. For the production tool the simplicity of Option A wins. Option B becomes more interesting if Aurora eventually moves to continuous outcomes (scored 0–1 rather than YES/PARTIAL/NO).

---

## Option C — Beta-Binomial (Bayesian Updating)

> This is the experimental arm for the 2214 pilot study. See the research design section below.

### Conceptual shift

Options A and B maintain a **point estimate** of the PDF (a single number). Option C replaces that with a **distribution** — a shape representing every plausible value of the user's difficulty factor and how likely each is. Knowing not just "the model thinks this user retains at rate 0.75" but "the model is quite confident about that" vs "the model has only seen 2 reviews, so that estimate is very uncertain" unlocks uncertainty-aware scheduling.

### The Beta distribution

The Beta distribution `Beta(a, b)` lives on [0, 1] and is parameterized by two positive numbers:

- `a` = pseudo-successes (evidence the user retains well)
- `b` = pseudo-failures (evidence the user forgets faster than predicted)
- **mean** = `a / (a + b)`
- **effective sample size** = `a + b` (higher = narrower distribution = more confidence)

Its probability density function is proportional to `x^(a−1) × (1−x)^(b−1)`. Plugging in a = b = 1 gives `f(x) ∝ 1` — a flat line, representing complete ignorance. Increasing both a and b while keeping their ratio the same keeps the mean fixed but narrows the peak.

```
Beta(1, 1)   → flat (uniform prior — complete ignorance)
Beta(2, 2)   → gentle hill at 0.5
Beta(10, 10) → narrow bell at 0.5 (same mean, much more confident)
Beta(3, 7)   → peak near 0.3 (more pseudo-failures than successes)
Beta(20, 5)  → narrow peak near 0.8
```

### Update rule

The Beta distribution is the **conjugate prior** for Bernoulli (binary) outcomes — after observing an outcome, the posterior is still a Beta distribution, just with updated parameters:

```
Prior:           Beta(a, b)
After YES:       Beta(a + 1, b)
After NO:        Beta(a, b + 1)
After PARTIAL:   Beta(a + 0.5, b + 0.5)   // fractional credit

mean after update = a_new / (a_new + b_new)
```

A single observation can only move the mean by `1 / (a + b + 1)` — so after 20 reviews the effective shift per review is ≈ 1/21, not a fixed α. The model self-regulates its own learning rate: uncertain early, stable late.

### Decay (recency-weighting)

After enough reviews, the effective sample size (a + b) becomes so large that new observations barely move the mean. If the user's ability changes (long break, sudden breakthrough), the model won't adapt. The fix is a decay factor γ applied before each update:

```
Before update:   a' = γ × a,   b' = γ × b       (γ ≈ 0.95–0.99)
Then update:     a' + 1  or  b' + 1
```

Decay shrinks the effective sample size each step, keeping the model responsive to recent data without abandoning history entirely. γ is the primary hyperparameter to tune in the research study.

### Uncertainty-aware scheduling

The key research claim: a distribution enables better scheduling decisions than a point estimate.

Instead of scheduling when `mean(PDF)` drops below a threshold, schedule when the **lower credible bound** drops below the threshold:

```
// Point-estimate scheduling (Options A and B):
if (meanPDF < threshold) schedule_review();

// Uncertainty-aware scheduling (Option C):
lower_bound = beta_quantile(a, b, p=0.10)   // 10th percentile
if (lower_bound < threshold) schedule_review();
```

For a well-studied problem (Beta(20, 5), narrow peak near 0.8), the 10th percentile is close to the mean — the model is confident, so behavior resembles a point estimate. For a rarely reviewed problem (Beta(2, 2), wide distribution), the 10th percentile is far below the mean — the model is uncertain, so it schedules the review earlier, trading a potentially unnecessary review for the safety of not losing retention.

This maps to an **exploration-exploitation tradeoff**: the system accepts a small cost (over-reviewing confident cards) to avoid the larger cost (forgetting uncertain ones).

### Storage

```typescript
// Instead of:   userPDF: number = 1.0
// Use:          userPDFAlpha: number, userPDFBeta: number  (initialized to 1.0, 1.0)
```

---

## Research Study Design — Option A vs Option C

The 2214 pilot study (ITSC 2214, UNC Charlotte) will test whether uncertainty-aware scheduling (Option C) produces better quiz and final exam performance than the FSRS-style additive baseline (Option A).

### Hypothesis

Students scheduled by Option C will score higher on quizzes and the cumulative final because uncertainty-aware scheduling allocates more review time to topics where the model is uncertain about mastery, not just topics where the point estimate is low. This matters most for early-semester topics (Arrays, Strings, Search) that must be retained through the cumulative final — they have the longest time for the distributions to diverge between arms.

### Study design

| | Control (Option A) | Experimental (Option C) |
|---|---|---|
| Update rule | Additive residual `PDF ← PDF + α × (actual − R)` | Beta-Binomial `Beta(a, b)` with decay γ |
| Scheduling signal | Mean PDF | Lower 10th-percentile credible bound |
| State per user | 1 scalar | 2 scalars (a, b) |
| Hyperparameters | α = 0.1 | γ = 0.95–0.99 (tuned per topic cluster) |

Both arms use the same base multiplier table, same problem set, same review queue priority logic. The only difference is the update and scheduling signal.

### Why this curriculum is ideal

The ITSC 2214 curriculum creates natural conditions for the study:
- 4 topic clusters with a **cumulative final** — early-semester retention matters
- Quiz review guides tell students exactly what to study — the scheduling directly competes with students' own judgment
- The handwritten crib sheet (1 page, both sides) incentivizes selective retention — students who trust the scheduler over their instincts are exposed to a real tradeoff

### Dependent variable

Quiz and final exam scores in CodeWorkout (raw score, since coding questions are auto-graded). Secondary: time-to-first-success per problem (efficiency).

### Key tuning question

What value of γ (decay rate) produces the best retention in a semester-long curriculum? Too low (γ = 0.90) and the model forgets history too fast, reverting toward the uniform prior. Too high (γ = 0.99) and the model barely adapts — nearly identical to a growing-sample-size Beta without decay. The optimal γ likely varies by topic cluster (DP may need faster adaptation than Arrays), making this a natural parameter to report as a research result.

---

## Decision Log

| Date | Decision |
|------|----------|
| 2026-05-14 | Adopted Option A (additive residual) as the production PDF update formula, replacing the multiplicative ratio (`actual / predicted`) documented in the original ADAPTIVE_SRS.md Phase 3 design. Rationale: bounded updates, proven in FSRS, no change to storage schema. |
| 2026-05-14 | Option B (log-odds) evaluated and set aside — suitable if Aurora moves to continuous outcome scoring but adds complexity for no gain over Option A given binary/ternary outcomes. |
| 2026-05-14 | Option C (Beta-Binomial) designated as experimental arm for 2214 pilot study. Storage schema (a, b per user/category) and decay factor γ to be finalized before study launch. |

---

## References

- FSRS optimizer loss function: [github.com/open-spaced-repetition/fsrs4anki/wiki](https://github.com/open-spaced-repetition/fsrs4anki/wiki)
- Beta distribution: [Wikipedia](https://en.wikipedia.org/wiki/Beta_distribution)
- Conjugate prior: [Wikipedia](https://en.wikipedia.org/wiki/Conjugate_prior)
- Logit / sigmoid: [Wikipedia](https://en.wikipedia.org/wiki/Logit)
- Exploration-exploitation tradeoff: [Wikipedia](https://en.wikipedia.org/wiki/Multi-armed_bandit)
- Current implementation: `src/lib/srs.ts → computePDFUpdate`
- Adaptive SRS design (phases): `docs/files/ADAPTIVE_SRS.md`
