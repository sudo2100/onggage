-- 온보딩: create_site_with_draft, 한 사람당 사이트 하나, slug 자동 번호. `pnpm test:db`로 실행한다.
begin;
create extension if not exists pgtap with schema extensions;

select plan(20);

insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data)
values
  ('d0000000-0000-0000-0000-000000000001', 'd1@example.com', '{}', '{"provider":"email"}'),
  ('d0000000-0000-0000-0000-000000000002', 'd2@example.com', '{}', '{"provider":"email"}'),
  ('d0000000-0000-0000-0000-000000000003', 'd3@example.com', '{}', '{"provider":"email"}'),
  ('d0000000-0000-0000-0000-000000000004', 'd4@example.com', '{}', '{"provider":"email"}'),
  ('d0000000-0000-0000-0000-000000000005', 'd5@example.com', '{}', '{"provider":"email"}'),
  ('d0000000-0000-0000-0000-000000000006', 'd6@example.com', '{}', '{"provider":"email"}');

-- 테스트에서 반복해 쓰는 초안 내용
create temporary table draft as
select
  '[{"id":"hero","type":"hero","visible":true,"title":"담소 식당","subtitle":"","ctaLabel":"예약하기"}]'::jsonb as sections,
  '{"accent":"#7A4B1F","font":"myeongjo","layout":"split"}'::jsonb as theme,
  '{"phone":"031-905-1234"}'::jsonb as business;
grant select on draft to authenticated, anon;

set local role authenticated;

-- 사용자 1: 처음 만들기
select set_config('request.jwt.claims', '{"sub":"d0000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

select results_eq(
  $$ select site_slug from public.create_site_with_draft('담소 식당', 'food', 'food-a', 'warm', 'pgtap-dup-slug',
       (select sections from draft), (select theme from draft), (select business from draft)) $$,
  $$ values ('pgtap-dup-slug'::text) $$,
  '사이트를 만들고 slug를 돌려준다'
);

select results_eq(
  $$ select s.name, s.industry::text, s.template_id, s.tone::text, s.status::text
     from public.sites s where s.owner_id = 'd0000000-0000-0000-0000-000000000001' $$,
  $$ values ('담소 식당'::text, 'food'::text, 'food-a'::text, 'warm'::text, 'draft'::text) $$,
  '상호·업종·디자인·말투를 저장하고 초안 상태로 만든다'
);

select results_eq(
  $$ select v.kind::text, jsonb_array_length(v.sections), v.theme ->> 'accent', v.business ->> 'phone'
     from public.site_versions v join public.sites s on s.id = v.site_id
     where s.owner_id = 'd0000000-0000-0000-0000-000000000001' $$,
  $$ values ('draft'::text, 1, '#7A4B1F'::text, '031-905-1234'::text) $$,
  '같은 트랜잭션에서 draft 버전을 함께 만든다 (published는 없다)'
);

select throws_ok(
  $$ select * from public.create_site_with_draft('담소 식당 2호점', 'food', 'food-a', 'calm', 'damso-2',
       (select sections from draft), (select theme from draft), (select business from draft)) $$,
  'P0001', 'site_already_exists', '두 번째 사이트 생성 거부 (함수)'
);

select throws_ok(
  $$ insert into public.sites (owner_id, name, industry, slug)
     values ('d0000000-0000-0000-0000-000000000001', '몰래 만든 가게', 'food', 'sneaky-shop') $$,
  '23505', null, '두 번째 사이트 생성 거부 (API로 직접 insert해도 DB가 막는다)'
);

select is(
  (select count(*) from public.sites where owner_id = 'd0000000-0000-0000-0000-000000000001')::int, 1,
  '사이트는 여전히 하나다'
);

-- 사용자 2: 같은 slug → 번호가 붙는다. 사용자 1의 초안 사이트는 보이지 않는다.
select set_config('request.jwt.claims', '{"sub":"d0000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

select is(
  (select count(*) from public.sites where slug = 'pgtap-dup-slug')::int, 0,
  '남의 초안 사이트는 보이지 않는다'
);

select results_eq(
  $$ select site_slug from public.create_site_with_draft('담소 식당', 'food', 'food-b', 'calm', 'pgtap-dup-slug',
       (select sections from draft), (select theme from draft), (select business from draft)) $$,
  $$ values ('pgtap-dup-slug-2'::text) $$,
  '보이지 않는 사이트와 slug가 겹쳐도 -2를 붙여 만든다'
);

-- 사용자 3: 예약어 → 번호가 붙는다
select set_config('request.jwt.claims', '{"sub":"d0000000-0000-0000-0000-000000000003","role":"authenticated"}', true);

select results_eq(
  $$ select site_slug from public.create_site_with_draft('관리자 식당', 'food', 'food-a', 'calm', 'admin',
       (select sections from draft), (select theme from draft), (select business from draft)) $$,
  $$ values ('admin-2'::text) $$,
  '예약어 slug는 -2를 붙여 만든다'
);

-- 사용자 4: 30자 slug가 겹치면 번호가 들어갈 자리만큼 자른다
select set_config('request.jwt.claims', '{"sub":"d0000000-0000-0000-0000-000000000004","role":"authenticated"}', true);

select results_eq(
  $$ select site_slug from public.create_site_with_draft('긴 이름', 'food', 'food-a', 'calm', repeat('q', 30),
       (select sections from draft), (select theme from draft), (select business from draft)) $$,
  $$ values (repeat('q', 30)) $$,
  '30자 slug를 그대로 쓴다'
);

select set_config('request.jwt.claims', '{"sub":"d0000000-0000-0000-0000-000000000005","role":"authenticated"}', true);

select results_eq(
  $$ select site_slug from public.create_site_with_draft('긴 이름', 'food', 'food-a', 'calm', repeat('q', 30),
       (select sections from draft), (select theme from draft), (select business from draft)) $$,
  $$ values (repeat('q', 28) || '-2') $$,
  '30자 slug가 겹치면 잘라서 -2를 붙인다 (30자 이내)'
);

-- 사용자 6: 실패하면 아무것도 남지 않는다
select set_config('request.jwt.claims', '{"sub":"d0000000-0000-0000-0000-000000000006","role":"authenticated"}', true);

select throws_ok(
  $$ select * from public.create_site_with_draft('빈 가게', 'food', 'food-a', 'calm', 'empty-shop',
       '[]'::jsonb, (select theme from draft), '{}'::jsonb) $$,
  '22023', null, '빈 sections로는 만들지 않는다'
);

select throws_ok(
  $$ select * from public.create_site_with_draft('빈 가게', 'food', 'food-a', 'calm', 'empty-shop',
       (select sections from draft), '{}'::jsonb, '{}'::jsonb) $$,
  '22023', null, '빈 theme로는 만들지 않는다'
);

select throws_ok(
  $$ select * from public.create_site_with_draft('잘못된 가게', 'food', 'food-a', 'calm', 'bad-shop',
       (select sections from draft), (select theme from draft), '[]'::jsonb) $$,
  '23514', null, 'draft 저장이 실패하면(가게 정보가 배열) 오류가 난다'
);

select is(
  (select count(*) from public.sites where owner_id = 'd0000000-0000-0000-0000-000000000006')::int, 0,
  'draft 저장이 실패하면 사이트 행도 만들어지지 않는다'
);

select throws_ok(
  $$ select * from public.create_site_with_draft('대문자', 'food', 'food-a', 'calm', 'Bad_Slug',
       (select sections from draft), (select theme from draft), '{}'::jsonb) $$,
  '23514', null, '형식이 틀린 slug는 번호를 붙이지 않고 거부한다'
);

select throws_ok(
  $$ select * from public.create_site_with_draft('말투', 'food', 'food-a', 'loud', 'tone-shop',
       (select sections from draft), (select theme from draft), '{}'::jsonb) $$,
  '22P02', null, '말투는 정해진 3가지만'
);

select is(
  (select count(*) from public.sites where owner_id = 'd0000000-0000-0000-0000-000000000006')::int, 0,
  '실패한 시도는 사이트를 남기지 않는다'
);

-- 말투 기본값과 익명
reset role;
select is(
  (select tone::text from public.sites where id = (
     select id from public.sites where owner_id = 'd0000000-0000-0000-0000-000000000002')),
  'calm',
  '고른 말투가 저장된다'
);

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok(
  $$ select * from public.create_site_with_draft('익명', 'food', 'food-a', 'calm', 'anon-shop',
       (select sections from draft), (select theme from draft), '{}'::jsonb) $$,
  '42501', null, '익명은 사이트를 만들 수 없다'
);

select * from finish();
rollback;
