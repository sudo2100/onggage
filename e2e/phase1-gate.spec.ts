import { test } from "@playwright/test";
import { expect, needsDb, signUpThroughForm } from "./helpers";

// 1단계 관문: 랜딩 → 디자인 목록 → 상세 → 가입 → 온보딩 → 편집실 → 공개 → 공개 사이트를 한 번에 잇는다.
// 걸린 시간을 기록한다 (사람이 입력하는 시간은 들어 있지 않다).
test.beforeEach(needsDb);

const FIVE_MINUTES = 5 * 60 * 1000;

test("랜딩에서 공개 사이트까지 한 흐름으로 이어지고 5분 안에 끝난다", async ({ page }, testInfo) => {
  const startedAt = Date.now();
  const name = `관문 가게 ${Date.now().toString(36)}`;
  const slug = `gate-${Date.now().toString(36)}`;

  // 랜딩: 상호·업종 입력 → 디자인 보기
  await page.goto("/");
  const hero = page.locator("form[action='/designs']");
  await hero.getByLabel("상호").fill(name);
  await hero.getByLabel("업종").selectOption("beauty");
  await hero.getByRole("button", { name: "내 가게 디자인 보기" }).click();

  // 디자인 목록 → 상세 → 시작
  await expect(page).toHaveURL(/\/designs\?/);
  await page.locator('[data-design-card="beauty-a"]').getByRole("link").first().click();
  await expect(page).toHaveURL(/\/designs\/beauty-a/);
  await page.locator("[data-start-link]").click();

  // 가입 → 온보딩(상호·업종·디자인이 이어져 있다)
  await expect(page).toHaveURL(/\/signup\?next=/);
  await signUpThroughForm(page);
  await expect(page).toHaveURL(/\/start\?/);
  // Next는 뒤로 가기에 대비해 직전 화면(랜딩)을 숨긴 채 DOM에 남겨 두므로, 보이는 입력칸만 찾는다.
  await expect(page.getByLabel("상호").filter({ visible: true })).toHaveValue(name);
  await expect(page.getByLabel("업종").filter({ visible: true })).toHaveValue("beauty");
  await expect(page.getByRole("radio", { name: /결/ })).toBeChecked();
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByLabel("전화번호").fill("031-922-5678");
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByRole("button", { name: "홈페이지 만들기" }).click();

  // 편집실 → 공개
  await expect(page).toHaveURL(/\/studio\/[0-9a-f-]{36}$/);
  await page.getByRole("button", { name: "공개하기", exact: true }).click();
  await page.getByLabel("홈페이지 주소").fill(slug);
  await page.getByRole("button", { name: "이 주소로 공개하기" }).click();
  await expect(page.locator("[data-publish-state]")).toHaveAttribute("data-publish-state", "published");

  // 공개 사이트
  const response = await page.goto(`http://${slug}.localhost:3000/`);
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
  await expect(page.getByText("031-922-5678").first()).toBeVisible();

  const elapsed = Date.now() - startedAt;
  testInfo.annotations.push({ type: "elapsed", description: `${(elapsed / 1000).toFixed(1)}초` });
  console.log(`[phase1-gate] 랜딩 → 공개 사이트: ${(elapsed / 1000).toFixed(1)}초`);
  expect(elapsed).toBeLessThan(FIVE_MINUTES);
});
