import "server-only";
import type { User } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { requireUser } from "./auth";
import { getMySiteById, type MySite } from "./sites";

// 권한이 필요한 서버 작업의 첫 줄 (CLAUDE.md "권한이 필요한 서버 작업 규칙").
// 1) getUser()로 로그인 확인 (requireUser: 없으면 /login, 동의 기록이 없으면 /signup/agree)
// 2) 그 사이트의 주인인지 확인. 남의 사이트·없는 사이트는 구분하지 않고 404.
// 편집실 화면과 편집실 Server Action이 모두 이 함수로 시작한다. DB 함수도 안에서 주인을 다시 확인한다.
export async function requireSiteOwner(siteId: string): Promise<{ user: User; site: MySite }> {
  const user = await requireUser();
  const site = await getMySiteById(user.id, siteId);
  if (!site) notFound();
  return { user, site };
}
