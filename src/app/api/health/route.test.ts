// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// DB 조회 결과만 바꿔 가며 실제 GET 응답을 확인한다.
const query = vi.hoisted(() => ({ result: { error: null as unknown } }));

vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("@/lib/supabase/anon", () => ({
  createAnonClient: () => ({
    from: () => ({
      select: () => ({
        limit: () => ({ abortSignal: async () => query.result }),
      }),
    }),
  }),
}));

const { GET } = await import("./route");

describe("GET /api/health", () => {
  beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {}));
  afterEach(() => {
    vi.restoreAllMocks();
    query.result = { error: null };
  });

  it("DB가 응답하면 200, 본문의 키는 ok 하나뿐이고 캐시하지 않는다", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Object.keys(body)).toEqual(["ok"]);
    expect(body).toEqual({ ok: true });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("DB 오류면 503, 본문의 키는 ok 하나뿐이고 오류 내용이 없다", async () => {
    query.result = { error: { message: "relation sites: connection refused (supabase 127.0.0.1:54322)", code: "08006" } };
    const response = await GET();
    expect(response.status).toBe(503);
    const text = await response.text();
    expect(Object.keys(JSON.parse(text))).toEqual(["ok"]);
    expect(JSON.parse(text)).toEqual({ ok: false });
    expect(text).not.toMatch(/supabase|54322|08006|refused/);
  });
});
