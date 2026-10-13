// proxy의 첫 단계: 요청 호스트로 공개 사이트 요청인지 가른다. 요청 객체 없이 테스트할 수 있게 따로 둔다.
//
// 처리 순서 (src/proxy.ts)
//   1. 서브도메인({slug}.기준 도메인) 요청 → /sites/{slug}… 로 rewrite하고 바로 끝낸다.
//      로그인 쿠키를 보지 않고 getUser()도 부르지 않는다 (손님 요청마다 Auth 서버를 부르지 않게).
//   2. 메인 도메인 요청 → /sites/{slug}로 직접 들어오면 서브도메인 주소로 301. 나머지는 세션 갱신·로그인 확인.
import { classifyHost, getRootHost, siteUrl } from "./site-host";
import { getSiteUrl } from "./site-url";
import { SLUG_PATTERN } from "./slug";

export type ProxyRoute =
  | { action: "rewrite"; path: string }
  | { action: "pass" }
  | { action: "redirect"; url: string }
  | { action: "not-found" }
  | { action: "app" };

// 서브도메인에서도 그대로 내려줘야 하는 파일: 빌드 결과(CSS·JS·글꼴·이미지), 개발 서버 내부 경로, 파비콘.
function isFrameworkPath(pathname: string): boolean {
  return pathname.startsWith("/_next/") || pathname.startsWith("/__nextjs") || pathname === "/favicon.ico";
}

export function routeRequest({
  host,
  pathname,
  search,
  rootHost = getRootHost(),
}: {
  host: string | null;
  pathname: string;
  search: string;
  rootHost?: string;
}): ProxyRoute {
  const kind = classifyHost(host, rootHost);

  if (kind.kind === "site") {
    if (isFrameworkPath(pathname)) return { action: "pass" };
    // "/" → /sites/{slug}, "/robots.txt" → /sites/{slug}/robots.txt, 그 밖의 경로는 해당 라우트가 없어 404.
    return { action: "rewrite", path: `/sites/${kind.slug}${pathname === "/" ? "" : pathname}${search}` };
  }
  if (kind.kind === "www") return { action: "redirect", url: `${getSiteUrl()}${pathname}${search}` };
  if (kind.kind === "invalid") return { action: "not-found" };

  // 메인 도메인: /sites/{slug}로 직접 들어오면 서브도메인 주소로 보낸다 (같은 내용이 두 주소에 있지 않게).
  const match = /^\/sites\/([^/]+)(\/.*)?$/.exec(pathname);
  if (match && SLUG_PATTERN.test(match[1])) {
    return { action: "redirect", url: `${siteUrl(match[1], match[2] ?? "/")}${search}` };
  }
  return { action: "app" };
}
