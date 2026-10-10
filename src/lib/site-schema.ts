import { z } from "zod";

// 사이트 JSON 스키마 — 모든 섹션 타입의 단일 기준.
// 지금은 뼈대만 둔다. 섹션별 필드는 템플릿·편집실 작업에서 채운다.

export const industrySchema = z.enum(["food", "beauty", "stay", "pro"]);

export const sectionTypes = [
  "hero",
  "about",
  "list",
  "info",
  "contact",
  "notice",
  "gallery",
  "reviews",
] as const;

export const sectionTypeSchema = z.enum(sectionTypes);

export const sectionSchema = z.object({
  id: z.string().min(1),
  type: sectionTypeSchema,
  data: z.record(z.string(), z.unknown()),
});

export const themeSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export const siteContentSchema = z.object({
  sections: z.array(sectionSchema),
  theme: themeSchema,
});

export type Industry = z.infer<typeof industrySchema>;
export type SectionType = z.infer<typeof sectionTypeSchema>;
export type Section = z.infer<typeof sectionSchema>;
export type Theme = z.infer<typeof themeSchema>;
export type SiteContent = z.infer<typeof siteContentSchema>;
