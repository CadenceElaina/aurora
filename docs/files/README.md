# Design Documentation — Index

> Overview of Aurora's design documentation. Start here when working on pacing, queue management, recommendations, or SRS calibration.

**Last updated:** 2026-05-10

---

## Reading Order

For a new contributor or a returning session, read in this order:

1. **[PACING_SYSTEM.md](PACING_SYSTEM.md)** — the main design doc. Defines the time budget model, queue load ratio, threshold zones, recommendation decision tree, and implementation phases.

2. **[CONSTANTS.md](CONSTANTS.md)** — single source of truth for every numeric constant. Check here before changing any threshold, and update it when you do.

3. **[EDGE_CASES.md](EDGE_CASES.md)** — catalog of known failure modes, user behavior edge cases, and system limitations. Each entry has a priority and proposed resolution.

4. **[EVALUATION_PROTOCOL.md](EVALUATION_PROTOCOL.md)** — how to test changes. Includes simulation scenarios (with recovery sub-scenarios), success criteria, unit test plan, and data collection requirements.

5. **[ADAPTIVE_SRS.md](ADAPTIVE_SRS.md)** — future direction for per-user and per-category forgetting curve calibration. Not yet implemented; defines the research path.

6. **[VERIFICATION_AND_MONITORING.md](VERIFICATION_AND_MONITORING.md)** — how to verify each implementation phase is correct (unit tests, UI checklists, integration checks), and how to monitor the system over time in production and the classroom pilot.

---

## Decision Records

| Date | ADR | Status |
|---|---|---|
| 2026-05-10 | [Daily Time Budget Goal System](../decisions/2026-05-10-daily-time-budget.md) | Proposed |
| 2026-04-20 | [Initial Stability Calibration](../decisions/2026-04-20-initial-stability-calibration.md) | Implemented |
| 2026-04-20 | [Interleaving Mode](../decisions/2026-04-20-interleaving.md) | Rejected |
| 2026-04-02 | [GitHub Webhook Sync](../decisions/2026-04-02-github-webhook-sync.md) | Accepted |
| 2026-04-02 | [Submission Methods](../decisions/2026-04-02-submission-methods.md) | Accepted |
| 2026-04-02 | [Undo, Projections, Duplicates](../decisions/2026-04-02-undo-projections-duplicates.md) | Accepted |

---

## How These Docs Relate

```
PACING_SYSTEM.md               ← The "what" and "why"
  ├── CONSTANTS.md              ← The specific numbers
  ├── EDGE_CASES.md             ← What can go wrong
  ├── EVALUATION_PROTOCOL.md    ← Simulation scenarios + recovery verification
  ├── ADAPTIVE_SRS.md           ← Future: per-user tuning
  └── VERIFICATION_AND_MONITORING.md ← Implementation checks + production observability

decisions/
  └── 2026-05-10-daily-time-budget.md  ← The ADR for the first implementation step
```

---

## Cross-Reference: Key Additions in This Revision

These sections were added or significantly revised on 2026-05-10 based on a design review:

| Section | Document | What Changed |
|---|---|---|
| **5-zone system** | PACING_SYSTEM.md, CONSTANTS.md, EVALUATION_PROTOCOL.md | Added Orange zone (1.1–1.5) between Amber and Red; all three docs now consistent |
| **Session-time constants** | ADR (daily-time-budget.md) | Corrected from 15/30 (problem time) to 25/45 (session time) to match CONSTANTS.md |
| **Recovery sub-scenarios** | EVALUATION_PROTOCOL.md | S2-R and S3-R verify that following recommendations actually clears the queue in 7 days |
| **Budget mismatch detection** | CONSTANTS.md, PACING_SYSTEM.md, EDGE_CASES.md §4.4 | Constants for detecting when observed pace diverges from declared budget |
| **Per-difficulty session time** | CONSTANTS.md, EDGE_CASES.md §1.6 | Documented Easy/Medium/Hard session time estimates; flagged difficulty-skewed user edge case |
| **EMA volatility** | ADAPTIVE_SRS.md | Documented ratio instability near retrievability floor; added research question #5 |
| **Time-to-first-warning** | CONSTANTS.md, EVALUATION_PROTOCOL.md | Leading indicator for zone boundary calibration |
| **60-day forecast note** | CONSTANTS.md, PACING_SYSTEM.md | Clarified that the design specifies 60 days but the code still uses 30 (Phase 2 work) |
| **Verification & monitoring** | VERIFICATION_AND_MONITORING.md (new) | Implementation acceptance tests, production health metrics, classroom pilot monitoring, runbook |

---

## Implementation Status

| Component | Status | Phase | Notes |
|---|---|---|---|
| `dailyTimeBudgetMinutes` schema field | **Implemented** | Phase 1 | Added to `users` table; default 60 |
| Time budget selector (onboarding) | **Implemented** | Phase 1 | Step 3 of onboarding flow |
| Time budget in Settings panel | **Implemented** | Phase 1 | Gear icon on countdown widget |
| `computeCapacity()` function | **Implemented** | Phase 1 | `src/lib/capacity.ts`; `reviewCapacity` floors at 1 to prevent Phase 2 division-by-zero |
| Load ratio zones in recommendation engine | **Implemented** | Phase 2 | `computePracticeRecommendation` in `src/lib/capacity.ts`; `classifyLoadZone` in `src/lib/pacing.ts` |
| Overshoot tracking | Not started | Phase 2 | `OVERSHOOT_TOLERANCE_DAYS=3`, `OVERSHOOT_FIRM_DAYS=5` — requires per-day streak tracking not yet wired |
| Extended forecast horizon (30 → 60 days) | **Implemented** | Phase 2 | `MAX_DAYS = 60` in `dashboard-client.tsx`; dynamic `splitIdx`; `+{totalDays}d` label |
| Budget mismatch detection | **Implemented** | Phase 3 | Mismatch banner in `dashboard-client.tsx`; 14-day dismiss cooldown via localStorage |
| Goal adherence tracking | Not started | Phase 3 | Time-to-first-warning event logging not yet implemented |
| Forecast zone coloring | **Implemented** | Phase 4 | Zone-colored bars + capacity reference line in forecast chart |
| Post-mastery interleaving mode | Not started | Future | |
| Per-user PDF calibration | Research | Future | EMA volatility near R floor noted |
| Per-category calibration | Research | Future | |
| Per-difficulty session time in capacity | Not started | Future | Informational estimates documented |

---

## Existing Code Touchpoints

When implementing these designs, the primary files to modify:

| File | What Changes |
|---|---|
| `src/db/schema.ts` | Add `dailyTimeBudgetMinutes` to `users` |
| `src/components/onboarding.tsx` | Add time budget selector step |
| `src/app/dashboard/dashboard-client.tsx` | Wire load ratio into `computePracticeRecommendation`, update forecast MAX_DAYS 30→60, add 5-zone classification |
| `src/lib/srs.ts` | Future: accept `userPDF` parameter in stability functions |
| `src/lib/analytics.ts` | Wire `computeModelCalibration` into Insights; future: PDF computation |
| `src/app/insights/insights-client.tsx` | Display calibration health |
| `docs/ARCHITECTURE.md` | Update recommendation engine documentation |

---

## Principles

These principles guide all pacing and queue management decisions:

1. **Time is the binding constraint, not willingness.** Each problem takes 15–45 minutes of session time (including overhead). The system must respect this.

2. **Capacity-relative, not absolute.** A queue of 10 is fine for someone with 2 hours; it's a crisis for someone with 30 minutes. All thresholds are ratios, not fixed numbers.

3. **Trend over snapshot.** A growing queue is concerning; a large but declining queue is healthy. Recommendations track direction, not just magnitude.

4. **Tolerate variance, flag patterns.** One bad day isn't a problem. Three consecutive over-threshold days is a pattern worth mentioning.

5. **Nudge, don't nag.** Recommendations should feel like a knowledgeable friend's suggestion, not an alarm. Users who are on track should see minimal interference.

6. **Observable and reversible.** Every recommendation should explain *why* ("your queue averages {n}/day, which is above your {m}/day capacity"). Every setting should be changeable without consequences to existing data.

7. **Fixed parameters until data proves otherwise.** Per-user calibration is theoretically better but practically risky without sufficient data. Start with well-chosen fixed parameters and only personalize when the data supports it.

8. **Session time, not problem time.** All capacity calculations use session time (including breaks, context switching, solution review). See `CONSTANTS.md` §Time Cost Constants.
