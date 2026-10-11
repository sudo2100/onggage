import type { CSSProperties } from "react";
import { getSiteColors } from "@/lib/site-colors";
import { getQuickActions, type QuickAction } from "@/lib/site-links";
import type { Industry, Section, SiteContent } from "@/lib/site-schema";
import { siteFontClass } from "./fonts";
import {
  AboutSection,
  ContactSection,
  GallerySection,
  HeroSection,
  InfoSection,
  ListSection,
  NoticeSection,
  ReviewsSection,
  type SectionContext,
} from "./sections";

type Props = {
  content: SiteContent;
  industry: Industry;
  siteName: string;
  // 문의 저장 기능(3단계)이 붙으면 true로 켠다. 기본은 꺼짐: 보내기 버튼 비활성화 + 안내 문구.
  inquiryEnabled?: boolean;
  // 편집실 미리보기에서만 켠다. 사진 없는 사진 모음 같은 빈 섹션에 자리 표시를 그린다.
  showPlaceholders?: boolean;
  // 다른 페이지 안에 축소 미리보기로 넣을 때 켠다. 제목 태그·섹션 id·링크를 만들지 않는다 (sections.tsx 참고).
  embedded?: boolean;
};

// 공개 사이트와 편집실 미리보기가 함께 쓰는 렌더러. content는 parseSiteContent를 거친 값을 넘긴다.
// 앱의 다크 모드와 상관없이 사이트는 늘 밝은 화면으로 그린다.
// 루트가 @container라 섹션 배치는 화면 폭이 아니라 이 상자의 폭에 반응한다.
export function SiteRenderer({
  content,
  industry,
  siteName,
  inquiryEnabled = false,
  showPlaceholders = false,
  embedded = false,
}: Props) {
  const colors = getSiteColors(content.theme.accent);
  const contactSection = content.sections.find((section) => section.type === "contact" && section.visible);
  const ctx: SectionContext = {
    industry,
    siteName,
    theme: content.theme,
    business: content.business,
    contactHref: contactSection && !embedded ? `#${contactSection.id}` : undefined,
    inquiryEnabled,
    showPlaceholders,
    embedded,
  };
  const actions = getQuickActions(content.business);

  const style = {
    "--site-accent": colors.accent,
    "--site-on-accent": colors.onAccent,
    "--site-accent-text": colors.accentText,
    "--site-bg": colors.bg,
    "--site-alt-bg": colors.altBg,
    "--site-ink": colors.ink,
    "--site-line": `color-mix(in oklab, ${colors.ink} 18%, transparent)`,
    "--site-line-strong": `color-mix(in oklab, ${colors.ink} 28%, transparent)`,
    "--site-placeholder": `linear-gradient(140deg, color-mix(in oklab, ${colors.accent} 85%, #000) 0%, color-mix(in oklab, ${colors.accent} 45%, #fff) 100%)`,
    colorScheme: "light",
  } as CSSProperties;

  return (
    <div
      data-site-root
      className={`${siteFontClass(content.theme.font)} @container flex min-h-full flex-1 flex-col bg-(--site-bg) leading-[1.7] text-(--site-ink)`}
      style={style}
    >
      <main className="flex-1">
        {content.sections
          .filter((section) => section.visible)
          .map((section) => (
            <SiteSection key={section.id} section={section} ctx={ctx} />
          ))}
      </main>
      <footer className="flex flex-wrap justify-between gap-2.5 px-4 py-6 text-[12.5px] @3xl:px-10">
        <span className="opacity-75">© {siteName}</span>
        <span className="font-semibold">온가게로 만든 홈페이지</span>
      </footer>
      {actions.length > 0 ? <QuickActionBar actions={actions} embedded={embedded} /> : null}
    </div>
  );
}

function SiteSection({ section, ctx }: { section: Section; ctx: SectionContext }) {
  switch (section.type) {
    case "hero":
      return <HeroSection section={section} ctx={ctx} />;
    case "about":
      return <AboutSection section={section} ctx={ctx} />;
    case "list":
      return <ListSection section={section} ctx={ctx} />;
    case "info":
      return <InfoSection section={section} ctx={ctx} />;
    case "contact":
      return <ContactSection section={section} ctx={ctx} />;
    case "notice":
      return <NoticeSection section={section} ctx={ctx} />;
    case "gallery":
      return <GallerySection section={section} ctx={ctx} />;
    case "reviews":
      return <ReviewsSection />;
  }
}

// 하단 고정 버튼 (전화·카카오톡·길찾기). 값이 있는 항목만, 모바일 폭에서만 보인다.
// embedded(축소 미리보기)에서는 고정하지 않고 링크 없이 모양만 그린다.
function QuickActionBar({ actions, embedded }: { actions: QuickAction[]; embedded: boolean }) {
  const itemClass = "border-r border-white/15 p-3 text-center last:border-r-0";
  return (
    <div
      role={embedded ? undefined : "navigation"}
      aria-label={embedded ? undefined : "빠른 연락"}
      data-quick-actions
      className={`${embedded ? "" : "sticky bottom-0 z-10"} grid bg-(--site-ink) text-sm font-semibold text-white @3xl:hidden`}
      style={{ gridTemplateColumns: `repeat(${actions.length}, minmax(0, 1fr))` }}
    >
      {actions.map((action) =>
        embedded ? (
          <span key={action.kind} data-action={action.kind} className={itemClass}>
            {action.label}
          </span>
        ) : (
          <a
            key={action.kind}
            href={action.href}
            data-action={action.kind}
            {...(action.kind === "phone" ? {} : { target: "_blank", rel: "noopener noreferrer" })}
            className={itemClass}
          >
            {action.label}
          </a>
        ),
      )}
    </div>
  );
}
