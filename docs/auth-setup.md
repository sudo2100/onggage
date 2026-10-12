# 가입·로그인 설정 안내

온가게의 가입·로그인(Supabase Auth)을 로컬과 운영에서 켜는 방법. 코드 구조는 맨 아래 "코드 위치" 참고.

## 1. 흐름 한눈에

| 상황 | 흐름 |
| --- | --- |
| 이메일 가입 (운영, 인증 메일 켬) | `/signup` → "메일을 확인해 주세요" → 메일의 **가입 완료하기** → `/auth/callback?token_hash=…` → `next` |
| 이메일 가입 (로컬, 인증 메일 끔) | `/signup` → 바로 `next` |
| 카카오·구글 (가입 화면) | 동의 체크 → 버튼 → 카카오/구글 → `/auth/callback?code=…` → 동의 기록 → `next` |
| 카카오·구글 (로그인 화면, 첫 로그인) | 버튼 → … → `/auth/callback` → 동의 기록 없음 → `/signup/agree?next=…` → `next` |
| 비밀번호 찾기 | `/forgot-password` → 메일의 **새 비밀번호 정하기** → `/auth/callback?…&type=recovery` → `/reset-password` → `next` |

- `next`는 어디서 오든 `safeNext()`(src/lib/safe-next.ts)를 거친다. 우리 사이트 안 경로만 통과하고, 아니면 `/start`.
- 동의 기록(이용약관·개인정보 처리방침·만 14세 이상 + 약관 버전)이 없거나 버전이 다르면 `/start`, `/studio`, `/admin`에서 `/signup/agree`로 보낸다.
- 이메일 가입은 가입 직후 세션이 없을 수 있어서, 동의 정보를 가입 요청의 user metadata에 싣고 `handle_new_user` 트리거가 `profiles`로 옮긴다. 시각은 DB의 `now()`로 남는다.

## 2. 로컬 개발

1. `pnpm exec supabase start` 후 출력의 `API_URL`, `ANON_KEY`(또는 `PUBLISHABLE_KEY`)를 `.env.local`의 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`에 넣는다.
   `NEXT_PUBLIC_ROOT_DOMAIN`은 로컬에서 `localhost:3000`(도메인만)으로 둔다. 메일 링크·소셜 로그인 복귀 주소가 이 값으로 만들어진다. `http://localhost:3000`처럼 주소 전체를 적어도 동작하지만, 작업 6의 서브도메인 판별은 도메인만 적는 형식을 기준으로 한다.
2. `supabase db reset`으로 마이그레이션을 적용한다.
3. 로컬은 인증 메일이 꺼져 있다(`supabase/config.toml`의 `[auth.email] enable_confirmations = false`). 가입하면 바로 로그인된다.
4. 비밀번호 재설정 메일 등은 실제로 발송되지 않고 Mailpit(<http://127.0.0.1:54324>)에 쌓인다.
5. 운영과 같은 인증 메일 흐름을 로컬에서 시험하려면 `enable_confirmations = true`로 바꾼다.

> **`supabase/config.toml`을 바꾸면 `supabase stop` → `supabase start`로 다시 켜야 적용된다.** 실행 중인 Supabase는 시작할 때 읽은 설정(인증 메일, 소셜 로그인, 메일 양식, Redirect URL 등)을 그대로 쓴다. 프로젝트 루트 `.env`의 키를 바꿨을 때도 같다.

### 로컬에서 카카오·구글 켜기

1. 아래 3·4장대로 앱을 만들 때 **Redirect URI에 `http://127.0.0.1:54321/auth/v1/callback`** 도 추가한다.
2. **프로젝트 루트의 `.env`**(`supabase` 폴더 밖, 커밋 금지: `.gitignore`의 `.env*`에 걸림)에 키를 넣는다. Supabase CLI는 `config.toml`의 `env()` 값을 이 파일에서 읽는다(`supabase/.env`는 읽지 않음). 키 이름은 `.env.example`과 같아야 한다. 시크릿은 `_CLIENT_SECRET`이 아니라 `_SECRET`이다.
   ```
   SUPABASE_AUTH_EXTERNAL_KAKAO_CLIENT_ID=...
   SUPABASE_AUTH_EXTERNAL_KAKAO_SECRET=...
   SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=...
   SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=...
   ```
3. `supabase/config.toml`의 `[auth.external.kakao]`, `[auth.external.google]`에서 `enabled = true`로 바꾸고 `supabase stop` → `supabase start`로 다시 켠다. (이 변경은 커밋하지 않거나, 팀 전원이 키를 갖춘 뒤에 커밋한다.)

## 3. 카카오 로그인

### 카카오 개발자 콘솔 (<https://developers.kakao.com>)

1. **내 애플리케이션 → 애플리케이션 추가하기**. 앱 이름 "온가게", 사업자명 입력.
2. **앱 설정 → 앱 키**의 **REST API 키** = Supabase의 `Client ID`.
3. **제품 설정 → 카카오 로그인**: 활성화 ON. **Redirect URI**에 `https://<프로젝트 ref>.supabase.co/auth/v1/callback` 등록 (로컬용 주소도 함께).
4. **제품 설정 → 카카오 로그인 → 보안**: **Client Secret** 코드 생성, 활성화 상태 **사용함**. 이 값이 Supabase의 `Client Secret`.
5. **제품 설정 → 카카오 로그인 → 동의항목**: `닉네임(profile_nickname)`, `프로필 사진(profile_image)` 설정. 이메일은 아래 "이메일 동의항목과 비즈 앱" 참고.
6. **앱 설정 → 플랫폼 → Web**: 사이트 도메인에 운영 주소(`https://onggage.kr` 등)와 `http://localhost:3000` 등록.

### 이메일 동의항목과 비즈 앱 (중요: 확인 결과)

- **Supabase는 카카오 로그인 때 `account_email` 동의항목을 기본으로 요청한다.** 카카오 앱에 이 동의항목이 설정되어 있지 않으면 카카오가 **KOE205 오류**("설정하지 않은 동의 항목: account_email")를 내고 로그인이 막힌다. 카카오 데브톡 담당자 답변으로는 이 범위를 보내는 쪽이 Supabase 설정이고, 일반(비즈 앱이 아닌) 앱으로 `profile_nickname`, `profile_image`만 요청해도 같은 오류가 났다.
- **`account_email` 동의항목은 비즈 앱만 설정할 수 있다.** (Supabase 문서, 카카오 데브톡 공통)
- 해결 방법은 둘 중 하나다.
  1. **비즈 앱으로 전환 (추천)** — **앱 설정 → 앱 → 일반 → 비즈니스 정보**에서 사업자 정보를 입력하거나, **개인 개발자 비즈 앱**으로 전환한다. 그다음 동의항목에서 `카카오계정(이메일)`을 설정한다. 데브톡 질문자도 이 방법으로 해결했다.
  2. **이메일 없이 받기** — Supabase 대시보드 Kakao 설정에서 **Allow users without an email**(config.toml의 `email_optional = true`)을 켠다. 이 경우 Supabase 문서는 `account_email`을 빼라고 하지만, Supabase가 범위를 기본으로 붙이므로 **스테이징에서 KOE205가 나지 않는지 반드시 시험**해야 한다.
- 온가게는 문의 알림·비밀번호 찾기·안내 메일에 이메일이 필요하므로 **1번(비즈 앱 + 이메일 필수 동의)을 권장**한다.
- 이메일을 필수로 받더라도 카카오 계정 중에는 이메일이 없는 계정(전화번호만으로 가입)이 있다. 카카오 동의항목의 **"카카오계정으로 정보 수집 후 제공"** 옵션을 켜면, 이메일이 없는 사용자는 동의 화면 전에 이메일 등록을 안내받는다. 끄면 로그인은 되지만 이메일이 비어 온다(→ Supabase가 이메일 필수면 로그인 실패).

### Supabase 대시보드

**Authentication → Sign In / Providers → Kakao**: Enable, `Client ID`(REST API 키), `Client Secret`, 필요 시 Allow users without an email.

## 4. 구글 로그인

### Google Cloud 콘솔 (<https://console.cloud.google.com>)

1. 프로젝트 만들기 → **API 및 서비스 → OAuth 동의 화면**(Google Auth Platform): 앱 이름 "온가게", 지원 이메일, 승인된 도메인(운영 도메인, `supabase.co`). 범위는 `openid`, `email`, `profile`만.
2. **사용자 인증 정보 → OAuth 클라이언트 ID 만들기 → 웹 애플리케이션**
   - 승인된 자바스크립트 원본: `https://onggage.kr`, `http://localhost:3000`
   - 승인된 리디렉션 URI: `https://<프로젝트 ref>.supabase.co/auth/v1/callback`, `http://127.0.0.1:54321/auth/v1/callback`
3. 발급된 클라이언트 ID·보안 비밀 = Supabase의 `Client ID`·`Client Secret`.
4. 테스트 단계에서는 "테스트 사용자"만 로그인된다. 공개 전에 **앱 게시(프로덕션)** 로 바꾼다. `email`, `profile`만 쓰면 별도 심사가 필요 없다.

### Supabase 대시보드

**Authentication → Sign In / Providers → Google**: Enable, Client ID, Client Secret.

## 5. 운영 Supabase 대시보드 설정

1. **Authentication → URL Configuration**
   - Site URL: `https://onggage.kr` (`NEXT_PUBLIC_ROOT_DOMAIN`과 같은 주소)
   - Redirect URLs: `https://onggage.kr/**` — 앱이 `/auth/callback?next=…`처럼 쿼리를 붙이므로 와일드카드가 필요하다. 허용 목록에 없으면 메일 링크가 Site URL로 바뀌어 **링크가 깨진다**(메일 양식이 `RedirectTo` 뒤에 `&token_hash=…`를 붙이기 때문).
2. **Authentication → Sign In / Providers → Email**
   - Confirm email: **ON** (운영은 인증 메일을 켠다)
   - Minimum password length: **8** (앱 검사와 같게)
   - **Secure password change: ON** (로컬 `config.toml`의 `secure_password_change = true`와 같게). 로그인한 지 24시간이 지난 세션으로는 다시 인증하지 않으면 비밀번호를 바꿀 수 없다. 탈취된 오래된 세션으로 비밀번호를 바꿔 계정을 빼앗는 것을 막는다.
     - 비밀번호 찾기 흐름에는 영향이 없다. 재설정 메일 링크가 그 자리에서 새로 로그인시키므로 "최근 로그인"에 해당한다 (E2E "비밀번호 찾기"로 확인).
     - 나중에 로그인한 상태에서 비밀번호를 바꾸는 "계정 설정" 화면을 만들면 `reauthentication_needed` 오류가 날 수 있다. 그때는 `supabase.auth.reauthenticate()`(메일로 받은 확인 코드)를 거치는 흐름을 함께 만든다.
3. **Authentication → Emails → Templates**: `supabase/templates/confirmation.html`(Confirm signup), `supabase/templates/recovery.html`(Reset password)의 내용과 제목(`supabase/config.toml`의 `subject`)을 그대로 붙여 넣는다. 기본 양식(`{{ .ConfirmationURL }}`)을 그대로 두면 메일을 요청한 브라우저에서만 링크가 열린다.
4. **Authentication → Rate Limits**: 메일 발송 한도는 SMTP를 붙인 뒤 시간당 30~100통 정도로 올린다.
5. 아래 6장대로 **SMTP를 반드시 연결**한다.

## 6. 운영용 메일 발송(SMTP)

Supabase 기본 메일 발송기는 **프로젝트 팀원 주소로만, 시간당 몇 통**만 보낸다. 실제 가게 사장님에게 인증 메일을 보내려면 직접 SMTP를 붙여야 한다.

### 발송 서비스 고르기

| 서비스 | 특징 |
| --- | --- |
| Resend | 설정이 가장 간단, Supabase 연동 안내가 있음. 무료 월 3,000통 |
| Amazon SES | 가장 저렴(1,000통당 약 0.1달러). 처음엔 샌드박스라 발송 한도 해제 신청 필요 |
| SendGrid, Postmark 등 | SMTP 제공 서비스면 모두 가능 |

MVP 단계는 Resend 또는 SES를 권장한다.

### 설정 순서

1. 발송용 주소 정하기: 예) `no-reply@mail.onggage.kr` (본 도메인 평판을 지키려고 하위 도메인을 쓴다).
2. 발송 서비스에서 도메인 인증: 안내하는 **SPF(TXT), DKIM(CNAME/TXT)** 레코드를 DNS에 추가. **DMARC**(`_dmarc` TXT, 처음엔 `p=none`)도 추가한다. 네이버·다음 메일은 인증이 없으면 스팸함으로 보내는 경우가 많다.
3. Supabase **Project Settings → Authentication → SMTP Settings**(또는 Authentication → Emails → SMTP)에서 Enable custom SMTP:
   - Sender email: `no-reply@mail.onggage.kr`, Sender name: `온가게`
   - Host / Port / Username / Password: 발송 서비스가 알려 준 값 (예: Resend `smtp.resend.com`, 465, `resend`, API 키)
4. 가입·비밀번호 재설정을 네이버·다음·지메일 주소로 각각 시험해 받은 편지함에 들어오는지 확인한다.
5. 로컬에서 실제 SMTP로 시험할 때만 `supabase/config.toml`의 `[auth.email.smtp]`를 켜고 비밀번호는 `env(...)`로 넣는다 (평소엔 Mailpit).

## 7. 약관 버전 올리기

약관 본문이 바뀌면 `src/lib/agreement.ts`의 `TERMS_VERSION`을 올린다. 기존 사용자는 다음에 `/start`, `/studio`, `/admin`에 들어올 때 `/signup/agree`에서 다시 동의한다. (이용약관·개인정보 처리방침 본문은 아직 "준비 중" 페이지: `/terms`, `/privacy`)

## 8. 네이버 로그인 (조사·계획만, 구현은 나중에)

Supabase는 네이버를 기본 제공하지 않는다. 방법은 두 가지다.

### 방법 A. Supabase custom OAuth 제공자 (`custom:naver`)

Supabase Auth가 기본 목록 밖의 OAuth2·OIDC 제공자를 붙이는 기능을 지원한다(대시보드 Authentication → Providers → 수동 설정, Free 플랜은 3개까지).

- 네이버는 OIDC 자동 탐색을 제공하지 않으므로 **OAuth2(수동)** 형식으로 등록한다.
  - Authorization URL: `https://nid.naver.com/oauth2.0/authorize`
  - Token URL: `https://nid.naver.com/oauth2.0/token`
  - UserInfo URL: `https://openapi.naver.com/v1/nid/me`
  - 네이버 개발자센터(<https://developers.naver.com>)의 Callback URL에는 대시보드가 보여 주는 Supabase Callback URL을 넣는다.
- 앱 코드는 `signInWithOAuth({ provider: "custom:naver" })` 한 줄과 버튼 추가로 끝난다. 동의·`next` 처리는 지금 구조를 그대로 쓴다.
- **확인이 필요한 위험**
  1. 네이버 사용자 정보 응답은 `{ resultcode, message, response: { id, email, name, … } }`처럼 **한 단계 안쪽(`response`)에** 값이 있다. Supabase 문서에는 UserInfo 응답의 어떤 필드를 사용자 ID·이메일로 쓰는지(필드 매핑, 중첩 경로)가 나와 있지 않다. 표준(`sub`/`id`, `email`이 최상위)을 기대한다면 네이버와 맞지 않아 **로그인이 실패할 수 있다.**
  2. custom 제공자는 PKCE가 기본으로 켜져 있다. 네이버 문서에는 PKCE 언급이 없어 `code_verifier`를 무시하는지, 거부하는지 시험해야 한다(거부하면 `pkce_enabled: false`).
  3. 네이버 이메일은 사용자가 동의하지 않으면 빠질 수 있다 → 필요 시 `email_optional`.
- **판단 방법**: 스테이징 프로젝트에 `custom:naver`를 등록하고 실제 네이버 계정으로 로그인해 본다(반나절). 사용자가 생성되고 `auth.identities`에 네이버 `id`가 들어가면 A로 확정.

### 방법 B. 직접 OAuth 처리 + Supabase Admin API

방법 A가 응답 형식 때문에 안 될 때의 대안. 한국 개발자 사례(2026년 1월)도 이 방식이다.

1. `/auth/naver` Route Handler: `state`를 httpOnly 쿠키에 저장하고 네이버 인증 화면으로 보낸다(`next`도 safeNext 후 쿠키에).
2. `/auth/naver/callback`: `state` 확인 → 토큰 교환 → `/v1/nid/me`로 `response.id`, `response.email` 조회.
3. 서버(service role)에서 사용자 찾기/만들기: 네이버 `id`를 `app_metadata.naver_id`로 저장해 같은 사람을 다시 알아본다. 이메일만으로 기존 계정과 합치지 않는다(남의 계정 탈취 위험).
4. 세션 발급: `auth.admin.generateLink({ type: "magiclink", email })`로 받은 `hashed_token`을 서버에서 바로 `verifyOtp({ token_hash, type: "magiclink" })`로 교환해 쿠키 세션을 만든다.
5. 이후는 지금 콜백과 같다: 동의 기록 확인 → `/signup/agree` 또는 `next`.

- 장점: 응답 형식을 우리가 통제. 단점: service role 키를 쓰는 서버 코드가 생기고, 이메일 없는 네이버 계정은 처리할 수 없다(가짜 이메일을 만들어야 함), 토큰 갱신·연결 해제 등을 직접 관리.

### 추천

**먼저 A를 스테이징에서 시험하고, 필드 매핑 문제로 실패하면 B로 간다.** A가 되면 유지보수 부담이 거의 없다. 네이버 개발자센터의 검수(로그인 버튼 디자인 가이드 준수, 서비스 URL 확인)는 어느 방법이든 필요하니 미리 신청한다.

## 코드 위치

| 파일 | 역할 |
| --- | --- |
| `src/proxy.ts` | 세션 쿠키 갱신, 로그인 안 한 사용자 `/studio`·`/admin`·`/start` → `/login?next=…`, 로그인한 사용자 `/login`·`/signup` → `next` |
| `src/lib/safe-next.ts` | `next` 검사 (우리 사이트 안 경로만) |
| `src/lib/auth.ts` | `getCurrentUser()`(getUser), `requireUser()`(로그인 + 동의 기록 확인) |
| `src/lib/agreement.ts` | `TERMS_VERSION`, 동의 입력 검사, 기록 판단 |
| `src/app/(auth)/actions.ts` | 가입·로그인·소셜·동의·비밀번호·로그아웃 Server Action |
| `src/app/auth/callback/route.ts` | 메일 링크·소셜 로그인 복귀 처리 |
| `supabase/migrations/20261012000000_signup_agreement.sql` | 동의 칼럼, 트리거, `record_signup_agreement()` |
| `supabase/templates/*.html` | 인증·재설정 메일 양식 |

로그인 정보를 읽는 코드는 `use cache`/`use cache: private`로 감싸지 않는다(로그아웃 뒤에도 남을 수 있음). 상단 바는 계정 영역만 `<Suspense>` 안에서 읽는다.

### 참고 자료

- Supabase: [Login with Kakao](https://supabase.com/docs/guides/auth/social-login/auth-kakao), [Custom OAuth/OIDC Providers](https://supabase.com/docs/guides/auth/custom-oauth-providers), [Self-hosted custom providers](https://supabase.com/docs/guides/self-hosting/self-hosted-custom-oauth-providers)
- 카카오 데브톡: [일반 개발 계정 KOE205 (account_email)](https://devtalk.kakao.com/t/koe205-account-email/147207), [이메일 없는 계정과 필수 동의](https://devtalk.kakao.com/t/inquiry-regarding-kakao-login-required-email-consent-behavior-for-accounts-without-email/150160)
- [Next.js + Supabase Auth에 네이버 OAuth 연동하기 (velog)](https://velog.io/@itwillbeoptimal/Next.js-Supabase-Auth에-네이버-OAuth-연동하기)
