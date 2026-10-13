import { connection } from "next/server";
import { checkHealth } from "@/lib/health";
import { createAnonClient } from "@/lib/supabase/anon";

// 배포 플랫폼 헬스 체크. 응답은 {"ok": true} 또는 503 + {"ok": false}뿐이다 (src/lib/health.ts).
// 자세한 진단은 관리자 전용 페이지로 따로 만든다 (docs/phase1-tasks.md 작업 7의 계획).
export async function GET() {
  // 요청마다 실제로 확인한다. 이 줄이 없으면 빌드 때 한 번 만든 응답이 정적으로 굳는다.
  await connection();

  const result = await checkHealth(async (signal) => {
    // DB 연결 확인: 익명 권한으로 sites를 행 없이(HEAD) 한 번 조회한다. RLS를 그대로 거친다.
    const { error } = await createAnonClient()
      .from("sites")
      .select("id", { head: true })
      .limit(1)
      .abortSignal(signal);
    if (error) throw error;
  });

  return Response.json(result.body, {
    status: result.status,
    // 헬스 체크 결과는 캐시하면 안 된다 (CDN·플랫폼 프록시 포함).
    headers: { "Cache-Control": "no-store" },
  });
}
