"use client";

import Link from "next/link";
import type { InsightsData } from "./demo-data";

const TREND_LABEL: Record<string, string> = {
  improving:        "Improving",
  stable:           "Stable",
  declining:        "Declining",
  insufficient_data: "Not enough data",
};

const TREND_COLOR: Record<string, string> = {
  improving:        "text-green-400",
  stable:           "text-muted-foreground",
  declining:        "text-amber-400",
  insufficient_data: "text-muted-foreground",
};

const QUALITY_LABEL: Record<string, string> = {
  OPTIMAL:     "Optimal",
  SUBOPTIMAL:  "Suboptimal",
  BRUTE_FORCE: "Brute Force",
  NONE:        "No solution",
};

const DIFF_COLOR: Record<string, string> = {
  Easy:   "text-green-400",
  Medium: "text-amber-400",
  Hard:   "text-red-400",
};

function pct(n: number) {
  return `${(n * 100).toFixed(0)}%`;
}

function StatCard({
  label,
  value,
  sub,
  subColor,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  subColor?: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      {sub && <p className={`mt-1 text-xs ${subColor ?? "text-muted-foreground"}`}>{sub}</p>}
    </div>
  );
}

export function InsightsClient({ data, isDemo }: { data: InsightsData; isDemo: boolean }) {
  const { velocity, compliance, metacognition, stuckProblems, categoryStats, totalAttempts, totalProblems } = data;

  const hasData = totalAttempts > 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Insights</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasData
              ? `Based on ${totalAttempts.toLocaleString()} attempts across ${totalProblems} problems`
              : "Start logging attempts to see your analytics"}
          </p>
        </div>
        {isDemo && (
          <span className="rounded-md border border-accent/40 bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
            DEMO
          </span>
        )}
      </div>

      {!hasData && !isDemo ? (
        <div className="rounded-lg border border-border/60 bg-muted/20 px-8 py-16 text-center">
          <p className="text-sm font-medium text-foreground">No attempts logged yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Head to the{" "}
            <Link href="/dashboard" className="text-accent hover:underline">
              Dashboard
            </Link>{" "}
            to log your first problem.
          </p>
        </div>
      ) : (
        <>
          {/* Metric cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {/* Velocity */}
            <StatCard
              label="Learning Velocity"
              value={
                velocity.newProblemsPerDay > 0
                  ? `${velocity.newProblemsPerDay.toFixed(1)}/day`
                  : "0/day"
              }
              sub={TREND_LABEL[velocity.trend]}
              subColor={TREND_COLOR[velocity.trend]}
            />

            {/* Review compliance */}
            <StatCard
              label="Review Compliance"
              value={pct(compliance.complianceRate)}
              sub={
                compliance.currentlyOverdue > 0
                  ? `${compliance.currentlyOverdue} overdue`
                  : "All reviews on track"
              }
              subColor={compliance.currentlyOverdue > 0 ? "text-amber-400" : "text-green-400"}
            />

            {/* Metacognition */}
            <StatCard
              label="Overconfidence Rate"
              value={pct(metacognition.overconfidenceRate)}
              sub={
                metacognition.underconfidenceRate > 0
                  ? `${pct(metacognition.underconfidenceRate)} underconfident`
                  : undefined
              }
            />

            {/* Stuck problems */}
            <StatCard
              label="Stuck Problems"
              value={stuckProblems.length}
              sub={
                stuckProblems.length > 0
                  ? "4+ attempts, no real progress"
                  : "None — looking good"
              }
              subColor={stuckProblems.length > 0 ? "text-amber-400" : "text-green-400"}
            />
          </div>

          {/* Stuck problems detail */}
          {stuckProblems.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-foreground">Stuck Problems</h2>
              <div className="overflow-hidden rounded-lg border border-border/60">
                <table className="w-full text-sm">
                  <thead className="border-b border-border/60 bg-muted/30">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Problem</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Difficulty</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Attempts</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Best Result</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Days Stuck</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {stuckProblems.map((p) => (
                      <tr key={p.problemId} className="hover:bg-muted/20">
                        <td className="px-4 py-2.5 font-medium text-foreground">{p.title}</td>
                        <td className={`px-4 py-2.5 ${DIFF_COLOR[p.difficulty]}`}>{p.difficulty}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{p.totalAttempts}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          {QUALITY_LABEL[p.bestQuality ?? "NONE"]}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                          {p.daysSinceFirstAttempt}d
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                More SRS repetition won&apos;t fix these — try a different explanation, solution walkthrough, or ask for help.
              </p>
            </section>
          )}

          {/* Category breakdown */}
          {categoryStats.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-foreground">Category Breakdown</h2>
              <p className="mb-3 text-xs text-muted-foreground">Sorted by retention — weakest categories first.</p>
              <div className="overflow-hidden rounded-lg border border-border/60">
                <table className="w-full text-sm">
                  <thead className="border-b border-border/60 bg-muted/30">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Category</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Problems</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Avg Retention</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Stuck</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Complexity Acc.</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Avg to Optimal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {categoryStats.map((c) => (
                      <tr key={c.category} className="hover:bg-muted/20">
                        <td className="px-4 py-2.5 font-medium text-foreground">{c.category}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                          {c.attemptedProblems}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          <RetentionBadge r={c.avgR} />
                        </td>
                        <td className={`px-4 py-2.5 text-right tabular-nums ${c.stuckCount > 0 ? "text-amber-400" : "text-muted-foreground"}`}>
                          {c.stuckCount}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                          {pct(c.complexityAccuracyRate)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                          {c.avgAttemptsToOptimal != null
                            ? c.avgAttemptsToOptimal.toFixed(1)
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Metacognition detail */}
          {metacognition.totalAttempts >= 10 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-foreground">Metacognition</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">Overconfidence</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {pct(metacognition.overconfidenceRate)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {metacognition.overconfidentAttempts} attempts: rated confidence ≥4 but performed poorly
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">Underconfidence</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {pct(metacognition.underconfidenceRate)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {metacognition.underconfidentAttempts} attempts: rated confidence ≤2 but performed well
                  </p>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function RetentionBadge({ r }: { r: number }) {
  const color =
    r >= 0.75 ? "text-green-400"
    : r >= 0.55 ? "text-amber-400"
    : "text-red-400";
  return <span className={color}>{pct(r)}</span>;
}
