import { Suspense } from "react";
import { auth } from "@/auth";
import { db } from "@/db";
import { attempts, userProblemStates, problems } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import {
  computeLearningVelocity,
  detectStuckProblems,
  computeMetacognitionGap,
  computeReviewCompliance,
  computeCategoryStats,
  type AttemptRecord,
  type StateRecord,
} from "@/lib/analytics";
import { InsightsClient } from "./insights-client";
import { DEMO_INSIGHTS_DATA } from "./demo-data";
import type { StuckProblemDisplay } from "./demo-data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Insights — Aurora" };

export default async function InsightsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <Suspense>
        <InsightsClient data={DEMO_INSIGHTS_DATA} isDemo />
      </Suspense>
    );
  }

  const userId = session.user.id;
  const now = new Date();

  const [rawAttempts, rawStates, allProblems] = await Promise.all([
    db
      .select({
        problemId:              attempts.problemId,
        category:               problems.category,
        difficulty:             problems.difficulty,
        outcome:                attempts.solvedIndependently,
        quality:                attempts.solutionQuality,
        confidence:             attempts.confidence,
        solveTimeMinutes:       attempts.solveTimeMinutes,
        rewroteFromScratch:     attempts.rewroteFromScratch,
        timeComplexityCorrect:  attempts.timeComplexityCorrect,
        spaceComplexityCorrect: attempts.spaceComplexityCorrect,
        createdAt:              attempts.createdAt,
      })
      .from(attempts)
      .innerJoin(problems, eq(attempts.problemId, problems.id))
      .where(eq(attempts.userId, userId))
      .orderBy(asc(attempts.createdAt)),
    db
      .select({
        problemId:           userProblemStates.problemId,
        stability:           userProblemStates.stability,
        lastReviewedAt:      userProblemStates.lastReviewedAt,
        nextReviewAt:        userProblemStates.nextReviewAt,
        totalAttempts:       userProblemStates.totalAttempts,
        bestSolutionQuality: userProblemStates.bestSolutionQuality,
      })
      .from(userProblemStates)
      .where(eq(userProblemStates.userId, userId)),
    db.select({ id: problems.id, title: problems.title, difficulty: problems.difficulty }).from(problems),
  ]);

  const attemptRecords: AttemptRecord[] = rawAttempts.map((a) => ({
    problemId:              a.problemId,
    category:               a.category,
    difficulty:             a.difficulty,
    outcome:                a.outcome,
    quality:                a.quality,
    confidence:             a.confidence,
    solveTimeMinutes:       a.solveTimeMinutes,
    rewroteFromScratch:     a.rewroteFromScratch,
    timeComplexityCorrect:  a.timeComplexityCorrect,
    spaceComplexityCorrect: a.spaceComplexityCorrect,
    createdAt:              a.createdAt,
  }));

  const stateRecords: StateRecord[] = rawStates.map((s) => ({
    problemId:           s.problemId,
    stability:           s.stability,
    lastReviewedAt:      s.lastReviewedAt,
    nextReviewAt:        s.nextReviewAt,
    totalAttempts:       s.totalAttempts,
    bestSolutionQuality: s.bestSolutionQuality,
  }));

  const problemMap = new Map(allProblems.map((p) => [p.id, p]));

  const velocity    = computeLearningVelocity(attemptRecords, 14, now);
  const compliance  = computeReviewCompliance(stateRecords, 14, now);
  const metacog     = computeMetacognitionGap(attemptRecords);
  const catStats    = computeCategoryStats(attemptRecords, stateRecords, now);
  const rawStuck    = detectStuckProblems(stateRecords, attemptRecords, 4, now);

  const stuckProblems: StuckProblemDisplay[] = rawStuck.map((s) => {
    const p = problemMap.get(s.problemId);
    return {
      problemId:              s.problemId,
      title:                  p?.title ?? `Problem ${s.problemId}`,
      difficulty:             (p?.difficulty ?? "Medium") as "Easy" | "Medium" | "Hard",
      totalAttempts:          s.totalAttempts,
      bestQuality:            s.bestQuality,
      daysSinceFirstAttempt:  s.daysSinceFirstAttempt,
    };
  });

  return (
    <Suspense>
      <InsightsClient
        data={{
          velocity,
          compliance,
          metacognition: metacog,
          stuckProblems,
          categoryStats: catStats.sort((a, b) => a.avgR - b.avgR),
          totalAttempts:  attemptRecords.length,
          totalProblems:  stateRecords.length,
        }}
        isDemo={false}
      />
    </Suspense>
  );
}
