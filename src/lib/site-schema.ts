import { z } from "zod";

// 사이트 JSON 스키마 — 모든 섹션 타입의 단일 기준.
// site_versions의 sections·theme·business 칼럼과 1:1로 대응한다.
// 이 스키마는 저장용(엄격)이다. 읽을 때의 관대한 처리는 site-content.ts의 parseSiteContent가 맡는다.

export const industrySchema = z.enum(["food", "beauty", "stay", "pro"]);

// 말투 (sites.tone). 템플릿 문구와 AI 문구가 따른다. DB enum site_tone과 같은 값.
export const toneSchema = z.enum(["calm", "warm", "fresh"]);

const requiredText = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max);

// Storage site-assets 버킷 경로: {site_id}/{파일명}. 상위 폴더 이동·숨김 파일은 막는다.
export const assetPathSchema = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[A-Za-z0-9_-][A-Za-z0-9._-]{0,99}$/,
    "사진 경로 형식이 올바르지 않습니다",
  );

// ─────────────────────────────────────────────
// 섹션
// ─────────────────────────────────────────────
const sectionBase = {
  id: requiredText(50),
  visible: z.boolean(),
};

export const heroSectionSchema = z.object({
  ...sectionBase,
  type: z.literal("hero"),
  title: requiredText(50),
  subtitle: optionalText(100),
  ctaLabel: requiredText(20),
});

export const aboutSectionSchema = z.object({
  ...sectionBase,
  type: z.literal("about"),
  title: requiredText(30),
  body: requiredText(1000),
});

export const listItemSchema = z.object({
  name: requiredText(50),
  description: optionalText(100),
  // "80,000원부터", "무료", "월 100,000원부터"처럼 사장님이 쓴 그대로 둔다.
  price: optionalText(30),
});

export const listSectionSchema = z.object({
  ...sectionBase,
  type: z.literal("list"),
  title: requiredText(30),
  items: z.array(listItemSchema).max(30),
});

// 영업 안내: 시간·주소·전화·카카오톡은 business에서 읽는다.
export const infoSectionSchema = z.object({
  ...sectionBase,
  type: z.literal("info"),
  title: requiredText(30),
});

// 문의하기: 폼은 고정, 전화·카카오톡은 business에서 읽는다.
export const contactSectionSchema = z.object({
  ...sectionBase,
  type: z.literal("contact"),
  title: requiredText(30),
});

export const noticeSectionSchema = z.object({
  ...sectionBase,
  type: z.literal("notice"),
  title: requiredText(30),
  body: requiredText(1000),
});

export const gallerySectionSchema = z.object({
  ...sectionBase,
  type: z.literal("gallery"),
  title: requiredText(30),
  photos: z.array(assetPathSchema).max(30),
});

// 손님 후기: 내용은 리뷰 연동으로 채운다.
export const reviewsSectionSchema = z.object({
  ...sectionBase,
  type: z.literal("reviews"),
  title: requiredText(30),
});

export const sectionSchema = z.discriminatedUnion("type", [
  heroSectionSchema,
  aboutSectionSchema,
  listSectionSchema,
  infoSectionSchema,
  contactSectionSchema,
  noticeSectionSchema,
  gallerySectionSchema,
  reviewsSectionSchema,
]);

export const sectionTypes = sectionSchema.options.map((o) => o.shape.type.value);

export const MAX_SECTIONS = 20;

export const sectionsSchema = z
  .array(sectionSchema)
  .max(MAX_SECTIONS)
  .superRefine((sections, ctx) => {
    const seen = new Set<string>();
    sections.forEach((section, i) => {
      if (seen.has(section.id)) {
        ctx.addIssue({ code: "custom", message: `섹션 id가 중복됩니다: ${section.id}`, path: [i, "id"] });
      }
      seen.add(section.id);
    });
  });

// ─────────────────────────────────────────────
// 디자인 설정
// ─────────────────────────────────────────────
export const fontSchema = z.enum(["myeongjo", "batang", "dodum", "plex"]);
export const layoutSchema = z.enum(["split", "center"]);

export const themeSchema = z.object({
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/, "색상은 #RRGGBB 형식이어야 합니다"),
  font: fontSchema,
  layout: layoutSchema,
  photo: assetPathSchema.optional(),
});

// ─────────────────────────────────────────────
// 가게 정보 — 영업 안내·문의 섹션과 하단 버튼이 함께 읽는다. 모두 선택 입력.
// 빈 문자열(공백만 있는 값 포함)은 입력 안 함으로 보고 undefined로 저장한다.
// ─────────────────────────────────────────────
const blankToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

// 앞뒤 공백은 지우고, 가운데 공백은 하이픈으로 바꾼다. "010 1234 5678" → "010-1234-5678"
const normalizePhone = (value: unknown) => {
  const blank = blankToUndefined(value);
  if (typeof blank !== "string") return blank;
  return blank.trim().replace(/\s*-\s*|\s+/g, "-");
};

const optionalBusinessText = (max: number) => z.preprocess(blankToUndefined, requiredText(max).optional());

// 카카오톡: 채널 링크(https://pf.kakao.com/_…, 채팅 바로가기 /chat 포함), 오픈채팅 링크(https://open.kakao.com/o/…),
// 또는 링크가 아닌 검색용 아이디(@담소식당). 링크는 이 두 형식만 허용한다.
export const KAKAO_LINK_PATTERN =
  /^https:\/\/(?:pf\.kakao\.com\/_[A-Za-z0-9]+(?:\/chat)?|open\.kakao\.com\/o\/[A-Za-z0-9]+)\/?$/;

const kakaoSchema = z
  .string()
  .trim()
  .max(100)
  .refine(
    (value) => KAKAO_LINK_PATTERN.test(value) || (!/[/:]/.test(value) && value.length <= 50),
    "카카오톡은 채널(https://pf.kakao.com/_…)·오픈채팅(https://open.kakao.com/o/…) 링크나 @아이디만 쓸 수 있습니다",
  );

// 필드별 스키마 (읽기용 parseSiteContent가 필드 단위로 검증할 때 쓴다).
export const businessFieldsSchema = z.object({
  phone: z.preprocess(
    normalizePhone,
    z
      .string()
      .regex(/^[0-9][0-9-]{6,14}[0-9]$/, "전화번호는 숫자와 하이픈만 쓸 수 있습니다")
      .optional(),
  ),
  address: optionalBusinessText(200),
  hours: optionalBusinessText(100),
  kakao: z.preprocess(blankToUndefined, kakaoSchema.optional()),
});

// 입력 안 한 필드는 키째로 뺀다 ({ phone: undefined } → {}).
export const businessSchema = businessFieldsSchema.transform(
  (business) =>
    Object.fromEntries(Object.entries(business).filter(([, value]) => value !== undefined)) as typeof business,
);

export const siteContentSchema = z.object({
  sections: sectionsSchema,
  theme: themeSchema,
  business: businessSchema,
});

export type Industry = z.infer<typeof industrySchema>;
export type Tone = z.infer<typeof toneSchema>;
export type Section = z.infer<typeof sectionSchema>;
export type SectionType = Section["type"];
export type ListItem = z.infer<typeof listItemSchema>;
export type Theme = z.infer<typeof themeSchema>;
export type Business = z.infer<typeof businessSchema>;
export type SiteContent = z.infer<typeof siteContentSchema>;
