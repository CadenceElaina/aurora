# ADR: Composable Today's Session (review + new-problem slots)

**Date:** 2026-05-17  
**Status:** Accepted

---

## Problem

Today's Session was a pure view of the review queue — it never surfaced new problems unless the queue was completely empty. The curriculum card gate (`reviewItems.length < sessionSizeEffective`) meant that any user with even a small backlog would never see a new-problem recommendation in the session view.

This created two concrete issues:

1. **Coverage stall.** A user with 20 overdue items and a 5-problem session would go 5–7 days with zero new coverage while their queue drained. At 2.1 new/day needed over 107 days, losing a week to pure review is meaningful.

2. **Motivation tax.** Weeks of pure review feel like treading water. The curriculum card's purpose — keep forward momentum — was silently broken for every real user.

---

## Decision

Today's Session is now composed from two independent budgets:

```
sessionSizeEffective = reviewSlots + newSlots
reviewSlots = max(0, sessionSizeEffective - newPerSession)
newSlots    = min(newPerSession, sessionSizeEffective)
```

The user controls `newPerSession` (0–3) in Settings. The system:

- Fills `reviewSlots` from the overdue queue (most-overdue first, unchanged)
- Fills `newSlots` from `curriculumRecs` — the curriculum engine called N times with exclusions so each slot gets a distinct problem
- Tracks `sessionActedOn` (reviews) and `sessionNewActedOn` (new slots) separately; celebration fires at `sessionActedOn + sessionNewActedOn >= sessionSizeEffective`

---

## Advisory

An advisory line appears below the "New per session" selector in Settings:

- **Green** (queue clears ≤ 3d): "Queue clears in ~Nd at this pace"
- **Yellow** (4–7d): "Queue clears in ~Nd — moderate backlog"
- **Orange** (8+d): "Queue grows at this pace — consider reducing new to N-1/session"

This is non-blocking. The user sees the consequence of their choice and decides.

---

## What stays unchanged

- Default is `newPerSession = 0` — existing behavior is preserved for users who haven't touched the setting
- The New tab always shows the top curriculum recommendation (calls the engine with `max(1, newSlots)` to guarantee at least one result)
- The curriculum engine itself (`src/lib/curriculum.ts`) is unchanged — pure computation, called N times with exclusions
- SRS scheduling, stability updates, and retention math are unaffected
- Demo mode fallback is unaffected (new state is local-only)

---

## Alternatives considered

**Full goal-mode system (Coverage / Mastery / Drill):** Rejected — large UI surface for what amounts to two knobs (new per session + category filter). Over-engineered for the actual use cases.

**Auto-derive the split from queue health:** Rejected — removes user agency. The advisory text already communicates the system's recommendation; the user decides whether to follow it.

**Per-category slot allocation:** Rejected — the curriculum DAG already picks from the weakest category automatically. Category drilling is handled by the queue filter dropdown.
