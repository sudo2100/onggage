// 개발용 미리보기 데이터: 작업 2의 업종 기본 초안 + 프로토타입의 예시 상호·가게 정보.
import type { Business, Industry, SiteContent } from "@/lib/site-schema";
import { DESIGNS, getDesign, getTemplateContent, type Design } from "@/lib/templates";

export const BUSINESS_VARIANTS = ["full", "empty"] as const;
export type BusinessVariant = (typeof BUSINESS_VARIANTS)[number];

const SAMPLE_SHOPS: Record<Industry, { name: string; business: Business }> = {
  food: {
    name: "담소 식당",
    business: {
      hours: "매일 11:00–21:00 · 브레이크 15:00–17:00",
      phone: "031-905-1234",
      kakao: "https://pf.kakao.com/_damso",
      address: "경기 고양시 일산동구 정발산로 24, 1층",
    },
  },
  beauty: {
    name: "결 헤어",
    business: {
      hours: "화–일 10:00–20:00 · 월요일 휴무",
      phone: "031-922-5678",
      kakao: "https://open.kakao.com/o/gyeolhair",
      address: "경기 고양시 일산서구 주엽로 112, 2층",
    },
  },
  stay: {
    name: "숲속 쉼표 스테이",
    business: {
      hours: "입실 15:00 · 퇴실 11:00",
      phone: "031-976-0000",
      kakao: "@숲속쉼표",
      address: "경기 고양시 덕양구 북한산로 301",
    },
  },
  pro: {
    name: "바른 세무회계",
    business: {
      hours: "평일 09:00–18:00 · 토요일 예약 상담",
      phone: "031-901-2468",
      kakao: "https://pf.kakao.com/_bareun",
      address: "경기 고양시 일산동구 중앙로 1275, 7층",
    },
  },
};

export function getPreview(
  designId: string,
  variant: BusinessVariant,
): { design: Design; siteName: string; content: SiteContent } | undefined {
  const design = getDesign(designId);
  if (!design) return undefined;
  const shop = SAMPLE_SHOPS[design.industry];
  const base = getTemplateContent(design.industry, shop.name);
  return {
    design,
    siteName: shop.name,
    content: { ...base, theme: { ...design.theme }, business: variant === "full" ? { ...shop.business } : {} },
  };
}

export { DESIGNS };
