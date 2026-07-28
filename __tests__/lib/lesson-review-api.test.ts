/**
 * DEF-003 review workflow: /api/lesson-review must be admin-only, and must
 * pass the caller's id through to setKS2LessonReviewStatus as the reviewer.
 */
import { NextRequest } from "next/server";

let currentRole: string | null = "student";

jest.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: "user-1" } } }),
    },
  }),
}));

jest.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { id: "user-1", email: null, full_name: null, role: currentRole, centre_id: null },
          }),
        }),
      }),
    }),
  },
}));

const listKS2LessonCacheForReview = jest.fn(async (_status: string, _limit: number) => [] as unknown[]);
const setKS2LessonReviewStatus = jest.fn(async (_cacheKey: string, _status: string, _reviewerId: string) => ({
  ok: true as const,
}));

jest.mock("@/lib/ks2-lesson-cache", () => ({
  listKS2LessonCacheForReview: (status: string, limit: number) => listKS2LessonCacheForReview(status, limit),
  setKS2LessonReviewStatus: (cacheKey: string, status: string, reviewerId: string) =>
    setKS2LessonReviewStatus(cacheKey, status, reviewerId),
}));

describe("/api/lesson-review authorization", () => {
  beforeEach(() => {
    currentRole = "student";
    listKS2LessonCacheForReview.mockClear();
    setKS2LessonReviewStatus.mockClear();
  });

  it("GET rejects a non-admin profile with 403", async () => {
    const { GET } = await import("@/app/api/lesson-review/route");
    const req = new NextRequest("http://localhost/api/lesson-review");
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("GET allows role='admin' and returns the review queue", async () => {
    currentRole = "admin";
    const { GET } = await import("@/app/api/lesson-review/route");
    const req = new NextRequest("http://localhost/api/lesson-review?status=unreviewed");
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(listKS2LessonCacheForReview).toHaveBeenCalledWith("unreviewed", 50);
  });

  it("GET rejects an invalid status value even for an admin", async () => {
    currentRole = "admin";
    const { GET } = await import("@/app/api/lesson-review/route");
    const req = new NextRequest("http://localhost/api/lesson-review?status=bogus");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("POST rejects a non-admin profile with 403", async () => {
    const { POST } = await import("@/app/api/lesson-review/route");
    const req = new NextRequest("http://localhost/api/lesson-review", {
      method: "POST",
      body: JSON.stringify({ cacheKey: "k", action: "approve" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    expect(setKS2LessonReviewStatus).not.toHaveBeenCalled();
  });

  it("POST passes the caller's own id as the reviewer, not a client-supplied one", async () => {
    currentRole = "admin";
    const { POST } = await import("@/app/api/lesson-review/route");
    const req = new NextRequest("http://localhost/api/lesson-review", {
      method: "POST",
      body: JSON.stringify({ cacheKey: "some-key", action: "reject", reviewerId: "spoofed-id" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(setKS2LessonReviewStatus).toHaveBeenCalledWith("some-key", "rejected", "user-1");
  });

  it("POST rejects an invalid action", async () => {
    currentRole = "admin";
    const { POST } = await import("@/app/api/lesson-review/route");
    const req = new NextRequest("http://localhost/api/lesson-review", {
      method: "POST",
      body: JSON.stringify({ cacheKey: "k", action: "delete" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
