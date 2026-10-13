import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { authRedirect, isAuthCookieName, REQUEST_PATH_HEADER } from "@/lib/auth-routes";
import { routeRequest } from "@/lib/site-routing";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

// 처리 순서
//   1. 공개 사이트(서브도메인) 요청은 /sites/{slug}로 rewrite하고 바로 끝낸다. 로그인 확인(getUser)을 하지 않는다.
//   2. 메인 도메인의 /sites/{slug} 직접 접근은 서브도메인 주소로 301.
//   3. 나머지 메인 도메인 요청은 Supabase 세션 쿠키를 갱신하고, 로그인 여부에 따라 보낸다.
//      여기서의 판단은 빠른 1차 확인일 뿐이다. 권한은 화면·Server Action에서 requireUser()로 다시 확인한다.
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const route = routeRequest({ host: request.headers.get("host"), pathname, search });
  if (route.action === "pass") return NextResponse.next();
  if (route.action === "rewrite") return NextResponse.rewrite(new URL(route.path, request.url));
  if (route.action === "redirect") return NextResponse.redirect(route.url, 301);
  if (route.action === "not-found") return new NextResponse("Not Found", { status: 404 });

  // 클라이언트가 보낸 같은 이름의 헤더는 덮어쓴다.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(REQUEST_PATH_HEADER, `${pathname}${search}`);

  const pendingCookies: { name: string; value: string; options: Parameters<NextResponse["cookies"]["set"]>[2] }[] = [];
  const pendingHeaders: Record<string, string> = {};

  let isLoggedIn = false;
  let notOwnedStudio = false;
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

    // 편집실 화면은 정적 껍데기를 먼저 보내 notFound()가 200(soft 404)이 되므로, 여기서 주인인지 먼저 확인해
    // 진짜 404를 낸다. 화면의 requireSiteOwner()도 그대로 다시 확인한다.
    const studioSiteId = studioSiteIdFromPath(pathname);
    if (data.user && studioSiteId !== null) {
      notOwnedStudio = !(await isOwnSite(supabase, data.user.id, studioSiteId));
    }
  }

  const target = authRedirect({ pathname, search, isLoggedIn });
  const response = target
    ? NextResponse.redirect(new URL(target, request.url))
    : notOwnedStudio
      ? NextResponse.rewrite(new URL(NOT_FOUND_PATH, request.url))
      : NextResponse.next({ request: { headers: requestHeaders } });

  pendingCookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  // 쿠키를 새로 심는 응답은 CDN에 캐시되면 안 된다 (Cache-Control: private, no-store 등).
  Object.entries(pendingHeaders).forEach(([key, value]) => response.headers.set(key, value));
  return response;
}

// 해당하는 라우트가 없는 경로. 여기로 rewrite하면 404 화면이 404 상태 코드로 나간다.
const NOT_FOUND_PATH = "/_not-found-rewrite";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// /studio/{id}…의 id. 편집실 경로가 아니면 null, 형식이 틀린 id는 ""(누구의 사이트도 아님).
function studioSiteIdFromPath(pathname: string): string | null {
  const match = /^\/studio\/([^/]+)/.exec(pathname);
  if (!match) return null;
  return UUID_PATTERN.test(match[1]) ? match[1] : "";
}

// 사용자 세션으로 조회한다. 남의 공개 사이트도 RLS상 보이므로 owner_id로 거른다.
async function isOwnSite(supabase: SupabaseClient, userId: string, siteId: string): Promise<boolean> {
  if (!siteId) return false;
  const { data } = await supabase.from("sites").select("id").eq("id", siteId).eq("owner_id", userId).maybeSingle();
  return Boolean(data);
}

export const config = {
  matcher: [
    // 빌드 결과·이미지 최적화·파비콘·사진/글꼴 파일만 건너뛴다.
    // /sites, /dev, robots.txt, sitemap.xml은 proxy를 거친다: 서브도메인이면 rewrite, 메인 도메인의 /sites는 301.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)",
  ],
};
