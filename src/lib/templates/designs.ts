// 업종별 디자인 2종. 이름·색·글꼴·배치는 클릭 프로토타입을 따른다.
// id는 sites.template_id에 저장되는 값이다.
import type { Industry, Theme } from "@/lib/site-schema";

export const INDUSTRY_LABELS: Record<Industry, string> = {
  food: "음식·카페",
  beauty: "뷰티·헤어",
  stay: "숙박·스테이",
  pro: "전문 서비스",
};

export type Design = {
  id: string;
  industry: Industry;
  name: string;
  description: string;
  theme: Theme;
};

export const DESIGNS = [
  {
    id: "food-a",
    industry: "food",
    name: "밥상",
    description: "사진과 글을 나란히",
    theme: { accent: "#7A4B1F", font: "myeongjo", layout: "split" },
  },
  {
    id: "food-b",
    industry: "food",
    name: "골목",
    description: "큰 사진으로 첫인상",
    theme: { accent: "#2E5E4E", font: "batang", layout: "center" },
  },
  {
    id: "beauty-a",
    industry: "beauty",
    name: "결",
    description: "부드럽고 가벼운 분위기",
    theme: { accent: "#8C5A7A", font: "dodum", layout: "center" },
  },
  {
    id: "beauty-b",
    industry: "beauty",
    name: "모먼트",
    description: "깔끔한 정보 중심",
    theme: { accent: "#3D4A6B", font: "plex", layout: "split" },
  },
  {
    id: "stay-a",
    industry: "stay",
    name: "쉼표",
    description: "여백이 많은 차분한 구성",
    theme: { accent: "#4F6A55", font: "batang", layout: "split" },
  },
  {
    id: "stay-b",
    industry: "stay",
    name: "바다빛",
    description: "객실 사진을 크게",
    theme: { accent: "#1F5A7A", font: "myeongjo", layout: "center" },
  },
  {
    id: "pro-a",
    industry: "pro",
    name: "신뢰",
    description: "단정하고 믿음직한 인상",
    theme: { accent: "#1E3A5F", font: "plex", layout: "split" },
  },
  {
    id: "pro-b",
    industry: "pro",
    name: "단정",
    description: "격식 있는 사무소 느낌",
    theme: { accent: "#3A3D3C", font: "myeongjo", layout: "center" },
  },
] as const satisfies readonly Design[];

export type DesignId = (typeof DESIGNS)[number]["id"];

export function getDesign(id: string): Design | undefined {
  return DESIGNS.find((design) => design.id === id);
}

export function getDesignsForIndustry(industry: Industry): Design[] {
  return DESIGNS.filter((design) => design.industry === industry);
}
