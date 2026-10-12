import type { Metadata } from "next";
import { TERMS_VERSION } from "@/lib/agreement";

export const metadata: Metadata = { title: "이용약관" };

// 본문은 정식 서비스 전에 채운다. 가입 동의는 TERMS_VERSION과 함께 기록된다.
export default function TermsPage() {
  return (
    <div className="mx-auto max-w-[720px] px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">이용약관</h1>
      <p className="mt-4 text-app-muted">이용약관 본문을 준비하고 있어요.</p>
      <p className="mt-2 text-sm text-app-muted">약관 버전: {TERMS_VERSION}</p>
    </div>
  );
}
