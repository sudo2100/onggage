import { describe, expect, it } from "vitest";
import { siteContentSchema } from "./site-schema";

describe("siteContentSchema", () => {
  it("올바른 사이트 데이터를 통과시킨다", () => {
    const result = siteContentSchema.safeParse({
      sections: [{ id: "s1", type: "hero", data: { title: "온가게 카페" } }],
      theme: { primaryColor: "#1a7f5a" },
    });
    expect(result.success).toBe(true);
  });

  it("모르는 섹션 타입을 거부한다", () => {
    const result = siteContentSchema.safeParse({
      sections: [{ id: "s1", type: "canvas", data: {} }],
      theme: { primaryColor: "#1a7f5a" },
    });
    expect(result.success).toBe(false);
  });

  it("잘못된 색상 값을 거부한다", () => {
    const result = siteContentSchema.safeParse({
      sections: [],
      theme: { primaryColor: "green" },
    });
    expect(result.success).toBe(false);
  });
});
