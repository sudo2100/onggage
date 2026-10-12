import { cleanup, render } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PLAN_TABLE_ROWS, PLANS, formatWon } from "@/lib/plans";
import DesignDetailPage from "./designs/[designId]/page";
import DesignsPage from "./designs/page";
import HomePage from "./page";
import PricingPage from "./pricing/page";

// next/font는 Next 빌드에서만 동작하므로 테스트에서는 글꼴 이름을 class로 돌려준다.
vi.mock("@/components/site/fonts", () => ({ siteFontClass: (font: string) => `font-site-${font}` }));

afterEach(() => cleanup());

type SearchParams = Record<string, string | string[] | undefined>;

async function renderDesigns(searchParams: SearchParams) {
  const element = await DesignsPage({ params: Promise.resolve({}), searchParams: Promise.resolve(searchParams) } as never);
  return render(element as ReactElement).container;
}

async function renderDetail(designId: string, searchParams: SearchParams = {}) {
  const element = await DesignDetailPage({
    params: Promise.resolve({ designId }),
    searchParams: Promise.resolve(searchParams),
  } as never);
  return render(element as ReactElement).container;
}

function previewTitles(root: Element): string[] {
  return [...root.querySelectorAll('[data-site-heading="1"]')].map((el) => el.textContent ?? "");
}

describe("요금 안내", () => {
  it("plans.ts의 요금·항목이 비교표에 그대로 나온다", () => {
    const { container } = render(<PricingPage />);
    const rows = [...container.querySelectorAll("[data-pricing-table] tbody tr")];
    expect(rows.map((row) => row.querySelector("th")?.textContent)).toEqual(PLAN_TABLE_ROWS.map((r) => r.label));
    rows.forEach((row, i) => {
      const cells = [...row.querySelectorAll("td")].map((td) => td.textContent);
      expect(cells).toEqual(PLANS.map((plan) => PLAN_TABLE_ROWS[i].value(plan)));
    });
    expect(container.textContent).toContain("69,000원");
    expect(container.textContent).toContain("무제한");
  });

  it("버튼은 무료로 시작하기(→ /designs) 하나뿐이다", () => {
    const { container } = render(<PricingPage />);
    const ctas = [...container.querySelectorAll("a")].filter((a) => a.textContent === "무료로 시작하기");
    expect(ctas.map((a) => a.getAttribute("href"))).toEqual(["/designs"]);
    expect(container.querySelector("button")).toBeNull();
  });

  it("랜딩 요금 요약도 plans.ts의 월 요금을 쓴다", () => {
    const { container } = render(<HomePage />);
    const summary = container.querySelector("[data-pricing-summary]")?.textContent ?? "";
    for (const plan of PLANS) {
      expect(summary).toContain(plan.name);
      expect(summary).toContain(formatWon(plan.priceMonthly));
    }
  });
});

describe("디자인 상세", () => {
  it("없는 designId는 404", async () => {
    await expect(renderDetail("no-such-design")).rejects.toMatchObject({
      digest: expect.stringContaining("404"),
    });
  });

  it("name 쿼리가 미리보기 제목에 들어가고, 시작하기 링크에 이어진다", async () => {
    const container = await renderDetail("beauty-a", { name: "결 헤어 본점", industry: "beauty" });
    expect(previewTitles(container)).toEqual(["결 헤어 본점"]);
    const href = container.querySelector("[data-start-link]")?.getAttribute("href") ?? "";
    const next = new URL(new URL(href, "http://x").searchParams.get("next") ?? "", "http://x");
    expect(next.searchParams.get("design")).toBe("beauty-a");
    expect(next.searchParams.get("name")).toBe("결 헤어 본점");
  });

  it("name이 없으면 업종 예시 상호로 보여 준다", async () => {
    const container = await renderDetail("pro-b");
    expect(previewTitles(container)).toEqual(["바른 세무회계"]);
  });
});

describe("디자인 목록", () => {
  it("name·industry가 있으면 그 업종 카드에 상호를 넣고 '내 상호 적용됨'을 표시한다", async () => {
    const container = await renderDesigns({ name: "담소 식당 2호점", industry: "food", filter: "all" });
    const cards = [...container.querySelectorAll("[data-design-card]")];
    expect(cards.map((c) => c.getAttribute("data-design-card")).slice(0, 2)).toEqual(["food-a", "food-b"]);
    for (const card of cards) {
      const mine = card.getAttribute("data-design-card")?.startsWith("food-");
      expect(previewTitles(card)[0]).toEqual(mine ? "담소 식당 2호점" : expect.not.stringContaining("2호점"));
      expect(card.textContent?.includes("내 상호 적용됨")).toBe(mine);
    }
    expect(cards).toHaveLength(8);
  });

  it("업종이 있으면 기본 필터는 내 업종이고, 카드 링크에 쿼리를 유지한다", async () => {
    const container = await renderDesigns({ name: "결 헤어", industry: "beauty" });
    const cards = [...container.querySelectorAll("[data-design-card]")];
    expect(cards.map((c) => c.getAttribute("data-design-card"))).toEqual(["beauty-a", "beauty-b"]);
    expect(cards[0].querySelector("a")?.getAttribute("href")).toBe(
      "/designs/beauty-a?name=%EA%B2%B0+%ED%97%A4%EC%96%B4&industry=beauty",
    );
  });

  it("name이 없으면 업종별 예시 상호를 쓴다", async () => {
    const container = await renderDesigns({});
    const titles = [...container.querySelectorAll("[data-design-card]")].map((card) => previewTitles(card)[0]);
    expect(titles).toEqual([
      "담소 식당",
      "담소 식당",
      "결 헤어",
      "결 헤어",
      "숲속 쉼표 스테이",
      "숲속 쉼표 스테이",
      "바른 세무회계",
      "바른 세무회계",
    ]);
    expect(container.textContent).not.toContain("내 상호 적용됨");
  });

  it("51자 이상 name은 50자로 잘라 보여 준다", async () => {
    const container = await renderDesigns({ name: "가".repeat(60), industry: "food" });
    expect(previewTitles(container)[0]).toBe("가".repeat(50));
    expect(container.querySelector("h1")?.textContent).toBe(`${"가".repeat(50)}에 어울리는 디자인`);
  });

  it("name은 텍스트로만 나온다", async () => {
    const container = await renderDesigns({ name: "<script>alert(1)</script>", industry: "food" });
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("h1")?.textContent).toContain("<script>alert(1)</script>");
  });

  it("미리보기 안에는 제목 태그·링크·섹션 id가 없다 (embedded)", async () => {
    const container = await renderDesigns({});
    const previews = [...container.querySelectorAll("[data-scaled-preview]")];
    expect(previews).toHaveLength(8);
    for (const preview of previews) {
      expect(preview.querySelector("h1, h2, a, [id]")).toBeNull();
    }
    expect(container.querySelectorAll("h1")).toHaveLength(1);
  });
});
