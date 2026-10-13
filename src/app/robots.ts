import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

// 메인 도메인 robots.txt. 로그인 뒤 화면·개발용 화면은 막는다.
// /sites는 막지 않는다: 메인 도메인의 /sites/{slug}는 서브도메인 주소로 301이라, 검색엔진이 따라가게 둔다.
// 공개 사이트(서브도메인)의 robots.txt는 src/app/sites/[slug]/robots.txt에서 따로 만든다.
export const DISALLOWED_PATHS = [
  "/studio",
  "/admin",
  "/start",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth",
  "/dev",
];

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: DISALLOWED_PATHS }],
    sitemap: `${base}/sitemap.xml`,
  };
}
