import { describe, expect, it } from "vitest";
import { parseSiteContent, resolveGeneratedContent, validateSiteContent } from "./site-content";
import { getTemplateContent } from "./templates";

const ctx = { industry: "food", siteName: "담소 식당" } as const;
const template = getTemplateContent(ctx.industry, ctx.siteName);

const hero = { id: "hero", type: "hero", visible: true, title: "담소 식당", subtitle: "정갈한 한 끼", ctaLabel: "예약하기" };
const about = { id: "about", type: "about", visible: true, title: "우리 이야기", body: "반찬은 매일 아침 직접 만듭니다." };
const theme = { accent: "#2E5E4E", font: "batang", layout: "center" };
const business = { phone: "031-905-1234", address: "경기 고양시 일산동구 정발산로 24" };

describe("validateSiteContent (저장용)", () => {
  it("정상 데이터를 통과시킨다", () => {
    const result = validateSiteContent({ sections: [hero, about], theme, business });
    expect(result.ok).toBe(true);
  });

  it("실패하면 고치지 않고 오류 위치를 돌려준다", () => {
    const result = validateSiteContent({ sections: [hero, { ...about, title: "가".repeat(31) }], theme, business });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.map((e) => e.path)).toContain("sections[1].title");
  });
});

describe("resolveGeneratedContent (AI 생성 결과)", () => {
  it("검증을 통과하면 그대로 쓴다", () => {
    const result = resolveGeneratedContent({ sections: [hero], theme, business: {} }, ctx);
    expect(result.usedTemplate).toBe(false);
    expect(result.content.sections).toEqual([hero]);
  });

  it("하나라도 틀리면 전체를 템플릿 기본값으로 대체한다", () => {
    const result = resolveGeneratedContent({ sections: [hero], theme: { ...theme, accent: "red" }, business: {} }, ctx);
    expect(result.usedTemplate).toBe(true);
    expect(result.content).toEqual(template);
    expect(result.errors[0].path).toBe("theme.accent");
  });
});

describe("parseSiteContent (읽기용)", () => {
  it("정상 데이터는 그대로 두고 issues가 비어 있다", () => {
    const result = parseSiteContent({ sections: [hero, about], theme, business }, ctx);
    expect(result.issues).toEqual([]);
    expect(result.content).toEqual({ sections: [hero, about], theme, business });
  });

  it("모르는 섹션 타입은 그 섹션만 뺀다", () => {
    const result = parseSiteContent(
      { sections: [hero, { id: "canvas", type: "canvas", visible: true }, about], theme, business },
      ctx,
    );
    expect(result.content.sections).toEqual([hero, about]);
    expect(result.issues).toEqual([expect.objectContaining({ path: "sections[1]", fix: "removed" })]);
  });

  it("제목이 너무 긴 섹션은 그 섹션만 빼고 이유를 남긴다", () => {
    const result = parseSiteContent({ sections: [{ ...hero, title: "가".repeat(51) }, about], theme, business }, ctx);
    expect(result.content.sections).toEqual([about]);
    expect(result.issues[0]).toMatchObject({ path: "sections[0]", fix: "removed" });
    expect(result.issues[0].reason).toContain("title");
  });

  it("잘못된 색상은 그 필드만 템플릿 값으로 바꾼다", () => {
    const result = parseSiteContent({ sections: [hero], theme: { ...theme, accent: "green" }, business }, ctx);
    expect(result.content.theme).toEqual({ ...theme, accent: template.theme.accent });
    expect(result.issues).toEqual([expect.objectContaining({ path: "theme.accent", fix: "default" })]);
  });

  it("빈 theme({})는 템플릿 기본값으로 채운다", () => {
    const result = parseSiteContent({ sections: [hero], theme: {}, business: {} }, ctx);
    expect(result.content.theme).toEqual(template.theme);
    expect(result.issues.map((i) => i.path)).toEqual(["theme.accent", "theme.font", "theme.layout"]);
  });

  it("DB 기본값('[]', '{}', '{}')이면 템플릿 초안을 보여 준다", () => {
    const result = parseSiteContent({ sections: [], theme: {}, business: {} }, ctx);
    expect(result.content).toEqual(template);
    expect(result.issues).toContainEqual(expect.objectContaining({ path: "sections", fix: "template" }));
  });

  it("남는 섹션이 하나도 없으면 템플릿 섹션을 쓴다", () => {
    const result = parseSiteContent({ sections: [{ type: "canvas" }], theme, business }, ctx);
    expect(result.content.sections).toEqual(template.sections);
  });

  it("중복된 섹션 id는 뒤의 것을 뺀다", () => {
    const result = parseSiteContent({ sections: [hero, { ...hero, title: "두 번째" }], theme, business }, ctx);
    expect(result.content.sections).toEqual([hero]);
    expect(result.issues[0]).toMatchObject({ path: "sections[1]", fix: "removed" });
  });

  it("잘못된 사진 경로와 가게 정보 필드는 그 값만 뺀다", () => {
    const result = parseSiteContent(
      { sections: [hero], theme: { ...theme, photo: "../x.png" }, business: { ...business, phone: "모름" } },
      ctx,
    );
    expect(result.content.theme).toEqual(theme);
    expect(result.content.business).toEqual({ address: business.address });
    expect(result.issues.map((i) => i.path)).toEqual(["theme.photo", "business.phone"]);
  });

  it("객체가 아닌 값은 전체를 템플릿으로 대체한다", () => {
    const result = parseSiteContent(null, ctx);
    expect(result.content).toEqual(template);
    expect(result.issues).toEqual([expect.objectContaining({ fix: "template" })]);
  });
});
