// /api/health 응답 만들기. 배포 플랫폼의 헬스 체크용이라 누구나 부를 수 있다.
// 응답은 {"ok": true} 또는 {"ok": false} 하나뿐이다. 저장 방식·경로·환경변수 유무·연동 서비스 이름·
// 오류 문구 같은 내부 정보는 응답에 넣지 않고, 실패 원인은 서버 로그에만 남긴다.

export const HEALTH_TIMEOUT_MS = 3000;

export type HealthResult = { status: 200 | 503; body: { ok: boolean } };

// probe: 의존 서비스(DB)를 가볍게 확인하고, 문제가 있으면 예외를 던진다. signal이 끊기면 멈춘다.
export async function checkHealth(
  probe: (signal: AbortSignal) => Promise<void>,
  timeoutMs: number = HEALTH_TIMEOUT_MS,
): Promise<HealthResult> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`health check timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    await Promise.race([probe(controller.signal), timeout]);
    return { status: 200, body: { ok: true } };
  } catch (error) {
    console.error("[health] 확인 실패", error);
    return { status: 503, body: { ok: false } };
  } finally {
    clearTimeout(timer);
  }
}
