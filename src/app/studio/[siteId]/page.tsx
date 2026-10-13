import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DevicePreview } from "@/components/marketing/DevicePreview";
import { SiteRenderer } from "@/components/site";
import { requireUser } from "@/lib/auth";
import { getMySiteDraft } from "@/lib/sites";
import { getSiteUrl } from "@/lib/site-url";
import { getDesign, TONE_LABELS } from "@/lib/templates";

export const metadata: Metadata = { title: "편집실", robots: { index: false } };

// 로그인 + 가입 동의 기록이 있어야 들어온다. 없으면 /login 또는 /signup/agree로 보낸다.
export const instant = false;

// 지금은 초안 미리보기만. 섹션 편집·공개하기는 다음 작업에서 붙인다.
export default async function StudioPage({ params }: PageProps<"/studio/[siteId]">) {
  const user = await requireUser();
  const { siteId } = await params;
  // 남의 사이트(공개된 사이트 포함)와 없는 id는 구분하지 않고 404.
  const result = await getMySiteDraft(user.id, siteId);
  if (!result) notFound();

  const { site, draft } = result;
  const design = site.template_id ? getDesign(site.template_id) : undefined;
  const domain = new URL(getSiteUrl()).host;

  return (
    <div className="flex flex-1 flex-col bg-app-bg break-keep text-app-ink">
      <header className="border-b border-app-line bg-app-surface">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
          <Link href="/" className="text-lg font-bold tracking-tight">
            온가게
          </Link>
          <span className="text-sm text-app-muted">편집실</span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1120px] flex-1 px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.12em] text-app-accent">초안 · 아직 공개 전</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{site.name}</h1>
            <p className="mt-1 text-sm text-app-muted">
              <span data-site-address>
                {site.slug}.{domain}
              </span>{" "}
              · {design ? `${design.name} 디자인` : "디자인"} · {TONE_LABELS[site.tone]} 말투
            </p>
          </div>
        </div>
        <div className="mt-6">
          <DevicePreview label={`${site.name} 홈페이지 초안 미리보기`}>
            <SiteRenderer content={draft.content} industry={site.industry} siteName={site.name} embedded showPlaceholders />
          </DevicePreview>
        </div>
      </main>
    </div>
  );
}
