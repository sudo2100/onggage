import { requireUser } from "@/lib/auth";

// 로그인 + 가입 동의 기록이 있어야 들어온다. 없으면 /login 또는 /signup/agree로 보낸다.
export const instant = false;

export default async function AdminPage() {
  await requireUser();
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16">
      <h1 className="text-2xl font-semibold">관리자</h1>
    </main>
  );
}
