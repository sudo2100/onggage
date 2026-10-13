"use server";

import { refresh, updateTag } from "next/cache";
import { requireSiteOwner } from "@/lib/require-site-owner";
import { validateSiteContent } from "@/lib/site-content";
import { siteCacheTag } from "@/lib/site-host";
import { SLUG_PATTERN } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";

export type StudioActionResult = { ok: true; slug?: string } | { ok: false; error: string; field?: "slug" };

// DB 함수가 알려 주는 오류 → 사용자 안내
const ERRORS: Record<string, { error: string; field?: "slug" }> = {
  slug_invalid: { error: "주소는 영문 소문자·숫자·하이픈으로 3~30자예요. 하이픈으로 시작하거나 끝날 수 없어요.", field: "slug" },
  slug_reserved: { error: "쓸 수 없는 주소예요. 다른 주소를 정해 주세요.", field: "slug" },
  slug_taken: { error: "이미 다른 가게가 쓰는 주소예요. 다른 주소를 정해 주세요.", field: "slug" },
  slug_locked: { error: "공개한 적 있는 사이트는 주소를 바꿀 수 없어요.", field: "slug" },
  site_paused: { error: "요금제 만료로 공개가 멈춘 사이트예요. 요금제를 확인해 주세요." },
  draft_empty: { error: "초안이 비어 있어 공개할 수 없어요." },
  never_published: { error: "아직 공개한 적이 없어요. 공개하기를 눌러 주세요." },
  status_not_allowed: { error: "바꿀 수 없는 상태예요." },
  not_owner: { error: "사이트를 찾을 수 없어요." },
};

function failure(message: string | undefined): StudioActionResult {
  return { ok: false, ...(ERRORS[message ?? ""] ?? { error: "잠시 문제가 생겼어요. 다시 시도해 주세요." }) };
}

// 공개하기. 처음 공개라면 newSlug로 주소를 바꾸면서 한 번에 공개한다 (DB 함수 publish_site가 한 트랜잭션으로 처리).
export async function publishSite(siteId: string, newSlug?: string): Promise<StudioActionResult> {
  const { site } = await requireSiteOwner(siteId);
  const supabase = await createClient();

  // 공개본은 손님이 보는 화면이라, 저장용(엄격) 검증을 통과한 초안만 공개한다.
  const { data: draft } = await supabase
    .from("site_versions")
    .select("sections, theme, business")
    .eq("site_id", site.id)
    .eq("kind", "draft")
    .maybeSingle();
  const validated = validateSiteContent(draft);
  if (!validated.ok) {
    console.error(`[studio] 사이트 ${site.id} 초안 검증 실패로 공개하지 않음`, validated.errors);
    return { ok: false, error: "초안에 고칠 부분이 있어 공개하지 못했어요." };
  }

  const slug = newSlug?.trim().toLowerCase() || undefined;
  if (slug && !SLUG_PATTERN.test(slug)) return failure("slug_invalid");

  const { data: publishedSlug, error } = await supabase.rpc("publish_site", { target_site_id: site.id, new_slug: slug });
  if (error || !publishedSlug) {
    if (error) console.error(`[studio] 사이트 ${site.id} 공개 실패`, error.message);
    return failure(error?.message);
  }

  // 공개 사이트 캐시: 예전 주소와 새 주소 모두 (공개 전 "없음" 캐시도 함께 지운다).
  updateTag(siteCacheTag(site.slug));
  if (publishedSlug !== site.slug) updateTag(siteCacheTag(publishedSlug));
  refresh();
  return { ok: true, slug: publishedSlug };
}

// 공개 중지(published → draft). 공개 이력(first_published_at)은 남아 주소는 계속 잠긴다.
export async function stopPublishing(siteId: string): Promise<StudioActionResult> {
  const { site } = await requireSiteOwner(siteId);
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_site_status", { target_site_id: site.id, new_status: "draft" });
  if (error) {
    console.error(`[studio] 사이트 ${site.id} 공개 중지 실패`, error.message);
    return failure(error.message);
  }
  updateTag(siteCacheTag(site.slug));
  refresh();
  return { ok: true };
}
