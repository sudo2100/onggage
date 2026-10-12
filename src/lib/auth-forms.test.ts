import { describe, expect, it } from "vitest";
import { agreementMetadata, hasCurrentAgreement, TERMS_VERSION } from "./agreement";
import { authErrorMessage, loginSchema, resetPasswordSchema, signupSchema } from "./auth-forms";

const agreed = { terms: "on", privacy: "on", age14: "on" };

describe("signupSchema", () => {
  it("이메일은 앞뒤 공백을 지우고 소문자로 바꾼다", () => {
    const result = signupSchema.parse({ email: " Owner@Example.COM ", password: "12345678", ...agreed });
    expect(result.email).toBe("owner@example.com");
  });

  it.each([
    ["terms", "이용약관에 동의해 주세요."],
    ["privacy", "개인정보 처리방침에 동의해 주세요."],
    ["age14", "만 14세 이상만 가입할 수 있어요."],
  ])("필수 동의 %s가 빠지면 거부한다", (key, message) => {
    const values: Record<string, string> = { email: "a@b.kr", password: "12345678", ...agreed };
    delete values[key];
    const result = signupSchema.safeParse(values);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(message);
  });

  it("체크 값이 on이 아니면 동의로 보지 않는다", () => {
    expect(signupSchema.safeParse({ email: "a@b.kr", password: "12345678", ...agreed, terms: "true" }).success).toBe(false);
  });

  it("비밀번호는 8자 이상 72자 이하", () => {
    expect(signupSchema.safeParse({ email: "a@b.kr", password: "1234567", ...agreed }).success).toBe(false);
    expect(signupSchema.safeParse({ email: "a@b.kr", password: "a".repeat(73), ...agreed }).success).toBe(false);
  });

  it("잘못된 이메일은 거부한다", () => {
    expect(loginSchema.safeParse({ email: "가게주인", password: "x" }).success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("두 비밀번호가 다르면 거부한다", () => {
    const result = resetPasswordSchema.safeParse({ password: "12345678", passwordConfirm: "12345679" });
    expect(result.error?.issues[0]?.message).toBe("두 비밀번호가 서로 달라요.");
  });
});

describe("동의 기록", () => {
  const record = {
    terms_agreed_at: "2026-10-12T00:00:00Z",
    privacy_agreed_at: "2026-10-12T00:00:00Z",
    age_confirmed_at: "2026-10-12T00:00:00Z",
    terms_version: TERMS_VERSION,
  };

  it("세 시각과 현재 약관 버전이 모두 있어야 동의로 본다", () => {
    expect(hasCurrentAgreement(record)).toBe(true);
    expect(hasCurrentAgreement({ ...record, age_confirmed_at: null })).toBe(false);
    expect(hasCurrentAgreement({ ...record, terms_version: "2020-01-01" })).toBe(false);
    expect(hasCurrentAgreement(null)).toBe(false);
  });

  it("가입 요청 metadata에 현재 약관 버전을 싣는다", () => {
    expect(agreementMetadata()).toEqual({ agreement: { terms: true, privacy: true, age14: true, version: TERMS_VERSION } });
  });
});

describe("authErrorMessage", () => {
  it("알려진 코드는 한국어 안내, 모르는 코드는 일반 안내", () => {
    expect(authErrorMessage("invalid_credentials")).toBe("이메일 또는 비밀번호가 맞지 않아요.");
    expect(authErrorMessage("something_new")).toBe("잠시 문제가 생겼어요. 다시 시도해 주세요.");
    expect(authErrorMessage(undefined)).toBe("잠시 문제가 생겼어요. 다시 시도해 주세요.");
  });
});
