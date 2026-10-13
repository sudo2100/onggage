import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkHealth } from "./health";

// 내부 정보가 응답에 섞이면 안 된다. 일부러 이런 문구를 담은 오류를 던져 본다.
const LEAKY_ERROR = new Error(
  "connect ECONNREFUSED 127.0.0.1:54321 (supabase postgrest) NEXT_PUBLIC_SUPABASE_URL missing at /var/app/.env.local",
);

describe("checkHealth", () => {
  beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {}));
  afterEach(() => vi.restoreAllMocks());

  it("확인에 성공하면 200과 {ok: true}, 키는 ok 하나뿐", async () => {
    const result = await checkHealth(async () => {});
    expect(result).toEqual({ status: 200, body: { ok: true } });
    expect(Object.keys(result.body)).toEqual(["ok"]);
  });

  it("확인에 실패하면 503과 {ok: false}, 키는 ok 하나뿐이고 오류 문구가 응답에 없다", async () => {
    const result = await checkHealth(async () => {
      throw LEAKY_ERROR;
    });
    expect(result).toEqual({ status: 503, body: { ok: false } });
    expect(Object.keys(result.body)).toEqual(["ok"]);
    const serialized = JSON.stringify(result.body);
    for (const secret of ["supabase", "54321", "NEXT_PUBLIC", ".env", "ECONNREFUSED"]) {
      expect(serialized).not.toContain(secret);
    }
  });

  it("실패 원인은 서버 로그에만 남긴다", async () => {
    await checkHealth(async () => {
      throw LEAKY_ERROR;
    });
    expect(console.error).toHaveBeenCalledWith("[health] 확인 실패", LEAKY_ERROR);
  });

  it("확인이 제한 시간을 넘기면 503이고, 확인 작업에 중단 신호를 보낸다", async () => {
    let received: AbortSignal | undefined;
    const result = await checkHealth((signal) => {
      received = signal;
      return new Promise(() => {}); // 끝나지 않는 확인
    }, 20);
    expect(result).toEqual({ status: 503, body: { ok: false } });
    expect(received?.aborted).toBe(true);
  });
});
