"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  agreeToTerms,
  requestPasswordReset,
  signInWithEmail,
  signUpWithEmail,
  updatePassword,
} from "@/app/(auth)/actions";
import { MIN_PASSWORD_LENGTH, type AuthFormState } from "@/lib/auth-forms";
import { withNext } from "@/lib/safe-next";
import { AgreementFields, Divider, FormError, SocialButtons, SubmitButton, TextField } from "./fields";

const initial: AuthFormState = {};

export function LoginForm({ next, notice }: { next: string; notice?: string }) {
  const [state, action] = useActionState(signInWithEmail, initial);
  return (
    <div className="grid gap-5">
      <FormError message={state.error ?? notice} />
      <form className="grid gap-2">
        <input type="hidden" name="next" value={next} />
        <SocialButtons formAction={action} />
      </form>
      <Divider>또는 이메일로 로그인</Divider>
      <form action={action} className="grid gap-3.5">
        <input type="hidden" name="next" value={next} />
        <TextField label="이메일" name="email" type="email" autoComplete="email" required defaultValue={state.email} />
        <TextField label="비밀번호" name="password" type="password" autoComplete="current-password" required />
        <SubmitButton>로그인</SubmitButton>
      </form>
      <div className="flex flex-wrap justify-between gap-2 text-sm text-app-muted">
        <Link href={withNext("/forgot-password", next)} className="underline underline-offset-4">
          비밀번호를 잊었어요
        </Link>
        <Link href={withNext("/signup", next)} className="font-semibold text-app-accent underline underline-offset-4">
          처음이신가요? 무료로 가입하기
        </Link>
      </div>
    </div>
  );
}

export function SignupForm({ next }: { next: string }) {
  const [state, action] = useActionState(signUpWithEmail, initial);
  return (
    <div className="grid gap-5">
      <FormError message={state.error} />
      <form action={action} className="grid gap-3.5">
        <input type="hidden" name="next" value={next} />
        <TextField label="이메일" name="email" type="email" autoComplete="email" required defaultValue={state.email} />
        <TextField
          label={`비밀번호 (${MIN_PASSWORD_LENGTH}자 이상)`}
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          required
        />
        <AgreementFields checked={state.checked} />
        <SubmitButton>이메일로 가입하기</SubmitButton>
        <Divider>또는 간편 가입 (위 동의 항목 체크 후)</Divider>
        <SocialButtons formAction={action} />
      </form>
      <p className="text-sm text-app-muted">
        이미 가입하셨나요?{" "}
        <Link href={withNext("/login", next)} className="font-semibold text-app-accent underline underline-offset-4">
          로그인
        </Link>
      </p>
    </div>
  );
}

export function AgreeForm({ next }: { next: string }) {
  const [state, action] = useActionState(agreeToTerms, initial);
  return (
    <form action={action} className="grid gap-3.5">
      <FormError message={state.error} />
      <input type="hidden" name="next" value={next} />
      <AgreementFields checked={state.checked} />
      <SubmitButton>동의하고 계속하기</SubmitButton>
    </form>
  );
}

export function ForgotPasswordForm({ next, notice }: { next: string; notice?: string }) {
  const [state, action] = useActionState(requestPasswordReset, initial);
  if (state.done) {
    return (
      <p role="status" className="rounded-lg bg-app-soft px-3 py-3 text-sm">
        {state.email}(으)로 가입된 계정이 있으면 비밀번호 재설정 메일을 보냈어요. 메일의 링크를 눌러 새 비밀번호를
        정해 주세요. 메일이 보이지 않으면 스팸함도 확인해 주세요.
      </p>
    );
  }
  return (
    <form action={action} className="grid gap-3.5">
      <FormError message={state.error ?? notice} />
      <input type="hidden" name="next" value={next} />
      <TextField label="가입한 이메일" name="email" type="email" autoComplete="email" required defaultValue={state.email} />
      <SubmitButton>재설정 메일 보내기</SubmitButton>
    </form>
  );
}

export function ResetPasswordForm({ next }: { next: string }) {
  const [state, action] = useActionState(updatePassword, initial);
  return (
    <form action={action} className="grid gap-3.5">
      <FormError message={state.error} />
      <input type="hidden" name="next" value={next} />
      <TextField
        label={`새 비밀번호 (${MIN_PASSWORD_LENGTH}자 이상)`}
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={MIN_PASSWORD_LENGTH}
        required
      />
      <TextField label="새 비밀번호 확인" name="passwordConfirm" type="password" autoComplete="new-password" required />
      <SubmitButton>비밀번호 바꾸기</SubmitButton>
    </form>
  );
}
