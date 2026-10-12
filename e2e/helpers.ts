import { expect as baseExpect, test, type Page } from "@playwright/test";

// 로그인한 사용자가 필요한 E2E의 공통 준비. 로컬 Supabase(.env.local)가 있어야 한다.
try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local이 없으면 needsDb()가 테스트를 건너뛴다.
}

// 가입·화면 이동 뒤에는 개발 서버가 화면을 처음 컴파일하는 시간까지 기다린다.
export const expect = baseExpect.configure({ timeout: 15_000 });

export const PASSWORD = "onggage-test-1234";

export function needsDb() {
  test.skip(
    !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    "로컬 Supabase 필요 (.env.local)",
  );
  test.slow();
}

export const uniqueEmail = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

// 가입 화면(/signup…)이 열린 상태에서 이메일 가입을 마친다.
export async function signUpThroughForm(page: Page, email = uniqueEmail()) {
  await page.getByLabel("이메일").fill(email);
  await page.getByLabel(/^비밀번호/).fill(PASSWORD);
  await page.getByLabel(/이용약관에 동의/).check();
  await page.getByLabel(/개인정보 처리방침에 동의/).check();
  await page.getByLabel(/만 14세 이상/).check();
  await page.getByRole("button", { name: "이메일로 가입하기" }).click();
  return email;
}

export async function signUp(page: Page) {
  await page.goto("/signup");
  const email = await signUpThroughForm(page);
  await expect(page).toHaveURL("/start");
  return email;
}
