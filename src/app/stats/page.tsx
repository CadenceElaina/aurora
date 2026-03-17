import { auth } from "@/auth";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Stats — LeetRepeat" };

export default async function StatsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Stats</h1>
        <p className="text-sm text-muted-foreground">Sign in to see your statistics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Stats</h1>
      <div className="rounded-lg border border-border bg-muted p-8 text-center">
        <p className="text-muted-foreground">
          Detailed statistics are coming in Phase 2.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          For now, check your progress on the{" "}
          <Link href="/dashboard" className="text-accent hover:underline">Dashboard</Link>.
        </p>
      </div>
    </div>
  );
}
