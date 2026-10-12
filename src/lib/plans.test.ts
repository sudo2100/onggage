import { describe, expect, it } from "vitest";
import { formatAiAssist, formatWon, getPlan, PLAN_TABLE_ROWS, PLANS } from "./plans";

describe("plans", () => {
  it("요금제는 DB enum과 같은 free·basic·pro 순서다", () => {
    expect(PLANS.map((p) => p.id)).toEqual(["free", "basic", "pro"]);
  });

  it("기획안 가격과 AI 도우미 횟수를 따른다 (프로는 무제한 = null)", () => {
    expect(PLANS.map((p) => [p.priceMonthly, p.priceYearly])).toEqual([
      [0, 0],
      [6900, 69000],
      [13900, 139000],
    ]);
    expect(PLANS.map((p) => p.limits.aiAssistPerMonth)).toEqual([10, 100, null]);
    expect(getPlan("pro").limits.aiAssistPerMonth).toBeNull();
  });

  it("금액과 횟수를 화면 문구로 바꾼다", () => {
    expect(formatWon(0)).toBe("0원");
    expect(formatWon(139000)).toBe("139,000원");
    expect(formatAiAssist(10)).toBe("월 10회");
    expect(formatAiAssist(null)).toBe("무제한");
  });

  it("비교표 행에 요청한 항목이 모두 있다", () => {
    expect(PLAN_TABLE_ROWS.map((r) => r.label)).toEqual([
      "월 요금",
      "연 요금",
      "공개 주소",
      "하단 로고",
      "사진",
      "문의 알림",
      "예약 · 방문 통계",
      "AI 도우미",
    ]);
  });
});
