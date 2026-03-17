import { db } from "@/db";
import { problems, userProblemStates } from "@/db/schema";
import { auth } from "@/auth";
import { eq, asc, sql } from "drizzle-orm";
import Link from "next/link";
import { DifficultyBadge } from "@/components/difficulty-badge";

export const dynamic = "force-dynamic";
export const metadata = { title: "Review — LeetRepeat" };

export default async function ReviewPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Review Queue</h1>
        <p className="text-sm text-muted-foreground">Sign in to see your review queue.</p>
      </div>
    );
  }

  const now = new Date();

  const queue = await db
    .select({
      stateId: userProblemStates.id,
      problemId: userProblemStates.problemId,
      nextReviewAt: userProblemStates.nextReviewAt,
      stability: userProblemStates.stability,
      totalAttempts: userProblemStates.totalAttempts,
      bestQuality: userProblemStates.bestSolutionQuality,
      title: problems.title,
      leetcodeNumber: problems.leetcodeNumber,
      difficulty: problems.difficulty,
      category: problems.category,
    })
    .from(userProblemStates)
    .innerJoin(problems, eq(userProblemStates.problemId, problems.id))
    .where(
      sql`${userProblemStates.userId} = ${session.user.id} AND ${userProblemStates.nextReviewAt} <= ${now}`,
    )
    .orderBy(asc(userProblemStates.nextReviewAt));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Review Queue</h1>
        <span className="text-sm text-muted-foreground">{queue.length} due</span>
      </div>

      {queue.length === 0 ? (
        <div className="rounded-lg border border-border bg-muted p-8 text-center">
          <p className="text-muted-foreground">All caught up! Nothing to review right now.</p>
          <Link
            href="/problems"
            className="mt-4 inline-flex h-9 items-center rounded-md bg-accent px-4 text-sm text-accent-foreground transition-colors duration-150 hover:opacity-90"
          >
            Browse Problems
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {queue.map((item) => (
            <div
              key={item.stateId}
              className="flex items-center justify-between rounded-lg border border-border bg-muted p-4 transition-colors duration-150 hover:border-accent/50"
            >
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground w-10">{item.leetcodeNumber}</span>
                <div>
                  <Link href={`/problems/${item.problemId}`} className="text-sm font-medium text-foreground hover:text-accent">
                    {item.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.category}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <DifficultyBadge difficulty={item.difficulty} />
                <span className="text-xs text-muted-foreground">{item.totalAttempts} attempt{item.totalAttempts !== 1 ? "s" : ""}</span>
                <Link
                  href={`/problems/${item.problemId}/attempt`}
                  className="inline-flex h-9 items-center rounded-md bg-accent px-4 text-sm text-accent-foreground transition-colors duration-150 hover:opacity-90"
                >
                  Review
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
