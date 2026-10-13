// 공개 사이트의 title·description·og 태그.
import type { Metadata } from "next";
import type { Industry, SiteContent } from "./site-schema";
import { assetUrl } from "./site-links";
import { siteUrl } from "./site-host";
import { INDUSTRY_LABELS } from "./templates";

const MAX_DESCRIPTION = 150;

function truncate(text: string, max: number): string {
  const chars = Array.from(text);
  return chars.length <= max ? text : `${chars.slice(0, max - 1).join("").trimEnd()}…`;
}

// 대표 화면 부제 + 소개 글. 보이는 섹션만 쓰고, 비면 "상호 — 업종 홈페이지".
export function siteDescription(content: SiteContent, siteName: string, industry: Industry): string {
  const visible = content.sections.filter((section) => section.visible);
  const hero = visible.find((section) => section.type === "hero");
  const about = visible.find((section) => section.type === "about");
  const parts = [hero?.type === "hero" ? hero.subtitle : "", about?.type === "about" ? about.body : ""]
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const text = parts.join(" · ");
  return truncate(text || `${siteName} — ${INDUSTRY_LABELS[industry]} 홈페이지`, MAX_DESCRIPTION);
}

export function siteMetadata({
  slug,
  siteName,
  industry,
  content,
}: {
  slug: string;
  siteName: string;
  industry: Industry;
  content: SiteContent;
}): Metadata {
  const description = siteDescription(content, siteName, industry);
  const url = siteUrl(slug);
  const image = content.theme.photo ? assetUrl(content.theme.photo) : undefined;
  return {
    // 마케팅 화면의 "| 온가게" 꼬리를 붙이지 않는다.
    title: { absolute: siteName },
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "ko_KR",
      siteName,
      title: siteName,
      description,
      url,
      ...(image ? { images: [{ url: image, alt: siteName }] } : {}),
    },
    robots: { index: true, follow: true },
  };
}
