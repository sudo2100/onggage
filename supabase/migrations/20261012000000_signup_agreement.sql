-- 가입 동의 기록: 이용약관·개인정보 처리방침·만 14세 이상 동의 시각과 약관 버전.
-- 시각은 항상 DB의 now()로 남긴다. 사용자가 직접 고칠 수 없고, 아래 두 경로로만 기록된다.
--   1) 이메일 가입: 가입 요청의 user metadata(agreement)를 handle_new_user 트리거가 옮긴다.
--      (인증 메일을 켜면 가입 직후 세션이 없어서 앱이 따로 기록할 수 없다.)
--   2) 소셜 로그인·기록이 없는 사용자: /signup/agree에서 record_signup_agreement()를 부른다.
-- 앱은 기록이 없거나 버전이 현재 약관과 다르면 /signup/agree로 보낸다 (src/lib/agreement.ts).

alter table public.profiles
  add column terms_agreed_at timestamptz,
  add column privacy_agreed_at timestamptz,
  add column age_confirmed_at timestamptz,
  add column terms_version text
    constraint profiles_terms_version_length check (char_length(terms_version) between 1 and 20);

-- 본인 프로필 수정은 이름만. 동의 칼럼은 아래 함수로만 바뀐다.
revoke update on public.profiles from anon, authenticated;
grant update (name) on public.profiles to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  agreement jsonb := new.raw_user_meta_data -> 'agreement';
  agreed boolean;
begin
  -- 세 항목이 모두 true이고 버전이 1~20자 문자열일 때만 동의로 본다. 아니면 비워 둔다.
  agreed := coalesce(
    jsonb_typeof(agreement) = 'object'
    and agreement -> 'terms' = 'true'::jsonb
    and agreement -> 'privacy' = 'true'::jsonb
    and agreement -> 'age14' = 'true'::jsonb
    and jsonb_typeof(agreement -> 'version') = 'string'
    and char_length(agreement ->> 'version') between 1 and 20,
    false
  );

  insert into public.profiles (
    id, name, signup_source,
    terms_agreed_at, privacy_agreed_at, age_confirmed_at, terms_version
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name'),
    new.raw_app_meta_data ->> 'provider',
    case when agreed then now() end,
    case when agreed then now() end,
    case when agreed then now() end,
    case when agreed then agreement ->> 'version' end
  );
  return new;
end;
$$;

create function public.record_signup_agreement(agreed_version text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다' using errcode = '42501';
  end if;
  if agreed_version is null or char_length(agreed_version) not between 1 and 20 then
    raise exception '약관 버전이 올바르지 않습니다' using errcode = '22023';
  end if;

  update public.profiles
  set terms_agreed_at = now(),
      privacy_agreed_at = now(),
      age_confirmed_at = now(),
      terms_version = agreed_version
  where id = auth.uid();
end;
$$;

revoke execute on function public.record_signup_agreement(text) from public, anon;
grant execute on function public.record_signup_agreement(text) to authenticated;
