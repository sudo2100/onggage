import Link from "next/link";
import { HeaderAccount } from "@/components/auth/HeaderAccount";

// 마케팅 화면 공통 틀: 상단 바 + 바닥글. 색·글꼴은 앱 자체 디자인(--app-*, Pretendard)만 쓴다.
export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col bg-app-bg break-keep text-app-ink">
      <header className="border-b border-app-line bg-app-surface">
        <div className="mx-auto flex max-w-[1120px] items-center gap-3 px-4 py-3 sm:gap-5">
          <Link href="/" className="text-lg font-bold tracking-tight">
            온가게
          </Link>
          <nav aria-label="주요 메뉴" className="flex flex-1 items-center gap-3 text-sm whitespace-nowrap text-app-muted sm:gap-5">
            <Link href="/designs" className="hover:text-app-ink">
              디자인
            </Link>
            <Link href="/pricing" className="hover:text-app-ink">
              요금 안내
            </Link>
          </nav>
          <HeaderAccount />
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-app-line">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-app-muted">
          <span>© 2026 온가게(가칭) · 동네 가게 홈페이지 빌더</span>
          <nav aria-label="바닥글 메뉴" className="flex gap-4">
            <Link href="/designs">디자인</Link>
            <Link href="/pricing">요금 안내</Link>
            <Link href="/terms">이용약관</Link>
            <Link href="/privacy">개인정보 처리방침</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
