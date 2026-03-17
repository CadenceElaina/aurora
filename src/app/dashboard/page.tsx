import { db } from "@/db";
import { problems, userProblemStates, attempts } from "@/db/schema";
import { auth } from "@/auth";
import { eq, lte, asc, count, sql } from "drizzle-orm";
import Link from "next/link";
import { DifficultyBadge } from "@/components/difficulty-badge";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard — LeetRepeat" };

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="rounded-lg border border-border bg-muted p-8 text-center">
          <p className="text-muted-foreground">Sign in to track your progress.</p>
          <Link
            href="/api/auth/signin"
            className="mt-4 inline-flex h-9 items-center rounded-md bg-accent px-4 text-sm text-accent-foreground transition-colors duration-150 hover:opacity-90"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const userId = session.user.id;
  const now = new Date();

  // Stats
  const [totalProblems] = await db.select({ value: count() }).from(problems);
  const [attemptedCount] = await db
    .select({ value: count() })
    .from(userProblemStates)
    .where(eq(userProblemStates.userId, userId));
  const [totalAttempts] = await db
    .select({ value: count() })
    .from(attempts)
    .where(eq(attempts.userId, userId));

  // Due for review
  const dueProblems = await db
    .select({
      stateId: userProblemStates.id,
      problemId: userProblemStates.problemId,
      nextReviewAt: userProblemStates.nextReviewAt,
      stability: userProblemStates.stability,
      totalAttempts: userProblemStates.totalAttempts,
      title: problems.title,
      leetcodeNumber: problems.leetcodeNumber,
      difficulty: problems.difficulty,
      category: problems.category,
    })
    .from(userProblemStates)
    .innerJoin(problems, eq(userProblemStates.problemId, problems.id))
    .where(
      sql`${userProblemStates.userId} = ${userId} AND ${userProblemStates.nextReviewAt} <= ${now}`,
    )
    .orderBy(asc(userProblemStates.nextReviewAt))
    .limit(20);

  const stats = [
    { label: "Total Problems", value: totalProblems.value },
    { label: "Attempted", value: attemptedCount.value },
    { label: "Total Attempts", value: totalAttempts.value },
    { label: "Due for Review", value: dueProblems.length },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-border bg-muted p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Due for review */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Due for Review</h2>
        {dueProblems.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing due right now. Go to{" "}
            <Link href="/problems" className="text-accent hover:underline">Problems</Link>{" "}
            and log your first attempt!
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Difficulty</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Attempts</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody>
                {dueProblems.map((p) => (
                  <tr key={p.stateId} className="border-b border-border transition-colors duration-150 hover:bg-muted">
                    <td className="px-4 py-3 text-muted-foreground">{p.leetcodeNumber}</td>
                    <td className="px-4 py-3">
                      <Link href={`/problems/${p.problemId}`} className="text-accent hover:underline">
                        {p.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3"><DifficultyBadge difficulty={p.difficulty} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{p.totalAttempts}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/problems/${p.problemId}/attempt`}
                        className="text-accent text-xs hover:underline"
                      >
                        Review →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
