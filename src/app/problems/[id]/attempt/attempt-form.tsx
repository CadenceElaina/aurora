"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const solvedOptions = [
  { value: "YES", label: "Yes — solved independently" },
  { value: "PARTIAL", label: "Partial — needed a hint" },
  { value: "NO", label: "No — had to look at solution" },
];

const qualityOptions = [
  { value: "OPTIMAL", label: "Optimal" },
  { value: "SUBOPTIMAL", label: "Suboptimal" },
  { value: "BRUTE_FORCE", label: "Brute Force" },
  { value: "NONE", label: "Could not solve" },
];

const rewroteOptions = [
  { value: "YES", label: "Yes" },
  { value: "NO", label: "No" },
  { value: "DID_NOT_ATTEMPT", label: "Did not attempt" },
];

type Props = {
  problemId: number;
  optimalTimeComplexity: string | null;
  optimalSpaceComplexity: string | null;
};

export function AttemptForm({ problemId, optimalTimeComplexity, optimalSpaceComplexity }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const body = {
      problemId,
      solvedIndependently: form.get("solvedIndependently"),
      solutionQuality: form.get("solutionQuality"),
      userTimeComplexity: form.get("userTimeComplexity"),
      userSpaceComplexity: form.get("userSpaceComplexity"),
      solveTimeMinutes: form.get("solveTimeMinutes") ? Number(form.get("solveTimeMinutes")) : null,
      studyTimeMinutes: form.get("studyTimeMinutes") ? Number(form.get("studyTimeMinutes")) : null,
      rewroteFromScratch: form.get("rewroteFromScratch"),
      confidence: Number(form.get("confidence")),
      code: form.get("code") || null,
      notes: form.get("notes") || null,
    };

    const res = await fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Something went wrong");
      setSubmitting(false);
      return;
    }

    router.push(`/problems/${problemId}`);
    router.refresh();
  }

  const inputClass = "h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";
  const selectClass = inputClass;
  const labelClass = "block text-xs font-medium text-muted-foreground mb-1";

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      {/* Solved independently */}
      <fieldset className="space-y-3">
        <legend className="text-lg font-semibold">How did it go?</legend>
        <div>
          <label className={labelClass}>Solved Independently</label>
          <select name="solvedIndependently" required className={selectClass}>
            {solvedOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Solution Quality</label>
          <select name="solutionQuality" required className={selectClass}>
            {qualityOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </fieldset>

      {/* Complexity */}
      <fieldset className="space-y-3">
        <legend className="text-lg font-semibold">Complexity</legend>
        <p className="text-xs text-muted-foreground">
          Optimal: Time {optimalTimeComplexity ?? "?"} · Space {optimalSpaceComplexity ?? "?"}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Your Time Complexity</label>
            <input name="userTimeComplexity" required placeholder="e.g. O(n)" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Your Space Complexity</label>
            <input name="userSpaceComplexity" required placeholder="e.g. O(1)" className={inputClass} />
          </div>
        </div>
      </fieldset>

      {/* Timing */}
      <fieldset className="space-y-3">
        <legend className="text-lg font-semibold">Timing</legend>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Solve Time (minutes)</label>
            <input name="solveTimeMinutes" type="number" min={0} placeholder="—" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Study Time (minutes)</label>
            <input name="studyTimeMinutes" type="number" min={0} placeholder="—" className={inputClass} />
          </div>
        </div>
      </fieldset>

      {/* Rewrote + Confidence */}
      <fieldset className="space-y-3">
        <legend className="text-lg font-semibold">Reflection</legend>
        <div>
          <label className={labelClass}>Rewrote from Scratch?</label>
          <select name="rewroteFromScratch" className={selectClass} defaultValue="DID_NOT_ATTEMPT">
            {rewroteOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Confidence (1–5)</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} className="flex items-center gap-1 text-sm">
                <input type="radio" name="confidence" value={n} required className="h-4 w-4" defaultChecked={n === 3} />
                {n}
              </label>
            ))}
          </div>
        </div>
      </fieldset>

      {/* Code + Notes */}
      <fieldset className="space-y-3">
        <legend className="text-lg font-semibold">Code &amp; Notes</legend>
        <div>
          <label className={labelClass}>Code (Python)</label>
          <textarea
            name="code"
            rows={8}
            placeholder="Paste your solution here…"
            className="w-full rounded-md border border-border bg-background p-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          />
        </div>
        <div>
          <label className={labelClass}>Notes</label>
          <textarea
            name="notes"
            rows={3}
            placeholder="What did you learn? What tripped you up?"
            className="w-full rounded-md border border-border bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          />
        </div>
      </fieldset>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex h-9 items-center rounded-md bg-accent px-4 text-sm text-accent-foreground transition-colors duration-150 hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "Saving…" : "Save Attempt"}
      </button>
    </form>
  );
}
