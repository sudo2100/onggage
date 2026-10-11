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
};

// 공개 사이트와 편집실 미리보기가 함께 쓰는 렌더러. content는 parseSiteContent를 거친 값을 넘긴다.
// 앱의 다크 모드와 상관없이 사이트는 늘 밝은 화면으로 그린다.
export function SiteRenderer({ content, industry, siteName }: Props) {
  const colors = getSiteColors(content.theme.accent);
  const ctx: SectionContext = { industry, siteName, theme: content.theme, business: content.business };
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
      className={`${siteFontClass(content.theme.font)} flex min-h-full flex-1 flex-col bg-(--site-bg) leading-[1.7] text-(--site-ink)`}
      style={style}
    >
      <main className="flex-1">
        {content.sections
          .filter((section) => section.visible)
          .map((section) => (
            <SiteSection key={section.id} section={section} ctx={ctx} />
          ))}
      </main>
      <footer className="flex flex-wrap justify-between gap-2.5 px-4 py-6 text-[12.5px] md:px-10">
        <span className="opacity-75">© {siteName}</span>
        <span className="font-semibold">온가게로 만든 홈페이지</span>
      </footer>
      {actions.length > 0 ? <QuickActionBar actions={actions} /> : null}
    </div>
  );
}

function SiteSection({ section, ctx }: { section: Section; ctx: SectionContext }) {
  switch (section.type) {
    case "hero":
      return <HeroSection section={section} ctx={ctx} />;
    case "about":
      return <AboutSection section={section} />;
    case "list":
      return <ListSection section={section} />;
    case "info":
      return <InfoSection section={section} ctx={ctx} />;
    case "contact":
      return <ContactSection section={section} ctx={ctx} />;
    case "notice":
      return <NoticeSection section={section} />;
    case "gallery":
      return <GallerySection section={section} />;
    case "reviews":
      return <ReviewsSection />;
  }
}

// 하단 고정 버튼 (전화·카카오톡·길찾기). 값이 있는 항목만, 모바일 폭에서만 보인다.
function QuickActionBar({ actions }: { actions: QuickAction[] }) {
  return (
    <nav
      aria-label="빠른 연락"
      data-quick-actions
      className="sticky bottom-0 z-10 grid bg-(--site-ink) text-sm font-semibold text-white md:hidden"
      style={{ gridTemplateColumns: `repeat(${actions.length}, minmax(0, 1fr))` }}
    >
      {actions.map((action) => (
        <a
          key={action.kind}
          href={action.href}
          data-action={action.kind}
          {...(action.kind === "phone" ? {} : { target: "_blank", rel: "noopener noreferrer" })}
          className="border-r border-white/15 p-3 text-center last:border-r-0"
        >
          {action.label}
        </a>
      ))}
    </nav>
  );
}
