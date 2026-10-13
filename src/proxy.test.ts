// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Supabase 클라이언트를 만들거나 Auth 서버(getUser)를 부르는지 센다.
const supabase = vi.hoisted(() => ({
  created: 0,
  getUser: 0,
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => {
    supabase.created += 1;
    return {
      auth: {
        getUser: async () => {
          supabase.getUser += 1;
          return { data: { user: null } };
        },
      },
    };
  },
}));

const { proxy } = await import("./proxy");

const AUTH_COOKIE = "sb-127-auth-token=base64-token";

// 실제 요청처럼 Host 헤더를 넣는다 (proxy는 Host 헤더로 공개 사이트 요청을 가른다).
function request(url: string, cookie?: string) {
  const headers: Record<string, string> = { host: new URL(url).host };
  if (cookie) headers.cookie = cookie;
  return new NextRequest(url, { headers });
}

describe("proxy: Supabase Auth 호출", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "localhost:3000");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    supabase.created = 0;
    supabase.getUser = 0;
  });
  afterEach(() => vi.unstubAllEnvs());

  it("로그인 쿠키가 없으면 Auth 서버를 부르지 않는다 (/api/health, 랜딩, 보호 화면)", async () => {
    for (const path of ["/api/health", "/", "/designs", "/studio/abc"]) {
      await proxy(request(`http://localhost:3000${path}`));
    }
    expect(supabase.created).toBe(0);
    expect(supabase.getUser).toBe(0);
  });

  it("로그인 쿠키가 있으면 getUser()로 확인한다 (메인 도메인)", async () => {
    await proxy(request("http://localhost:3000/", AUTH_COOKIE));
    expect(supabase.getUser).toBe(1);
  });

  it("공개 사이트(서브도메인) 요청은 로그인 쿠키가 있어도 Auth 서버를 부르지 않는다", async () => {
    const response = await proxy(request("http://damso.localhost:3000/api/health", AUTH_COOKIE));
    expect(supabase.created).toBe(0);
    // 헬스 체크로 가지 않고 공개 사이트 쪽 경로로 rewrite된다 (해당 라우트가 없어 404).
    expect(response.headers.get("x-middleware-rewrite")).toBe("http://damso.localhost:3000/sites/damso/api/health");
  });
});
