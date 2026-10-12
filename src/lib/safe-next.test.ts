import { describe, expect, it } from "vitest";
import { DEFAULT_NEXT, safeNext, withNext } from "./safe-next";

describe("safeNext", () => {
  it("우리 사이트 안 경로는 쿼리까지 그대로 통과한다", () => {
    expect(safeNext("/start?design=food-a&name=%EB%8B%B4%EC%86%8C")).toBe("/start?design=food-a&name=%EB%8B%B4%EC%86%8C");
    expect(safeNext("/studio/abc")).toBe("/studio/abc");
    expect(safeNext("/designs")).toBe("/designs");
  });

  it("디자인 상세의 시작 링크가 만든 next를 그대로 살린다", () => {
    const next = new URLSearchParams("next=%2Fstart%3Fdesign%3Dfood-a%26name%3D%EB%8B%B4%EC%86%8C+%EC%8B%9D%EB%8B%B9").get("next");
    const result = safeNext(next);
    const url = new URL(result, "http://x.test");
    expect(url.pathname).toBe("/start");
    expect(url.searchParams.get("design")).toBe("food-a");
    expect(url.searchParams.get("name")).toBe("담소 식당");
  });

  it.each([
    ["외부 주소", "https://evil.com"],
    ["프로토콜 상대 주소", "//evil.com"],
    ["역슬래시", "/\\evil.com"],
    ["중간 역슬래시", "/a\\..\\\\evil.com"],
    ["javascript:", "javascript:alert(1)"],
    ["탭 문자", "/\t/evil.com"],
    ["줄바꿈", "/start\r\nSet-Cookie: x=1"],
    ["슬래시 없는 상대 경로", "start"],
    ["빈 값", ""],
    ["너무 긴 값", `/${"a".repeat(2100)}`],
  ])("%s는 기본값으로 바꾼다", (_label, raw) => {
    expect(safeNext(raw)).toBe(DEFAULT_NEXT);
  });

  it("문자열이 아니면(배열·없음) 기본값", () => {
    expect(safeNext(undefined)).toBe(DEFAULT_NEXT);
    expect(safeNext(["/studio", "/admin"])).toBe(DEFAULT_NEXT);
    expect(safeNext(null)).toBe(DEFAULT_NEXT);
  });

  it("로그인·가입·콜백으로 돌아가는 next는 고리가 생기므로 막는다", () => {
    expect(safeNext("/login?next=/admin")).toBe(DEFAULT_NEXT);
    expect(safeNext("/signup")).toBe(DEFAULT_NEXT);
    expect(safeNext("/signup/agree")).toBe(DEFAULT_NEXT);
    expect(safeNext("/auth/callback?code=x")).toBe(DEFAULT_NEXT);
    expect(safeNext("/reset-password")).toBe(DEFAULT_NEXT);
    // 이름만 비슷한 경로는 통과
    expect(safeNext("/loginhelp")).toBe("/loginhelp");
  });

  it("점 경로는 정리된 결과로 판단한다", () => {
    expect(safeNext("/designs/../login")).toBe(DEFAULT_NEXT);
    expect(safeNext("/a/../studio/x")).toBe("/studio/x");
  });

  it("해시는 버린다 (서버로 오지 않는 값)", () => {
    expect(safeNext("/designs#top")).toBe("/designs");
  });

  it("다른 기본값을 줄 수 있다", () => {
    expect(safeNext("//evil.com", "/")).toBe("/");
  });
});

describe("withNext", () => {
  it("next를 쿼리로 붙이고, 기본값이면 생략한다", () => {
    expect(withNext("/login", "/studio/x?tab=1")).toBe("/login?next=%2Fstudio%2Fx%3Ftab%3D1");
    expect(withNext("/login", DEFAULT_NEXT)).toBe("/login");
  });
});
