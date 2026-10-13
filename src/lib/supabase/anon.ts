import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { getSupabasePublicEnv } from "./env";

// 쿠키 없는 익명 클라이언트. 공개 사이트처럼 로그인과 무관한 읽기에 쓴다.
// 요청 쿠키를 읽지 않으므로 'use cache' 안에서 쓸 수 있다. RLS의 익명 정책(공개된 것만)이 적용된다.
export function createAnonClient() {
  const { url, anonKey } = getSupabasePublicEnv();
  return createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
