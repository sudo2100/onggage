"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import type { ComponentProps, ReactNode } from "react";

// 가입·로그인 화면이 함께 쓰는 입력칸·버튼·안내. 색·글꼴은 앱 자체 디자인(--app-*)만 쓴다.

export function TextField({ label, ...props }: { label: string } & ComponentProps<"input">) {
  return (
    <label className="grid gap-1.5 text-[13px] font-semibold text-app-muted">
      {label}
      <input
        {...props}
        className="rounded-lg border border-app-line bg-app-bg px-3 py-2.5 text-base font-normal text-app-ink outline-none focus:border-app-accent"
      />
    </label>
  );
}

export function SubmitButton({ children, ...props }: { children: ReactNode } & ComponentProps<"button">) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      {...props}
      className="rounded-lg bg-app-accent px-4 py-3 font-semibold text-app-accent-ink disabled:opacity-60"
    >
      {children}
    </button>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg bg-app-soft px-3 py-2.5 text-sm text-app-ink">
      {message}
    </p>
  );
}

const AGREEMENT_ITEMS = [
  { name: "terms", label: "이용약관에 동의합니다", href: "/terms" },
  { name: "privacy", label: "개인정보 처리방침에 동의합니다", href: "/privacy" },
  { name: "age14", label: "만 14세 이상입니다" },
] as const;

// 필수 동의 3개. required로 브라우저에서 먼저 막고, 서버에서 다시 검사한다.
export function AgreementFields({ checked }: { checked?: { terms: boolean; privacy: boolean; age14: boolean } }) {
  return (
    <fieldset className="grid gap-2.5 rounded-lg border border-app-line p-3.5">
      <legend className="px-1 text-[13px] font-semibold text-app-muted">필수 동의</legend>
      {AGREEMENT_ITEMS.map((item) => (
        <div key={item.name} className="flex items-center justify-between gap-3 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name={item.name}
              required
              defaultChecked={checked?.[item.name]}
              className="size-4 accent-app-accent"
            />
            <span>
              (필수) {item.label}
            </span>
          </label>
          {"href" in item ? (
            <Link href={item.href} target="_blank" className="shrink-0 text-app-muted underline underline-offset-4">
              보기
            </Link>
          ) : null}
        </div>
      ))}
    </fieldset>
  );
}

const PROVIDERS = [
  { id: "kakao", label: "카카오로 계속하기", className: "bg-[#FEE500] text-[#191919]" },
  { id: "google", label: "구글로 계속하기", className: "border border-app-line bg-app-surface text-app-ink" },
] as const;

// 소셜 로그인 버튼. formAction으로 감싼 폼의 값(next, 동의 체크)을 함께 보낸다.
// formNoValidate: 이메일·비밀번호 칸이 비어 있어도 눌린다 (동의 체크는 서버에서 검사).
export function SocialButtons({ formAction }: { formAction: (formData: FormData) => void }) {
  return (
    <div className="grid gap-2">
      {PROVIDERS.map((provider) => (
        <button
          key={provider.id}
          type="submit"
          name="provider"
          value={provider.id}
          formAction={formAction}
          formNoValidate
          className={`rounded-lg px-4 py-3 font-semibold ${provider.className}`}
        >
          {provider.label}
        </button>
      ))}
    </div>
  );
}

export function Divider({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-xs text-app-muted">
      <span className="h-px flex-1 bg-app-line" />
      {children}
      <span className="h-px flex-1 bg-app-line" />
    </div>
  );
}
