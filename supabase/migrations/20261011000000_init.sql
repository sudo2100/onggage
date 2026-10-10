-- 첫 마이그레이션: CLAUDE.md 데이터 모델, RLS, 회원가입 트리거, site-assets 버킷.

-- ─────────────────────────────────────────────
-- enum
-- ─────────────────────────────────────────────
create type public.industry as enum ('food', 'beauty', 'stay', 'pro');
create type public.site_status as enum ('draft', 'published', 'paused');
create type public.version_kind as enum ('draft', 'published');
create type public.inquiry_status as enum ('new', 'doing', 'done');
create type public.subscription_plan as enum ('free', 'basic', 'pro');

-- ─────────────────────────────────────────────
-- 공통: updated_at 자동 갱신
-- ─────────────────────────────────────────────
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────
-- 테이블
-- ─────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  signup_source text,
  created_at timestamptz not null default now()
);

create table public.sites (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 50),
  industry public.industry not null,
  -- 서브도메인. 3~30자 소문자·숫자·하이픈, 하이픈으로 시작·끝나지 않는다.
  slug text not null unique
    constraint sites_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$')
    constraint sites_slug_not_reserved check (slug <> all (array[
      -- 인프라
      'www', 'api', 'app', 'mail', 'smtp', 'imap', 'pop', 'ftp', 'cdn', 'static', 'assets',
      'img', 'media', 'files', 'dev', 'staging', 'status', 'ns1', 'ns2',
      -- 서비스 경로·운영
      'admin', 'studio', 'start', 'login', 'signup', 'auth', 'sites', 'designs', 'pricing',
      'help', 'support', 'blog', 'docs', 'dashboard', 'billing', 'onggage'
    ])),
  custom_domain text unique,
  status public.site_status not null default 'draft',
  template_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index sites_owner_id_idx on public.sites (owner_id);

create table public.site_versions (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  kind public.version_kind not null,
  sections jsonb not null default '[]'::jsonb,
  theme jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_id, kind)
);

create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 50),
  contact text not null check (char_length(contact) between 1 and 100),
  message text not null check (char_length(message) between 1 and 2000),
  status public.inquiry_status not null default 'new',
  created_at timestamptz not null default now()
);
create index inquiries_site_id_created_at_idx on public.inquiries (site_id, created_at desc);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  plan public.subscription_plan not null default 'free',
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  payment_method text,
  created_at timestamptz not null default now()
);
create index subscriptions_site_id_idx on public.subscriptions (site_id);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete cascade,
  storage_path text not null unique,
  size_bytes bigint not null check (size_bytes >= 0),
  created_at timestamptz not null default now()
);
create index assets_site_id_idx on public.assets (site_id);

create trigger sites_set_updated_at
  before update on public.sites
  for each row execute function public.set_updated_at();

create trigger site_versions_set_updated_at
  before update on public.site_versions
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────
-- 회원가입 시 profiles 행 자동 생성
-- ─────────────────────────────────────────────
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name, signup_source)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name'),
    new.raw_app_meta_data ->> 'provider'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.sites enable row level security;
alter table public.site_versions enable row level security;
alter table public.inquiries enable row level security;
alter table public.subscriptions enable row level security;
alter table public.assets enable row level security;

-- 소유 판별. sites RLS를 다시 타지 않도록 security definer로 둔다.
create function public.is_site_owner(target_site_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.sites
    where id = target_site_id and owner_id = (select auth.uid())
  );
$$;

create function public.is_site_published(target_site_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.sites
    where id = target_site_id and status = 'published'
  );
$$;

-- profiles: 본인 행만
create policy "본인 프로필 조회" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy "본인 프로필 수정" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- sites: 공개된 사이트는 누구나 조회.
-- 소유자는 name, industry, template_id만 수정할 수 있다 (칼럼 권한).
-- slug, status(공개·중지), custom_domain 변경은 서버(service role)에서만 한다.
create policy "소유자 사이트 조회" on public.sites
  for select to authenticated
  using (owner_id = (select auth.uid()));

create policy "공개 사이트 조회" on public.sites
  for select to anon, authenticated
  using (status = 'published');

create policy "소유자 사이트 생성" on public.sites
  for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and status = 'draft'
    and custom_domain is null
  );

create policy "소유자 사이트 수정" on public.sites
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "소유자 사이트 삭제" on public.sites
  for delete to authenticated
  using (owner_id = (select auth.uid()));

revoke update on public.sites from anon, authenticated;
grant update (name, industry, template_id) on public.sites to authenticated;

-- site_versions: 소유자는 모든 버전을 조회하되 draft만 쓴다.
-- 공개(draft → published 복사)는 서버(service role)에서만 한다.
-- 공개 사이트의 published 버전은 누구나 조회.
create policy "소유자 버전 조회" on public.site_versions
  for select to authenticated
  using (public.is_site_owner(site_id));

create policy "소유자 초안 생성" on public.site_versions
  for insert to authenticated
  with check (kind = 'draft' and public.is_site_owner(site_id));

create policy "소유자 초안 수정" on public.site_versions
  for update to authenticated
  using (kind = 'draft' and public.is_site_owner(site_id))
  with check (kind = 'draft' and public.is_site_owner(site_id));

create policy "소유자 초안 삭제" on public.site_versions
  for delete to authenticated
  using (kind = 'draft' and public.is_site_owner(site_id));

create policy "공개 버전 조회" on public.site_versions
  for select to anon, authenticated
  using (kind = 'published' and public.is_site_published(site_id));

-- inquiries: 조회·처리는 소유자만.
-- 등록은 서버 Route Handler가 rate limit·검증 후 service role로 한다 (익명 insert 정책 없음).
create policy "소유자 문의 조회" on public.inquiries
  for select to authenticated
  using (public.is_site_owner(site_id));

create policy "소유자 문의 수정" on public.inquiries
  for update to authenticated
  using (public.is_site_owner(site_id))
  with check (public.is_site_owner(site_id));

create policy "소유자 문의 삭제" on public.inquiries
  for delete to authenticated
  using (public.is_site_owner(site_id));

-- subscriptions: 소유자는 조회만. 생성·변경은 service role(결제 처리)만.
create policy "소유자 구독 조회" on public.subscriptions
  for select to authenticated
  using (public.is_site_owner(site_id));

-- assets: 소유자 전체 권한
create policy "소유자 파일 관리" on public.assets
  for all to authenticated
  using (public.is_site_owner(site_id))
  with check (public.is_site_owner(site_id));

-- ─────────────────────────────────────────────
-- Storage: site-assets 버킷
-- 경로는 {site_id}/{파일명}. public 버킷이라 공개 URL로 누구나 읽는다.
-- ─────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-assets',
  'site-assets',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
);

create function public.is_site_owner_path(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.sites
    where id::text = (storage.foldername(object_name))[1]
      and owner_id = (select auth.uid())
  );
$$;

create policy "소유자 파일 조회" on storage.objects
  for select to authenticated
  using (bucket_id = 'site-assets' and public.is_site_owner_path(name));

create policy "소유자 파일 업로드" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'site-assets' and public.is_site_owner_path(name));

create policy "소유자 파일 수정" on storage.objects
  for update to authenticated
  using (bucket_id = 'site-assets' and public.is_site_owner_path(name))
  with check (bucket_id = 'site-assets' and public.is_site_owner_path(name));

create policy "소유자 파일 삭제" on storage.objects
  for delete to authenticated
  using (bucket_id = 'site-assets' and public.is_site_owner_path(name));
