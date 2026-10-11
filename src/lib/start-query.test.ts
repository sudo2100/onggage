import { describe, expect, it } from "vitest";
import { designHref, designsHref, MAX_NAME_LENGTH, normalizeName, parseStartQuery, startHref } from "./start-query";

describe("parseStartQuery", () => {
  it("name과 industry를 읽는다", () => {
    expect(parseStartQuery({ name: "  결 헤어 ", industry: "beauty" })).toEqual({ name: "결 헤어", industry: "beauty" });
  });

  it("51자 이상 name은 50자로 자른다", () => {
    const name = "가".repeat(60);
    expect(parseStartQuery({ name }).name).toBe("가".repeat(MAX_NAME_LENGTH));
    expect(parseStartQuery({ name: "가".repeat(51) }).name).toHaveLength(50);
  });

  it("이모지도 한 글자로 세어 자른다 (글자가 깨지지 않는다)", () => {
    const name = "🍜".repeat(55);
    expect(Array.from(normalizeName(name) ?? "")).toHaveLength(50);
  });

  it("빈 name과 모르는 업종은 없는 것으로 본다", () => {
    expect(parseStartQuery({ name: "   ", industry: "shop" })).toEqual({ name: undefined, industry: undefined });
  });

  it("같은 키가 여러 번 오면 첫 값을 쓴다", () => {
    expect(parseStartQuery({ name: ["담소 식당", "다른 이름"], industry: ["food", "pro"] })).toEqual({
      name: "담소 식당",
      industry: "food",
    });
  });
});

describe("다음 화면 주소", () => {
  it("디자인 목록·상세 주소에 쿼리를 유지한다", () => {
    expect(designsHref({ name: "결 헤어", industry: "beauty", filter: "all" })).toBe(
      "/designs?name=%EA%B2%B0+%ED%97%A4%EC%96%B4&industry=beauty&filter=all",
    );
    expect(designHref("beauty-a", {})).toBe("/designs/beauty-a");
  });

  it("시작하기 주소는 /signup?next=/start?design=…&name=… 형태다", () => {
    const href = startHref("food-a", "담소 식당");
    const url = new URL(href, "http://localhost");
    expect(url.pathname).toBe("/signup");
    const next = new URL(url.searchParams.get("next") ?? "", "http://localhost");
    expect(next.pathname).toBe("/start");
    expect(next.searchParams.get("design")).toBe("food-a");
    expect(next.searchParams.get("name")).toBe("담소 식당");
    expect(startHref("food-a")).toBe("/signup?next=%2Fstart%3Fdesign%3Dfood-a");
  });
});
