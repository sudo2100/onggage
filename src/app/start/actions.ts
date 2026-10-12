"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { buildDraftContent, onboardingSchema } from "@/lib/onboarding";
import { validateSiteContent } from "@/lib/site-content";
import { suggestSlug } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";

export type CreateSiteResult = { error: string; alreadyExists?: boolean };

// 온보딩 완료: 입력 전체를 다시 검증하고, 사이트 행 + draft 버전을 한 번에 만든 뒤 편집실로 보낸다.
export async function createSite(input: unknown): Promise<CreateSiteResult> {
  await requireUser();

  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) return { error: "입력한 내용을 다시 확인해 주세요." };

  // AI 대신 템플릿 문구로 만든 초안도 저장용 검증을 통과해야 저장한다 (CLAUDE.md 원칙 4).
  const validated = validateSiteContent(buildDraftContent(parsed.data));
  if (!validated.ok) {
    console.error("[onboarding] 초안 검증 실패", validated.errors);
    return { error: "초안을 만들지 못했어요. 잠시 후 다시 시도해 주세요." };
  }

  const { sections, theme, business } = validated.content;
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("create_site_with_draft", {
      site_name: parsed.data.name,
      site_industry: parsed.data.industry,
      site_template_id: parsed.data.designId,
      site_tone: parsed.data.tone,
      slug_base: suggestSlug(parsed.data.name, parsed.data.industry),
      draft_sections: sections,
      draft_theme: theme,
      draft_business: business,
    })
    .single();

  if (error || !data) {
    if (error?.message === "site_already_exists") {
      return { error: "이미 만든 사이트가 있어요. 편집실에서 이어서 만들어 주세요.", alreadyExists: true };
    }
    console.error("[onboarding] 사이트 생성 실패", error);
    return { error: "사이트를 만들지 못했어요. 잠시 후 다시 시도해 주세요." };
  }

  redirect(`/studio/${data.site_id}`);
}
