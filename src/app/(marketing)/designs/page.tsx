import Link from "next/link";
import { SiteRenderer } from "@/components/site";
import { ScaledPreview } from "@/components/marketing/ScaledPreview";
import { designHref, designsHref, parseStartQuery, type StartQuery } from "@/lib/start-query";
import { industrySchema, type Industry } from "@/lib/site-schema";
import { marketingMetadata } from "@/lib/site-url";
import { DESIGNS, INDUSTRY_LABELS, type Design } from "@/lib/templates";
import { getDesignPreviewContent } from "@/lib/templates/samples";

export const metadata = marketingMetadata({
  title: "디자인 고르기",
  description: "음식·카페, 뷰티·헤어, 숙박, 전문 서비스 업종별 홈페이지 디자인. 내 상호를 넣은 미리보기로 골라 보세요.",
  path: "/designs",
});

// 쿼리(name·industry·filter)에 따라 서버에서 그린다. 마케팅 화면이라 즉시 표시용 껍데기 없이 다 그린 뒤 보낸다.
export const instant = false;

type Filter = "mine" | "all" | Industry;

function parseFilter(raw: string | string[] | undefined, query: StartQuery): Filter {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === "all") return "all";
  if (value === "mine") return query.industry ? "mine" : "all";
  const industry = industrySchema.safeParse(value);
  if (industry.success) return industry.data;
  return query.industry ? "mine" : "all";
}

// 내 업종을 먼저, 나머지는 원래 순서대로.
function orderDesigns(industry: Industry | undefined): Design[] {
  if (!industry) return [...DESIGNS];
  return [...DESIGNS.filter((d) => d.industry === industry), ...DESIGNS.filter((d) => d.industry !== industry)];
}

// 내 상호를 넣을 카드: 쿼리의 업종 카드. 업종 없이 상호만 있으면 모든 카드.
function appliesName(design: Design, query: StartQuery): boolean {
  return Boolean(query.name) && (!query.industry || design.industry === query.industry);
}

export default async function DesignsPage({ searchParams }: PageProps<"/designs">) {
  const params = await searchParams;
  const query = parseStartQuery(params);
  const filter = parseFilter(params.filter, query);

  const designs = orderDesigns(query.industry).filter((design) => {
    if (filter === "all") return true;
    if (filter === "mine") return design.industry === query.industry;
    return design.industry === filter;
  });

  const chips: { value: Filter; label: string }[] = [
    ...(query.industry ? [{ value: "mine" as const, label: `내 업종 (${INDUSTRY_LABELS[query.industry]})` }] : []),
    { value: "all", label: "전체" },
    ...industrySchema.options
      .filter((industry) => industry !== query.industry)
      .map((industry) => ({ value: industry, label: INDUSTRY_LABELS[industry] })),
  ];

  return (
    <div className="mx-auto max-w-[1120px] px-4 py-10">
      <p className="text-xs font-semibold tracking-[0.12em] text-app-accent">디자인 선택</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight break-keep [overflow-wrap:anywhere]">
        {query.name ? `${query.name}에 어울리는 디자인` : "우리 가게에 어울리는 디자인"}
      </h1>
      <p className="mt-1 text-app-muted [overflow-wrap:anywhere]">
        {query.name
          ? `미리보기에는 이미 ${query.name}의 이름과 업종 문구가 들어가 있어요.`
          : "업종별 예시 가게로 미리 볼 수 있어요. 처음 화면에서 상호를 넣으면 내 상호로 보여 드려요."}
      </p>

      <nav aria-label="업종 필터" className="mt-5 flex flex-wrap gap-1.5">
        {chips.map((chip) => (
          <Link
            key={chip.value}
            href={designsHref({ ...query, filter: chip.value })}
            aria-current={filter === chip.value ? "page" : undefined}
            className="rounded-full border border-app-line bg-app-surface px-3 py-1 text-sm aria-[current=page]:border-app-accent aria-[current=page]:bg-app-soft aria-[current=page]:font-semibold"
          >
            {chip.label}
          </Link>
        ))}
      </nav>

      <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {designs.map((design) => {
          const mine = appliesName(design, query);
          const preview = getDesignPreviewContent(design, { siteName: mine ? query.name : undefined });
          const content = { ...preview.content, sections: preview.content.sections.slice(0, 3) };
          return (
            <li key={design.id} data-design-card={design.id}>
              <Link
                href={designHref(design.id, query)}
                className="flex h-full flex-col overflow-hidden rounded-xl border border-app-line bg-app-surface hover:border-app-accent"
              >
                <div className="relative border-b border-app-line">
                  <ScaledPreview
                    width={980}
                    initialScale={0.36}
                    label={`${design.name} 디자인 미리보기 (${preview.siteName})`}
                    className="aspect-[16/11]"
                  >
                    <SiteRenderer content={content} industry={design.industry} siteName={preview.siteName} embedded />
                  </ScaledPreview>
                  {mine ? (
                    <span className="absolute right-2.5 bottom-2.5 rounded-full bg-app-hi px-2.5 py-0.5 text-xs font-bold text-[#2a2006]">
                      내 상호 적용됨
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center justify-between gap-3 px-4 py-3.5">
                  <div>
                    <h2 className="font-semibold">{design.name}</h2>
                    <p className="text-sm text-app-muted">{design.description}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-app-soft px-2 py-0.5 text-xs font-semibold text-app-accent">
                    {INDUSTRY_LABELS[design.industry]}
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
