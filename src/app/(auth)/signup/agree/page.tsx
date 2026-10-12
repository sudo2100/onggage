import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AgreeForm } from "@/components/auth/forms";
import { getCurrentUser, hasAgreement } from "@/lib/auth";
import { safeNext, withNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: "약관 동의", robots: { index: false } };

// 동의 기록이 없거나 약관 버전이 바뀐 사용자가 오는 화면 (소셜 첫 로그인, API로 직접 가입 등).
export const instant = false;

export default async function AgreePage({ searchParams }: PageProps<"/signup/agree">) {
  const next = safeNext((await searchParams).next);
  const user = await getCurrentUser();
  if (!user) redirect(withNext("/login", next));
  if (await hasAgreement(user.id)) redirect(next);

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">시작하기 전에 동의해 주세요</h1>
      <p className="mt-1 mb-6 text-sm text-app-muted">온가게를 쓰려면 아래 항목에 모두 동의해야 해요.</p>
      <AgreeForm next={next} />
    </>
  );
}
