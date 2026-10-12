import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "메일을 확인해 주세요", robots: { index: false } };

// 인증 메일을 켠 환경(운영)에서 이메일 가입 직후 오는 화면. 메일 링크가 고른 디자인(next)으로 이어진다.
export default function CheckEmailPage() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">메일을 확인해 주세요</h1>
      <p className="mt-3 text-app-muted">
        가입한 이메일로 인증 메일을 보냈어요. 메일의 <strong className="text-app-ink">가입 완료하기</strong> 버튼을
        누르면 고른 디자인으로 홈페이지 만들기가 이어집니다.
      </p>
      <ul className="mt-4 grid list-disc gap-1 pl-5 text-sm text-app-muted">
        <li>메일이 보이지 않으면 스팸함을 확인해 주세요.</li>
        <li>링크는 한 시간 동안 쓸 수 있어요.</li>
      </ul>
      <Link href="/login" className="mt-6 inline-block text-sm text-app-accent underline underline-offset-4">
        로그인 화면으로
      </Link>
    </>
  );
}
