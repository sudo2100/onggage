import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/forms";
import { safeNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: "로그인", robots: { index: false } };

// next 쿼리를 읽어 서버에서 그린다. 이미 로그인한 사용자는 proxy가 next로 보낸다.
export const instant = false;

const NOTICES: Record<string, string> = {
  link: "메일 링크가 만료되었거나 이미 사용되었어요. 다시 로그인해 주세요.",
  oauth: "간편 로그인을 마치지 못했어요. 다시 시도해 주세요.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = await searchParams;
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">로그인</h1>
      <p className="mt-1 mb-6 text-sm text-app-muted">우리 가게 홈페이지를 이어서 만들어요.</p>
      <LoginForm next={safeNext(next)} notice={typeof error === "string" ? NOTICES[error] : undefined} />
    </>
  );
}
