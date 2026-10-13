import { createClient } from "@supabase/supabase-js";
import { test, type Page } from "@playwright/test";
import { expect, needsDb, PASSWORD, signUp } from "./helpers";

test.beforeEach(needsDb);

// 로컬에서 공개 사이트는 {slug}.localhost:3000 (Chrome은 *.localhost를 내 PC로 연결한다).
const PORT = Number(process.env.E2E_PORT ?? 3000);
const siteOrigin = (slug: string) => `http://${slug}.localhost:${PORT}`;
const uniqueSlug = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

// 가입 → 온보딩(상호만 입력) → 편집실. 편집실 주소와 이메일을 돌려준다.
async function createSite(page: Page, name: string) {
  const email = await signUp(page);
  await page.getByLabel("상호").fill(name);
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByRole("button", { name: "홈페이지 만들기" }).click();
  await expect(page).toHaveURL(/\/studio\/[0-9a-f-]{36}$/);
  return { email, studioUrl: page.url(), siteId: page.url().split("/").at(-1)! };
}

async function publishFirstTime(page: Page, slug: string) {
  await page.getByRole("button", { name: "공개하기", exact: true }).click();
  await page.getByLabel("홈페이지 주소").fill(slug);
  await page.getByRole("button", { name: "이 주소로 공개하기" }).click();
}

// 편집 화면이 아직 없어서, 그 사용자 권한(RLS)으로 초안의 소개 글을 직접 고친다.
async function editDraftAbout(email: string, siteId: string, body: string) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
  const { error: loginError } = await supabase.auth.signInWithPassword({ email, password: PASSWORD });
  if (loginError) throw loginError;
  const { data, error } = await supabase
    .from("site_versions")
    .select("sections")
    .eq("site_id", siteId)
    .eq("kind", "draft")
    .single();
  if (error) throw error;
  const sections = (data.sections as { type: string; body?: string }[]).map((section) =>
    section.type === "about" ? { ...section, body } : section,
  );
  const { error: updateError } = await supabase
    .from("site_versions")
    .update({ sections })
    .eq("site_id", siteId)
    .eq("kind", "draft");
  if (updateError) throw updateError;
}

test("공개 전 404 → 주소를 고쳐 공개 → 같은 주소에서 서버 렌더링된 본문·메타 태그·CSS", async ({ page }) => {
  const name = `공개 가게 ${Date.now().toString(36)}`;
  const slug = uniqueSlug("e2e-pub");
  const { studioUrl } = await createSite(page, name);

  // 공개 전: 고칠 주소와 자동 제안 주소 모두 404 (이때 "없음"이 캐시돼도 공개 뒤에 남으면 안 된다)
  const autoAddress = (await page.locator("[data-site-address]").textContent())!.trim();
  const before = await page.goto(`${siteOrigin(slug)}/`);
  expect(before?.status()).toBe(404);
  const autoBefore = await page.goto(`http://${autoAddress}/`);
  expect(autoBefore?.status()).toBe(404);
  const sitemapBefore = await page.goto(`${siteOrigin(slug)}/sitemap.xml`);
  expect(sitemapBefore?.status()).toBe(404);

  // 편집실에서 주소를 고쳐 공개
  await page.goto(studioUrl);
  await expect(page.locator("[data-publish-state]")).toHaveAttribute("data-publish-state", "never");
  await publishFirstTime(page, slug);
  await expect(page.locator("[data-publish-state]")).toHaveAttribute("data-publish-state", "published");
  await expect(page.locator("[data-public-link]")).toHaveText(`${slug}.localhost:${PORT}`);
  await expect(page.locator("[data-site-status]")).toHaveText("공개 중");
  // 공개한 뒤에는 주소를 고칠 칸이 없다
  await expect(page.getByLabel("홈페이지 주소")).toHaveCount(0);

  // 같은 주소: 이제 본문이 보인다 (404 캐시가 남지 않음)
  const cssResponses: number[] = [];
  page.on("response", (response) => {
    if (response.request().resourceType() === "stylesheet") cssResponses.push(response.status());
  });
  const after = await page.goto(`${siteOrigin(slug)}/`);
  expect(after?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);

  // 서버가 보낸 HTML 자체에 본문과 메타 태그가 들어 있다 (서버 렌더링)
  const html = await after!.text();
  expect(html).toContain(name);
  expect(html).toContain(`<title>${name}</title>`);
  expect(html).toMatch(/<meta name="description" content="[^"]+"/);
  expect(html).toContain(`<meta property="og:title" content="${name}"`);
  // Next는 첫 화면 주소의 끝 /를 떼고 내보낸다 (같은 주소).
  expect(html).toMatch(new RegExp(`<link rel="canonical" href="${siteOrigin(slug).replaceAll(".", "\\.")}/?"`));
  expect(html).not.toContain("| 온가게</title>");

  // CSS(/_next/static)가 서브도메인에서도 로드되고 실제로 적용된다
  expect(cssResponses.length).toBeGreaterThan(0);
  expect(cssResponses.every((status) => status === 200)).toBe(true);
  expect(await page.evaluate(() => getComputedStyle(document.body).margin)).toBe("0px");
  const heroHeight = await page.getByRole("heading", { level: 1 }).evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(heroHeight).toBeGreaterThan(24);

  // 자동 제안 주소는 쓰지 않았으니 여전히 404
  const autoAfter = await page.goto(`http://${autoAddress}/`);
  expect(autoAfter?.status()).toBe(404);

  // 서브도메인 robots.txt·sitemap.xml, 그 밖의 경로는 404
  const robots = await page.goto(`${siteOrigin(slug)}/robots.txt`);
  expect(robots?.status()).toBe(200);
  expect(await robots!.text()).toContain(`Sitemap: ${siteOrigin(slug)}/sitemap.xml`);
  const sitemap = await page.goto(`${siteOrigin(slug)}/sitemap.xml`);
  expect(await sitemap!.text()).toContain(`<loc>${siteOrigin(slug)}/</loc>`);
  const studioOnSubdomain = await page.goto(`${siteOrigin(slug)}/studio`);
  expect(studioOnSubdomain?.status()).toBe(404);

  // 메인 도메인의 /sites/{slug}는 서브도메인 주소로 301
  const redirect = await page.request.get(`/sites/${slug}`, { maxRedirects: 0 });
  expect(redirect.status()).toBe(301);
  expect(redirect.headers().location).toBe(`${siteOrigin(slug)}/`);
});

test("초안을 고쳐도 공개본은 그대로 → 변경 사항 공개하기 → 반영, 공개 중지 → 404 → 다시 공개", async ({ page }) => {
  const slug = uniqueSlug("e2e-flow");
  const { email, siteId, studioUrl } = await createSite(page, `흐름 가게 ${Date.now().toString(36)}`);
  await publishFirstTime(page, slug);
  await expect(page.locator("[data-publish-state]")).toHaveAttribute("data-publish-state", "published");

  await page.goto(`${siteOrigin(slug)}/`);
  const original = (await page.locator("section").nth(1).textContent()) ?? "";

  const changed = `새로 고친 소개 글 ${Date.now()}`;
  await editDraftAbout(email, siteId, changed);
  await page.goto(`${siteOrigin(slug)}/`);
  await expect(page.getByText(changed)).toHaveCount(0);
  expect((await page.locator("section").nth(1).textContent()) ?? "").toBe(original);

  await page.goto(studioUrl);
  await page.getByRole("button", { name: "변경 사항 공개하기" }).click();
  await expect(page.getByRole("status").filter({ hasText: "공개 홈페이지에 반영했어요." })).toBeVisible();
  await page.goto(`${siteOrigin(slug)}/`);
  await expect(page.getByText(changed)).toBeVisible();

  // 공개 중지 → 404, 주소는 잠긴 채로 남는다
  await page.goto(studioUrl);
  await page.getByRole("button", { name: "공개 중지" }).click();
  await page.getByRole("button", { name: "공개 중지" }).click(); // 패널 안 확인
  await expect(page.locator("[data-publish-state]")).toHaveAttribute("data-publish-state", "stopped");
  await expect(page.getByLabel("홈페이지 주소")).toHaveCount(0);
  const stopped = await page.goto(`${siteOrigin(slug)}/`);
  expect(stopped?.status()).toBe(404);

  await page.goto(studioUrl);
  await page.getByRole("button", { name: "다시 공개하기" }).click();
  await expect(page.locator("[data-publish-state]")).toHaveAttribute("data-publish-state", "published");
  const again = await page.goto(`${siteOrigin(slug)}/`);
  expect(again?.status()).toBe(200);
  await expect(page.getByText(changed)).toBeVisible();
});

test("남이 쓰는 주소·예약어·형식이 틀린 주소로는 공개되지 않는다", async ({ browser }) => {
  const takenSlug = uniqueSlug("e2e-taken");
  const ownerContext = await browser.newContext();
  const owner = await ownerContext.newPage();
  await createSite(owner, `먼저 온 가게 ${Date.now().toString(36)}`);
  await publishFirstTime(owner, takenSlug);
  await expect(owner.locator("[data-publish-state]")).toHaveAttribute("data-publish-state", "published");

  const otherContext = await browser.newContext();
  const other = await otherContext.newPage();
  await createSite(other, `나중 온 가게 ${Date.now().toString(36)}`);

  await publishFirstTime(other, takenSlug);
  await expect(other.getByRole("alert").filter({ hasText: "이미 다른 가게가 쓰는 주소예요" })).toBeVisible();
  await other.getByLabel("홈페이지 주소").fill("admin");
  await other.getByRole("button", { name: "이 주소로 공개하기" }).click();
  await expect(other.getByRole("alert").filter({ hasText: "쓸 수 없는 주소예요" })).toBeVisible();
  await other.getByLabel("홈페이지 주소").fill("Bad Slug!");
  await other.getByRole("button", { name: "이 주소로 공개하기" }).click();
  await expect(other.getByRole("alert").filter({ hasText: "영문 소문자·숫자·하이픈" })).toBeVisible();
  await expect(other.locator("[data-publish-state]")).toHaveAttribute("data-publish-state", "never");

  await Promise.all([ownerContext.close(), otherContext.close()]);
});

test("메인 robots.txt는 /sites를 막지 않고, 메인 sitemap.xml에는 /dev가 없다", async ({ request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /studio");
  expect(robots).not.toContain("Disallow: /sites");
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).not.toContain("/dev");
  expect(sitemap).toContain("/designs</loc>");
});
