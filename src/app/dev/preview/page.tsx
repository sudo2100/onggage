import Link from "next/link";
import { INDUSTRY_LABELS } from "@/lib/templates";
import { DESIGNS } from "./sample";

// 8개 디자인을 PC 폭(980px)과 모바일 폭(390px)으로 나란히 본다.
// iframe을 쓰는 이유: 미디어 쿼리가 iframe 폭을 기준으로 반응해 실제 모바일 배치를 그대로 볼 수 있다.
export default function DevPreviewPage() {
  return (
    <main className="bg-neutral-100 px-4 py-8 text-neutral-900">
      <h1 className="text-2xl font-semibold">디자인 미리보기</h1>
      <p className="mt-1 text-sm text-neutral-600">
        개발 환경에서만 열립니다. 각 디자인의 &quot;가게 정보 없음&quot;을 누르면 business가 빈 상태를 봅니다.
      </p>
      <div className="mt-8 grid gap-12">
        {DESIGNS.map((design) => (
          <section key={design.id} aria-labelledby={`design-${design.id}`}>
            <h2 id={`design-${design.id}`} className="text-lg font-semibold">
              {design.name}{" "}
              <span className="text-sm font-normal text-neutral-600">
                {design.id} · {INDUSTRY_LABELS[design.industry]} · {design.description} · {design.theme.accent} ·{" "}
                {design.theme.font} · {design.theme.layout}
              </span>
            </h2>
            <p className="mt-1 flex gap-3 text-sm">
              <Link className="underline" href={`/dev/preview/${design.id}/full`}>
                전체 화면
              </Link>
              <Link className="underline" href={`/dev/preview/${design.id}/empty`}>
                가게 정보 없음
              </Link>
            </p>
            <div className="mt-3 flex items-start gap-4 overflow-x-auto pb-2">
              <iframe
                title={`${design.name} PC`}
                src={`/dev/preview/${design.id}/full`}
                className="h-[720px] w-[980px] shrink-0 rounded-lg border border-neutral-300 bg-white"
              />
              <iframe
                title={`${design.name} 모바일`}
                src={`/dev/preview/${design.id}/full`}
                className="h-[720px] w-[390px] shrink-0 rounded-lg border border-neutral-300 bg-white"
              />
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
