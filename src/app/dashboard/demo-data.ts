/**
 * Static demo data for the signed-out dashboard preview.
 * Shows a realistic user ~3 weeks into their interview prep.
 */

const today = new Date();
const daysAgo = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return d.toISOString();
};
const dateStr = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

// Review queue: problems due for review (realistic overdue items)
const reviewQueue = [
  { stateId: "d1", problemId: 1, title: "Two Sum", leetcodeNumber: 1, neetcodeUrl: null, difficulty: "Easy" as const, category: "Arrays & Hashing", totalAttempts: 3, daysOverdue: 2, retrievability: 0.45, lastReviewedAt: daysAgo(8) },
  { stateId: "d2", problemId: 3, title: "Group Anagrams", leetcodeNumber: 49, neetcodeUrl: null, difficulty: "Medium" as const, category: "Arrays & Hashing", totalAttempts: 2, daysOverdue: 1, retrievability: 0.52, lastReviewedAt: daysAgo(6) },
  { stateId: "d3", problemId: 11, title: "Container With Most Water", leetcodeNumber: 11, neetcodeUrl: null, difficulty: "Medium" as const, category: "Two Pointers", totalAttempts: 2, daysOverdue: 3, retrievability: 0.38, lastReviewedAt: daysAgo(10) },
  { stateId: "d4", problemId: 15, title: "Valid Palindrome", leetcodeNumber: 125, neetcodeUrl: null, difficulty: "Easy" as const, category: "Two Pointers", totalAttempts: 2, daysOverdue: 1, retrievability: 0.61, lastReviewedAt: daysAgo(5) },
  { stateId: "d5", problemId: 20, title: "Min Stack", leetcodeNumber: 155, neetcodeUrl: null, difficulty: "Medium" as const, category: "Stack", totalAttempts: 1, daysOverdue: 4, retrievability: 0.31, lastReviewedAt: daysAgo(11) },
  { stateId: "d6", problemId: 21, title: "Evaluate Reverse Polish Notation", leetcodeNumber: 150, neetcodeUrl: null, difficulty: "Medium" as const, category: "Stack", totalAttempts: 1, daysOverdue: 2, retrievability: 0.48, lastReviewedAt: daysAgo(7) },
  { stateId: "d7", problemId: 30, title: "Binary Search", leetcodeNumber: 704, neetcodeUrl: null, difficulty: "Easy" as const, category: "Binary Search", totalAttempts: 2, daysOverdue: 1, retrievability: 0.55, lastReviewedAt: daysAgo(5) },
  { stateId: "d8", problemId: 42, title: "Trapping Rain Water", leetcodeNumber: 42, neetcodeUrl: null, difficulty: "Hard" as const, category: "Two Pointers", totalAttempts: 3, daysOverdue: 5, retrievability: 0.22, lastReviewedAt: daysAgo(12) },
];

// New problems (unattempted) — show first several from the curriculum
const newProblems = [
  { id: 35, leetcodeNumber: 33, title: "Search in Rotated Sorted Array", neetcodeUrl: null, difficulty: "Medium" as const, category: "Binary Search", blind75: true, leetcodeUrl: "" },
  { id: 36, leetcodeNumber: 153, title: "Find Minimum in Rotated Sorted Array", neetcodeUrl: null, difficulty: "Medium" as const, category: "Binary Search", blind75: true, leetcodeUrl: "" },
  { id: 37, leetcodeNumber: 981, title: "Time Based Key-Value Store", neetcodeUrl: null, difficulty: "Medium" as const, category: "Binary Search", blind75: false, leetcodeUrl: "" },
  { id: 38, leetcodeNumber: 4, title: "Median of Two Sorted Arrays", neetcodeUrl: null, difficulty: "Hard" as const, category: "Binary Search", blind75: true, leetcodeUrl: "" },
  { id: 40, leetcodeNumber: 206, title: "Reverse Linked List", neetcodeUrl: null, difficulty: "Easy" as const, category: "Linked List", blind75: true, leetcodeUrl: "" },
  { id: 41, leetcodeNumber: 21, title: "Merge Two Sorted Lists", neetcodeUrl: null, difficulty: "Easy" as const, category: "Linked List", blind75: true, leetcodeUrl: "" },
  { id: 42, leetcodeNumber: 143, title: "Reorder List", neetcodeUrl: null, difficulty: "Medium" as const, category: "Linked List", blind75: true, leetcodeUrl: "" },
  { id: 43, leetcodeNumber: 19, title: "Remove Nth Node From End of List", neetcodeUrl: null, difficulty: "Medium" as const, category: "Linked List", blind75: true, leetcodeUrl: "" },
];

// Completed problems (all attempted, some due & some not)
const completedProblems = [
  { problemId: 1, title: "Two Sum", leetcodeNumber: 1, difficulty: "Easy" as const, category: "Arrays & Hashing", totalAttempts: 3, retrievability: 0.45, stability: 12, lastReviewedAt: daysAgo(8), daysUntilReview: null, isDue: true, bestQuality: "optimal" },
  { problemId: 5, title: "Contains Duplicate", leetcodeNumber: 217, difficulty: "Easy" as const, category: "Arrays & Hashing", totalAttempts: 3, retrievability: 0.89, stability: 28, lastReviewedAt: daysAgo(3), daysUntilReview: 8, isDue: false, bestQuality: "optimal" },
  { problemId: 7, title: "Valid Anagram", leetcodeNumber: 242, difficulty: "Easy" as const, category: "Arrays & Hashing", totalAttempts: 4, retrievability: 0.94, stability: 45, lastReviewedAt: daysAgo(2), daysUntilReview: 14, isDue: false, bestQuality: "optimal" },
  { problemId: 3, title: "Group Anagrams", leetcodeNumber: 49, difficulty: "Medium" as const, category: "Arrays & Hashing", totalAttempts: 2, retrievability: 0.52, stability: 8, lastReviewedAt: daysAgo(6), daysUntilReview: null, isDue: true, bestQuality: "optimal" },
  { problemId: 9, title: "Top K Frequent Elements", leetcodeNumber: 347, difficulty: "Medium" as const, category: "Arrays & Hashing", totalAttempts: 2, retrievability: 0.71, stability: 15, lastReviewedAt: daysAgo(4), daysUntilReview: 3, isDue: false, bestQuality: "optimal" },
  { problemId: 6, title: "Product of Array Except Self", leetcodeNumber: 238, difficulty: "Medium" as const, category: "Arrays & Hashing", totalAttempts: 2, retrievability: 0.65, stability: 11, lastReviewedAt: daysAgo(5), daysUntilReview: 2, isDue: false, bestQuality: "optimal" },
  { problemId: 11, title: "Container With Most Water", leetcodeNumber: 11, difficulty: "Medium" as const, category: "Two Pointers", totalAttempts: 2, retrievability: 0.38, stability: 7, lastReviewedAt: daysAgo(10), daysUntilReview: null, isDue: true, bestQuality: "brute_force" },
  { problemId: 15, title: "Valid Palindrome", leetcodeNumber: 125, difficulty: "Easy" as const, category: "Two Pointers", totalAttempts: 2, retrievability: 0.61, stability: 9, lastReviewedAt: daysAgo(5), daysUntilReview: null, isDue: true, bestQuality: "optimal" },
  { problemId: 42, title: "Trapping Rain Water", leetcodeNumber: 42, difficulty: "Hard" as const, category: "Two Pointers", totalAttempts: 3, retrievability: 0.22, stability: 5, lastReviewedAt: daysAgo(12), daysUntilReview: null, isDue: true, bestQuality: "brute_force" },
  { problemId: 20, title: "Min Stack", leetcodeNumber: 155, difficulty: "Medium" as const, category: "Stack", totalAttempts: 1, retrievability: 0.31, stability: 4, lastReviewedAt: daysAgo(11), daysUntilReview: null, isDue: true, bestQuality: "optimal" },
  { problemId: 21, title: "Evaluate Reverse Polish Notation", leetcodeNumber: 150, difficulty: "Medium" as const, category: "Stack", totalAttempts: 1, retrievability: 0.48, stability: 6, lastReviewedAt: daysAgo(7), daysUntilReview: null, isDue: true, bestQuality: "optimal" },
  { problemId: 30, title: "Binary Search", leetcodeNumber: 704, difficulty: "Easy" as const, category: "Binary Search", totalAttempts: 2, retrievability: 0.55, stability: 8, lastReviewedAt: daysAgo(5), daysUntilReview: null, isDue: true, bestQuality: "optimal" },
  { problemId: 31, title: "Search a 2D Matrix", leetcodeNumber: 74, difficulty: "Medium" as const, category: "Binary Search", totalAttempts: 1, retrievability: 0.67, stability: 10, lastReviewedAt: daysAgo(4), daysUntilReview: 2, isDue: false, bestQuality: "optimal" },
  { problemId: 25, title: "Best Time to Buy and Sell Stock", leetcodeNumber: 121, difficulty: "Easy" as const, category: "Sliding Window", totalAttempts: 3, retrievability: 0.82, stability: 22, lastReviewedAt: daysAgo(3), daysUntilReview: 6, isDue: false, bestQuality: "optimal" },
  { problemId: 26, title: "Longest Substring Without Repeating Characters", leetcodeNumber: 3, difficulty: "Medium" as const, category: "Sliding Window", totalAttempts: 2, retrievability: 0.58, stability: 9, lastReviewedAt: daysAgo(6), daysUntilReview: 1, isDue: false, bestQuality: "optimal" },
  { problemId: 4, title: "Longest Consecutive Sequence", leetcodeNumber: 128, difficulty: "Medium" as const, category: "Arrays & Hashing", totalAttempts: 2, retrievability: 0.73, stability: 14, lastReviewedAt: daysAgo(4), daysUntilReview: 4, isDue: false, bestQuality: "optimal" },
];

// Activity history (14 days)
const attemptHistory = Array.from({ length: 14 }, (_, i) => {
  const idx = 13 - i;
  const counts = [2, 0, 3, 4, 2, 0, 5, 3, 4, 6, 3, 5, 4, 0];
  const newCounts = [1, 0, 1, 2, 1, 0, 2, 1, 2, 3, 1, 2, 2, 0];
  const c = counts[idx] ?? 0;
  const n = newCounts[idx] ?? 0;
  return { date: dateStr(idx), count: c, newCount: n, reviewCount: c - n };
});

const fullAttemptHistory = [...attemptHistory];

// Category stats
const categoryStats = [
  { category: "Arrays & Hashing", total: 9, attempted: 7, avgRetention: 0.72 },
  { category: "Two Pointers", total: 5, attempted: 3, avgRetention: 0.40 },
  { category: "Sliding Window", total: 6, attempted: 2, avgRetention: 0.70 },
  { category: "Stack", total: 7, attempted: 2, avgRetention: 0.40 },
  { category: "Binary Search", total: 7, attempted: 2, avgRetention: 0.61 },
  { category: "Linked List", total: 11, attempted: 0, avgRetention: 0 },
  { category: "Trees", total: 15, attempted: 0, avgRetention: 0 },
  { category: "Tries", total: 3, attempted: 0, avgRetention: 0 },
  { category: "Heap / Priority Queue", total: 7, attempted: 0, avgRetention: 0 },
  { category: "Backtracking", total: 9, attempted: 0, avgRetention: 0 },
  { category: "Graphs", total: 13, attempted: 0, avgRetention: 0 },
  { category: "Advanced Graphs", total: 6, attempted: 0, avgRetention: 0 },
  { category: "1-D Dynamic Programming", total: 12, attempted: 0, avgRetention: 0 },
  { category: "2-D Dynamic Programming", total: 11, attempted: 0, avgRetention: 0 },
  { category: "Greedy", total: 8, attempted: 0, avgRetention: 0 },
  { category: "Intervals", total: 6, attempted: 0, avgRetention: 0 },
  { category: "Math & Geometry", total: 8, attempted: 0, avgRetention: 0 },
  { category: "Bit Manipulation", total: 7, attempted: 0, avgRetention: 0 },
];

const difficultyBreakdown = [
  { difficulty: "Easy", count: 28, attempted: 6 },
  { difficulty: "Medium", count: 101, attempted: 8 },
  { difficulty: "Hard", count: 21, attempted: 1 },
];

const masteryList = [
  { problemId: 7, title: "Valid Anagram", leetcodeNumber: 242, stability: 45, category: "Arrays & Hashing" },
];

const learningList = [
  { problemId: 5, title: "Contains Duplicate", leetcodeNumber: 217, stability: 28, category: "Arrays & Hashing" },
  { problemId: 25, title: "Best Time to Buy and Sell Stock", leetcodeNumber: 121, stability: 22, category: "Sliding Window" },
  { problemId: 9, title: "Top K Frequent Elements", leetcodeNumber: 347, stability: 15, category: "Arrays & Hashing" },
  { problemId: 4, title: "Longest Consecutive Sequence", leetcodeNumber: 128, stability: 14, category: "Arrays & Hashing" },
  { problemId: 1, title: "Two Sum", leetcodeNumber: 1, stability: 12, category: "Arrays & Hashing" },
  { problemId: 6, title: "Product of Array Except Self", leetcodeNumber: 238, stability: 11, category: "Arrays & Hashing" },
  { problemId: 31, title: "Search a 2D Matrix", leetcodeNumber: 74, stability: 10, category: "Binary Search" },
  { problemId: 26, title: "Longest Substring Without Repeating Characters", leetcodeNumber: 3, stability: 9, category: "Sliding Window" },
  { problemId: 15, title: "Valid Palindrome", leetcodeNumber: 125, stability: 9, category: "Two Pointers" },
  { problemId: 3, title: "Group Anagrams", leetcodeNumber: 49, stability: 8, category: "Arrays & Hashing" },
  { problemId: 30, title: "Binary Search", leetcodeNumber: 704, stability: 8, category: "Binary Search" },
  { problemId: 11, title: "Container With Most Water", leetcodeNumber: 11, stability: 7, category: "Two Pointers" },
  { problemId: 21, title: "Evaluate Reverse Polish Notation", leetcodeNumber: 150, stability: 6, category: "Stack" },
  { problemId: 42, title: "Trapping Rain Water", leetcodeNumber: 42, stability: 5, category: "Two Pointers" },
  { problemId: 20, title: "Min Stack", leetcodeNumber: 155, stability: 4, category: "Stack" },
];

// Import problems (subset for demo — not interactive anyway)
const importProblems = [
  { id: 1, title: "Two Sum", leetcodeNumber: 1, difficulty: "Easy" as const, category: "Arrays & Hashing" },
];

export const DEMO_DASHBOARD_DATA = {
  reviewQueue,
  newProblems,
  completedProblems,
  totalProblems: 150,
  attemptedCount: 15,
  retainedCount: 9,
  readiness: { score: 28, tier: "D" as const },
  readinessBreakdown: { coverage: 0.10, retention: 0.60, categoryBalance: 0.22, consistency: 0.71 },
  currentStreak: 4,
  bestStreak: 6,
  avgPerDay: 2.9,
  avgNewPerDay: 1.1,
  avgReviewPerDay: 1.8,
  overallPerDay: 2.4,
  overallNewPerDay: 0.8,
  overallReviewPerDay: 1.6,
  categoryStats,
  difficultyBreakdown,
  attemptHistory,
  fullAttemptHistory,
  totalSolveMinutes: 320,
  totalStudyMinutes: 180,
  avgSolveMinutes: 18,
  avgConfidence: 3.2,
  masteredCount: 1,
  learningCount: 14,
  masteryList,
  learningList,
  importProblems,
  importAttemptedIds: completedProblems.map(p => p.problemId),
  importTodayAttemptedIds: [],
  pendingSubmissions: [],
};
