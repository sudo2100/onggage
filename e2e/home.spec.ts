import { expect, test } from "@playwright/test";

test("랜딩 페이지가 열린다", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("온가게");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("온가게");
});
