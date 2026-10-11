import { expect, test, type Page } from "@playwright/test";

// 미리보기 제목: embedded 미리보기는 h1 대신 data-site-heading="1"로 그린다.
const previewTitle = (scope: ReturnType<Page["locator"]>) => scope.locator('[data-site-heading="1"]');

test("랜딩 → 디자인 목록 → 상세 → 시작하기까지 상호가 이어진다", async ({ page }) => {
  await page.goto("/");
  const hero = page.locator("form[action='/designs']");
  const landingPreview = page.locator("[data-scaled-preview]").first();

  // 예시 칩을 누르면 입력칸이 채워지고 미리보기 제목이 바뀐다.
  await expect(previewTitle(landingPreview)).toHaveText("담소 식당");
  await hero.getByRole("button", { name: "결 헤어" }).click();
  await expect(hero.getByLabel("상호")).toHaveValue("결 헤어");
  await expect(hero.getByLabel("업종")).toHaveValue("beauty");
  await expect(previewTitle(landingPreview)).toHaveText("결 헤어");

  // 직접 고쳐도 미리보기 제목이 따라 바뀐다.
  await hero.getByLabel("상호").fill("결 헤어 일산점");
  await expect(previewTitle(landingPreview)).toHaveText("결 헤어 일산점");

  await hero.getByRole("button", { name: "내 가게 디자인 보기" }).click();
  await expect(page).toHaveURL(/\/designs\?name=.+&industry=beauty$/);
  expect(new URL(page.url()).searchParams.get("name")).toBe("결 헤어 일산점");

  // 내 업종 카드에 상호가 들어가 있다.
  const card = page.locator('[data-design-card="beauty-a"]');
  await expect(previewTitle(card)).toHaveText("결 헤어 일산점");
  await expect(card.getByText("내 상호 적용됨")).toBeVisible();
  await expect(page.locator('[data-design-card="food-a"]')).toHaveCount(0);

  // 미리보기를 눌러도 카드 링크로 이동한다 (미리보기 안 요소는 눌리지 않는다).
  await card.locator("[data-scaled-preview]").click();
  await expect(page).toHaveURL(/\/designs\/beauty-a\?name=.+&industry=beauty$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("결");
  await expect(previewTitle(page.locator("[data-scaled-preview]"))).toHaveText("결 헤어 일산점");

  const href = await page.getByRole("link", { name: "이 디자인으로 시작" }).getAttribute("href");
  const url = new URL(href ?? "", "http://localhost");
  expect(url.pathname).toBe("/signup");
  const next = new URL(url.searchParams.get("next") ?? "", "http://localhost");
  expect(next.pathname).toBe("/start");
  expect(next.searchParams.get("design")).toBe("beauty-a");
  expect(next.searchParams.get("name")).toBe("결 헤어 일산점");
});

test("업종 필터를 바꿔도 상호·업종 쿼리가 유지된다", async ({ page }) => {
  await page.goto("/designs?name=%EB%8B%B4%EC%86%8C&industry=food");
  await page.getByRole("navigation", { name: "업종 필터" }).getByRole("link", { name: "전체" }).click();
  await expect(page).toHaveURL(/filter=all/);
  await expect(page.locator("[data-design-card]")).toHaveCount(8);
  await expect(page.locator("[data-design-card]").first()).toHaveAttribute("data-design-card", "food-a");
  expect(new URL(page.url()).searchParams.get("name")).toBe("담소");
});

test("디자인 상세에서 PC/모바일 미리보기를 전환한다", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/designs/food-a");
  const frame = page.locator("[data-device]");
  await expect(frame).toHaveAttribute("data-device", "desktop");
  // PC 폭에서는 하단 고정 버튼이 없고, 모바일 폭으로 바꾸면 사이트가 모바일 배치(하단 버튼)로 바뀐다.
  await expect(frame.locator("[data-quick-actions]")).toBeHidden();
  await page.getByRole("button", { name: "모바일" }).click();
  await expect(frame).toHaveAttribute("data-device", "mobile");
  await expect(frame.locator("[data-quick-actions]")).toBeVisible();
});

test("없는 디자인은 404", async ({ page }) => {
  const response = await page.goto("/designs/no-such-design");
  expect(response?.status()).toBe(404);
});

test("sitemap.xml에 마케팅 화면이 모두 있다", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  for (const path of ["/", "/designs", "/designs/food-a", "/designs/pro-b", "/pricing"]) {
    expect(xml).toContain(`${path}</loc>`);
  }
});

test.describe("모바일 폭(390px)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  const longName = "가".repeat(50);
  const pages = [
    "/",
    "/designs",
    `/designs?name=${encodeURIComponent(longName)}&industry=food`,
    "/designs/food-a",
    `/designs/stay-b?name=${encodeURIComponent(longName)}`,
    "/pricing",
  ];

  for (const path of pages) {
    test(`${path.length > 40 ? `${path.slice(0, 40)}…` : path}: 가로 스크롤이 없다`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    });
  }
});
