import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { authRedirect, isAuthCookieName, REQUEST_PATH_HEADER } from "@/lib/auth-routes";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

// 요청마다 Supabase 세션 쿠키를 갱신하고, 로그인 여부에 따라 보낸다.
// 여기서의 판단은 빠른 1차 확인일 뿐이다. 권한은 화면·Server Action에서 requireUser()로 다시 확인한다.
// 작업 6에서 서브도메인 rewrite(가게.onggage.kr → /sites/[slug])를 여기에 추가한다.
// 그때 아래 matcher의 sites/ 제외와 서브도메인 요청의 처리 순서도 함께 정한다.
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // 클라이언트가 보낸 같은 이름의 헤더는 덮어쓴다.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(REQUEST_PATH_HEADER, `${pathname}${search}`);

  const pendingCookies: { name: string; value: string; options: Parameters<NextResponse["cookies"]["set"]>[2] }[] = [];
  const pendingHeaders: Record<string, string> = {};

  let isLoggedIn = false;
  // 로그인 쿠키가 없으면 Supabase에 묻지 않는다 (처음 온 손님은 네트워크 요청 없이 통과).
  if (request.cookies.getAll().some(({ name }) => isAuthCookieName(name))) {
    const { url, anonKey } = getSupabasePublicEnv();
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          // 갱신된 토큰을 이번 요청의 화면 렌더링에도 넘기고, 응답에도 심는다.
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          requestHeaders.set("cookie", request.headers.get("cookie") ?? "");
          pendingCookies.push(...cookiesToSet);
          Object.assign(pendingHeaders, headers);
        },
      },
    });
    // getSession()은 쿠키를 검증 없이 읽는다. 로그인 판단은 Auth 서버에 확인하는 getUser()로 한다.
    const { data } = await supabase.auth.getUser();
    isLoggedIn = Boolean(data.user);
  }

  const target = authRedirect({ pathname, search, isLoggedIn });
  const response = target
    ? NextResponse.redirect(new URL(target, request.url))
    : NextResponse.next({ request: { headers: requestHeaders } });

  pendingCookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  // 쿠키를 새로 심는 응답은 CDN에 캐시되면 안 된다 (Cache-Control: private, no-store 등).
  Object.entries(pendingHeaders).forEach(([key, value]) => response.headers.set(key, value));
  return response;
}

export const config = {
  matcher: [
    // 정적 파일, 이미지 최적화, 공개 사이트(/sites, 로그인과 무관), 개발용 미리보기는 건너뛴다.
    "/((?!_next/static|_next/image|favicon.ico|sites/|dev/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?|txt|xml)$).*)",
  ],
};
