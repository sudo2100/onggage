// 개발용 미리보기 데이터: 업종 기본 초안 + 예시 가게 정보 (src/lib/templates/samples.ts).
import type { SiteContent } from "@/lib/site-schema";
import { DESIGNS, getDesign, type Design } from "@/lib/templates";
import { getDesignPreviewContent } from "@/lib/templates/samples";

export const BUSINESS_VARIANTS = ["full", "empty"] as const;
export type BusinessVariant = (typeof BUSINESS_VARIANTS)[number];

export function getPreview(
  designId: string,
  variant: BusinessVariant,
): { design: Design; siteName: string; content: SiteContent } | undefined {
  const design = getDesign(designId);
  if (!design) return undefined;
  return { design, ...getDesignPreviewContent(design, { business: variant === "full" ? "sample" : "empty" }) };
}

export { DESIGNS };
