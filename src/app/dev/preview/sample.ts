// 개발용 미리보기 데이터: 업종 기본 초안 + 예시 가게 정보 (src/lib/templates/samples.ts).
// 변형: full(예시 가게 정보), empty(가게 정보 없음), long(띄어쓰기 없는 긴 글·긴 링크로 넘침 확인)
import type { SiteContent } from "@/lib/site-schema";
import { DESIGNS, getDesign, type Design } from "@/lib/templates";
import { getDesignPreviewContent } from "@/lib/templates/samples";

export const PREVIEW_VARIANTS = ["full", "empty", "long"] as const;
export type PreviewVariant = (typeof PREVIEW_VARIANTS)[number];

export const LONG_TEXT = "가".repeat(500);
export const LONG_URL = `https://example.com/${"a".repeat(180)}`;

// 스키마 길이 제한 안에서 띄어쓰기 없는 가장 긴 글을 넣는다.
function withLongText(content: SiteContent): SiteContent {
  const sections = content.sections.map((section) => {
    switch (section.type) {
      case "hero":
        return { ...section, subtitle: "나".repeat(100) };
      case "about":
        return { ...section, body: LONG_TEXT };
      case "list":
        return {
          ...section,
          items: [{ name: "다".repeat(50), description: "라".repeat(100), price: "9".repeat(30) }, ...section.items],
        };
      default:
        return section;
    }
  });
  return {
    ...content,
    sections: [
      ...sections,
      { id: "notice", type: "notice", visible: true, title: "공지", body: `예약은 이 주소에서 받아요: ${LONG_URL}` },
    ],
    business: { ...content.business, address: "마".repeat(200), hours: "바".repeat(100) },
  };
}

export function getPreview(
  designId: string,
  variant: PreviewVariant,
): { design: Design; siteName: string; content: SiteContent } | undefined {
  const design = getDesign(designId);
  if (!design) return undefined;
  const preview = getDesignPreviewContent(design, { business: variant === "empty" ? "empty" : "sample" });
  return { design, ...preview, content: variant === "long" ? withLongText(preview.content) : preview.content };
}

export { DESIGNS };
