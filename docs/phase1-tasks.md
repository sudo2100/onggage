# 1단계 작업 지시문 (1~4주차: 기반)

Claude Code에 한 번에 하나씩 붙여 넣어 쓰는 지시문입니다. 각 작업이 끝나면 완료 기준을 확인하고 커밋한 뒤 다음으로 넘어가세요.
시작 전 준비: Node.js LTS, pnpm, Docker(로컬 Supabase용), Supabase CLI(`pnpm add -D supabase`), Git, GitHub CLI(`gh`).

## 진행 현황

| 작업 | 내용 | 상태 | PR |
| --- | --- | --- | --- |
| 0 | 프로젝트 생성 | 완료 | #1 |
| 1 | 로컬 Supabase와 DB 스키마 | 완료 | #2 |
| 2 | 사이트 JSON 스키마 | 완료 | #3 |
| 3 | 디자인 8종과 섹션 컴포넌트 | 완료 | #4 |
| 3-2 | 랜딩·디자인 목록·요금 안내 | 완료 | #5 |
| 4 | 가입·로그인 | 완료 | #6 |
| 5 | 온보딩 3단계와 사이트 생성 | 완료 | #7 |
| 6 | 서브도메인 라우팅과 공개 페이지 | 완료 | #8 |
| 7 | 상태 확인 엔드포인트 | 검토 대기 (`feat/health`) | |

## 작업 흐름

1. 최신 `main`에서 시작한다: `git switch main` → `git pull` → 이전 작업 브랜치 삭제(`git branch -d ...`).
2. 지시문 앞에 "main에서 `feat/...` 브랜치를 만들어 작업해 줘. 계획 먼저 보여 줘."를 붙인다.
3. Claude Code가 계획과 "정해 주셔야 할 것"을 보여 주면 검토 후 답한다.
4. 끝나면 `pnpm lint`, `typecheck`, `test`(+ 필요 시 `test:db`, `e2e`)를 통과시키고 커밋한다.
5. Claude Code가 push하고 `gh`로 PR을 만든다. **병합은 사용자가 직접 한다.** `main`에 직접 push하지 않는다.
6. 병합 전에 PR을 검토받는다.

## Supabase 환경 기준

| 환경 | 어디서 | 플랜·지역 | 용도 |
| --- | --- | --- | --- |
| 로컬 | 내 컴퓨터 (`pnpm exec supabase start`, Docker) | 무료 | 1단계 개발 전부. 클라우드 없이 진행 |
| 스테이징 | supabase.com 프로젝트 | Free · 서울(`ap-northeast-2`) | 배포 테스트용. 1주일 미사용 시 정지되므로 실제 고객 데이터는 넣지 않음 |
| 운영 | supabase.com 프로젝트 | Pro · 서울(`ap-northeast-2`) | 베타 공개(3단계)부터. 매일 자동 백업 7일 보관 |

- 키는 세 가지다. `NEXT_PUBLIC_SUPABASE_URL`과 `NEXT_PUBLIC_SUPABASE_ANON_KEY`는 브라우저에 노출돼도 되는 키라 RLS가 보호한다. `SUPABASE_SERVICE_ROLE_KEY`는 RLS를 무시하는 관리자 키라 서버에서만, 꼭 필요한 곳에만 쓴다.
- 지역은 프로젝트를 만들 때 정하면 나중에 바꿀 수 없으니 처음부터 서울로 만든다.
- 로컬 주소는 `http://localhost:3000`으로 통일한다. `127.0.0.1`과 섞으면 로그인 쿠키가 따로 놀아 로그인이 풀린다.

## 공통 원칙: 주인이 DB에서 직접 할 수 없는 작업

작업 1 검토 후 RLS를 좁혀서, 주인은 공개하기·사이트 상태 변경·도메인 연결·문의 저장을 DB에서 직접 할 수 없습니다. 이 기능들은 서버 코드로 만들고, CLAUDE.md의 "권한이 필요한 서버 작업 규칙"을 따릅니다.

| 기능 | 만드는 작업 | 방식 | 서버가 확인할 것 |
| --- | --- | --- | --- |
| 공개하기 | 작업 6 | DB 함수 `publish_site(site_id)`를 사용자 클라이언트로 호출 | 함수 안에서 `auth.uid()`가 주인인지 |
| 사이트 상태 변경 (공개 중지 등) | 작업 6 | DB 함수 `set_site_status(site_id, status)` | 주인인지, 허용된 상태 전환인지 |
| 문의 저장 | 3단계 | Route Handler + service role | 입력 검증, 횟수 제한, 공개된 사이트인지 |
| 도메인 연결 | 3단계 이후 (프로 요금제) | Server Action + service role | 주인인지, 프로 요금제인지, 도메인 소유 확인(DNS) |
| 구독 변경 | 3단계 (결제) | 결제 웹훅 + service role | 결제사 서명 검증 |

## 공통 원칙: 사이트 데이터 다루기 (작업 2에서 정함)

- 사이트 한 버전 = `site_versions`의 `sections` + `theme` + `business` 세 칼럼. 기준은 `src/lib/site-schema.ts`.
- **저장할 때는 엄격하게:** 편집실 저장·온보딩은 `validateSiteContent`로 검증하고, 실패하면 저장하지 않고 오류를 돌려준다.
- **AI 생성 결과:** `resolveGeneratedContent`로 검증하고, 실패하면 전체를 업종 템플릿으로 바꾼다.
- **읽을 때는 관대하게:** 화면을 그릴 때는 `parseSiteContent(raw, { industry, siteName })`로 깨진 부분만 고치고, 돌려받은 `issues`는 사이트 id와 함께 서버 로그에 남긴다.
- **가게 정보(전화·주소·영업시간·카카오톡)는 `business`에 둔다.** 섹션이 아니므로 섹션을 지우거나 숨겨도 남는다. 초안·공개본을 따르므로 공개하기를 눌러야 반영된다.
- 빈 칸은 "입력 안 함"으로 저장하고, 전화번호의 공백은 하이픈으로 정리한다.

---

## 작업 0. 프로젝트 생성 (완료, PR #1)

```
Next.js(App Router) + TypeScript strict + Tailwind + ESLint로 새 프로젝트를 pnpm으로 만들어 줘.
CLAUDE.md의 폴더 구조대로 빈 폴더와 index 파일을 만들고, Vitest와 Playwright를 설정해 줘.
package.json에 dev, lint, typecheck, test, e2e 스크립트를 추가하고 .env.example도 만들어 줘.
먼저 계획을 보여 주고, 승인하면 진행해.
```

완료 기준: `pnpm dev`로 빈 페이지가 뜨고, `pnpm lint && pnpm typecheck && pnpm test`가 통과한다.

결과: Next.js 16.4, 본문 글꼴 Pretendard(`next/font/local`, OFL 라이선스 동봉). `next.config.ts`에 `cacheComponents`가 켜져 있어, 로그인 정보를 읽는 화면은 캐시되지 않게 주의해야 한다(작업 4).

---

## 작업 1. 로컬 Supabase와 DB 스키마 (완료, PR #2)

```
supabase init으로 로컬 Supabase를 설정하고, CLAUDE.md의 데이터 모델대로 첫 마이그레이션을 작성해 줘.
- 모든 테이블에 RLS를 켜고, 소유자만 자기 데이터에 접근하는 정책을 넣어 줘.
- 주인이 직접 할 수 있는 것과 없는 것은 위 "공통 원칙"대로:
  site_versions는 draft만 쓸 수 있고, sites는 name, industry, template_id 칼럼만 수정할 수 있게 해 줘(칼럼 권한).
  사이트를 만들 때는 status='draft', custom_domain 없음으로만 허용해.
- inquiries는 익명 insert를 허용하지 마. 조회·상태 변경·삭제는 사이트 소유자만.
- sites.slug는 유니크, 영문 소문자·숫자·하이픈 3~30자, 하이픈으로 시작·끝나지 않게.
  www, admin, api, app, mail, static, assets 같은 예약어는 막아 줘.
- 회원가입 시 profiles 행을 자동으로 만드는 트리거를 넣어 줘.
- site_versions의 sections와 theme은 jsonb로 두고, 사이트당 draft·published가 하나씩만 있도록 (site_id, kind) 유니크 제약을 걸어 줘.
- Storage에 site-assets 버킷을 만들어 줘. 경로는 {site_id}/{파일명}, 사이트 소유자만 업로드·삭제하고 공개 사이트에서는 읽기만 가능하게 정책을 넣어 줘.
  파일 하나 5MB, 이미지 형식만 허용(SVG 제외).
- config.toml의 site_url과 additional_redirect_urls는 http://localhost:3000으로.
그리고 supabase gen types로 TypeScript 타입(database.types.ts)을 생성해 src/lib/supabase/에 두고 커밋해.
src/lib/supabase/에는 서버용(쿠키 기반 세션)과 브라우저용 클라이언트를 따로 만들고, service role 클라이언트는 server-only로 막아 줘.
.env.example에 NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY 키 이름을 추가해 줘.
```

완료 기준: `supabase db reset`이 오류 없이 끝나고, `pnpm test:db`(pgTAP)가 통과한다.
- 다른 사용자의 사이트·문의·버전을 읽거나 고칠 수 없다 (RLS)
- 주인이 published 버전·status·custom_domain을 직접 바꿀 수 없다
- 익명은 문의를 넣을 수 없다
- 다른 사용자의 사이트 폴더에 사진을 올릴 수 없다 (Storage 정책)
- 예약어 slug가 거부된다
- service role 클라이언트를 클라이언트 컴포넌트에서 import하면 빌드가 실패한다

결과: pgTAP 테스트 34개.

---

## 작업 2. 사이트 JSON 스키마 (완료, PR #3)

```
src/lib/site-schema.ts에 사이트 데이터 스키마를 zod로 다시 정의해 줘.
- 섹션 8종(hero, about, list, info, contact, notice, gallery, reviews)을 type별로 필드가 다른 discriminated union으로.
  공통 필드는 id, visible. 필드는 클릭 프로토타입과 같게, 가격은 "80,000원부터"처럼 문자열로.
  info와 contact는 제목만 갖고 연락처는 business에서 읽어.
- theme: accent(hex), font(myeongjo | batang | dodum | plex), layout(split | center), photo(Storage 경로, 선택).
- business: phone, address, hours, kakao (모두 선택). 새 마이그레이션으로 site_versions.business jsonb 칼럼 추가(기본값 '{}', 객체만 허용).
- 빈 문자열은 입력 안 함(undefined)으로, 전화번호 공백은 하이픈으로 정리.
- 저장용 validateSiteContent(엄격), AI 결과용 resolveGeneratedContent(실패 시 전체 템플릿),
  읽기용 parseSiteContent(raw, { industry, siteName })(관대, { content, issues } 반환)를 src/lib/site-content.ts에 만들어 줘.
  읽기용은 theme는 필드 단위로, sections는 깨진 섹션만 빼고, 남는 섹션이 없으면 템플릿 섹션을 써.
- src/lib/templates/에 4개 업종의 기본 초안(섹션 내용)을 넣어 줘. 가게 정보는 비워 둬.
```

완료 기준: 잘못된 섹션 타입, 너무 긴 제목, 잘못된 색상값이 거부되고, 빈 theme이 기본값으로 대체되며, 빈 전화번호는 저장되고 띄어쓴 번호는 하이픈으로 정리된다.

결과: 단위 테스트 34개. 괄호·점·국제번호(`(031) 905-1234`, `010.1234.5678`, `+82 ...`)는 지금 거부된다. 편집실 입력칸(2단계)에서 안내 문구를 보여 주거나 하이픈으로 바꿔 줄 것.

---

## 작업 3. 디자인 8종과 섹션 컴포넌트 (완료, PR #4)

```
main에서 feat/site-renderer 브랜치를 만들어 작업해 줘. 계획 먼저 보여 줘.
- 업종별 기본 초안(섹션 내용)은 작업 2에서 이미 만들었으니 다시 만들지 마.
  src/lib/templates/designs.ts에 업종마다 디자인 2개(theme: accent, font, layout + 이름, 설명 한 줄)를 정의해.
  이름과 색은 클릭 프로토타입을 따르고, 디자인 id(food-a 등)는 sites.template_id에 들어갈 값이야.
  getTemplateTheme은 이 목록에서 -a 디자인 값을 읽도록 바꿔 중복을 없애.
- 섹션 컴포넌트는 서버 컴포넌트로, 화면을 그리기만 해. 편집 기능은 넣지 마. 진입점은 <SiteRenderer content industry siteName />.
- 공개 사이트는 앱의 다크 모드와 상관없이 밝은 화면으로 고정해.
- 배경색·글자색은 accent에서 CSS color-mix로 계산해. 대비를 확인해서 accent 위 버튼 글자는 흰색/검정 중 대비가 높은 쪽,
  accent를 글자색으로 쓸 땐 배경 대비 4.5:1 이상이 되게 어둡게 보정해.
- 영업 안내·문의 섹션과 하단 고정 버튼(전화·카카오톡·길찾기)은 business 값을 읽어. 값이 없는 항목은 숨기고, 셋 다 없으면 버튼 줄을 숨겨.
  하단 버튼은 모바일 폭(768px 미만)에서만. 전화는 tel:, 길찾기는 주소로 네이버 지도 검색 링크.
- kakao는 채널 링크(https://pf.kakao.com/_로 시작)와 오픈채팅 링크(https://open.kakao.com/o/로 시작)만 링크로 허용하고,
  그 밖의 링크는 validateSiteContent에서 거부해. @아이디만 있으면 영업 안내에 글자로만 보여 주고 하단 버튼은 숨겨.
- 문의 폼은 모양만 만들고 저장 기능은 넣지 마. 보내기 버튼은 type="button" (3단계에서 서버 Route Handler로 붙일 거야).
- 손님 후기(reviews)는 이번에는 그리지 마. 예시 후기가 실제 후기처럼 보이면 안 돼.
- 글꼴은 next/font로 4종을 정의하되 preload를 끄고, 사이트 theme 글꼴 하나만 제목에 적용해. 본문은 Pretendard.
- 사장님이 쓴 글은 텍스트로만 렌더링하고 dangerouslySetInnerHTML은 쓰지 마. 줄바꿈은 white-space: pre-line.
- 사진이 없으면 accent 색 배경으로 대신하고, theme.photo가 있으면 Storage 공개 주소를 next/image로 보여 줘.
- 바닥글에 "© 상호"와 "온가게로 만든 홈페이지" 표시. 요금제별 숨김은 나중에.
- /dev/preview는 개발 환경에서만 열리게 하고, 8개 디자인을 PC(980px)와 모바일(390px) iframe으로 나란히 보여 줘.
  디자인 하나만 보는 /dev/preview/[designId]도 만들고, 가게 정보가 빈 경우도 볼 수 있게 해 줘.
- /sites/[slug]에 실제 DB를 연결하는 건 작업 6에서 할 거니까 이번엔 하지 마.
테스트:
- Vitest: 8개 디자인 렌더링, hero에 상호 표시, business가 비면 하단 버튼 숨김, 일부만 있으면 해당 버튼만,
  영업 안내 빈 항목 숨김, <script>가 텍스트로 나옴, 사진 경로가 Storage 공개 주소로 바뀜, 밝은 accent(#F0C24B)의 대비 보정,
  허용되지 않은 카카오 링크 거부.
- Playwright: 390px에서 가로 스크롤 없음, 하단 버튼 표시·숨김,
  글꼴은 theme 글꼴 한 종류 + Pretendard만 내려받고 나머지 3종은 하나도 안 받음(한글 글꼴은 글자 범위별로 여러 파일로 나뉨).
끝나면 PR까지 만들어 줘. 병합은 내가 할게.
```

완료 기준: 8개 디자인이 `/dev/preview`에서 PC·모바일 모두 깨지지 않고, 위 테스트가 모두 통과한다.

검토 후 추가 반영 (커밋 `8ac04fe`):
- hero 버튼을 `#contact` 링크로 (문의 섹션이 숨겨져 있으면 링크 없이)
- 문의 폼은 저장 기능 전까지 보내기 버튼 비활성화 + "온라인 문의는 준비 중이에요. 전화나 카카오톡으로 연락해 주세요." (`inquiryEnabled` prop으로 제어, 기본값 꺼짐)
- 사진 없는 gallery는 공개 화면에서 숨김 (편집실 자리 표시는 `showPlaceholders` prop으로)
- 카카오 채널 링크 끝의 `/chat` 허용

결과: 단위 테스트 82개. 디자인 id(`food-a` 등)가 `sites.template_id` 값이다.

`SiteRenderer` 사용법 (이후 작업 공통):

| prop | 기본값 | 켜는 곳 |
| --- | --- | --- |
| `inquiryEnabled` | `false` | 3단계 문의 저장 기능을 붙인 뒤 공개 사이트에서 |
| `showPlaceholders` | `false` | 편집실 미리보기 (빈 사진 모음 자리 표시) |
| `embedded` | `false` | 미리보기를 여러 개 그릴 때 (마케팅 화면, 편집실). 제목이 h1/h2가 아니고 섹션 id가 없으며 hero 버튼이 링크가 아니다 |

- 섹션 배치는 화면 폭이 아니라 **사이트 상자 폭**(컨테이너 쿼리 `@container`)에 반응한다. 편집실 미리보기를 좁은 상자에 넣으면 모바일 배치로 그려진다.
- 루트에 `overflow-wrap: anywhere`가 걸려 있어, 띄어쓰기 없는 긴 글·긴 링크도 넘치지 않는다. 한글은 `break-keep`으로 단어 단위 줄바꿈을 유지한다.
- 공개 사이트는 theme 글꼴 한 종류 + Pretendard만 내려받는다. 디자인 목록처럼 여러 디자인을 한 화면에 보여 주는 곳은 예외다.

---

## 작업 3-2. 랜딩·디자인 목록·요금 안내 (검토 완료, PR #5 병합 대기)

마케팅 화면은 MVP 기획안의 P0지만 처음 작업 목록에서 빠져 있었다. 작업 3의 디자인 8종과 `SiteRenderer`를 그대로 쓰므로 이 시점에 만든다. 화면 구성은 클릭 프로토타입(온가게 프로토타입)의 랜딩·디자인 선택·요금 표를 따른다.

```
main에서 feat/marketing 브랜치를 만들어 작업해 줘. 계획 먼저 보여 줘. 화면 구성은 클릭 프로토타입을 따라.
(marketing) 그룹에 아래 화면을 만들어 줘. 모두 서버 렌더링, 검색 노출 대상이야.

1. 랜딩 /
- 첫 화면: "상호만 넣으면 우리 가게 홈페이지가 바로 생겨요" 제목, 상호 입력칸 + 업종 선택, "내 가게 디자인 보기" 버튼.
  업종별 예시 상호 칩(담소 식당, 결 헤어, 숲속 쉼표 스테이, 바른 세무회계)을 누르면 입력칸이 채워져.
- 옆(모바일은 아래)에 선택한 업종 -a 디자인의 축소 미리보기. SiteRenderer를 축소해서 보여 주고, 상호를 바꾸면 미리보기 제목도 바뀌어.
  이 부분만 클라이언트 컴포넌트로 두고, 미리보기 안의 링크·버튼은 눌리지 않게 해.
- "내 가게 디자인 보기"를 누르면 /designs?name=상호&industry=업종 으로 이동.
- 3단계 설명(상호 입력 → AI 초안 → 눌러서 고치고 공개)과 요금 요약(무료로 공개, 필요한 만큼만 유료), 하단 CTA.

2. 디자인 목록 /designs
- 8개 디자인 카드. 업종 필터(내 업종 / 전체 / 업종별). 쿼리의 name·industry가 있으면 그 업종을 먼저, 카드 미리보기에 그 상호를 넣어 보여 줘 ("내 상호 적용됨" 표시).
  name이 없으면 업종별 예시 상호를 써.
- 카드를 누르면 /designs/[designId] 로 이동 (쿼리 유지).

3. 디자인 상세 /designs/[designId]
- 디자인 이름·설명·업종, PC/모바일 전환 미리보기(SiteRenderer, 예시 가게 정보 포함).
- "이 디자인으로 시작" 버튼: /signup?next=/start?design=…&name=… 로 이동. 가입·온보딩은 작업 4·5에서 만들 거라 지금은 링크만.
- 없는 designId는 404.

4. 요금 안내 /pricing
- 무료·베이직·프로 비교표 (월 0원 / 6,900원 / 13,900원, 연 0원 / 69,000원 / 139,000원, 공개 주소, 하단 로고, 사진 장수, 문의 알림, 예약·통계, AI 도우미 횟수).
  가격·항목은 src/lib/plans.ts 한 곳에 정의하고 화면은 거기서 읽어. 나중에 결제·제한 기능도 같은 파일을 쓸 거야.
- 결제 기능은 없음. 버튼은 "무료로 시작하기"(→ /designs) 하나만.
- 월/연 전환 토글은 넣지 말고 표에 월·연 가격을 함께 보여 줘.

공통
- 상단 바: 로고(온가게), 디자인·요금 안내 링크, "무료로 시작하기" 버튼. 하단: 간단한 바닥글.
- 마케팅 화면의 색·글꼴은 앱 자체 디자인(본문 Pretendard)으로, 고객 사이트 디자인과 섞지 마. 다크 모드도 지원해.
- 각 페이지 title·description·og 태그. sitemap.xml에 /, /designs, /designs/[id], /pricing 포함 (작업 6에서 sitemap을 만들면 거기에 합쳐).
- 쿼리의 name은 길이 50자 제한, 텍스트로만 렌더링.
- 고객센터(/help)는 3단계(베타 전)에 만들어. 이번엔 빼.
테스트:
- Vitest: plans.ts의 요금이 표에 그대로 나옴, 없는 designId는 404, name 쿼리가 미리보기 제목에 들어감, 51자 이상 name은 잘림.
- Playwright: 랜딩에서 예시 칩 클릭 → 미리보기 제목 변경 → 디자인 보기 → 해당 업종 카드에 상호 적용 → 상세 → 시작하기 링크의 쿼리 확인.
  390px에서 4개 화면 모두 가로 스크롤 없음.
끝나면 PR까지 만들어 줘. 병합은 내가 할게.
```

완료 기준: 랜딩에서 상호를 넣고 디자인 목록 → 상세 → "이 디자인으로 시작"까지 이어지고, 4개 화면이 PC·모바일에서 깨지지 않으며 위 테스트가 통과한다.

진행 중 정한 것:
- 작업 3의 렌더러를 컨테이너 쿼리 기반으로 바꾸고 `embedded` 모드를 추가했다 (위 작업 3 표 참고).
- AI 도우미 횟수는 기획안대로 무료 월 10회 / 베이직 월 100회 / 프로 무제한. `plans.ts`에서 프로는 `null`(무제한). 과도한 사용을 막는 내부 상한은 2단계 AI 작업에서 정한다.
- 마케팅 화면 제목도 Pretendard(굵게). 고객 사이트 글꼴과 섞지 않는다.
- 예시 상호·가게 정보는 `src/lib/templates/samples.ts`에 모아 미리보기와 마케팅 화면이 함께 쓴다.
- 랜딩 폼은 `GET /designs` 폼이라 자바스크립트 없이도 동작한다. 미리보기 상자는 `inert`로 눌리지 않는다.

계획과 달라진 점:
- `/designs`, `/designs/[id]`는 쿼리를 읽으므로 요청마다 서버에서 완성된 HTML을 그린다(`instant = false`). `/`와 `/pricing`은 정적. 방문이 늘면 캐시를 검토한다.
- 띄어쓰기 없는 긴 상호·긴 글이 좁은 화면에서 넘치던 문제를 사이트 전체 줄바꿈 설정으로 고쳤다 (커밋 `ddfe445`, 390px E2E 케이스 추가).
- 랜딩 미리보기의 업종·디자인 이름표를 미리보기 위로 옮겼다.
- 마케팅 화면 전체에 단어 단위 줄바꿈(`break-keep`)을 적용했다.

확인 결과 (커밋 `0297223` 기준): lint·typecheck 통과, 단위 테스트 114개 통과. 개발 서버에서 직접 확인한 것:
- 예시 칩 → 미리보기 상호 변경 → 디자인 목록("내 상호 적용됨") → 상세 → 시작 링크 `/signup?next=/start?design=…&name=…`
- 상세의 PC/모바일 전환이 상자 폭에 맞게 배치를 바꿈
- 모바일 375px에서 4개 화면 모두 가로 스크롤 없음, 다크 모드에서 고객 사이트 미리보기는 밝게 유지
- 서버 HTML의 h1은 페이지당 하나

---

## 작업 4. 가입·로그인

시작 전 준비:
- PR #5 병합 → `git switch main` → `git pull` → `git branch -d feat/marketing`
- 카카오 디벨로퍼스(developers.kakao.com) 앱과 Google Cloud 콘솔 OAuth 클라이언트. 키가 없으면 이메일 가입부터 만들고 소셜 로그인은 키가 준비되는 대로 붙인다.
- 리디렉션 주소는 로컬 Supabase 기준 `http://127.0.0.1:54321/auth/v1/callback` 형태다. 정확한 값은 `supabase start` 출력과 docs/auth-setup.md에 정리하게 한다.

```
main에서 feat/auth 브랜치를 만들어 작업해 줘. 계획 먼저 보여 줘.
Supabase Auth로 가입·로그인을 만들어 줘.
- 이메일 + 비밀번호 가입, 카카오·구글 소셜 로그인
- 가입 화면에 이용약관·개인정보 처리방침·만 14세 이상 동의 체크(필수)
- 로그인하지 않은 사용자가 /studio, /admin에 오면 /login?next=... 로 보내기. next는 우리 사이트 안의 경로만 허용해(외부 주소로 보내지 않게).
- 디자인 상세의 "이 디자인으로 시작"은 /signup?next=/start?design=…&name=… 로 들어와. 가입·로그인이 끝나면 그 next로 보내 줘 (쿼리 포함, 우리 사이트 안 경로일 때만).
- 이미 로그인한 사용자가 /signup, /login에 오면 next로 바로 보내.
- 상단 바의 "무료로 시작하기"는 로그인 상태면 "내 사이트"(/studio 목록은 아직 없으니 /start)로 바꿔 보여 줘.
- 로그인 확인은 getUser()로 하고, getSession()을 권한 판단에 쓰지 마.
- next.config.ts에 cacheComponents가 켜져 있으니, 로그인 정보를 읽는 화면이 캐시되지 않는지 확인해 줘.
- 네이버 로그인은 Supabase 기본 제공이 아니니, 붙이는 방법을 조사해서 계획만 정리해 줘 (구현은 나중에).
카카오·구글 키는 .env.example에 키 이름만 추가하고, 설정 방법을 docs/auth-setup.md에 적어 줘.
```

완료 기준: 이메일 가입 → 로그인 → 보호 페이지 접근 → 로그아웃 흐름이 Playwright 테스트로 통과하고, 로그인한 두 사용자의 화면이 서로 섞이지 않는다.

진행 중 정한 것 (계획 승인 때 추가 요청 포함):
- 로그아웃은 상단 바의 작은 버튼, POST(Server Action)로만 처리한다.
- 운영은 인증 메일을 켠다(로컬은 끔). 가입 후 "메일을 확인해 주세요" → 메일 링크 → `/auth/callback` → `next`. SMTP 설정은 docs/auth-setup.md.
- 비밀번호 찾기를 이번에 넣었다. 재설정 메일 → `/reset-password` → `next` (safeNext 거침).
- `/terms`, `/privacy`는 "준비 중" 페이지. 동의 시각과 함께 약관 버전(`terms_version`, `src/lib/agreement.ts`의 `TERMS_VERSION`)을 저장한다.
- `requireUser()`가 동의 기록까지 확인하고, 없거나 버전이 다르면 `/signup/agree?next=…`로 보낸다. `/start`, `/studio`, `/admin`이 같은 검사를 거친다.
- 이메일 가입은 동의 정보를 가입 요청의 user metadata에 싣고 `handle_new_user` 트리거가 `profiles`로 옮긴다. 값이 이상하면 비워 두고 위 검사가 `/signup/agree`로 보낸다.
- 카카오 이메일 동의항목은 비즈 앱만 설정할 수 있고, Supabase가 기본으로 요청해 일반 앱은 KOE205로 막힌다 → 비즈 앱 전환 권장 (docs/auth-setup.md).
- 네이버는 조사·계획만: Supabase custom OAuth(`custom:naver`)를 스테이징에서 먼저 시험, 안 되면 직접 OAuth + Admin API (docs/auth-setup.md).
- Secure password change를 켠다(로컬 `config.toml`, 운영 대시보드). 비밀번호 찾기 흐름은 영향 없음을 E2E로 확인했다. 로그인 상태에서 비밀번호를 바꾸는 화면을 만들 때는 재인증 흐름이 필요하다.

계획과 달라진 점:
- 메일 링크와 소셜 로그인 복귀를 `/auth/callback` 하나로 처리한다 (계획의 `/auth/confirm`은 만들지 않음).
- 카카오·구글 버튼이 이메일 가입으로 처리되던 버그: React가 함수형 formAction 버튼의 `name`을 막아 provider가 전송되지 않았다. 버튼마다 provider를 묶은 formAction으로 고쳤다.
- `NEXT_PUBLIC_ROOT_DOMAIN`에 `http://`까지 적으면 복귀 주소가 `https://http://…`로 깨지던 문제를 `getSiteUrl()`에서 고쳤다.
- 개발 서버의 `Date.now()` 경고(링크 미리 불러오기 단계): 서버용 Supabase 클라이언트를 만들기 전에 `await connection()`을 부른다.
- 폰 폭(360px)에서 상단 바가 넘쳐, 좁은 화면은 버튼 문구를 "시작하기"로 줄였다.

확인 결과: lint·typecheck 통과, 단위 테스트·DB 테스트(pgTAP)·Playwright 통과. 로그인한 두 사용자와 손님을 번갈아 열어 상단 바가 섞이지 않고, 한 사람이 로그아웃해도 다른 사람은 로그인 상태인 것을 E2E로 확인했다. 실제 카카오·구글 로그인과 메일 발송은 키가 준비되면 직접 확인한다.

---

## 작업 5. 온보딩 3단계와 사이트 생성

```
main에서 feat/onboarding 브랜치를 만들어 작업해 줘. 계획 먼저 보여 줘.
/start 온보딩을 만들어 줘.
- 디자인 상세(작업 3-2)의 "이 디자인으로 시작"에서 넘어온 design·name 쿼리가 있으면 1단계에 미리 채워 줘. 쿼리 값은 다시 검증해.
- 1단계: 상호, 업종(+ 디자인 선택, 작업 3의 designs.ts) / 2단계: 전화, 카카오톡 채널, 주소, 영업시간 / 3단계: 말투(차분한·따뜻한·산뜻한)
- 각 단계 입력은 zod로 검증하고, 뒤로 가도 입력값이 남아 있게 해 줘. 가게 정보 검증은 site-schema.ts의 businessSchema를 그대로 써.
- 완료하면 Server Action에서 sites 행(template_id = 고른 디자인 id)과 draft 버전을 만들어.
  draft에는 업종 템플릿 초안 + 고른 디자인의 theme + 입력한 business를 넣고, validateSiteContent를 통과한 내용만 저장해.
  빈 sections·theme으로 행을 만들지 마(읽을 때 경고가 쌓여).
  이 단계에서는 AI 대신 템플릿 기본 문구를 넣어. 말투별 문구는 이번에 템플릿에 추가해.
- slug는 상호에서 자동 제안하고 중복·예약어면 숫자를 붙여 줘.
- 끝나면 /studio/[siteId]로 이동. 편집실은 SiteRenderer로 초안을 미리보기만 보여 주면 돼. 남의 siteId로 들어오면 404.
```

완료 기준: 새 계정으로 온보딩을 끝내면 DB에 사이트와 검증된 draft 버전이 생기고, 편집실에서 그 초안이 렌더링된다. 다른 계정으로 그 편집실 주소를 열면 404가 나온다.

진행 중 정한 것 (계획 승인 때 추가 요청 포함):
- 말투는 `sites.tone`(enum `site_tone`: calm·warm·fresh, 기본 calm)에 저장한다. 템플릿에 업종 4 × 말투 3의 대표 화면 부제·버튼·소개 글을 추가했다. 차분한 말투가 기존 기본 문구라 마케팅 미리보기는 바뀌지 않는다.
- 한 사람당 사이트 하나를 DB에서 강제한다: `sites_one_per_owner` unique(owner_id). 화면은 `/start`에서 "이미 만든 사이트가 있어요"로 안내하고, 상단 바 "내 사이트"는 사이트가 있으면 `/studio/[siteId]`로 보낸다.
- 사이트 행과 draft 버전은 DB 함수 `create_site_with_draft()` 한 번으로 같은 트랜잭션에서 만든다(호출자 권한, RLS 적용). 빈 sections·theme은 함수가 거부한다. 사이트가 이미 있으면 `site_already_exists` → 화면에서 "이미 만든 사이트가 있어요".
- slug는 상호를 로마자로 바꿔 제안한다("담소 식당" → `damso-sikdang`). 겹치거나 예약어면 함수가 `-2`, `-3`…을 붙인다. 다른 사람의 초안 사이트는 RLS로 보이지 않아 unique 제약에 맡긴다. 3단계에 예상 주소와 "공개 전에 바꿀 수 있어요"를 보여 주고, 바꾸는 기능은 작업 6에서.
- 단계는 주소(`?step=2`)에 두어 브라우저 뒤로 가기도 지원하고, 입력은 화면 상태 + sessionStorage(새로고침 대비, 완료 시 삭제)에 둔다. 주소를 바꿔도 앞 단계를 건너뛸 수 없다.
- RLS상 로그인 사용자는 남의 공개 사이트도 조회할 수 있어, 내 사이트 조회(`src/lib/sites.ts`)는 항상 owner_id로 거른다. 남의 사이트·잘못된 id 모두 404.

계획과 달라진 점:
- 기존 `rls.test.sql`이 한 사용자에게 사이트 2개를 만들어 검사하고 있어, 두 번째 사이트를 사용자 C의 것으로 옮겼다(검사 항목은 그대로).

확인 결과: lint·typecheck 통과, 단위 테스트 218개, DB 테스트(pgTAP) 71개, Playwright 67개 통과. 온보딩 E2E: 디자인 상세 → 가입 → 미리 채움 → 이전·뒤로 가기·새로고침에도 입력 유지 → 편집실, 잘못된 쿼리 무시·단계 건너뛰기 불가, 같은 상호 slug -2, 두 탭 동시 생성 시 두 번째 거부, 남의 편집실 404(HTTP 404). PC·폰(390px)에서 가로 스크롤 없음.

---

## 작업 6. 서브도메인 라우팅과 공개 페이지

```
main에서 feat/public-site 브랜치를 만들어 작업해 줘. 계획 먼저 보여 줘.
공개 사이트 라우팅을 만들어 줘.
- middleware(또는 proxy)에서 {slug}.온가게도메인 요청을 /sites/[slug]로 rewrite. 로컬에서는 {slug}.localhost:3000으로 테스트할 수 있게 해 줘.
- /sites/[slug]는 published 버전을 parseSiteContent로 읽어 SiteRenderer로 서버 렌더링하고, 없으면 404.
  issues가 있으면 사이트 id와 함께 서버 로그에 남겨.
- 사이트별 title, description, og 태그를 생성하고, sitemap.xml과 robots.txt도 만들어 줘. /dev 경로는 sitemap에 넣지 마.
- 편집실에 "공개하기" 버튼을 달아 줘. 주인은 published를 직접 쓸 수 없으니, 마이그레이션으로 security definer 함수
  publish_site(site_id)를 만들어. 함수 안에서 auth.uid()가 그 사이트 주인인지 확인하고, 아니면 예외를 내.
  주인이면 draft의 sections·theme·business를 published로 복사(upsert)하고 sites.status를 'published'로 바꿔. search_path는 ''로 고정해.
- 같은 방식으로 set_site_status(site_id, status)도 만들어 "공개 중지"를 지원해. paused는 주인이 직접 풀 수 없게 해 (요금 만료용).
- 서버 쪽은 CLAUDE.md "권한이 필요한 서버 작업 규칙"을 따라 getUser()로 로그인을 확인하고 사용자 클라이언트로 함수를 호출해. service role은 쓰지 마.
- pgTAP 테스트 추가: 주인은 공개할 수 있다, 다른 사용자는 남의 사이트를 공개할 수 없다, 익명은 호출할 수 없다, paused를 주인이 풀 수 없다.
```

완료 기준: 온보딩 → 공개하기 → `{slug}.localhost:3000` 접속 시 사이트가 보이고, 페이지 소스에 본문 텍스트와 메타 태그가 들어 있다(서버 렌더링 확인). 공개 후 초안을 고쳐도 공개하기 전까지 공개 사이트는 바뀌지 않는다.

진행 중 정한 것 (계획 승인 때 추가 요청 포함):
- proxy 처리 순서: ① 서브도메인이면 `/sites/{slug}…`로 rewrite하고 끝(로그인 확인 없음, `/_next`·파비콘은 통과) ② 메인 도메인의 `/sites/{slug}`는 서브도메인으로 301 ③ 나머지는 세션 갱신·로그인 확인. 판단은 `src/lib/site-routing.ts`.
- 공개 중지는 `status = draft`로 되돌리고, 공개 이력은 `sites.first_published_at`으로 구분한다. 공개한 적 있으면 주소를 바꿀 수 없다.
- `publish_site(site_id, new_slug default null)` 하나로 주소 변경과 공개를 한 트랜잭션에서 처리한다(따로 `change_slug`를 두지 않음). `set_site_status`는 공개 중지·다시 공개만, `paused`는 주인이 바꾸거나 풀 수 없다.
- 예약어는 DB 함수 `reserved_slugs()` 한 곳에서 관리하고, slug 제약·`publish_site`가 함께 쓴다. `slug.ts`의 목록이 가장 최근 마이그레이션의 목록과 같은지 단위 테스트가 확인한다.
- 공개 페이지는 `getPublishedSite`(`use cache`, slug 태그, `cacheLife("hours")`)로 캐시한다. "없음" 결과에도 같은 태그가 달려 처음 공개할 때 지워진다. 공개하기·공개 중지 Server Action이 `updateTag`로 지운다.
- 메인 robots.txt는 로그인 뒤 화면과 `/dev`를 막고 `/sites`는 막지 않는다(301을 따라가게). 메인 sitemap은 마케팅 화면만, 공개 사이트는 서브도메인마다 robots.txt·sitemap.xml을 둔다.
- CLAUDE.md에 "권한이 필요한 서버 작업 규칙" 6가지를 추가했고, 편집실 화면·Server Action은 `requireSiteOwner()`로 시작한다.

계획과 달라진 점:
- **진짜 404 상태 코드**: Cache Components는 정적 껍데기를 먼저 보내 `notFound()`가 200(+noindex, soft 404)이 된다(운영 빌드에서 확인). 공개 페이지는 `ensureStatic = "navigation"`(ISR)로 바꿔 처음 요청 때 완성된 페이지를 만들어 보내게 했고(없는 주소 404, 이후 캐시 HIT), 편집실은 proxy가 로그인한 사용자의 사이트인지 먼저 확인해 아니면 404로 rewrite한다.
- `allowedDevOrigins` 설정은 필요 없었다(개발 서버가 localhost 서브도메인을 기본 허용).
- 개발 서버에서만 `www.localhost`의 301이 자기 자신으로 돌아간다(Next가 요청 주소를 localhost 기준으로 만들어 Location을 경로로 줄임). 운영 빌드에서는 메인 도메인으로 정상 이동한다.
- 기존 `rls.test.sql`의 개수 검사가 DB 전체를 세고 있어, 로컬 DB에 E2E 사이트가 쌓이면 실패했다. 테스트가 만든 행만 세도록 고쳤다.
- 나중에 요금 만료로 `paused`가 될 때(3단계 결제)는 그 사이트의 캐시 태그(`siteCacheTag(slug)`)를 `revalidateTag`로 지워야 한다. 빠뜨려도 캐시 수명(1시간) 안에 반영된다.

확인 결과: lint·typecheck 통과, 단위 테스트 243개, DB 테스트(pgTAP) 105개, Playwright 71개(개발 서버) 통과. 운영 빌드(`next start`)에서도 공개 사이트·온보딩·로그인·마케팅 E2E를 돌려 공개 전 404 → 공개 → 본문, 변경 사항 반영, 공개 중지 404, 남의 편집실 404(HTTP 404)를 확인했다.

---

## 작업 7. 상태 확인 엔드포인트

```
main에서 feat/health 브랜치를 만들어 작업해 줘.
배포 플랫폼의 헬스 체크용으로 /api/health를 만들어 줘.
- 응답은 {"ok": true} 또는 {"ok": false} 하나만. DB 연결을 가볍게 확인하고 실패하면 503과 {"ok": false}.
- 저장 방식, 경로, 환경변수 유무, 연동 서비스 이름, 경고 문구 같은 내부 정보는 절대 응답에 넣지 마.
- 자세한 진단 정보가 필요하면 관리자 로그인 뒤에서만 보이는 별도 페이지로 만들고, 지금은 계획만 적어 줘.
- 응답 본문의 키가 ok 하나뿐인지 확인하는 테스트를 추가해 줘.
```

완료 기준: `/api/health`가 `{"ok": true}`만 돌려주고, 테스트가 응답 키 목록을 `["ok"]`로 고정해 검사한다.

진행 중 정한 것:
- DB 확인은 익명 권한으로 `sites`를 행 없이(HEAD) 한 번 조회한다(RLS를 그대로 거침, service role을 쓰지 않음). 3초 안에 끝나지 않으면 실패로 본다.
- 실패 원인은 서버 로그(`[health] 확인 실패`)에만 남기고, 응답은 503 + `{"ok": false}`뿐이다. 환경변수가 없어 연결을 못 만드는 경우도 같은 응답이다.
- `Cache-Control: no-store`. 라우트 맨 앞의 `await connection()`이 없으면 Cache Components가 빌드 때 응답을 정적으로 굳힌다(빌드 결과에서 ƒ 확인).
- 메인 robots.txt의 차단 목록에 `/api`를 추가했다.

### 관리자 진단 페이지 계획 (구현은 나중에)

헬스 체크에 넣지 않은 자세한 정보는 관리자 로그인 뒤의 별도 페이지로 만든다.

- **주소**: `/admin/diagnostics`. 검색 차단(noindex), `Cache-Control: no-store`.
- **관리자 판별**: Supabase 사용자 `app_metadata.role = "admin"`(사용자가 직접 바꿀 수 없고 service role로만 설정). `getUser()`로 확인하는 공통 함수 `requireAdmin()`을 만들고, 관리자가 아니면 404(페이지가 있는지 알리지 않음). 편집실처럼 proxy에서도 먼저 확인해 진짜 404를 낸다. 지금 `/admin`은 로그인만 확인하므로 이때 함께 바꾼다.
- **보여 줄 것** (값이 아니라 상태만):
  - DB: 응답 시간, 마지막으로 적용된 마이그레이션 이름
  - Auth: 응답 여부, 켜진 로그인 방법(이메일·카카오·구글)
  - Storage: `site-assets` 버킷 접근 여부
  - 메일 발송(SMTP): 설정됨/안 됨
  - 환경변수: 필요한 키마다 "있음/없음"만. 값은 일부라도 보여 주지 않는다
  - 배포 정보: 빌드 시각, 커밋
  - 공개 사이트 수(공개 중·공개 중지·요금 만료)
- **보안**: service role이 필요한 확인은 서버에서만 하고 결과(정상/문제)만 화면에 보낸다. 오류 원문은 화면에 그대로 내지 않고 요약한다. 누가 언제 봤는지 서버 로그에 남긴다.
- **테스트**: 관리자가 아니면 404(HTTP 404), 관리자만 보임, 페이지 HTML에 비밀값(키·접속 주소)이 없는지 E2E로 확인. CLAUDE.md "권한이 필요한 서버 작업 규칙"을 따른다.

확인 결과: lint·typecheck 통과, 단위 테스트(판단 함수 4개 + 라우트 2개, 성공·실패·시간 초과에서 응답 키가 `["ok"]`이고 오류 문구가 없는지), E2E(실제 서버에서 200 `{"ok": true}`, 키 `["ok"]`, no-store, robots `/api` 차단) 통과.

---

## 1단계 관문: "가입~렌더링 연결 확인"

아래를 모두 만족하면 2단계(편집실·AI)로 넘어갑니다.

- [ ] 새 계정으로 가입 → 온보딩 → 공개까지 5분 안에 끝난다
- [x] 다른 계정의 사이트·문의를 읽거나 고칠 수 없다 (RLS 테스트 통과, 작업 1)
- [x] 8개 디자인이 PC·모바일에서 깨지지 않는다 (작업 3)
- [ ] 랜딩 → 디자인 목록 → 상세 → 가입 → 온보딩으로 흐름이 이어진다 (랜딩~상세는 작업 3-2에서 완료)
- [ ] 공개 페이지가 서버 렌더링되고 메타 태그가 있다
- [ ] 공개 엔드포인트가 내부 설정을 노출하지 않는다 (`/api/health`는 `ok`만)
- [ ] 권한 작업(공개하기, 공개 중지)이 남의 사이트 요청을 거부하는 테스트가 있다
- [ ] service role(`createAdminClient`)을 import하는 곳이 정해진 서버 파일뿐이다 (1단계에서는 없어도 됨)
- [ ] 서울 리전 스테이징 Supabase 프로젝트에 마이그레이션이 적용되고, 같은 흐름이 스테이징에서도 동작한다
- [ ] lint, typecheck, 단위 테스트, DB 테스트, E2E 테스트가 모두 통과한다

## 2단계로 넘길 메모

- 고객센터(/help), 마케팅 문구·SEO 다듬기는 3단계(베타 전)에 한다.
- GitHub Actions(CI)로 PR마다 lint·typecheck·test·e2e를 돌린다. E2E는 개발 서버 대신 빌드한 서버(`pnpm build && pnpm start`)로 돌려, 컴파일 중 간헐적 실패를 없앤다 (작업 3-2에서 글꼴 테스트가 한 번 그렇게 실패함).
- `/designs`의 요청마다 렌더링이 부담되면, 쿼리 없는 기본 화면을 캐시한다.
- 편집실 저장 시 사진 경로(`theme.photo`, gallery `photos`)가 그 사이트 폴더(`{site_id}/`)인지 서버에서 확인한다.
- 전화번호 입력칸: 괄호·점·국제번호 입력에 안내 문구를 보여 주거나 하이픈으로 정리한다.
- 공개 사이트 목록과 `owner_id`가 익명 API로 조회되는 정책(`공개 사이트 조회`)을 서버 렌더링 전용으로 좁힐지 검토한다.
- 사이트 삭제 시 Storage 사진도 함께 지운다.
- 요금제별 사진 개수 제한(무료 20장 등)은 업로드 전에 서버가 `assets` 개수로 확인한다.
