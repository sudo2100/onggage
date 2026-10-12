// 요금제 정의 — 가격·제한·화면 문구의 단일 기준.
// 요금 안내 화면과 랜딩 요금 요약이 여기서 읽고, 나중에 결제·제한 기능도 같은 값을 쓴다.
// id는 DB의 subscription_plan enum과 같다.

export type PlanId = "free" | "basic" | "pro";

export type Plan = {
  id: PlanId;
  name: string;
  // 원 단위
  priceMonthly: number;
  priceYearly: number;
  limits: {
    photos: number;
    // 월 횟수. null = 무제한 (내부 상한은 2단계 AI 작업에서 정한다)
    aiAssistPerMonth: number | null;
  };
  features: {
    address: string;
    // 공개 사이트 하단 "온가게로 만든 홈페이지" 표시 여부
    footerLogo: boolean;
    inquiryAlert: string;
    reservationStats: string;
  };
  // 랜딩 요금 요약에 쓰는 한 줄 설명
  summary: string;
};

export const PLANS: readonly Plan[] = [
  {
    id: "free",
    name: "무료",
    priceMonthly: 0,
    priceYearly: 0,
    limits: { photos: 20, aiAssistPerMonth: 10 },
    features: { address: "서브도메인", footerLogo: true, inquiryAlert: "이메일", reservationStats: "없음" },
    summary: "서브도메인으로 바로 공개",
  },
  {
    id: "basic",
    name: "베이직",
    priceMonthly: 6900,
    priceYearly: 69000,
    limits: { photos: 60, aiAssistPerMonth: 100 },
    features: {
      address: "서브도메인",
      footerLogo: false,
      inquiryAlert: "이메일 + 알림톡",
      reservationStats: "기본 통계",
    },
    summary: "하단 로고 없이, 알림톡으로 문의 알림",
  },
  {
    id: "pro",
    name: "프로",
    priceMonthly: 13900,
    priceYearly: 139000,
    limits: { photos: 200, aiAssistPerMonth: null },
    features: {
      address: "맞춤 도메인 + SSL",
      footerLogo: false,
      inquiryAlert: "이메일 + 알림톡",
      reservationStats: "예약 + 상세 통계",
    },
    summary: "내 도메인 연결, 예약과 상세 통계",
  },
];

export function getPlan(id: PlanId): Plan {
  const plan = PLANS.find((p) => p.id === id);
  if (!plan) throw new Error(`알 수 없는 요금제: ${id}`);
  return plan;
}

export function formatWon(amount: number): string {
  return `${amount.toLocaleString("ko-KR")}원`;
}

export function formatAiAssist(perMonth: number | null): string {
  return perMonth === null ? "무제한" : `월 ${perMonth.toLocaleString("ko-KR")}회`;
}

// 요금 비교표의 행. 화면과 테스트가 같은 정의를 쓴다.
export const PLAN_TABLE_ROWS: readonly { label: string; value: (plan: Plan) => string }[] = [
  { label: "월 요금", value: (p) => formatWon(p.priceMonthly) },
  { label: "연 요금", value: (p) => formatWon(p.priceYearly) },
  { label: "공개 주소", value: (p) => p.features.address },
  { label: "하단 로고", value: (p) => (p.features.footerLogo ? "표시" : "없음") },
  { label: "사진", value: (p) => `${p.limits.photos.toLocaleString("ko-KR")}장` },
  { label: "문의 알림", value: (p) => p.features.inquiryAlert },
  { label: "예약 · 방문 통계", value: (p) => p.features.reservationStats },
  { label: "AI 도우미", value: (p) => formatAiAssist(p.limits.aiAssistPerMonth) },
];
