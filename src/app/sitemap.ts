import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";
import { DESIGNS } from "@/lib/templates";

// 메인 도메인 sitemap: 서비스(마케팅) 화면만. /dev(개발용)와 로그인 뒤 화면은 넣지 않는다.
// 공개 고객 사이트는 서브도메인마다 따로 sitemap.xml을 둔다 (src/app/sites/[slug]/sitemap.xml).
export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/designs`, changeFrequency: "weekly", priority: 0.8 },
    ...DESIGNS.map((design) => ({
      url: `${base}/designs/${design.id}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    { url: `${base}/pricing`, changeFrequency: "monthly", priority: 0.7 },
  ];
}
