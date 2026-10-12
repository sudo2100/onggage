// /auth/callback이 받는 값(메일 링크·소셜 로그인)을 해석한다. 요청 없이 테스트할 수 있게 따로 둔다.
import type { EmailOtpType } from "@supabase/supabase-js";
import { DEFAULT_NEXT, safeNext, withNext } from "./safe-next";

// 가입 화면에서 소셜 로그인을 누를 때 동의한 약관 버전을 콜백까지 들고 가는 쿠키.
export const PENDING_AGREEMENT_COOKIE = "onggage_pending_agreement";

const EMAIL_OTP_TYPES = ["signup", "email", "recovery", "email_change", "invite", "magiclink"] as const;

export type CallbackParams =
  | { kind: "token_hash"; tokenHash: string; type: EmailOtpType; next: string; recovery: boolean }
  | { kind: "code"; code: string; flowId?: string; next: string; recovery: boolean }
  // 소셜 로그인을 취소하거나 실패하면 ?error=… 로 돌아온다 (providerError).
  | { kind: "invalid"; next: string; recovery: boolean; providerError: boolean };

// 메일 링크는 두 형태로 온다.
//   - 메일 양식을 바꾼 경우(운영): ?token_hash=…&type=signup|recovery — 다른 기기·브라우저에서 열어도 된다.
//   - 기본 양식(로컬): Supabase가 확인한 뒤 ?code=… 로 보낸다 — 요청한 브라우저에서만 열린다.
// 소셜 로그인도 ?code=… 로 돌아온다.
export function parseCallbackParams(searchParams: URLSearchParams): CallbackParams {
  const next = safeNext(searchParams.get("next"));
  const type = searchParams.get("type");
  const recovery = searchParams.get("flow") === "recovery" || type === "recovery";
  const tokenHash = searchParams.get("token_hash");
  const code = searchParams.get("code");

  if (tokenHash && type && (EMAIL_OTP_TYPES as readonly string[]).includes(type)) {
    return { kind: "token_hash", tokenHash, type: type as EmailOtpType, next, recovery };
  }
  if (code) {
    return { kind: "code", code, flowId: searchParams.get("sb_flow_id") ?? undefined, next, recovery };
  }
  return { kind: "invalid", next, recovery, providerError: searchParams.has("error") };
}

// 확인이 끝난 뒤 보낼 곳.
export function callbackDestination({
  next,
  recovery,
  agreed,
}: {
  next: string;
  recovery: boolean;
  agreed: boolean;
}): string {
  if (recovery) return withNext("/reset-password", next);
  if (!agreed) return withNext("/signup/agree", next);
  return next;
}

// 링크가 만료됐거나 이미 쓰였거나, 소셜 로그인이 취소·실패한 경우.
export function callbackFailure(params: CallbackParams): string {
  const { next, recovery } = params;
  if (recovery) return "/forgot-password?error=expired";
  const search = new URLSearchParams({
    error: params.kind === "invalid" && params.providerError ? "oauth" : "link",
  });
  if (next !== DEFAULT_NEXT) search.set("next", next);
  return `/login?${search.toString()}`;
}
