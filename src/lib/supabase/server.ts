import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import type { Database } from "./database.types";
import { getSupabasePublicEnv } from "./env";

// 서버 컴포넌트·Server Action·Route Handler용. 요청마다 새로 만든다.
export async function createClient() {
  const { url, anonKey } = getSupabasePublicEnv();
  // 요청 때만 실행되게 표시한다. 링크 미리 불러오기(prefetch) 단계는 쿠키를 읽을 수 있어도
  // 현재 시각 읽기를 막는데, Supabase가 세션 만료 확인에 Date.now()를 쓴다.
  await connection();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // 서버 컴포넌트에서는 쿠키를 쓸 수 없다. 세션 갱신은 proxy에서 처리한다.
        }
      },
    },
  });
}
