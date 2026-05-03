"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  type DbProblem,
  type ImportAttempt,
  parseActivityText,
  groupIntoAttempts,
} from "@/lib/import-parser";

type Outcome = "SOLVED" | "PARTIAL" | "NO_SOLUTION";
type Quality = "OPTIMAL" | "BRUTE_FORCE";

function validateAttempt(a: ImportAttempt): string | null {
  if (!a.matchedProblem) return null; // will be skipped
  return null;
}

/* ── Labels ── */

const CONF_LABELS: Record<number, string> = {
  1: "Can't solve at all",
  2: "Brute force only",
  3: "Know the approach, may have bugs",
  4: "Clean, minor bugs possible",
  5: "Solve cold, no issues",
};

/* ── Main component ── */

type Step = "paste" | "confirm" | "done";

type Props = {
  allProblems: DbProblem[];
  attemptedIds: number[];
  /** Problem IDs already logged today — pre-skipped in confirm step */
  todayAttemptedIds?: number[];
  /** Called instead of showing the done screen — use when embedded in another page */
  onDone?: () => void;
  /** Removes outer max-w / heading, uses flex-fill layout for inline use */
  embedded?: boolean;
};

export function ImportClient({ allProblems, attemptedIds, todayAttemptedIds, onDone, embedded }: Props) {
  const attemptedSet = useMemo(() => new Set(attemptedIds), [attemptedIds]);
  const todaySet = useMemo(() => new Set(todayAttemptedIds ?? []), [todayAttemptedIds]);
  const today = new Date().toISOString().slice(0, 10);

  const [step, setStep] = useState<Step>("paste");
  const [dateStr, setDateStr] = useState(today);
  const [rawText, setRawText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<ImportAttempt[]>([]);
  const [submittedCount, setSubmittedCount] = useState(0);

  const activeAttempts = useMemo(
    () => attempts.filter((a) => !a.deleted),
    [attempts],
  );

  async function handleParse() {
    setParseError(null);
    const rows = parseActivityText(rawText);
    if (rows.length === 0) {
      setParseError(
        "No rows found. Copy the full submission table from the NeetCode activity page (tab-separated).",
      );
      return;
    }
    const grouped = groupIntoAttempts(rows, dateStr, allProblems, attemptedSet);

    // Fetch attempts already logged on the selected date to pre-skip duplicates
    try {
      const res = await fetch(`/api/attempts?date=${dateStr}`);
      if (res.ok) {
        const existing: { problemId: number }[] = await res.json();
        const dateSet = new Set(existing.map((e) => e.problemId));
        for (const a of grouped) {
          if (a.matchedProblem && dateSet.has(a.matchedProblem.id)) {
            a.submitStatus = "skipped";
            a.submitError = "Already logged on this date";
          }
        }
      }
    } catch {
      // Non-critical — server-side 409 will still catch dupes
    }

    setAttempts(grouped);
    setStep("confirm");
  }

  function updateAttempt(id: string, patch: Partial<ImportAttempt>) {
    setAttempts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    );
  }

  async function handleSubmitAll() {
    const toSubmit = activeAttempts.filter(
      (a) => a.matchedProblem && a.submitStatus === "idle" && !validateAttempt(a),
    );

    let count = 0;
    for (const attempt of toSubmit) {
      if (!attempt.matchedProblem) continue;
      updateAttempt(attempt.id, { submitStatus: "submitting" });

      const isNoSolution = attempt.outcome === "NO_SOLUTION";
      const body = {
        problemId: attempt.matchedProblem.id,
        solvedIndependently:
          attempt.outcome === "SOLVED"
            ? "YES"
            : attempt.outcome === "PARTIAL"
              ? "PARTIAL"
              : "NO",
        solutionQuality: isNoSolution ? "NONE" : attempt.quality,
        userTimeComplexity: "N/A",
        userSpaceComplexity: "N/A",
        confidence: attempt.confidence,
        solveTimeMinutes: attempt.solveTimeMinutes,
        rewroteFromScratch: attempt.isReview ? "YES" : "DID_NOT_ATTEMPT",
        notes: attempt.notes || null,
        source: "import",
        attemptDate: dateStr + "T12:00:00",
        ...(attempt.forceSubmit && { force: true }),
      };

      try {
        const res = await fetch("/api/attempts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (res.status === 409) {
            updateAttempt(attempt.id, {
              submitStatus: "skipped",
              submitError: (data as { message?: string }).message ?? "Already logged today",
            });
            count++;
          } else {
            updateAttempt(attempt.id, {
              submitStatus: "error",
              submitError: (data as { error?: string }).error ?? "Failed",
            });
          }
        } else {
          updateAttempt(attempt.id, { submitStatus: "done" });
          count++;
        }
      } catch {
        updateAttempt(attempt.id, {
          submitStatus: "error",
          submitError: "Network error",
        });
      }
    }

    setSubmittedCount((c) => c + count);
    // Transition to done if no errors remain
    const stillHasErrors = attempts
      .filter((a) => !a.deleted && a.submitStatus !== "done" && a.submitStatus !== "skipped")
      .some((a) => a.submitStatus === "error");
    if (!stillHasErrors && count > 0) {
      if (onDone) {
        onDone();
      } else {
        setStep("done");
      }
    }
  }

  /* ── Paste step ── */

  if (step === "paste") {
    return (
      <div className={embedded ? "flex flex-col gap-3 flex-1 min-h-0" : "max-w-2xl mx-auto space-y-6"}>
        {!embedded && (
          <div>
            <h1 className="text-xl font-semibold">Import Activity</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Go to{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                neetcode.io/activity/YYYY-MM-DD
              </code>
              , select all rows in the table, copy (Ctrl+C), then paste below.
            </p>
          </div>
        )}

        <div className={embedded ? "flex flex-col gap-3 flex-1 min-h-0" : "space-y-4"}>
          {embedded ? (
            <>
              {/* Date row — matches mock's duration row */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-muted-foreground shrink-0">Date:</span>
                <input
                  type="date"
                  value={dateStr}
                  max={today}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="rounded-md border border-border bg-muted px-2 py-1 text-xs"
                />
                <span className="text-xs text-muted-foreground truncate">
                  Copy table from{" "}
                  <code className="rounded bg-muted px-1 text-xs">neetcode.io/activity/YYYY-MM-DD</code>
                </span>
              </div>

              {/* Bordered panel — matches mock's selected-problems panel */}
              <div className="rounded-lg border border-border bg-muted flex-1 min-h-0 flex flex-col overflow-hidden">
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={`Paste activity table here…\n\nExample (select all rows on the NeetCode activity page, then Ctrl+C):\n\nTwo Sum\tEasy\tAccepted\tPython\t40 ms\t16.5 MB\t2:30 PM\nValid Anagram\tEasy\tAccepted\tPython\t52 ms\t17.1 MB\t2:45 PM`}
                  className="block w-full flex-1 min-h-0 resize-none bg-transparent px-3 py-2 font-mono text-sm focus:outline-none"
                />
                {parseError && (
                  <p className="px-3 py-2 text-xs text-red-500 border-t border-border/60 shrink-0">{parseError}</p>
                )}
                <div className="px-3 py-3 border-t border-border/60 shrink-0">
                  <button
                    onClick={handleParse}
                    disabled={!rawText.trim() || !dateStr}
                    className="w-full inline-flex h-9 items-center justify-center rounded-md bg-accent text-sm font-semibold text-accent-foreground transition-colors hover:opacity-90 disabled:opacity-50"
                  >
                    Parse Activity →
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-end gap-3 shrink-0">
                <div>
                  <label className="text-xs text-muted-foreground">Date</label>
                  <input
                    type="date"
                    value={dateStr}
                    max={today}
                    onChange={(e) => setDateStr(e.target.value)}
                    className="mt-1 block rounded-md border border-border bg-muted px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={`Paste activity table here…\n\nExample (select all rows on the NeetCode activity page, then Ctrl+C):\n\nTwo Sum\tEasy\tAccepted\tPython\t40 ms\t16.5 MB\t2:30 PM\nValid Anagram\tEasy\tAccepted\tPython\t52 ms\t17.1 MB\t2:45 PM`}
                rows={12}
                className="block w-full rounded-md border border-border bg-muted px-3 py-2 font-mono text-sm resize-y"
              />

              {parseError && <p className="text-xs text-red-500 shrink-0">{parseError}</p>}

              <button
                onClick={handleParse}
                disabled={!rawText.trim() || !dateStr}
                className="inline-flex h-9 shrink-0 items-center rounded-md bg-accent px-4 text-sm text-accent-foreground transition-colors hover:opacity-90 disabled:opacity-50"
              >
                Parse Activity →
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  /* ── Done step ── */

  if (step === "done") {
    return (
      <div className="max-w-2xl mx-auto space-y-4 pt-12 text-center">
        <div className="text-5xl">✓</div>
        <h1 className="text-xl font-semibold">All logged!</h1>
        <p className="text-muted-foreground">
          {submittedCount} attempt{submittedCount !== 1 ? "s" : ""} submitted
          successfully.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex h-9 items-center rounded-md bg-accent px-4 text-sm text-accent-foreground hover:opacity-90"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  /* ── Confirm step ── */

  const unmatched = activeAttempts.filter((a) => !a.matchedProblem);
  const validIdle = activeAttempts.filter(
    (a) => a.matchedProblem && a.submitStatus === "idle" && !validateAttempt(a),
  );

  return (
    <div className={embedded ? "flex flex-col flex-1 min-h-0 gap-3" : "max-w-2xl mx-auto space-y-4"}>
      {/* Header */}
      <div className={`flex items-start justify-between gap-3 ${embedded ? "shrink-0" : ""}`}>
        <div>
          <h1 className="text-xl font-semibold">Confirm Attempts</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {activeAttempts.length} session
            {activeAttempts.length !== 1 ? "s" : ""} · {dateStr}
            {unmatched.length > 0 && (
              <span className="text-amber-500">
                {" "}
                · {unmatched.length} unmatched (will skip)
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setStep("paste")}
            className="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back
          </button>
          <button
            onClick={handleSubmitAll}
            disabled={validIdle.length === 0}
            className="inline-flex h-9 items-center rounded-md bg-accent px-4 text-sm text-accent-foreground hover:opacity-90 disabled:opacity-50"
          >
            Submit {validIdle.length > 0 ? `(${validIdle.length})` : "All"}
          </button>
        </div>
      </div>

      {/* Attempt cards */}
      <div className={embedded ? "space-y-3 overflow-y-auto flex-1 min-h-0 pr-0.5" : "space-y-3"}>
        {attempts
          .filter((a) => !a.deleted)
          .map((attempt) => (
            <AttemptCard
              key={attempt.id}
              attempt={attempt}
              onUpdate={(patch) => updateAttempt(attempt.id, patch)}
              onDelete={() => updateAttempt(attempt.id, { deleted: true })}
            />
          ))}
      </div>
    </div>
  );
}

/* ── Attempt Card ── */

type CardProps = {
  attempt: ImportAttempt;
  onUpdate: (patch: Partial<ImportAttempt>) => void;
  onDelete: () => void;
};

function AttemptCard({ attempt, onUpdate, onDelete }: CardProps) {
  const {
    matchedProblem,
    isReview,
    outcome,
    quality,
    confidence,
    notes,
    submitStatus,
    submitError,
    solveTimeMinutes,
  } = attempt;

  const validationError = validateAttempt(attempt);

  if (submitStatus === "done") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-3">
        <span className="text-green-500">✓</span>
        <span className="text-sm font-medium">
          {matchedProblem?.title ?? attempt.rawTitle}
        </span>
        <span className="ml-auto text-xs text-muted-foreground">
          {isReview ? "Review" : "New"} · logged
        </span>
      </div>
    );
  }

  if (submitStatus === "skipped") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-4 py-3">
        <span className="text-yellow-500">⊘</span>
        <span className="text-sm font-medium text-muted-foreground">
          {matchedProblem?.title ?? attempt.rawTitle}
        </span>
        <span className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {submitError ?? "Already logged today"}
          </span>
          <button
            onClick={() => onUpdate({ submitStatus: "idle", submitError: null, forceSubmit: true })}
            className="text-xs text-accent hover:underline"
          >
            Log anyway
          </button>
        </span>
      </div>
    );
  }

  if (submitStatus === "submitting") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted px-4 py-3 opacity-60">
        <span className="animate-pulse text-muted-foreground text-xs">Submitting…</span>
        <span className="text-sm font-medium">
          {matchedProblem?.title ?? attempt.rawTitle}
        </span>
      </div>
    );
  }

  const showQuality = outcome !== "NO_SOLUTION";

  return (
    <div
      className={`rounded-lg border p-4 space-y-3 ${
        !matchedProblem
          ? "border-amber-500/40 bg-amber-500/5"
          : submitStatus === "error"
            ? "border-red-500/40 bg-red-500/5"
            : "border-border bg-muted"
      }`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex items-center gap-2 flex-wrap">
          <span
            className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
              isReview
                ? "bg-blue-500/20 text-blue-400"
                : "bg-violet-500/20 text-violet-400"
            }`}
          >
            {isReview ? "REVIEW" : "NEW"}
          </span>
          <span className="text-sm font-medium truncate">
            {matchedProblem ? (
              matchedProblem.title
            ) : (
              <span className="text-amber-500">{attempt.rawTitle}</span>
            )}
          </span>
          {matchedProblem && (
            <span className="text-xs text-muted-foreground shrink-0">
              {matchedProblem.difficulty} · {matchedProblem.category}
            </span>
          )}
        </div>
        <button
          onClick={onDelete}
          title="Remove"
          className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
      </div>

      {/* Unmatched warning */}
      {!matchedProblem && (
        <p className="text-xs text-amber-500">
          Not found in database — will be skipped on submit.
        </p>
      )}

      {/* Error */}
      {(submitStatus === "error" || submitError) && (
        <p className="text-xs text-red-400">{submitError}</p>
      )}

      {matchedProblem && (
        <>
          {/* Outcome */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground w-16 shrink-0">Outcome:</span>
            {(["SOLVED", "PARTIAL", "NO_SOLUTION"] as Outcome[]).map((o) => (
              <button
                key={o}
                onClick={() => onUpdate({ outcome: o })}
                className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                  outcome === o
                    ? o === "SOLVED"
                      ? "border-green-500 bg-green-500/15 text-green-400"
                      : o === "PARTIAL"
                        ? "border-amber-500 bg-amber-500/15 text-amber-400"
                        : "border-red-500/60 bg-red-500/10 text-red-400"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {o === "SOLVED"
                  ? "Solved"
                  : o === "PARTIAL"
                    ? "Partial"
                    : "Couldn't Solve"}
              </button>
            ))}
          </div>

          {/* Quality (not shown for NO_SOLUTION) */}
          {showQuality && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground w-16 shrink-0">Quality:</span>
              {(["OPTIMAL", "BRUTE_FORCE"] as Quality[]).map(
                (q) => (
                  <button
                    key={q}
                    onClick={() => onUpdate({ quality: q })}
                    className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                      quality === q
                        ? "border-accent bg-accent/20 text-foreground"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {q === "OPTIMAL" ? "Optimal" : "Not Optimal"}
                  </button>
                ),
              )}
            </div>
          )}

          {/* Confidence + Solve time */}
          <div className="flex items-center gap-4">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">Confidence:</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => onUpdate({ confidence: n })}
                    className={`flex h-7 w-7 items-center justify-center rounded text-xs transition-colors ${
                      confidence === n
                        ? "bg-accent text-accent-foreground font-medium"
                        : "border border-border text-muted-foreground hover:bg-muted"
                    }`}
                    title={CONF_LABELS[n]}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">{CONF_LABELS[confidence]}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <label className="text-xs text-muted-foreground">Time:</label>
              <input
                type="number"
                min={1}
                value={solveTimeMinutes}
                onChange={(e) =>
                  onUpdate({ solveTimeMinutes: Number(e.target.value) })
                }
                className="w-14 rounded border border-border bg-background px-2 py-0.5 text-center text-xs"
              />
              <span className="text-xs text-muted-foreground">min</span>
            </div>
          </div>

          {/* Notes (collapsible) */}
          <NotesField
            notes={notes}
            onChange={(n) => onUpdate({ notes: n })}
          />
        </>
      )}
    </div>
  );
}

/* ── Notes field (own state for open/close) ── */

function NotesField({
  notes,
  onChange,
}: {
  notes: string;
  onChange: (n: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        {open ? "▲ Hide notes" : "▼ Add notes (optional)"}
      </button>
      {open && (
        <textarea
          value={notes}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Notes…"
          rows={2}
          className="mt-1 block w-full resize-none rounded border border-border bg-background px-2 py-1 text-xs"
        />
      )}
    </div>
  );
}
