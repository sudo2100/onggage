// proxy가 쓰는 보내기 판단. 요청 객체 없이 테스트할 수 있게 따로 둔다.
import { safeNext, withNext } from "./safe-next";

// proxy가 원래 요청 경로(+쿼리)를 실어 보내는 요청 헤더. requireUser()가 next를 만들 때 읽는다.
export const REQUEST_PATH_HEADER = "x-onggage-path";

// Supabase 로그인 쿠키(sb-<프로젝트>-auth-token, 길면 .0 .1로 나뉨). 없으면 Auth 서버에 묻지 않는다.
export function isAuthCookieName(name: string): boolean {
  return name.startsWith("sb-") && name.includes("-auth-token");
}

// 로그인해야 들어갈 수 있는 경로. 화면(page)에서도 requireUser()로 한 번 더 확인한다.
const PROTECTED_PREFIXES = ["/studio", "/admin", "/start"];
// 로그인한 사용자는 볼 일이 없는 경로 (/signup/agree, /signup/check-email은 해당 없음).
const GUEST_ONLY_PATHS = ["/login", "/signup"];

function matches(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => matches(pathname, prefix));
}

// 보낼 곳이 있으면 경로(+쿼리)를, 그대로 두면 null을 돌려준다.
export function authRedirect({
  pathname,
  search,
  isLoggedIn,
}: {
  pathname: string;
  search: string;
  isLoggedIn: boolean;
}): string | null {
  if (!isLoggedIn && isProtectedPath(pathname)) {
    return withNext("/login", safeNext(`${pathname}${search}`));
  }
  if (isLoggedIn && GUEST_ONLY_PATHS.includes(pathname)) {
    return safeNext(new URLSearchParams(search).get("next"));
  }
  return null;
}
