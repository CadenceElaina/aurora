import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { attempts, userProblemStates, problems } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const VALID_SOLVED = ["YES", "PARTIAL", "NO"] as const;
const VALID_QUALITY = ["OPTIMAL", "SUBOPTIMAL", "BRUTE_FORCE", "NONE"] as const;
const VALID_REWROTE = ["YES", "NO", "DID_NOT_ATTEMPT"] as const;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  // Validate required fields
  const {
    problemId,
    solvedIndependently,
    solutionQuality,
    userTimeComplexity,
    userSpaceComplexity,
    confidence,
  } = body;

  if (
    typeof problemId !== "number" ||
    !VALID_SOLVED.includes(solvedIndependently) ||
    !VALID_QUALITY.includes(solutionQuality) ||
    typeof userTimeComplexity !== "string" || !userTimeComplexity.trim() ||
    typeof userSpaceComplexity !== "string" || !userSpaceComplexity.trim() ||
    typeof confidence !== "number" || confidence < 1 || confidence > 5
  ) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // Verify problem exists
  const problem = await db.select().from(problems).where(eq(problems.id, problemId)).limit(1);
  if (!problem[0]) {
    return NextResponse.json({ error: "Problem not found" }, { status: 404 });
  }

  // Compare complexities
  const optTime = problem[0].optimalTimeComplexity;
  const optSpace = problem[0].optimalSpaceComplexity;
  const timeCorrect = optTime ? normalize(userTimeComplexity) === normalize(optTime) : null;
  const spaceCorrect = optSpace ? normalize(userSpaceComplexity) === normalize(optSpace) : null;

  // Insert attempt
  const [attempt] = await db
    .insert(attempts)
    .values({
      userId: session.user.id,
      problemId,
      solvedIndependently,
      solutionQuality,
      userTimeComplexity: userTimeComplexity.trim(),
      userSpaceComplexity: userSpaceComplexity.trim(),
      timeComplexityCorrect: timeCorrect,
      spaceComplexityCorrect: spaceCorrect,
      solveTimeMinutes: typeof body.solveTimeMinutes === "number" ? body.solveTimeMinutes : null,
      studyTimeMinutes: typeof body.studyTimeMinutes === "number" ? body.studyTimeMinutes : null,
      rewroteFromScratch: VALID_REWROTE.includes(body.rewroteFromScratch) ? body.rewroteFromScratch : null,
      confidence,
      code: typeof body.code === "string" ? body.code : null,
      notes: typeof body.notes === "string" ? body.notes : null,
    })
    .returning({ id: attempts.id });

  // Upsert user problem state
  const existing = await db
    .select()
    .from(userProblemStates)
    .where(
      and(
        eq(userProblemStates.userId, session.user.id),
        eq(userProblemStates.problemId, problemId),
      ),
    )
    .limit(1);

  const now = new Date();
  // Simple stability calculation: increase on good attempts, decrease on poor
  const qualityScore = { OPTIMAL: 1.0, SUBOPTIMAL: 0.6, BRUTE_FORCE: 0.3, NONE: 0.1 } as const;
  const grade = qualityScore[solutionQuality as keyof typeof qualityScore];

  if (existing[0]) {
    const oldStability = existing[0].stability;
    const newStability = Math.min(365, oldStability * (1 + grade));
    const nextReview = new Date(now.getTime() + newStability * 24 * 60 * 60 * 1000);

    await db
      .update(userProblemStates)
      .set({
        stability: newStability,
        lastReviewedAt: now,
        nextReviewAt: nextReview,
        totalAttempts: existing[0].totalAttempts + 1,
        bestSolutionQuality:
          rankQuality(solutionQuality) > rankQuality(existing[0].bestSolutionQuality)
            ? solutionQuality
            : existing[0].bestSolutionQuality,
        updatedAt: now,
      })
      .where(eq(userProblemStates.id, existing[0].id));
  } else {
    const initialStability = 0.5 * (1 + grade);
    const nextReview = new Date(now.getTime() + initialStability * 24 * 60 * 60 * 1000);

    await db.insert(userProblemStates).values({
      userId: session.user.id,
      problemId,
      stability: initialStability,
      lastReviewedAt: now,
      nextReviewAt: nextReview,
      totalAttempts: 1,
      bestSolutionQuality: solutionQuality,
    });
  }

  return NextResponse.json({ id: attempt.id }, { status: 201 });
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "");
}

function rankQuality(q: string | null): number {
  const ranks: Record<string, number> = { OPTIMAL: 4, SUBOPTIMAL: 3, BRUTE_FORCE: 2, NONE: 1 };
  return ranks[q ?? ""] ?? 0;
}
