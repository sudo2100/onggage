import type { Metadata } from "next";
import Link from "next/link";
import { DevicePreview } from "@/components/marketing/DevicePreview";
import { SiteRenderer } from "@/components/site";
import { PublishPanel } from "@/components/studio/PublishPanel";
import { requireSiteOwner } from "@/lib/require-site-owner";
import { getDraftContent } from "@/lib/sites";
import { getRootHost } from "@/lib/site-host";
import { getSiteUrl } from "@/lib/site-url";
import { getDesign, TONE_LABELS } from "@/lib/templates";

export const metadata: Metadata = { title: "편집실", robots: { index: false } };

// 로그인 + 가입 동의 기록이 있어야 들어온다. 없으면 /login 또는 /signup/agree로 보낸다.
export const instant = false;

const STATUS_LABELS = {
  draft: "초안",
  published: "공개 중",
  paused: "공개 멈춤",
} as const;

// 지금은 초안 미리보기와 공개 설정만. 섹션 편집은 다음 작업에서 붙인다.
export default async function StudioPage({ params }: PageProps<"/studio/[siteId]">) {
  const { siteId } = await params;
  // 남의 사이트(공개된 사이트 포함)와 없는 id는 구분하지 않고 404.
  const { site } = await requireSiteOwner(siteId);
  const draft = await getDraftContent(site);
  const design = site.template_id ? getDesign(site.template_id) : undefined;
  const rootHost = getRootHost();

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
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] lg:items-start">
          <div>
            <p className="text-xs font-semibold tracking-[0.12em] text-app-accent" data-site-status={site.status}>
              {STATUS_LABELS[site.status]}
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{site.name}</h1>
            <p className="mt-1 text-sm text-app-muted">
              <span data-site-address>
                {site.slug}.{rootHost}
              </span>{" "}
              · {design ? `${design.name} 디자인` : "디자인"} · {TONE_LABELS[site.tone]} 말투
            </p>
          </div>
          <PublishPanel
            siteId={site.id}
            status={site.status}
            slug={site.slug}
            everPublished={Boolean(site.first_published_at)}
            rootHost={rootHost}
            protocol={new URL(getSiteUrl()).protocol}
          />
        </div>
        <div className="mt-6">
          <p className="mb-2 text-sm text-app-muted">초안 미리보기 · 공개하기를 눌러야 손님에게 보여요</p>
          <DevicePreview label={`${site.name} 홈페이지 초안 미리보기`}>
            <SiteRenderer content={draft.content} industry={site.industry} siteName={site.name} embedded showPlaceholders />
          </DevicePreview>
        </div>
      </main>
    </div>
  );
}
