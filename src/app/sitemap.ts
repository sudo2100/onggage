import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";
import { DESIGNS } from "@/lib/templates";

// 서비스(마케팅) 화면 sitemap. 공개 고객 사이트 sitemap은 작업 6에서 만들어 여기에 합친다.
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
