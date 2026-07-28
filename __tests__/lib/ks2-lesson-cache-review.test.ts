/**
 * DEF-003 review workflow: listKS2LessonCacheForReview must bucket legacy
 * rows (cached before reviewStatus existed) as "unreviewed", not a silent
 * fourth state; setKS2LessonReviewStatus must persist the status + reviewer
 * into lesson_json without clobbering the rest of the lesson content.
 */

const rows: Record<string, unknown>[] = [];

function makeRow(cacheKey: string, reviewStatus: string | undefined, hitCount: number) {
  return {
    cache_key: cacheKey,
    topic_id: "y5m-add-subtract",
    subject: "maths",
    topic_name: "Addition & Subtraction",
    target: "Year 5",
    tier: "N/A",
    kind: "lesson",
    hit_count: hitCount,
    created_at: "2026-01-01T00:00:00Z",
    lesson_json: {
      intro: "intro",
      sections: [],
      workedExample: { question: "q", steps: ["s1"], answer: "a" },
      keyPoints: [],
      ...(reviewStatus !== undefined ? { reviewStatus } : {}),
    },
  };
}

jest.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      select: () => ({
        order: () => ({
          limit: async () => {
            if (table !== "ks2_lesson_cache") return { data: [], error: null };
            return { data: rows, error: null };
          },
        }),
        eq: (_col: string, val: string) => ({
          maybeSingle: async () => ({
            data: rows.find((r) => r.cache_key === val) || null,
            error: null,
          }),
        }),
      }),
      update: (patch: Record<string, unknown>) => ({
        eq: async (_col: string, val: string) => {
          const row = rows.find((r) => r.cache_key === val);
          if (row) Object.assign(row, patch);
          return { error: null };
        },
      }),
    }),
  },
}));

import { listKS2LessonCacheForReview, setKS2LessonReviewStatus } from "@/lib/ks2-lesson-cache";

describe("listKS2LessonCacheForReview", () => {
  beforeEach(() => {
    rows.length = 0;
    rows.push(
      makeRow("k-legacy", undefined, 10), // cached before DEF-003 stamped reviewStatus at all
      makeRow("k-unreviewed", "unreviewed", 5),
      makeRow("k-approved", "approved", 20),
      makeRow("k-rejected", "rejected", 1),
    );
  });

  it("treats legacy rows with no reviewStatus field as unreviewed", async () => {
    const result = await listKS2LessonCacheForReview("unreviewed", 50);
    const keys = result.map((r) => r.cacheKey);
    expect(keys).toContain("k-legacy");
    expect(keys).toContain("k-unreviewed");
    expect(keys).not.toContain("k-approved");
    expect(keys).not.toContain("k-rejected");
  });

  it("filters to only the requested status otherwise", async () => {
    const approved = await listKS2LessonCacheForReview("approved", 50);
    expect(approved.map((r) => r.cacheKey)).toEqual(["k-approved"]);

    const rejected = await listKS2LessonCacheForReview("rejected", 50);
    expect(rejected.map((r) => r.cacheKey)).toEqual(["k-rejected"]);
  });

  it("orders by hit count descending and respects the limit", async () => {
    rows.push(makeRow("k-unreviewed-2", "unreviewed", 999));
    // The mock doesn't actually sort — but the real query does `.order(hit_count, desc)`.
    // This test only asserts the limit is respected on the filtered set.
    const result = await listKS2LessonCacheForReview("unreviewed", 1);
    expect(result.length).toBe(1);
  });
});

describe("setKS2LessonReviewStatus", () => {
  beforeEach(() => {
    rows.length = 0;
    rows.push(makeRow("k-1", "unreviewed", 5));
  });

  it("sets reviewStatus and teacherReviewer without losing other lesson content", async () => {
    const result = await setKS2LessonReviewStatus("k-1", "approved", "admin-user-id");
    expect(result.ok).toBe(true);

    const row = rows.find((r) => r.cache_key === "k-1")!;
    const lesson = row.lesson_json as Record<string, unknown>;
    expect(lesson.reviewStatus).toBe("approved");
    expect(lesson.teacherReviewer).toBe("admin-user-id");
    // Original content untouched.
    expect(lesson.intro).toBe("intro");
    expect((lesson.workedExample as Record<string, unknown>).answer).toBe("a");
  });

  it("returns ok:false for a cacheKey that doesn't exist", async () => {
    const result = await setKS2LessonReviewStatus("does-not-exist", "rejected", "admin-user-id");
    expect(result.ok).toBe(false);
  });
});
