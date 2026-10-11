// 업종별 템플릿 정의와 기본 섹션.
// 문구는 클릭 프로토타입의 기본 말투를 따른다. 말투별 문구는 온보딩 작업에서 추가한다.
import type { Industry, ListItem, SiteContent, Theme } from "@/lib/site-schema";
import { getDesignsForIndustry } from "./designs";

export * from "./designs";

type Template = {
  subtitle: string;
  ctaLabel: string;
  // {n}은 상호로 바뀐다.
  about: string;
  listTitle: string;
  items: ListItem[];
  infoTitle: string;
};

const TEMPLATES: Record<Industry, Template> = {
  food: {
    subtitle: "매일 아침 장 본 재료로 차리는 정갈한 한 끼",
    ctaLabel: "예약·문의하기",
    about:
      "{n}에서는 반찬을 매일 아침 직접 만들고, 찌개 육수는 하루 전에 미리 우려 둡니다. 동네에서 편하게 들르는 밥집이 되고 싶습니다.",
    listTitle: "메뉴",
    items: [
      { name: "된장찌개 정식", description: "직접 담근 된장, 반찬 6가지", price: "9,000원" },
      { name: "제육볶음 정식", description: "국내산 앞다리살, 쌈 채소", price: "10,000원" },
      { name: "계절 나물 비빔밥", description: "그날 들어온 나물 5가지", price: "9,500원" },
    ],
    infoTitle: "영업 안내",
  },
  beauty: {
    subtitle: "손질이 쉬운 머리, 오래 가는 스타일",
    ctaLabel: "예약 문의하기",
    about:
      "{n}에서는 상담부터 마무리까지 한 디자이너가 맡습니다. 모발 상태를 먼저 살핀 뒤, 집에서도 손질하기 쉬운 스타일을 제안합니다.",
    listTitle: "시술 메뉴",
    items: [
      { name: "디자인 컷", description: "샴푸·드라이 포함", price: "25,000원" },
      { name: "클리닉 펌", description: "손상 케어 포함", price: "80,000원부터" },
      { name: "뿌리 염색", description: "두피 보호제 사용", price: "45,000원" },
    ],
    infoTitle: "영업 안내",
  },
  stay: {
    subtitle: "숲과 맞닿은 조용한 독채 스테이",
    ctaLabel: "예약 문의하기",
    about:
      "{n}에서는 하루 세 팀만 받습니다. 객실마다 작은 마당이 있어 다른 손님과 마주칠 일이 거의 없습니다.",
    listTitle: "객실 안내",
    items: [
      { name: "스탠다드", description: "2인 기준, 최대 3인", price: "120,000원부터" },
      { name: "패밀리", description: "4인 기준, 침실 2개", price: "180,000원부터" },
      { name: "독채", description: "6인 기준, 바비큐장 포함", price: "260,000원부터" },
    ],
    infoTitle: "이용 안내",
  },
  pro: {
    subtitle: "복잡한 세무, 처음부터 끝까지 한 사람이 맡습니다",
    ctaLabel: "상담 신청하기",
    about:
      "{n}에서는 상담한 세무사가 신고까지 직접 맡습니다. 업종별 경험을 바탕으로 놓치기 쉬운 공제 항목을 꼼꼼히 챙깁니다.",
    listTitle: "서비스",
    items: [
      { name: "첫 상담", description: "30분, 방문 또는 전화", price: "무료" },
      { name: "종합소득세 신고", description: "개인사업자", price: "150,000원부터" },
      { name: "기장 대행", description: "월별 장부 관리", price: "월 100,000원부터" },
    ],
    infoTitle: "상담 안내",
  },
};

// 업종의 첫 번째 디자인이 기본 디자인이다.
export function getTemplateTheme(industry: Industry): Theme {
  return { ...getDesignsForIndustry(industry)[0].theme };
}

// 업종 기본 초안. 가게 정보(business)는 온보딩에서 사장님이 입력하므로 비워 둔다.
export function getTemplateContent(industry: Industry, siteName: string): SiteContent {
  const t = TEMPLATES[industry];
  return {
    sections: [
      { id: "hero", type: "hero", visible: true, title: siteName, subtitle: t.subtitle, ctaLabel: t.ctaLabel },
      { id: "about", type: "about", visible: true, title: "우리 이야기", body: t.about.replaceAll("{n}", siteName) },
      { id: "list", type: "list", visible: true, title: t.listTitle, items: t.items.map((item) => ({ ...item })) },
      { id: "info", type: "info", visible: true, title: t.infoTitle },
      { id: "contact", type: "contact", visible: true, title: "문의하기" },
    ],
    theme: getTemplateTheme(industry),
    business: {},
  };
}
