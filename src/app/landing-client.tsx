"use client";

import { useRef, useCallback, useEffect } from "react";
import Link from "next/link";

/* ── Types ── */

interface CategoryStat {
  name: string;
  total: number;
  easy: number;
  medium: number;
  hard: number;
}

interface LandingPageProps {
  totalProblems: number;
  categories: CategoryStat[];
  isAuthenticated: boolean;
  authConfigured: boolean;
}

/* ── 3D Parallax Tilt Hook ── */

function useTilt(maxDeg = 10) {
  const ref = useRef<HTMLDivElement>(null);

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      const { width, height, left, top } = el.getBoundingClientRect();
      const x = e.clientX - left;
      const y = e.clientY - top;
      const rotX = ((height / 2 - y) / height) * maxDeg;
      const rotY = ((x - width / 2) / width) * maxDeg;
      el.style.transform = `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.02)`;
    },
    [maxDeg],
  );

  const onMouseLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)";
  }, []);

  return { ref, onMouseMove, onMouseLeave };
}

/* ── Whole-container parallax tilt ── */

function useContainerTilt(maxDeg = 4) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    function handleMove(e: MouseEvent) {
      const { width, height, left, top } = el!.getBoundingClientRect();
      const x = e.clientX - left;
      const y = e.clientY - top;
      const rotX = ((height / 2 - y) / height) * maxDeg;
      const rotY = ((x - width / 2) / width) * maxDeg;
      el!.style.transform = `perspective(1200px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
    }
    function handleLeave() {
      el!.style.transform = "perspective(1200px) rotateX(0deg) rotateY(0deg)";
    }
    el.addEventListener("mousemove", handleMove);
    el.addEventListener("mouseleave", handleLeave);
    return () => {
      el.removeEventListener("mousemove", handleMove);
      el.removeEventListener("mouseleave", handleLeave);
    };
  }, [maxDeg]);

  return ref;
}

/* ── Ring Layout ── */

const RING_CONFIG = [
  { count: 4, radius: 0.30, offset: 0 },
  { count: 6, radius: 0.56, offset: Math.PI / 6 },
  { count: 8, radius: 0.84, offset: Math.PI / 8 },
];

function getCategoryPosition(index: number) {
  let cumulative = 0;
  for (const ring of RING_CONFIG) {
    if (index < cumulative + ring.count) {
      const indexInRing = index - cumulative;
      const angle = (indexInRing / ring.count) * Math.PI * 2 - Math.PI / 2 + ring.offset;
      return {
        x: 50 + Math.cos(angle) * ring.radius * 44,
        y: 50 + Math.sin(angle) * ring.radius * 44,
      };
    }
    cumulative += ring.count;
  }
  const angle = (index / 18) * Math.PI * 2 - Math.PI / 2;
  return { x: 50 + Math.cos(angle) * 0.84 * 44, y: 50 + Math.sin(angle) * 0.84 * 44 };
}

/* ── Category Node ── */

function CategoryNode({ stat, index }: { stat: CategoryStat; index: number }) {
  const { ref, onMouseMove, onMouseLeave } = useTilt(15);
  const { x: cx, y: cy } = getCategoryPosition(index);

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="absolute glow-node rounded-lg border border-border bg-muted/90 px-2.5 py-2 cursor-default select-none backdrop-blur-sm"
      style={{
        left: `${cx}%`,
        top: `${cy}%`,
        transform: "perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)",
        transformStyle: "preserve-3d",
        transition: "transform 0.15s ease-out, box-shadow 0.15s ease-out",
        translate: "-50% -50%",
        maxWidth: "130px",
      }}
    >
      <p className="text-[10px] font-semibold text-foreground truncate leading-tight">{stat.name}</p>
      <div className="flex items-center gap-1.5 text-[9px] mt-1">
        {stat.easy > 0 && <span className="text-emerald-400">{stat.easy}E</span>}
        {stat.medium > 0 && <span className="text-amber-400">{stat.medium}M</span>}
        {stat.hard > 0 && <span className="text-rose-400">{stat.hard}H</span>}
      </div>
    </div>
  );
}

/* ── Constellation Lines (SVG) ── */

function ConstellationLines({ count }: { count: number }) {
  const positions = Array.from({ length: count }, (_, i) => getCategoryPosition(i));

  const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];

  // Within-ring connections (form closed loops)
  let cumulative = 0;
  for (const ring of RING_CONFIG) {
    const end = Math.min(cumulative + ring.count, count);
    for (let i = cumulative; i < end; i++) {
      const next = cumulative + ((i - cumulative + 1) % ring.count);
      if (next < count) {
        lines.push({
          x1: positions[i].x, y1: positions[i].y,
          x2: positions[next].x, y2: positions[next].y,
        });
      }
    }
    cumulative += ring.count;
  }

  // Cross-ring connections (nearest neighbor in adjacent ring)
  cumulative = 0;
  for (let r = 0; r < RING_CONFIG.length - 1; r++) {
    const ringStart = cumulative;
    const ringEnd = Math.min(cumulative + RING_CONFIG[r].count, count);
    const nextStart = ringEnd;
    const nextEnd = Math.min(nextStart + RING_CONFIG[r + 1].count, count);

    for (let i = ringStart; i < ringEnd; i++) {
      let minDist = Infinity;
      let closest = nextStart;
      for (let j = nextStart; j < nextEnd; j++) {
        const d = Math.hypot(positions[i].x - positions[j].x, positions[i].y - positions[j].y);
        if (d < minDist) { minDist = d; closest = j; }
      }
      if (closest < count) {
        lines.push({
          x1: positions[i].x, y1: positions[i].y,
          x2: positions[closest].x, y2: positions[closest].y,
        });
      }
    }
    cumulative += RING_CONFIG[r].count;
  }

  return (
    <svg className="absolute inset-0 h-full w-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <linearGradient id="line-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--accent-secondary)" stopOpacity="0.15" />
        </linearGradient>
      </defs>
      {lines.map((l, i) => (
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="url(#line-grad)" strokeWidth="0.15" />
      ))}
      {positions.map((p, i) => (
        <circle key={`dot-${i}`} cx={p.x} cy={p.y} r="0.4" fill="var(--accent)" opacity="0.5" />
      ))}
    </svg>
  );
}

/* ── Feature Card with tilt ── */

function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  const { ref, onMouseMove, onMouseLeave } = useTilt(8);

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="glow-node rounded-lg border border-border bg-muted/60 p-3 backdrop-blur-sm cursor-default"
      style={{
        transform: "perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)",
        transformStyle: "preserve-3d",
        transition: "transform 0.15s ease-out, box-shadow 0.15s ease-out",
      }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-sm">{icon}</span>
        <h3 className="text-xs font-semibold text-foreground">{title}</h3>
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}

/* ── Main Landing Page ── */

export function LandingPage({ totalProblems, categories, isAuthenticated, authConfigured }: LandingPageProps) {
  const mapRef = useContainerTilt(3);

  return (
    <div className="-mx-6 -mt-8 flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden starfield">
      {/* ── Main split: hero left, constellation right ── */}
      <div className="flex flex-1 min-h-0">
        {/* Left: Hero */}
        <div className="flex flex-col justify-center px-8 sm:px-12 lg:px-16 w-full lg:w-[42%] shrink-0">
          <div className="space-y-5 max-w-md">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl leading-tight">
              Stop re-solving problems
              <br />
              <span className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent-secondary)] bg-clip-text text-transparent">
                you already know.
              </span>
            </h1>

            <p className="text-sm text-muted-foreground leading-relaxed">
              Spaced repetition for 150 curated LeetCode problems. Track what
              you&apos;ve solved, see what you&apos;re forgetting, review at the
              right time — so every session counts.
            </p>

            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  className="inline-flex h-9 items-center rounded-md bg-accent px-5 text-sm font-medium text-accent-foreground transition-all duration-150 hover:shadow-[0_0_16px_var(--glow)]"
                >
                  Go to Dashboard
                </Link>
              ) : authConfigured ? (
                <Link
                  href="/api/auth/signin"
                  className="inline-flex h-9 items-center rounded-md bg-accent px-5 text-sm font-medium text-accent-foreground transition-all duration-150 hover:shadow-[0_0_16px_var(--glow)]"
                >
                  Get started — free
                </Link>
              ) : (
                <Link
                  href="/problems"
                  className="inline-flex h-9 items-center rounded-md bg-accent px-5 text-sm font-medium text-accent-foreground transition-all duration-150 hover:shadow-[0_0_16px_var(--glow)]"
                >
                  Browse Problems
                </Link>
              )}
              <Link
                href="/info"
                className="inline-flex h-9 items-center rounded-md px-4 text-sm text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
              >
                How it works
              </Link>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-5 pt-1">
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{totalProblems}</p>
                <p className="text-[10px] text-muted-foreground">problems</p>
              </div>
              <div className="h-6 w-px bg-border" />
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{categories.length}</p>
                <p className="text-[10px] text-muted-foreground">categories</p>
              </div>
              <div className="h-6 w-px bg-border" />
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">FSRS</p>
                <p className="text-[10px] text-muted-foreground">algorithm</p>
              </div>
            </div>

            {/* Feature cards — compact 2-col grid */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <FeatureCard icon="🧠" title="SRS Scheduling" desc="Review intervals grow as you prove mastery" />
              <FeatureCard icon="📊" title="Readiness Score" desc="Know exactly how prepared you are (S–D tier)" />
              <FeatureCard icon="🎯" title="Pattern Drills" desc="Focus on one category, weakest first" />
              <FeatureCard icon="⏱️" title="Mock Interviews" desc="Timed sessions from your weak spots" />
            </div>
          </div>
        </div>

        {/* Right: Constellation map with container-level parallax */}
        <div className="hidden lg:flex flex-1 items-center justify-center p-4 min-h-0">
          <div
            ref={mapRef}
            className="relative w-full h-full max-w-[560px] max-h-[560px] aspect-square rounded-xl border border-border/50 bg-background/30 backdrop-blur-sm overflow-hidden"
            style={{
              transform: "perspective(1200px) rotateX(0deg) rotateY(0deg)",
              transformStyle: "preserve-3d",
              transition: "transform 0.1s ease-out",
            }}
          >
            <ConstellationLines count={categories.length} />
            {categories.map((stat, i) => (
              <CategoryNode key={stat.name} stat={stat} index={i} />
            ))}
            {/* Center glow label */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <p className="text-xs font-bold text-accent/20 tracking-widest uppercase">150 Problems</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="border-t border-border/50 px-6 py-2.5 shrink-0 bg-background/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <p className="text-[10px] text-muted-foreground">
            free & open source
          </p>
          <div className="flex items-center gap-3">
            <Link href="/problems" className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
              Browse Problems
            </Link>
            <Link href="/info" className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
              How It Works
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
