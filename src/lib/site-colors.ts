// 공개 사이트 색 — theme.accent 하나에서 배경·글자·버튼 색을 계산한다.
// 대비 기준은 WCAG 2.x 상대 휘도 공식을 따른다.

type Rgb = readonly [number, number, number];

const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];
const NEAR_BLACK: Rgb = [24, 24, 24];

// 본문 크기 글자의 최소 대비 (WCAG AA)
export const MIN_TEXT_CONTRAST = 4.5;

export type SiteColors = {
  accent: string;
  // accent 배경 위 글자 (버튼 등): 흰색·검정 중 대비가 높은 쪽
  onAccent: string;
  // accent를 글자색으로 쓸 때 (가격, 작은 머리글): 배경 대비 4.5:1 이상이 되도록 어둡게 보정한 값
  accentText: string;
  bg: string;
  // 번갈아 쓰는 섹션 배경. bg보다 조금 진하다.
  altBg: string;
  ink: string;
};

function hexToRgb(hex: string): Rgb {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function rgbToHex(rgb: Rgb): string {
  return `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

// base에 over를 amount(0~1)만큼 섞는다.
function mix(base: Rgb, over: Rgb, amount: number): Rgb {
  return [0, 1, 2].map((i) => base[i] + (over[i] - base[i]) * amount) as unknown as Rgb;
}

function luminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map((c) => {
    const s = Math.round(c) / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(hexToRgb(a));
  const lb = luminance(hexToRgb(b));
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export function getSiteColors(accentHex: string): SiteColors {
  const accent = hexToRgb(accentHex);
  const bg = rgbToHex(mix(WHITE, accent, 0.04));
  const altBg = rgbToHex(mix(WHITE, accent, 0.1));
  const ink = rgbToHex(mix(NEAR_BLACK, accent, 0.15));

  const onAccent =
    contrastRatio(accentHex, rgbToHex(WHITE)) >= contrastRatio(accentHex, rgbToHex(BLACK)) ? "#FFFFFF" : "#000000";

  // altBg가 bg보다 진하므로 altBg 기준으로 맞추면 두 배경 모두에서 기준을 넘는다.
  let accentText = accent;
  for (let i = 0; i < 40 && contrastRatio(rgbToHex(accentText), altBg) < MIN_TEXT_CONTRAST; i++) {
    accentText = mix(accentText, BLACK, 0.06);
  }

  return { accent: rgbToHex(accent), onAccent, accentText: rgbToHex(accentText), bg, altBg, ink };
}
