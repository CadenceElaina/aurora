import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { pendingSubmissions, problems } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * GET  — list all pending submissions for the authenticated user.
 * POST — confirm or dismiss a pending submission.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pending = await db
    .select({
      id: pendingSubmissions.id,
      problemId: pendingSubmissions.problemId,
      commitSha: pendingSubmissions.commitSha,
      code: pendingSubmissions.code,
      isReview: pendingSubmissions.isReview,
      status: pendingSubmissions.status,
      detectedAt: pendingSubmissions.detectedAt,
      problemTitle: problems.title,
      leetcodeNumber: problems.leetcodeNumber,
      difficulty: problems.difficulty,
      category: problems.category,
      optimalTimeComplexity: problems.optimalTimeComplexity,
      optimalSpaceComplexity: problems.optimalSpaceComplexity,
    })
    .from(pendingSubmissions)
    .innerJoin(problems, eq(pendingSubmissions.problemId, problems.id))
    .where(
      and(
        eq(pendingSubmissions.userId, session.user.id),
        eq(pendingSubmissions.status, "pending"),
      ),
    )
    .orderBy(pendingSubmissions.detectedAt);

  return NextResponse.json(pending);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id, action } = body;

  if (!id || !["dismiss", "confirm"].includes(action)) {
    return NextResponse.json({ error: "Invalid input — id and action ('dismiss'|'confirm') required" }, { status: 400 });
  }

  // Verify ownership
  const [pending] = await db
    .select()
    .from(pendingSubmissions)
    .where(
      and(
        eq(pendingSubmissions.id, id),
        eq(pendingSubmissions.userId, session.user.id),
        eq(pendingSubmissions.status, "pending"),
      ),
    )
    .limit(1);

  if (!pending) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Dismiss — just mark it
  await db
    .update(pendingSubmissions)
    .set({ status: action === "confirm" ? "confirmed" : "dismissed", resolvedAt: new Date() })
    .where(eq(pendingSubmissions.id, id));

  return NextResponse.json({ ok: true });
}
