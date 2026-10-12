// 로그인·가입·메일 링크가 끝난 뒤 이동할 주소(next)를 검사한다.
// 우리 사이트 안의 경로만 통과시키고, 나머지는 기본값으로 바꾼다 (외부 주소로 보내지 않는다).
// proxy, Server Action, /auth/callback이 모두 이 함수 하나를 거친다.

export const DEFAULT_NEXT = "/start";
const MAX_NEXT_LENGTH = 2048;

// 해석 기준으로만 쓰는 가짜 출처. 결과에서 출처가 바뀌면 외부 주소다.
const BASE_ORIGIN = "http://next.invalid";

// 다시 돌아오면 고리가 생기거나 의미가 없는 경로.
const BLOCKED_PREFIXES = ["/login", "/signup", "/auth", "/forgot-password", "/reset-password"];

export function safeNext(raw: unknown, fallback: string = DEFAULT_NEXT): string {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > MAX_NEXT_LENGTH) return fallback;
  // "/"로 시작해야 하고, "//host"(프로토콜 상대 주소)는 안 된다.
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;
  // 제어문자(탭·줄바꿈 등)와 역슬래시: 브라우저가 지우거나 "/"로 바꿔 "//host"가 될 수 있다.
  if (/[\u0000-\u001f\u007f\\]/.test(raw)) return fallback;

  let url: URL;
  try {
    url = new URL(raw, BASE_ORIGIN);
  } catch {
    return fallback;
  }
  if (url.origin !== BASE_ORIGIN) return fallback;

  const { pathname } = url;
  if (BLOCKED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return fallback;
  }
  return `${pathname}${url.search}`;
}

// /login?next=… 처럼 next를 실어 보내는 주소. next가 기본값이면 붙이지 않는다.
export function withNext(path: string, next: string): string {
  if (next === DEFAULT_NEXT) return path;
  return `${path}?${new URLSearchParams({ next }).toString()}`;
}
