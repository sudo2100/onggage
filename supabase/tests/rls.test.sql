-- RLS·제약·트리거 검증. `pnpm test:db`로 실행한다.
begin;
create extension if not exists pgtap with schema extensions;

select plan(39);

-- 사용자 세 명 (트리거가 profiles를 만든다). 사이트는 한 사람당 하나라
-- A는 공개된 사이트, C는 초안 사이트를 갖는다. B는 사이트가 없다.
insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', 'a@example.com', '{"name":"가게주인A"}', '{"provider":"email"}'),
  ('22222222-2222-2222-2222-222222222222', 'b@example.com', '{}', '{"provider":"kakao"}'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'c@example.com', '{}', '{"provider":"email"}');

select results_eq(
  $$ select name, signup_source from public.profiles
     where id = '11111111-1111-1111-1111-111111111111' $$,
  $$ values ('가게주인A'::text, 'email'::text) $$,
  '회원가입 시 profiles 행이 생성된다'
);

-- 테스트용 데이터 (postgres 권한으로 준비)
insert into public.sites (id, owner_id, name, industry, slug, status)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'A 카페', 'food', 'a-cafe', 'published'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'C 미용실', 'beauty', 'c-hair', 'draft');

insert into public.site_versions (site_id, kind)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'draft'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'published');

insert into public.inquiries (site_id, name, contact, message)
values ('aaaaaaaa-0000-0000-0000-000000000001', '손님', '010-0000-0000', '예약 문의');

-- 제약
select throws_ok(
  $$ insert into public.sites (owner_id, name, industry, slug)
     values ('11111111-1111-1111-1111-111111111111', 'x', 'food', 'Bad_Slug') $$,
  '23514', null, 'slug에 대문자·밑줄이 있으면 거부한다'
);

select throws_ok(
  $$ insert into public.sites (owner_id, name, industry, slug)
     values ('11111111-1111-1111-1111-111111111111', 'x', 'food', 'ab') $$,
  '23514', null, 'slug가 3자 미만이면 거부한다'
);

select throws_ok(
  $$ insert into public.sites (owner_id, name, industry, slug)
     values ('11111111-1111-1111-1111-111111111111', 'x', 'food', '-cafe') $$,
  '23514', null, 'slug가 하이픈으로 시작하면 거부한다'
);

select throws_ok(
  $$ insert into public.sites (owner_id, name, industry, slug)
     values ('11111111-1111-1111-1111-111111111111', 'x', 'food', 'cafe-') $$,
  '23514', null, 'slug가 하이픈으로 끝나면 거부한다'
);

select throws_ok(
  $$ insert into public.sites (owner_id, name, industry, slug)
     values ('11111111-1111-1111-1111-111111111111', 'x', 'food', 'admin') $$,
  '23514', null, '예약어 slug(admin)를 거부한다'
);

select throws_ok(
  $$ insert into public.sites (owner_id, name, industry, slug)
     values ('11111111-1111-1111-1111-111111111111', 'x', 'food', 'www') $$,
  '23514', null, '예약어 slug(www)를 거부한다'
);

select throws_ok(
  $$ insert into public.sites (owner_id, name, industry, slug)
     values ('22222222-2222-2222-2222-222222222222', 'x', 'food', 'a-cafe') $$,
  '23505', null, 'slug 중복을 거부한다'
);

select throws_ok(
  $$ insert into public.site_versions (site_id, kind)
     values ('aaaaaaaa-0000-0000-0000-000000000001', 'draft') $$,
  '23505', null, '사이트당 draft는 하나만 둘 수 있다'
);

-- 익명 방문자
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select is(
  (select count(*) from public.sites)::int, 1,
  '익명은 공개된 사이트만 본다'
);

select is(
  (select count(*) from public.site_versions)::int, 1,
  '익명은 published 버전만 본다'
);

select throws_ok(
  $$ insert into public.inquiries (site_id, name, contact, message)
     values ('aaaaaaaa-0000-0000-0000-000000000001', '손님', '010-0000-0000', '문의') $$,
  '42501', null, '익명은 DB에 직접 문의를 넣을 수 없다 (서버 경유만)'
);

select is(
  (select count(*) from public.inquiries)::int, 0,
  '익명은 문의를 조회할 수 없다'
);

-- 다른 사용자 B
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);

select is(
  (select count(*) from public.sites where id in (
     'aaaaaaaa-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002'))::int, 1,
  'B는 남의 사이트 중 공개된 것만 본다 (C의 초안 사이트는 안 보인다)'
);

select is(
  (select count(*) from public.inquiries)::int, 0,
  'B는 A 사이트의 문의를 볼 수 없다'
);

select is(
  (select count(*) from public.profiles)::int, 1,
  'B는 자기 프로필만 본다'
);

select throws_ok(
  $$ insert into public.sites (owner_id, name, industry, slug)
     values ('11111111-1111-1111-1111-111111111111', '가짜', 'food', 'fake-site') $$,
  '42501', null, 'B는 A 명의로 사이트를 만들 수 없다'
);

-- B의 수정·삭제는 RLS에 걸러져 0행에 적용된다
update public.sites set name = '해킹' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select is(
  (select name from public.sites where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  'A 카페',
  'B는 A의 사이트를 수정할 수 없다'
);

delete from public.sites where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select is(
  (select count(*) from public.sites where id = 'aaaaaaaa-0000-0000-0000-000000000001')::int, 1,
  'B는 A의 사이트를 삭제할 수 없다'
);

select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner)
     values ('site-assets', 'aaaaaaaa-0000-0000-0000-000000000001/hack.png',
             '22222222-2222-2222-2222-222222222222') $$,
  '42501', null, 'B는 A 사이트 폴더에 파일을 올릴 수 없다'
);

select throws_ok(
  $$ insert into public.sites (owner_id, name, industry, slug, status)
     values ('22222222-2222-2222-2222-222222222222', 'B 가게', 'food', 'b-shop', 'published') $$,
  '42501', null, '사이트를 published 상태로 직접 만들 수 없다'
);

select throws_ok(
  $$ insert into public.sites (owner_id, name, industry, slug, custom_domain)
     values ('22222222-2222-2222-2222-222222222222', 'B 가게', 'food', 'b-shop', 'b.example.com') $$,
  '42501', null, '사이트를 만들 때 연결 도메인을 직접 넣을 수 없다'
);

-- 소유자 A
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

select is(
  (select count(*) from public.inquiries)::int, 1,
  'A는 자기 사이트 문의를 본다'
);

select is(
  (select count(*) from public.site_versions)::int, 2,
  'A는 자기 사이트의 draft와 published를 모두 본다'
);

-- sites: 소유자가 수정할 수 있는 칼럼은 name, industry, template_id뿐
select lives_ok(
  $$ update public.sites set name = 'A 카페 본점', industry = 'food', template_id = 'food-basic'
     where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  'A는 자기 사이트의 상호·업종·템플릿을 수정할 수 있다'
);

select throws_ok(
  $$ update public.sites set status = 'paused'
     where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '42501', null, 'A는 사이트 공개 상태를 직접 바꿀 수 없다'
);

select throws_ok(
  $$ update public.sites set custom_domain = 'a.example.com'
     where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '42501', null, 'A는 연결 도메인을 직접 바꿀 수 없다'
);

select throws_ok(
  $$ update public.sites set slug = 'new-slug'
     where id = 'aaaaaaaa-0000-0000-0000-000000000001' $$,
  '42501', null, 'A는 slug를 직접 바꿀 수 없다'
);

-- site_versions: 소유자는 draft만 쓴다
-- 버전이 아직 없는 사이트(C의 초안 사이트)로 만들기를 확인한다.
select set_config('request.jwt.claims', '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc","role":"authenticated"}', true);

select lives_ok(
  $$ insert into public.site_versions (site_id, kind)
     values ('aaaaaaaa-0000-0000-0000-000000000002', 'draft') $$,
  'C는 자기 사이트의 draft를 만들 수 있다'
);

select throws_ok(
  $$ insert into public.site_versions (site_id, kind)
     values ('aaaaaaaa-0000-0000-0000-000000000002', 'published') $$,
  '42501', null, 'C는 published 버전을 직접 만들 수 없다'
);

select throws_ok(
  $$ update public.site_versions set kind = 'published'
     where site_id = 'aaaaaaaa-0000-0000-0000-000000000002' and kind = 'draft' $$,
  '42501', null, 'C는 draft를 published로 바꿀 수 없다'
);

select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

select lives_ok(
  $$ update public.site_versions set sections = '[{"type":"hero"}]'
     where site_id = 'aaaaaaaa-0000-0000-0000-000000000001' and kind = 'draft' $$,
  'A는 자기 사이트의 draft를 수정할 수 있다'
);

update public.site_versions set sections = '["직접 수정"]'
where site_id = 'aaaaaaaa-0000-0000-0000-000000000001' and kind = 'published';
select is(
  (select sections from public.site_versions
   where site_id = 'aaaaaaaa-0000-0000-0000-000000000001' and kind = 'published'),
  '[]'::jsonb,
  'A는 published 버전을 직접 수정할 수 없다'
);

-- storage: 자기 사이트 폴더에만 올린다
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner)
     values ('site-assets', 'aaaaaaaa-0000-0000-0000-000000000001/logo.png',
             '11111111-1111-1111-1111-111111111111') $$,
  'A는 자기 사이트 폴더에 파일을 올릴 수 있다'
);

-- business(가게 정보): 기존 draft 정책이 그대로 적용된다
select lives_ok(
  $$ update public.site_versions set business = '{"phone":"031-905-1234","hours":"매일 11:00–21:00"}'
     where site_id = 'aaaaaaaa-0000-0000-0000-000000000001' and kind = 'draft' $$,
  'A는 draft의 가게 정보를 수정할 수 있다'
);

select is(
  (select business ->> 'phone' from public.site_versions
   where site_id = 'aaaaaaaa-0000-0000-0000-000000000001' and kind = 'draft'),
  '031-905-1234',
  'draft의 가게 정보가 저장된다'
);

update public.site_versions set business = '{"phone":"010-0000-0000"}'
where site_id = 'aaaaaaaa-0000-0000-0000-000000000001' and kind = 'published';
select is(
  (select business from public.site_versions
   where site_id = 'aaaaaaaa-0000-0000-0000-000000000001' and kind = 'published'),
  '{}'::jsonb,
  'A는 published의 가게 정보를 직접 수정할 수 없다'
);

select throws_ok(
  $$ update public.site_versions set business = '[]'
     where site_id = 'aaaaaaaa-0000-0000-0000-000000000001' and kind = 'draft' $$,
  '23514', null, '가게 정보는 JSON 객체여야 한다'
);

-- 익명은 공개본의 가게 정보를 읽는다
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select is(
  (select business from public.site_versions
   where site_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
  '{}'::jsonb,
  '익명은 공개본의 가게 정보만 읽는다 (초안 값은 보이지 않는다)'
);

select * from finish();
rollback;
