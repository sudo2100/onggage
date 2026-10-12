import type { Metadata } from "next";
import Link from "next/link";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { requireUser } from "@/lib/auth";
import { parsePrefill } from "@/lib/onboarding";
import { getMySite } from "@/lib/sites";
import { getSiteUrl } from "@/lib/site-url";

export const metadata: Metadata = { title: "홈페이지 만들기", robots: { index: false } };

// 로그인 + 가입 동의 기록이 있어야 들어온다. 없으면 /login 또는 /signup/agree로 보낸다.
export const instant = false;

export default async function StartPage({ searchParams }: PageProps<"/start">) {
  const user = await requireUser();
  const site = await getMySite(user.id);

  return (
    <div className="flex flex-1 flex-col bg-app-bg break-keep text-app-ink">
      <header className="border-b border-app-line bg-app-surface">
        <div className="mx-auto flex max-w-[1120px] items-center px-4 py-3">
          <Link href="/" className="text-lg font-bold tracking-tight">
            온가게
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1120px] flex-1 px-4 py-8 sm:py-10">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">홈페이지 만들기</h1>
        {site ? (
          // 한 사람당 사이트 하나 (DB 제약). 이미 있으면 편집실로 안내한다.
          <div className="mt-6 max-w-[520px] rounded-2xl border border-app-line bg-app-surface p-6">
            <p className="font-semibold">이미 만든 사이트가 있어요.</p>
            <p className="mt-1 text-sm text-app-muted">{site.name} 홈페이지를 편집실에서 이어서 만들어 주세요.</p>
            <Link
              href={`/studio/${site.id}`}
              className="mt-4 inline-block rounded-lg bg-app-accent px-5 py-3 font-semibold text-app-accent-ink"
            >
              편집실로 가기
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-1 text-app-muted">세 단계만 채우면 첫 초안이 만들어져요. 모든 내용은 나중에 고칠 수 있어요.</p>
            <OnboardingWizard prefill={parsePrefill(await searchParams)} domain={new URL(getSiteUrl()).host} />
          </>
        )}
      </main>
    </div>
  );
}
