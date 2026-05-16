# Current Implementation State — Aurora Ascent

**Last updated: 2026-05-10 — SRS calibration tooling complete (chart, multiplier distribution, backtest engine)**

Read this before every work session. Update it after every session.

---

## In Progress

_None — clean slate._

---

## Known Bugs / Issues

| Priority | Area | Issue |
|---|---|---|
| P2 | Dashboard | Cheatsheet panel: Queue Forecast bars visible behind panel when open (z-index / compositing) — intermittent |

---

## Recently Completed (this session)

| Date | Change |
|---|---|
| 2026-05-10 | `feat(srs)`: SVG calibration curve chart on Insights page — 5-bucket bar chart vs. perfect-calibration diagonal; wired to `computeModelCalibration` |
| 2026-05-10 | `feat(admin)`: Multipliers tab — per-(outcome×quality) key frequency, base multiplier, avg confidence, avg predictedR |
| 2026-05-10 | `feat(admin)`: Backtest tab + `GET /api/admin/backtest` — replay full attempt history under alternate multiplier table; MAE-vs-MAE comparison; per-problem stability delta table |
| 2026-05-10 | `feat(srs)`: `src/lib/srs-simulator.ts` — pure `runBacktest()` engine; `computeMultiplierOutcomes` added to `analytics.ts`; 26 new tests (233 total) |
| 2026-05-10 | `feat(srs)`: `predictedR` column on `attempt` table; logged on every review; Insights calibration card (MAE, n); ADAPTIVE_SRS Phase 1 complete |
| 2026-05-10 | `feat(pacing)`: Phase 3 — budget mismatch detection banner; 14-day dismiss cooldown; `AVG_PROBLEM_SESSION_MINUTES=30` |
| 2026-05-10 | `feat(pacing)`: Phase 4 — zone-colored forecast bars; capacity reference line (`~N/d cap`) |
| 2026-05-10 | `feat(pacing)`: `src/lib/pacing.ts` — `classifyLoadZone` + `deriveCapacity`; 20 new unit tests (207 total) |
| 2026-05-10 | `fix(ui)`: cheatsheet panel `z-10` prevents forecast bar bleed-through; second `+30d` label updated to `+{totalDays}d` |
| 2026-05-10 | `docs`: ARCHITECTURE.md D1–D10 deferred list marked resolved with audit evidence |
| 2026-05-10 | `feat(pacing)`: Phase 2 — 5-zone load ratio system; `MAX_DAYS` 30→60; `queueStability` dynamic split index |
| 2026-05-10 | `fix(capacity)`: `reviewCapacity` floors at 1; `timeBudget` state replaces stale `localStorage` read in memo |

## Previously Completed (2026-05-03 polish sprint)

| Date | Change |
|---|---|
| 2026-05-03 | `fix(dashboard)`: `pickMockProblems` always returns 2; Medium+Medium fallback when no Hards |
| 2026-05-03 | `fix(srs)`: `PARTIAL:NONE` multiplier 1.0→1.1; 2 new unit tests (55 total) |
| 2026-05-03 | `fix(srs)`: explicit `NO:OPTIMAL`=0.8 and `NO:SUBOPTIMAL`=0.8 entries |
| 2026-05-03 | `fix(dashboard)`: New tab default when queue empty; neutral tone at < 5 attempts |
| 2026-05-03 | `fix(dashboard)`: tone badge "Watch"→"Review first", "Plan"→"Getting started" |
| 2026-05-03 | `fix(dashboard)`: "Done" tab renamed to "Completed" |
| 2026-05-03 | `fix(nav)`: Setup Guide moved to authenticated user menu |
| 2026-05-03 | `fix(nav)`: avatar `<img>` → `next/image`; added remotePatterns |
| 2026-05-03 | `fix(dashboard)`: readiness "limited data" label at < 5 attempts |
| 2026-05-03 | `feat(theme)`: light mode — system preference default, localStorage persistence, toggle |
| 2026-05-03 | `feat(insights)`: per-user Insights page + admin dashboard |
| 2026-05-03 | `feat(ux)`: unified demo, onboarding, and sign-in flow |
| 2026-05-03 | `feat(info)`: 3-col layout with sticky glossary + references right panel |
| 2026-05-03 | `fix(info)`: anchor scroll offset, formula readability, forgetting curve chart |

---

## Open Tasks

_None — task queue empty. Next meaningful work: Pacing Phase 3 remainder (time-to-first-warning event logging)._

---

## Product Goals

**Goal:** Ship Aurora as a polished, production-ready product — publicly usable, well-documented, and demo-ready for any new user.

**Aurora Ascent (public, this repo):**
- Public-facing, open-source, fully functional
- No visible bugs in any flow a first-time user would notice
- Algorithm correct and explainable (see ARCHITECTURE.md)
- Clean professional UI — cheatsheets, insights, readiness dashboard all working
- Demo mode functional for unauthenticated visitors
- README and docs are publicly readable

---

## Infra Limits to Watch

| Risk | Status |
|---|---|
| Supabase pause after 7 days inactivity | Mitigated — cron ping every 3 days via vercel.json |
| MAX_USERS cap | Set to 500, enforced in src/auth.ts |
| Vercel free tier function invocations | 1M/month; low risk at current scale |

---

## Tests

- `tests/unit/srs.test.ts` — 55 SRS unit tests
- `tests/unit/analytics.test.ts` — analytics engine tests (includes `computeMultiplierOutcomes`)
- `tests/unit/srs-simulator.test.ts` — 14 backtest engine tests
- `tests/api/` — API route integration tests
- `src/app/dashboard/__tests__/` — pacing + capacity unit tests
- **233 total, all passing**

Run: `npm test`
