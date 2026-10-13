-- 공개 사이트(작업 6): 예약어 목록 한 곳으로, 첫 공개 시각, 공개하기·공개 상태 변경 함수.
-- 주인은 published 버전·status·slug를 직접 쓸 수 없다(RLS·칼럼 권한). 아래 security definer 함수만 이 일을 한다.
-- 함수마다 auth.uid()가 그 사이트 주인인지 먼저 확인하고, 아니면 not_owner로 거부한다 (없는 사이트와 구분하지 않음).

-- ─────────────────────────────────────────────
-- 예약어: DB의 기준 목록. src/lib/slug.ts의 RESERVED_SLUGS가 이 목록과 같은지 slug.test.ts가 확인한다.
-- ─────────────────────────────────────────────
create function public.reserved_slugs()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array[
    -- 인프라
    'www', 'api', 'app', 'mail', 'smtp', 'imap', 'pop', 'ftp', 'cdn', 'static', 'assets',
    'img', 'media', 'files', 'dev', 'staging', 'status', 'ns1', 'ns2',
    -- 서비스 경로·운영
    'admin', 'studio', 'start', 'login', 'signup', 'auth', 'sites', 'designs', 'pricing',
    'help', 'support', 'blog', 'docs', 'dashboard', 'billing', 'onggage'
  ]::text[];
$$;

alter table public.sites drop constraint sites_slug_not_reserved;
alter table public.sites
  add constraint sites_slug_not_reserved check (slug <> all (public.reserved_slugs()));

-- 처음 공개한 시각. 공개 중지(status = 'draft') 뒤에도 남아 "공개한 적 있음"을 나타낸다.
-- 공개한 적 있는 사이트는 주소를 바꿀 수 없다 (손님 링크가 깨지므로).
alter table public.sites add column first_published_at timestamptz;

-- ─────────────────────────────────────────────
-- 공개하기: draft를 published로 복사(upsert)하고 status를 published로.
-- new_slug를 주면 공개 전에 주소를 바꾼다 (한 번도 공개하지 않은 사이트만). 한 트랜잭션이라
-- 주소만 바뀌고 공개는 실패하는 일이 없다. 돌려주는 값은 공개된 주소(slug).
-- ─────────────────────────────────────────────
create function public.publish_site(target_site_id uuid, new_slug text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  site record;
  draft record;
  violated text;
begin
  if auth.uid() is null then
    raise exception 'not_owner' using errcode = '42501';
  end if;

  select s.id, s.slug, s.status, s.first_published_at into site
  from public.sites s
  where s.id = target_site_id and s.owner_id = auth.uid()
  for update;
  if not found then
    raise exception 'not_owner' using errcode = '42501';
  end if;
  if site.status = 'paused' then
    raise exception 'site_paused' using errcode = 'P0001';
  end if;

  select v.sections, v.theme, v.business into draft
  from public.site_versions v
  where v.site_id = site.id and v.kind = 'draft';
  if not found or jsonb_typeof(draft.sections) <> 'array' or jsonb_array_length(draft.sections) = 0
     or jsonb_typeof(draft.theme) <> 'object' or draft.theme = '{}'::jsonb then
    raise exception 'draft_empty' using errcode = 'P0001';
  end if;

  if new_slug is not null and new_slug <> site.slug then
    if site.first_published_at is not null then
      raise exception 'slug_locked' using errcode = 'P0001';
    end if;
    if new_slug !~ '^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$' then
      raise exception 'slug_invalid' using errcode = 'P0001';
    end if;
    if new_slug = any (public.reserved_slugs()) then
      raise exception 'slug_reserved' using errcode = 'P0001';
    end if;
    begin
      update public.sites set slug = new_slug where id = site.id;
    exception when unique_violation then
      get stacked diagnostics violated = constraint_name;
      if violated = 'sites_slug_key' then
        raise exception 'slug_taken' using errcode = 'P0001';
      end if;
      raise;
    end;
    site.slug := new_slug;
  end if;

  insert into public.site_versions (site_id, kind, sections, theme, business)
  values (site.id, 'published', draft.sections, draft.theme, draft.business)
  on conflict (site_id, kind) do update
    set sections = excluded.sections, theme = excluded.theme, business = excluded.business;

  update public.sites
  set status = 'published', first_published_at = coalesce(first_published_at, now())
  where id = site.id;

  return site.slug;
end;
$$;

-- ─────────────────────────────────────────────
-- 공개 상태 변경 (주인이 할 수 있는 전환만)
--   published → draft : 공개 중지
--   draft → published : 다시 공개 (지난 공개본 그대로, 공개한 적이 있을 때만)
--   paused로 바꾸기·paused에서 풀기는 주인이 할 수 없다 (요금 만료용, 서버가 처리).
-- ─────────────────────────────────────────────
create function public.set_site_status(target_site_id uuid, new_status public.site_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  site record;
begin
  if auth.uid() is null then
    raise exception 'not_owner' using errcode = '42501';
  end if;

  select s.id, s.status into site
  from public.sites s
  where s.id = target_site_id and s.owner_id = auth.uid()
  for update;
  if not found then
    raise exception 'not_owner' using errcode = '42501';
  end if;
  if site.status = 'paused' then
    raise exception 'site_paused' using errcode = 'P0001';
  end if;
  if new_status = 'paused' then
    raise exception 'status_not_allowed' using errcode = 'P0001';
  end if;
  if new_status = 'published' and not exists (
    select 1 from public.site_versions v where v.site_id = site.id and v.kind = 'published'
  ) then
    raise exception 'never_published' using errcode = 'P0001';
  end if;

  update public.sites set status = new_status where id = site.id;
end;
$$;

revoke execute on function public.publish_site(uuid, text) from public, anon;
grant execute on function public.publish_site(uuid, text) to authenticated;
revoke execute on function public.set_site_status(uuid, public.site_status) from public, anon;
grant execute on function public.set_site_status(uuid, public.site_status) to authenticated;
