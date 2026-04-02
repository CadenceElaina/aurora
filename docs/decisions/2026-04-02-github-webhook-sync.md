# ADR: GitHub Webhook Sync for NeetCode Submissions

**Date:** 2026-04-02
**Status:** Accepted

---

## Context

NeetCode offers a GitHub integration that auto-commits accepted submissions to a repository (e.g., `neetcode-submissions-5tt5vaah`). Commit messages follow the format:

```
Add: {slug} - submission-{N}
```

We wanted to automatically detect when users solve problems on NeetCode and surface them in the dashboard for confirmation, avoiding duplicate manual data entry.

## Decision

### Webhook, not polling

**Rejected:** Periodic polling of the GitHub API.

- Rate limits (60/hr unauthenticated, 5000/hr with PAT)
- Requires storing a user's GitHub token
- Latency: polled data is stale by the interval duration

**Accepted:** GitHub push webhooks. Real-time, no token needed, no rate limit concerns. GitHub sends a POST to our endpoint on every push to the repo.

### Future-only, not bulk sync

**Rejected:** Importing historical commits on connect.

- **Review detection breaks** — if we bulk import old commits, aggressive dedup ("skip if any attempt exists") would skip ALL subsequent reviews for those problems
- **Date accuracy** — historical commits have past timestamps, but the user may have already logged some of those attempts manually with different dates. Attribution gets messy.
- **Duplicate risk** — users who manually logged early attempts would get duplicates from the bulk import

**Accepted:** Future-only sync. Record `githubConnectedAt` timestamp on the user. Webhook handler ignores commits before that timestamp. This means:

- Only new NeetCode submissions (after connecting) appear as pending
- Existing manual history is untouched
- Timestamps are always real-time accurate

### Pending confirmation queue, not auto-import

**Rejected:** Auto-creating attempts from webhook data.

- No way to assess solution quality, complexity answers, confidence, or solve time from a commit
- Creates low-quality attempt records that hurt SRS accuracy

**Accepted:** Webhook creates `pendingSubmissions` rows. Dashboard shows a banner with pending count. User expands to review each, can:

- **Quick confirm** — accepts with sensible defaults (Solved independently, OPTIMAL quality, confidence 3, 20min solve time, auto-filled complexity from problem metadata)
- **Full form** — links to the full attempt form for detailed logging
- **Dismiss** — skips without creating an attempt

Confirmed submissions go through `POST /api/attempts` like all other paths, inheriting existing dedup (409 on same-day duplicates) and SRS update logic.

### isReview detection

When the webhook fires, we check if the user already has a `userProblemState` for that problem. If yes, the pending submission is tagged as `isReview: true`. This is displayed in the UI so the user knows the system recognizes it's a review vs. first attempt.

### Slug mapping

NeetCode repo folders = slugs that match `neetcodeUrl` after `/problems/`. Example:

```
Commit: "Add: anagram-groups - submission-3"
  → slug: "anagram-groups"
  → neetcodeUrl contains "/problems/anagram-groups"
  → problem found
```

## Schema Changes

- `users` table: added `githubRepo`, `githubWebhookSecret`, `githubConnectedAt`
- `attempts` table: added `source` column (enum: manual, import, github)
- New `pendingSubmissions` table for the confirmation queue
- New enums: `attempt_source`, `pending_status`

## API Routes

| Route                 | Method | Purpose                                                                 |
| --------------------- | ------ | ----------------------------------------------------------------------- |
| `/api/webhook/github` | POST   | Receives GitHub push events, verifies HMAC, creates pending submissions |
| `/api/pending`        | GET    | Lists pending submissions for current user                              |
| `/api/pending`        | POST   | Confirm or dismiss a pending submission                                 |
| `/api/github-sync`    | GET    | Get current connection status                                           |
| `/api/github-sync`    | POST   | Connect repo (generates webhook secret)                                 |
| `/api/github-sync`    | DELETE | Disconnect GitHub sync                                                  |

## Security

- Webhook payloads verified via HMAC-SHA256 (`x-hub-signature-256` header)
- Per-user webhook secrets generated with `crypto.randomBytes(32)`
- Timing-safe comparison prevents timing attacks
