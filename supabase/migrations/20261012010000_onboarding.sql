-- 온보딩(작업 5): 말투, 한 사람당 사이트 하나, 사이트 + 초안을 한 번에 만드는 함수.

-- 말투: 온보딩 3단계에서 고른다. 템플릿 문구(지금)와 AI 문구(2단계)가 이 값을 따른다.
create type public.site_tone as enum ('calm', 'warm', 'fresh');

alter table public.sites
  add column tone public.site_tone not null default 'calm';

-- MVP는 한 사람당 사이트 하나. 주인은 RLS상 sites에 직접 insert할 수 있으므로 화면이 아니라 DB에서 막는다.
-- unique 제약이 owner_id 인덱스를 겸하므로 기존 인덱스는 지운다.
alter table public.sites
  add constraint sites_one_per_owner unique (owner_id);
drop index public.sites_owner_id_idx;

-- 사이트 행과 draft 버전을 한 트랜잭션에서 만든다. 초안 없는 사이트 행이 생기지 않는다.
-- - 내용(sections·theme·business) 검증은 앱이 validateSiteContent로 마친 뒤 넘긴다.
-- - 호출한 사용자 권한으로 실행한다(security invoker). RLS가 그대로 적용되고 owner_id는 auth.uid()다.
-- - slug: slug_base를 먼저 쓰고, 다른 사이트와 겹치거나 예약어면 -2, -3…을 붙인다.
--   다른 사람의 초안 사이트는 RLS로 보이지 않아 앱이 미리 확인할 수 없으므로 unique 제약에 맡긴다.
-- - 이미 사이트가 있으면 'site_already_exists'로 알린다.
create function public.create_site_with_draft(
  site_name text,
  site_industry public.industry,
  site_template_id text,
  site_tone public.site_tone,
  slug_base text,
  draft_sections jsonb,
  draft_theme jsonb,
  draft_business jsonb
)
returns table (site_id uuid, site_slug text)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  candidate text;
  suffix text;
  new_id uuid;
  violated text;
  attempt int := 1;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다' using errcode = '42501';
  end if;
  -- 빈 초안으로 사이트를 만들지 않는다 (읽을 때 템플릿으로 대체되며 경고가 쌓인다).
  if jsonb_typeof(draft_sections) <> 'array' or jsonb_array_length(draft_sections) = 0
     or jsonb_typeof(draft_theme) <> 'object' or draft_theme = '{}'::jsonb then
    raise exception '초안 내용이 비어 있습니다' using errcode = '22023';
  end if;

  loop
    if attempt = 1 then
      candidate := slug_base;
    else
      suffix := '-' || attempt;
      candidate := rtrim(left(slug_base, 30 - char_length(suffix)), '-') || suffix;
    end if;

    begin
      insert into public.sites (owner_id, name, industry, template_id, tone, slug)
      values (auth.uid(), site_name, site_industry, site_template_id, site_tone, candidate)
      returning id into new_id;
      exit;
    exception
      when unique_violation or check_violation then
        get stacked diagnostics violated = constraint_name;
        if violated = 'sites_one_per_owner' then
          raise exception 'site_already_exists' using errcode = 'P0001';
        elsif violated not in ('sites_slug_key', 'sites_slug_not_reserved') or attempt >= 50 then
          raise;
        end if;
    end;
    attempt := attempt + 1;
  end loop;

  insert into public.site_versions (site_id, kind, sections, theme, business)
  values (new_id, 'draft', draft_sections, draft_theme, draft_business);

  site_id := new_id;
  site_slug := candidate;
  return next;
end;
$$;

revoke execute on function public.create_site_with_draft(text, public.industry, text, public.site_tone, text, jsonb, jsonb, jsonb)
  from public, anon;
grant execute on function public.create_site_with_draft(text, public.industry, text, public.site_tone, text, jsonb, jsonb, jsonb)
  to authenticated;
