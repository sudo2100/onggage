// 미리보기용 예시 가게 — 프로토타입의 예시 상호·가게 정보.
// 마케팅 화면(랜딩·디자인 목록·상세)과 개발용 미리보기가 함께 쓴다.
import type { Business, Industry, SiteContent } from "@/lib/site-schema";
import { getTemplateContent } from ".";
import type { Design } from "./designs";

export type SampleShop = { name: string; business: Business };

export const SAMPLE_SHOPS: Record<Industry, SampleShop> = {
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

// 디자인 미리보기 내용: 업종 기본 초안 + 그 디자인의 theme + 예시 가게 정보.
// siteName을 주면 그 상호로, 없으면 업종 예시 상호로 채운다.
export function getDesignPreviewContent(
  design: Design,
  options: { siteName?: string; business?: "sample" | "empty" } = {},
): { siteName: string; content: SiteContent } {
  const shop = SAMPLE_SHOPS[design.industry];
  const siteName = options.siteName || shop.name;
  const base = getTemplateContent(design.industry, siteName);
  return {
    siteName,
    content: {
      ...base,
      theme: { ...design.theme },
      business: options.business === "empty" ? {} : { ...shop.business },
    },
  };
}
