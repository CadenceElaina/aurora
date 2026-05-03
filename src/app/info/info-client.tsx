"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const SECTIONS = [
  { id: "core-idea", label: "The Core Idea" },
  { id: "stability", label: "Stability" },
  { id: "retrievability", label: "Retrievability" },
  { id: "scoring", label: "How Attempts Are Scored" },
  { id: "review-queue", label: "Review Queue Priority" },
  { id: "readiness", label: "Readiness Score" },
  { id: "mastery", label: "Mastery" },
  { id: "glossary", label: "Glossary", rightPanelOnly: true },
  { id: "further-reading", label: "Further Reading", rightPanelOnly: true },
];

function ForgettingCurveChart() {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3 mt-4">
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
        Forgetting Curve — retrievability over time
      </p>
      <svg viewBox="0 0 480 200" className="w-full" aria-hidden="true">
        {/* Y grid lines */}
        <line x1="48" y1="38" x2="464" y2="38" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
        <line x1="48" y1="83" x2="464" y2="83" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
        <line x1="48" y1="127" x2="464" y2="127" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
        <line x1="48" y1="172" x2="464" y2="172" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
        {/* X grid lines */}
        <line x1="187" y1="16" x2="187" y2="172" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
        <line x1="325" y1="16" x2="325" y2="172" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
        {/* Axes */}
        <line x1="48" y1="16" x2="48" y2="172" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1" />
        <line x1="48" y1="172" x2="464" y2="172" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1" />
        {/* Y labels */}
        <text x="43" y="19" textAnchor="end" fontSize="9" fill="currentColor" fillOpacity="0.45">100%</text>
        <text x="43" y="41" textAnchor="end" fontSize="9" fill="currentColor" fillOpacity="0.45">90%</text>
        <text x="43" y="86" textAnchor="end" fontSize="9" fill="currentColor" fillOpacity="0.45">70%</text>
        <text x="43" y="130" textAnchor="end" fontSize="9" fill="currentColor" fillOpacity="0.45">50%</text>
        <text x="43" y="175" textAnchor="end" fontSize="9" fill="currentColor" fillOpacity="0.45">30%</text>
        {/* X labels */}
        <text x="48" y="185" textAnchor="middle" fontSize="9" fill="currentColor" fillOpacity="0.45">0d</text>
        <text x="187" y="185" textAnchor="middle" fontSize="9" fill="currentColor" fillOpacity="0.45">7d</text>
        <text x="325" y="185" textAnchor="middle" fontSize="9" fill="currentColor" fillOpacity="0.45">14d</text>
        <text x="464" y="185" textAnchor="middle" fontSize="9" fill="currentColor" fillOpacity="0.45">21d</text>
        {/* 30% floor */}
        <line x1="48" y1="172" x2="464" y2="172" stroke="#f97316" strokeOpacity="0.25" strokeWidth="1" strokeDasharray="4 3" />
        {/* S=2 days */}
        <polyline points="48,16 58,65 68,104 78,134 88,157 96,172 464,172"
          fill="none" stroke="#f97316" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {/* S=7 days */}
        <polyline points="48,16 68,46 88,71 127,113 187,157 216,172 464,172"
          fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {/* S=30 days */}
        <polyline points="48,16 107,37 187,63 246,79 325,99 405,117 464,128"
          fill="none" stroke="#10b981" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-0.5 rounded" style={{ backgroundColor: "#f97316" }} />
          S = 2 days (early stage)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-0.5 rounded" style={{ backgroundColor: "#f59e0b" }} />
          S = 7 days
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-0.5 rounded" style={{ backgroundColor: "#10b981" }} />
          S = 30 days (well-practiced)
        </span>
      </div>
    </div>
  );
}

export default function InfoClient() {
  const [activeSection, setActiveSection] = useState("core-idea");

  useEffect(() => {
    function onScroll() {
      const threshold = window.innerHeight * 0.25;
      let best = SECTIONS[0].id;
      for (const { id } of SECTIONS) {
        const el = document.getElementById(id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top <= threshold) best = id;
      }
      setActiveSection(best);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="flex gap-12">
      {/* ── Left TOC ── */}
      <aside className="hidden lg:block w-48 shrink-0">
        <div className="sticky top-20">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            On this page
          </p>
          <nav className="space-y-0.5">
            {SECTIONS.map(({ id, label, rightPanelOnly }) => (
              <a
                key={id}
                href={`#${id}`}
                className={`block text-sm py-1 transition-colors rounded pl-3 ${
                  rightPanelOnly ? "xl:hidden" : ""
                } ${
                  activeSection === id
                    ? "text-foreground font-medium border-l-2 border-accent"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
      </aside>

      {/* ── Main article ── */}
      <article className="flex-1 min-w-0 max-w-[720px] space-y-12 text-sm leading-relaxed text-foreground">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">How Aurora Works</h1>
          <p className="text-muted-foreground">
            The scheduling engine behind Aurora, explained from scratch. No statistics background required.
          </p>
        </header>

        {/* ── Core Idea ── */}
        <section id="core-idea" className="space-y-3">
          <h2 className="text-lg font-semibold">The Core Idea</h2>
          <p>
            When you learn something, you start forgetting it immediately. But each time you successfully recall it,
            your memory gets a little more durable. <strong>Spaced repetition</strong> exploits this: review right
            before you&apos;d forget, and each review pushes the next one further into the future.
          </p>
          <p>Aurora tracks two things for every problem you&apos;ve attempted:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Stability</strong> — how durable your memory is (measured in days)</li>
            <li><strong>Retrievability</strong> — the probability you can solve it right now (0–100%)</li>
          </ul>
          <p>
            Stability goes up when you solve problems well. Retrievability decays over time, which is what triggers
            reviews. The system&apos;s job is to keep retrievability high across all your problems using the fewest
            reviews possible.
          </p>
        </section>

        {/* ── Stability ── */}
        <section id="stability" className="space-y-3">
          <h2 className="text-lg font-semibold">Stability</h2>
          <p>
            Stability is a number in days. If your stability for Two Sum is 7, that means your memory of how to solve
            Two Sum is strong enough to last about 7 days before it starts fading significantly.
          </p>
          <p>After each attempt, stability is updated:</p>
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 font-mono text-sm text-center text-foreground">
            S′ = S × (base multiplier + modifiers)
          </div>
          <ul className="list-disc pl-5 space-y-1">
            <li>Multiplier <strong>above 1.0</strong> → stability grows → your next review is scheduled further out</li>
            <li>Multiplier <strong>below 1.0</strong> → stability shrinks → you review sooner</li>
          </ul>

          <h3 className="text-sm font-semibold pt-2">Example</h3>
          <p>
            You have stability = 4 days for Container With Most Water. You solve it independently with the optimal
            approach and confidence 4. Base multiplier: 2.5. Confidence bonus: +0.1. New stability: 4 × 2.6 ={" "}
            <strong>10.4 days</strong>. Your next review is ~10 days out.
          </p>
          <p>
            Next review: you struggle and need a hint (Partial), confidence 2. Base multiplier: 1.1. Confidence
            penalty: −0.2. New stability: 10.4 × 0.9 = <strong>9.4 days</strong>. Stability shrank — and because you
            had low confidence with a partial solve, the system forces a review in just 1 day regardless.
          </p>

          <h3 className="text-sm font-semibold pt-2">First Attempt</h3>
          <p>
            For your very first attempt at a problem, initial stability starts at a base of{" "}
            <strong>2.0 days</strong> multiplied by the same formula. A perfect first solve (YES:OPTIMAL, confidence 5,
            rewrite) reaches 2.0 × (2.5 + 0.3 + 0.5) = <strong>6.6 days</strong>. A typical first solve — optimal
            approach, confidence 3 — lands at 2.0 × 2.5 = <strong>5 days</strong>. This spacing reflects the real
            cost of coding reviews (15–30 min each): daily recall is counterproductive and builds queue debt faster
            than it can be cleared.
          </p>
          <p className="text-xs text-muted-foreground">
            Stability is clamped between 0.5 days (minimum) and 365 days (maximum).
          </p>
        </section>

        {/* ── Retrievability ── */}
        <section id="retrievability" className="space-y-3">
          <h2 className="text-lg font-semibold">Retrievability (the Forgetting Curve)</h2>
          <p>
            Retrievability answers:{" "}
            <em>&ldquo;If I sat down to solve this right now, what&apos;s the chance I could do it?&rdquo;</em>
          </p>
          <div className="rounded-lg border border-accent/25 bg-accent/5 px-6 py-4 text-center space-y-1">
            <div className="font-mono text-xl text-foreground">
              R = e<sup className="text-base">−t / S</sup>
            </div>
            <p className="text-xs text-muted-foreground">
              R = retrievability &nbsp;·&nbsp; t = days since review &nbsp;·&nbsp; S = stability
            </p>
          </div>

          <ForgettingCurveChart />

          <h3 className="text-sm font-semibold pt-2">Why this formula?</h3>
          <p>
            This is <strong>exponential decay</strong> — the same math that describes radioactive decay and cooling
            coffee. It&apos;s used because human forgetting empirically follows this shape (first measured by Hermann
            Ebbinghaus in 1885 and confirmed many times since).
          </p>
          <p>
            The key property: <strong>you forget fast at first, then slower</strong>. The day after a review,
            retrievability drops quickly. A week later, it&apos;s still dropping but more gradually.
          </p>
          <p>
            <code className="text-xs">e ≈ 2.718</code> is the natural mathematical constant. The{" "}
            <code className="text-xs">−days/stability</code> part means higher stability = slower decay.
          </p>

          <h3 className="text-sm font-semibold pt-2">Concrete examples</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4">Stability</th>
                  <th className="py-2 pr-4">After 1 day</th>
                  <th className="py-2 pr-4">After 3 days</th>
                  <th className="py-2 pr-4">After 7 days</th>
                  <th className="py-2 pr-4">After 14 days</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                <tr className="border-b border-border">
                  <td className="py-2 pr-4 font-sans">2 days</td>
                  <td className="py-2 pr-4">61%</td>
                  <td className="py-2 pr-4">30%*</td>
                  <td className="py-2 pr-4">30%*</td>
                  <td className="py-2 pr-4">30%*</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 pr-4 font-sans">7 days</td>
                  <td className="py-2 pr-4">87%</td>
                  <td className="py-2 pr-4">65%</td>
                  <td className="py-2 pr-4">37%</td>
                  <td className="py-2 pr-4">30%*</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 pr-4 font-sans">30 days</td>
                  <td className="py-2 pr-4">97%</td>
                  <td className="py-2 pr-4">90%</td>
                  <td className="py-2 pr-4">79%</td>
                  <td className="py-2 pr-4">63%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            * Retrievability has a floor of 30%. Even for a problem you haven&apos;t reviewed in months, the system
            assumes you retained <em>something</em> — the problem name, the general pattern, a vague approach. Without
            the floor, a problem 60 days overdue would score 0% and be indistinguishable from one you&apos;ve never
            seen.
          </p>

          <h3 className="text-sm font-semibold pt-2">What the labels mean</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4">Retrievability</th>
                  <th className="py-2 pr-4">Label</th>
                  <th className="py-2 pr-4">What it means</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="py-2 pr-4 font-mono">≥ 80%</td>
                  <td className="py-2 pr-4 text-green-500 font-medium">Strong</td>
                  <td className="py-2 pr-4">You can probably solve this cold</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 pr-4 font-mono">60–79%</td>
                  <td className="py-2 pr-4 text-emerald-400 font-medium">Good</td>
                  <td className="py-2 pr-4">Likely solvable, might need a moment</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 pr-4 font-mono">40–59%</td>
                  <td className="py-2 pr-4 text-amber-500 font-medium">Fading</td>
                  <td className="py-2 pr-4">You might struggle — review soon</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 pr-4 font-mono">20–39%</td>
                  <td className="py-2 pr-4 text-orange-500 font-medium">Weak</td>
                  <td className="py-2 pr-4">Likely can&apos;t solve without help</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 pr-4 font-mono">&lt; 20%</td>
                  <td className="py-2 pr-4 text-red-500 font-medium">Critical</td>
                  <td className="py-2 pr-4">Essentially relearning from scratch</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Scoring ── */}
        <section id="scoring" className="space-y-3">
          <h2 className="text-lg font-semibold">How Attempts Are Scored</h2>
          <p>
            When you log an attempt, two things determine how much your stability changes: the{" "}
            <strong>base multiplier</strong> (how well you did) and <strong>modifiers</strong> (bonus/penalty details).
          </p>

          <h3 className="text-sm font-semibold pt-2">Base Multipliers</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4">Outcome</th>
                  <th className="py-2 pr-4">Optimal</th>
                  <th className="py-2 pr-4">Suboptimal</th>
                  <th className="py-2 pr-4">Brute Force</th>
                  <th className="py-2 pr-4">No Solution</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="py-2 pr-4 font-medium">Solved independently</td>
                  <td className="py-2 pr-4 font-mono text-green-500">2.5×</td>
                  <td className="py-2 pr-4 font-mono text-emerald-400">2.0×</td>
                  <td className="py-2 pr-4 font-mono text-amber-500">1.5×</td>
                  <td className="py-2 pr-4 text-muted-foreground">—</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 pr-4 font-medium">Needed help (Partial)</td>
                  <td className="py-2 pr-4 font-mono text-muted-foreground" colSpan={3}>
                    1.1× (solution quality ignored)
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground">—</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 pr-4 font-medium">Could not solve</td>
                  <td className="py-2 pr-4 text-muted-foreground">—</td>
                  <td className="py-2 pr-4 text-muted-foreground">—</td>
                  <td className="py-2 pr-4 font-mono text-orange-500">0.8×</td>
                  <td className="py-2 pr-4 font-mono text-red-500">0.5×</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            <strong>Why is Partial always 1.1× regardless of quality?</strong> If you needed a hint or AI help, you
            didn&apos;t prove you can solve it yourself. Whether you arrived at optimal or brute force with help
            doesn&apos;t meaningfully change how well you <em>know</em> the problem. The quality question is only
            meaningful when you solved independently.
          </p>

          <h3 className="text-sm font-semibold pt-2">Modifiers (independent solves only)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4">Signal</th>
                  <th className="py-2 pr-4">Modifier</th>
                  <th className="py-2 pr-4">Why</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="py-2 pr-4">Rewrote from scratch</td>
                  <td className="py-2 pr-4 font-mono text-green-500">+0.5</td>
                  <td className="py-2 pr-4">Proves you can write it clean, not just patch old code</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 pr-4">Fast solve (Medium &lt; 10 min)</td>
                  <td className="py-2 pr-4 font-mono text-green-500">+0.2</td>
                  <td className="py-2 pr-4">Speed indicates strong, fluent recall</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-sm font-semibold pt-2">Confidence (applies to all attempts)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4">Level</th>
                  <th className="py-2 pr-4">Description</th>
                  <th className="py-2 pr-4">Modifier</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="py-2 pr-4 font-mono">5</td>
                  <td className="py-2 pr-4">Solve cold, no issues</td>
                  <td className="py-2 pr-4 font-mono text-green-500">+0.3</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 pr-4 font-mono">4</td>
                  <td className="py-2 pr-4">Can code it, minor bugs</td>
                  <td className="py-2 pr-4 font-mono text-green-500">+0.1</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 pr-4 font-mono">3</td>
                  <td className="py-2 pr-4">Can pseudocode optimal, maybe code it</td>
                  <td className="py-2 pr-4 font-mono">0</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 pr-4 font-mono">2</td>
                  <td className="py-2 pr-4">Can pseudocode brute force</td>
                  <td className="py-2 pr-4 font-mono text-orange-500">−0.2</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 pr-4 font-mono">1</td>
                  <td className="py-2 pr-4">Can&apos;t solve or pseudocode</td>
                  <td className="py-2 pr-4 font-mono text-red-500">−0.4</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-sm font-semibold pt-2">Special scheduling rules</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Could not solve</strong> → review is scheduled immediately (due now)</li>
            <li><strong>Partial + confidence ≤ 2</strong> → review forced to 1 day, regardless of stability math</li>
          </ul>
        </section>

        {/* ── Review Queue ── */}
        <section id="review-queue" className="space-y-3">
          <h2 className="text-lg font-semibold">Review Queue Priority</h2>
          <p>When multiple problems are due, which do you review first? The queue sorts by priority:</p>
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 font-mono text-sm text-center text-foreground">
            priority = (1 − R) × weight
          </div>
          <p>
            Problems you&apos;re most likely to have forgotten score highest. A problem at 30% retrievability gets
            urgency 0.7; one at 80% gets 0.2.
          </p>
          <p>The <strong>weight</strong> adjusts for importance:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Difficulty</strong>: Hard 1.1×, Medium 1.0×, Easy 0.8×</li>
            <li>
              <strong>Blind 75</strong>: +0.2 bonus — these are the most commonly asked interview problems, so they
              get a small tiebreaker when urgency is similar
            </li>
            <li>
              <strong>Weak category</strong>: +0.3 if your average retention in that category is below 60% — this
              helps shore up gaps (e.g., if your Stack problems are all fading, they get prioritized)
            </li>
          </ul>

          <h3 className="text-sm font-semibold pt-2">Why is my queue smaller than my total attempts?</h3>
          <p>
            This is the SRS working correctly. The system assigns each problem a <em>next review date</em> based on
            its stability — some problems are due today, others next week, others in a month. At any given moment,
            only the subset whose review date has passed appears in the queue. If you have 30 problems in active
            learning, you might see 5–15 due on a typical day. The queue size fluctuates naturally: it grows when
            you skip sessions and shrinks as you clear it. A small queue does <em>not</em> mean you have less work
            to do — it means the work is spread across time as intended.
          </p>
        </section>

        {/* ── Readiness ── */}
        <section id="readiness" className="space-y-3">
          <h2 className="text-lg font-semibold">Readiness Score</h2>
          <p>The readiness score (0–100) estimates how prepared you are for a coding interview. It combines four factors:</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4">Factor</th>
                  <th className="py-2 pr-4">Weight</th>
                  <th className="py-2 pr-4">What it measures</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="py-2 pr-4 font-medium">Coverage</td>
                  <td className="py-2 pr-4 font-mono">30%</td>
                  <td className="py-2 pr-4">Percentage of NeetCode 150 you&apos;ve attempted</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 pr-4 font-medium">Retention</td>
                  <td className="py-2 pr-4 font-mono">40%</td>
                  <td className="py-2 pr-4">Percentage of attempted problems with retrievability &gt; 70%</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 pr-4 font-medium">Category Balance</td>
                  <td className="py-2 pr-4 font-mono">20%</td>
                  <td className="py-2 pr-4">Your worst category&apos;s average retention — penalizes big blind spots</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 pr-4 font-medium">Consistency</td>
                  <td className="py-2 pr-4 font-mono">10%</td>
                  <td className="py-2 pr-4">Percentage of scheduled reviews completed in the last 14 days</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            Retention is weighted highest (40%) because knowing 20 problems cold beats having seen 100 problems once.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4">Score</th>
                  <th className="py-2 pr-4">Tier</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="py-2 pr-4 font-mono">90–100</td>
                  <td className="py-2 pr-4"><span className="rounded bg-violet-500 px-2 py-0.5 text-white text-xs font-medium">S</span></td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 pr-4 font-mono">75–89</td>
                  <td className="py-2 pr-4"><span className="rounded bg-blue-500 px-2 py-0.5 text-white text-xs font-medium">A</span></td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 pr-4 font-mono">55–74</td>
                  <td className="py-2 pr-4"><span className="rounded bg-emerald-500 px-2 py-0.5 text-white text-xs font-medium">B</span></td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 pr-4 font-mono">35–54</td>
                  <td className="py-2 pr-4"><span className="rounded bg-amber-500 px-2 py-0.5 text-white text-xs font-medium">C</span></td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 pr-4 font-mono">0–34</td>
                  <td className="py-2 pr-4"><span className="rounded bg-zinc-500 px-2 py-0.5 text-white text-xs font-medium">D</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Mastery ── */}
        <section id="mastery" className="space-y-3">
          <h2 className="text-lg font-semibold">Mastery</h2>
          <p>
            A problem is considered <strong>mastered</strong> when its stability reaches{" "}
            <strong>45 days or more</strong>. At that point, the SRS won&apos;t schedule it for at least six weeks —
            your memory is durable enough that frequent reviews would be wasted effort.
          </p>
          <p>
            Mastery is a function of consistency, not a single impressive solve. The table below shows roughly how
            many independent solves it takes to cross the 45-day threshold under different scenarios (starting from a
            first attempt):
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4">Scenario</th>
                  <th className="py-2 pr-4">Multiplier path</th>
                  <th className="py-2 pr-4">Stability after each solve</th>
                  <th className="py-2 pr-4">Solves to mastery</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="py-2 pr-4 font-medium">Optimal, conf 5, rewrite</td>
                  <td className="py-2 pr-4 font-mono">3.3×</td>
                  <td className="py-2 pr-4 font-mono text-muted-foreground">6.6 → 21.8 → 71.9</td>
                  <td className="py-2 pr-4 font-mono text-green-500">3</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 pr-4 font-medium">Optimal, conf 4</td>
                  <td className="py-2 pr-4 font-mono">2.6×</td>
                  <td className="py-2 pr-4 font-mono text-muted-foreground">5.2 → 13.5 → 35.1 → 91.3</td>
                  <td className="py-2 pr-4 font-mono text-emerald-400">4</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 pr-4 font-medium">Optimal, conf 3 (neutral)</td>
                  <td className="py-2 pr-4 font-mono">2.5×</td>
                  <td className="py-2 pr-4 font-mono text-muted-foreground">5.0 → 12.5 → 31.3 → 78.1</td>
                  <td className="py-2 pr-4 font-mono text-emerald-400">4</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 pr-4 font-medium">Suboptimal, conf 3</td>
                  <td className="py-2 pr-4 font-mono">2.0×</td>
                  <td className="py-2 pr-4 font-mono text-muted-foreground">4.0 → 8.0 → 16.0 → 32.0 → 64.0</td>
                  <td className="py-2 pr-4 font-mono text-amber-500">5</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-2 pr-4 font-medium">Partial only</td>
                  <td className="py-2 pr-4 font-mono">1.1×</td>
                  <td className="py-2 pr-4 font-mono text-muted-foreground">grows &lt;1.1× per solve</td>
                  <td className="py-2 pr-4 font-mono text-red-400">unreachable</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            These are simplified — actual stability depends on retrievability at review time and the exact modifiers
            logged. Mixing in Partial solves or low-confidence sessions will slow the curve.
          </p>
          <p>
            Mastered problems still appear in the review queue occasionally — once every 45–365 days — to confirm
            retention hasn&apos;t decayed unexpectedly, especially before interviews. A successful confirmation
            extends stability further; a failed one resets the problem back into active learning.
          </p>
        </section>

        {/* ── Glossary — hidden on xl (shown in right panel) ── */}
        <section id="glossary" className="space-y-3 xl:hidden">
          <h2 className="text-lg font-semibold">Glossary</h2>
          <dl className="space-y-4">
            <div>
              <dt className="font-semibold">
                <a href="https://en.wikipedia.org/wiki/Spaced_repetition" target="_blank" rel="noopener noreferrer"
                  className="hover:text-accent transition-colors">
                  Spaced Repetition ↗
                </a>
              </dt>
              <dd className="text-muted-foreground">
                A learning technique where reviews are scheduled at increasing intervals. Each successful review pushes
                the next one further out. Based on the finding that memory consolidates with well-timed recall practice.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">
                <a href="https://github.com/open-spaced-repetition/fsrs4anki/wiki" target="_blank" rel="noopener noreferrer"
                  className="hover:text-accent transition-colors">
                  FSRS (Free Spaced Repetition Scheduler) ↗
                </a>
              </dt>
              <dd className="text-muted-foreground">
                An open-source spaced repetition algorithm by Jarrett Ye. Aurora uses a modified version adapted for
                coding problems — multi-signal scoring (outcome + solution quality + confidence + timing) replaces
                FSRS&apos;s single pass/fail grade.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">
                <a href="#stability" className="hover:text-accent transition-colors">Stability</a>
              </dt>
              <dd className="text-muted-foreground">
                How durable your memory of a problem is, measured in days. Higher stability = slower forgetting =
                longer intervals between reviews. Clamped between 0.5 and 365 days.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">
                <a href="#retrievability" className="hover:text-accent transition-colors">Retrievability</a>
              </dt>
              <dd className="text-muted-foreground">
                The estimated probability (0–100%) that you could solve a problem right now without help. Decays
                exponentially over time since your last review. Has a floor of 30%.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">
                <a href="#mastery" className="hover:text-accent transition-colors">Mastery</a>
              </dt>
              <dd className="text-muted-foreground">
                A problem is mastered when its stability reaches 45 days or more. Mastered problems are reviewed
                infrequently — roughly once every 1–3 months — as a retention check rather than active learning.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">
                <a href="https://en.wikipedia.org/wiki/Exponential_decay" target="_blank" rel="noopener noreferrer"
                  className="hover:text-accent transition-colors">
                  Exponential Decay ↗
                </a>
              </dt>
              <dd className="text-muted-foreground">
                A pattern where something decreases by a consistent proportion over equal time periods. Memory follows
                this shape: fast loss early, slowing over time. The formula R = e<sup className="text-[10px]">−t/S</sup> captures this.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">
                <a href="https://en.wikipedia.org/wiki/Forgetting_curve" target="_blank" rel="noopener noreferrer"
                  className="hover:text-accent transition-colors">
                  Forgetting Curve ↗
                </a>
              </dt>
              <dd className="text-muted-foreground">
                The graph of retrievability over time. First described by Hermann Ebbinghaus in 1885 through
                experiments on memorizing nonsense syllables. The exponential decay model fits his data and has been
                confirmed repeatedly since.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">
                <a href="https://neetcode.io/roadmap" target="_blank" rel="noopener noreferrer"
                  className="hover:text-accent transition-colors">
                  NeetCode 150 ↗
                </a>
              </dt>
              <dd className="text-muted-foreground">
                A curated list of 150 LeetCode problems covering all major algorithms and data structures needed for
                coding interviews. Organized into categories like Arrays &amp; Hashing, Two Pointers, Stack, etc.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">Blind 75</dt>
              <dd className="text-muted-foreground">
                A subset of 75 problems from a viral list of the most frequently asked coding interview questions.
                These are given a small priority bonus in the review queue because they&apos;re statistically more
                likely to appear in interviews.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">
                <a href="#readiness" className="hover:text-accent transition-colors">Readiness Score</a>
              </dt>
              <dd className="text-muted-foreground">
                A 0–100 composite score estimating interview preparedness. Combines coverage (how many problems
                you&apos;ve seen), retention (how many you remember), category balance (no blind spots), and
                consistency (keeping up with reviews).
              </dd>
            </div>
          </dl>
        </section>

        {/* ── Further Reading — hidden on xl (shown in right panel) ── */}
        <section id="further-reading" className="space-y-3 xl:hidden">
          <h2 className="text-lg font-semibold">Further Reading</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <a href="https://github.com/open-spaced-repetition/fsrs4anki/wiki" target="_blank" rel="noopener noreferrer"
                className="text-accent hover:underline">
                FSRS Algorithm Wiki
              </a>
              <span className="text-muted-foreground"> — the research behind modern spaced repetition scheduling</span>
            </li>
            <li>
              <a href="https://en.wikipedia.org/wiki/Forgetting_curve" target="_blank" rel="noopener noreferrer"
                className="text-accent hover:underline">
                Forgetting Curve (Wikipedia)
              </a>
              <span className="text-muted-foreground"> — Ebbinghaus&apos;s original research and subsequent confirmations</span>
            </li>
            <li>
              <a href="https://en.wikipedia.org/wiki/Spaced_repetition" target="_blank" rel="noopener noreferrer"
                className="text-accent hover:underline">
                Spaced Repetition (Wikipedia)
              </a>
              <span className="text-muted-foreground"> — overview of the learning technique and its evidence base</span>
            </li>
            <li>
              <a href="https://neetcode.io/roadmap" target="_blank" rel="noopener noreferrer"
                className="text-accent hover:underline">
                NeetCode Roadmap
              </a>
              <span className="text-muted-foreground"> — the NeetCode 150 problem list and category structure</span>
            </li>
            <li>
              <Link href="/problems" className="text-accent hover:underline">Problem List</Link>
              <span className="text-muted-foreground"> — browse all 150 problems with optimal complexity and links</span>
            </li>
          </ul>
        </section>

        {/* Footer — hidden on xl (source links shown in right panel) */}
        <footer className="border-t border-border pt-6 text-xs text-muted-foreground xl:hidden">
          <p>
            The algorithm source code is in{" "}
            <a href="https://github.com/CadenceElaina/aurora/blob/main/src/lib/srs.ts" target="_blank" rel="noopener noreferrer"
              className="text-accent hover:underline">
              src/lib/srs.ts
            </a>
            . Full design rationale is in{" "}
            <a href="https://github.com/CadenceElaina/aurora/blob/main/docs/ARCHITECTURE.md" target="_blank" rel="noopener noreferrer"
              className="text-accent hover:underline">
              docs/ARCHITECTURE.md
            </a>
            .
          </p>
        </footer>
      </article>

      {/* ── Right reference panel (xl+) ── */}
      <aside className="hidden xl:block w-56 shrink-0">
        <div className="sticky top-20 space-y-7 max-h-[calc(100vh-5rem)] overflow-y-auto scrollbar-none pr-1">

          {/* Glossary */}
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
              Glossary
            </p>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs font-semibold text-foreground leading-snug">
                  <a href="https://en.wikipedia.org/wiki/Spaced_repetition" target="_blank" rel="noopener noreferrer"
                    className="hover:text-accent transition-colors">
                    Spaced Repetition ↗
                  </a>
                </dt>
                <dd className="text-[11px] leading-snug text-muted-foreground mt-0.5">
                  Reviews at increasing intervals; each success pushes the next further out.
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-foreground leading-snug">
                  <a href="https://github.com/open-spaced-repetition/fsrs4anki/wiki" target="_blank" rel="noopener noreferrer"
                    className="hover:text-accent transition-colors">
                    FSRS ↗
                  </a>
                </dt>
                <dd className="text-[11px] leading-snug text-muted-foreground mt-0.5">
                  Open-source SRS algorithm; Aurora adapts it for multi-signal coding-problem scoring.
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-foreground leading-snug">
                  <a href="#stability" className="hover:text-accent transition-colors">Stability</a>
                </dt>
                <dd className="text-[11px] leading-snug text-muted-foreground mt-0.5">
                  How durable your memory is, in days. Higher = slower forgetting.
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-foreground leading-snug">
                  <a href="#retrievability" className="hover:text-accent transition-colors">Retrievability</a>
                </dt>
                <dd className="text-[11px] leading-snug text-muted-foreground mt-0.5">
                  Probability you can solve right now (0–100%). Decays over time; floor 30%.
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-foreground leading-snug">
                  <a href="#mastery" className="hover:text-accent transition-colors">Mastery</a>
                </dt>
                <dd className="text-[11px] leading-snug text-muted-foreground mt-0.5">
                  Stability ≥ 45 days. Reviewed every 1–3 months as a retention check.
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-foreground leading-snug">
                  <a href="https://en.wikipedia.org/wiki/Exponential_decay" target="_blank" rel="noopener noreferrer"
                    className="hover:text-accent transition-colors">
                    Exponential Decay ↗
                  </a>
                </dt>
                <dd className="text-[11px] leading-snug text-muted-foreground mt-0.5">
                  Fast loss early, slower over time. The shape of human forgetting.
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-foreground leading-snug">
                  <a href="https://en.wikipedia.org/wiki/Forgetting_curve" target="_blank" rel="noopener noreferrer"
                    className="hover:text-accent transition-colors">
                    Forgetting Curve ↗
                  </a>
                </dt>
                <dd className="text-[11px] leading-snug text-muted-foreground mt-0.5">
                  Retrievability plotted over time. First measured by Ebbinghaus, 1885.
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-foreground leading-snug">
                  <a href="https://neetcode.io/roadmap" target="_blank" rel="noopener noreferrer"
                    className="hover:text-accent transition-colors">
                    NeetCode 150 ↗
                  </a>
                </dt>
                <dd className="text-[11px] leading-snug text-muted-foreground mt-0.5">
                  150 curated LeetCode problems covering all major interview categories.
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-foreground leading-snug">Blind 75</dt>
                <dd className="text-[11px] leading-snug text-muted-foreground mt-0.5">
                  75 most-asked interview problems; given a priority bonus in the review queue.
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-foreground leading-snug">
                  <a href="#readiness" className="hover:text-accent transition-colors">Readiness Score</a>
                </dt>
                <dd className="text-[11px] leading-snug text-muted-foreground mt-0.5">
                  0–100 composite: coverage 30%, retention 40%, balance 20%, consistency 10%.
                </dd>
              </div>
            </dl>
          </div>

          {/* Further Reading */}
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
              Further Reading
            </p>
            <ul className="space-y-2 text-[11px]">
              <li>
                <a href="https://github.com/open-spaced-repetition/fsrs4anki/wiki" target="_blank" rel="noopener noreferrer"
                  className="text-accent hover:underline leading-snug">
                  FSRS Algorithm Wiki ↗
                </a>
              </li>
              <li>
                <a href="https://en.wikipedia.org/wiki/Forgetting_curve" target="_blank" rel="noopener noreferrer"
                  className="text-accent hover:underline leading-snug">
                  Forgetting Curve (Wikipedia) ↗
                </a>
              </li>
              <li>
                <a href="https://en.wikipedia.org/wiki/Spaced_repetition" target="_blank" rel="noopener noreferrer"
                  className="text-accent hover:underline leading-snug">
                  Spaced Repetition (Wikipedia) ↗
                </a>
              </li>
              <li>
                <a href="https://neetcode.io/roadmap" target="_blank" rel="noopener noreferrer"
                  className="text-accent hover:underline leading-snug">
                  NeetCode Roadmap ↗
                </a>
              </li>
              <li>
                <Link href="/problems" className="text-accent hover:underline leading-snug">
                  Aurora Problem List
                </Link>
              </li>
            </ul>
          </div>

          {/* Source */}
          <div className="border-t border-border pt-4 space-y-2 text-[11px]">
            <p className="font-semibold text-muted-foreground uppercase tracking-widest text-[11px]">Source</p>
            <a href="https://github.com/CadenceElaina/aurora/blob/main/src/lib/srs.ts" target="_blank" rel="noopener noreferrer"
              className="block text-accent hover:underline leading-snug">
              src/lib/srs.ts ↗
            </a>
            <a href="https://github.com/CadenceElaina/aurora/blob/main/docs/ARCHITECTURE.md" target="_blank" rel="noopener noreferrer"
              className="block text-accent hover:underline leading-snug">
              docs/ARCHITECTURE.md ↗
            </a>
          </div>

        </div>
      </aside>
    </div>
  );
}
