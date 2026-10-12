// 업종별 템플릿 정의와 기본 섹션.
// 말투(차분한·따뜻한·산뜻한)마다 대표 화면 부제·버튼·소개 글이 다르다. 차분한 말투가 클릭 프로토타입의 기본 문구다.
// AI 생성(2단계) 전까지 온보딩이 만드는 초안은 이 문구를 쓴다.
import type { Industry, ListItem, SiteContent, Theme, Tone } from "@/lib/site-schema";
import { getDesignsForIndustry } from "./designs";

export * from "./designs";

export const TONE_LABELS: Record<Tone, string> = {
  calm: "차분한",
  warm: "따뜻한",
  fresh: "산뜻한",
};

export const DEFAULT_TONE: Tone = "calm";

type ToneCopy = {
  subtitle: string;
  ctaLabel: string;
  // {n}은 상호로 바뀐다.
  about: string;
};

type Template = {
  tones: Record<Tone, ToneCopy>;
  listTitle: string;
  items: ListItem[];
  infoTitle: string;
};

const TEMPLATES: Record<Industry, Template> = {
  food: {
    tones: {
      calm: {
        subtitle: "매일 아침 장 본 재료로 차리는 정갈한 한 끼",
        ctaLabel: "예약·문의하기",
        about:
          "{n}에서는 반찬을 매일 아침 직접 만들고, 찌개 육수는 하루 전에 미리 우려 둡니다. 동네에서 편하게 들르는 밥집이 되고 싶습니다.",
      },
      warm: {
        subtitle: "집밥처럼 편안한 한 끼, 언제든 들러 주세요",
        ctaLabel: "편하게 문의하기",
        about:
          "{n}은 동네 이웃분들이 편하게 들러 밥 한 끼 하고 가는 곳이에요. 반찬은 매일 아침 직접 만들고, 찌개 육수는 하루 전에 정성껏 우려 둡니다. 든든하게 드시고 가세요.",
      },
      fresh: {
        subtitle: "오늘 들어온 재료로, 오늘 만든 한 그릇",
        ctaLabel: "지금 예약하기",
        about:
          "{n}의 메뉴는 그날 들어온 재료로 정해요. 반찬은 아침마다 새로 만들고, 육수는 하루 전에 미리 우려 둡니다. 가볍게 들러 맛있게 드시고 가세요!",
      },
    },
    listTitle: "메뉴",
    items: [
      { name: "된장찌개 정식", description: "직접 담근 된장, 반찬 6가지", price: "9,000원" },
      { name: "제육볶음 정식", description: "국내산 앞다리살, 쌈 채소", price: "10,000원" },
      { name: "계절 나물 비빔밥", description: "그날 들어온 나물 5가지", price: "9,500원" },
    ],
    infoTitle: "영업 안내",
  },
  beauty: {
    tones: {
      calm: {
        subtitle: "손질이 쉬운 머리, 오래 가는 스타일",
        ctaLabel: "예약 문의하기",
        about:
          "{n}에서는 상담부터 마무리까지 한 디자이너가 맡습니다. 모발 상태를 먼저 살핀 뒤, 집에서도 손질하기 쉬운 스타일을 제안합니다.",
      },
      warm: {
        subtitle: "편하게 이야기 나누며 찾는 나에게 맞는 스타일",
        ctaLabel: "편하게 상담하기",
        about:
          "{n}에서는 상담부터 마무리까지 한 디자이너가 곁에서 함께해요. 고민을 충분히 듣고 모발 상태를 살핀 뒤, 집에서도 손질하기 쉬운 스타일을 같이 찾아 드립니다.",
      },
      fresh: {
        subtitle: "오늘, 기분 좋게 바뀌는 스타일",
        ctaLabel: "바로 예약하기",
        about:
          "{n}은 상담부터 마무리까지 한 디자이너가 책임져요. 모발 상태를 꼼꼼히 확인하고, 아침마다 손질하기 쉬운 스타일로 가볍게 바꿔 드립니다.",
      },
    },
    listTitle: "시술 메뉴",
    items: [
      { name: "디자인 컷", description: "샴푸·드라이 포함", price: "25,000원" },
      { name: "클리닉 펌", description: "손상 케어 포함", price: "80,000원부터" },
      { name: "뿌리 염색", description: "두피 보호제 사용", price: "45,000원" },
    ],
    infoTitle: "영업 안내",
  },
  stay: {
    tones: {
      calm: {
        subtitle: "숲과 맞닿은 조용한 독채 스테이",
        ctaLabel: "예약 문의하기",
        about:
          "{n}에서는 하루 세 팀만 받습니다. 객실마다 작은 마당이 있어 다른 손님과 마주칠 일이 거의 없습니다.",
      },
      warm: {
        subtitle: "우리 집처럼 편히 쉬어 가는 숲속 스테이",
        ctaLabel: "편하게 문의하기",
        about:
          "{n}은 하루 세 팀만 모십니다. 객실마다 작은 마당이 있어 가족, 친구와 오붓하게 쉬어 가실 수 있어요. 편안한 하루가 되도록 정성껏 준비해 두겠습니다.",
      },
      fresh: {
        subtitle: "숲으로 떠나는 가벼운 하루",
        ctaLabel: "지금 예약하기",
        about:
          "{n}은 하루 딱 세 팀만 받아요. 객실마다 작은 마당이 있어서 다른 손님 신경 쓰지 않고 마음껏 쉬다 가실 수 있습니다.",
      },
    },
    listTitle: "객실 안내",
    items: [
      { name: "스탠다드", description: "2인 기준, 최대 3인", price: "120,000원부터" },
      { name: "패밀리", description: "4인 기준, 침실 2개", price: "180,000원부터" },
      { name: "독채", description: "6인 기준, 바비큐장 포함", price: "260,000원부터" },
    ],
    infoTitle: "이용 안내",
  },
  pro: {
    tones: {
      calm: {
        subtitle: "복잡한 세무, 처음부터 끝까지 한 사람이 맡습니다",
        ctaLabel: "상담 신청하기",
        about:
          "{n}에서는 상담한 세무사가 신고까지 직접 맡습니다. 업종별 경험을 바탕으로 놓치기 쉬운 공제 항목을 꼼꼼히 챙깁니다.",
      },
      warm: {
        subtitle: "어려운 세무, 옆에서 차근차근 함께합니다",
        ctaLabel: "편하게 상담하기",
        about:
          "{n}에서는 처음 상담한 세무사가 신고까지 끝까지 함께합니다. 어려운 용어 대신 쉬운 말로 설명드리고, 놓치기 쉬운 공제 항목도 꼼꼼히 챙겨 드려요.",
      },
      fresh: {
        subtitle: "세무는 맡기고, 본업에 집중하세요",
        ctaLabel: "무료 상담 받기",
        about:
          "{n}은 상담한 세무사가 신고까지 직접 맡아요. 업종별 경험으로 놓치기 쉬운 공제까지 빠르게 챙기니, 사장님은 본업에만 집중하세요.",
      },
    },
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

// 말투별 대표 문구 (온보딩 3단계 미리보기용).
export function getToneCopy(industry: Industry, tone: Tone, siteName: string): ToneCopy {
  const copy = TEMPLATES[industry].tones[tone];
  return { ...copy, about: copy.about.replaceAll("{n}", siteName) };
}

// 업종 기본 초안. 가게 정보(business)는 온보딩에서 사장님이 입력하므로 비워 둔다.
export function getTemplateContent(industry: Industry, siteName: string, tone: Tone = DEFAULT_TONE): SiteContent {
  const t = TEMPLATES[industry];
  const copy = getToneCopy(industry, tone, siteName);
  return {
    sections: [
      { id: "hero", type: "hero", visible: true, title: siteName, subtitle: copy.subtitle, ctaLabel: copy.ctaLabel },
      { id: "about", type: "about", visible: true, title: "우리 이야기", body: copy.about },
      { id: "list", type: "list", visible: true, title: t.listTitle, items: t.items.map((item) => ({ ...item })) },
      { id: "info", type: "info", visible: true, title: t.infoTitle },
      { id: "contact", type: "contact", visible: true, title: "문의하기" },
    ],
    theme: getTemplateTheme(industry),
    business: {},
  };
}
