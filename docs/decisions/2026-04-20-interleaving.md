# ADR: Interleaving Mode for Review Queue

**Date:** 2026-04-20
**Status:** Rejected

---

## Context

Interleaving — mixing problems from different categories within a single practice session rather than completing one category before moving to the next — is a well-documented retrieval-practice technique. Research (Rohrer & Taylor 2007, Bjork) shows that on *basic, independent skills* (e.g., math problem types, motor skills), interleaved practice improves long-term retention vs. blocked practice, even though it feels harder in the moment.

The question: should Aurora expose an interleaved review mode (e.g., "Mixed Set: forced category rotation"), and should it be the default ordering for the review queue?

## Decision

We will **not** add an interleaving mode at this time. The review queue remains urgency-sorted, and category ordering remains user-controlled via the sort/filter controls. The pattern-card feature (see future ADR) may reintroduce this question for a different card type.

## Reasoning

### 1. NeetCode 150 is explicitly sequenced

The curriculum Aurora is built on (NeetCode 150) is a dependency-ordered learning path, not a flat problem bank. Hashing precedes two-pointer, which precedes sliding window, which precedes graph traversal. Each category's patterns compose on top of earlier ones. Interleaving before foundational mastery breaks that scaffolding — users hit graph problems before they've internalized BFS, and the interleaved exposure hurts more than it helps.

Interleaving research assumes the skills being mixed are **independent or weakly-dependent**. Algorithm patterns are **strongly dependent**. The literature doesn't cleanly transfer.

### 2. Marginal value after mastery is low

Once a user has mastered NeetCode 150 (the realistic ceiling for this tool), the plausible benefit of interleaving is a modest solve-time reduction — e.g., 40 min → 10–15 min on mediums — via faster pattern recognition across contexts. This is real but:

- Most users will not reach this state before an interview.
- A "pass" on a known problem at any speed is already a pass for scheduling purposes.
- Users who *do* reach mastery can self-interleave by choosing "Mixed" filter on problem list — no dedicated mode required.

### 3. It conflicts with the current product model

The review queue is **urgency-sorted** — surfacing problems whose retrievability has decayed. Imposing category rotation on top of that either (a) delays urgent reviews (bad), or (b) becomes a secondary sort that rarely changes order (useless). The SRS engine is already doing the "which problem next" job based on memory decay, which is a stronger signal than category balance.

### 4. Implementation and UX cost

A meaningful interleaving mode requires: a separate queue builder, UI to toggle it, onboarding to explain the tradeoff, and dashboard indicators to show which mode the user is in. That's feature weight for a benefit most users won't see.

## Alternatives Considered

| Option                                      | Outcome  | Reason                                                                                                       |
| ------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------ |
| **A. Interleaving as default queue order**  | Rejected | Overrides urgency, the stronger signal. Confuses users mid-curriculum.                                       |
| **B. Optional "Mixed Set" toggle**          | Rejected | Low expected usage; would hide a feature behind a toggle most users ignore.                                  |
| **C. Interleaving within pattern cards**    | Deferred | Pattern cards (flashcards over ~20 patterns) are independent skills and are a better fit for interleaving. Revisit when pattern cards ship. |
| **D. Do nothing**                           | Accepted | Urgency-sorted queue + user-driven category filters already cover the realistic use cases.                   |

## Consequences

- The review queue continues to prioritize retention decay over category rotation.
- If/when pattern cards are built (see `feature/drills` branch for prior attempt and lessons learned), interleaving will be reconsidered *for that card type only* — patterns are flat and weakly-dependent, which is where interleaving research actually applies.
- If user feedback later indicates post-mastery users want a mixed-review mode, the cheapest path is a category-rotation filter on the existing review queue, not a dedicated mode.

## References

- Rohrer, D., & Taylor, K. (2007). *The shuffling of mathematics problems improves learning.*
- Bjork, R. A. *Desirable difficulties in the learning process.*
- NeetCode 150 sequencing — see `src/lib/demo-data.ts` and `problems.json` for the category order actually shipped.
