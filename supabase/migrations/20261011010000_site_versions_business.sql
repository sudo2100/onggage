-- 가게 정보(전화·주소·영업시간·카카오톡)를 버전별로 저장한다.
-- 초안·공개본 구조를 그대로 따르므로, 공개하기를 눌러야 공개 사이트에 반영된다.
-- 영업 안내·문의 섹션과 하단 버튼이 이 값을 읽는다. 형식 검증은 site-schema.ts(businessSchema)가 맡는다.
-- RLS는 행 단위라 기존 site_versions 정책(소유자는 draft만 쓰기)이 그대로 적용된다.

alter table public.site_versions
  add column business jsonb not null default '{}'::jsonb
    constraint site_versions_business_is_object check (jsonb_typeof(business) = 'object');
