import { db } from "@/db";
import { problems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { ExternalLink, Play } from "lucide-react";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const problem = await db.select().from(problems).where(eq(problems.id, Number(id))).limit(1);
  if (!problem[0]) return { title: "Not Found — LeetRepeat" };
  return { title: `${problem[0].title} — LeetRepeat` };
}

export default async function ProblemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await db.select().from(problems).where(eq(problems.id, Number(id))).limit(1);
  const problem = rows[0];
  if (!problem) notFound();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">
            {problem.leetcodeNumber}. {problem.title}
          </h1>
          <DifficultyBadge difficulty={problem.difficulty} />
          {problem.blind75 && (
            <span className="inline-flex items-center rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-medium text-violet-500">
              Blind 75
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{problem.category}</p>
      </div>

      {/* Links */}
      <div className="flex flex-wrap gap-3">
        <a
          href={problem.leetcodeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center gap-2 rounded-md bg-accent px-4 text-sm text-accent-foreground transition-colors duration-150 hover:opacity-90"
        >
          <ExternalLink size={14} />
          Open on LeetCode
        </a>
        {problem.neetcodeUrl && (
          <a
            href={problem.neetcodeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-2 rounded-md px-4 text-sm text-foreground transition-colors duration-150 hover:bg-muted"
          >
            <ExternalLink size={14} />
            NeetCode Solution
          </a>
        )}
        {problem.videoId && (
          <a
            href={`https://www.youtube.com/watch?v=${encodeURIComponent(problem.videoId)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-2 rounded-md px-4 text-sm text-foreground transition-colors duration-150 hover:bg-muted"
          >
            <Play size={14} />
            Watch Video
          </a>
        )}
      </div>

      {/* Complexity */}
      <div className="rounded-lg border border-border bg-muted p-4">
        <h2 className="mb-3 text-lg font-semibold">Optimal Complexity</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Time</p>
            <p className="font-mono text-sm">{problem.optimalTimeComplexity ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Space</p>
            <p className="font-mono text-sm">{problem.optimalSpaceComplexity ?? "—"}</p>
          </div>
        </div>
      </div>

      {/* Log Attempt CTA */}
      <Link
        href={`/problems/${problem.id}/attempt`}
        className="inline-flex h-9 items-center gap-2 rounded-md bg-accent px-4 text-sm text-accent-foreground transition-colors duration-150 hover:opacity-90"
      >
        Log Attempt
      </Link>
    </div>
  );
}
