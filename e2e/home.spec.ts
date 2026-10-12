import { expect, test } from "@playwright/test";

test("랜딩 페이지가 열린다", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/온가게/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("상호만 넣으면 우리 가게 홈페이지가 바로 생겨요");
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /온가게/);
});
