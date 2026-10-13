# 온가게(가칭) — 소상공인 홈페이지 빌더

상호와 업종만 넣으면 AI가 홈페이지 초안을 만들어 주고, 문의·예약까지 한곳에서 운영하는 소상공인용 빌더.
기획안: Claude Docs "홈페이지 빌더 MVP 기획안" (기능 목록·화면 구성·요금제의 기준 문서)

## 기술 스택

- Next.js (App Router) + TypeScript (strict)
- 스타일: Tailwind CSS
- DB·인증: Supabase (Postgres + Auth + Storage)
- 검증: zod (사이트 데이터, 폼 입력, API 입력 모두)
- 패키지 매니저: pnpm
- 테스트: Vitest (단위), Playwright (주요 흐름 E2E)

## 폴더 구조

```
src/
  app/
    (marketing)/        # 랜딩, /designs, /pricing, /help
    (auth)/             # /login, /signup
    start/              # 온보딩 3단계
    studio/[siteId]/    # 편집실
    admin/              # 관리자 (대시보드, 문의, 설정, 요금)
    sites/[slug]/       # 공개 사이트 (미들웨어가 서브도메인을 여기로 rewrite)
  lib/
    site-schema.ts      # 사이트 JSON 스키마 (zod) — 모든 섹션 타입의 단일 기준
    templates/          # 업종별 템플릿 정의와 기본 섹션
    supabase/           # 서버·클라이언트 클라이언트 생성
  components/
    site/               # 공개 사이트와 편집실 미리보기가 함께 쓰는 섹션 컴포넌트
    studio/             # 편집실 전용 UI
supabase/migrations/    # SQL 마이그레이션
```

## 핵심 설계 원칙

1. **사이트는 HTML이 아니라 JSON으로 저장한다.** `sections[]` + `theme` 구조. 공개 사이트와 편집실 미리보기는 같은 섹션 컴포넌트(`components/site`)로 렌더링한다.
2. **초안과 공개본을 분리한다.** `site_versions`에 `kind = 'draft' | 'published'`. 편집은 항상 draft에만 저장하고, 공개 버튼을 눌러야 published가 갱신된다.
3. **공개 사이트는 서버 렌더링한다.** 검색 노출이 핵심이므로 공개 페이지에 클라이언트 전용 렌더링을 쓰지 않는다. 메타 태그·사이트맵을 서버에서 만든다.
4. **AI 결과는 스키마 검증을 통과해야 저장한다.** LLM 출력은 `site-schema.ts`로 parse하고, 실패하면 템플릿 기본값으로 대체한다.
5. **자유 배치(드래그 앤 드롭 캔버스)는 만들지 않는다.** 섹션 추가·삭제·순서 변경·텍스트 수정만 지원한다.

## 데이터 모델 (요약)

| 테이블 | 주요 필드 |
| --- | --- |
| profiles | id (auth.users 참조), 이름, 가입 경로, 생성일 |
| sites | id, owner_id, 상호, 업종, slug(서브도메인), custom_domain, status(draft/published/paused), template_id |
| site_versions | id, site_id, kind(draft/published), sections(jsonb), theme(jsonb), created_at |
| inquiries | id, site_id, 이름, 연락처, 내용, status(new/doing/done), created_at |
| subscriptions | id, site_id, plan(free/basic/pro), 시작일, 만료일, 결제 방식 |
| assets | id, site_id, storage_path, 크기 |

- 모든 테이블에 RLS를 켠다. 소유자만 자기 사이트·문의·버전에 접근한다.
- `inquiries` insert는 익명 허용 (공개 사이트 문의 폼). 단, rate limit과 서버 측 검증을 거친다.

## 업종과 템플릿

1차 업종: `food`(음식·카페), `beauty`(뷰티·헤어), `stay`(숙박), `pro`(전문 서비스).
섹션 타입: `hero`, `about`, `list`, `info`, `contact`, `notice`, `gallery`, `reviews`.

## 코드 규칙

- UI 문구는 한국어. 사용자에게 보이는 말은 사용자가 아는 단어로 쓴다 (예: "초안 자동 저장됨", "공개하기").
- 서버 컴포넌트가 기본. 상태가 필요한 곳에만 `"use client"`.
- DB 접근은 서버(Server Action, Route Handler)에서만. 클라이언트에 service role 키를 절대 노출하지 않는다.
- 비밀값은 `.env.local`에만 두고 커밋하지 않는다. 새 환경변수는 `.env.example`에 키 이름을 추가한다.
- 새 기능에는 최소 하나의 테스트를 함께 추가한다.

## 권한이 필요한 서버 작업 규칙

주인만 할 수 있는 일(공개하기, 공개 상태 변경, 주소 변경, 편집 저장 등)과 익명이 하는 일(공개 사이트 문의)을 서버에서 처리할 때 지킨다.

1. **로그인 확인은 `getUser()`로 한다.** `getSession()`은 쿠키를 검증 없이 읽으므로 권한 판단에 쓰지 않는다. (`src/lib/auth.ts`)
2. **주인 확인을 맨 먼저 하고, 실패하면 404.** 남의 사이트와 없는 사이트를 구분하지 않는다. RLS상 로그인 사용자는 남의 *공개된* 사이트도 조회할 수 있으므로, 내 사이트 조회는 항상 `owner_id`로 거른다.
3. **공통 함수로 묶는다.** 편집실 화면과 편집실 Server Action은 `requireSiteOwner(siteId)`(`src/lib/require-site-owner.ts`)로 시작한다. 같은 확인을 곳곳에 따로 쓰지 않는다.
4. **가능하면 service role 대신 security definer 함수.** DB 함수 안에서 `auth.uid()`가 주인인지 다시 확인하고, `set search_path = ''`로 고정하고, `anon`·`public`의 실행 권한을 회수한다. 서버는 사용자 클라이언트로 그 함수를 호출한다 (예: `publish_site`, `set_site_status`). service role은 결제 웹훅·익명 문의 저장처럼 사용자 권한으로 할 수 없는 곳에만 쓴다.
5. **익명 작업은 검증 → 횟수 제한 → 저장 순서.** 입력을 zod로 검증하고, IP·사이트별 횟수 제한을 통과한 뒤에만 저장한다. 대상이 공개된 사이트인지도 확인한다.
6. **모든 권한 작업에 "남의 사이트는 거부" 테스트를 붙인다.** DB 함수는 pgTAP으로(주인 성공, 다른 사용자 거부, 익명 거부), 화면은 E2E로(남의 편집실 404) 확인한다.

## 명령어

```
pnpm dev          # 개발 서버
pnpm lint         # ESLint
pnpm typecheck    # tsc --noEmit
pnpm test         # Vitest
pnpm e2e          # Playwright
supabase db reset # 로컬 DB 초기화 + 마이그레이션 적용
```

## 작업 방식

- 큰 기능은 먼저 계획을 제시하고, 승인 후 구현한다.
- 작업 하나가 끝나면 `pnpm lint && pnpm typecheck && pnpm test`를 통과시킨 뒤 커밋한다.
- MVP 범위(기획안 P0) 밖의 기능을 임의로 추가하지 않는다. 필요해 보이면 제안만 한다.

## MVP에서 하지 않는 것

자유 배치 편집, 쇼핑몰 결제, 다국어, 회원제 기능.
