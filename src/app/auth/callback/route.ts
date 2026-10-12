import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { TERMS_VERSION } from "@/lib/agreement";
import { hasAgreement } from "@/lib/auth";
import {
  callbackDestination,
  callbackFailure,
  parseCallbackParams,
  PENDING_AGREEMENT_COOKIE,
} from "@/lib/auth-callback";
import { createClient } from "@/lib/supabase/server";

// 메일 링크(가입 인증·비밀번호 재설정)와 소셜 로그인이 돌아오는 곳.
// 세션을 만든 뒤, 동의 기록이 없으면 /signup/agree로, 비밀번호 재설정이면 새 비밀번호 화면으로 보낸다.
export async function GET(request: NextRequest) {
  const params = parseCallbackParams(request.nextUrl.searchParams);
  const go = (path: string) => NextResponse.redirect(new URL(path, request.url));

  const supabase = await createClient();
  let failed = true;
  if (params.kind === "token_hash") {
    const { error } = await supabase.auth.verifyOtp({ token_hash: params.tokenHash, type: params.type });
    failed = Boolean(error);
  } else if (params.kind === "code") {
    const { error } = await supabase.auth.exchangeCodeForSession(
      params.code,
      params.flowId ? { flowId: params.flowId } : undefined,
    );
    failed = Boolean(error);
  }
  if (failed) return go(callbackFailure(params));

  const { data } = await supabase.auth.getUser();
  if (!data.user) return go(callbackFailure(params));

  // 가입 화면에서 동의하고 소셜 로그인을 누른 경우, 여기서 기록한다.
  const cookieStore = await cookies();
  const pendingVersion = cookieStore.get(PENDING_AGREEMENT_COOKIE)?.value;
  let agreed = await hasAgreement(data.user.id, supabase);
  if (!agreed && pendingVersion === TERMS_VERSION) {
    const { error } = await supabase.rpc("record_signup_agreement", { agreed_version: TERMS_VERSION });
    agreed = !error;
  }
  if (pendingVersion) cookieStore.delete({ name: PENDING_AGREEMENT_COOKIE, path: "/auth/callback" });

  return go(callbackDestination({ next: params.next, recovery: params.recovery, agreed }));
}
