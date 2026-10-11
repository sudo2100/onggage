import Link from "next/link";
import { PLAN_TABLE_ROWS, PLANS } from "@/lib/plans";
import { marketingMetadata } from "@/lib/site-url";

export const metadata = marketingMetadata({
  title: "요금 안내",
  description: "온가게 무료·베이직·프로 요금제 비교. 서브도메인 공개는 무료, 맞춤 도메인과 예약·통계가 필요할 때만 유료입니다.",
  path: "/pricing",
});

// 가격·항목은 src/lib/plans.ts에서만 읽는다. 결제 기능은 아직 없다.
export default function PricingPage() {
  return (
    <div className="mx-auto max-w-[1120px] px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">요금 안내</h1>
      <p className="mt-2 text-app-muted">공개는 무료, 필요한 만큼만 유료예요. 연 요금은 2개월분 할인된 가격입니다.</p>

      <div className="mt-8 overflow-x-auto rounded-xl border border-app-line bg-app-surface" data-pricing-table>
        <table className="w-full min-w-[560px] border-collapse text-left text-sm tabular-nums">
          <caption className="sr-only">요금제별 가격과 제공 항목</caption>
          <thead>
            <tr className="bg-app-soft/60">
              <th scope="col" className="px-4 py-3 font-semibold text-app-muted">
                <span className="sr-only">항목</span>
              </th>
              {PLANS.map((plan) => (
                <th key={plan.id} scope="col" className="px-4 py-3 text-base font-bold">
                  {plan.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PLAN_TABLE_ROWS.map((row) => (
              <tr key={row.label} className="border-t border-app-line">
                <th scope="row" className="px-4 py-3 font-semibold whitespace-nowrap text-app-muted">
                  {row.label}
                </th>
                {PLANS.map((plan) => (
                  <td key={plan.id} className="px-4 py-3 whitespace-nowrap" data-plan={plan.id}>
                    {row.value(plan)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <Link href="/designs" className="rounded-lg bg-app-accent px-5 py-3 font-semibold text-app-accent-ink">
          무료로 시작하기
        </Link>
        <p className="text-sm text-app-muted">유료 요금제 결제는 준비 중이에요.</p>
      </div>
    </div>
  );
}
