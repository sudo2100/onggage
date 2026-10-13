import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { routeRequest } from "./site-routing";

describe("routeRequest (proxy 첫 단계)", () => {
  beforeEach(() => vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "onggage.kr"));
  afterEach(() => vi.unstubAllEnvs());

  const site = (pathname: string, search = "") => routeRequest({ host: "damso.onggage.kr", pathname, search });
  const main = (pathname: string, search = "") => routeRequest({ host: "onggage.kr", pathname, search });

  it("서브도메인 첫 화면 → /sites/{slug}", () => {
    expect(site("/")).toEqual({ action: "rewrite", path: "/sites/damso" });
    expect(site("/", "?utm_source=naver")).toEqual({ action: "rewrite", path: "/sites/damso?utm_source=naver" });
  });

  it("서브도메인 robots.txt·sitemap.xml → 그 사이트 전용 파일", () => {
    expect(site("/robots.txt")).toEqual({ action: "rewrite", path: "/sites/damso/robots.txt" });
    expect(site("/sitemap.xml")).toEqual({ action: "rewrite", path: "/sites/damso/sitemap.xml" });
  });

  it("서브도메인의 그 밖의 경로도 /sites/{slug} 아래로 보내 404가 되게 한다 (편집실·로그인 화면이 열리지 않는다)", () => {
    expect(site("/studio/abc")).toEqual({ action: "rewrite", path: "/sites/damso/studio/abc" });
    expect(site("/login")).toEqual({ action: "rewrite", path: "/sites/damso/login" });
  });

  it("서브도메인의 /_next(CSS·JS·글꼴)와 파비콘은 그대로 통과", () => {
    expect(site("/_next/static/css/app.css")).toEqual({ action: "pass" });
    expect(site("/_next/image", "?url=x")).toEqual({ action: "pass" });
    expect(site("/__nextjs_original-stack-frames")).toEqual({ action: "pass" });
    expect(site("/favicon.ico")).toEqual({ action: "pass" });
  });

  it("www는 메인 도메인으로", () => {
    expect(routeRequest({ host: "www.onggage.kr", pathname: "/pricing", search: "" })).toEqual({
      action: "redirect",
      url: "https://onggage.kr/pricing",
    });
  });

  it("형식이 틀린 서브도메인은 404", () => {
    expect(routeRequest({ host: "a.b.onggage.kr", pathname: "/", search: "" })).toEqual({ action: "not-found" });
  });

  it("메인 도메인의 /sites/{slug}는 서브도메인 주소로 (301)", () => {
    expect(main("/sites/damso")).toEqual({ action: "redirect", url: "https://damso.onggage.kr/" });
    expect(main("/sites/damso/robots.txt")).toEqual({ action: "redirect", url: "https://damso.onggage.kr/robots.txt" });
    expect(main("/sites/damso", "?a=1")).toEqual({ action: "redirect", url: "https://damso.onggage.kr/?a=1" });
  });

  it("메인 도메인의 나머지 요청은 앱(세션 갱신·로그인 확인)으로", () => {
    expect(main("/")).toEqual({ action: "app" });
    expect(main("/studio/abc")).toEqual({ action: "app" });
    expect(main("/sites/Bad_Slug")).toEqual({ action: "app" });
    expect(routeRequest({ host: "preview-123.vercel.app", pathname: "/", search: "" })).toEqual({ action: "app" });
  });
});
