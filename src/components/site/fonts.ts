// 사이트 제목 글꼴 4종. 모두 preload를 끄고, 사이트 theme에 맞는 글꼴 하나의 class만 붙인다.
// @font-face 선언은 CSS에 함께 들어가지만, 브라우저는 실제로 쓰인 글꼴의 파일만 내려받는다.
// (한글 글꼴은 글자 범위별로 파일이 나뉘어 있어, 페이지에 있는 글자의 범위만 받는다.)
import { Gowun_Batang, Gowun_Dodum, IBM_Plex_Sans_KR, Nanum_Myeongjo } from "next/font/google";
import type { Theme } from "@/lib/site-schema";

const myeongjo = Nanum_Myeongjo({ weight: ["400", "700"], display: "swap", preload: false, variable: "--font-site" });
const batang = Gowun_Batang({ weight: ["400", "700"], display: "swap", preload: false, variable: "--font-site" });
const dodum = Gowun_Dodum({ weight: "400", display: "swap", preload: false, variable: "--font-site" });
const plex = IBM_Plex_Sans_KR({ weight: ["400", "600"], display: "swap", preload: false, variable: "--font-site" });

const SITE_FONTS: Record<Theme["font"], { variable: string }> = { myeongjo, batang, dodum, plex };

// --font-site 변수를 정의하는 class
export function siteFontClass(font: Theme["font"]): string {
  return SITE_FONTS[font].variable;
}
