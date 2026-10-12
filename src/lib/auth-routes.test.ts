import { describe, expect, it } from "vitest";
import { authRedirect, isAuthCookieName } from "./auth-routes";

describe("authRedirect (proxy 판단)", () => {
  it("로그인하지 않고 /studio, /admin에 오면 /login?next=원래 경로로 보낸다", () => {
    expect(authRedirect({ pathname: "/studio/abc", search: "?tab=info", isLoggedIn: false })).toBe(
      "/login?next=%2Fstudio%2Fabc%3Ftab%3Dinfo",
    );
    expect(authRedirect({ pathname: "/admin", search: "", isLoggedIn: false })).toBe("/login?next=%2Fadmin");
  });

  it("/start도 보호한다 (쿼리 유지)", () => {
    expect(authRedirect({ pathname: "/start", search: "?design=food-a", isLoggedIn: false })).toBe(
      "/login?next=%2Fstart%3Fdesign%3Dfood-a",
    );
  });

  it("이름만 비슷한 경로와 공개 화면은 그대로 둔다", () => {
    expect(authRedirect({ pathname: "/studios", search: "", isLoggedIn: false })).toBeNull();
    expect(authRedirect({ pathname: "/designs", search: "", isLoggedIn: false })).toBeNull();
    expect(authRedirect({ pathname: "/", search: "", isLoggedIn: false })).toBeNull();
  });

  it("로그인한 사용자가 /login, /signup에 오면 검사를 통과한 next로 보낸다", () => {
    expect(authRedirect({ pathname: "/signup", search: "?next=%2Fstart%3Fdesign%3Dfood-a", isLoggedIn: true })).toBe(
      "/start?design=food-a",
    );
    expect(authRedirect({ pathname: "/login", search: "?next=https://evil.com", isLoggedIn: true })).toBe("/start");
    expect(authRedirect({ pathname: "/login", search: "", isLoggedIn: true })).toBe("/start");
  });

  it("로그인한 사용자의 /signup/agree는 그대로 둔다", () => {
    expect(authRedirect({ pathname: "/signup/agree", search: "", isLoggedIn: true })).toBeNull();
  });
});

describe("isAuthCookieName", () => {
  it("Supabase 로그인 쿠키(나뉜 조각 포함)만 알아본다", () => {
    expect(isAuthCookieName("sb-127-auth-token")).toBe(true);
    expect(isAuthCookieName("sb-abcd-auth-token.0")).toBe(true);
    expect(isAuthCookieName("sb-abcd-auth-token-code-verifier")).toBe(true);
    expect(isAuthCookieName("onggage_pending_agreement")).toBe(false);
  });
});
