import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteRenderer } from "@/components/site";
import { DevicePreview } from "@/components/marketing/DevicePreview";
import { designsHref, parseStartQuery, startHref } from "@/lib/start-query";
import { marketingMetadata } from "@/lib/site-url";
import { DESIGNS, getDesign, INDUSTRY_LABELS } from "@/lib/templates";
import { getDesignPreviewContent } from "@/lib/templates/samples";

// 쿼리(name)에 따라 서버에서 그린다. 마케팅 화면이라 즉시 표시용 껍데기 없이 다 그린 뒤 보낸다.
export const instant = false;

export function generateStaticParams() {
  return DESIGNS.map((design) => ({ designId: design.id }));
}

export async function generateMetadata({ params }: PageProps<"/designs/[designId]">): Promise<Metadata> {
  const { designId } = await params;
  const design = getDesign(designId);
  if (!design) return {};
  return marketingMetadata({
    title: `${design.name} 디자인 (${INDUSTRY_LABELS[design.industry]})`,
    description: `${INDUSTRY_LABELS[design.industry]} 가게를 위한 ${design.name} 디자인 — ${design.description}. PC와 모바일 화면을 미리 보고 바로 시작하세요.`,
    path: `/designs/${design.id}`,
  });
}

export default async function DesignDetailPage({ params, searchParams }: PageProps<"/designs/[designId]">) {
  const { designId } = await params;
  const design = getDesign(designId);
  if (!design) notFound();

  const query = parseStartQuery(await searchParams);
  const preview = getDesignPreviewContent(design, { siteName: query.name });

  return (
    <div className="mx-auto max-w-[1120px] px-4 py-10">
      <Link href={designsHref(query)} className="text-sm text-app-muted underline underline-offset-4">
        ← 디자인 목록
      </Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.12em] text-app-accent">{INDUSTRY_LABELS[design.industry]}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{design.name}</h1>
          <p className="mt-1 text-app-muted">{design.description}</p>
        </div>
        <Link
          href={startHref(design.id, query.name)}
          className="rounded-lg bg-app-accent px-5 py-3 font-semibold text-app-accent-ink"
          data-start-link
        >
          이 디자인으로 시작
        </Link>
      </div>

      <div className="mt-8">
        <DevicePreview label={`${preview.siteName} 홈페이지 미리보기 — ${design.name} 디자인`}>
          <SiteRenderer content={preview.content} industry={design.industry} siteName={preview.siteName} embedded />
        </DevicePreview>
        <p className="mt-3 text-sm text-app-muted">
          미리보기의 연락처와 주소는 예시예요. 시작한 뒤 우리 가게 정보로 바꿀 수 있어요.
        </p>
      </div>
    </div>
  );
}
