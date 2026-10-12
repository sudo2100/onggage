import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

// 로그인한 사용자가 필요한 테스트는 로컬 Supabase(supabase start)가 있어야 한다.
// 인증 메일은 로컬에서 꺼져 있어(enable_confirmations = false) 가입 즉시 로그인된다.
try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local이 없으면 아래 DB 테스트를 건너뛴다.
}
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const needsDb = () => test.skip(!supabaseUrl || !anonKey, "로컬 Supabase 필요 (.env.local)");

const PASSWORD = "onggage-test-1234";
const uniqueEmail = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

async function signUpThroughForm(page: Page, email: string) {
  await page.getByLabel("이메일").fill(email);
  await page.getByLabel(/^비밀번호/).fill(PASSWORD);
  await page.getByLabel(/이용약관에 동의/).check();
  await page.getByLabel(/개인정보 처리방침에 동의/).check();
  await page.getByLabel(/만 14세 이상/).check();
  await page.getByRole("button", { name: "이메일로 가입하기" }).click();
}

async function logIn(page: Page, email: string, path = "/login") {
  await page.goto(path);
  await page.getByLabel("이메일").fill(email);
  await page.getByLabel("비밀번호").fill(PASSWORD);
  await page.getByRole("button", { name: "로그인", exact: true }).click();
}

// API로 직접 가입한 사용자 (가입 화면의 동의를 거치지 않음 → 동의 기록 없음)
async function createUserWithoutAgreement() {
  const email = uniqueEmail();
  const supabase = createClient(supabaseUrl!, anonKey!, { auth: { persistSession: false } });
  const { error } = await supabase.auth.signUp({ email, password: PASSWORD });
  if (error) throw error;
  return email;
}

test.describe("로그인 없이", () => {
  test("/studio, /admin, /start에 오면 /login?next=원래 경로로 간다", async ({ page }) => {
    await page.goto("/studio/abc?tab=info");
    await expect(page).toHaveURL("/login?next=%2Fstudio%2Fabc%3Ftab%3Dinfo");
    await expect(page.getByRole("heading", { name: "로그인" })).toBeVisible();

    await page.goto("/admin");
    await expect(page).toHaveURL("/login?next=%2Fadmin");

    await page.goto("/start?design=food-a");
    await expect(page).toHaveURL("/login?next=%2Fstart%3Fdesign%3Dfood-a");
  });

  test("상단 바는 무료로 시작하기·로그인을 보여 준다", async ({ page }) => {
    await page.goto("/");
    const header = page.locator("header");
    await expect(header.getByRole("link", { name: "무료로 시작하기" })).toBeVisible();
    await expect(header.getByRole("link", { name: "로그인" })).toBeVisible();
  });

  test("가입 화면은 필수 동의 3개가 없으면 제출되지 않는다", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("이메일").fill(uniqueEmail());
    await page.getByLabel(/^비밀번호/).fill(PASSWORD);
    await page.getByRole("button", { name: "이메일로 가입하기" }).click();
    await expect(page).toHaveURL("/signup");
    await expect(page.getByLabel(/이용약관에 동의/)).toHaveJSProperty("validity.valueMissing", true);
  });
});

test.describe("로그인 흐름", () => {
  test.beforeEach(needsDb);

  test("디자인 상세 → 가입 → /start?design=…&name=… 로 이어지고, 로그아웃하면 상단 바가 돌아온다", async ({ page }) => {
    await page.goto("/designs/food-a?name=" + encodeURIComponent("담소 식당"));
    await page.locator("[data-start-link]").click();
    await expect(page).toHaveURL(/\/signup\?next=/);

    await signUpThroughForm(page, uniqueEmail());
    await expect(page).toHaveURL(/\/start\?/);
    const url = new URL(page.url());
    expect(url.pathname).toBe("/start");
    expect(url.searchParams.get("design")).toBe("food-a");
    expect(url.searchParams.get("name")).toBe("담소 식당");

    // 로그인 상태: 상단 바가 "내 사이트"로 바뀐다 (캐시된 손님용 버튼이 남지 않는다).
    await page.goto("/");
    const header = page.locator("header");
    await expect(header.getByRole("link", { name: "내 사이트" })).toHaveAttribute("href", "/start");
    await expect(header.getByRole("link", { name: "무료로 시작하기" })).toHaveCount(0);

    await header.getByRole("button", { name: "로그아웃" }).click();
    await expect(page).toHaveURL("/");
    await expect(header.getByRole("link", { name: "무료로 시작하기" })).toBeVisible();
    await page.goto("/admin");
    await expect(page).toHaveURL("/login?next=%2Fadmin");
  });

  test("로그인 후 next로 가고, 외부 주소 next는 /start로 바뀐다", async ({ page }) => {
    const email = uniqueEmail();
    await page.goto("/signup");
    await signUpThroughForm(page, email);
    await expect(page).toHaveURL("/start");
    await page.context().clearCookies();

    await logIn(page, email, "/login?next=" + encodeURIComponent("//evil.com/steal"));
    await expect(page).toHaveURL("/start");
    await page.context().clearCookies();

    await logIn(page, email, "/login?next=" + encodeURIComponent("/studio/abc?tab=info"));
    await expect(page).toHaveURL("/studio/abc?tab=info");
  });

  test("이미 로그인한 사용자가 /login, /signup에 오면 next로 바로 간다", async ({ page }) => {
    await page.goto("/signup");
    await signUpThroughForm(page, uniqueEmail());
    await expect(page).toHaveURL("/start");

    await page.goto("/signup?next=" + encodeURIComponent("/start?design=beauty-a"));
    await expect(page).toHaveURL("/start?design=beauty-a");
    await page.goto("/login?next=" + encodeURIComponent("https://evil.com"));
    await expect(page).toHaveURL("/start");
  });

  test("동의 기록이 없는 사용자가 /start, /studio에 가면 /signup/agree로 가고, 동의하면 돌아간다", async ({ page }) => {
    const email = await createUserWithoutAgreement();
    await logIn(page, email);
    await expect(page).toHaveURL("/signup/agree");

    await page.goto("/studio/abc");
    await expect(page).toHaveURL("/signup/agree?next=%2Fstudio%2Fabc");
    await page.goto("/start?design=food-a");
    await expect(page).toHaveURL("/signup/agree?next=%2Fstart%3Fdesign%3Dfood-a");

    await page.getByLabel(/이용약관에 동의/).check();
    await page.getByLabel(/개인정보 처리방침에 동의/).check();
    await page.getByLabel(/만 14세 이상/).check();
    await page.getByRole("button", { name: "동의하고 계속하기" }).click();
    await expect(page).toHaveURL("/start?design=food-a");
    await expect(page.getByRole("heading", { name: "홈페이지 만들기" })).toBeVisible();
  });

  test("로그아웃은 GET으로 되지 않는다", async ({ page }) => {
    await page.goto("/signup");
    await signUpThroughForm(page, uniqueEmail());
    await expect(page).toHaveURL("/start");

    // 로그아웃 버튼은 POST 폼(Server Action)이다.
    await page.goto("/");
    const logoutForm = page.locator("header form", { has: page.getByRole("button", { name: "로그아웃" }) });
    await expect(logoutForm).toHaveAttribute("method", /post/i);

    // 흔한 로그아웃 주소를 GET으로 열거나 이미지로 불러도 세션은 그대로다.
    for (const path of ["/logout", "/signout", "/auth/logout", "/auth/signout", "/api/auth/logout"]) {
      await page.request.get(path);
    }
    await page.goto("/admin");
    await expect(page).toHaveURL("/admin");
    await expect(page.getByRole("heading", { name: "관리자" })).toBeVisible();
  });
});
