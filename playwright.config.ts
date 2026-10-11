import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm dev",
    // 개발 서버가 첫 컴파일 중에 같은 동적 경로로 동시 요청을 받으면 가끔 실패해서,
    // 준비 확인을 미리보기 경로로 해 테스트 시작 전에 한 번 컴파일해 둔다.
    url: `${baseURL}/dev/preview/food-a/full`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
