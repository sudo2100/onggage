// 공개 사이트에서 가게 정보·사진을 링크로 바꾸는 함수들.
import { KAKAO_LINK_PATTERN, type Business } from "@/lib/site-schema";

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^0-9]/g, "")}`;
}

// 네이버 지도 길찾기: 주소로 검색한다.
export function mapHref(address: string): string {
  return `https://map.naver.com/p/search/${encodeURIComponent(address)}`;
}

// 채널·오픈채팅 링크일 때만 링크를 돌려준다. @아이디는 글자로만 보여 준다.
export function kakaoHref(kakao: string): string | undefined {
  return KAKAO_LINK_PATTERN.test(kakao) ? kakao : undefined;
}

export function kakaoLabel(kakao: string): string {
  if (!kakaoHref(kakao)) return kakao;
  return kakao.startsWith("https://open.kakao.com/") ? "카카오톡 오픈채팅" : "카카오톡 채널";
}

// Storage site-assets 버킷의 공개 주소. Supabase 주소가 없으면 undefined (사진 대신 색 배경).
export function assetUrl(path: string): string | undefined {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return undefined;
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/site-assets/${path}`;
}

export type QuickAction = { kind: "phone" | "kakao" | "map"; label: string; href: string };

// 하단 고정 버튼. 값이 없는 항목은 뺀다.
export function getQuickActions(business: Business): QuickAction[] {
  const actions: QuickAction[] = [];
  if (business.phone) actions.push({ kind: "phone", label: "전화", href: telHref(business.phone) });
  const kakao = business.kakao && kakaoHref(business.kakao);
  if (kakao) actions.push({ kind: "kakao", label: "카카오톡", href: kakao });
  if (business.address) actions.push({ kind: "map", label: "길찾기", href: mapHref(business.address) });
  return actions;
}
