"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { agreementFormSchema, agreementMetadata, TERMS_VERSION } from "@/lib/agreement";
import { getCurrentUser } from "@/lib/auth";
import {
  authErrorMessage,
  firstIssue,
  forgotPasswordSchema,
  formValues,
  loginSchema,
  oauthProviderSchema,
  resetPasswordSchema,
  signupSchema,
  type AuthFormState,
} from "@/lib/auth-forms";
import { PENDING_AGREEMENT_COOKIE } from "@/lib/auth-callback";
import { safeNext, withNext } from "@/lib/safe-next";
import { getSiteUrl } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";

// 메일 링크·소셜 로그인이 돌아올 주소. next는 여기서도 safeNext를 거친 값만 싣는다.
function callbackUrl(next: string, flow?: "recovery"): string {
  const params = new URLSearchParams({ next });
  if (flow) params.set("flow", flow);
  return `${getSiteUrl()}/auth/callback?${params.toString()}`;
}

function checkedState(values: Record<string, string>) {
  return { terms: values.terms === "on", privacy: values.privacy === "on", age14: values.age14 === "on" };
}

// 가입 화면의 폼 하나가 이메일 가입과 소셜 버튼(provider 값이 붙음)을 함께 보낸다.
export async function signUpWithEmail(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = formValues(formData);
  if (values.provider) return startOAuth(values, "signup");
  const next = safeNext(values.next);
  const parsed = signupSchema.safeParse(values);
  if (!parsed.success) {
    return { error: firstIssue(parsed.error), email: values.email, checked: checkedState(values) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: callbackUrl(next),
      // 인증 메일을 켜면 지금은 세션이 없다. 동의 정보는 트리거가 profiles로 옮긴다.
      data: agreementMetadata(),
    },
  });
  if (error) {
    return { error: authErrorMessage(error.code), email: values.email, checked: checkedState(values) };
  }

  // 인증 메일이 꺼져 있으면(로컬) 바로 로그인된 상태다.
  if (data.session) redirect(next);
  redirect("/signup/check-email");
}

export async function signInWithEmail(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = formValues(formData);
  if (values.provider) return startOAuth(values, "login");
  const next = safeNext(values.next);
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) return { error: firstIssue(parsed.error), email: values.email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: authErrorMessage(error.code), email: values.email };

  // 동의 기록 확인은 도착한 화면의 requireUser()가 한다.
  redirect(next);
}

// 카카오·구글 로그인 시작. 가입 화면에서 누르면 동의 체크를 먼저 확인하고,
// 콜백에서 기록할 수 있게 10분짜리 쿠키에 약관 버전을 남긴다.
async function startOAuth(values: Record<string, string>, intent: "signup" | "login"): Promise<AuthFormState> {
  const next = safeNext(values.next);
  const provider = oauthProviderSchema.safeParse(values.provider);
  if (!provider.success) return { error: "지원하지 않는 로그인 방법이에요." };

  if (intent === "signup") {
    const agreement = agreementFormSchema.safeParse(values);
    if (!agreement.success) {
      return { error: firstIssue(agreement.error), email: values.email, checked: checkedState(values) };
    }
    (await cookies()).set(PENDING_AGREEMENT_COOKIE, TERMS_VERSION, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/auth/callback",
      maxAge: 600,
    });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider.data,
    options: { redirectTo: callbackUrl(next) },
  });
  if (error || !data.url) return { error: authErrorMessage(error?.code) };
  redirect(data.url);
}

// 소셜 로그인 사용자, 동의 기록이 없거나 약관 버전이 바뀐 사용자가 동의하는 화면.
export async function agreeToTerms(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = formValues(formData);
  const next = safeNext(values.next);
  const user = await getCurrentUser();
  // 다시 로그인하면 next의 requireUser()가 이 화면으로 돌려보낸다.
  if (!user) redirect(withNext("/login", next));

  const parsed = agreementFormSchema.safeParse(values);
  if (!parsed.success) return { error: firstIssue(parsed.error), checked: checkedState(values) };

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_signup_agreement", { agreed_version: TERMS_VERSION });
  if (error) return { error: authErrorMessage(undefined), checked: checkedState(values) };
  redirect(next);
}

// 가입 여부와 상관없이 같은 결과를 보여 준다 (가입된 이메일인지 알려 주지 않는다).
export async function requestPasswordReset(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = formValues(formData);
  const next = safeNext(values.next);
  const parsed = forgotPasswordSchema.safeParse(values);
  if (!parsed.success) return { error: firstIssue(parsed.error), email: values.email };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: callbackUrl(next, "recovery"),
  });
  if (error?.code === "over_email_send_rate_limit" || error?.code === "over_request_rate_limit") {
    return { error: authErrorMessage(error.code), email: values.email };
  }
  return { done: true, email: parsed.data.email };
}

// 재설정 메일 링크로 로그인된 상태에서 새 비밀번호를 정한다.
export async function updatePassword(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = formValues(formData);
  const next = safeNext(values.next);
  const user = await getCurrentUser();
  if (!user) redirect("/forgot-password?error=expired");

  const parsed = resetPasswordSchema.safeParse(values);
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: authErrorMessage(error.code) };
  redirect(next);
}

// 로그아웃은 Server Action(POST)으로만 한다. 링크(GET)나 이미지 태그로는 로그아웃되지 않는다.
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
