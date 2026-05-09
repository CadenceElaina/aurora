import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { userProblemStates, problems } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const problemId = Number(req.nextUrl.searchParams.get("problemId"));
  if (!problemId || isNaN(problemId)) {
    return NextResponse.json({ error: "Missing problemId" }, { status: 400 });
  }

  const rows = await db
    .select({ notes: userProblemStates.notes })
    .from(userProblemStates)
    .where(
      and(
        eq(userProblemStates.userId, session.user.id),
        eq(userProblemStates.problemId, problemId),
      ),
    )
    .limit(1);

  return NextResponse.json({ notes: rows[0]?.notes ?? "" });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { problemId, notes } = body;

  if (typeof problemId !== "number" || typeof notes !== "string") {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  if (notes.length > 10000) {
    return NextResponse.json({ error: "Note too long (max 10,000 characters)" }, { status: 400 });
  }

  // Verify problem exists
  const problem = await db
    .select({ id: problems.id })
    .from(problems)
    .where(eq(problems.id, problemId))
    .limit(1);
  if (!problem[0]) {
    return NextResponse.json({ error: "Problem not found" }, { status: 404 });
  }

  // Upsert: create state if it doesn't exist, otherwise update notes
  const existing = await db
    .select({ id: userProblemStates.id })
    .from(userProblemStates)
    .where(
      and(
        eq(userProblemStates.userId, session.user.id),
        eq(userProblemStates.problemId, problemId),
      ),
    )
    .limit(1);

  if (existing[0]) {
    await db
      .update(userProblemStates)
      .set({ notes, updatedAt: new Date() })
      .where(eq(userProblemStates.id, existing[0].id));
  } else {
    await db.insert(userProblemStates).values({
      userId: session.user.id,
      problemId,
      notes,
    });
  }

  return NextResponse.json({ ok: true });
}
