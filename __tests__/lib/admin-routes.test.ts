/**
 * DEF-001 regression: /api/content-upload and /api/exam-papers must gate on
 * profiles.role === 'admin' (the column with a legal 'admin' value), not
 * subscription_status (which can never equal 'admin' per its CHECK
 * constraint, so the routes previously rejected every request unconditionally).
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
          single: async () => ({ data: { role: currentRole } }),
        }),
      }),
    }),
    storage: {
      from: () => ({
        upload: async () => ({ error: null }),
      }),
    },
  },
}));

describe("/api/content-upload authorization", () => {
  beforeEach(() => {
    currentRole = "student";
  });

  it("rejects a non-admin profile with 403", async () => {
    const { POST } = await import("@/app/api/content-upload/route");
    const form = new FormData();
    form.set("file", new File([new Uint8Array([1, 2, 3])], "a.pdf", { type: "application/pdf" }));
    const req = new NextRequest("http://localhost/api/content-upload", {
      method: "POST",
      body: form,
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("allows a profile with role='admin' past the authorization gate", async () => {
    currentRole = "admin";
    const { POST } = await import("@/app/api/content-upload/route");
    const form = new FormData();
    form.set("file", new File([new Uint8Array([1, 2, 3])], "a.pdf", { type: "application/pdf" }));
    const req = new NextRequest("http://localhost/api/content-upload", {
      method: "POST",
      body: form,
    });
    const res = await POST(req);
    expect(res.status).not.toBe(403);
  });
});

describe("/api/exam-papers authorization", () => {
  beforeEach(() => {
    currentRole = "student";
  });

  it("rejects a non-admin profile with 403", async () => {
    const { POST } = await import("@/app/api/exam-papers/route");
    const form = new FormData();
    form.set("file", new File([new Uint8Array([1, 2, 3])], "a.pdf", { type: "application/pdf" }));
    form.set("exam_board", "AQA");
    form.set("tier", "foundation");
    form.set("year", "2025");
    form.set("paper_number", "1");
    form.set("title", "Test paper");
    const req = new NextRequest("http://localhost/api/exam-papers", {
      method: "POST",
      body: form,
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("allows a profile with role='admin' past the authorization gate", async () => {
    currentRole = "admin";
    const { POST } = await import("@/app/api/exam-papers/route");
    const form = new FormData();
    form.set("file", new File([new Uint8Array([1, 2, 3])], "a.pdf", { type: "application/pdf" }));
    form.set("exam_board", "AQA");
    form.set("tier", "foundation");
    form.set("year", "2025");
    form.set("paper_number", "1");
    form.set("title", "Test paper");
    const req = new NextRequest("http://localhost/api/exam-papers", {
      method: "POST",
      body: form,
    });
    const res = await POST(req);
    expect(res.status).not.toBe(403);
  });
});
