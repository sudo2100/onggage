import type { Metadata } from "next";

// 서비스 기준 주소. og 태그·sitemap의 절대 주소와 가입·로그인 메일 링크·소셜 로그인 복귀 주소에 쓴다.
// NEXT_PUBLIC_ROOT_DOMAIN은 "onggage.kr"처럼 도메인만 적는 것이 기본이지만,
// "http://localhost:3000"처럼 주소 전체를 적어도 그대로 쓴다. localhost·127.0.0.1은 http.
export function getSiteUrl(): string {
  const domain = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim().replace(/\/+$/, "");
  if (!domain) return "http://localhost:3000";
  if (/^https?:\/\//.test(domain)) return domain;
  const isLocal = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(domain);
  return `${isLocal ? "http" : "https"}://${domain}`;
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
