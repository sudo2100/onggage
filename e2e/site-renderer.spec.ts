import { expect, test, type Page } from "@playwright/test";

// /dev/preview는 개발 서버(pnpm dev)에서만 열린다. playwright.config.ts의 webServer가 pnpm dev를 띄운다.

const DESIGNS = [
  { id: "food-a", font: "myeongjo" },
  { id: "food-b", font: "batang" },
  { id: "beauty-a", font: "dodum" },
  { id: "beauty-b", font: "plex" },
  { id: "stay-a", font: "batang" },
  { id: "stay-b", font: "myeongjo" },
  { id: "pro-a", font: "plex" },
  { id: "pro-b", font: "myeongjo" },
] as const;

// @font-face의 font-family 이름(정규화)으로 글꼴을 구분한다.
const FONT_FAMILIES = {
  myeongjo: "nanummyeongjo",
  batang: "gowunbatang",
  dodum: "gowundodum",
  plex: "ibmplexsanskr",
} as const;
const PRETENDARD = "pretendard";

const MOBILE = { width: 390, height: 844 };

async function waitForFonts(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

test.describe("모바일 폭(390px)", () => {
  test.use({ viewport: MOBILE });

  for (const { id } of DESIGNS) {
    for (const business of ["full", "empty"] as const) {
      test(`${id} (${business}): 가로 스크롤이 없다`, async ({ page }) => {
        await page.goto(`/dev/preview/${id}/${business}`);
        await expect(page.locator("[data-site-root]")).toBeVisible();
        await waitForFonts(page);
        const { scrollWidth, clientWidth } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

        // 사진이 없을 때 대표 화면에 색 배경(그라데이션)이 실제 크기로 보인다.
        const photo = page.locator('[data-section="hero"] [data-photo]');
        const box = await photo.boundingBox();
        expect(box?.width).toBeGreaterThan(300);
        expect(box?.height).toBeGreaterThan(300);
        expect(await photo.evaluate((el) => getComputedStyle(el).backgroundImage)).toContain("gradient");
      });
    }
  }

  test("가게 정보가 있으면 하단 버튼이 보이고, 비면 숨는다", async ({ page }) => {
    await page.goto("/dev/preview/food-a/full");
    const bar = page.getByRole("navigation", { name: "빠른 연락" });
    await expect(bar).toBeVisible();
    await expect(bar.getByRole("link")).toHaveText(["전화", "카카오톡", "길찾기"]);

    await page.goto("/dev/preview/food-a/empty");
    await expect(page.locator("[data-site-root]")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "빠른 연락" })).toHaveCount(0);
  });

  test("카카오톡이 @아이디뿐이면 카카오톡 버튼만 빠진다", async ({ page }) => {
    await page.goto("/dev/preview/stay-a/full");
    await expect(page.getByRole("navigation", { name: "빠른 연락" }).getByRole("link")).toHaveText([
      "전화",
      "길찾기",
    ]);
  });
});

test("대표 화면 버튼을 누르면 문의 섹션으로 가고, 문의 보내기는 준비 중으로 막혀 있다", async ({ page }) => {
  await page.goto("/dev/preview/food-a/full");
  await page.locator('[data-section="hero"]').getByRole("link", { name: "예약·문의하기" }).click();
  await expect(page).toHaveURL(/#contact$/);
  const contact = page.locator("section#contact");
  await expect(contact).toBeInViewport();
  await expect(contact.getByRole("button", { name: "문의 보내기" })).toBeDisabled();
  await expect(contact.getByText("온라인 문의는 준비 중이에요. 전화나 카카오톡으로 연락해 주세요.")).toBeVisible();
});

test("PC 폭에서는 하단 버튼을 보여 주지 않는다", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/dev/preview/food-a/full");
  await expect(page.locator("[data-site-root]")).toBeVisible();
  await expect(page.locator("[data-quick-actions]")).toBeHidden();
});

// 한글 글꼴은 글자 범위별로 파일이 여러 개라, 파일 수가 아니라 "어느 글꼴의 파일인지"로 확인한다.
for (const font of ["myeongjo", "batang", "dodum", "plex"] as const) {
  const design = DESIGNS.find((d) => d.font === font)!;

  test(`${design.id}: theme 글꼴(${font})과 Pretendard만 내려받는다`, async ({ page }) => {
    const fontRequests: string[] = [];
    page.on("request", (request) => {
      if (request.resourceType() === "font" || /\.woff2?(\?|$)/.test(request.url())) {
        fontRequests.push(new URL(request.url()).pathname);
      }
    });

    await page.goto(`/dev/preview/${design.id}/full`);
    await expect(page.locator("[data-site-root]")).toBeVisible();
    await waitForFonts(page);

    // 페이지 CSS의 @font-face에서 "파일 경로 → 글꼴 이름" 표를 만든다.
    const fontFaces = await page.evaluate(() => {
      const map: Record<string, string> = {};
      for (const sheet of Array.from(document.styleSheets)) {
        let rules: CSSRuleList;
        try {
          rules = sheet.cssRules;
        } catch {
          continue;
        }
        for (const rule of Array.from(rules)) {
          if (!(rule instanceof CSSFontFaceRule)) continue;
          const family = rule.style.getPropertyValue("font-family").toLowerCase().replace(/[^a-z]/g, "");
          for (const match of rule.style.getPropertyValue("src").matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
            // src의 상대 경로는 그 스타일시트 주소를 기준으로 한다.
            map[new URL(match[1], sheet.href ?? location.href).pathname] = family;
          }
        }
      }
      return map;
    });

    // 네 글꼴의 @font-face가 모두 CSS에 있는지 먼저 확인한다 (있는데도 안 받는지를 보려는 것).
    const declared = new Set(Object.values(fontFaces));
    for (const family of [...Object.values(FONT_FAMILIES), PRETENDARD]) {
      expect([...declared].some((d) => d.includes(family)), `${family} @font-face 선언`).toBe(true);
    }

    expect(fontRequests.length).toBeGreaterThan(0);
    const downloaded = new Set(
      fontRequests.map((path) => {
        const family = fontFaces[path];
        expect(family, `@font-face에 없는 글꼴 파일: ${path}`).toBeDefined();
        return family;
      }),
    );

    const themeFamily = FONT_FAMILIES[font];
    const isAllowed = (family: string) => family.includes(themeFamily) || family.includes(PRETENDARD);
    expect([...downloaded].filter((family) => !isAllowed(family))).toEqual([]);
    expect([...downloaded].some((family) => family.includes(themeFamily))).toBe(true);
    expect([...downloaded].some((family) => family.includes(PRETENDARD))).toBe(true);

    for (const [other, family] of Object.entries(FONT_FAMILIES)) {
      if (other === font) continue;
      expect([...downloaded].some((d) => d.includes(family)), `${other} 글꼴을 내려받으면 안 된다`).toBe(false);
    }
  });
}

test("/dev/preview에서 8개 디자인을 PC·모바일 폭으로 함께 본다", async ({ page }) => {
  await page.goto("/dev/preview");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("디자인 미리보기");
  for (const { id } of DESIGNS) {
    await expect(page.locator(`iframe[src="/dev/preview/${id}/full"]`)).toHaveCount(2);
  }
  const widths = await page
    .locator('iframe[src="/dev/preview/food-a/full"]')
    .evaluateAll((frames) => frames.map((f) => f.getBoundingClientRect().width));
  expect(widths.sort((a, b) => a - b)).toEqual([390, 980]);
});
