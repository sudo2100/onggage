import { test, type Page } from "@playwright/test";
import { expect, needsDb, signUp, signUpThroughForm } from "./helpers";

test.beforeEach(needsDb);

const step = (page: Page) => page.locator('[aria-current="step"]');

async function fillStep1(page: Page, name: string, industryLabel = "음식·카페", designName?: string) {
  await page.getByLabel("상호").fill(name);
  await page.getByLabel("업종").selectOption({ label: industryLabel });
  if (designName) await page.getByRole("radio", { name: new RegExp(designName) }).check();
  await page.getByRole("button", { name: "다음" }).click();
}

// 2단계(빈칸으로) → 3단계 → 만들기
async function finish(page: Page) {
  await expect(step(page)).toContainText("연락처");
  await page.getByRole("button", { name: "다음" }).click();
  await expect(step(page)).toContainText("말투");
  await page.getByRole("button", { name: "홈페이지 만들기" }).click();
  await expect(page).toHaveURL(/\/studio\/[0-9a-f-]{36}$/);
}

test("디자인 상세 → 가입 → 미리 채운 온보딩 → 이전·뒤로 가기에도 입력 유지 → 편집실", async ({ page }) => {
  await page.goto("/designs/beauty-b?name=" + encodeURIComponent("결 헤어"));
  await page.locator("[data-start-link]").click();
  await signUpThroughForm(page);
  await expect(page).toHaveURL(/\/start\?/);

  // 1단계: 디자인 상세에서 고른 값이 채워져 있다.
  await expect(step(page)).toContainText("가게 정보");
  await expect(page.getByLabel("상호")).toHaveValue("결 헤어");
  await expect(page.getByLabel("업종")).toHaveValue("beauty");
  await expect(page.getByRole("radio", { name: /모먼트/ })).toBeChecked();
  await page.getByRole("button", { name: "다음" }).click();

  // 2단계: 형식이 틀리면 칸 옆에 안내하고 넘어가지 않는다.
  await expect(step(page)).toContainText("연락처");
  await expect(page).toHaveURL("/start?step=2");
  await page.getByLabel("전화번호").fill("전화 주세요");
  await page.getByRole("button", { name: "다음" }).click();
  await expect(page.getByText("전화번호는 숫자와 하이픈만 쓸 수 있습니다")).toBeVisible();
  await expect(step(page)).toContainText("연락처");

  await page.getByLabel("전화번호").fill("031 922 5678");
  await page.getByLabel(/카카오톡 채널/).fill("https://open.kakao.com/o/gyeolhair");
  await page.getByLabel("주소", { exact: true }).fill("경기 고양시 일산서구 주엽로 112, 2층");
  await page.getByLabel("영업시간").fill("화–일 10:00–20:00");
  await page.getByRole("button", { name: "다음" }).click();

  // 3단계: 말투와 예상 주소
  await expect(step(page)).toContainText("말투");
  await page.getByRole("radio", { name: /따뜻한/ }).check();
  await expect(page.locator("[data-slug-preview]")).toContainText("gyeol-heeo.");
  await expect(page.getByText("공개 전에 바꿀 수 있어요")).toBeVisible();

  // "이전" 버튼 → 2단계 입력이 그대로
  await page.getByRole("button", { name: "이전" }).click();
  await expect(step(page)).toContainText("연락처");
  await expect(page.getByLabel("전화번호")).toHaveValue("031 922 5678");

  // 브라우저 뒤로 가기 → 1단계 입력이 그대로
  await page.goBack();
  await expect(step(page)).toContainText("가게 정보");
  await expect(page.getByLabel("상호")).toHaveValue("결 헤어");

  // 새로고침해도 남는다
  await page.reload();
  await expect(page.getByLabel("상호")).toHaveValue("결 헤어");
  await page.getByRole("button", { name: "다음" }).click();
  await expect(page.getByLabel("영업시간")).toHaveValue("화–일 10:00–20:00");
  await page.getByRole("button", { name: "다음" }).click();
  await expect(page.getByRole("radio", { name: /따뜻한/ })).toBeChecked();
  await page.getByRole("button", { name: "홈페이지 만들기" }).click();

  // 편집실: 초안 미리보기에 상호·가게 정보·말투 문구
  await expect(page).toHaveURL(/\/studio\/[0-9a-f-]{36}$/);
  const sitePath = new URL(page.url()).pathname;
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("결 헤어");
  await expect(page.locator("[data-site-address]")).toContainText("gyeol-heeo");
  await expect(page.getByText("모먼트 디자인 · 따뜻한 말투")).toBeVisible();
  const preview = page.locator("[data-scaled-preview]");
  await expect(preview.getByText("031-922-5678").first()).toBeAttached();
  await expect(preview.getByText("편하게 이야기 나누며 찾는 나에게 맞는 스타일")).toBeAttached();

  // 상단 바 "내 사이트"는 편집실로, /start는 "이미 만든 사이트가 있어요"
  await page.goto("/");
  await expect(page.locator("header").getByRole("link", { name: "내 사이트" })).toHaveAttribute("href", sitePath);
  await page.goto("/start");
  await expect(page.getByText("이미 만든 사이트가 있어요.")).toBeVisible();
  await page.getByRole("link", { name: "편집실로 가기" }).click();
  await expect(page).toHaveURL(sitePath);
});

test("잘못된 쿼리는 버리고 빈칸으로 시작하며, 앞 단계를 건너뛸 수 없다", async ({ page }) => {
  await signUp(page);
  await page.goto("/start?design=" + encodeURIComponent("<script>") + "&name=%20%20");
  await expect(page.getByLabel("상호")).toHaveValue("");
  await expect(page.getByLabel("업종")).toHaveValue("food");
  await expect(page.getByRole("radio", { name: /밥상/ })).toBeChecked();

  await page.goto("/start?step=3");
  await expect(step(page)).toContainText("가게 정보");
  await page.getByRole("button", { name: "다음" }).click();
  await expect(page.getByText("상호를 입력해 주세요.")).toBeVisible();
});

test("같은 상호면 주소에 숫자가 붙는다", async ({ browser }) => {
  const name = `중복상호 ${Date.now().toString(36)}`;
  const slugs: string[] = [];
  for (let i = 0; i < 2; i++) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signUp(page);
    await fillStep1(page, name);
    await finish(page);
    const address = (await page.locator("[data-site-address]").textContent()) ?? "";
    slugs.push(address.trim().split(".")[0]);
    await context.close();
  }
  expect(slugs[1]).toBe(`${slugs[0]}-2`);
});

test("두 탭에서 동시에 만들면 두 번째 탭은 '이미 만든 사이트가 있어요'", async ({ page, context }) => {
  await signUp(page);
  await fillStep1(page, "두 탭 가게");
  await expect(step(page)).toContainText("연락처");
  await page.getByRole("button", { name: "다음" }).click();
  await expect(step(page)).toContainText("말투");

  // 같은 브라우저의 다른 탭도 3단계까지 와 있다 (sessionStorage는 탭마다 따로).
  const other = await context.newPage();
  await other.goto("/start");
  await fillStep1(other, "두 탭 가게");
  await expect(step(other)).toContainText("연락처");
  await other.getByRole("button", { name: "다음" }).click();
  await expect(step(other)).toContainText("말투");

  await page.getByRole("button", { name: "홈페이지 만들기" }).click();
  await expect(page).toHaveURL(/\/studio\//);
  await other.getByRole("button", { name: "홈페이지 만들기" }).click();
  await expect(other.getByRole("alert").filter({ hasText: "이미 만든 사이트가 있어요" })).toBeVisible();
});

test("남의 편집실 주소와 잘못된 주소는 404", async ({ browser }) => {
  const ownerContext = await browser.newContext();
  const owner = await ownerContext.newPage();
  await signUp(owner);
  await fillStep1(owner, "남의 가게");
  await finish(owner);
  const sitePath = new URL(owner.url()).pathname;

  const strangerContext = await browser.newContext();
  const stranger = await strangerContext.newPage();
  await signUp(stranger);
  const response = await stranger.goto(sitePath);
  expect(response?.status()).toBe(404);
  await expect(stranger.getByText("남의 가게")).toHaveCount(0);

  const bad = await stranger.goto("/studio/not-a-uuid");
  expect(bad?.status()).toBe(404);

  await Promise.all([ownerContext.close(), strangerContext.close()]);
});
