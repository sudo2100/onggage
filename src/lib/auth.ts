import "server-only";
import type { User } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { hasCurrentAgreement } from "./agreement";
import { isAuthCookieName, REQUEST_PATH_HEADER } from "./auth-routes";
import { safeNext, withNext } from "./safe-next";
import { createClient } from "./supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// 로그인 정보 읽기의 단일 창구. 모두 getUser()로 Auth 서버에 확인한다 (getSession()은 권한 판단에 쓰지 않는다).
// cacheComponents 환경에서 여기 결과를 'use cache'로 감싸지 않는다. 로그아웃 뒤에도 남을 수 있다.

export async function getCurrentUser(): Promise<User | null> {
  // 로그인 쿠키가 없으면 Auth 서버에 묻지 않는다 (마케팅 화면 손님 대부분).
  if (!(await cookies()).getAll().some(({ name }) => isAuthCookieName(name))) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

// 방금 세션을 만든 곳(/auth/callback)에서는 그 클라이언트를 넘겨받아 같은 세션으로 읽는다.
export async function hasAgreement(userId: string, client?: SupabaseServerClient): Promise<boolean> {
  const supabase = client ?? (await createClient());
  const { data } = await supabase
    .from("profiles")
    .select("terms_agreed_at, privacy_agreed_at, age_confirmed_at, terms_version")
    .eq("id", userId)
    .maybeSingle();
  return hasCurrentAgreement(data);
}

// 지금 요청의 경로(+쿼리). proxy가 헤더로 넘겨준다.
async function currentPath(): Promise<string> {
  return safeNext((await headers()).get(REQUEST_PATH_HEADER));
}

// 로그인 + 동의 기록이 있어야 하는 화면(/start, /studio, /admin)의 맨 앞에서 부른다.
// 레이아웃은 화면 이동 때 다시 그려지지 않을 수 있어서, 각 page에서 부른다.
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(withNext("/login", await currentPath()));
  if (!(await hasAgreement(user.id))) redirect(withNext("/signup/agree", await currentPath()));
  return user;
}
