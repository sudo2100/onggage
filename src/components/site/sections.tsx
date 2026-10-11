// 섹션 컴포넌트 — 서버 컴포넌트, 화면만 그린다. 편집 기능은 넣지 않는다.
// 사장님이 쓴 글은 모두 JSX 텍스트로만 출력한다 (줄바꿈은 whitespace-pre-line으로 살린다).
import type { ReactNode } from "react";
import { kakaoHref, kakaoLabel, mapHref, telHref } from "@/lib/site-links";
import type { Business, Industry, Section, Theme } from "@/lib/site-schema";
import { INDUSTRY_LABELS } from "@/lib/templates";
import { SitePhoto } from "./SitePhoto";

type SectionOf<T extends Section["type"]> = Extract<Section, { type: T }>;

export type SectionContext = {
  industry: Industry;
  siteName: string;
  theme: Theme;
  business: Business;
};

const heading = "font-(family-name:--font-site) break-keep tracking-tight";
const linkClass = "underline underline-offset-4 decoration-1";

function SectionShell({
  section,
  alt = false,
  children,
}: {
  section: Section;
  alt?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={section.id}
      data-section={section.type}
      className={`px-4 py-12 md:px-10 md:py-14 ${alt ? "bg-(--site-alt-bg)" : ""}`}
    >
      <div className="mx-auto max-w-[880px]">{children}</div>
    </section>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className={`${heading} mb-5 text-[26px] leading-snug md:text-[28px]`}>{children}</h2>;
}

function AccentButton({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block rounded-[3px] bg-(--site-accent) px-5 py-3 text-[15px] font-semibold text-(--site-on-accent)">
      {children}
    </span>
  );
}

export function HeroSection({ section, ctx }: { section: SectionOf<"hero">; ctx: SectionContext }) {
  const kicker = INDUSTRY_LABELS[ctx.industry];
  const photoAlt = `${ctx.siteName} 대표 사진`;

  if (ctx.theme.layout === "center") {
    return (
      <section id={section.id} data-section="hero" className="relative">
        <SitePhoto path={ctx.theme.photo} alt={photoAlt} sizes="100vw" priority className="absolute inset-0" />
        <div className="absolute inset-0 bg-black/50" aria-hidden />
        <div className="relative mx-auto grid min-h-[380px] max-w-[640px] place-items-center px-4 py-16 text-center text-white md:min-h-[440px]">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] opacity-90">{kicker}</p>
            <h1 className={`${heading} mt-2 text-[32px] leading-tight md:text-[44px]`}>{section.title}</h1>
            {section.subtitle ? (
              <p className="mt-3 mb-6 text-[17px] break-keep whitespace-pre-line opacity-90 md:text-lg">
                {section.subtitle}
              </p>
            ) : null}
            <span className="inline-block rounded-[3px] bg-white px-5 py-3 text-[15px] font-semibold text-(--site-ink)">
              {section.ctaLabel}
            </span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id={section.id} data-section="hero" className="px-4 py-12 md:px-10 md:py-14">
      <div className="mx-auto grid max-w-[960px] items-center gap-8 md:grid-cols-2 md:gap-10">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-(--site-accent-text)">{kicker}</p>
          <h1 className={`${heading} mt-2 text-[32px] leading-tight md:text-[44px]`}>{section.title}</h1>
          {section.subtitle ? (
            <p className="mt-3 mb-6 text-[17px] break-keep whitespace-pre-line opacity-80 md:text-lg">
              {section.subtitle}
            </p>
          ) : null}
          <AccentButton>{section.ctaLabel}</AccentButton>
        </div>
        <SitePhoto
          path={ctx.theme.photo}
          alt={photoAlt}
          sizes="(min-width: 768px) 480px, 100vw"
          priority
          className="relative aspect-[4/5] rounded-[4px]"
        />
      </div>
    </section>
  );
}

function TextSection({ section }: { section: SectionOf<"about"> | SectionOf<"notice"> }) {
  return (
    <SectionShell section={section}>
      <SectionTitle>{section.title}</SectionTitle>
      <p className="max-w-[38em] text-[17px] break-keep whitespace-pre-line">{section.body}</p>
    </SectionShell>
  );
}

export const AboutSection = TextSection;
export const NoticeSection = TextSection;

export function ListSection({ section }: { section: SectionOf<"list"> }) {
  return (
    <SectionShell section={section} alt>
      <SectionTitle>{section.title}</SectionTitle>
      <ul className="border-t border-(--site-line)">
        {section.items.map((item, i) => (
          <li key={i} className="grid grid-cols-[1fr_auto] gap-x-5 gap-y-1 border-b border-(--site-line) py-4">
            <span className="text-[17px] font-semibold break-keep">{item.name}</span>
            {item.price ? (
              <span className={`${heading} text-right font-bold text-(--site-accent-text) tabular-nums`}>
                {item.price}
              </span>
            ) : (
              <span />
            )}
            {item.description ? (
              <span className="col-span-2 text-sm break-keep opacity-75">{item.description}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}

// 가게 정보 중 값이 있는 항목만 보여 준다. 하나도 없으면 섹션을 그리지 않는다.
export function InfoSection({ section, ctx }: { section: SectionOf<"info">; ctx: SectionContext }) {
  const { hours, address, phone, kakao } = ctx.business;
  if (!hours && !address && !phone && !kakao) return null;
  const kakaoLink = kakao ? kakaoHref(kakao) : undefined;

  return (
    <SectionShell section={section}>
      <SectionTitle>{section.title}</SectionTitle>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[15px] [overflow-wrap:anywhere]">
        {hours ? (
          <>
            <dt className="opacity-65">시간</dt>
            <dd className="whitespace-pre-line">{hours}</dd>
          </>
        ) : null}
        {address ? (
          <>
            <dt className="opacity-65">주소</dt>
            <dd>
              {address}{" "}
              <a href={mapHref(address)} target="_blank" rel="noopener noreferrer" className={`${linkClass} ml-1 text-(--site-accent-text)`}>
                길찾기
              </a>
            </dd>
          </>
        ) : null}
        {phone ? (
          <>
            <dt className="opacity-65">전화</dt>
            <dd>
              <a href={telHref(phone)} className={linkClass}>
                {phone}
              </a>
            </dd>
          </>
        ) : null}
        {kakao ? (
          <>
            <dt className="opacity-65">카카오톡</dt>
            <dd>
              {kakaoLink ? (
                <a href={kakaoLink} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  {kakaoLabel(kakao)}
                </a>
              ) : (
                kakao
              )}
            </dd>
          </>
        ) : null}
      </dl>
    </SectionShell>
  );
}

// 문의 폼은 모양만 있다. 저장은 3단계에서 서버 Route Handler로 붙인다.
// 버튼을 type="button"으로 두어 입력값이 전송되거나 주소창에 붙지 않게 한다.
export function ContactSection({ section, ctx }: { section: SectionOf<"contact">; ctx: SectionContext }) {
  const { phone, kakao } = ctx.business;
  const kakaoLink = kakao ? kakaoHref(kakao) : undefined;
  const field =
    "w-full min-w-0 rounded-[3px] border border-(--site-line-strong) bg-white px-3 py-2.5 text-(--site-ink) placeholder:text-(--site-ink)/55";

  return (
    <SectionShell section={section} alt>
      <SectionTitle>{section.title}</SectionTitle>
      <div className="grid gap-8 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <form className="grid max-w-[520px] gap-2.5" aria-label="문의 보내기">
          <div className="grid gap-2.5 sm:grid-cols-2">
            <input className={field} placeholder="이름" aria-label="이름" autoComplete="name" />
            <input className={field} placeholder="연락처" aria-label="연락처" autoComplete="tel" inputMode="tel" />
          </div>
          <textarea className={field} rows={3} placeholder="문의 내용" aria-label="문의 내용" />
          <label className="flex items-center gap-2 text-[13px] opacity-85">
            <input type="checkbox" /> 개인정보 수집·이용에 동의합니다 (필수)
          </label>
          <div>
            <button
              type="button"
              className="rounded-[3px] bg-(--site-accent) px-5 py-3 text-[15px] font-semibold text-(--site-on-accent)"
            >
              문의 보내기
            </button>
          </div>
        </form>
        {phone || kakao ? (
          <div className="grid content-start gap-2 [overflow-wrap:anywhere]">
            {phone ? (
              <a href={telHref(phone)} className="rounded-[4px] border border-(--site-line) bg-white px-3.5 py-3 text-sm">
                <small className="block text-xs opacity-65">전화</small>
                {phone}
              </a>
            ) : null}
            {kakao ? (
              kakaoLink ? (
                <a
                  href={kakaoLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-[4px] border border-(--site-line) bg-white px-3.5 py-3 text-sm"
                >
                  <small className="block text-xs opacity-65">카카오톡</small>
                  {kakaoLabel(kakao)}
                </a>
              ) : (
                <div className="rounded-[4px] border border-(--site-line) bg-white px-3.5 py-3 text-sm">
                  <small className="block text-xs opacity-65">카카오톡</small>
                  {kakao}
                </div>
              )
            ) : null}
          </div>
        ) : null}
      </div>
    </SectionShell>
  );
}

export function GallerySection({ section }: { section: SectionOf<"gallery"> }) {
  // 사진이 없으면 색 배경 칸 3개로 자리를 보여 준다.
  const photos: (string | undefined)[] = section.photos.length > 0 ? section.photos : [undefined, undefined, undefined];
  return (
    <SectionShell section={section}>
      <SectionTitle>{section.title}</SectionTitle>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
        {photos.map((path, i) => (
          <SitePhoto
            key={path ?? i}
            path={path}
            alt={`${section.title} ${i + 1}`}
            sizes="(min-width: 768px) 300px, 50vw"
            className="relative aspect-square rounded-[3px]"
          />
        ))}
      </div>
    </SectionShell>
  );
}

// 손님 후기: 리뷰 연동 전까지는 그리지 않는다. 예시 후기를 공개 사이트에 보여 주면 실제 후기로 오해할 수 있다.
export function ReviewsSection() {
  return null;
}
