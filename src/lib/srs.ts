/**
 * Spaced Repetition System — stability + retrievability calculations.
 * Based on FSRS adapted for coding problems (see docs/ARCHITECTURE.md).
 */

/* ── Types ── */

export type SolvedIndependently = "YES" | "PARTIAL" | "NO";
export type SolutionQuality = "OPTIMAL" | "SUBOPTIMAL" | "BRUTE_FORCE" | "NONE";
export type RewroteFromScratch = "YES" | "NO" | "DID_NOT_ATTEMPT";

export interface AttemptSignals {
  solvedIndependently: SolvedIndependently;
  solutionQuality: SolutionQuality;
  rewroteFromScratch: RewroteFromScratch | null;
  confidence: number; // 1–5
  solveTimeMinutes: number | null;
  difficulty: "Easy" | "Medium" | "Hard";
}

/* ── Constants ── */

export const MIN_STABILITY = 0.5; // days
export const MAX_STABILITY = 365; // days
const RETRIEVABILITY_FLOOR = 0.3;

// Minimum scheduling interval. Distinct from MIN_STABILITY: stability is a memory-model
// quantity that feeds R(t) = e^(-t/S), so it must stay free to drop to 0.5 for genuinely
// weak items. The 1-day floor is a *scheduling* constraint — we never surface the same
// problem twice in one day, even when computed stability is below 1.0. Applied in
// computeNextReviewDate so retrievability math is unaffected. (Failed/struggled attempts
// already hardcode a 24h interval in the attempts route; this covers the remaining path.)
export const MIN_REVIEW_INTERVAL_DAYS = 1;
export const MASTERY_THRESHOLD = 45; // stability (days) treated as 100% mastery

// Base for first-attempt stability. Using 2.0 rather than MIN_STABILITY (0.5)
// because coding problems require ~5-30 min to review — aggressive daily recall
// is counterproductive and builds queue debt faster than the user can clear it.
// FSRS calibration for "good" first recall targets ~15 days; 2.0 × 2.5 = 5 days
// is a deliberate conservative choice for a skill-heavy domain.
export const INITIAL_STABILITY_BASE = 2.0; // days

/* ── Base multipliers (§6.2) ── */

export const BASE_MULTIPLIERS: Record<string, number> = {
  // solved=YES — quality matters
  "YES:OPTIMAL": 2.5,
  "YES:SUBOPTIMAL": 2.0,
  "YES:BRUTE_FORCE": 1.5,
  "YES:NONE": 1.0,
  // solved=PARTIAL — needed help, quality is irrelevant (all map to 1.1)
  "PARTIAL:OPTIMAL": 1.1,
  "PARTIAL:SUBOPTIMAL": 1.1,
  "PARTIAL:BRUTE_FORCE": 1.1,
  "PARTIAL:NONE": 1.1,
  // solved=NO — all failed outcomes reduce stability
  // NO:OPTIMAL and NO:SUBOPTIMAL are UI-unreachable (the attempt form hardcodes
  // solutionQuality=NONE for NO_SOLUTION), but are handled defensively here so
  // a direct API call never accidentally benefits from the ?? 1.0 fallback.
  "NO:OPTIMAL": 0.8,
  "NO:SUBOPTIMAL": 0.8,
  "NO:BRUTE_FORCE": 0.8,
  "NO:NONE": 0.5,
};

// Effective-multiplier ceiling for PARTIAL outcomes. Modifiers (confidence +0.3,
// fast-solve +0.2) can push a PARTIAL above its 1.1 base — up to 1.6 — which would
// exceed the minimum clean YES (YES:BRUTE_FORCE = 1.5). "Needed help" must always earn
// less stability growth than "solved it", so PARTIAL is capped here. Enforces the
// invariant NO < PARTIAL < YES regardless of modifier stacking.
export const PARTIAL_MAX_MULTIPLIER = 1.25;

/* ── Modifier bonuses (§6.2) ── */

export function computeModifier(signals: AttemptSignals): number {
  let mod = 0;
  const solvedAlone = signals.solvedIndependently === "YES";

  // Rewrote from scratch = YES → +0.5 (only meaningful if solved independently)
  if (solvedAlone && signals.rewroteFromScratch === "YES") mod += 0.5;

  // Confidence penalty applies even on YES solves: low confidence after a correct solve signals shallow
  // learning (lucky, not fluent). Removing it for YES would corrupt honest-reporting signal.
  if (signals.confidence >= 5) mod += 0.3;
  else if (signals.confidence >= 4) mod += 0.1;
  else if (signals.confidence <= 1) mod -= 0.4;
  else if (signals.confidence <= 2) mod -= 0.2;

  // Fast solve bonus — difficulty-scaled threshold, applies to all difficulties.
  // Easy < 5 min, Medium < 10 min, Hard < 15 min. Signals fluency with the pattern.
  const fastThreshold = signals.difficulty === "Hard" ? 15 : signals.difficulty === "Medium" ? 10 : 5;
  if (signals.solveTimeMinutes !== null && signals.solveTimeMinutes > 0 && signals.solveTimeMinutes < fastThreshold) {
    mod += 0.2;
  }

  return mod;
}

/* ── Core functions ── */

/** Compute retrievability: probability user can still solve this problem. */
export function computeRetrievability(
  stabilityDays: number,
  daysSinceReview: number,
): number {
  if (daysSinceReview <= 0) return 1.0;
  const r = Math.exp(-daysSinceReview / stabilityDays);
  return Math.max(r, RETRIEVABILITY_FLOOR);
}

/**
 * Effective stability multiplier = base (from outcome×quality) + modifiers,
 * with PARTIAL outcomes capped at PARTIAL_MAX_MULTIPLIER so "needed help" never
 * out-grows a clean solve. Shared by computeNewStability and computeInitialStability.
 *
 * Example — YES:OPTIMAL, confidence 5, no rewrite, Medium 20 min:
 *   base 2.5 + conf 0.3 + 0 + 0 = 2.8  → newS = oldS × 2.8 (clamped to [0.5, 365])
 *   initial: INITIAL_STABILITY_BASE (2.0) × 2.8 = 5.6 days
 * Matches README §Algorithm and ARCHITECTURE.md §6.2 — verified 2026-05-03.
 */
export function computeEffectiveMultiplier(signals: AttemptSignals): number {
  const key = `${signals.solvedIndependently}:${signals.solutionQuality}`;
  const baseMultiplier = BASE_MULTIPLIERS[key] ?? 1.0;
  const effective = baseMultiplier + computeModifier(signals);
  if (signals.solvedIndependently === "PARTIAL") {
    return Math.min(effective, PARTIAL_MAX_MULTIPLIER);
  }
  return effective;
}

/** Calculate new stability after an attempt. */
export function computeNewStability(
  oldStability: number,
  signals: AttemptSignals,
): number {
  const newS = oldStability * computeEffectiveMultiplier(signals);
  return clampStability(newS);
}

/** Calculate initial stability for a first attempt. */
export function computeInitialStability(signals: AttemptSignals): number {
  const s = INITIAL_STABILITY_BASE * computeEffectiveMultiplier(signals);
  return clampStability(s);
}

/** Compute next review date from stability, floored at MIN_REVIEW_INTERVAL_DAYS. */
export function computeNextReviewDate(
  stability: number,
  fromDate: Date = new Date(),
): Date {
  const intervalDays = Math.max(MIN_REVIEW_INTERVAL_DAYS, stability);
  const ms = intervalDays * 24 * 60 * 60 * 1000;
  return new Date(fromDate.getTime() + ms);
}

/** Clamp stability to valid range. */
export function clampStability(s: number): number {
  return Math.max(MIN_STABILITY, Math.min(MAX_STABILITY, s));
}

/* ── Personal difficulty factor (PDF) update — Option A: additive residual ── */
// See docs/files/SRS_UPDATE_FORMULATIONS.md for the full analysis and alternatives.

export const PDF_ALPHA = 0.1;
export const PDF_CLAMP: readonly [number, number] = [0.5, 2.0];
export const PDF_DEFAULT = 1.0;

/**
 * Update the personal difficulty factor after a review.
 *
 * Uses an additive residual (actual − predicted) bounded to [−PDF_ALPHA, +PDF_ALPHA]
 * per review. PDF > 1.0 means the user retains better than predicted (longer intervals);
 * PDF < 1.0 means they forget faster (shorter intervals).
 *
 * Not yet wired to the DB — will be applied in Phase 3 of ADAPTIVE_SRS.md.
 */
export function computePDFUpdate(
  currentPDF: number,
  predictedR: number,
  outcome: SolvedIndependently,
): number {
  const actual = outcome === "YES" ? 1.0 : outcome === "PARTIAL" ? 0.5 : 0.0;
  const residual = actual - predictedR;
  const updated = currentPDF + PDF_ALPHA * residual;
  return Math.max(PDF_CLAMP[0], Math.min(PDF_CLAMP[1], updated));
}

/* ── Review queue priority (§6.3) ── */

export interface PriorityInput {
  retrievability: number;
  blind75: boolean;
  difficulty: "Easy" | "Medium" | "Hard";
  categoryAvgR: number; // average retrievability for problems in this category
}

const DIFFICULTY_WEIGHT: Record<string, number> = {
  Easy: 0.8,
  Medium: 1.0,
  Hard: 1.1,
};

export function computeReviewPriority(input: PriorityInput): number {
  let weight = DIFFICULTY_WEIGHT[input.difficulty] ?? 1.0;

  // Blind 75 bonus
  if (input.blind75) weight += 0.2;

  // Category weakness bonus
  if (input.categoryAvgR < 0.6) weight += 0.3;

  return (1 - input.retrievability) * weight;
}

/* ── Readiness engine (§7) ── */

export interface ReadinessInput {
  totalProblems: number; // total in problem set (e.g. 150)
  attemptedCount: number;
  retainedCount: number; // problems with R > 0.7
  lowestCategoryAvgR: number; // 0–1
  reviewsCompletedPct: number; // % of scheduled reviews done in last 14 days (0–1)
  // pace is computed separately
}

export interface ReadinessResult {
  score: number; // 0–100
  tier: "S" | "A" | "B" | "C" | "D";
  coverage: number; // 0–1
  retention: number; // 0–1
  categoryBalance: number; // 0–1
  consistency: number; // 0–1
}

export function computeReadiness(input: ReadinessInput): ReadinessResult {
  const coverage = input.totalProblems > 0
    ? input.attemptedCount / input.totalProblems
    : 0;

  const retention = input.attemptedCount > 0
    ? input.retainedCount / input.attemptedCount
    : 0;

  const categoryBalance = input.lowestCategoryAvgR;
  const consistency = input.reviewsCompletedPct;

  // Weighted sum: coverage 30%, retention 40%, category balance 20%, consistency 10%
  const score = Math.round(
    (coverage * 30 + retention * 40 + categoryBalance * 20 + consistency * 10) * 100,
  ) / 100;

  const clamped = Math.max(0, Math.min(100, Math.round(score)));

  return {
    score: clamped,
    tier: scoreToTier(clamped),
    coverage,
    retention,
    categoryBalance,
    consistency,
  };
}

function scoreToTier(score: number): "S" | "A" | "B" | "C" | "D" {
  if (score >= 90) return "S";
  if (score >= 75) return "A";
  if (score >= 55) return "B";
  if (score >= 35) return "C";
  return "D";
}

