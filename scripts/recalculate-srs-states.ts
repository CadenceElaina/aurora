/**
 * One-time migration: replay all attempt histories using the updated SRS formula.
 *
 * Run after changing computeInitialStability (INITIAL_STABILITY_BASE 0.5 → 2.0)
 * or any BASE_MULTIPLIERS to bring existing user_problem_state rows into sync.
 *
 *   npx tsx scripts/recalculate-srs-states.ts
 *
 * Safe to re-run — fully idempotent (rewrites state from canonical attempt history).
 * Does NOT modify the attempts table.
 */

import { config } from "dotenv";
config({ path: ".env.local" });
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and } from "drizzle-orm";
import { attempts, userProblemStates, problems } from "../src/db/schema";
import {
  computeInitialStability,
  computeNewStability,
  computeNextReviewDate,
  type AttemptSignals,
  type SolvedIndependently,
  type SolutionQuality,
  type RewroteFromScratch,
} from "../src/lib/srs";
import { rankQuality } from "../src/lib/quality";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

async function main() {
  console.log("Fetching all attempt records...");

  // Get every attempt, joined with problem difficulty
  const allAttempts = await db
    .select({
      id: attempts.id,
      userId: attempts.userId,
      problemId: attempts.problemId,
      solvedIndependently: attempts.solvedIndependently,
      solutionQuality: attempts.solutionQuality,
      rewroteFromScratch: attempts.rewroteFromScratch,
      confidence: attempts.confidence,
      solveTimeMinutes: attempts.solveTimeMinutes,
      createdAt: attempts.createdAt,
      difficulty: problems.difficulty,
    })
    .from(attempts)
    .innerJoin(problems, eq(attempts.problemId, problems.id))
    .orderBy(attempts.userId, attempts.problemId, attempts.createdAt);

  // Group by (userId, problemId)
  const grouped = new Map<string, typeof allAttempts>();
  for (const a of allAttempts) {
    const key = `${a.userId}::${a.problemId}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(a);
  }

  console.log(`Found ${grouped.size} user-problem pairs across ${allAttempts.length} attempts.`);

  let updated = 0;
  let skipped = 0;

  for (const [key, history] of grouped) {
    const [userId, problemIdStr] = key.split("::");
    const problemId = parseInt(problemIdStr, 10);

    let stability = 0;
    let bestQuality: string | null = null;

    for (let i = 0; i < history.length; i++) {
      const a = history[i];
      const signals: AttemptSignals = {
        solvedIndependently: a.solvedIndependently as SolvedIndependently,
        solutionQuality: a.solutionQuality as SolutionQuality,
        rewroteFromScratch: a.rewroteFromScratch as RewroteFromScratch | null,
        confidence: a.confidence,
        solveTimeMinutes: a.solveTimeMinutes,
        difficulty: a.difficulty,
      };

      if (i === 0) {
        stability = computeInitialStability(signals);
      } else {
        stability = computeNewStability(stability, signals);
      }

      if (rankQuality(a.solutionQuality) > rankQuality(bestQuality)) {
        bestQuality = a.solutionQuality;
      }
    }

    const last = history[history.length - 1];
    const isFailed = last.solvedIndependently === "NO";
    const isStruggled = last.solvedIndependently === "PARTIAL" && last.confidence <= 2;
    const lastDate = last.createdAt;

    const nextReviewAt = isFailed || isStruggled
      ? new Date(lastDate.getTime() + 24 * 60 * 60 * 1000)
      : computeNextReviewDate(stability, lastDate);

    const existing = await db
      .select({ id: userProblemStates.id })
      .from(userProblemStates)
      .where(and(eq(userProblemStates.userId, userId), eq(userProblemStates.problemId, problemId)))
      .limit(1);

    if (existing.length === 0) {
      // State row is missing — shouldn't normally happen, but create it
      await db.insert(userProblemStates).values({
        userId,
        problemId,
        stability,
        lastReviewedAt: lastDate,
        nextReviewAt,
        totalAttempts: history.length,
        bestSolutionQuality: bestQuality as typeof userProblemStates.$inferInsert.bestSolutionQuality,
      });
      console.log(`  Created missing state for user=${userId.slice(0, 8)} problem=${problemId}`);
      updated++;
    } else {
      await db
        .update(userProblemStates)
        .set({
          stability,
          lastReviewedAt: lastDate,
          nextReviewAt,
          totalAttempts: history.length,
          bestSolutionQuality: bestQuality as typeof userProblemStates.$inferInsert.bestSolutionQuality,
          updatedAt: new Date(),
        })
        .where(eq(userProblemStates.id, existing[0].id));
      updated++;
    }
  }

  console.log(`\nDone. Updated ${updated} states, skipped ${skipped}.`);
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
