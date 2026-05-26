# CLAUDE.md

Context and workflow rules for Claude Code sessions in this repository.

## What This Is

Aurora is a full-stack app for technical interview prep. It uses a modified FSRS
algorithm to schedule LeetCode problem reviews and a pacing system (`capacity.ts`,
`pacing.ts`) that models daily time budgets and queue load recommendations.

## Commands

```bash
npm run dev          # Start dev server (port 3000)
npm run build        # Production build
npm run lint         # ESLint
npm test             # Vitest — must pass before any srs.ts change

# Database
npx drizzle-kit push       # Push schema changes
npx drizzle-kit generate   # Generate migration SQL
```

**Required env vars** (copy `.env.example` → `.env.local`):
- `DATABASE_URL` — Supabase Postgres connection string
- `AUTH_SECRET` — generate with `npx auth secret`
- `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` — GitHub OAuth app credentials

## Key Invariants — Never Break

- `src/lib/srs.ts` is **pure computation only** — no DB calls, no fetch, no side effects
- All DB mutations go through `/api/*` routes, never Server Components
- Demo mode (`isDemo = !isAuthenticated`) must keep working — every feature has a demo fallback
- `npm test` must pass after every change to `src/lib/srs.ts`
- Never commit `DATABASE_URL`, `AUTH_SECRET`, or OAuth credentials

## Design Principles

1. **Session time, not problem time.** All capacity math uses `AVG_REVIEW_SESSION_MINUTES=25`,
   `AVG_NEW_SESSION_MINUTES=45`. Never quote throughput in raw problem-time.
2. **Load ratio is the primary signal.** Five zones (Green/Yellow/Amber/Orange/Red).
   `computePracticeRecommendation` returns zone + tone, not a raw number. See `docs/CONSTANTS.md`.
3. **SRS computes; recommendations advise.** Calibrate the algorithm from observed data
   (PDF, predictedR logs, additive residual) — that's the iterative goal. Don't tweak SRS
   multipliers as a workaround for recommendation bugs; fix those in the recommendation layer.
4. **The system never blocks.** Forecast + advisory show consequences; users override. By design.
5. **Strategy is a preset, not a mode.** `newPerSession` + `advisoryThreshold` take effect
   immediately with no state migration.
6. **One source of truth per constant.** Thresholds live in `docs/CONSTANTS.md` first, then code.
7. **Docs match code.** Update doc Status in the same PR as the code change — never after.
8. **No scope creep.** Don't extend or generalize beyond the task.
   If it's not in `docs/TASKS.md` or the current prompt, don't build it.

## Sensitive Info — Never in This Repo

- `.env` values, API keys, DB connection strings
- Dr. Wilson's contact info or email content
- IRB material until post-approval
- Pre-publication research design specifics
- PII from consent flow testing

## Interaction Modes

### Planning mode (default)
When a problem or feature is described without an explicit instruction to proceed:
- Identify edge cases and failure modes
- Surface relevant tradeoffs
- Flag security or data integrity concerns
- Ask **one** clarifying question if intent is ambiguous — never multiple at once

Present a concise plan and wait for approval before writing code.

### Execute mode
When I say `go`, `proceed`, `just do it` — skip planning and implement directly.

## Prompts Must Include

For any non-trivial implementation:

- [ ] **Which repo** — `aurora` (public) or `aurora-research`
- [ ] **Affected files** — primary file(s) and function names
- [ ] **Relevant constants** — from `docs/CONSTANTS.md` if touching pacing, capacity, SRS, or forecast
- [ ] **Expected behavior** — what is different after this change
- [ ] **Scope boundary** — what explicitly should NOT change
- [ ] **Sensitive-info check** — does this touch auth, user data, research data, or export?

## Commits

```bash
git add -A
git commit -m "<type>(<scope>): <short description>"
git push
```

Types: `feat` · `fix` · `refactor` · `test` · `chore` · `docs`
Scopes: `srs` · `dashboard` · `nav` · `api` · `db` · `ui` · `test` · `docs` · `pacing` · `capacity`

- Subject line under 72 characters
- Atomic commits — one logical change per commit
- Run `npx tsc --noEmit && npm test` before committing

## Key Files

| File | Purpose |
|---|---|
| `src/lib/srs.ts` | SRS algorithm engine (pure computation) |
| `src/lib/capacity.ts` | Queue load, capacity derivation, `computePracticeRecommendation` |
| `src/lib/pacing.ts` | Load zone classification wrappers |
| `src/lib/analytics.ts` | Insights, model calibration, stuck-problem detection |
| `src/lib/curriculum.ts` | NeetCode 150 DAG, next-problem recommendation |
| `src/db/schema.ts` | Full data model |
| `docs/CONSTANTS.md` | All numeric thresholds — check here before adding any |
| `docs/TASKS.md` | Task queue |
