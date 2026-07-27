import { NextRequest } from "next/server";

jest.mock("@supabase/ssr", () => ({
  createServerClient: jest.fn(() => {
    throw new Error("Your project's URL and Key are required to create a Supabase client!");
  }),
}));

describe("proxy middleware (DEF-010 regression)", () => {
  it("does not throw and still returns a response when Supabase is unreachable/misconfigured", async () => {
    const { proxy } = await import("@/proxy");
    const request = new NextRequest("http://localhost/");
    const response = await proxy(request);
    expect(response).toBeDefined();
    expect(response.status).toBe(200);
  });
});
