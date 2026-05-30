import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { dailySessions } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Daily session state (T-030). Source of truth for cross-day session integrity:
 * a per-user, per-day plan (planned problem IDs = the stable target) plus the
 * acted-on ID sets and a completion flag.
 *
 * - GET    ?date=YYYY-MM-DD  → today's row (or null)
 * - POST   { date, plannedReviewIds, plannedNewIds } → create the day's plan if
 *           absent (no-op if it already exists — never overwrites a started day)
 * - PATCH  { date, action, problemId? } → record an action / completion
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_IDS = 50; // generous cap on a single day's plan; bounds payload size

function isIdArray(v: unknown): v is number[] {
  return (
    Array.isArray(v) &&
    v.length <= MAX_IDS &&
    v.every((n) => typeof n === "number" && Number.isInteger(n))
  );
}

function dedupe(ids: number[]): number[] {
  return [...new Set(ids)];
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const date = req.nextUrl.searchParams.get("date");
  if (!date || !DATE_RE.test(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const [row] = await db
    .select()
    .from(dailySessions)
    .where(and(eq(dailySessions.userId, session.user.id), eq(dailySessions.date, date)))
    .limit(1);

  return NextResponse.json({ session: row ?? null });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { date, plannedReviewIds, plannedNewIds } = body;

  if (typeof date !== "string" || !DATE_RE.test(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  if (!isIdArray(plannedReviewIds) || !isIdArray(plannedNewIds)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  // Create the day's plan only if one doesn't already exist. The UNIQUE(userId, date)
  // index makes this race-safe; an existing started day is never overwritten.
  await db
    .insert(dailySessions)
    .values({
      userId: session.user.id,
      date,
      plannedReviewIds: dedupe(plannedReviewIds),
      plannedNewIds: dedupe(plannedNewIds),
    })
    .onConflictDoNothing();

  const [row] = await db
    .select()
    .from(dailySessions)
    .where(and(eq(dailySessions.userId, session.user.id), eq(dailySessions.date, date)))
    .limit(1);

  return NextResponse.json({ session: row ?? null });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { date, action, problemId } = body;

  if (typeof date !== "string" || !DATE_RE.test(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  const VALID_ACTIONS = ["review", "new", "remove", "complete"] as const;
  if (!VALID_ACTIONS.includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
  if (action !== "complete" && (typeof problemId !== "number" || !Number.isInteger(problemId))) {
    return NextResponse.json({ error: "Invalid problemId" }, { status: 400 });
  }

  const [row] = await db
    .select()
    .from(dailySessions)
    .where(and(eq(dailySessions.userId, session.user.id), eq(dailySessions.date, date)))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "No session for this date" }, { status: 404 });
  }

  const update: Partial<typeof dailySessions.$inferInsert> = { updatedAt: new Date() };

  if (action === "review") {
    update.actedReviewIds = dedupe([...row.actedReviewIds, problemId]);
  } else if (action === "new") {
    update.actedNewIds = dedupe([...row.actedNewIds, problemId]);
  } else if (action === "remove") {
    // Problem deferred/skipped → drop it from the plan so the target shrinks honestly.
    update.plannedReviewIds = row.plannedReviewIds.filter((id) => id !== problemId);
    update.plannedNewIds = row.plannedNewIds.filter((id) => id !== problemId);
  } else if (action === "complete") {
    update.completed = true;
  }

  await db.update(dailySessions).set(update).where(eq(dailySessions.id, row.id));

  const [updated] = await db
    .select()
    .from(dailySessions)
    .where(eq(dailySessions.id, row.id))
    .limit(1);

  return NextResponse.json({ session: updated });
}
