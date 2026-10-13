import "server-only";
import { parseSiteContent, type ParseResult } from "./site-content";
import { createClient } from "./supabase/server";

// 로그인한 사용자의 사이트 읽기.
// RLS상 로그인한 사용자는 남의 "공개된" 사이트도 조회할 수 있으므로, 내 사이트는 항상 owner_id로 거른다.

const SITE_COLUMNS = "id, name, industry, slug, status, template_id, tone, first_published_at";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 한 사람당 사이트 하나 (DB 제약 sites_one_per_owner).
export async function getMySite(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("sites").select(SITE_COLUMNS).eq("owner_id", userId).maybeSingle();
  return data;
}

export type MySite = NonNullable<Awaited<ReturnType<typeof getMySite>>>;

// 이 id의 사이트가 내 것이면 돌려준다. 남의 사이트(공개된 것 포함)·없는 id·형식이 틀린 id는 null.
export async function getMySiteById(userId: string, siteId: string): Promise<MySite | null> {
  if (!UUID_PATTERN.test(siteId)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("sites")
    .select(SITE_COLUMNS)
    .eq("id", siteId)
    .eq("owner_id", userId)
    .maybeSingle();
  return data;
}

// 편집실용 초안 내용 (읽기용, 관대). 고친 부분은 사이트 id와 함께 서버 로그에 남긴다.
export async function getDraftContent(site: MySite): Promise<ParseResult> {
  const supabase = await createClient();
  const { data: version } = await supabase
    .from("site_versions")
    .select("sections, theme, business")
    .eq("site_id", site.id)
    .eq("kind", "draft")
    .maybeSingle();

  const draft = parseSiteContent(version, { industry: site.industry, siteName: site.name });
  if (draft.issues.length > 0) {
    console.warn(`[studio] 사이트 ${site.id} 초안을 읽으며 고친 부분`, draft.issues);
  }
  return draft;
}
