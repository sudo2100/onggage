import { describe, expect, it } from "vitest";
import { callbackDestination, callbackFailure, parseCallbackParams } from "./auth-callback";

const parse = (query: string) => parseCallbackParams(new URLSearchParams(query));

describe("parseCallbackParams", () => {
  it("메일 양식 링크(token_hash)를 읽는다", () => {
    expect(parse("token_hash=abc&type=signup&next=%2Fstart%3Fdesign%3Dfood-a")).toEqual({
      kind: "token_hash",
      tokenHash: "abc",
      type: "signup",
      next: "/start?design=food-a",
      recovery: false,
    });
  });

  it("소셜 로그인·기본 메일 링크(code)를 읽고 sb_flow_id를 넘긴다", () => {
    expect(parse("code=xyz&sb_flow_id=f1&next=%2Fadmin")).toEqual({
      kind: "code",
      code: "xyz",
      flowId: "f1",
      next: "/admin",
      recovery: false,
    });
  });

  it("비밀번호 재설정은 type=recovery 또는 flow=recovery로 알아본다", () => {
    expect(parse("token_hash=a&type=recovery").recovery).toBe(true);
    expect(parse("code=a&flow=recovery").recovery).toBe(true);
  });

  it("메일 링크의 next도 safeNext를 거친다", () => {
    expect(parse("token_hash=a&type=signup&next=https%3A%2F%2Fevil.com").next).toBe("/start");
    expect(parse("code=a&flow=recovery&next=%2F%2Fevil.com").next).toBe("/start");
  });

  it("모르는 type, 값 없음, 소셜 오류는 invalid", () => {
    expect(parse("token_hash=a&type=hack").kind).toBe("invalid");
    expect(parse("")).toMatchObject({ kind: "invalid", providerError: false });
    expect(parse("error=access_denied")).toMatchObject({ kind: "invalid", providerError: true });
  });
});

describe("callbackDestination", () => {
  it("재설정이면 새 비밀번호 화면으로 (next 유지)", () => {
    expect(callbackDestination({ next: "/admin", recovery: true, agreed: true })).toBe(
      "/reset-password?next=%2Fadmin",
    );
  });

  it("동의 기록이 없으면 /signup/agree로 (next 유지)", () => {
    expect(callbackDestination({ next: "/start?design=food-a", recovery: false, agreed: false })).toBe(
      "/signup/agree?next=%2Fstart%3Fdesign%3Dfood-a",
    );
  });

  it("동의 기록이 있으면 next로", () => {
    expect(callbackDestination({ next: "/start?design=food-a", recovery: false, agreed: true })).toBe(
      "/start?design=food-a",
    );
  });
});

describe("callbackFailure", () => {
  it("만료된 가입 링크는 로그인 화면에 안내를 띄운다", () => {
    expect(callbackFailure(parse("code=a&next=%2Fadmin"))).toBe("/login?error=link&next=%2Fadmin");
  });

  it("소셜 로그인 취소는 oauth 안내", () => {
    expect(callbackFailure(parse("error=access_denied"))).toBe("/login?error=oauth");
  });

  it("만료된 재설정 링크는 비밀번호 찾기로", () => {
    expect(callbackFailure(parse("code=a&flow=recovery"))).toBe("/forgot-password?error=expired");
  });
});
