/**
 * API tests for /api/session (T-030 daily session state).
 *
 * DB and auth are mocked so these run without a real Postgres connection.
 * Covers auth gating, validation, POST plan-creation, and PATCH action recording.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/db", () => ({
  get db() {
    return mockDb;
  },
}));

let mockDb: ReturnType<typeof buildDbMock>;

/** select responses are returned in call order; insert/update resolve trivially. */
function buildDbMock(selectResponses: unknown[][]) {
  let idx = 0;
  function makeChain(data: unknown[]): any {
    return {
      where: () => makeChain(data),
      limit: (n: number) => Promise.resolve(data.slice(0, n)),
    };
  }
  return {
    select: vi.fn(() => ({ from: vi.fn(() => makeChain(selectResponses[idx++] ?? [])) })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({ onConflictDoNothing: vi.fn(() => Promise.resolve([])) })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({ where: vi.fn(() => Promise.resolve([])) })),
    })),
  };
}

const ROW = {
  id: "session-1",
  userId: "user-1",
  date: "2026-05-30",
  plannedReviewIds: [1, 2, 3],
  plannedNewIds: [10],
  actedReviewIds: [] as number[],
  actedNewIds: [] as number[],
  completed: false,
};

function getReq(qs: string): NextRequest {
  return new NextRequest(`http://localhost/api/session${qs}`);
}
function bodyReq(method: string, body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/session", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("/api/session", () => {
  let auth: ReturnType<typeof vi.fn>;
  let route: typeof import("@/app/api/session/route");

  beforeEach(async () => {
    vi.clearAllMocks();
    mockDb = buildDbMock([[ROW]]);
    auth = (await import("@/auth")).auth as ReturnType<typeof vi.fn>;
    route = await import("@/app/api/session/route");
  });

  /* ── GET ── */
  it("GET 401 when unauthenticated", async () => {
    auth.mockResolvedValue(null);
    const res = await route.GET(getReq("?date=2026-05-30"));
    expect(res.status).toBe(401);
  });

  it("GET 400 on invalid date", async () => {
    auth.mockResolvedValue({ user: { id: "user-1" } });
    const res = await route.GET(getReq("?date=not-a-date"));
    expect(res.status).toBe(400);
  });

  it("GET returns the row (or null) for a valid date", async () => {
    auth.mockResolvedValue({ user: { id: "user-1" } });
    const res = await route.GET(getReq("?date=2026-05-30"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.session).toMatchObject({ id: "session-1", date: "2026-05-30" });
  });

  it("GET returns null when no row exists", async () => {
    auth.mockResolvedValue({ user: { id: "user-1" } });
    mockDb = buildDbMock([[]]);
    const res = await route.GET(getReq("?date=2026-05-30"));
    const json = await res.json();
    expect(json.session).toBeNull();
  });

  /* ── POST ── */
  it("POST 401 when unauthenticated", async () => {
    auth.mockResolvedValue(null);
    const res = await route.POST(bodyReq("POST", { date: "2026-05-30", plannedReviewIds: [], plannedNewIds: [] }));
    expect(res.status).toBe(401);
  });

  it("POST 400 on invalid date", async () => {
    auth.mockResolvedValue({ user: { id: "user-1" } });
    const res = await route.POST(bodyReq("POST", { date: "xx", plannedReviewIds: [], plannedNewIds: [] }));
    expect(res.status).toBe(400);
  });

  it("POST 400 when plan ids are not integers", async () => {
    auth.mockResolvedValue({ user: { id: "user-1" } });
    const res = await route.POST(bodyReq("POST", { date: "2026-05-30", plannedReviewIds: ["a"], plannedNewIds: [] }));
    expect(res.status).toBe(400);
  });

  it("POST creates the plan and returns the row", async () => {
    auth.mockResolvedValue({ user: { id: "user-1" } });
    mockDb = buildDbMock([[ROW]]); // single select after the insert
    const res = await route.POST(bodyReq("POST", { date: "2026-05-30", plannedReviewIds: [1, 2, 3], plannedNewIds: [10] }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.session).toMatchObject({ date: "2026-05-30", plannedReviewIds: [1, 2, 3] });
    expect(mockDb.insert).toHaveBeenCalled();
  });

  /* ── PATCH ── */
  it("PATCH 400 on invalid action", async () => {
    auth.mockResolvedValue({ user: { id: "user-1" } });
    const res = await route.PATCH(bodyReq("PATCH", { date: "2026-05-30", action: "bogus", problemId: 1 }));
    expect(res.status).toBe(400);
  });

  it("PATCH 400 when a review action lacks a numeric problemId", async () => {
    auth.mockResolvedValue({ user: { id: "user-1" } });
    const res = await route.PATCH(bodyReq("PATCH", { date: "2026-05-30", action: "review", problemId: "x" }));
    expect(res.status).toBe(400);
  });

  it("PATCH 404 when no session row exists for the date", async () => {
    auth.mockResolvedValue({ user: { id: "user-1" } });
    mockDb = buildDbMock([[]]); // first select finds nothing
    const res = await route.PATCH(bodyReq("PATCH", { date: "2026-05-30", action: "review", problemId: 1 }));
    expect(res.status).toBe(404);
  });

  it("PATCH review records the action and returns the updated row", async () => {
    auth.mockResolvedValue({ user: { id: "user-1" } });
    const updated = { ...ROW, actedReviewIds: [1] };
    mockDb = buildDbMock([[ROW], [updated]]); // find, then re-read after update
    const res = await route.PATCH(bodyReq("PATCH", { date: "2026-05-30", action: "review", problemId: 1 }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.session.actedReviewIds).toEqual([1]);
    expect(mockDb.update).toHaveBeenCalled();
  });

  it("PATCH complete needs no problemId", async () => {
    auth.mockResolvedValue({ user: { id: "user-1" } });
    const updated = { ...ROW, completed: true };
    mockDb = buildDbMock([[ROW], [updated]]);
    const res = await route.PATCH(bodyReq("PATCH", { date: "2026-05-30", action: "complete" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.session.completed).toBe(true);
  });
});
