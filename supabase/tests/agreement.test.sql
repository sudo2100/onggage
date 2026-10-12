-- 가입 동의 기록 검증. `pnpm test:db`로 실행한다.
begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data)
values
  -- 이메일 가입: 동의 정보가 metadata에 있다
  ('33333333-3333-3333-3333-333333333333', 'agree@example.com',
   '{"agreement":{"terms":true,"privacy":true,"age14":true,"version":"2026-10-12"}}', '{"provider":"email"}'),
  -- 소셜 첫 로그인 (metadata에 동의 없음)
  ('44444444-4444-4444-4444-444444444444', 'kakao@example.com', '{"name":"카카오 사용자"}', '{"provider":"kakao"}'),
  -- API로 직접 가입하며 일부만 true
  ('55555555-5555-5555-5555-555555555555', 'partial@example.com',
   '{"agreement":{"terms":true,"privacy":true,"age14":false,"version":"2026-10-12"}}', '{"provider":"email"}'),
  -- 값이 이상한 경우 (문자열 true, 버전이 숫자)
  ('66666666-6666-6666-6666-666666666666', 'weird@example.com',
   '{"agreement":{"terms":"yes","privacy":true,"age14":true,"version":1}}', '{"provider":"email"}');

select ok(
  (select terms_agreed_at is not null and privacy_agreed_at is not null and age_confirmed_at is not null
     and terms_version = '2026-10-12'
   from public.profiles where id = '33333333-3333-3333-3333-333333333333'),
  '이메일 가입의 동의 metadata를 트리거가 시각·버전과 함께 옮긴다'
);

select ok(
  (select terms_agreed_at is null and terms_version is null
   from public.profiles where id = '44444444-4444-4444-4444-444444444444'),
  '동의 metadata가 없으면 비워 둔다 (소셜 첫 로그인)'
);

select ok(
  (select terms_agreed_at is null from public.profiles where id = '55555555-5555-5555-5555-555555555555'),
  '세 항목 중 하나라도 true가 아니면 동의로 보지 않는다'
);

select ok(
  (select terms_agreed_at is null from public.profiles where id = '66666666-6666-6666-6666-666666666666'),
  '값의 형식이 이상하면 동의로 보지 않는다'
);

select results_eq(
  $$ select name, signup_source from public.profiles where id = '44444444-4444-4444-4444-444444444444' $$,
  $$ values ('카카오 사용자'::text, 'kakao'::text) $$,
  '기존 동작(이름·가입 경로) 유지'
);

-- 사용자 권한
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);

select throws_ok(
  $$ update public.profiles set terms_agreed_at = '2020-01-01', terms_version = '2026-10-12'
     where id = '44444444-4444-4444-4444-444444444444' $$,
  '42501', null, '사용자는 동의 칼럼을 직접 고칠 수 없다'
);

select lives_ok(
  $$ update public.profiles set name = '새 이름' where id = '44444444-4444-4444-4444-444444444444' $$,
  '이름은 직접 고칠 수 있다'
);

select lives_ok(
  $$ select public.record_signup_agreement('2026-10-12') $$,
  '로그인한 사용자는 record_signup_agreement로 동의를 기록한다'
);

select ok(
  (select terms_agreed_at is not null and privacy_agreed_at is not null and age_confirmed_at is not null
     and terms_version = '2026-10-12'
   from public.profiles where id = '44444444-4444-4444-4444-444444444444'),
  '기록 후 세 시각과 버전이 채워진다'
);

select throws_ok(
  $$ select public.record_signup_agreement(repeat('x', 21)) $$,
  '22023', null, '버전이 20자를 넘으면 거부한다'
);

-- 다른 사람 행은 바뀌지 않는다 (함수는 auth.uid() 행만 고친다)
reset role;
select ok(
  (select terms_agreed_at is null from public.profiles where id = '55555555-5555-5555-5555-555555555555'),
  '다른 사용자의 동의 기록은 그대로다'
);

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok(
  $$ select public.record_signup_agreement('2026-10-12') $$,
  '42501', null, '익명은 동의 기록 함수를 부를 수 없다'
);

select * from finish();
rollback;
