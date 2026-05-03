import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  if (body.action === "complete-onboarding") {
    await db.update(users).set({ onboardingComplete: true }).where(eq(users.id, session.user.id));
    return NextResponse.json({ ok: true });
  }

  if (body.action === "toggle-analytics-opt-out") {
    const [user] = await db
      .select({ analyticsOptOut: users.analyticsOptOut })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);
    const next = !user?.analyticsOptOut;
    await db.update(users).set({ analyticsOptOut: next }).where(eq(users.id, session.user.id));
    return NextResponse.json({ analyticsOptOut: next });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const confirmation = typeof body.confirmation === "string" ? body.confirmation.trim().toLowerCase() : "";

  if (confirmation !== "delete my account") {
    return NextResponse.json(
      { error: "Confirmation text does not match" },
      { status: 400 },
    );
  }

  // Cascade deletes handle: accounts, sessions, attempts, user_problem_states, pending_submissions
  await db.delete(users).where(eq(users.id, session.user.id));

  return NextResponse.json({ ok: true });
}
