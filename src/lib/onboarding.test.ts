import { describe, expect, it } from "vitest";
import {
  buildDraftContent,
  fieldErrors,
  firstIncompleteStep,
  initialValues,
  onboardingSchema,
  parsePrefill,
  STEP_SCHEMAS,
  toOnboardingPayload,
  type OnboardingValues,
} from "./onboarding";
import { validateSiteContent } from "./site-content";
import { toneSchema } from "./site-schema";
import { DESIGNS, getTemplateContent, getToneCopy } from "./templates";

const filled: OnboardingValues = {
  name: "담소 식당",
  industry: "food",
  designId: "food-b",
  phone: "031 905 1234",
  kakao: "https://pf.kakao.com/_damso",
  address: "경기 고양시 일산동구 정발산로 24",
  hours: "매일 11:00–21:00",
  tone: "warm",
};

describe("parsePrefill (디자인 상세에서 넘어온 쿼리 다시 검증)", () => {
  it("실제 디자인 id면 디자인과 업종을, 상호는 정리해서 채운다", () => {
    expect(parsePrefill({ design: "beauty-b", name: "  결 헤어 " })).toEqual({
      name: "결 헤어",
      industry: "beauty",
      designId: "beauty-b",
    });
  });

  it("모르는 디자인·빈 상호는 버린다", () => {
    expect(parsePrefill({ design: "hack<script>", name: "   " })).toEqual({
      name: undefined,
      industry: undefined,
      designId: undefined,
    });
  });

  it("상호는 50자로 자르고, 같은 키가 여러 번이면 첫 값을 쓴다", () => {
    expect(parsePrefill({ name: "가".repeat(80) }).name).toHaveLength(50);
    expect(parsePrefill({ design: ["pro-a", "food-a"] }).designId).toBe("pro-a");
  });

  it("미리 채울 값이 없으면 음식·카페의 첫 디자인으로 시작한다", () => {
    expect(initialValues({})).toMatchObject({ name: "", industry: "food", designId: "food-a", tone: "calm" });
  });
});

describe("단계별 검사", () => {
  it("1단계: 상호가 비면 안내한다", () => {
    const result = STEP_SCHEMAS[1]({ ...filled, name: "   " });
    expect(result.success).toBe(false);
    expect(fieldErrors(result.error!)).toEqual({ name: "상호를 입력해 주세요." });
  });

  it("1단계: 고른 디자인이 업종과 맞지 않으면 안내한다", () => {
    const result = STEP_SCHEMAS[1]({ ...filled, industry: "beauty", designId: "food-a" });
    expect(fieldErrors(result.error!)).toEqual({ designId: "디자인을 골라 주세요." });
  });

  it("2단계: businessSchema 규칙(전화·카카오톡 형식, 길이)을 칸별로 알려 준다", () => {
    const result = STEP_SCHEMAS[2]({ ...filled, phone: "전화주세요", kakao: "https://evil.com", hours: "가".repeat(101) });
    const errors = fieldErrors(result.error!);
    expect(errors.phone).toBe("전화번호는 숫자와 하이픈만 쓸 수 있습니다");
    expect(errors.kakao).toContain("카카오톡은 채널");
    expect(errors.hours).toBe("100자 이하로 입력해 주세요.");
  });

  it("2단계: 모두 비워도 통과한다", () => {
    expect(STEP_SCHEMAS[2]({ ...filled, phone: "", kakao: " ", address: "", hours: "" }).success).toBe(true);
  });

  it("앞 단계를 통과하지 못하면 그 단계부터", () => {
    expect(firstIncompleteStep({ ...filled, name: "" })).toBe(1);
    expect(firstIncompleteStep({ ...filled, phone: "abc" })).toBe(2);
    expect(firstIncompleteStep(filled)).toBe(3);
  });
});

describe("onboardingSchema (Server Action 전체 검사)", () => {
  it("가게 정보를 businessSchema로 정리한다 (전화 공백 → 하이픈, 빈 칸은 빠짐)", () => {
    const parsed = onboardingSchema.parse(toOnboardingPayload({ ...filled, address: "  " }));
    expect(parsed.business).toEqual({
      phone: "031-905-1234",
      kakao: "https://pf.kakao.com/_damso",
      hours: "매일 11:00–21:00",
    });
  });

  it("모르는 말투·업종은 거부한다", () => {
    expect(onboardingSchema.safeParse({ ...toOnboardingPayload(filled), tone: "loud" }).success).toBe(false);
    expect(onboardingSchema.safeParse({ ...toOnboardingPayload(filled), industry: "shop" }).success).toBe(false);
  });
});

describe("buildDraftContent (첫 초안)", () => {
  it.each(DESIGNS.flatMap((design) => toneSchema.options.map((tone) => [design.id, tone] as const)))(
    "%s · %s 초안이 저장용 검증을 통과한다",
    (designId, tone) => {
      const design = DESIGNS.find((d) => d.id === designId)!;
      const input = onboardingSchema.parse(
        toOnboardingPayload({ ...filled, name: "가".repeat(50), industry: design.industry, designId, tone }),
      );
      const result = validateSiteContent(buildDraftContent(input));
      expect(result.ok).toBe(true);
    },
  );

  it("고른 디자인의 theme, 입력한 가게 정보, 말투 문구가 들어간다", () => {
    const content = buildDraftContent(onboardingSchema.parse(toOnboardingPayload(filled)));
    expect(content.theme).toEqual(DESIGNS.find((d) => d.id === "food-b")!.theme);
    expect(content.business.phone).toBe("031-905-1234");
    expect(content.sections[0]).toMatchObject({
      type: "hero",
      title: "담소 식당",
      subtitle: getToneCopy("food", "warm", "담소 식당").subtitle,
    });
    expect(content.sections.length).toBeGreaterThan(0);
  });
});

describe("말투별 템플릿 문구", () => {
  it("업종마다 세 말투의 문구가 서로 다르고, 상호가 들어간다", () => {
    for (const industry of ["food", "beauty", "stay", "pro"] as const) {
      const copies = toneSchema.options.map((tone) => getToneCopy(industry, tone, "우리가게"));
      expect(new Set(copies.map((copy) => copy.subtitle)).size).toBe(3);
      expect(new Set(copies.map((copy) => copy.about)).size).toBe(3);
      for (const copy of copies) expect(copy.about).toContain("우리가게");
    }
  });

  it("말투를 주지 않으면 지금까지의 기본 문구(차분한)를 쓴다", () => {
    expect(getTemplateContent("food", "담소 식당")).toEqual(getTemplateContent("food", "담소 식당", "calm"));
  });
});
