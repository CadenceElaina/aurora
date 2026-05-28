# Aurora — System Overview

> Concise reference for LLMs, collaborators, and design reviews.  
> Status markers: ✅ implemented · 🔧 planned/in-progress · 💭 discussed, not started · ❌ decided-not-now

---

## 1. What Aurora Is

Aurora is a full-stack web app for technical interview prep. It tracks LeetCode problem-solving attempts and uses a modified FSRS (spaced repetition) algorithm to schedule future reviews — predicting when a user will forget a problem and surfacing it just before that happens.

It is public, self-hostable, uses GitHub OAuth, and ships with a fully functional demo mode (no auth required).

Tech: Next.js 16, React 19, TypeScript strict, Drizzle ORM + PostgreSQL (Supabase), NextAuth v5, Tailwind CSS 4, Vitest.

---

## 2. The SRS Algorithm

### 2a. Core Model

Memory strength is modeled as **stability** (S, in days). Retrievability (R) decays exponentially:

```
R(t) = e^(-t / S)       floor: R ≥ 0.3
```

After each attempt, stability is updated:

```
newS = oldS × (baseMultiplier + modifier)    [clamped to 0.5–365 days]
```

First attempt uses `INITIAL_STABILITY_BASE = 2.0` instead of `oldS`.

### 2b. Base Multipliers

| Outcome | Quality | Multiplier |
|---------|---------|-----------|
| YES (solved independently) | OPTIMAL | 2.5× |
| YES | SUBOPTIMAL | 2.0× |
| YES | BRUTE_FORCE | 1.5× |
| PARTIAL (needed help) | any | 1.1× (quality irrelevant) |
| NO (did not solve) | any except NONE | 0.8× |
| NO | NONE | 0.5× |

PARTIAL max (1.1 + modifiers) must stay below min YES (1.5×). ✅ PARTIAL is capped at `PARTIAL_MAX_MULTIPLIER = 1.25` effective to enforce this gap cleanly.

### 2c. Modifiers (added to base multiplier)

| Condition | Modifier |
|-----------|---------|
| Rewrote solution from scratch (YES only) | +0.5 |
| Confidence 5 | +0.3 |
| Confidence 4 | +0.1 |
| Confidence 3 | ±0 |
| Confidence 2 | −0.2 |
| Confidence 1 | −0.4 |
| Fast solve (Easy <5m, Medium <10m, Hard <15m) | +0.2 |

Confidence applies on all outcomes including failures. A total fail with confidence 1 = 0.1× effective; with confidence 5 = 0.8× (interpretation: "I knew it, brain glitch").

🔧 Planned: end-to-end audit of factor weights (NO ≤ PARTIAL ≤ YES invariant enforced; confidence role for procedural vs. flashcard recall reconsidered). Tracked as T-031.

### 2d. Next Review Scheduling

```
nextReviewAt = now + stability days
```

✅ Minimum 1-day inter-repetition interval enforced in `computeNextReviewDate` (`MIN_REVIEW_INTERVAL_DAYS = 1`), so retrievability math is untouched. The stability clamp floor remains 0.5 days.

### 2e. Example Trace

User solves Two Sum independently:
- Outcome: YES:OPTIMAL → base = 2.5
- Confidence 4 → +0.1; no rewrite; 8 min solve (Medium, >10m threshold) → no fast-solve bonus
- effectiveMultiplier = 2.6
- First attempt: S = 2.0 × 2.6 = **5.2 days** → next review in ~5 days
- Reviewed again at day 5 (YES:OPTIMAL, conf 5): S = 5.2 × 2.8 = **14.6 days** → next review in ~2 weeks

---

## 3. Strategy Modes

Users choose a mode at onboarding alongside their problems/day and new/day targets. The onboarding UI subtly highlights the mode that fits their stated pace, but the user makes the final choice. Switching any time applies immediately — no data migration, SRS state preserved.

### Push Coverage ✅ (core) / 🔧 (FIFO review order)
*"Get through all problems once. Familiarity over mastery."*

- **New problems:** follow NeetCode curriculum sequence — finish current category, user picks next at fork points
- **Review order:** 🔧 FIFO (oldest-reviewed-first, not SRS-priority)
- **New per day:** user-set (no fixed default; higher values push this mode)
- **Concept gates:** none — curriculum recommendation is sequential but user can navigate anywhere
- **Advisory:** queue health indicator + this-week fading count + link to lowest-retained list. No session interference.
- Queue may grow — expected and acceptable in this mode

### Balanced ✅ (core) / 🔧 (advisory refinements)
*"Steady coverage + sustainable review load."*

- **New problems:** algorithm-selected (weakest category, curriculum-aware)
- **Review order:** SRS priority (lowest retrievability first)
- **New per day:** user-set (1–2/day fits this mode well)
- **Concept gates:** soft — recommendations gated, but user can navigate to any category freely; picking an out-of-order problem shows a warning, not a block
- **Advisory:** queue health indicator + this-week fading count + link. Queue zone (Green/Amber/Red) implicitly signals whether current new/day pace is sustainable. User checks forecast (right column) to understand implications.

### Lock In Retention 🔧
*"Master what you've started before expanding."*

- **New problems:** 0 per session default, auto-trickled by queue size:
  - Queue < 10 active problems → ramp phase: 1 new per 1–2 sessions automatically
  - Queue 10–30 → settled: ~2–3 new per week, system suggests
  - Queue 30+ → mature: user-driven
- **Review order:** SRS priority (strict)
- **Concept gates:** hard — locked categories shown grayed out in new tab; user can start one but sees a strong warning + confirm dialog. Never a hard block.
- **Advisory:** break detection only ("Welcome back — your reviews built up"). No recurring fading alert — SRS priority already surfaces low-R problems in session.
- Empty queue never auto-fills with new. User opts in via "Add a new problem" button.

---

## 4. Onboarding Flow

Sign-up steps, in order:

1. **Problems per day + new per day** — two sliders/inputs. System highlights the matching mode card below.
2. **Choose mode** — Push Coverage / Balanced / Lock In Retention cards with brief "why you'd pick this" copy under each. Highlighted card = best fit for stated pace. Subtle note outside the cards: *"We lean toward Balanced for most learners — but pick the one you'll stick with."*
3. **Goal type** — Blind 75 / NeetCode 150 / None
4. **Target** — Name (default: "Fall Recruiting [year]", or next year if already fall) + date. Editable.
5. **Auto-defer Hards** — on by default. Brief reasoning shown: *"Hards take ~50% longer and aren't required for most interviews. Turn off any time."*

Time commitment is **displayed**, not set: *"At 2 new + 3 reviews/day, expect roughly 60–90 min/day."* Derived from AVG_NEW_SESSION_MINUTES (45) and AVG_REVIEW_SESSION_MINUTES (25). No time-budget input.

No session-size override at onboarding or in settings — total problems per day IS the session size.

---

## 5. Today's Session — Composition

```
newSlots    = min(newPerDay, sessionSize)
reviewSlots = sessionSize - newSlots

Cold start (0 attempts ever):        fill all slots with new problems
Lock In Retention + empty queue:     no auto-fill — show opt-in prompt
All other modes + short queue:       unused review slots → extra new slots
```

**User-facing:** session shows N problems. Do all N, session complete. Simple.

**Session complete:** celebration + "Load more reviews" button available. Extra reviews loaded today respect per-problem cooldowns and are subtracted from tomorrow's session to prevent double-counting.

🔧 **T-030 — Cross-day session state integrity (showcase blocker):**
- Session must track which problems were reviewed today (not just a counter)
- Tomorrow's session = problems due tomorrow minus reviewed today
- "Load more" surfaces next-priority items respecting 1-day cooldown
- Same problem cannot appear twice in one day

**Render order in session view:** reviews displayed first, then new problems. 🔧 Currently inverted in code — to be fixed (T3-A).

---

## 6. Curriculum DAG & Concept Gates

NeetCode 150 problems organized into a dependency graph. New problem recommendations follow DAG order. At fork points, user picks which branch to pursue; choice is persisted.

```
L0:  Arrays & Hashing (8)
L1:  [Two Pointers (3)] or [Stack (1)]              ← user picks fork
L2:  Binary Search (7) + Sliding Window (6) + Linked List (11)
L3:  Trees (15)
L4:  [Tries (3)] or [Backtracking (9)] or [Heap / Priority Queue (7)]  ← fork
       Backtracking subtree → Graphs (13) + 1-D DP (12)
       Heap subtree         → Intervals (6) + Greedy (8) + Advanced Graphs (6)
       Tries subtree        → (terminal)
L5:  2-D DP (11) + Bit Manipulation (7) + Math & Geometry (8)
```

**Gate behavior by mode:**

| Mode | What the recommendation engine does | What the user can do |
|------|--------------------------------------|----------------------|
| Push Coverage | Recommends sequentially, no gates | Navigate anywhere freely, start anything |
| Balanced | Won't recommend L2+ until meaningful L1 coverage | Navigate anywhere; picking out-of-order shows advisory warning |
| Lock In Retention | Won't recommend locked categories | Locked categories grayed in new tab; can still start with warning + confirm dialog |

Fork choices are stored in localStorage. Problem order within a category follows the NeetCode roadmap order.

Blind 75 mode: same DAG, only the 75 marked problems are eligible.

---

## 7. Queue Load & Advisory System

### Queue load ratio

```
queueLoadRatio = projectedDailyDue (back half of 60-day forecast) / reviewCapacity
```

### Five zones

| Zone | Ratio | Meaning |
|------|-------|---------|
| Green | ≤ 0.6 | Healthy — add new freely |
| Yellow | ≤ 0.85 | Watch pace |
| Amber | ≤ 1.1 | Review before adding new |
| Orange | ≤ 1.5 | Pause new |
| Red | > 1.5 | Overloaded |

`classifyLoadZone` (`src/lib/pacing.ts`) returns `red` for any ratio above Orange (> 1.5). `QUEUE_RED_RATIO = 2.0` is a separate, stricter "overloaded" escalation threshold reserved for the recommendation engine (🔧 not yet wired — T4-B), not the zone boundary.

### Advisory surface

**Location:** top banner of dashboard.

**What it shows:**
- Queue health indicator (colored dot/badge showing current zone)
- If problems approaching fading threshold this week: *"X problems reach critical this week — [see list]"* → links to Insights fading tab
- Nothing else. No prescriptive text, no session interference.

**Opt-out:** setting in profile dropdown. Also dismissible directly on the notification.

**Per-mode behavior:**
- Push Coverage: queue health + fading count
- Balanced: queue health + fading count (zone color implicitly signals whether pace is sustainable)
- Lock In Retention: no recurring advisory. Break detection fires if inactive 3+ days with reviews pending.

**The advisory never blocks.** Queue zone = informational. Forecast widget (right column) is where the user understands and adjusts their pace.

---

## 8. What We're Measuring (Base) vs. Modeling (Shadow)

### Base — what scheduling actually uses
Stability × effectiveMultiplier, clamped to [0.5, 365] days. Next review = now + stability days. Only change this formula with a documented ADR.

### Shadow — logged, never applied to scheduling

| Signal | Status | Purpose |
|--------|--------|---------|
| `predictedR` logged per attempt | ✅ | Ground truth for algorithm calibration |
| MAE calibration (5 retrieval buckets) | ✅ | Insights page — how well we're predicting |
| `computePDFUpdate` function | ✅ written, 🔧 not wired | Personal Difficulty Factor residual formula |
| PDF applied to scheduling | 💭 Phase 3 | Personalized intervals per user |
| Beta-binomial formulation | 💭 | Alternative to additive residual; needs N > 50 |

**Design principle:** shadow data answers "is the base layer right?" It never changes behavior until validated with a documented ADR. Phase 3 (PDF applied to scheduling) requires an algorithm validation study first.

---

## 9. Progress Tracking

### Readiness Score (0–100 → S/A/B/C/D)

```
score = coverage(35%) + retention(45%) + categoryBalance(20%)
```

- **Coverage:** attempted / total problems in goal set
- **Retention:** problems with R > 0.7 / attempted
- **Category balance:** lowest category avg retrievability

Score suppressed at small N (`sampleWeight = min(1, n/10)`). 🔧 Add tooltip: "Score based on N attempts — reliability increases with more data."

Consistency (how often you practice) is **not** part of readiness. Someone who mastered 80% of the curriculum and took two weeks off is still ready. Consistency lives on the Insights page as a standalone activity indicator.

### Other Tracked Metrics

| Metric | Location | Notes |
|--------|----------|-------|
| Review compliance (% of scheduled done) | Insights | Rolling window |
| `neverReviewed` count | 🔧 Insights (fading tab) | Problems scheduled but never reviewed — "dead queue weight" |
| Learning velocity | Insights | New problems per 7-day window; trend ±15% (N < 3 guard → stable) |
| Consistency / activity | Insights (activity section) | "Practiced X of last 14 days" — separate from readiness |
| Queue stability | Dashboard right col | 60-day forecast, 14-day avg/peak/drain rate |

---

## 10. Session Flow (User Perspective)

```
User opens app
  └─ Dashboard loads
      ├─ Top banner: queue health + fading alert (if any)
      ├─ Left column: today's session (reviews then new problems), progress indicator
      └─ Right column: readiness score, forecast, goal countdown

User logs attempt → POST /api/attempts
  └─ SRS update: new stability, next review date
  └─ predictedR logged (shadow)
  └─ Readiness refreshed

Session complete (all N acted on)
  └─ Celebration
  └─ "Load more reviews" button available (respects cross-day cooldown)

User opens settings
  └─ Gear panel (right col): strategy, problems/day, new/day, goal type, target date/name
  └─ Profile dropdown: auto-defer hards, advisory opt-out, queue view default
  └─ Account page (/settings): OAuth, delete account
```

---

## 11. Settings Reference

### Dashboard gear panel — "How I practice" (frequently changed)

| Setting | Status |
|---------|--------|
| Strategy mode | ✅ |
| Problems per day (total session size) | ✅ |
| New problems per day | ✅ |
| Goal type (Blind 75 / NeetCode 150 / None) | ✅ |
| Target name + date | ✅ date persists to DB; 🔧 name field (default "Fall Recruiting [year]") |

### Profile dropdown — "How the app behaves" (set-and-forget)

| Setting | Status |
|---------|--------|
| Auto-defer Hards | ✅ |
| Advisory notification opt-out | 🔧 |
| Queue view default (session vs. full queue) | ✅ |

### Account page — "Who I am"

| Setting | Notes |
|---------|-------|
| OAuth providers / email | NextAuth-managed |
| Delete account / clear data | User-initiated account data control |

---

## 12. Showcase-Blockers vs. Nice-to-Haves

### Must fix before showcase

| Task | Description | Status |
|------|-------------|--------|
| **T-030** | Cross-day session state integrity — "load more" today can't disrupt tomorrow | 🔧 |
| 1-day minimum interval | Enforced in `computeNextReviewDate` | ✅ |
| RED zone branch | Add to `computePracticeRecommendation` (T4-B) | 🔧 |
| FIFO review order for Push Coverage | Currently SRS priority for all modes (T4-A) | 🔧 |
| PARTIAL cap at 1.25× | Enforces NO ≤ PARTIAL ≤ YES invariant | ✅ |
| Session render order | Reviews before new (currently inverted; T3-A) | 🔧 |
| Persist targetDate to DB | Was localStorage only | ✅ |
| Target name field + smart default | "Fall Recruiting [year]" (T2-B) | 🔧 |
| Fading alert in top banner | Queue health + this-week count + Insights link (T6-A) | 🔧 |
| Lock In Retention ramp-up logic | Queue-size-based new problem trickle (T4-C) | 🔧 |
| Drop time-budget input from onboarding | Replace with derived time display (T5-A) | 🔧 |
| PACING_SYSTEM.md status update | Was "not implemented" | ✅ |
| CONSTANTS.md stale notes | slice(15) reference, break-detection days | ✅ |

### Planned but not blocking

| Task | Trigger |
|------|---------|
| Factor weight audit (confidence, PARTIAL cap) | Before publication |
| neverReviewed surfaced in Insights | Insights page redesign |
| Advisory opt-out setting in profile | Before wider user base |
| Completion milestone / notification | Polish pass |
| budget_mismatch_dismissed → DB | Cross-device bug reports |
| Readiness tooltip ("based on N attempts") | Polish pass |
| Missing tests: deriveCapacity | Next test pass |
| listSourceEnum cleanup | Minor hygiene |

---

## 13. What's Deliberately Not Implemented (and Why)

| Feature | Status | Trigger to reconsider |
|---------|--------|----------------------|
| Per-category PDF | 💭 | 20+ reviews per category per user |
| PDF applied to scheduling | 💭 Phase 3 | Algorithm validation study complete |
| Beta-binomial model | 💭 | N > 50 users, 30+ day history |
| Round-robin category rotation for new problems | 💭 documented | If curriculum-sequential proves insufficient |
| Per-concept focus filter | 💭 documented | User request; overlay on any strategy |
| Overshoot tracking | 💭 | Real user data shows false positives |
| computeQualityProgression (quality trend) | 💭 | Insights page redesign |
| Self-assessment "no idea / get pattern / got it" flags | 💭 | Weigh against current outcome × quality matrix |
| Interleaving (post-mastery random ordering) | 💭 | Post-coverage phase design |
| T-029 mock interview mode | 💭 | Decide extract vs. remove |
| Per-difficulty session time | 💭 | Users exclusively reviewing Hards |
| dashboard-client.tsx refactor (3300 LOC) | 💭 | Feature-driven reason |

---

## 14. Constants Glossary

| Constant | Value | Meaning |
|----------|-------|---------|
| INITIAL_STABILITY_BASE | 2.0 days | Starting stability for first attempt |
| MIN_STABILITY | 0.5 days | Stability floor (1-day minimum is enforced separately at the review-interval level) |
| MAX_STABILITY | 365 days | Stability ceiling |
| MASTERY_THRESHOLD | 45 days | Stability considered "mastered" |
| RETRIEVABILITY_FLOOR | 0.3 | R never shown below 30% |
| MIN_REVIEW_INTERVAL_DAYS | 1 | Floor on the scheduled inter-review gap |
| PDF_ALPHA | 0.1 | Learning rate for Personal Difficulty Factor |
| PDF_CLAMP | [0.5, 2.0] | PDF bounds |
| AVG_REVIEW_SESSION_MINUTES | 25 | Used for time-commitment display and capacity math |
| AVG_NEW_SESSION_MINUTES | 45 | Used for time-commitment display |
| QUEUE_GREEN_RATIO | 0.6 | Load below this: healthy |
| QUEUE_YELLOW_RATIO | 0.85 | Watch zone |
| QUEUE_AMBER_RATIO | 1.1 | Review before new |
| QUEUE_ORANGE_RATIO | 1.5 | Pause new; `classifyLoadZone` returns `red` above this |
| QUEUE_RED_RATIO | 2.0 | 🔧 Reserved "overloaded" recommendation threshold (T4-B) |
| MAX_FORECAST_DAYS | 60 | Simulation horizon |
| Break detection | 3 / 7 days | ≥3 days inactive → warm-up guidance; ≥7 → "Welcome back" copy (inline literals) |

---

## 15. Key Files

| File | Purpose |
|------|---------|
| `src/lib/srs.ts` | Pure SRS computation — stability, retrievability, PDF, readiness |
| `src/lib/capacity.ts` | Session sizing, queue load zones, practice recommendations |
| `src/lib/pacing.ts` | deriveCapacity wrapper, zone constants |
| `src/lib/curriculum.ts` | NeetCode 150 DAG, fork logic, computeNextRecommendation |
| `src/lib/analytics.ts` | Compliance, velocity, quality progression |
| `src/db/schema.ts` | Full data model |
| `src/app/dashboard/dashboard-client.tsx` | Session composition, forecast, all dashboard logic (~3300 LOC) |
| `docs/TASKS.md` | Prioritized task queue |
| `docs/files/CONSTANTS.md` | Constant definitions and rationale |
| `docs/files/SRS_UPDATE_FORMULATIONS.md` | ADR: additive residual vs. beta-binomial decision |

---

*Last updated: 2026-05-28.*
