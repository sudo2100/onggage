import Link from "next/link";
import { Suspense } from "react";
import { signOut } from "@/app/(auth)/actions";
import { getCurrentUser } from "@/lib/auth";
import { getMySite } from "@/lib/sites";

const primaryClass = "shrink-0 rounded-lg bg-app-accent px-3.5 py-2 text-sm font-semibold text-app-accent-ink";

// 손님용 버튼. 정적 껍데기(로그인 확인 전)에도 이 모양으로 먼저 그린다.
function GuestActions() {
  return (
    <>
      <Link href="/login" className="shrink-0 text-sm text-app-muted hover:text-app-ink">
        로그인
      </Link>
      <Link href="/designs" className={primaryClass}>
        {/* 좁은 폰 폭에서는 "시작하기"만 보인다 (접근 가능한 이름은 그대로). */}
        <span className="max-sm:sr-only">무료로 시작하기</span>
        <span aria-hidden className="sm:hidden">
          시작하기
        </span>
      </Link>
    </>
  );
}

async function Account() {
  const user = await getCurrentUser();
  if (!user) return <GuestActions />;
  // 사이트가 있으면 편집실로, 아직 없으면 만들기(/start)로.
  const site = await getMySite(user.id);
  return (
    <>
      {/* 로그아웃은 POST(Server Action)로만. GET 링크로는 로그아웃되지 않는다. */}
      <form action={signOut}>
        <button type="submit" className="shrink-0 text-sm text-app-muted hover:text-app-ink">
          로그아웃
        </button>
      </form>
      <Link href={site ? `/studio/${site.id}` : "/start"} className={primaryClass}>
        내 사이트
      </Link>
    </>
  );
}

// 상단 바 오른쪽. 로그인 정보는 요청마다 읽어야 해서 Suspense 안에서만 읽고, 캐시하지 않는다.
export function HeaderAccount() {
  return (
    <div className="flex shrink-0 items-center gap-2.5 whitespace-nowrap sm:gap-3">
      <Suspense fallback={<GuestActions />}>
        <Account />
      </Suspense>
    </div>
  );
}
