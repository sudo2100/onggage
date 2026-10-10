import { describe, expect, it } from "vitest";
import { industrySchema } from "@/lib/site-schema";
import { validateSiteContent } from "@/lib/site-content";
import { getTemplateContent } from ".";

describe("getTemplateContent", () => {
  it.each(industrySchema.options)("%s 템플릿 기본값이 저장용 검증을 통과한다", (industry) => {
    const result = validateSiteContent(getTemplateContent(industry, "온가게 테스트점"));
    expect(result.ok).toBe(true);
  });

  it("hero 제목과 소개 글에 상호를 넣는다", () => {
    const content = getTemplateContent("beauty", "결 헤어");
    expect(content.sections[0]).toMatchObject({ type: "hero", title: "결 헤어" });
    expect(content.sections[1]).toMatchObject({ type: "about" });
    expect(JSON.stringify(content.sections[1])).toContain("결 헤어에서는");
  });

  it("호출할 때마다 새 객체를 돌려준다", () => {
    const a = getTemplateContent("food", "담소 식당");
    const b = getTemplateContent("food", "담소 식당");
    expect(a).toEqual(b);
    expect(a.theme).not.toBe(b.theme);
    expect(a.sections[2]).not.toBe(b.sections[2]);
  });
});
