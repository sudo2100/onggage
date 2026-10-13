// 상호에서 서브도메인(slug)을 제안한다. 예: "담소 식당" → "damso-sikdang"
// 실제 slug는 DB 함수 create_site_with_draft가 정한다: 겹치거나 예약어면 -2, -3…을 붙인다.
import type { Industry } from "./site-schema";

// sites.slug 형식(마이그레이션 sites_slug_format과 같음): 3~30자, 소문자·숫자·하이픈, 하이픈으로 시작·끝나지 않음.
export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;
const MAX_SLUG_LENGTH = 30;

// 예약어의 기준은 DB 함수 public.reserved_slugs()다 (slug 제약과 publish_site가 함께 쓴다).
// 화면의 예상 주소 안내에 쓰려고 같은 목록을 둔다. 가장 최근 마이그레이션의 목록과 같은지 slug.test.ts가 확인한다.
export const RESERVED_SLUGS: readonly string[] = [
  "www", "api", "app", "mail", "smtp", "imap", "pop", "ftp", "cdn", "static", "assets",
  "img", "media", "files", "dev", "staging", "status", "ns1", "ns2",
  "admin", "studio", "start", "login", "signup", "auth", "sites", "designs", "pricing",
  "help", "support", "blog", "docs", "dashboard", "billing", "onggage",
];

// 국어의 로마자 표기법(음절 단위, 소리 나는 대로 바꾸는 규칙은 적용하지 않음).
const INITIALS = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"];
const MEDIALS = [
  "a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo",
  "u", "wo", "we", "wi", "yu", "eu", "ui", "i",
];
const FINALS = [
  "", "k", "k", "k", "n", "n", "n", "t", "l", "k", "m", "l", "l", "l", "p", "l",
  "m", "p", "p", "t", "t", "ng", "t", "t", "k", "t", "p", "t",
];
const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;

export function romanizeHangul(text: string): string {
  let result = "";
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code < HANGUL_START || code > HANGUL_END) {
      result += char;
      continue;
    }
    const index = code - HANGUL_START;
    result += INITIALS[Math.floor(index / 588)] + MEDIALS[Math.floor((index % 588) / 28)] + FINALS[index % 28];
  }
  return result;
}

// 로마자로 바꾼 뒤 소문자·숫자 외의 글자는 하이픈으로 바꾸고, 30자로 자른다.
export function slugify(name: string): string {
  return romanizeHangul(name)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, "");
}

// 상호로 만든 slug가 너무 짧거나 비면 업종 이름을 붙이거나 쓴다.
export function suggestSlug(name: string, industry: Industry): string {
  const base = slugify(name);
  if (base.length >= 3) return base;
  return base ? `${base}-${industry}` : industry;
}

// 화면 안내용 예상 주소. 예약어면 DB와 같은 규칙으로 -2를 붙여 보여 준다 (다른 사람과 겹치는지는 만들 때 정해진다).
export function previewSlug(name: string, industry: Industry): string {
  const slug = suggestSlug(name, industry);
  return RESERVED_SLUGS.includes(slug) ? `${slug}-2` : slug;
}
