// 섹션 컴포넌트 — 서버 컴포넌트, 화면만 그린다. 편집 기능은 넣지 않는다.
// 사장님이 쓴 글은 모두 JSX 텍스트로만 출력한다 (줄바꿈은 whitespace-pre-line으로 살린다).
// 반응형은 화면 폭이 아니라 사이트 루트(@container) 폭을 기준으로 한다 (@3xl = 48rem = 768px).
// 그래서 공개 사이트에서는 화면 폭대로, 미리보기 상자 안에서는 상자 폭대로 배치가 바뀐다.
import type { AnchorHTMLAttributes, ReactNode } from "react";
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
  // 보이는 문의 섹션으로 가는 앵커 (#contact). 문의 섹션이 숨겨져 있거나 embedded면 undefined.
  contactHref?: string;
  // 문의 저장 기능이 붙으면 켠다. 꺼져 있으면 보내기 버튼을 비활성화하고 안내 문구를 보여 준다.
  inquiryEnabled: boolean;
  // 편집실 미리보기용 자리 표시 (사진 없는 사진 모음 등). 공개 사이트에서는 끈다.
  showPlaceholders: boolean;
  // 다른 페이지 안에 축소 미리보기로 넣을 때 켠다 (디자인 목록·랜딩 등).
  // 제목 태그(h1/h2)·섹션 id·링크를 만들지 않고 입력칸을 비활성화한다. 한 페이지에 여러 번 그려도
  // h1과 id가 겹치지 않고, 예시 전화번호·카카오톡 링크가 실제 링크로 노출되지 않는다.
  embedded: boolean;
};

// 띄어쓰기 없는 긴 상호도 좁은 폭에서 넘치지 않게 필요하면 글자 단위로 줄을 바꾼다.
const heading = "font-(family-name:--font-site) break-keep [overflow-wrap:anywhere] tracking-tight";
const linkClass = "underline underline-offset-4 decoration-1";

function Heading({
  ctx,
  level,
  className,
  children,
}: {
  ctx: SectionContext;
  level: 1 | 2;
  className: string;
  children: ReactNode;
}) {
  if (ctx.embedded) {
    return (
      <div className={className} data-site-heading={level}>
        {children}
      </div>
    );
  }
  const Tag = level === 1 ? "h1" : "h2";
  return (
    <Tag className={className} data-site-heading={level}>
      {children}
    </Tag>
  );
}

// embedded면 링크 대신 같은 모양의 span을 그린다.
function SiteLink({
  ctx,
  href,
  external = false,
  className,
  children,
}: {
  ctx: SectionContext;
  href: string;
  external?: boolean;
  className?: string;
  children: ReactNode;
}) {
  if (ctx.embedded) return <span className={className}>{children}</span>;
  const target: AnchorHTMLAttributes<HTMLAnchorElement> = external ? { target: "_blank", rel: "noopener noreferrer" } : {};
  return (
    <a href={href} className={className} {...target}>
      {children}
    </a>
  );
}

function SectionShell({
  section,
  ctx,
  alt = false,
  children,
}: {
  section: Section;
  ctx: SectionContext;
  alt?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={ctx.embedded ? undefined : section.id}
      data-section={section.type}
      className={`px-4 py-12 @3xl:px-10 @3xl:py-14 ${alt ? "bg-(--site-alt-bg)" : ""}`}
    >
      <div className="mx-auto max-w-[880px]">{children}</div>
    </section>
  );
}

function SectionTitle({ ctx, children }: { ctx: SectionContext; children: ReactNode }) {
  return (
    <Heading ctx={ctx} level={2} className={`${heading} mb-5 text-[26px] leading-snug @3xl:text-[28px]`}>
      {children}
    </Heading>
  );
}

// 대표 화면 버튼: 문의 섹션이 보이면 그쪽으로 가는 링크, 아니면 버튼 모양만.
function CtaButton({ label, href, tone }: { label: string; href?: string; tone: "accent" | "light" }) {
  const className = `inline-block rounded-[3px] px-5 py-3 text-[15px] font-semibold ${
    tone === "accent" ? "bg-(--site-accent) text-(--site-on-accent)" : "bg-white text-(--site-ink)"
  }`;
  if (href) {
    return (
      <a href={href} className={className} data-cta>
        {label}
      </a>
    );
  }
  return (
    <span className={className} data-cta>
      {label}
    </span>
  );
}

export function HeroSection({ section, ctx }: { section: SectionOf<"hero">; ctx: SectionContext }) {
  const kicker = INDUSTRY_LABELS[ctx.industry];
  const photoAlt = `${ctx.siteName} 대표 사진`;
  const id = ctx.embedded ? undefined : section.id;
  const title = (
    <Heading ctx={ctx} level={1} className={`${heading} mt-2 text-[32px] leading-tight @3xl:text-[44px]`}>
      {section.title}
    </Heading>
  );

  if (ctx.theme.layout === "center") {
    return (
      <section id={id} data-section="hero" className="relative">
        <SitePhoto path={ctx.theme.photo} alt={photoAlt} sizes="100vw" priority={!ctx.embedded} className="absolute inset-0" />
        <div className="absolute inset-0 bg-black/50" aria-hidden />
        <div className="relative mx-auto grid min-h-[380px] max-w-[640px] place-items-center px-4 py-16 text-center text-white @3xl:min-h-[440px]">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] opacity-90">{kicker}</p>
            {title}
            {section.subtitle ? (
              <p className="mt-3 mb-6 text-[17px] break-keep whitespace-pre-line opacity-90 @3xl:text-lg">
                {section.subtitle}
              </p>
            ) : null}
            <CtaButton label={section.ctaLabel} href={ctx.contactHref} tone="light" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id={id} data-section="hero" className="px-4 py-12 @3xl:px-10 @3xl:py-14">
      <div className="mx-auto grid max-w-[960px] items-center gap-8 @3xl:grid-cols-2 @3xl:gap-10">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-(--site-accent-text)">{kicker}</p>
          {title}
          {section.subtitle ? (
            <p className="mt-3 mb-6 text-[17px] break-keep whitespace-pre-line opacity-80 @3xl:text-lg">
              {section.subtitle}
            </p>
          ) : null}
          <CtaButton label={section.ctaLabel} href={ctx.contactHref} tone="accent" />
        </div>
        <SitePhoto
          path={ctx.theme.photo}
          alt={photoAlt}
          sizes="(min-width: 768px) 480px, 100vw"
          priority={!ctx.embedded}
          className="relative aspect-[4/5] rounded-[4px]"
        />
      </div>
    </section>
  );
}

function TextSection({ section, ctx }: { section: SectionOf<"about"> | SectionOf<"notice">; ctx: SectionContext }) {
  return (
    <SectionShell section={section} ctx={ctx}>
      <SectionTitle ctx={ctx}>{section.title}</SectionTitle>
      <p className="max-w-[38em] text-[17px] break-keep whitespace-pre-line">{section.body}</p>
    </SectionShell>
  );
}

export const AboutSection = TextSection;
export const NoticeSection = TextSection;

export function ListSection({ section, ctx }: { section: SectionOf<"list">; ctx: SectionContext }) {
  return (
    <SectionShell section={section} ctx={ctx} alt>
      <SectionTitle ctx={ctx}>{section.title}</SectionTitle>
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
    <SectionShell section={section} ctx={ctx}>
      <SectionTitle ctx={ctx}>{section.title}</SectionTitle>
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
              <SiteLink ctx={ctx} href={mapHref(address)} external className={`${linkClass} ml-1 text-(--site-accent-text)`}>
                길찾기
              </SiteLink>
            </dd>
          </>
        ) : null}
        {phone ? (
          <>
            <dt className="opacity-65">전화</dt>
            <dd>
              <SiteLink ctx={ctx} href={telHref(phone)} className={linkClass}>
                {phone}
              </SiteLink>
            </dd>
          </>
        ) : null}
        {kakao ? (
          <>
            <dt className="opacity-65">카카오톡</dt>
            <dd>
              {kakaoLink ? (
                <SiteLink ctx={ctx} href={kakaoLink} external className={linkClass}>
                  {kakaoLabel(kakao)}
                </SiteLink>
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
// inquiryEnabled가 꺼져 있으면(기본) 보내기 버튼을 비활성화하고 다른 연락 방법을 안내한다.
export function ContactSection({ section, ctx }: { section: SectionOf<"contact">; ctx: SectionContext }) {
  const { phone, kakao } = ctx.business;
  const kakaoLink = kakao ? kakaoHref(kakao) : undefined;
  const field =
    "w-full min-w-0 rounded-[3px] border border-(--site-line-strong) bg-white px-3 py-2.5 text-(--site-ink) placeholder:text-(--site-ink)/55";
  const noticeId = ctx.embedded ? undefined : `${section.id}-inquiry-notice`;
  const card = "rounded-[4px] border border-(--site-line) bg-white px-3.5 py-3 text-sm";

  return (
    <SectionShell section={section} ctx={ctx} alt>
      <SectionTitle ctx={ctx}>{section.title}</SectionTitle>
      <div className="grid gap-8 @3xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <form className="grid max-w-[520px] gap-2.5" aria-label={ctx.embedded ? undefined : "문의 보내기"}>
          <fieldset disabled={ctx.embedded} className="contents">
            <div className="grid gap-2.5 @min-[40rem]:grid-cols-2">
              <input className={field} placeholder="이름" aria-label="이름" autoComplete="name" />
              <input className={field} placeholder="연락처" aria-label="연락처" autoComplete="tel" inputMode="tel" />
            </div>
            <textarea className={field} rows={3} placeholder="문의 내용" aria-label="문의 내용" />
            <label className="flex items-center gap-2 text-[13px] opacity-85">
              <input type="checkbox" /> 개인정보 수집·이용에 동의합니다 (필수)
            </label>
          </fieldset>
          {ctx.inquiryEnabled ? null : (
            <p id={noticeId} className="text-sm font-semibold" data-inquiry-notice>
              온라인 문의는 준비 중이에요. 전화나 카카오톡으로 연락해 주세요.
            </p>
          )}
          <div>
            <button
              type="button"
              disabled={!ctx.inquiryEnabled || ctx.embedded}
              aria-describedby={ctx.inquiryEnabled ? undefined : noticeId}
              className="rounded-[3px] bg-(--site-accent) px-5 py-3 text-[15px] font-semibold text-(--site-on-accent) disabled:cursor-not-allowed disabled:opacity-50"
            >
              문의 보내기
            </button>
          </div>
        </form>
        {phone || kakao ? (
          <div className="grid content-start gap-2 [overflow-wrap:anywhere]">
            {phone ? (
              <SiteLink ctx={ctx} href={telHref(phone)} className={card}>
                <small className="block text-xs opacity-65">전화</small>
                {phone}
              </SiteLink>
            ) : null}
            {kakao ? (
              kakaoLink ? (
                <SiteLink ctx={ctx} href={kakaoLink} external className={card}>
                  <small className="block text-xs opacity-65">카카오톡</small>
                  {kakaoLabel(kakao)}
                </SiteLink>
              ) : (
                <div className={card}>
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

// 사진이 없으면 공개 화면에서는 그리지 않는다. 편집실 미리보기(showPlaceholders)에서는 색 배경 칸 3개로 자리를 보여 준다.
export function GallerySection({ section, ctx }: { section: SectionOf<"gallery">; ctx: SectionContext }) {
  if (section.photos.length === 0 && !ctx.showPlaceholders) return null;
  const photos: (string | undefined)[] = section.photos.length > 0 ? section.photos : [undefined, undefined, undefined];
  return (
    <SectionShell section={section} ctx={ctx}>
      <SectionTitle ctx={ctx}>{section.title}</SectionTitle>
      <div className="grid grid-cols-2 gap-2.5 @3xl:grid-cols-3">
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
