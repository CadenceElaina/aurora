import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { problems, userProblemStates, attempts } from "@/db/schema";
import { eq, and, gte, lt } from "drizzle-orm";
import { ImportClient } from "./import-client";

export default async function ImportPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const [allProblems, states, todayAttempts] = await Promise.all([
    db
      .select({
        id: problems.id,
        title: problems.title,
        leetcodeNumber: problems.leetcodeNumber,
        difficulty: problems.difficulty,
        category: problems.category,
        optimalTimeComplexity: problems.optimalTimeComplexity,
        optimalSpaceComplexity: problems.optimalSpaceComplexity,
      })
      .from(problems),
    db
      .select({ problemId: userProblemStates.problemId })
      .from(userProblemStates)
      .where(eq(userProblemStates.userId, session.user.id)),
    db
      .select({ problemId: attempts.problemId })
      .from(attempts)
      .where(
        and(
          eq(attempts.userId, session.user.id),
          gte(attempts.createdAt, todayStart),
          lt(attempts.createdAt, tomorrowStart),
        ),
      ),
  ]);

  const attemptedIds = states.map((s) => s.problemId);
  const todayAttemptedIds = todayAttempts.map((a) => a.problemId);

  return <ImportClient allProblems={allProblems} attemptedIds={attemptedIds} todayAttemptedIds={todayAttemptedIds} />;
}
