import { expect, test } from "@playwright/test";

// 배포 플랫폼 헬스 체크. 로컬 Supabase가 켜져 있으면 {"ok": true}만 돌려준다.
test("/api/health는 키가 ok 하나뿐인 JSON을 캐시 없이 돌려준다", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/json");
  expect(response.headers()["cache-control"]).toBe("no-store");
  const body = await response.json();
  expect(Object.keys(body)).toEqual(["ok"]);
  expect(body).toEqual({ ok: true });
});

test("메인 robots.txt는 /api를 막는다", async ({ request }) => {
  expect(await (await request.get("/robots.txt")).text()).toContain("Disallow: /api");
});
