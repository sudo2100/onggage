import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ResetPasswordForm } from "@/components/auth/forms";
import { getCurrentUser } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: "새 비밀번호 정하기", robots: { index: false } };

// 재설정 메일 링크(/auth/callback)를 거쳐 로그인된 상태로 온다.
export const instant = false;

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const next = safeNext((await searchParams).next);
  if (!(await getCurrentUser())) redirect("/forgot-password?error=expired");

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">새 비밀번호 정하기</h1>
      <p className="mt-1 mb-6 text-sm text-app-muted">앞으로 로그인할 때 쓸 비밀번호를 정해 주세요.</p>
      <ResetPasswordForm next={next} />
    </>
  );
}
