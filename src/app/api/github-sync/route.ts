import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

/**
 * GET  — get current GitHub sync settings.
 * POST — connect a GitHub repo (generates webhook secret).
 * DELETE — disconnect GitHub sync.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [user] = await db
    .select({
      githubRepo: users.githubRepo,
      githubConnectedAt: users.githubConnectedAt,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return NextResponse.json({
    connected: !!user?.githubRepo,
    repo: user?.githubRepo ?? null,
    connectedAt: user?.githubConnectedAt?.toISOString() ?? null,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { repo } = body;

  // Validate repo format: "owner/repo-name"
  if (typeof repo !== "string" || !/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    return NextResponse.json({ error: "Invalid repo format. Use 'owner/repo-name'" }, { status: 400 });
  }

  // Generate a webhook secret for HMAC verification
  const secret = crypto.randomBytes(32).toString("hex");

  await db
    .update(users)
    .set({
      githubRepo: repo,
      githubWebhookSecret: secret,
      githubConnectedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, session.user.id));

  return NextResponse.json({
    connected: true,
    repo,
    secret,
    webhookUrl: `${process.env.NEXTAUTH_URL ?? "https://aurora-ascent.vercel.app"}/api/webhook/github`,
  });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await db
    .update(users)
    .set({
      githubRepo: null,
      githubWebhookSecret: null,
      githubConnectedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, session.user.id));

  return NextResponse.json({ connected: false });
}
