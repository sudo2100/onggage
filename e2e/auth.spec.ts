import { createClient } from "@supabase/supabase-js";
import { expect as baseExpect, test, type APIRequestContext, type Page } from "@playwright/test";

// 가입·로그인 뒤 이동은 개발 서버가 화면을 처음 컴파일하는 시간까지 기다려야 해서 여유를 둔다
// (전체 E2E를 병렬로 돌리면 5초 기본값을 넘길 때가 있다).
const expect = baseExpect.configure({ timeout: 15_000 });

// 로그인한 사용자가 필요한 테스트는 로컬 Supabase(supabase start)가 있어야 한다.
// 인증 메일은 로컬에서 꺼져 있어(enable_confirmations = false) 가입 즉시 로그인된다.
try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local이 없으면 아래 DB 테스트를 건너뛴다.
}
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const needsDb = () => {
  test.skip(!supabaseUrl || !anonKey, "로컬 Supabase 필요 (.env.local)");
  // 가입을 거치는 테스트라 기본 제한 시간(30초)의 3배를 준다.
  test.slow();
};

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

// 키가 없어도 확인할 수 있는 부분: 우리 서버가 Supabase authorize 주소(provider=…)로 보내기 시작하는지.
// 실제 카카오·구글 화면과 돌아오는 과정은 키를 넣은 뒤 직접 확인한다 (docs/auth-setup.md).
const PROVIDERS = [
  { id: "kakao", label: "카카오로 계속하기" },
  { id: "google", label: "구글로 계속하기" },
] as const;

function waitForAuthorize(page: Page, provider: string) {
  return page.waitForRequest((request) => {
    const url = new URL(request.url());
    return url.pathname === "/auth/v1/authorize" && url.searchParams.get("provider") === provider;
  });
}

function trackAuthorizeRequests(page: Page) {
  const seen: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/auth/v1/authorize") seen.push(request.url());
  });
  return seen;
}

async function checkAgreements(page: Page) {
  await page.getByLabel(/이용약관에 동의/).check();
  await page.getByLabel(/개인정보 처리방침에 동의/).check();
  await page.getByLabel(/만 14세 이상/).check();
}

test.describe("소셜 로그인 시작", () => {
  test.beforeEach(needsDb);

  for (const provider of PROVIDERS) {
    test(`가입 화면: 동의 후 ${provider.label}를 누르면 authorize(provider=${provider.id})로 간다`, async ({ page }) => {
      await page.goto("/signup?next=" + encodeURIComponent("/start?design=food-a"));
      await checkAgreements(page);
      const authorize = waitForAuthorize(page, provider.id);
      await page.getByRole("button", { name: provider.label }).click();

      const redirectTo = new URL(new URL((await authorize).url()).searchParams.get("redirect_to") ?? "");
      expect(redirectTo.pathname).toBe("/auth/callback");
      expect(redirectTo.searchParams.get("next")).toBe("/start?design=food-a");
      // 콜백에서 동의를 기록할 수 있게 약관 버전 쿠키가 남는다.
      const cookies = await page.context().cookies();
      expect(cookies.find((cookie) => cookie.name === "onggage_pending_agreement")?.path).toBe("/auth/callback");
    });

    test(`가입 화면: 동의 없이 ${provider.label}를 누르면 동의 오류가 난다`, async ({ page }) => {
      const authorizeRequests = trackAuthorizeRequests(page);
      await page.goto("/signup");
      await page.getByLabel(/이용약관에 동의/).check();
      await page.getByRole("button", { name: provider.label }).click();

      // Next의 화면 이동 안내(next-route-announcer)도 role="alert"라 문구로 고른다.
      await expect(page.getByRole("alert").filter({ hasText: "개인정보 처리방침에 동의해 주세요." })).toBeVisible();
      await expect(page).toHaveURL("/signup");
      // 이메일 가입으로 처리되지 않는다 (예전 버그: "이메일 주소를 확인해 주세요").
      await expect(page.getByText("이메일 주소를 확인해 주세요.")).toHaveCount(0);
      // 체크한 항목은 그대로 남는다.
      await expect(page.getByLabel(/이용약관에 동의/)).toBeChecked();
      expect(authorizeRequests).toHaveLength(0);
    });

    test(`로그인 화면: ${provider.label}를 누르면 authorize(provider=${provider.id})로 간다`, async ({ page }) => {
      await page.goto("/login?next=" + encodeURIComponent("/studio/abc"));
      const authorize = waitForAuthorize(page, provider.id);
      await page.getByRole("button", { name: provider.label }).click();

      const redirectTo = new URL(new URL((await authorize).url()).searchParams.get("redirect_to") ?? "");
      expect(redirectTo.pathname).toBe("/auth/callback");
      expect(redirectTo.searchParams.get("next")).toBe("/studio/abc");
      // 로그인 화면은 동의를 받지 않는다 (첫 로그인이면 콜백 뒤 /signup/agree).
      const cookies = await page.context().cookies();
      expect(cookies.find((cookie) => cookie.name === "onggage_pending_agreement")).toBeUndefined();
    });
  }
});

test.describe("두 사용자", () => {
  test.beforeEach(needsDb);

  test("로그인한 두 사용자와 손님의 화면이 서로 섞이지 않는다", async ({ browser }) => {
    const [a, b, guest] = await Promise.all([browser.newContext(), browser.newContext(), browser.newContext()]);
    const [pageA, pageB, pageGuest] = await Promise.all([a.newPage(), b.newPage(), guest.newPage()]);
    for (const page of [pageA, pageB]) {
      await page.goto("/signup");
      await signUpThroughForm(page, uniqueEmail());
      await expect(page).toHaveURL("/start");
    }

    // 같은 화면을 번갈아 열어도 각자 자기 상태가 보인다 (서버·CDN 캐시로 섞이지 않음).
    for (const path of ["/", "/pricing", "/", "/designs"]) {
      for (const [page, loggedIn] of [[pageA, true], [pageGuest, false], [pageB, true]] as const) {
        await page.goto(path);
        const header = page.locator("header");
        await expect(header.getByRole("link", { name: loggedIn ? "내 사이트" : "무료로 시작하기" })).toBeVisible();
        await expect(header.getByRole("link", { name: loggedIn ? "무료로 시작하기" : "내 사이트" })).toHaveCount(0);
      }
    }

    // A가 로그아웃해도 B는 그대로 로그인 상태다.
    await pageA.goto("/");
    await pageA.locator("header").getByRole("button", { name: "로그아웃" }).click();
    await expect(pageA.locator("header").getByRole("link", { name: "무료로 시작하기" })).toBeVisible();
    await pageB.goto("/admin");
    await expect(pageB).toHaveURL("/admin");
    await pageA.goto("/admin");
    await expect(pageA).toHaveURL("/login?next=%2Fadmin");

    await Promise.all([a.close(), b.close(), guest.close()]);
  });
});

// 로컬 Supabase는 메일을 실제로 보내지 않고 Mailpit에 쌓는다 (supabase start 출력의 MAILPIT_URL).
const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

// 받은 메일에서 token_hash가 붙은 링크를 꺼낸다. 메일이 늦게 올 수 있어 잠시 기다린다.
async function waitForMailLink(request: APIRequestContext, email: string): Promise<string> {
  const query = encodeURIComponent(`to:"${email}"`);
  for (let attempt = 0; attempt < 30; attempt++) {
    const search = await (await request.get(`${MAILPIT_URL}/api/v1/search?query=${query}`)).json();
    const id: string | undefined = search.messages?.[0]?.ID;
    if (id) {
      const message = await (await request.get(`${MAILPIT_URL}/api/v1/message/${id}`)).json();
      const href = /href="([^"]*token_hash=[^"]*)"/.exec(message.HTML ?? "")?.[1];
      if (href) return href.replaceAll("&amp;", "&");
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`${email}로 온 메일 링크를 찾지 못했습니다 (${MAILPIT_URL})`);
}

test.describe("비밀번호 찾기", () => {
  test.beforeEach(needsDb);

  test("재설정 메일 링크 → 새 비밀번호 → next로 가고, 새 비밀번호로만 로그인된다", async ({ page }) => {
    const email = uniqueEmail();
    await page.goto("/signup");
    await signUpThroughForm(page, email);
    await expect(page).toHaveURL("/start");
    await page.context().clearCookies();

    await page.goto("/forgot-password?next=" + encodeURIComponent("/studio/abc"));
    await page.getByLabel("가입한 이메일").fill(email);
    await page.getByRole("button", { name: "재설정 메일 보내기" }).click();
    await expect(page.getByRole("status")).toContainText("비밀번호 재설정 메일을 보냈어요");

    const link = await waitForMailLink(page.request, email);
    const linkUrl = new URL(link);
    expect(linkUrl.pathname).toBe("/auth/callback");
    expect(linkUrl.searchParams.get("type")).toBe("recovery");

    await page.goto(link);
    await expect(page).toHaveURL("/reset-password?next=%2Fstudio%2Fabc");
    const newPassword = "onggage-new-5678";
    await page.getByLabel(/^새 비밀번호 \(/).fill(newPassword);
    await page.getByLabel("새 비밀번호 확인").fill(newPassword);
    await page.getByRole("button", { name: "비밀번호 바꾸기" }).click();
    await expect(page).toHaveURL("/studio/abc");
    await page.context().clearCookies();

    // 예전 비밀번호는 더 이상 안 된다.
    await logIn(page, email);
    await expect(page.getByRole("alert").filter({ hasText: "이메일 또는 비밀번호가 맞지 않아요." })).toBeVisible();

    await page.getByLabel("비밀번호").fill(newPassword);
    await page.getByRole("button", { name: "로그인", exact: true }).click();
    await expect(page).toHaveURL("/start");
  });

  test("이미 쓴 재설정 링크는 다시 쓸 수 없다", async ({ page }) => {
    const email = uniqueEmail();
    await page.goto("/signup");
    await signUpThroughForm(page, email);
    await expect(page).toHaveURL("/start");
    await page.context().clearCookies();

    await page.goto("/forgot-password");
    await page.getByLabel("가입한 이메일").fill(email);
    await page.getByRole("button", { name: "재설정 메일 보내기" }).click();
    const link = await waitForMailLink(page.request, email);

    await page.goto(link);
    await expect(page).toHaveURL("/reset-password");
    await page.context().clearCookies();
    await page.goto(link);
    await expect(page).toHaveURL("/forgot-password?error=expired");
    await expect(page.getByRole("alert").filter({ hasText: "재설정 링크가 만료되었거나" })).toBeVisible();
  });
});
