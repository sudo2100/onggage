import { describe, expect, it } from "vitest";
import { industrySchema, themeSchema } from "@/lib/site-schema";
import { DESIGNS, getDesignsForIndustry, getTemplateTheme } from ".";

describe("DESIGNS", () => {
  it("업종마다 디자인이 2개씩, 모두 8개다", () => {
    expect(DESIGNS).toHaveLength(8);
    for (const industry of industrySchema.options) {
      expect(getDesignsForIndustry(industry)).toHaveLength(2);
    }
  });

  it("id가 겹치지 않고 theme가 스키마를 통과한다", () => {
    expect(new Set(DESIGNS.map((d) => d.id)).size).toBe(DESIGNS.length);
    for (const design of DESIGNS) {
      expect(themeSchema.safeParse(design.theme).success).toBe(true);
    }
  });

  it("업종 기본 디자인은 그 업종의 첫 번째 디자인이다", () => {
    expect(getTemplateTheme("food")).toEqual({ accent: "#7A4B1F", font: "myeongjo", layout: "split" });
    expect(getTemplateTheme("beauty")).toEqual(getDesignsForIndustry("beauty")[0].theme);
  });
});
