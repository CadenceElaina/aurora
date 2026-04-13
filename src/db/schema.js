"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.drillAttempts = exports.userDrillStates = exports.syntaxDrills = exports.drillConfidenceEnum = exports.drillLevelEnum = exports.pendingSubmissions = exports.userProblemStates = exports.attempts = exports.problems = exports.verificationTokens = exports.sessions = exports.accounts = exports.users = exports.pendingStatusEnum = exports.attemptSourceEnum = exports.rewroteEnum = exports.qualityEnum = exports.solvedEnum = exports.listSourceEnum = exports.difficultyEnum = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
/* ── Enums ── */
exports.difficultyEnum = (0, pg_core_1.pgEnum)("difficulty", [
    "Easy",
    "Medium",
    "Hard",
]);
exports.listSourceEnum = (0, pg_core_1.pgEnum)("list_source", [
    "NEETCODE_150",
    "NEETCODE_250",
    "CUSTOM",
]);
exports.solvedEnum = (0, pg_core_1.pgEnum)("solved_independently", [
    "YES",
    "PARTIAL",
    "NO",
]);
exports.qualityEnum = (0, pg_core_1.pgEnum)("solution_quality", [
    "OPTIMAL",
    "SUBOPTIMAL",
    "BRUTE_FORCE",
    "NONE",
]);
exports.rewroteEnum = (0, pg_core_1.pgEnum)("rewrote_from_scratch", [
    "YES",
    "NO",
    "DID_NOT_ATTEMPT",
]);
exports.attemptSourceEnum = (0, pg_core_1.pgEnum)("attempt_source", [
    "manual",
    "import",
    "github",
]);
exports.pendingStatusEnum = (0, pg_core_1.pgEnum)("pending_status", [
    "pending",
    "confirmed",
    "dismissed",
]);
/* ── Users (NextAuth compatible) ── */
exports.users = (0, pg_core_1.pgTable)("user", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    name: (0, pg_core_1.varchar)("name", { length: 255 }),
    email: (0, pg_core_1.varchar)("email", { length: 255 }).unique(),
    emailVerified: (0, pg_core_1.timestamp)("email_verified", { mode: "date" }),
    image: (0, pg_core_1.text)("image"),
    targetDate: (0, pg_core_1.date)("target_date"),
    githubRepo: (0, pg_core_1.varchar)("github_repo", { length: 255 }),
    githubWebhookSecret: (0, pg_core_1.varchar)("github_webhook_secret", { length: 255 }),
    githubConnectedAt: (0, pg_core_1.timestamp)("github_connected_at"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
exports.accounts = (0, pg_core_1.pgTable)("account", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)("user_id")
        .notNull()
        .references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    type: (0, pg_core_1.varchar)("type", { length: 255 }).notNull(),
    provider: (0, pg_core_1.varchar)("provider", { length: 255 }).notNull(),
    providerAccountId: (0, pg_core_1.varchar)("provider_account_id", { length: 255 }).notNull(),
    refresh_token: (0, pg_core_1.text)("refresh_token"),
    access_token: (0, pg_core_1.text)("access_token"),
    expires_at: (0, pg_core_1.integer)("expires_at"),
    token_type: (0, pg_core_1.varchar)("token_type", { length: 255 }),
    scope: (0, pg_core_1.varchar)("scope", { length: 255 }),
    id_token: (0, pg_core_1.text)("id_token"),
    session_state: (0, pg_core_1.varchar)("session_state", { length: 255 }),
});
exports.sessions = (0, pg_core_1.pgTable)("session", {
    sessionToken: (0, pg_core_1.varchar)("session_token", { length: 255 })
        .notNull()
        .primaryKey(),
    userId: (0, pg_core_1.uuid)("user_id")
        .notNull()
        .references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    expires: (0, pg_core_1.timestamp)("expires", { mode: "date" }).notNull(),
});
exports.verificationTokens = (0, pg_core_1.pgTable)("verification_token", {
    identifier: (0, pg_core_1.varchar)("identifier", { length: 255 }).notNull(),
    token: (0, pg_core_1.varchar)("token", { length: 255 }).notNull(),
    expires: (0, pg_core_1.timestamp)("expires", { mode: "date" }).notNull(),
});
/* ── Problems ── */
exports.problems = (0, pg_core_1.pgTable)("problem", {
    id: (0, pg_core_1.integer)("id").primaryKey(),
    leetcodeNumber: (0, pg_core_1.integer)("leetcode_number").unique(),
    title: (0, pg_core_1.varchar)("title", { length: 255 }).notNull(),
    difficulty: (0, exports.difficultyEnum)("difficulty").notNull(),
    category: (0, pg_core_1.varchar)("category", { length: 100 }).notNull(),
    leetcodeUrl: (0, pg_core_1.text)("leetcode_url").notNull(),
    neetcodeUrl: (0, pg_core_1.text)("neetcode_url"),
    videoId: (0, pg_core_1.varchar)("video_id", { length: 20 }),
    listSource: (0, exports.listSourceEnum)("list_source").notNull().default("NEETCODE_150"),
    blind75: (0, pg_core_1.boolean)("blind75").notNull().default(false),
    optimalTimeComplexity: (0, pg_core_1.varchar)("optimal_time_complexity", { length: 50 }),
    optimalSpaceComplexity: (0, pg_core_1.varchar)("optimal_space_complexity", { length: 50 }),
});
/* ── Attempts ── */
exports.attempts = (0, pg_core_1.pgTable)("attempt", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)("user_id")
        .notNull()
        .references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    problemId: (0, pg_core_1.integer)("problem_id")
        .notNull()
        .references(function () { return exports.problems.id; }, { onDelete: "cascade" }),
    solvedIndependently: (0, exports.solvedEnum)("solved_independently").notNull(),
    solutionQuality: (0, exports.qualityEnum)("solution_quality").notNull(),
    userTimeComplexity: (0, pg_core_1.varchar)("user_time_complexity", { length: 50 }).notNull(),
    userSpaceComplexity: (0, pg_core_1.varchar)("user_space_complexity", {
        length: 50,
    }).notNull(),
    timeComplexityCorrect: (0, pg_core_1.boolean)("time_complexity_correct"),
    spaceComplexityCorrect: (0, pg_core_1.boolean)("space_complexity_correct"),
    solveTimeMinutes: (0, pg_core_1.integer)("solve_time_minutes"),
    studyTimeMinutes: (0, pg_core_1.integer)("study_time_minutes"),
    rewroteFromScratch: (0, exports.rewroteEnum)("rewrote_from_scratch"),
    confidence: (0, pg_core_1.smallint)("confidence").notNull(),
    code: (0, pg_core_1.text)("code"),
    notes: (0, pg_core_1.text)("notes"),
    source: (0, exports.attemptSourceEnum)("source").notNull().default("manual"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
/* ── User Problem State (spaced repetition state) ── */
exports.userProblemStates = (0, pg_core_1.pgTable)("user_problem_state", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)("user_id")
        .notNull()
        .references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    problemId: (0, pg_core_1.integer)("problem_id")
        .notNull()
        .references(function () { return exports.problems.id; }, { onDelete: "cascade" }),
    stability: (0, pg_core_1.real)("stability").notNull().default(0.5),
    lastReviewedAt: (0, pg_core_1.timestamp)("last_reviewed_at"),
    nextReviewAt: (0, pg_core_1.timestamp)("next_review_at"),
    totalAttempts: (0, pg_core_1.integer)("total_attempts").notNull().default(0),
    bestSolutionQuality: (0, exports.qualityEnum)("best_solution_quality"),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
/* ── Pending Submissions (from GitHub webhook) ── */
exports.pendingSubmissions = (0, pg_core_1.pgTable)("pending_submission", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)("user_id")
        .notNull()
        .references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    problemId: (0, pg_core_1.integer)("problem_id")
        .notNull()
        .references(function () { return exports.problems.id; }, { onDelete: "cascade" }),
    commitSha: (0, pg_core_1.varchar)("commit_sha", { length: 40 }).notNull(),
    code: (0, pg_core_1.text)("code"),
    isReview: (0, pg_core_1.boolean)("is_review").notNull().default(false),
    status: (0, exports.pendingStatusEnum)("status").notNull().default("pending"),
    detectedAt: (0, pg_core_1.timestamp)("detected_at").defaultNow().notNull(),
    resolvedAt: (0, pg_core_1.timestamp)("resolved_at"),
});
/* ── Enums (Drills) ── */
exports.drillLevelEnum = (0, pg_core_1.pgEnum)("drill_level", ["1", "2", "3", "4", "5"]);
exports.drillConfidenceEnum = (0, pg_core_1.pgEnum)("drill_confidence", [
    "1",
    "2",
    "3",
    "4",
]);
/* ── Syntax Drills (content — seeded, not user-generated) ── */
exports.syntaxDrills = (0, pg_core_1.pgTable)("syntax_drill", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    title: (0, pg_core_1.varchar)("title", { length: 255 }).notNull().unique(),
    category: (0, pg_core_1.varchar)("category", { length: 100 }).notNull(),
    level: (0, pg_core_1.smallint)("level").notNull(), // 1-5
    language: (0, pg_core_1.varchar)("language", { length: 20 }).notNull().default("python"),
    prompt: (0, pg_core_1.text)("prompt").notNull(),
    expectedCode: (0, pg_core_1.text)("expected_code").notNull(),
    alternatives: (0, pg_core_1.text)("alternatives").array(),
    explanation: (0, pg_core_1.text)("explanation").notNull(),
    tags: (0, pg_core_1.text)("tags").array(),
    promptVariants: (0, pg_core_1.text)("prompt_variants").array(),
    testCases: (0, pg_core_1.jsonb)("test_cases"),
    distractors: (0, pg_core_1.text)("distractors").array(),
});
/* ── User Drill State (SRS state per drill per user) ── */
exports.userDrillStates = (0, pg_core_1.pgTable)("user_drill_state", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)("user_id")
        .notNull()
        .references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    drillId: (0, pg_core_1.integer)("drill_id")
        .notNull()
        .references(function () { return exports.syntaxDrills.id; }, { onDelete: "cascade" }),
    stability: (0, pg_core_1.real)("stability").notNull().default(0.5),
    lastReviewedAt: (0, pg_core_1.timestamp)("last_reviewed_at"),
    nextReviewAt: (0, pg_core_1.timestamp)("next_review_at"),
    totalAttempts: (0, pg_core_1.integer)("total_attempts").notNull().default(0),
    bestConfidence: (0, pg_core_1.smallint)("best_confidence"), // 1-4
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
/* ── Drill Attempts (history / analytics) ── */
exports.drillAttempts = (0, pg_core_1.pgTable)("drill_attempt", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)("user_id")
        .notNull()
        .references(function () { return exports.users.id; }, { onDelete: "cascade" }),
    drillId: (0, pg_core_1.integer)("drill_id")
        .notNull()
        .references(function () { return exports.syntaxDrills.id; }, { onDelete: "cascade" }),
    userCode: (0, pg_core_1.text)("user_code"),
    confidence: (0, pg_core_1.smallint)("confidence").notNull(), // 1-4
    sessionPosition: (0, pg_core_1.integer)("session_position"), // nth drill in session
    categoryStreak: (0, pg_core_1.integer)("category_streak"), // consecutive same-category
    effectiveCredit: (0, pg_core_1.real)("effective_credit"), // fatigue multiplier applied
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
