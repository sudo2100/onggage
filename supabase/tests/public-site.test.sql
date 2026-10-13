-- 공개하기·공개 상태 변경·주소 변경. `pnpm test:db`로 실행한다.
begin;
create extension if not exists pgtap with schema extensions;

select plan(34);

-- 주인 O, 다른 사용자 X, 공개한 적 없는 사이트의 주인 N
insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data)
values
  ('e0000000-0000-0000-0000-00000000000a', 'owner@example.com', '{}', '{"provider":"email"}'),
  ('e0000000-0000-0000-0000-00000000000b', 'other@example.com', '{}', '{"provider":"email"}'),
  ('e0000000-0000-0000-0000-00000000000c', 'new@example.com', '{}', '{"provider":"email"}');

insert into public.sites (id, owner_id, name, industry, slug)
values
  ('f0000000-0000-0000-0000-00000000000a', 'e0000000-0000-0000-0000-00000000000a', '공개 가게', 'food', 'pgtap-pub-owner'),
  ('f0000000-0000-0000-0000-00000000000b', 'e0000000-0000-0000-0000-00000000000b', '다른 가게', 'food', 'pgtap-pub-other'),
  ('f0000000-0000-0000-0000-00000000000c', 'e0000000-0000-0000-0000-00000000000c', '새 가게', 'beauty', 'pgtap-pub-new');

insert into public.site_versions (site_id, kind, sections, theme, business)
select id, 'draft',
  '[{"id":"hero","type":"hero","visible":true,"title":"첫 초안","subtitle":"","ctaLabel":"문의"}]'::jsonb,
  '{"accent":"#7A4B1F","font":"myeongjo","layout":"split"}'::jsonb,
  '{"phone":"031-905-1234"}'::jsonb
from public.sites
where id in ('f0000000-0000-0000-0000-00000000000a', 'f0000000-0000-0000-0000-00000000000b', 'f0000000-0000-0000-0000-00000000000c');

-- 예약어 (기준 목록 한 곳)
select ok(
  array['www', 'api', 'admin', 'app', 'studio', 'mail', 'static', 'assets'] <@ public.reserved_slugs(),
  '필수 예약어가 기준 목록에 있다'
);
select throws_ok(
  $$ insert into public.sites (owner_id, name, industry, slug)
     values ('e0000000-0000-0000-0000-00000000000b', '예약어', 'food', 'studio') $$,
  '23514', null, 'slug 제약도 같은 예약어 목록을 쓴다'
);

-- ─── 주인 O ───
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"e0000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

select is(
  public.publish_site('f0000000-0000-0000-0000-00000000000a'),
  'pgtap-pub-owner',
  '주인은 공개할 수 있다 (공개된 주소를 돌려준다)'
);
select results_eq(
  $$ select status::text, first_published_at is not null from public.sites
     where id = 'f0000000-0000-0000-0000-00000000000a' $$,
  $$ values ('published'::text, true) $$,
  '공개하면 status가 published가 되고 처음 공개 시각이 남는다'
);
select results_eq(
  $$ select sections -> 0 ->> 'title', business ->> 'phone' from public.site_versions
     where site_id = 'f0000000-0000-0000-0000-00000000000a' and kind = 'published' $$,
  $$ values ('첫 초안'::text, '031-905-1234'::text) $$,
  'draft의 sections·business가 published로 복사된다'
);

-- 공개 후 초안을 고쳐도 공개본은 그대로
update public.site_versions
set sections = '[{"id":"hero","type":"hero","visible":true,"title":"고친 초안","subtitle":"","ctaLabel":"문의"}]'
where site_id = 'f0000000-0000-0000-0000-00000000000a' and kind = 'draft';
select is(
  (select sections -> 0 ->> 'title' from public.site_versions
   where site_id = 'f0000000-0000-0000-0000-00000000000a' and kind = 'published'),
  '첫 초안',
  '초안을 고쳐도 다시 공개하기 전까지 공개본은 그대로다'
);

select lives_ok($$ select public.publish_site('f0000000-0000-0000-0000-00000000000a') $$, '다시 공개할 수 있다');
select is(
  (select sections -> 0 ->> 'title' from public.site_versions
   where site_id = 'f0000000-0000-0000-0000-00000000000a' and kind = 'published'),
  '고친 초안',
  '다시 공개하면 공개본이 초안으로 바뀐다 (upsert)'
);
select is(
  (select count(*) from public.site_versions
   where site_id = 'f0000000-0000-0000-0000-00000000000a' and kind = 'published')::int, 1,
  '공개본은 하나만 있다'
);

-- 공개한 뒤에는 주소를 바꿀 수 없다 (같은 주소를 주는 건 괜찮다)
select throws_ok(
  $$ select public.publish_site('f0000000-0000-0000-0000-00000000000a', 'pgtap-pub-renamed') $$,
  'P0001', 'slug_locked', '공개한 사이트는 주소를 바꿀 수 없다'
);
select lives_ok(
  $$ select public.publish_site('f0000000-0000-0000-0000-00000000000a', 'pgtap-pub-owner') $$,
  '지금 주소를 그대로 주면 공개된다'
);

-- 공개 중지 → 다시 공개
select lives_ok(
  $$ select public.set_site_status('f0000000-0000-0000-0000-00000000000a', 'draft') $$,
  '주인은 공개를 중지할 수 있다'
);
select results_eq(
  $$ select status::text, first_published_at is not null from public.sites
     where id = 'f0000000-0000-0000-0000-00000000000a' $$,
  $$ values ('draft'::text, true) $$,
  '공개 중지는 status를 draft로 되돌리고, 공개 이력(first_published_at)은 남는다'
);
select throws_ok(
  $$ select public.publish_site('f0000000-0000-0000-0000-00000000000a', 'pgtap-pub-renamed') $$,
  'P0001', 'slug_locked', '공개 중지한 뒤에도 주소는 바꿀 수 없다'
);
select lives_ok(
  $$ select public.set_site_status('f0000000-0000-0000-0000-00000000000a', 'published') $$,
  '공개한 적 있는 사이트는 다시 공개할 수 있다'
);
select throws_ok(
  $$ select public.set_site_status('f0000000-0000-0000-0000-00000000000a', 'paused') $$,
  'P0001', 'status_not_allowed', '주인은 paused로 바꿀 수 없다'
);

-- ─── 다른 사용자 X: 남의 사이트는 거부 ───
select set_config('request.jwt.claims', '{"sub":"e0000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);

select throws_ok(
  $$ select public.publish_site('f0000000-0000-0000-0000-00000000000c') $$,
  '42501', 'not_owner', '다른 사용자는 남의 사이트를 공개할 수 없다'
);
select throws_ok(
  $$ select public.publish_site('f0000000-0000-0000-0000-00000000000c', 'pgtap-stolen') $$,
  '42501', 'not_owner', '다른 사용자는 남의 사이트 주소를 바꿀 수 없다'
);
select throws_ok(
  $$ select public.set_site_status('f0000000-0000-0000-0000-00000000000a', 'draft') $$,
  '42501', 'not_owner', '다른 사용자는 남의 사이트 공개를 중지할 수 없다'
);
select throws_ok(
  $$ select public.publish_site('00000000-0000-0000-0000-000000000000') $$,
  '42501', 'not_owner', '없는 사이트도 같은 오류 (있는지 알려 주지 않는다)'
);

-- ─── 새 사이트 주인 N: 공개 전 주소 바꾸기 ───
select set_config('request.jwt.claims', '{"sub":"e0000000-0000-0000-0000-00000000000c","role":"authenticated"}', true);

select throws_ok(
  $$ select public.set_site_status('f0000000-0000-0000-0000-00000000000c', 'published') $$,
  'P0001', 'never_published', '공개한 적 없으면 상태만 바꿔 공개할 수 없다 (publish_site로)'
);
select throws_ok(
  $$ select public.publish_site('f0000000-0000-0000-0000-00000000000c', 'Bad_Slug') $$,
  'P0001', 'slug_invalid', '형식이 틀린 주소는 거부한다'
);
select throws_ok(
  $$ select public.publish_site('f0000000-0000-0000-0000-00000000000c', 'admin') $$,
  'P0001', 'slug_reserved', '예약어 주소는 거부한다'
);
select throws_ok(
  $$ select public.publish_site('f0000000-0000-0000-0000-00000000000c', 'pgtap-pub-owner') $$,
  'P0001', 'slug_taken', '남이 쓰는 주소는 거부한다'
);
select throws_ok(
  $$ select public.publish_site('f0000000-0000-0000-0000-00000000000c', 'pgtap-pub-other') $$,
  'P0001', 'slug_taken', '공개 전인 남의 사이트 주소도 거부한다 (보이지 않아도)'
);
select results_eq(
  $$ select slug, status::text from public.sites where id = 'f0000000-0000-0000-0000-00000000000c' $$,
  $$ values ('pgtap-pub-new'::text, 'draft'::text) $$,
  '실패한 공개는 주소도 상태도 바꾸지 않는다'
);
select is(
  public.publish_site('f0000000-0000-0000-0000-00000000000c', 'pgtap-gyeol-hair'),
  'pgtap-gyeol-hair',
  '공개 전이면 주소를 바꾸면서 한 번에 공개한다'
);
select results_eq(
  $$ select slug, status::text from public.sites where id = 'f0000000-0000-0000-0000-00000000000c' $$,
  $$ values ('pgtap-gyeol-hair'::text, 'published'::text) $$,
  '바꾼 주소로 공개된다'
);

-- ─── paused: 주인이 풀 수 없다 ───
reset role;
update public.sites set status = 'paused' where id = 'f0000000-0000-0000-0000-00000000000c';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"e0000000-0000-0000-0000-00000000000c","role":"authenticated"}', true);

select throws_ok(
  $$ select public.set_site_status('f0000000-0000-0000-0000-00000000000c', 'published') $$,
  'P0001', 'site_paused', 'paused를 주인이 풀 수 없다 (published로)'
);
select throws_ok(
  $$ select public.set_site_status('f0000000-0000-0000-0000-00000000000c', 'draft') $$,
  'P0001', 'site_paused', 'paused를 주인이 풀 수 없다 (draft로)'
);
select throws_ok(
  $$ select public.publish_site('f0000000-0000-0000-0000-00000000000c') $$,
  'P0001', 'site_paused', 'paused면 공개하기로도 풀 수 없다'
);

-- ─── 익명: 호출할 수 없다 ───
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select throws_ok(
  $$ select public.publish_site('f0000000-0000-0000-0000-00000000000a') $$,
  '42501', null, '익명은 publish_site를 호출할 수 없다'
);
select throws_ok(
  $$ select public.set_site_status('f0000000-0000-0000-0000-00000000000a', 'draft') $$,
  '42501', null, '익명은 set_site_status를 호출할 수 없다'
);
select is(
  (select sections -> 0 ->> 'title' from public.site_versions
   where site_id = 'f0000000-0000-0000-0000-00000000000a'),
  '고친 초안',
  '익명은 공개본만 읽는다'
);

select * from finish();
rollback;
