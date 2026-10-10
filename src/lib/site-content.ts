import type { z } from "zod";
import {
  businessFieldsSchema,
  MAX_SECTIONS,
  sectionSchema,
  siteContentSchema,
  themeSchema,
  type Business,
  type Industry,
  type Section,
  type SiteContent,
} from "@/lib/site-schema";
import { getTemplateContent } from "@/lib/templates";

// site_versions 행의 sections·theme·business를 다루는 두 갈래 진입점.
// - 저장(편집실 저장, AI 생성 결과): validateSiteContent — 엄격. 실패하면 저장하지 않는다.
// - 읽기(공개 사이트·편집실 렌더링): parseSiteContent — 관대. 깨진 부분만 고치고 무엇을 왜 고쳤는지 돌려준다.

export type TemplateContext = { industry: Industry; siteName: string };

export type ValidationError = { path: string; message: string };

export type ValidationResult =
  | { ok: true; content: SiteContent }
  | { ok: false; errors: ValidationError[] };

export type SiteContentIssue = {
  path: string;
  reason: string;
  // removed: 그 값을 뺐다 / default: 템플릿 기본값으로 바꿨다 / template: 그 부분 전체를 템플릿으로 바꿨다
  fix: "removed" | "default" | "template";
};

export type ParseResult = { content: SiteContent; issues: SiteContentIssue[] };

function formatPath(path: readonly PropertyKey[]): string {
  return path.reduce<string>((acc, key) => {
    if (typeof key === "number") return `${acc}[${key}]`;
    return acc ? `${acc}.${String(key)}` : String(key);
  }, "");
}

function describe(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = formatPath(issue.path);
      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join("; ");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ─────────────────────────────────────────────
// 저장용 (엄격)
// ─────────────────────────────────────────────
export function validateSiteContent(raw: unknown): ValidationResult {
  const result = siteContentSchema.safeParse(raw);
  if (result.success) return { ok: true, content: result.data };
  return {
    ok: false,
    errors: result.error.issues.map((issue) => ({ path: formatPath(issue.path), message: issue.message })),
  };
}

// AI 생성 결과: 엄격 검증을 통과하지 못하면 전체를 템플릿 기본값으로 대체한다 (CLAUDE.md 원칙 4).
export function resolveGeneratedContent(
  raw: unknown,
  ctx: TemplateContext,
): { content: SiteContent; usedTemplate: boolean; errors: ValidationError[] } {
  const result = validateSiteContent(raw);
  if (result.ok) return { content: result.content, usedTemplate: false, errors: [] };
  return { content: getTemplateContent(ctx.industry, ctx.siteName), usedTemplate: true, errors: result.errors };
}

// ─────────────────────────────────────────────
// 읽기용 (관대)
// ─────────────────────────────────────────────
export function parseSiteContent(raw: unknown, ctx: TemplateContext): ParseResult {
  const template = getTemplateContent(ctx.industry, ctx.siteName);
  if (!isRecord(raw)) {
    return { content: template, issues: [{ path: "", reason: "사이트 데이터가 객체가 아닙니다", fix: "template" }] };
  }

  const issues: SiteContentIssue[] = [];
  return {
    content: {
      sections: parseSections(raw.sections, template.sections, issues),
      theme: parseTheme(raw.theme, template.theme, issues),
      business: parseBusiness(raw.business, issues),
    },
    issues,
  };
}

// 깨진 섹션만 뺀다. 남는 섹션이 없으면 템플릿 섹션 전체를 쓴다.
function parseSections(raw: unknown, fallback: Section[], issues: SiteContentIssue[]): Section[] {
  if (!Array.isArray(raw)) {
    issues.push({ path: "sections", reason: "섹션 목록이 배열이 아닙니다", fix: "template" });
    return fallback;
  }

  const kept: Section[] = [];
  const ids = new Set<string>();
  raw.forEach((item, i) => {
    const path = `sections[${i}]`;
    if (kept.length >= MAX_SECTIONS) {
      issues.push({ path, reason: `섹션은 최대 ${MAX_SECTIONS}개까지입니다`, fix: "removed" });
      return;
    }
    const result = sectionSchema.safeParse(item);
    if (!result.success) {
      issues.push({ path, reason: describe(result.error), fix: "removed" });
      return;
    }
    if (ids.has(result.data.id)) {
      issues.push({ path, reason: `섹션 id가 중복됩니다: ${result.data.id}`, fix: "removed" });
      return;
    }
    ids.add(result.data.id);
    kept.push(result.data);
  });

  if (kept.length === 0) {
    issues.push({
      path: "sections",
      reason: raw.length === 0 ? "섹션이 비어 있습니다" : "쓸 수 있는 섹션이 없습니다",
      fix: "template",
    });
    return fallback;
  }
  return kept;
}

// 필드 단위로 검증해 틀린 필드만 템플릿 값으로 바꾼다.
function parseTheme(raw: unknown, fallback: SiteContent["theme"], issues: SiteContentIssue[]): SiteContent["theme"] {
  if (!isRecord(raw)) {
    issues.push({ path: "theme", reason: "디자인 설정이 객체가 아닙니다", fix: "template" });
    return fallback;
  }

  const field = <T>(key: string, schema: z.ZodType<T>, fallbackValue: T): T => {
    const result = schema.safeParse(raw[key]);
    if (result.success) return result.data;
    issues.push({
      path: `theme.${key}`,
      reason: raw[key] === undefined ? "값이 없습니다" : describe(result.error),
      fix: "default",
    });
    return fallbackValue;
  };

  const theme: SiteContent["theme"] = {
    accent: field("accent", themeSchema.shape.accent, fallback.accent),
    font: field("font", themeSchema.shape.font, fallback.font),
    layout: field("layout", themeSchema.shape.layout, fallback.layout),
  };

  if (raw.photo !== undefined) {
    const result = themeSchema.shape.photo.safeParse(raw.photo);
    if (result.success) theme.photo = result.data;
    else issues.push({ path: "theme.photo", reason: describe(result.error), fix: "removed" });
  }
  return theme;
}

// 가게 정보는 모두 선택 입력이라 기본값이 없다. 틀린 필드만 뺀다.
function parseBusiness(raw: unknown, issues: SiteContentIssue[]): Business {
  if (raw === undefined) return {};
  if (!isRecord(raw)) {
    issues.push({ path: "business", reason: "가게 정보가 객체가 아닙니다", fix: "removed" });
    return {};
  }

  const business: Business = {};
  for (const key of ["phone", "address", "hours", "kakao"] as const) {
    if (raw[key] === undefined) continue;
    const result = businessFieldsSchema.shape[key].safeParse(raw[key]);
    if (result.success) {
      if (result.data !== undefined) business[key] = result.data;
    } else issues.push({ path: `business.${key}`, reason: describe(result.error), fix: "removed" });
  }
  return business;
}
