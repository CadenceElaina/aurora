"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { Github, GitBranch, LockKeyhole, Sparkles } from "lucide-react";

export default function SignInPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-10rem)] w-full max-w-4xl items-center justify-center py-10">
      <div className="grid w-full gap-4 md:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-lg border border-border bg-muted p-6">
          <div className="space-y-3">
            <span className="inline-flex items-center rounded-md border border-accent/40 bg-accent/10 px-2 py-1 text-xs font-medium text-accent">
              Save your Aurora workspace
            </span>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold text-foreground">Continue with GitHub</h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Create a private Aurora account to keep attempts, review schedules, goals, notes, and imports across sessions.
              </p>
            </div>
          </div>

          <button
            onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
            className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-semibold text-accent-foreground transition-colors hover:opacity-90"
          >
            <Github className="h-4 w-4" aria-hidden="true" />
            Continue with GitHub
          </button>

          <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <Link href="/dashboard" className="hover:text-foreground hover:underline">
              Keep exploring demo
            </Link>
            <Link href="/privacy" className="hover:text-foreground hover:underline">
              Privacy
            </Link>
          </div>
        </section>

        <aside className="rounded-lg border border-border bg-muted/60 p-5">
          <p className="text-sm font-semibold text-foreground">What happens next</p>
          <div className="mt-4 space-y-3">
            <div className="flex gap-3">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              <div>
                <p className="text-sm text-foreground">First-run setup</p>
                <p className="text-xs leading-relaxed text-muted-foreground">Pick Blind 75, NeetCode 150, or a freeform goal after sign-in.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              <div>
                <p className="text-sm text-foreground">No repo access required</p>
                <p className="text-xs leading-relaxed text-muted-foreground">GitHub is only used for OAuth at first. You can log manually right away.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <GitBranch className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
              <div>
                <p className="text-sm text-foreground">GitHub Sync is optional</p>
                <p className="text-xs leading-relaxed text-muted-foreground">Connect your NeetCode submissions repo later if you want automatic detections.</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
