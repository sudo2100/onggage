import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteRenderer } from "@/components/site";
import { getPublishedSite } from "@/lib/public-site";
import { siteMetadata } from "@/lib/site-metadata";

// 공개 사이트. proxy가 {slug}.기준 도메인 요청을 여기로 rewrite한다 (메인 도메인의 /sites/{slug}는 301).
// 검색 노출이 핵심이라 서버에서 다 그린 HTML을 보낸다. 공개본이 없으면(비공개·공개 중지·없는 주소) 404.
// 정적 페이지로 만든다(Cache Components의 ISR): 처음 요청한 주소는 완성된 페이지가 나올 때까지 기다렸다가
// 보내고 저장해 둔다. 껍데기를 먼저 보내지 않으므로 없는 주소는 진짜 404 상태 코드가 나간다.
// 데이터는 getPublishedSite의 캐시(slug 태그)만 쓰므로, 공개하기의 updateTag로 저장된 페이지도 함께 갱신된다.
export const ensureStatic = "navigation";

// ensureStatic = 'navigation'은 미리 만들 주소가 하나 이상 필요하다. 사이트는 공개 뒤 처음 요청 때 만들어지므로
// 빌드 때는 쓰이지 않는 자리표시 주소 하나만 넘긴다 (slug 형식이 아니라 DB를 읽지 않고 404가 된다).
export function generateStaticParams() {
  return [{ slug: "_" }];
}

export async function generateMetadata({ params }: PageProps<"/sites/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const published = await getPublishedSite(slug);
  if (!published) return { robots: { index: false } };
  return siteMetadata({
    slug: published.site.slug,
    siteName: published.site.name,
    industry: published.site.industry,
    content: published.content,
  });
}

export default async function PublicSitePage({ params }: PageProps<"/sites/[slug]">) {
  const { slug } = await params;
  const published = await getPublishedSite(slug);
  if (!published) notFound();

  return (
    <SiteRenderer content={published.content} industry={published.site.industry} siteName={published.site.name} />
  );
}
