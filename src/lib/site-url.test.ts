import { afterEach, describe, expect, it, vi } from "vitest";
import { getSiteUrl } from "./site-url";

describe("getSiteUrl", () => {
  afterEach(() => vi.unstubAllEnvs());

  it.each([
    [undefined, "http://localhost:3000"],
    ["", "http://localhost:3000"],
    ["onggage.kr", "https://onggage.kr"],
    ["onggage.kr/", "https://onggage.kr"],
    ["localhost:3000", "http://localhost:3000"],
    ["127.0.0.1:3000", "http://127.0.0.1:3000"],
    // 주소 전체를 적어도 https://http://… 가 되지 않는다 (소셜 로그인 복귀 주소가 깨지던 문제)
    ["http://localhost:3000", "http://localhost:3000"],
    ["https://onggage.kr/", "https://onggage.kr"],
  ])("NEXT_PUBLIC_ROOT_DOMAIN=%s → %s", (value, expected) => {
    vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", value as string);
    expect(getSiteUrl()).toBe(expected);
  });
});
