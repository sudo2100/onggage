import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/forms";
import { safeNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: "무료로 가입하기", robots: { index: false } };

// 디자인 상세의 "이 디자인으로 시작"이 /signup?next=/start?design=…&name=… 로 들어온다.
export const instant = false;

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const { next } = await searchParams;
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">무료로 가입하기</h1>
      <p className="mt-1 mb-6 text-sm text-app-muted">가입하면 고른 디자인으로 바로 홈페이지 만들기를 시작해요.</p>
      <SignupForm next={safeNext(next)} />
    </>
  );
}
