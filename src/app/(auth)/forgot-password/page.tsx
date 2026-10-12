import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forms";
import { safeNext, withNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: "비밀번호 찾기", robots: { index: false } };

export const instant = false;

export default async function ForgotPasswordPage({ searchParams }: PageProps<"/forgot-password">) {
  const { next: rawNext, error } = await searchParams;
  const next = safeNext(rawNext);
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">비밀번호 찾기</h1>
      <p className="mt-1 mb-6 text-sm text-app-muted">가입한 이메일로 비밀번호 재설정 링크를 보내 드려요.</p>
      <ForgotPasswordForm
        next={next}
        notice={error === "expired" ? "재설정 링크가 만료되었거나 이미 사용되었어요. 메일을 다시 받아 주세요." : undefined}
      />
      <Link href={withNext("/login", next)} className="mt-6 inline-block text-sm text-app-muted underline underline-offset-4">
        로그인 화면으로
      </Link>
    </>
  );
}
