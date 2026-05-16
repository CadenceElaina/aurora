# Edge Cases, Limitations & Failure Modes

> Catalog of known edge cases, system limitations, and failure modes for the pacing and queue management system. Each entry describes the scenario, current behavior, desired behavior, and priority.

**Status:** Living document — update as new cases are discovered
**Last updated:** 2026-05-10

---

## 1. User Behavior Edge Cases

### 1.1 The Returning User (Practice Break)

**Scenario:** User practices daily for 3 weeks, then disappears for 2 weeks (finals, travel, burnout). Returns with a large overdue queue.

**Current behavior:** `computePracticeRecommendation` detects `daysSinceLastAttempt >= 7` and shows a "Welcome back" message. The 7-day pace window reads near-zero, making all forecasts pessimistic.

**Desired behavior:**
- Detect break length and acknowledge it explicitly: "You've been away {n} days"
- Suggest a warmup session: "Start with {min(queue, 10)} reviews today"
- Do NOT immediately push for new coverage — let the queue drain first
- Pace metrics should recover within 3–4 days of resumed practice, not 7

**Priority:** P2 — already partially addressed (D9 in ARCHITECTURE.md deferred list), but warmup target logic is missing.

**Edge within edge:** User returns, does 2 reviews, then disappears for another week. The system should not count those 2 reviews as "resumed practice" and start pushing coverage.

**Recovery verification:** See EVALUATION_PROTOCOL.md §S3-R — a compliant user should return to Yellow zone within 7 days.

---

### 1.2 The Binge Learner

**Scenario:** User does 15 new problems on a Saturday, then 0–2 per day during the week. Their weekly average looks fine (~3/day) but the queue spike from Saturday creates a review wall on Tuesday–Thursday.

**Current behavior:** The 7-day rolling average smooths this out, so recommendations don't flag it. But the daily due count spikes 3–4 days after the binge.

**Desired behavior:**
- The forecast should show the spike (it already does, since it simulates day-by-day)
- The recommendation engine should warn *before* the spike hits: "Your Saturday session added {n} problems — expect ~{m} reviews due by Wednesday"
- Consider a "new problems today" soft cap that warns above `newCapacity * 1.5` in a single day

**Priority:** P3 — uncommon, but produces the worst user experience when it happens.

---

### 1.3 The Perfectionist

**Scenario:** User only logs attempts when they solve optimally. Partial solves and failures go unrecorded. Their SRS state looks artificially strong.

**Current behavior:** No detection mechanism. The system trusts logged data.

**Desired behavior:**
- This is fundamentally a data quality problem — the system can't fix dishonest input
- Consider showing a "metacognition check" periodically: "You've logged 20 consecutive optimal solves. Does that match your experience?"
- The `computeMetacognitionGap` in analytics.ts can flag this if the user logs high confidence + optimal but then fails a review

**Priority:** P4 — addressed by social proof and education, not by code. The Info page already explains why honest logging matters.

---

### 1.4 The Speed Runner

**Scenario:** User is an experienced engineer re-learning problems they solved years ago. They can genuinely do 10+ reviews in an hour because they're pattern-matching, not problem-solving from scratch.

**Current behavior:** The system treats them like any other user. Their high throughput inflates pace metrics and makes recommendations too permissive for when they hit genuinely new material.

**Desired behavior:**
- The SRS handles this correctly — fast solve times + high confidence = higher stability growth, which is appropriate for re-learned material
- The pacing system should recognize that `avgReviewMinutes` for this user is lower than the default 25 min and adjust capacity accordingly
- Future: derive `avgReviewMinutes` from observed `solveTimeMinutes` per user

**Priority:** P4 — the SRS math handles it; only the capacity model is slightly miscalibrated.

---

### 1.5 The Multi-Day Inconsistency

**Scenario:** User practices MWF but not T/Th. Their 7-day average is 3/day but their actual pattern is 5 on practice days, 0 on off days. Reviews due on Tuesday go unreviewed until Wednesday.

**Current behavior:** The forecast uses a flat daily rate, so it models 3/day evenly. In reality, reviews pile up on off days and get batch-cleared on practice days.

**Desired behavior:**
- The forecast should still use the 7-day average (it's the best predictor of weekly throughput)
- The recommendation should not flag "queue growing" on off days — this is expected variance
- Consider: if the user has a consistent schedule pattern (detectable from attempt dates), show "you usually practice MWF — {n} reviews will be due when you return Wednesday"

**Priority:** P4 — low impact; the 7-day average naturally smooths this.

---

### 1.6 The Difficulty-Skewed User

**Scenario:** User is in the Hard-heavy phase of their prep — working through Advanced Graphs, 2-D DP, and Tries. All their current reviews are Hard problems. Their actual per-review session time is 35–40 min, not the system's assumed 25 min.

**Current behavior:** The system uses a flat `AVG_REVIEW_SESSION_MINUTES = 25` for all capacity calculations. A user with 4 Hard reviews due is told they have capacity for ~4 reviews in their 120-min budget, but those 4 Hard reviews actually take ~150 min.

**Desired behavior:**
- Near-term: the system slightly overpredicts capacity for Hard-skewed users. This is acceptable because the overshoot tolerance (3-day consecutive) catches the resulting queue growth before it becomes a crisis. The auto-defer-Hards setting also mitigates this for users who enable it.
- Future (Phase 3+): compute per-user or per-difficulty `avgReviewMinutes` from observed `solveTimeMinutes`. Weight capacity estimates by the difficulty distribution in the user's current queue.

**Priority:** P4 — the fixed 25-min median is reasonable across the NeetCode 150 mix (28 Easy, 101 Medium, 21 Hard). Only users who've completed all Easy/Medium and are exclusively reviewing Hards would be significantly affected, and they're likely high-capacity users anyway.

**Note for CONSTANTS.md:** Per-difficulty session time estimates (Easy ~15, Medium ~25, Hard ~40) are documented as informational; see §Per-Difficulty Session Time Estimates.

---

## 2. Algorithm Edge Cases

### 2.1 Queue Load Ratio with Zero Capacity

**Scenario:** User sets a 30-min daily budget. After building up 20 learning problems, their `reviewCapacity` is fully consumed by reviews, leaving `newCapacity = 0`. The load ratio is `dailyDue / reviewCapacity` which could be > 1 even with correct pacing.

**Current behavior:** N/A (load ratio not yet implemented).

**Desired behavior:**
- When `newCapacity <= 0`, the recommendation should say "Your review load is using your full daily budget — add new problems only when reviews are fully caught up"
- The load ratio should never produce a division-by-zero — floor `reviewCapacity` at 1

**Priority:** P1 — must be handled in the implementation.

---

### 2.2 Stability Collapse After a Break

**Scenario:** User takes a 30-day break. When they return, many problems have retrievability near the 0.3 floor. If they attempt these and fail (likely after 30 days), stability halves (NO:NONE = 0.5×). Multiple failed reviews can cascade stability down to MIN_STABILITY (0.5 days), creating an extreme review load.

**Current behavior:** SRS math works as designed — failure reduces stability, which is correct. But the resulting queue explosion (50+ problems all due tomorrow) is not something the recommendation engine handles gracefully.

**Desired behavior:**
- After a long break, the system should suggest reviewing easiest/highest-stability problems first (they're most likely to succeed)
- If many problems fail on return, the recommendation should suggest: "Focus on the {n} problems you're closest to re-learning. Defer the rest."
- Consider: auto-defer problems with R < 0.35 after a break of 14+ days, resurfacing them gradually

**Priority:** P2 — real scenario, especially for students between semesters.

---

### 2.3 Forecast Diverges from Reality

**Scenario:** The 60-day forecast predicts the queue will clear in 10 days, but the user only reviews 2/day instead of the assumed 5/day. The forecast is misleading.

**Current behavior:** The "Actual" mode forecast uses the 7-day observed pace, so it should track reality. The "Goals" mode uses user-set rates and is explicitly hypothetical.

**Desired behavior:**
- When Actual-mode forecast diverges significantly from what actually happened (retrospectively), surface a note: "Your forecast assumed {n} reviews/day but you averaged {m}"
- Periodically recalibrate: if the user's 7-day pace changes significantly, the forecast auto-updates (it already does, since it's computed each render)

**Priority:** P4 — the forecast is already reactive to pace changes. Retrospective comparison would be nice but not critical.

---

### 2.4 The "Everything Is Due" State

**Scenario:** User has 50+ problems all due on the same day (e.g., after a break, or from a batch import with similar dates).

**Current behavior:** All 50 appear in the review queue. The forecast shows a massive spike on day 1 that overwhelms the chart.

**Desired behavior:**
- The recommendation engine should recognize this as a transient spike, not a growth trend
- Suggest batching: "You have {n} reviews due. Aim for {capacity} today — the rest will roll over."
- The queue sort (urgency-based) already handles this — highest priority first, remainder deferred naturally

**Priority:** P3 — the existing sort handles the mechanics; only the messaging needs work.

---

### 2.5 New User Cold Start

**Scenario:** User signs up, has 0 problems attempted. All metrics are undefined.

**Current behavior:** Shows "Getting started" recommendation, defaults to New tab, Readiness shows D tier with "limited data" label.

**Desired behavior:**
- Time budget question during onboarding derives initial capacity
- First recommendation: "Start with 2–3 Easy problems from Arrays & Hashing"
- After 5 attempts, transition to data-driven recommendations
- Forecast modes: Goals is more useful than Actual for new users (no history to project from)

**Priority:** P2 — partially handled, but the time budget integration would improve it.

---

## 3. System Limitations

### 3.1 No Per-User Forgetting Curve Calibration

**Limitation:** All users share the same base multipliers and stability growth rates. A user who retains problems 2× better than average gets conservative intervals; one who forgets faster gets optimistic ones.

**Impact:** Suboptimal scheduling efficiency — some users review too often (wasted time), others too rarely (lower retention).

**Mitigation (current):** The confidence modifier partially compensates — users who consistently report high confidence get faster stability growth.

**Mitigation (future):** Per-user multiplier calibration after 50–100 reviews. Track predicted R at review time vs. actual outcome, compute calibration error, adjust multipliers. See `computeModelCalibration` in `analytics.ts`.

**When to address:** After a pilot deployment provides multi-user retention data. Not before.

---

### 3.2 Fixed Review Time Assumption

**Limitation:** The capacity model assumes all reviews take ~25 min (session time) and all new problems take ~45 min (session time). In reality, reviewing "Two Sum" takes 15 min and reviewing "Alien Dictionary" takes 40 min.

**Impact:** Capacity estimates are systematically wrong for users with skewed difficulty distributions (e.g., someone in the Hard-heavy phase has lower actual throughput than predicted). See also §1.6 (Difficulty-Skewed User).

**Mitigation (current):** The 25-min and 45-min session-time averages are reasonable medians across the NeetCode 150 difficulty mix. Per-difficulty estimates (Easy ~15, Medium ~25, Hard ~40 for reviews) are documented in `CONSTANTS.md` as informational.

**Mitigation (future):** Compute per-user `avgReviewMinutes` from observed `solveTimeMinutes`. Weight by difficulty to produce a personalized capacity estimate.

**When to address:** Phase 3 (goal adherence tracking) — requires enough solve-time data to compute a stable average.

---

### 3.3 No Cross-Session State in Queue Forecast

**Limitation:** The queue forecast is recomputed from scratch on every dashboard render. It doesn't remember what it predicted yesterday or compare predictions to outcomes.

**Impact:** No way to detect forecast accuracy degradation over time. Users can't see "the forecast said X would happen, and Y actually happened."

**Mitigation:** The forecast is deliberately simple (60-day simulation) so it's cheap to recompute and always reflects current state. Retrospective comparison is a nice-to-have.

**When to address:** Low priority. If implemented, store daily forecast snapshots in localStorage and compare after 7 days.

---

### 3.4 Recommendation Engine Is Client-Side Only

**Limitation:** `computePracticeRecommendation` runs entirely in the client, using data fetched at page load. It can't access historical trends longer than the `fullAttemptHistory` array.

**Impact:** Long-term trend detection (e.g., "your retention has been declining for 3 weeks") requires data that's not in the current payload.

**Mitigation (current):** The server computes readiness, retention, and pace metrics that capture most of what the recommendation needs.

**Mitigation (future):** Move recommendation logic to a server-side function that has access to the full attempt history. Return the recommendation as part of the dashboard data payload.

**When to address:** When recommendation complexity exceeds what client-side can reasonably compute.

---

### 3.5 localStorage Fragility

**Limitation:** Multiple pacing settings (`srs_target`, `srs_goal_type`, `aurora_planned_new_per_day`, `aurora_forecast_mode`, etc.) are stored in localStorage. If the user clears storage, switches browsers, or uses incognito, all settings reset.

**Impact:** User's time budget, goal type, and pace targets disappear. The system falls back to defaults.

**Mitigation (current):** `goalType` and `targetDate`/`targetCount` are in localStorage. `autoDeferHards` and `onboardingComplete` are in the DB.

**Mitigation (future):** Move all goal/pacing settings to the `users` table. localStorage becomes a cache, not the source of truth.

**When to address:** Phase 1 of the pacing system — when `dailyTimeBudgetMinutes` is added to the schema.

---

## 4. Interaction Edge Cases

### 4.1 Time Budget + Auto-Defer Hards

**Scenario:** User sets a 30-min budget (Light). Auto-defer Hards is on. They attempt 3 Easy problems, all with optimal results. Their queue is empty but they have 120+ unattempted problems.

**Issue:** The recommendation says "Add coverage" but their budget can only support ~1 new/day. With auto-defer Hards, they're working through Easy/Medium only, which is correct — but the recommendation doesn't explain this.

**Desired behavior:** "Your Light budget supports ~1 new problem and ~2 reviews per day. At this pace, you'll cover the Easy/Medium set in ~{n} weeks. Hard problems are deferred until you're ready."

---

### 4.2 Import Creates Instant Queue Overload

**Scenario:** User imports 20 problems from NeetCode activity. All get initial stability ~5 days. Five days later, all 20 are due simultaneously.

**Current behavior:** Queue shows 20 due, forecast shows a spike.

**Desired behavior:**
- At import time, warn: "Importing {n} problems will add ~{n × 0.2} reviews/day to your queue over the next week"
- Stagger initial review dates slightly (±1 day random offset) to smooth the spike
- This is already partially handled by the SRS — import with different solve times and confidence levels produces different initial stabilities

---

### 4.3 Goal Change Mid-Session

**Scenario:** User is 4 weeks into NeetCode 150, has 40 problems attempted. They switch to Blind 75. Now only 25 of their 40 problems are in the target set.

**Current behavior:** Coverage countdown updates immediately. The "New" tab filters to Blind 75 only. Existing non-B75 reviews still appear (they're still learned problems).

**Desired behavior:** This is actually correct. Non-B75 reviews should still appear — the user has already invested in those problems and shouldn't lose the SRS benefit. The change only affects the coverage target and what appears in the New tab.

---

### 4.4 Budget Mismatch Accumulation

**Scenario:** User declares a 60-min (Moderate) budget but consistently practices 90+ minutes/day. After 5 days, the system detects the mismatch and suggests increasing the budget. User ignores the suggestion. After 10 more days, the same suggestion appears again.

**Issue:** Repeated budget-mismatch suggestions become nagging if the user has intentionally chosen to keep a conservative declared budget.

**Desired behavior:**
- Show the budget mismatch suggestion once, with a "Dismiss" option
- If dismissed, don't repeat for at least 14 days
- If the user adjusts their budget (up or down), reset the mismatch detector

**Priority:** P3 — messaging quality; the underlying detection is straightforward.

---

## 5. Data Quality Issues

### 5.1 Inflated Solve Times

**Scenario:** User starts the timer, gets distracted, returns 45 minutes later. Logs 45 min solve time for an Easy problem.

**Impact:** Inflates `avgSolveMinutes`, which affects capacity calculations if we personalize them.

**Mitigation:** The fast-solve bonus already has difficulty-scaled thresholds. For capacity modeling, use median rather than mean solve times, and cap individual values at `difficulty_threshold × 3`.

---

### 5.2 Backdated Imports

**Scenario:** User imports a week's worth of NeetCode activity on Friday, all with `attemptDate` set to Friday. The SRS treats them as same-day attempts.

**Current behavior:** Import uses the user-selected date. Multiple imports on the same day hit the duplicate check.

**Desired behavior:** The import flow should let users set a date per row, or at least per session. Current single-date import is a known limitation.

---

## Summary: Priority Matrix

| ID | Edge Case | Priority | Status |
|---|---|---|---|
| 1.1 | Returning user warmup | P2 | Partially addressed (D9) |
| 1.2 | Binge learner spike | P3 | Not addressed |
| 1.3 | Perfectionist logging | P4 | Addressed by education |
| 1.4 | Speed runner capacity | P4 | SRS handles it |
| 1.5 | Multi-day inconsistency | P4 | 7-day average smooths it |
| 1.6 | Difficulty-skewed user | P4 | Documented; future per-difficulty session times |
| 2.1 | Zero capacity ratio | P1 | Must handle in implementation |
| 2.2 | Stability collapse after break | P2 | Not addressed |
| 2.3 | Forecast divergence | P4 | Auto-updates on render |
| 2.4 | Everything-due spike | P3 | Sort handles mechanics |
| 2.5 | Cold start | P2 | Partially handled |
| 3.1 | No per-user calibration | Research | Deferred |
| 3.2 | Fixed review time | P3 | Future personalization |
| 3.3 | No forecast memory | P4 | Low impact |
| 3.4 | Client-side recommendations | P3 | Acceptable for now |
| 3.5 | localStorage fragility | P2 | Move to DB in Phase 1 |
| 4.1 | Budget + auto-defer | P3 | Messaging improvement |
| 4.2 | Import creates spike | P3 | Stagger initial review dates |
| 4.3 | Goal change mid-session | None | Already correct |
| 4.4 | Budget mismatch accumulation | P3 | Dismiss + cooldown |
| 5.1 | Inflated solve times | P4 | Use median, cap outliers |
| 5.2 | Backdated imports | P4 | Known limitation |
