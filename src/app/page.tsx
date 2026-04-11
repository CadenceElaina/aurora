import { LandingPage } from "./landing-client";
import { auth, isAuthConfigured } from "@/auth";
import problemsData from "../../problems.json";

// Static fallback from problems.json (works without DB)
function getStaticCategoryStats() {
  const probs = problemsData.problems as { difficulty: string; category: string }[];
  const categories = [...new Set(probs.map((p) => p.category))];
  return {
    total: probs.length,
    categories: categories.map((cat) => {
      const cp = probs.filter((p) => p.category === cat);
      return {
        name: cat,
        total: cp.length,
        easy: cp.filter((p) => p.difficulty === "Easy").length,
        medium: cp.filter((p) => p.difficulty === "Medium").length,
        hard: cp.filter((p) => p.difficulty === "Hard").length,
      };
    }),
  };
}

export default async function Home() {
  // Check auth state (non-blocking — landing is available for everyone)
  let isAuthenticated = false;
  if (isAuthConfigured) {
    try {
      const session = await auth();
      isAuthenticated = !!session?.user?.id;
    } catch {
      // Auth call failed
    }
  }

  // Try DB first, fall back to static problems.json
  let totalProblems: number;
  let categoryStats: { name: string; total: number; easy: number; medium: number; hard: number }[];

  try {
    const { db } = await import("@/db");
    const { problems } = await import("@/db/schema");
    const { asc } = await import("drizzle-orm");

    const allProblems = await db
      .select({
        id: problems.id,
        title: problems.title,
        difficulty: problems.difficulty,
        category: problems.category,
        blind75: problems.blind75,
      })
      .from(problems)
      .orderBy(asc(problems.id));

    const categories = [...new Set(allProblems.map((p) => p.category))];
    totalProblems = allProblems.length;
    categoryStats = categories.map((cat) => {
      const catProblems = allProblems.filter((p) => p.category === cat);
      return {
        name: cat,
        total: catProblems.length,
        easy: catProblems.filter((p) => p.difficulty === "Easy").length,
        medium: catProblems.filter((p) => p.difficulty === "Medium").length,
        hard: catProblems.filter((p) => p.difficulty === "Hard").length,
      };
    });
  } catch {
    // DB not available — use static data from problems.json
    const fallback = getStaticCategoryStats();
    totalProblems = fallback.total;
    categoryStats = fallback.categories;
  }

  return (
    <LandingPage
      totalProblems={totalProblems}
      categories={categoryStats}
      isAuthenticated={isAuthenticated}
      authConfigured={isAuthConfigured}
    />
  );
}
