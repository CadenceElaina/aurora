import { describe, it, expect } from "vitest";
import {
  normalizeName,
  findProblem,
  parseTimeStr,
  parseActivityText,
  buildAttempt,
  groupIntoAttempts,
  type DbProblem,
  type RawRowWithDate,
} from "@/lib/import-parser";

// ── Helpers ──────────────────────────────────────────────────────────────────

const DATE = "2026-05-01";

function problem(id: number, title: string): DbProblem {
  return { id, title, leetcodeNumber: id, difficulty: "Medium", category: "Arrays" };
}

// ── normalizeName ─────────────────────────────────────────────────────────────

describe("normalizeName", () => {
  it("lowercases and strips non-alphanumeric", () => {
    expect(normalizeName("Two Sum")).toBe("twosum");
    expect(normalizeName("3Sum Closest")).toBe("3sumclosest");
    expect(normalizeName("LRU Cache")).toBe("lrucache");
    expect(normalizeName("N-Queens")).toBe("nqueens");
  });
});

// ── findProblem ───────────────────────────────────────────────────────────────

describe("findProblem", () => {
  const problems = [problem(1, "Two Sum"), problem(2, "Valid Anagram")];

  it("matches exact title", () => {
    expect(findProblem("Two Sum", problems)?.id).toBe(1);
  });

  it("matches case-insensitively", () => {
    expect(findProblem("two sum", problems)?.id).toBe(1);
    expect(findProblem("TWO SUM", problems)?.id).toBe(1);
  });

  it("strips punctuation before matching", () => {
    expect(findProblem("Two Sum!", problems)?.id).toBe(1);
  });

  it("returns null on no match", () => {
    expect(findProblem("Missing Number", problems)).toBeNull();
  });
});

// ── parseTimeStr ──────────────────────────────────────────────────────────────

describe("parseTimeStr", () => {
  it("parses standard PM time", () => {
    const d = parseTimeStr("2:30 PM", DATE);
    expect(d?.getHours()).toBe(14);
    expect(d?.getMinutes()).toBe(30);
  });

  it("parses standard AM time", () => {
    const d = parseTimeStr("9:05 AM", DATE);
    expect(d?.getHours()).toBe(9);
    expect(d?.getMinutes()).toBe(5);
  });

  it("handles 12:00 PM (noon)", () => {
    const d = parseTimeStr("12:00 PM", DATE);
    expect(d?.getHours()).toBe(12);
  });

  it("handles 12:00 AM (midnight)", () => {
    const d = parseTimeStr("12:00 AM", DATE);
    expect(d?.getHours()).toBe(0);
  });

  it("is case-insensitive for AM/PM", () => {
    const d = parseTimeStr("3:15 pm", DATE);
    expect(d?.getHours()).toBe(15);
  });

  it("returns null for blank/invalid string", () => {
    expect(parseTimeStr("", DATE)).toBeNull();
    expect(parseTimeStr("14:30", DATE)).toBeNull(); // 24-hour not supported
    expect(parseTimeStr("not-a-time", DATE)).toBeNull();
  });
});

// ── parseActivityText — Strategy 1 (tab-separated) ───────────────────────────

describe("parseActivityText — tab-separated", () => {
  it("parses a two-row tab-separated block", () => {
    const text = [
      "Two Sum\tEasy\tAccepted\tPython\t40 ms\t16.5 MB\t2:30 PM",
      "Valid Anagram\tEasy\tAccepted\tPython\t52 ms\t17.1 MB\t2:45 PM",
    ].join("\n");

    const rows = parseActivityText(text);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ title: "Two Sum", status: "Accepted", timeStr: "2:30 PM" });
    expect(rows[1]).toMatchObject({ title: "Valid Anagram", status: "Accepted", timeStr: "2:45 PM" });
  });

  it("filters header row when Problem is first column", () => {
    const text = [
      "Problem\tDifficulty\tStatus\tLanguage\tRuntime\tMemory\tTime",
      "Two Sum\tEasy\tAccepted\tPython\t40 ms\t16.5 MB\t2:30 PM",
    ].join("\n");

    const rows = parseActivityText(text);
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe("Two Sum");
  });

  it("handles Wrong Answer (not accepted) status", () => {
    const text = "Two Sum\tEasy\tWrong Answer\tPython\t40 ms\t16.5 MB\t2:30 PM";
    const rows = parseActivityText(text);
    expect(rows[0].status).toBe("Wrong Answer");
  });

  it("returns empty array for blank input", () => {
    expect(parseActivityText("")).toHaveLength(0);
    expect(parseActivityText("   \n\n")).toHaveLength(0);
  });
});

// ── parseActivityText — Strategy 2 (cell-per-line) ───────────────────────────

describe("parseActivityText — cell-per-line", () => {
  it("parses NeetCode cell-per-line format", () => {
    const text = [
      "Problem",
      "Two Sum",
      "Easy",
      "Accepted",
      "Python",
      "40 ms",
      "16.5 MB",
      "2:30 PM",
    ].join("\n");

    const rows = parseActivityText(text);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ title: "Two Sum", status: "Accepted", timeStr: "2:30 PM" });
  });

  it("skips table header column names (difficulty, status, etc.)", () => {
    const text = [
      "Problem",
      "difficulty",   // would be skipped
      "Two Sum",
      "Easy",
      "Accepted",
      "Python",
      "40 ms",
      "16.5 MB",
      "2:30 PM",
    ].join("\n");

    const rows = parseActivityText(text);
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe("Two Sum");
  });

  it("handles stats section before Problem header", () => {
    const text = [
      "January 2026",
      "15",
      "submissions",
      "Problem",
      "Two Sum",
      "Easy",
      "Accepted",
      "Python",
      "40 ms",
      "16.5 MB",
      "2:30 PM",
    ].join("\n");

    const rows = parseActivityText(text);
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe("Two Sum");
  });

  it("falls back to cell-per-line when no tab-separated rows detected", () => {
    // No tabs in input — should try Strategy 2
    const text = [
      "Two Sum",
      "Easy",
      "Accepted",
      "Python",
      "40 ms",
      "16.5 MB",
      "2:30 PM",
    ].join("\n");

    const rows = parseActivityText(text);
    expect(rows).toHaveLength(1);
  });
});

// ── buildAttempt ──────────────────────────────────────────────────────────────

describe("buildAttempt", () => {
  const problems = [problem(1, "Two Sum")];
  const emptySet = new Set<number>();
  const date = new Date(DATE + "T14:30:00");

  function row(title: string, status: string, d: Date | null = date): RawRowWithDate {
    return { title, status, timeStr: "2:30 PM", date: d };
  }

  it("defaults to SOLVED / OPTIMAL / confidence 3 for accepted", () => {
    const a = buildAttempt("0", [row("Two Sum", "Accepted")], problems, emptySet);
    expect(a.outcome).toBe("SOLVED");
    expect(a.quality).toBe("OPTIMAL");
    expect(a.confidence).toBe(3);
    expect(a.solvedStatus).toBe("accepted");
  });

  it("defaults to NO_SOLUTION for non-accepted", () => {
    const a = buildAttempt("0", [row("Two Sum", "Wrong Answer")], problems, emptySet);
    expect(a.outcome).toBe("NO_SOLUTION");
    expect(a.solvedStatus).toBe("not_accepted");
  });

  it("matches problem from title", () => {
    const a = buildAttempt("0", [row("Two Sum", "Accepted")], problems, emptySet);
    expect(a.matchedProblem?.id).toBe(1);
  });

  it("sets matchedProblem to null for unrecognised title", () => {
    const a = buildAttempt("0", [row("Missing Number", "Accepted")], problems, emptySet);
    expect(a.matchedProblem).toBeNull();
  });

  it("isReview is true when problem is in attemptedSet", () => {
    const attempted = new Set([1]);
    const a = buildAttempt("0", [row("Two Sum", "Accepted")], problems, attempted);
    expect(a.isReview).toBe(true);
  });

  it("isReview is false when problem is not in attemptedSet", () => {
    const a = buildAttempt("0", [row("Two Sum", "Accepted")], problems, emptySet);
    expect(a.isReview).toBe(false);
  });

  it("solveTimeMinutes floors at 5 for accepted with single submission", () => {
    const a = buildAttempt("0", [row("Two Sum", "Accepted")], problems, emptySet);
    expect(a.solveTimeMinutes).toBe(5); // single row → diffMin=0, max(5, 0+5)=5
  });

  it("solveTimeMinutes floors at 15 for failed with single submission", () => {
    const a = buildAttempt("0", [row("Two Sum", "Wrong Answer")], problems, emptySet);
    expect(a.solveTimeMinutes).toBe(15);
  });

  it("solveTimeMinutes reflects time span across multiple submissions", () => {
    const t1 = new Date(DATE + "T14:00:00");
    const t2 = new Date(DATE + "T14:20:00"); // 20 min later
    const rows: RawRowWithDate[] = [
      { title: "Two Sum", status: "Wrong Answer", timeStr: "2:00 PM", date: t1 },
      { title: "Two Sum", status: "Accepted", timeStr: "2:20 PM", date: t2 },
    ];
    const a = buildAttempt("0", rows, problems, emptySet);
    expect(a.solveTimeMinutes).toBe(25); // diffMin=20, max(5, 20+5)=25
  });
});

// ── groupIntoAttempts ─────────────────────────────────────────────────────────

describe("groupIntoAttempts", () => {
  const problems = [problem(1, "Two Sum"), problem(2, "Valid Anagram")];
  const emptySet = new Set<number>();

  it("produces one attempt per unique problem", () => {
    const rows = [
      { title: "Two Sum", status: "Accepted", timeStr: "2:30 PM" },
      { title: "Valid Anagram", status: "Accepted", timeStr: "2:45 PM" },
    ];
    const attempts = groupIntoAttempts(rows, DATE, problems, emptySet);
    expect(attempts).toHaveLength(2);
  });

  it("merges multiple submissions of the same problem within 60 min", () => {
    const rows = [
      { title: "Two Sum", status: "Wrong Answer", timeStr: "2:00 PM" },
      { title: "Two Sum", status: "Accepted", timeStr: "2:30 PM" },
    ];
    const attempts = groupIntoAttempts(rows, DATE, problems, emptySet);
    expect(attempts).toHaveLength(1);
    expect(attempts[0].outcome).toBe("SOLVED"); // final status wins
  });

  it("splits into two attempts when gap > 60 min", () => {
    const rows = [
      { title: "Two Sum", status: "Wrong Answer", timeStr: "10:00 AM" },
      { title: "Two Sum", status: "Accepted", timeStr: "12:30 PM" }, // 150 min gap
    ];
    const attempts = groupIntoAttempts(rows, DATE, problems, emptySet);
    expect(attempts).toHaveLength(2);
  });

  it("sorts attempts by earliest submission time", () => {
    const rows = [
      { title: "Valid Anagram", status: "Accepted", timeStr: "3:00 PM" },
      { title: "Two Sum", status: "Accepted", timeStr: "2:00 PM" },
    ];
    const attempts = groupIntoAttempts(rows, DATE, problems, emptySet);
    expect(attempts[0].matchedProblem?.id).toBe(1); // Two Sum was earlier
    expect(attempts[1].matchedProblem?.id).toBe(2);
  });

  it("handles unrecognized problem titles gracefully", () => {
    const rows = [{ title: "Unknown Problem XYZ", status: "Accepted", timeStr: "2:30 PM" }];
    const attempts = groupIntoAttempts(rows, DATE, problems, emptySet);
    expect(attempts).toHaveLength(1);
    expect(attempts[0].matchedProblem).toBeNull();
  });
});
