import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { Industry, SiteContent } from "./site-schema";
import { parseSiteContent } from "./site-content";
import { siteCacheTag } from "./site-host";
import { SLUG_PATTERN } from "./slug";
import { createAnonClient } from "./supabase/anon";

export type PublishedSite = {
  site: { id: string; name: string; industry: Industry; slug: string };
  content: SiteContent;
  updatedAt: string;
};

// 공개 사이트 한 곳의 공개본. 손님 요청마다 DB를 읽지 않도록 캐시한다.
// - 태그는 slug 기준(siteCacheTag). "없음/비공개"(null) 결과에도 같은 태그가 달려,
//   처음 공개할 때 지워진다 (공개 전에 누가 그 주소에 들어가 404가 캐시돼도 공개 뒤에 남지 않는다).
// - 공개하기·공개 중지·다시 공개 Server Action이 updateTag로 지운다. 수명(hours)은 갱신을 빠뜨린 경우의 안전장치.
// - DB 오류는 예외로 던진다. null로 돌려주면 "없음"이 캐시되기 때문이다 (예외는 캐시되지 않는다).
export async function getPublishedSite(slug: string): Promise<PublishedSite | null> {
  "use cache";
  cacheTag(siteCacheTag(slug));
  cacheLife("hours");

  if (!SLUG_PATTERN.test(slug)) return null;
  const supabase = createAnonClient();

  const { data: site, error: siteError } = await supabase
    .from("sites")
    .select("id, name, industry, slug")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (siteError) throw new Error(`공개 사이트를 읽지 못했습니다 (${slug}): ${siteError.message}`);
  if (!site) return null;

  const { data: version, error: versionError } = await supabase
    .from("site_versions")
    .select("sections, theme, business, updated_at")
    .eq("site_id", site.id)
    .eq("kind", "published")
    .maybeSingle();
  if (versionError) throw new Error(`공개본을 읽지 못했습니다 (${site.id}): ${versionError.message}`);
  if (!version) return null;

  const { content, issues } = parseSiteContent(version, { industry: site.industry, siteName: site.name });
  if (issues.length > 0) {
    console.warn(`[public-site] 사이트 ${site.id} (${slug}) 공개본을 읽으며 고친 부분`, issues);
  }
  return { site, content, updatedAt: version.updated_at };
}
