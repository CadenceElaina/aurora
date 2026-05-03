/**
 * Pure parsing functions for the NeetCode activity import flow.
 * Extracted here so they can be unit-tested without a browser environment.
 */

export type DbProblem = {
  id: number;
  title: string;
  leetcodeNumber: number | null;
  difficulty: "Easy" | "Medium" | "Hard";
  category: string;
};

export type RawRow = { title: string; status: string; timeStr: string };
export type RawRowWithDate = RawRow & { date: Date | null };

export type ImportAttempt = {
  id: string;
  rawTitle: string;
  matchedProblem: DbProblem | null;
  isReview: boolean;
  solvedStatus: "accepted" | "not_accepted";
  solveTimeMinutes: number;
  outcome: "SOLVED" | "PARTIAL" | "NO_SOLUTION";
  quality: "OPTIMAL" | "BRUTE_FORCE";
  confidence: number;
  notes: string;
  deleted: boolean;
  submitStatus: "idle" | "submitting" | "done" | "skipped" | "error";
  submitError: string | null;
  forceSubmit?: boolean;
};

export function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function findProblem(title: string, problems: DbProblem[]): DbProblem | null {
  const norm = normalizeName(title);
  return problems.find((p) => normalizeName(p.title) === norm) ?? null;
}

export function parseTimeStr(timeStr: string, dateStr: string): Date | null {
  const m = timeStr.trim().match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const meridian = m[3].toUpperCase();
  if (meridian === "PM" && h !== 12) h += 12;
  if (meridian === "AM" && h === 12) h = 0;
  const d = new Date(dateStr + "T00:00:00");
  d.setHours(h, min, 0, 0);
  return d;
}

// Column header cells to skip when NeetCode copies one cell per line
const TABLE_HEADER_COLS = new Set(["difficulty", "status", "language", "runtime", "memory", "time"]);
const DIFFICULTIES = new Set(["easy", "medium", "hard"]);

export function parseActivityText(text: string): RawRow[] {
  // Strategy 1: tab-separated — each row on one line
  // Format: title\tdifficulty\tstatus\tlanguage\truntime\tmemory\ttime
  const singleLines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const tabRows: RawRow[] = [];
  for (const line of singleLines) {
    const parts = line.split("\t").filter((p) => p.trim());
    if (parts.length >= 7) {
      const title = parts[0].trim();
      if (!title || normalizeName(title) === "problem") continue;
      tabRows.push({ title, status: parts[2].trim(), timeStr: parts[6].trim() });
    }
  }
  if (tabRows.length > 0) return tabRows;

  // Strategy 2: NeetCode "actual copy" — one table cell per line
  // NeetCode's activity page sometimes copies each cell on its own line.
  // Filter out known header cell values, then use a sliding window of 7.
  const contentLines = text
    .split("\n")
    .map((l) => l.replace(/\t/g, "").trim())
    .filter((l) => l && !TABLE_HEADER_COLS.has(l.toLowerCase()));

  // Skip stats section above the "Problem" header row
  const problemIdx = contentLines.findIndex((l) => l.toLowerCase() === "problem");
  const dataLines = problemIdx >= 0 ? contentLines.slice(problemIdx + 1) : contentLines;

  // Sliding window: every 7 lines = [title, difficulty, status, language, runtime, memory, time]
  // If line[1] is not a difficulty token, advance by 1 (handles stray lines).
  const rows: RawRow[] = [];
  let i = 0;
  while (i + 6 < dataLines.length) {
    const [title, diff, status, , , , timeStr] = dataLines.slice(i, i + 7);
    if (DIFFICULTIES.has(diff?.toLowerCase() ?? "")) {
      rows.push({ title: title.trim(), status: status.trim(), timeStr: timeStr.trim() });
      i += 7;
    } else {
      i += 1;
    }
  }
  return rows;
}

export function buildAttempt(
  id: string,
  rows: RawRowWithDate[],
  allProblems: DbProblem[],
  attemptedSet: Set<number>,
): ImportAttempt {
  const rawTitle = rows[0].title;
  const matchedProblem = findProblem(rawTitle, allProblems);
  const isReview = matchedProblem ? attemptedSet.has(matchedProblem.id) : false;
  const accepted = rows.some((r) => r.status === "Accepted");

  const dates = rows.map((r) => r.date).filter(Boolean) as Date[];
  const firstMs = dates.length > 0 ? Math.min(...dates.map((d) => d.getTime())) : null;
  const lastMs = dates.length > 0 ? Math.max(...dates.map((d) => d.getTime())) : null;
  const diffMin = firstMs && lastMs ? Math.round((lastMs - firstMs) / 60000) : 0;
  // Floor at 5 min for accepted (quick solve), 15 min for failed attempts
  const solveTimeMinutes = Math.max(accepted ? 5 : 15, diffMin + 5);

  return {
    id,
    rawTitle,
    matchedProblem,
    isReview,
    solvedStatus: accepted ? "accepted" : "not_accepted",
    solveTimeMinutes,
    outcome: accepted ? "SOLVED" : "NO_SOLUTION",
    quality: "OPTIMAL",
    confidence: 3,
    notes: "",
    deleted: false,
    submitStatus: "idle",
    submitError: null,
  };
}

export function groupIntoAttempts(
  rows: RawRow[],
  dateStr: string,
  allProblems: DbProblem[],
  attemptedSet: Set<number>,
): ImportAttempt[] {
  const withDates: RawRowWithDate[] = rows.map((r) => ({
    ...r,
    date: parseTimeStr(r.timeStr, dateStr),
  }));

  // Group rows by normalized title
  const byTitle = new Map<string, RawRowWithDate[]>();
  for (const r of withDates) {
    const key = normalizeName(r.title);
    if (!byTitle.has(key)) byTitle.set(key, []);
    byTitle.get(key)!.push(r);
  }

  const sessions: Array<{ firstMs: number; attempt: ImportAttempt }> = [];
  let idx = 0;

  for (const group of byTitle.values()) {
    const sorted = [...group].sort((a, b) => {
      if (!a.date || !b.date) return 0;
      return a.date.getTime() - b.date.getTime();
    });

    // Split on >60 min gap = separate attempt session for the same problem
    let current: RawRowWithDate[] = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      const prev = current[current.length - 1];
      const curr = sorted[i];
      const gapMin =
        prev.date && curr.date
          ? (curr.date.getTime() - prev.date.getTime()) / 60000
          : 0;
      if (gapMin > 60) {
        const a = buildAttempt(`${idx++}`, current, allProblems, attemptedSet);
        const firstDate = current.find((r) => r.date)?.date ?? null;
        sessions.push({ firstMs: firstDate?.getTime() ?? idx, attempt: a });
        current = [curr];
      } else {
        current.push(curr);
      }
    }
    const a = buildAttempt(`${idx++}`, current, allProblems, attemptedSet);
    const firstDate = current.find((r) => r.date)?.date ?? null;
    sessions.push({ firstMs: firstDate?.getTime() ?? idx, attempt: a });
  }

  // Sort by earliest submission time so the UI shows problems in solve order
  sessions.sort((a, b) => a.firstMs - b.firstMs);
  return sessions.map((s) => s.attempt);
}
