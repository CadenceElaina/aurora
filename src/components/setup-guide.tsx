"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const GITHUB_README = "https://github.com/CadenceElaina/aurora#getting-started";
const POS_KEY = "aurora_guide_pos";
const FLOAT_W = 400;

type Mode = "closed" | "modal" | "float";

/* ── Section content ── */

function Code({ children }: { children: string }) {
  return (
    <code className="rounded bg-background border border-border px-1.5 py-0.5 font-mono text-[11px] text-accent">
      {children}
    </code>
  );
}

function Block({ children }: { children: string }) {
  return (
    <pre className="rounded-md bg-background border border-border p-3 font-mono text-[11px] text-foreground/80 overflow-x-auto whitespace-pre leading-relaxed">
      {children}
    </pre>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5">
      <span className="shrink-0 w-5 h-5 rounded-full bg-accent/20 text-accent text-[10px] font-bold flex items-center justify-center mt-0.5">
        {n}
      </span>
      <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>
    </div>
  );
}

function Warn({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-400 leading-relaxed">
      {children}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-foreground mb-3">{children}</h3>;
}

const SECTIONS: { id: string; label: string; content: () => React.ReactNode }[] = [
  {
    id: "prereqs",
    label: "Prerequisites",
    content: () => (
      <div className="space-y-3">
        <SectionHeading>Prerequisites</SectionHeading>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-accent mt-0.5">·</span>
            <span><strong className="text-foreground">Node.js 18+</strong> — check with <Code>node -v</Code></span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent mt-0.5">·</span>
            <span>
              <strong className="text-foreground">Supabase account</strong> — free tier works.{" "}
              <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                supabase.com
              </a>
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-accent mt-0.5">·</span>
            <span>
              <strong className="text-foreground">GitHub account</strong> — needed for OAuth sign-in and optionally GitHub Sync
            </span>
          </li>
        </ul>
        <p className="text-xs text-muted-foreground/70 pt-1">
          Aurora is open source. You deploy your own instance with your own database — no shared servers.
        </p>
      </div>
    ),
  },
  {
    id: "install",
    label: "Clone & Install",
    content: () => (
      <div className="space-y-3">
        <SectionHeading>Clone & Install</SectionHeading>
        <Block>{`git clone https://github.com/CadenceElaina/aurora.git
cd aurora
npm install
cp .env.example .env.local`}</Block>
        <p className="text-sm text-muted-foreground">
          Edit <Code>.env.local</Code> with your four credentials — see the Env Vars section.
        </p>
      </div>
    ),
  },
  {
    id: "env",
    label: "Env Vars",
    content: () => (
      <div className="space-y-4">
        <SectionHeading>Environment Variables</SectionHeading>

        <div className="space-y-3">
          <div className="rounded-md border border-border bg-background p-3 space-y-1">
            <p className="font-mono text-xs text-accent font-medium">DATABASE_URL</p>
            <p className="text-xs text-muted-foreground">
              Supabase: <strong className="text-foreground">Project Settings → Database → URI</strong>.
              Use the connection string — not the pooler URL.
            </p>
          </div>

          <div className="rounded-md border border-border bg-background p-3 space-y-1">
            <p className="font-mono text-xs text-accent font-medium">AUTH_SECRET</p>
            <p className="text-xs text-muted-foreground">Generate locally:</p>
            <Block>npx auth secret</Block>
            <p className="text-xs text-muted-foreground">Copy the value it prints.</p>
          </div>

          <div className="rounded-md border border-border bg-background p-3 space-y-1">
            <p className="font-mono text-xs text-accent font-medium">AUTH_GITHUB_ID / AUTH_GITHUB_SECRET</p>
            <p className="text-xs text-muted-foreground mb-2">
              Create a GitHub OAuth App at{" "}
              <a href="https://github.com/settings/developers" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                github.com/settings/developers
              </a>
            </p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>· Homepage URL: <Code>http://localhost:3000</Code></li>
              <li>· Callback URL: <Code>http://localhost:3000/api/auth/callback/github</Code></li>
            </ul>
            <p className="text-xs text-muted-foreground mt-1">
              After creating: copy the <strong className="text-foreground">Client ID</strong> and generate a <strong className="text-foreground">Client Secret</strong>.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "database",
    label: "Database",
    content: () => (
      <div className="space-y-3">
        <SectionHeading>Database Setup</SectionHeading>
        <p className="text-sm text-muted-foreground">Push the schema and seed the 150 problems:</p>
        <Block>{`npx drizzle-kit push
npx tsx scripts/seed.ts`}</Block>
        <Warn>
          If <Code>drizzle-kit push</Code> crashes on check constraints, use{" "}
          <Code>npx drizzle-kit generate</Code> to create SQL and apply it manually in the Supabase SQL Editor.
        </Warn>
        <div className="pt-1">
          <p className="text-xs font-medium text-foreground mb-2">If sign-in fails (RLS error)</p>
          <p className="text-xs text-muted-foreground mb-2">
            Supabase enables Row Level Security by default. Run this in the Supabase SQL Editor:
          </p>
          <Block>{`ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON "user"
  FOR ALL USING (true) WITH CHECK (true);

-- repeat for: account, session, verification_token`}</Block>
        </div>
      </div>
    ),
  },
  {
    id: "deploy",
    label: "Deploy",
    content: () => (
      <div className="space-y-3">
        <SectionHeading>Deploy to Vercel</SectionHeading>
        <div className="space-y-2.5">
          <Step n={1}>
            Push your repo to GitHub, then import it at{" "}
            <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">vercel.com</a>
          </Step>
          <Step n={2}>
            In Vercel <strong className="text-foreground">Settings → Environment Variables</strong>, add all four vars:
            {" "}<Code>DATABASE_URL</Code>, <Code>AUTH_SECRET</Code>,{" "}
            <Code>AUTH_GITHUB_ID</Code>, <Code>AUTH_GITHUB_SECRET</Code>
          </Step>
          <Step n={3}>
            Update your GitHub OAuth App's callback URL to your deployed domain:
            <Block>{`https://your-app.vercel.app/api/auth/callback/github`}</Block>
          </Step>
          <Step n={4}>Deploy — Vercel auto-deploys on push to <Code>main</Code></Step>
        </div>
        <Warn>
          Paste only the <strong>value</strong> in Vercel env vars, not the full{" "}
          <Code>KEY=value</Code> line. Vercel does not strip the prefix.
        </Warn>
      </div>
    ),
  },
  {
    id: "github-sync",
    label: "GitHub Sync",
    content: () => (
      <div className="space-y-3">
        <SectionHeading>GitHub Sync (Optional)</SectionHeading>
        <p className="text-sm text-muted-foreground">
          Auto-detect when you solve problems on NeetCode. Solved problems appear as pending confirmations on your dashboard.
        </p>
        <div className="space-y-2.5">
          <Step n={1}>
            Go to{" "}
            <a href="https://neetcode.io/profile/github" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
              neetcode.io/profile/github
            </a>{" "}
            and connect your GitHub account. NeetCode will create a submissions repo.
          </Step>
          <Step n={2}>
            In your Aurora dashboard, click the GitHub icon in the nav bar → enter your NeetCode submissions repo (e.g. <Code>username/neetcode-submissions-xxxxx</Code>) → Connect.
          </Step>
          <Step n={3}>
            Go to your GitHub repo → <strong className="text-foreground">Settings → Webhooks → Add webhook</strong>.
            Paste the Payload URL and Secret shown in the dashboard.
          </Step>
          <Step n={4}>
            <Warn>
              Change <strong>Content type</strong> to <Code>application/json</Code>.
              GitHub defaults to form-urlencoded — the webhook will silently fail without this.
            </Warn>
          </Step>
          <Step n={5}>
            Select <strong className="text-foreground">Just the push event</strong>, keep SSL enabled → Add webhook.
          </Step>
        </div>
      </div>
    ),
  },
  {
    id: "troubleshoot",
    label: "Troubleshoot",
    content: () => (
      <div className="space-y-4">
        <SectionHeading>Troubleshooting</SectionHeading>

        <div className="space-y-1">
          <p className="text-xs font-medium text-foreground">CallbackRouteError after deploying</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>· Verify all four env vars are set in Vercel (values only, not KEY=value)</li>
            <li>· Check GitHub OAuth callback URL matches your deployed domain exactly</li>
            <li>· Trigger a redeploy after changing env vars — Vercel doesn&apos;t hot-apply them</li>
          </ul>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-foreground">incorrect_client_credentials</p>
          <p className="text-xs text-muted-foreground">
            Your <Code>AUTH_GITHUB_ID</Code> or <Code>AUTH_GITHUB_SECRET</Code> doesn&apos;t match GitHub.
            Verify the Client ID on your GitHub OAuth App page. If the secret was lost, generate a new one and update Vercel.
          </p>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-foreground">RLS blocking sign-in</p>
          <p className="text-xs text-muted-foreground">See the Database section — apply the RLS policy SQL in Supabase.</p>
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-foreground">drizzle-kit push crashes</p>
          <p className="text-xs text-muted-foreground">
            Use <Code>npx drizzle-kit generate</Code> to produce SQL, then apply manually in the Supabase SQL Editor.
          </p>
        </div>
      </div>
    ),
  },
];

/* ── Shared guide inner content ── */

function GuideContent({
  activeIdx,
  setActiveIdx,
}: {
  activeIdx: number;
  setActiveIdx: (i: number) => void;
}) {
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Section pills */}
      <div className="flex gap-1 px-4 pt-3 pb-2 overflow-x-auto shrink-0 border-b border-border/50">
        {SECTIONS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setActiveIdx(i)}
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
              i === activeIdx
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
        {SECTIONS[activeIdx].content()}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-border/50 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {activeIdx > 0 && (
            <button
              onClick={() => setActiveIdx(activeIdx - 1)}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              ← {SECTIONS[activeIdx - 1].label}
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <a
            href={GITHUB_README}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Full README ↗
          </a>
          {activeIdx < SECTIONS.length - 1 && (
            <button
              onClick={() => setActiveIdx(activeIdx + 1)}
              className="text-[11px] text-accent hover:opacity-80 transition-opacity"
            >
              {SECTIONS[activeIdx + 1].label} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main component ── */

export function SetupGuide() {
  const [mode, setMode] = useState<Mode>("closed");
  const [activeIdx, setActiveIdx] = useState(0);
  const [pos, setPos] = useState({ x: 20, y: 80 });
  const [isDesktop, setIsDesktop] = useState(false);
  const dragState = useRef({ dragging: false, startX: 0, startY: 0, startPosX: 0, startPosY: 0 });

  // Detect desktop
  useEffect(() => {
    function check() { setIsDesktop(window.innerWidth >= 1024); }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Restore saved float position
  useEffect(() => {
    try {
      const saved = localStorage.getItem(POS_KEY);
      if (saved) {
        const p = JSON.parse(saved);
        // Clamp to current viewport in case it was saved on a larger screen
        setPos({
          x: Math.max(0, Math.min(window.innerWidth - FLOAT_W - 16, p.x)),
          y: Math.max(0, Math.min(window.innerHeight - 120, p.y)),
        });
      }
    } catch { /* ignore */ }
  }, []);

  // Persist float position
  useEffect(() => {
    if (mode === "float") {
      try { localStorage.setItem(POS_KEY, JSON.stringify(pos)); } catch { /* ignore */ }
    }
  }, [pos, mode]);

  // Close on Escape
  useEffect(() => {
    if (mode === "closed") return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setMode("closed"); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mode]);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragState.current = { dragging: true, startX: e.clientX, startY: e.clientY, startPosX: pos.x, startPosY: pos.y };

    function onMove(e: MouseEvent) {
      if (!dragState.current.dragging) return;
      const newX = Math.max(0, Math.min(window.innerWidth - FLOAT_W - 8, dragState.current.startPosX + e.clientX - dragState.current.startX));
      const newY = Math.max(0, Math.min(window.innerHeight - 120, dragState.current.startPosY + e.clientY - dragState.current.startY));
      setPos({ x: newX, y: newY });
    }
    function onUp() {
      dragState.current.dragging = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [pos.x, pos.y]);

  const open = useCallback(() => setMode("modal"), []);
  const close = useCallback(() => setMode("closed"), []);
  const popOut = useCallback(() => setMode("float"), []);
  const popIn = useCallback(() => setMode("modal"), []);

  const HEADER_HEIGHT = "h-10";

  return (
    <>
      {/* Trigger button — exposed via ref-forwarding pattern; rendered inline in Nav */}
      <button
        onClick={open}
        className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-150"
        title="Setup guide"
      >
        Setup
      </button>

      {/* Modal */}
      {mode === "modal" && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="relative flex flex-col w-full max-w-xl mx-4 rounded-xl border border-border bg-muted shadow-2xl"
            style={{ height: "75vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`${HEADER_HEIGHT} shrink-0 flex items-center justify-between px-4 border-b border-border/50`}>
              <span className="text-sm font-medium text-foreground">Aurora Setup Guide</span>
              <div className="flex items-center gap-1">
                {isDesktop && (
                  <button
                    onClick={popOut}
                    className="rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                    title="Pop out to floating panel"
                  >
                    Pop out ↗
                  </button>
                )}
                <button
                  onClick={close}
                  className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                  title="Close"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            <GuideContent activeIdx={activeIdx} setActiveIdx={setActiveIdx} />
          </div>
        </div>
      )}

      {/* Floating panel */}
      {mode === "float" && (
        <div
          className="fixed z-[200] flex flex-col rounded-xl border border-border bg-muted shadow-2xl"
          style={{ left: pos.x, top: pos.y, width: FLOAT_W, height: "75vh" }}
        >
          {/* Drag handle header */}
          <div
            className={`${HEADER_HEIGHT} shrink-0 flex items-center justify-between px-3 border-b border-border/50 cursor-grab active:cursor-grabbing select-none`}
            onMouseDown={handleDragStart}
          >
            <div className="flex items-center gap-2 min-w-0">
              {/* Drag grip dots */}
              <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor" className="text-muted-foreground/40 shrink-0">
                <circle cx="2" cy="3" r="1.5" /><circle cx="8" cy="3" r="1.5" />
                <circle cx="2" cy="7" r="1.5" /><circle cx="8" cy="7" r="1.5" />
                <circle cx="2" cy="11" r="1.5" /><circle cx="8" cy="11" r="1.5" />
              </svg>
              <span className="text-xs font-medium text-foreground truncate">Aurora Setup Guide</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={popIn}
                className="rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                title="Collapse to modal"
                onMouseDown={(e) => e.stopPropagation()}
              >
                ↙ Modal
              </button>
              <button
                onClick={close}
                className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                title="Close"
                onMouseDown={(e) => e.stopPropagation()}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          <GuideContent activeIdx={activeIdx} setActiveIdx={setActiveIdx} />
        </div>
      )}
    </>
  );
}
