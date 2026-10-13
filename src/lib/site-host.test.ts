import { afterEach, describe, expect, it, vi } from "vitest";
import { classifyHost, getRootHost, siteCacheTag, siteUrl } from "./site-host";

describe("classifyHost", () => {
  const root = "onggage.kr";

  it.each([
    ["onggage.kr", { kind: "main" }],
    ["ONGGAGE.KR", { kind: "main" }],
    ["onggage.kr.", { kind: "main" }],
    [null, { kind: "main" }],
    ["www.onggage.kr", { kind: "www" }],
    ["damso-sikdang.onggage.kr", { kind: "site", slug: "damso-sikdang" }],
    ["Damso-Sikdang.Onggage.KR", { kind: "site", slug: "damso-sikdang" }],
    ["a.b.onggage.kr", { kind: "invalid" }],
    ["-bad.onggage.kr", { kind: "invalid" }],
    ["ab.onggage.kr", { kind: "invalid" }],
    ["evil.com", { kind: "other" }],
    ["notonggage.kr", { kind: "other" }],
  ])("%s → %o", (host, expected) => {
    expect(classifyHost(host, root)).toEqual(expected);
  });

  it("로컬은 포트까지 맞아야 한다 ({slug}.localhost:3000)", () => {
    expect(classifyHost("gyeol-heeo.localhost:3000", "localhost:3000")).toEqual({ kind: "site", slug: "gyeol-heeo" });
    expect(classifyHost("localhost:3000", "localhost:3000")).toEqual({ kind: "main" });
    expect(classifyHost("gyeol-heeo.localhost:4000", "localhost:3000")).toEqual({ kind: "other" });
  });
});

describe("기준 도메인과 사이트 주소", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("NEXT_PUBLIC_ROOT_DOMAIN에서 호스트만 쓴다 (주소 전체를 적어도)", () => {
    vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "http://localhost:3000");
    expect(getRootHost()).toBe("localhost:3000");
    expect(siteUrl("gyeol-heeo")).toBe("http://gyeol-heeo.localhost:3000/");
  });

  it("운영 도메인은 https", () => {
    vi.stubEnv("NEXT_PUBLIC_ROOT_DOMAIN", "onggage.kr");
    expect(siteUrl("damso", "/sitemap.xml")).toBe("https://damso.onggage.kr/sitemap.xml");
  });

  it("캐시 태그는 slug 기준", () => {
    expect(siteCacheTag("damso")).toBe("site-slug:damso");
  });
});
