import type { Metadata } from "next";

// 서비스 기준 주소. og 태그·sitemap의 절대 주소에 쓴다.
export function getSiteUrl(): string {
  const domain = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim();
  return domain ? `https://${domain}` : "http://localhost:3000";
}

export const SERVICE_NAME = "온가게";

// 마케팅 페이지 공통 메타데이터: title·description·canonical·og.
export function marketingMetadata({
  title,
  description,
  path,
}: {
  title?: string;
  description: string;
  path: string;
}): Metadata {
  const ogTitle = title ? `${title} | ${SERVICE_NAME}` : `${SERVICE_NAME} — 상호만 넣으면 만들어지는 우리 가게 홈페이지`;
  return {
    ...(title ? { title } : {}),
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "ko_KR",
      siteName: SERVICE_NAME,
      title: ogTitle,
      description,
      url: path,
    },
  };
}
