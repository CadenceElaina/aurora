# Design Decisions — April 2, 2026

> Undo submissions, coverage projections, stats UX, duplicate prevention

---

## 1. Undo Submissions (Attempt Deletion)

### Problem

Users occasionally log an attempt with wrong data — wrong outcome, wrong problem, accidental double-submit. There was no way to correct mistakes without direct database access.

### Options Considered

| Option                                                  | Pros                                               | Cons                                                                                       |
| ------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **A. Soft delete** (mark as deleted, ignore in queries) | Simple, reversible, audit trail                    | Every query needs `WHERE deleted = false`. Ghost data accumulates. Schema change required. |
| **B. Hard delete + SRS replay**                         | Clean data. No schema change. Queries stay simple. | Must recompute SRS state from remaining attempts. More complex delete logic.               |
| **C. Edit-in-place**                                    | No deletion needed                                 | Doesn't handle "I logged the wrong problem." SRS state still needs recalculation.          |

### Decision: **B — Hard delete with SRS replay**

When an attempt is deleted, the server replays all remaining attempts for that problem in chronological order to rebuild the `userProblemState` (stability, best quality, next review date). If no attempts remain, the state row is deleted entirely.

**Why this over soft delete:**

- This is a personal tracking tool, not a financial system — we don't need audit trails for self-reported practice data
- Soft deletes add a `deleted` flag that every single query must remember to filter on. That's a bug surface that grows with every new feature
- Hard delete + replay gives correct SRS state _by construction_ — it's impossible for the state to drift from the actual attempt history

**Tradeoff accepted:** Replay is O(n) in the number of remaining attempts for that problem. For a practice tracker where n is typically 3–15 attempts per problem, this is negligible.

### Implementation

- `DELETE /api/attempts?id=` — authenticates user, deletes the attempt, replays remaining attempts to recompute stability/quality/nextReview
- Two UI surfaces: an "Undo" button on the post-submission banner (immediate correction), and a delete button (✕ → Confirm/Cancel) on each attempt in the problem detail page (historical correction)
- The attempt ID is passed through URL params on redirect so the dashboard banner can reference it for undo

---

## 2. Coverage Projection: Naive Linear vs. Capacity-Adjusted Simulation

### Problem

The dashboard shows a projection of how many unique problems the user will cover by their target interview date. The initial implementation used naive linear extrapolation: `current_count + (avg_new_per_day × days_remaining)`.

This consistently overestimates because it ignores a fundamental dynamic: **as you learn more problems, review load grows and eats into the time available for new problems.**

### Options Considered

| Option                                                     | Pros                                                                                                        | Cons                                                                                                              |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **A. Naive linear** (`new/day × days`)                     | Simple, instant to compute                                                                                  | Wildly optimistic. Ignores review load growth. A user doing 2/day now won't sustain 2 new/day as reviews pile up. |
| **B. Logarithmic decay curve** (diminishing returns model) | Better than linear. Still simple.                                                                           | Arbitrary shape — no connection to actual SRS mechanics. Hard to calibrate the decay constant.                    |
| **C. Day-by-day simulation** with review load modeling     | Accurate. Models the real dynamic. Accounts for stability growth, mastery graduation, capacity constraints. | More code. Harder to explain in one sentence.                                                                     |

### Decision: **C — Day-by-day simulation**

The projection runs a forward simulation from today to the target date:

```
For each simulated day:
  1. dailyReviewLoad = learning_problems / avg_stability + mastered_problems / 30
  2. availableForNew = max(0, capacity - dailyReviewLoad)
  3. newProblemsToday = floor(availableForNew)
  4. Add new problems to learning pool (increases future review load)
  5. Stability grows ~15%/day across the pool (reviews strengthen retention)
  6. Problems graduate to "mastered" when stability ≥ 30 days (reduces review load)
```

**Why this over the simpler options:**

- The whole point of this app is that spaced repetition has real scheduling dynamics. A projection that ignores those dynamics is misleading — it's like a finance app projecting savings growth without accounting for expenses
- The simulation captures the key feedback loop: more learning → more reviews → less capacity for new → plateau → mastery frees capacity → growth resumes. This is exactly what users experience in practice
- The result is uncapped (can exceed target) so users see their real trajectory, not a clamped optimistic number

**Tradeoff accepted:** The simulation is ~50 lines of code and runs on every dashboard render. For typical inputs (≤365 days, ≤150 problems) it's sub-millisecond.

---

## 3. Stats Strip UX: Iterative Simplification

### Problem

The dashboard stats strip needed to show pace information — but early iterations were confusing. Users couldn't tell what "1.9/day" meant (reviews? new problems? total?).

### Design Iterations

1. **v1:** `1.9/day  ·  48 projected` — No labels distinguishing review vs. new. "Projected" out of context.

2. **v2:** `need 0.8 new/day (1.9 total/day capacity)` — Jargon. The parenthetical reads like a footnote, not data.

3. **v3 (shipped):** Three explicit rate cards:
   - **reviews/day** — how much of your capacity goes to maintaining existing knowledge
   - **new/day** — how many new problems you're actually adding per day
   - **total/day** — your overall throughput

   Plus a flippable right column: front shows projected count, back shows a comprehensive "All Stats" detail view (pace, progress, retention, time, consistency, readiness breakdown).

### Decision: **Explicit labels > compact layouts**

Each number gets its own label that can be understood without context. The flip interaction keeps the dashboard clean while giving data-hungry users access to everything without navigating to a separate page.

**Lesson:** If a stat needs an explanation to understand, it's not a stat — it's a footnote. Every number on the dashboard should be self-explanatory at a glance.

---

## 4. Duplicate Submission Prevention

### Problem

Users could accidentally submit the same problem twice on the same day — via the manual form (Submit → back → Submit again), via the NeetCode import (importing the same activity twice), or across both (import a problem then manually log it).

### Options Considered

| Option                                                                                     | Pros                                                                                                | Cons                                                                                                                                                           |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Client-side only** (disable button after submit, dedup in import)                     | Simple. No API changes.                                                                             | Fragile. Doesn't prevent cross-session or cross-input-method duplicates. Different clients can't coordinate.                                                   |
| **B. Server-side unique constraint** (DB-level, compound unique on user+problem+day)       | Bulletproof. Database enforces it.                                                                  | Too rigid — there are legitimate cases for multiple attempts on the same problem in one day (re-solve after studying, different approach). Migration required. |
| **C. Server-side check with bypass flag** (API returns 409, client can send `force: true`) | Single enforcement point covers all input methods. Allows intentional re-logging. No schema change. | Slightly more complex client handling (must handle 409 distinctly from 500).                                                                                   |

### Decision: **C — Server-side 409 with force bypass**

The `POST /api/attempts` endpoint checks for an existing attempt with the same `(userId, problemId, calendar_day)`. If found, it returns `409 Conflict` with the message "Already logged {problem title} today." Clients can send `force: true` to bypass the check for intentional re-submissions.

**Why server-side over client-side:**

- All input paths (manual form, NeetCode import, future API integrations) go through the same endpoint. One check protects everything
- Client-side dedup is inherently incomplete — a user can open two tabs, or import then manually log. Only the server sees the full picture
- The `force` flag preserves user agency. Spaced repetition sometimes calls for re-solving a problem the same day (e.g., "I just studied the solution, let me try again from scratch")

**Why not a DB constraint:**

- A unique constraint would require a migration and would reject the insert at the database level with a generic constraint violation error — harder to return a user-friendly message
- The `force` bypass wouldn't be possible without a more complex approach (delete-then-reinsert, or a separate dedup column)
- The check-then-insert pattern is sufficient here — race conditions between concurrent inserts by the same user on the same problem on the same day are not a realistic concern for a personal tracking tool

### Client-Side Handling

| Input Method        | On 409                                                              | User Action                                                                                   |
| ------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **Manual form**     | Shows yellow warning: "You already logged this problem today."      | "Log Again Anyway" (sends `force: true`) or "Cancel"                                          |
| **NeetCode import** | Marks the attempt as "skipped" with ⊘ icon and muted yellow styling | No action needed — skipped items count toward completion so the import flow finishes normally |

**Design note on import behavior:** In the import flow, duplicates are treated as _expected_ rather than erroneous. If a user re-pastes their NeetCode activity, the previously-imported problems should be skipped silently — not flagged as errors that block the workflow. The "skipped" status (distinct from "error") communicates "we saw this, it's already logged, no action needed."

---

## Summary of Principles

These decisions share a few recurring themes:

1. **Server as single source of truth.** Validation, dedup checks, and SRS computation happen server-side. Clients are presentation layers that handle responses — they don't enforce business rules.

2. **Correct by construction over correct by convention.** SRS replay rebuilds state from actual data rather than relying on incremental updates that could drift. Server-side dedup checks prevent invalid states rather than hoping clients remember to check.

3. **Simple where possible, complex where necessary.** Hard delete over soft delete (simpler queries). Day-by-day simulation over naive extrapolation (necessary accuracy). Explicit labels over compact jargon (necessary clarity).

4. **User agency preserved.** Force-bypass for duplicates. Undo for mistakes. The system warns but doesn't block legitimate use cases.
