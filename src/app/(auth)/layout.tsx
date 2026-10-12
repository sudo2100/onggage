import Link from "next/link";

// 가입·로그인 화면 공통 틀: 가운데 카드 하나. 색·글꼴은 앱 자체 디자인(--app-*)만 쓴다.
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col items-center bg-app-bg px-4 py-10 break-keep text-app-ink sm:py-16">
      <Link href="/" className="text-xl font-bold tracking-tight">
        온가게
      </Link>
      <main className="mt-6 w-full max-w-[420px] rounded-2xl border border-app-line bg-app-surface p-6 sm:p-8">
        {children}
      </main>
    </div>
  );
}
