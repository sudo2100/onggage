// 공개 사이트 주소({slug}.기준 도메인) 판별과 만들기. proxy(Edge 아님, Node)와 서버 코드가 함께 쓴다.
import { getSiteUrl } from "./site-url";
import { SLUG_PATTERN } from "./slug";

// 기준 도메인의 호스트(포트 포함). 예: "onggage.kr", "localhost:3000"
export function getRootHost(): string {
  return new URL(getSiteUrl()).host.toLowerCase();
}

export type HostKind =
  | { kind: "main" }
  | { kind: "www" }
  | { kind: "site"; slug: string }
  // 기준 도메인 아래지만 사이트 주소가 아님 (a.b.도메인, 형식이 틀린 slug) → 404
  | { kind: "invalid" }
  // 다른 도메인 (배포 미리보기 주소, IP 접속 등) → 메인처럼 다룬다
  | { kind: "other" };

// 요청 Host 헤더를 기준 도메인과 비교해 어떤 요청인지 가른다.
//   onggage.kr            → main
//   www.onggage.kr        → www (메인으로 보낸다)
//   damso.onggage.kr      → site
//   a.b.onggage.kr, 형식이 틀린 slug → invalid
//   다른 도메인 → other
export function classifyHost(host: string | null, rootHost: string = getRootHost()): HostKind {
  const value = (host ?? "").trim().toLowerCase().replace(/\.$/, "");
  if (!value || value === rootHost) return { kind: "main" };
  const suffix = `.${rootHost}`;
  if (!value.endsWith(suffix)) return { kind: "other" };
  const label = value.slice(0, -suffix.length);
  if (label === "www") return { kind: "www" };
  if (label.includes(".") || !SLUG_PATTERN.test(label)) return { kind: "invalid" };
  return { kind: "site", slug: label };
}

// 공개 사이트의 절대 주소. 예: https://damso.onggage.kr/
export function siteUrl(slug: string, path = "/"): string {
  const { protocol } = new URL(getSiteUrl());
  return `${protocol}//${slug}.${getRootHost()}${path}`;
}

// 공개 사이트 캐시 태그. 사이트가 없거나 비공개인 결과도 같은 태그를 달아,
// 처음 공개할 때 "없음" 캐시가 함께 지워지게 한다.
export function siteCacheTag(slug: string): string {
  return `site-slug:${slug}`;
}
