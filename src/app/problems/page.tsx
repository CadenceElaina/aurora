import { db } from "@/db";
import { problems } from "@/db/schema";
import { asc } from "drizzle-orm";
import { ProblemsTable } from "./problems-table";

export const dynamic = "force-dynamic";
export const metadata = { title: "Problems — LeetRepeat" };

export default async function ProblemsPage() {
  const allProblems = await db
    .select()
    .from(problems)
    .orderBy(asc(problems.id));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Problems</h1>
      <ProblemsTable problems={allProblems} />
    </div>
  );
}
