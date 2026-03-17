/**
 * Seed script: reads problems.json and inserts into the database.
 *
 * Usage:
 *   npx tsx scripts/seed.ts
 *
 * Requires DATABASE_URL in .env
 */
import "dotenv/config";
import { readFileSync } from "fs";
import { resolve } from "path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { problems } from "../src/db/schema";
import { sql } from "drizzle-orm";

interface SeedProblem {
  id: number;
  leetcodeNumber: number;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  category: string;
  leetcodeUrl: string;
  neetcodeUrl: string | null;
  videoId: string | null;
  listSource: string;
  blind75: boolean;
  optimalTimeComplexity: string | null;
  optimalSpaceComplexity: string | null;
}

async function main() {
  const jsonPath = resolve(__dirname, "../problems.json");
  const raw = JSON.parse(readFileSync(jsonPath, "utf-8"));
  const items: SeedProblem[] = raw.problems;

  console.log(`Seeding ${items.length} problems...`);

  const client = postgres(process.env.DATABASE_URL!);
  const db = drizzle(client);

  // Upsert: insert or update on conflict
  for (const p of items) {
    await db
      .insert(problems)
      .values({
        id: p.id,
        leetcodeNumber: p.leetcodeNumber,
        title: p.title,
        difficulty: p.difficulty,
        category: p.category,
        leetcodeUrl: p.leetcodeUrl,
        neetcodeUrl: p.neetcodeUrl,
        videoId: p.videoId,
        listSource: "NEETCODE_150",
        blind75: p.blind75,
        optimalTimeComplexity: p.optimalTimeComplexity,
        optimalSpaceComplexity: p.optimalSpaceComplexity,
      })
      .onConflictDoUpdate({
        target: problems.id,
        set: {
          title: sql`excluded.title`,
          difficulty: sql`excluded.difficulty`,
          category: sql`excluded.category`,
          leetcodeUrl: sql`excluded.leetcode_url`,
          neetcodeUrl: sql`excluded.neetcode_url`,
          videoId: sql`excluded.video_id`,
          blind75: sql`excluded.blind75`,
          optimalTimeComplexity: sql`excluded.optimal_time_complexity`,
          optimalSpaceComplexity: sql`excluded.optimal_space_complexity`,
        },
      });
  }

  console.log(`✓ Seeded ${items.length} problems`);
  await client.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
