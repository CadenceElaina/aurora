import { db } from "@/db";
import { problems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { AttemptForm } from "./attempt-form";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await db.select().from(problems).where(eq(problems.id, Number(id))).limit(1);
  if (!rows[0]) return { title: "Not Found — LeetRepeat" };
  return { title: `Log Attempt — ${rows[0].title} — LeetRepeat` };
}

export default async function AttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await db.select().from(problems).where(eq(problems.id, Number(id))).limit(1);
  const problem = rows[0];
  if (!problem) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Log Attempt</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {problem.leetcodeNumber}. {problem.title}
        </p>
      </div>
      <AttemptForm
        problemId={problem.id}
        optimalTimeComplexity={problem.optimalTimeComplexity}
        optimalSpaceComplexity={problem.optimalSpaceComplexity}
      />
    </div>
  );
}
