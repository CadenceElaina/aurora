import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy — Aurora",
  description: "What Aurora collects, how it's used, and your rights",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">Privacy</h1>
        <p className="text-sm text-muted-foreground">Last updated: May 2026</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">What we collect</h2>
        <ul className="text-sm text-muted-foreground space-y-2 list-disc ml-4">
          <li>
            <span className="text-foreground font-medium">Account information</span> — your name,
            email address, and GitHub OAuth identity (provided by GitHub when you sign in).
          </li>
          <li>
            <span className="text-foreground font-medium">Practice data</span> — every logged
            attempt: problem, outcome, confidence, solve time, code snippets, and notes you enter.
            This is the core of the product.
          </li>
          <li>
            <span className="text-foreground font-medium">SRS state</span> — per-problem memory
            stability and review schedule, computed from your attempts.
          </li>
          <li>
            <span className="text-foreground font-medium">GitHub sync</span> — if you connect a
            repository, we store the repo name and a webhook secret (encrypted at rest) to
            receive push events. We do not clone your code or access file contents.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">How it&apos;s used</h2>
        <ul className="text-sm text-muted-foreground space-y-2 list-disc ml-4">
          <li>
            <span className="text-foreground font-medium">Core product</span> — your practice
            data powers the spaced-repetition algorithm that schedules your reviews. This cannot
            be opted out of without losing the product&apos;s core function.
          </li>
          <li>
            <span className="text-foreground font-medium">Cohort analytics</span> — anonymized,
            aggregate patterns across users (e.g., which problem categories are hardest) may be
            analyzed to improve the algorithm and inform research. You can opt out of this below.
          </li>
          <li>We do not sell, share, or monetize your data with third parties. There are no ads.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold">Your rights</h2>
        <div className="text-sm text-muted-foreground space-y-4">
          <div>
            <p className="text-foreground font-medium mb-1">Export your data</p>
            <p>Download a complete JSON file of all your attempts and SRS state at any time.</p>
            <a
              href="/api/export"
              download
              className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
            >
              Download my data
            </a>
          </div>
          <div>
            <p className="text-foreground font-medium mb-1">Opt out of cohort analytics</p>
            <p>
              You can opt out of having your data included in aggregate research and cohort
              analysis. Your core SRS experience is unaffected. Toggle this in your account
              settings (user menu → Settings).
            </p>
          </div>
          <div>
            <p className="text-foreground font-medium mb-1">Delete your account</p>
            <p>
              Deleting your account permanently removes all data — attempts, SRS state, notes,
              and GitHub sync configuration. This cannot be undone.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Contact</h2>
        <p className="text-sm text-muted-foreground">
          Questions or data requests:{" "}
          <a href="mailto:cadenceelaina7@gmail.com" className="text-accent hover:underline">
            cadenceelaina7@gmail.com
          </a>
        </p>
      </section>

      <div className="pt-2 border-t border-border">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to Aurora
        </Link>
      </div>
    </div>
  );
}
