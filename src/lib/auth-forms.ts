// 가입·로그인·비밀번호 폼의 입력 검사와 Supabase 오류 → 안내 문구 변환. 서버에서 다시 검사한다.
import { z } from "zod";
import { agreementFormSchema } from "./agreement";

export const MIN_PASSWORD_LENGTH = 8;
// bcrypt가 72바이트까지만 쓰므로 그보다 길게 받지 않는다.
const MAX_PASSWORD_LENGTH = 72;

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "이메일 주소를 확인해 주세요." }).max(254, { error: "이메일 주소를 확인해 주세요." }));

const newPassword = z
  .string()
  .min(MIN_PASSWORD_LENGTH, { error: `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상으로 정해 주세요.` })
  .max(MAX_PASSWORD_LENGTH, { error: `비밀번호는 ${MAX_PASSWORD_LENGTH}자 이하로 정해 주세요.` });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, { error: "비밀번호를 입력해 주세요." }).max(MAX_PASSWORD_LENGTH),
});

export const signupSchema = agreementFormSchema.extend({ email, password: newPassword });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ password: newPassword, passwordConfirm: z.string() })
  .refine((value) => value.password === value.passwordConfirm, {
    error: "두 비밀번호가 서로 달라요.",
    path: ["passwordConfirm"],
  });

export const oauthProviderSchema = z.enum(["kakao", "google"]);
export type OAuthProvider = z.infer<typeof oauthProviderSchema>;

// FormData를 문자열 값만 담은 객체로 바꾼다 (파일 값은 버린다).
export function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  formData.forEach((value, key) => {
    if (typeof value === "string") values[key] = value;
  });
  return values;
}

// 검사 실패 시 첫 번째 문구만 보여 준다.
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "입력한 내용을 확인해 주세요.";
}

// Supabase Auth 오류 코드 → 사용자 안내. 모르는 코드는 일반 문구로 돌린다.
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "이메일 또는 비밀번호가 맞지 않아요.",
  email_not_confirmed: "아직 메일 인증을 마치지 않았어요. 받은 편지함에서 인증 메일을 열어 주세요.",
  user_already_exists: "이미 가입된 이메일이에요. 로그인해 주세요.",
  email_exists: "이미 가입된 이메일이에요. 로그인해 주세요.",
  weak_password: "비밀번호가 너무 쉬워요. 다른 비밀번호로 정해 주세요.",
  same_password: "지금 쓰는 비밀번호와 다른 비밀번호로 정해 주세요.",
  over_email_send_rate_limit: "메일을 너무 자주 보냈어요. 잠시 후 다시 시도해 주세요.",
  over_request_rate_limit: "요청이 너무 많아요. 잠시 후 다시 시도해 주세요.",
  signup_disabled: "지금은 가입을 받지 않고 있어요.",
};

export function authErrorMessage(code: string | undefined): string {
  return (code && AUTH_ERROR_MESSAGES[code]) || "잠시 문제가 생겼어요. 다시 시도해 주세요.";
}

// 폼 화면이 받는 결과. 오류일 때 입력한 이메일과 체크 상태를 되돌려 준다.
export type AuthFormState = {
  error?: string;
  email?: string;
  checked?: { terms: boolean; privacy: boolean; age14: boolean };
  done?: boolean;
};
