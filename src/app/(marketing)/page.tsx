import Link from "next/link";
import { LandingHero } from "@/components/marketing/LandingHero";
import { formatWon, PLANS } from "@/lib/plans";
import { marketingMetadata } from "@/lib/site-url";

export const metadata = marketingMetadata({
  description:
    "상호와 업종만 넣으면 AI가 우리 가게 홈페이지 초안을 만들어 드려요. 디자인을 고르고 글자만 고치면 끝, 서브도메인 공개까지 무료입니다.",
  path: "/",
});

const STEPS = [
  { title: "상호와 업종 입력", body: "연락처와 주소까지 1분이면 끝나요." },
  { title: "AI가 초안 작성", body: "소개 글, 메뉴, 영업 안내가 채워진 상태로 시작해요." },
  { title: "눌러서 고치고 공개", body: "글자를 눌러 바로 고치고, 버튼 하나로 공개해요." },
];

export default function HomePage() {
  return (
    <>
      <section className="mx-auto max-w-[1120px] px-4 pt-10 pb-12 lg:pt-14">
        <LandingHero />
      </section>

      <section aria-labelledby="steps-title" className="border-t border-app-line">
        <div className="mx-auto max-w-[1120px] px-4 py-12">
          <h2 id="steps-title" className="text-2xl font-bold tracking-tight">
            만드는 순서
          </h2>
          <ol className="mt-6 grid gap-6 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title}>
                <span className="text-3xl font-bold text-app-accent">{i + 1}</span>
                <h3 className="mt-2 text-[17px] font-semibold">{step.title}</h3>
                <p className="mt-1 text-app-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="pricing-title" className="border-t border-app-line">
        <div className="mx-auto max-w-[1120px] px-4 py-12">
          <h2 id="pricing-title" className="text-2xl font-bold tracking-tight">
            무료로 공개, 필요한 만큼만 유료
          </h2>
          <p className="mt-1 text-app-muted">맞춤 도메인과 예약·통계가 필요해질 때 올리면 됩니다.</p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-3" data-pricing-summary>
            {PLANS.map((plan) => (
              <li key={plan.id} className="rounded-xl border border-app-line bg-app-surface p-5">
                <p className="font-semibold">{plan.name}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">
                  {plan.priceMonthly === 0 ? formatWon(0) : `월 ${formatWon(plan.priceMonthly)}`}
                </p>
                <p className="mt-2 text-sm text-app-muted">{plan.summary}</p>
              </li>
            ))}
          </ul>
          <Link href="/pricing" className="mt-4 inline-block text-sm font-semibold text-app-accent underline underline-offset-4">
            요금제 자세히 보기
          </Link>
        </div>
      </section>

      <section className="border-t border-app-line bg-app-soft">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-4 px-4 py-12">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">지금 우리 가게 홈페이지를 만들어 보세요</h2>
            <p className="mt-1 text-app-muted">가입 없이 디자인부터 둘러볼 수 있어요.</p>
          </div>
          <Link href="/designs" className="rounded-lg bg-app-accent px-5 py-3 font-semibold text-app-accent-ink">
            무료로 시작하기
          </Link>
        </div>
      </section>
    </>
  );
}
