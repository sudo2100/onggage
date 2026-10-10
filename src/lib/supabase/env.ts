// NEXT_PUBLIC_ 값은 빌드 시 인라인되도록 process.env.키 형태로 직접 읽는다.
export function getSupabasePublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY가 설정되지 않았습니다 (.env.local 확인).",
    );
  }
  return { url, anonKey };
}
