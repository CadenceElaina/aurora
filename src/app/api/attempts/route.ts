import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { attempts, userProblemStates, problems, pendingSubmissions } from "@/db/schema";
import { eq, and, gte, lt } from "drizzle-orm";
import { checkRateLimit } from "@/lib/rate-limit";
import { rankQuality } from "@/lib/quality";
import {
  computeNewStability,
  computeInitialStability,
  computeNextReviewDate,
  MASTERY_THRESHOLD,
  type AttemptSignals,
  type SolvedIndependently,
  type SolutionQuality,
  type RewroteFromScratch,
} from "@/lib/srs";

const VALID_SOLVED = ["YES", "PARTIAL", "NO"] as const;
const VALID_QUALITY = ["OPTIMAL", "SUBOPTIMAL", "BRUTE_FORCE", "NONE"] as const;
const VALID_REWROTE = ["YES", "NO", "DID_NOT_ATTEMPT"] as const;

/**
 * GET /api/attempts?date=YYYY-MM-DD — list problem IDs with attempts on a given date.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dateParam = req.nextUrl.searchParams.get("date");
  if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return NextResponse.json({ error: "date param required (YYYY-MM-DD)" }, { status: 400 });
  }

  const dayStart = new Date(dateParam + "T00:00:00");
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const rows = await db
    .select({ problemId: attempts.problemId })
    .from(attempts)
    .where(
      and(
        eq(attempts.userId, session.user.id),
        gte(attempts.createdAt, dayStart),
        lt(attempts.createdAt, dayEnd),
      ),
    );

  return NextResponse.json(rows);
}

/**
 * CSRF protection: all mutations below require a valid NextAuth v5 session via auth().
 * NextAuth sets __Host-prefixed session cookies (HttpOnly, Secure, SameSite=Lax).
 * Browsers never attach __Host- cookies on cross-origin requests, so a valid session
 * implies same-origin. No separate CSRF token is needed — the session check IS the
 * CSRF check. The __Host- prefix additionally blocks subdomain cookie injection.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed } = checkRateLimit(`attempts:${session.user.id}`, 10, 60_000);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json();

  // Validate required fields
  const {
    problemId,
    solvedIndependently,
    solutionQuality,
    confidence,
  } = body;

  if (
    typeof problemId !== "number" ||
    !VALID_SOLVED.includes(solvedIndependently) ||
    !VALID_QUALITY.includes(solutionQuality) ||
    typeof confidence !== "number" || confidence < 1 || confidence > 5
  ) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // Length caps on free-text fields
  if (typeof body.code === "string" && body.code.length > 50_000) {
    return NextResponse.json({ error: "code exceeds 50,000 character limit" }, { status: 400 });
  }
  if (typeof body.notes === "string" && body.notes.length > 2_000) {
    return NextResponse.json({ error: "notes exceeds 2,000 character limit" }, { status: 400 });
  }

  // Complexity fields — no longer user-tracked, always store N/A
  const finalTimeComplexity = "N/A";
  const finalSpaceComplexity = "N/A";

  // Verify problem exists
  const problem = await db.select().from(problems).where(eq(problems.id, problemId)).limit(1);
  if (!problem[0]) {
    return NextResponse.json({ error: "Problem not found" }, { status: 404 });
  }

  // Optional: use a custom attempt date (e.g. from GitHub commit timestamp)
  let attemptDate: Date | null = null;
  if (body.attemptDate) {
    const parsed = new Date(body.attemptDate);
    if (!isNaN(parsed.getTime()) && parsed <= new Date()) {
      attemptDate = parsed;
    }
  }

  // Duplicate check: same user + problem + calendar day
  const skipDupeCheck = body.force === true;
  if (!skipDupeCheck) {
    const checkDay = attemptDate ?? new Date();
    const todayStart = new Date(checkDay);
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const existing = await db
      .select({ id: attempts.id, createdAt: attempts.createdAt })
      .from(attempts)
      .where(
        and(
          eq(attempts.userId, session.user.id),
          eq(attempts.problemId, problemId),
          gte(attempts.createdAt, todayStart),
          lt(attempts.createdAt, tomorrowStart),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        {
          error: "duplicate",
          message: `Already logged ${problem[0].title} today`,
          existingTime: existing[0].createdAt.toISOString(),
        },
        { status: 409 },
      );
    }
  }

  const rewrote: RewroteFromScratch | null = VALID_REWROTE.includes(body.rewroteFromScratch)
    ? body.rewroteFromScratch
    : null;

  // Insert attempt. The unique index on (user_id, problem_id, DATE(created_at)) means a
  // race between the SELECT duplicate-check above and this INSERT is still safe — the DB
  // will reject the second insert with a 23505 unique-violation, caught below.
  let attempt: { id: string };
  try {
    [attempt] = await db
      .insert(attempts)
      .values({
        userId: session.user.id,
        problemId,
        solvedIndependently,
        solutionQuality,
        userTimeComplexity: finalTimeComplexity,
        userSpaceComplexity: finalSpaceComplexity,
        timeComplexityCorrect: null,
        spaceComplexityCorrect: null,
        solveTimeMinutes: typeof body.solveTimeMinutes === "number" ? body.solveTimeMinutes : null,
        studyTimeMinutes: typeof body.studyTimeMinutes === "number" ? body.studyTimeMinutes : null,
        rewroteFromScratch: rewrote,
        confidence,
        code: typeof body.code === "string" ? body.code : null,
        notes: typeof body.notes === "string" ? body.notes : null,
        source: body.source === "github" ? "github" : body.source === "import" ? "import" : "manual",
        ...(attemptDate && { createdAt: attemptDate }),
      })
      .returning({ id: attempts.id });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json(
        { error: "duplicate", message: `Already logged ${problem[0].title} today` },
        { status: 409 },
      );
    }
    throw err;
  }

  // Auto-resolve any pending submissions for this problem —
  // whether the user came from the pending banner or the full form,
  // the pending's purpose is fulfilled once an attempt is logged.
  await db
    .update(pendingSubmissions)
    .set({ status: "confirmed", resolvedAt: new Date() })
    .where(
      and(
        eq(pendingSubmissions.userId, session.user.id),
        eq(pendingSubmissions.problemId, problemId),
        eq(pendingSubmissions.status, "pending"),
      ),
    );

  // Build signals for SRS algorithm
  // Casts are safe: VALID_SOLVED/VALID_QUALITY guards above narrow these to the same
  // literal unions that SolvedIndependently/SolutionQuality are defined from.
  const signals: AttemptSignals = {
    solvedIndependently: solvedIndependently as SolvedIndependently,
    solutionQuality: solutionQuality as SolutionQuality,
    rewroteFromScratch: rewrote,
    confidence,
    solveTimeMinutes: typeof body.solveTimeMinutes === "number" ? body.solveTimeMinutes : null,
    difficulty: problem[0].difficulty,
  };

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

  const now = attemptDate ?? new Date();

  // Failed or struggled attempts should come back quickly
  const isFailed = solvedIndependently === "NO";
  const isStruggled = solvedIndependently === "PARTIAL" && confidence <= 2;

  let oldStability: number;
  let newStability: number;
  let nextReview: Date;

  if (existing[0]) {
    oldStability = existing[0].stability;
    newStability = computeNewStability(existing[0].stability, signals);
    nextReview = isFailed
      ? new Date(now.getTime() + 24 * 60 * 60 * 1000) // tomorrow
      : isStruggled
        ? new Date(now.getTime() + 24 * 60 * 60 * 1000) // 1 day
        : computeNextReviewDate(newStability, now);

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
    oldStability = 0;
    const initialStability = computeInitialStability(signals);
    newStability = initialStability;
    nextReview = isFailed
      ? new Date(now.getTime() + 24 * 60 * 60 * 1000) // tomorrow
      : isStruggled
        ? new Date(now.getTime() + 24 * 60 * 60 * 1000)
        : computeNextReviewDate(initialStability, now);

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

  return NextResponse.json({
    id: attempt.id,
    srs: {
      oldStability: Math.round(oldStability * 10) / 10,
      newStability: Math.round(newStability * 10) / 10,
      nextReviewAt: nextReview.toISOString(),
      masteryPct: Math.min(100, Math.round((newStability / MASTERY_THRESHOLD) * 100)),
    },
  }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const attemptId = searchParams.get("id");
  if (!attemptId) {
    return NextResponse.json({ error: "Missing attempt id" }, { status: 400 });
  }

  // Verify the attempt belongs to the user
  const [attempt] = await db
    .select({ id: attempts.id, problemId: attempts.problemId, userId: attempts.userId })
    .from(attempts)
    .where(eq(attempts.id, attemptId))
    .limit(1);

  if (!attempt || attempt.userId !== session.user.id) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }

  // Delete the attempt
  await db.delete(attempts).where(eq(attempts.id, attemptId));

  // Find remaining attempts for this problem
  const remainingAttempts = await db
    .select()
    .from(attempts)
    .where(
      and(
        eq(attempts.userId, session.user.id),
        eq(attempts.problemId, attempt.problemId),
      ),
    )
    .orderBy(attempts.createdAt);

  if (remainingAttempts.length === 0) {
    // No more attempts — delete the user problem state
    await db
      .delete(userProblemStates)
      .where(
        and(
          eq(userProblemStates.userId, session.user.id),
          eq(userProblemStates.problemId, attempt.problemId),
        ),
      );
  } else {
    // Replay remaining attempts to rebuild state
    const problem = await db.select().from(problems).where(eq(problems.id, attempt.problemId)).limit(1);
    if (!problem[0]) {
      return NextResponse.json({ ok: true });
    }

    let stability = 0;
    let bestQuality: string | null = null;

    for (let i = 0; i < remainingAttempts.length; i++) {
      const a = remainingAttempts[i];
      const signals: AttemptSignals = {
        solvedIndependently: a.solvedIndependently as SolvedIndependently,
        solutionQuality: a.solutionQuality as SolutionQuality,
        rewroteFromScratch: a.rewroteFromScratch as RewroteFromScratch | null,
        confidence: a.confidence,
        solveTimeMinutes: a.solveTimeMinutes,
        difficulty: problem[0].difficulty,
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

    const lastAttempt = remainingAttempts[remainingAttempts.length - 1];
    const lastSignals: AttemptSignals = {
      solvedIndependently: lastAttempt.solvedIndependently as SolvedIndependently,
      solutionQuality: lastAttempt.solutionQuality as SolutionQuality,
      rewroteFromScratch: lastAttempt.rewroteFromScratch as RewroteFromScratch | null,
      confidence: lastAttempt.confidence,
      solveTimeMinutes: lastAttempt.solveTimeMinutes,
      difficulty: problem[0].difficulty,
    };

    const isFailed = lastAttempt.solvedIndependently === "NO";
    const isStruggled = lastAttempt.solvedIndependently === "PARTIAL" && lastAttempt.confidence <= 2;
    const lastDate = lastAttempt.createdAt;
    const nextReview = isFailed
      ? new Date(lastDate.getTime() + 24 * 60 * 60 * 1000) // tomorrow
      : isStruggled
        ? new Date(lastDate.getTime() + 24 * 60 * 60 * 1000)
        : computeNextReviewDate(stability, lastDate);

    await db
      .update(userProblemStates)
      .set({
        stability,
        lastReviewedAt: lastDate,
        nextReviewAt: nextReview,
        totalAttempts: remainingAttempts.length,
        bestSolutionQuality: bestQuality as typeof userProblemStates.$inferInsert.bestSolutionQuality,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(userProblemStates.userId, session.user.id),
          eq(userProblemStates.problemId, attempt.problemId),
        ),
      );
  }

  return NextResponse.json({ ok: true });
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "23505"
  );
}

