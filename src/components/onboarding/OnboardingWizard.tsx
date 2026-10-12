"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, useTransition, type ReactNode } from "react";
import { createSite } from "@/app/start/actions";
import { ScaledPreview } from "@/components/marketing/ScaledPreview";
import { SiteRenderer } from "@/components/site";
import {
  buildDraftContent,
  fieldErrors,
  firstIncompleteStep,
  initialValues,
  STEP_SCHEMAS,
  toOnboardingPayload,
  type FieldErrors,
  type OnboardingPrefill,
  type OnboardingValues,
  type Step,
} from "@/lib/onboarding";
import { industrySchema, toneSchema, type Industry } from "@/lib/site-schema";
import { previewSlug } from "@/lib/slug";
import { MAX_NAME_LENGTH } from "@/lib/start-query";
import { getDesignsForIndustry, getToneCopy, INDUSTRY_LABELS, TONE_LABELS } from "@/lib/templates";
import { SAMPLE_SHOPS } from "@/lib/templates/samples";

// 새로고침해도 입력이 남도록 브라우저 탭(sessionStorage)에 임시 저장한다. 완료하면 지운다.
const STORAGE_KEY = "onggage:onboarding:v1";

const STEPS: Record<Step, string> = { 1: "가게 정보", 2: "연락처·영업시간", 3: "말투" };

function loadSaved(): Partial<OnboardingValues> | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<OnboardingValues>) : null;
  } catch {
    return null;
  }
}

function save(values: OnboardingValues | null) {
  try {
    if (values) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(values));
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // 저장소를 쓸 수 없는 환경(사생활 보호 모드 등)에서는 화면 상태만으로 동작한다.
  }
}

// 저장해 둔 값과 디자인 상세에서 넘어온 값을 합친다. 넘어온 값(상호·디자인)이 우선이고, 모르는 값은 버린다.
function startingValues(prefill: OnboardingPrefill): OnboardingValues {
  const base = initialValues(prefill);
  const saved = loadSaved();
  if (!saved) return base;
  const text = (value: unknown, fallback: string) => (typeof value === "string" ? value : fallback);
  const savedIndustry = industrySchema.safeParse(saved.industry);
  const industry: Industry = prefill.industry ?? (savedIndustry.success ? savedIndustry.data : base.industry);
  const savedDesignFits = getDesignsForIndustry(industry).some((design) => design.id === saved.designId);
  const tone = toneSchema.safeParse(saved.tone);
  return {
    name: prefill.name ?? text(saved.name, base.name),
    industry,
    designId: prefill.designId ?? (savedDesignFits ? String(saved.designId) : getDesignsForIndustry(industry)[0].id),
    phone: text(saved.phone, ""),
    kakao: text(saved.kakao, ""),
    address: text(saved.address, ""),
    hours: text(saved.hours, ""),
    tone: tone.success ? tone.data : base.tone,
  };
}

const noopSubscribe = () => () => {};

// 서버 렌더링 때는 자리만 그리고, 브라우저에서 저장해 둔 입력을 읽은 뒤 화면을 그린다 (값이 서로 달라 깜박이지 않게).
export function OnboardingWizard(props: { prefill: OnboardingPrefill; domain: string }) {
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  if (!hydrated) {
    return <p className="mt-8 text-sm text-app-muted">입력 화면을 준비하고 있어요…</p>;
  }
  return <Wizard {...props} />;
}

function Wizard({ prefill, domain }: { prefill: OnboardingPrefill; domain: string }) {
  const [values, setValues] = useState(() => startingValues(prefill));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<{ message: string; alreadyExists?: boolean } | null>(null);
  const [pending, startTransition] = useTransition();
  const searchParams = useSearchParams();
  // 이 화면에서 단계를 넘기며 쌓은 방문 기록 수. "이전"은 그만큼만 브라우저 뒤로 가기로 돌아간다.
  const pushedSteps = useRef(0);

  // 단계는 주소(?step=2)에 둔다: 브라우저 뒤로 가기로도 이전 단계로 가고, 입력은 그대로 남는다.
  // 앞 단계를 통과하지 못했으면 그 단계까지만 보여 준다 (주소를 직접 바꿔도 건너뛸 수 없다).
  const requested = Number(searchParams.get("step"));
  const urlStep: Step = requested === 2 || requested === 3 ? requested : 1;
  const step = Math.min(urlStep, firstIncompleteStep(values)) as Step;

  useEffect(() => {
    save(values);
  }, [values]);

  function update<K extends keyof OnboardingValues>(key: K, value: OnboardingValues[K]) {
    setValues((current) => {
      const next = { ...current, [key]: value };
      // 업종을 바꾸면 그 업종의 첫 디자인을 고른다.
      if (key === "industry" && !getDesignsForIndustry(value as Industry).some((d) => d.id === current.designId)) {
        next.designId = getDesignsForIndustry(value as Industry)[0].id;
      }
      return next;
    });
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function goTo(target: Step) {
    window.history.pushState(null, "", target === 1 ? "?step=1" : `?step=${target}`);
    pushedSteps.current += 1;
    window.scrollTo({ top: 0 });
  }

  function next() {
    const result = STEP_SCHEMAS[step](values);
    if (!result.success) {
      setErrors(fieldErrors(result.error));
      return;
    }
    setErrors({});
    if (step < 3) goTo((step + 1) as Step);
  }

  function back() {
    setErrors({});
    if (pushedSteps.current > 0) {
      pushedSteps.current -= 1;
      window.history.back();
    } else {
      window.history.replaceState(null, "", `?step=${step - 1}`);
    }
  }

  function submit() {
    const result = STEP_SCHEMAS[3](values);
    if (!result.success) {
      setErrors(fieldErrors(result.error));
      return;
    }
    setSubmitError(null);
    startTransition(async () => {
      // 성공하면 편집실로 이동하므로 미리 지운다. 실패하면 다시 저장한다.
      save(null);
      const response = await createSite(toOnboardingPayload(values));
      if (response?.error) {
        save(values);
        setSubmitError({ message: response.error, alreadyExists: response.alreadyExists });
      }
    });
  }

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-10">
      <div>
        <ol aria-label="진행 단계" className="flex gap-2 text-xs font-semibold">
          {([1, 2, 3] as const).map((n) => (
            <li
              key={n}
              aria-current={n === step ? "step" : undefined}
              className={`flex-1 rounded-full px-3 py-1.5 text-center ${
                n === step ? "bg-app-accent text-app-accent-ink" : n < step ? "bg-app-soft text-app-ink" : "bg-app-surface text-app-muted"
              }`}
            >
              {n}. {STEPS[n]}
            </li>
          ))}
        </ol>

        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (step === 3) submit();
            else next();
          }}
          className="mt-6 grid gap-5 rounded-2xl border border-app-line bg-app-surface p-5 sm:p-6"
        >
          {step === 1 && <StepShop values={values} errors={errors} update={update} />}
          {step === 2 && <StepContact values={values} errors={errors} update={update} />}
          {step === 3 && <StepTone values={values} update={update} domain={domain} />}

          {submitError && (
            <p role="alert" className="rounded-lg bg-app-soft px-3 py-2.5 text-sm">
              {submitError.message}{" "}
              {submitError.alreadyExists && (
                <Link href="/start" className="font-semibold text-app-accent underline underline-offset-4">
                  내 사이트로 가기
                </Link>
              )}
            </p>
          )}

          <div className="flex gap-2.5">
            {step > 1 && (
              <button
                type="button"
                onClick={back}
                className="rounded-lg border border-app-line px-5 py-3 font-semibold text-app-ink"
              >
                이전
              </button>
            )}
            <button
              type="submit"
              disabled={pending}
              className="flex-1 rounded-lg bg-app-accent px-5 py-3 font-semibold text-app-accent-ink disabled:opacity-60"
            >
              {step < 3 ? "다음" : pending ? "만드는 중…" : "홈페이지 만들기"}
            </button>
          </div>
        </form>
      </div>

      <Preview values={values} step={step} />
    </div>
  );
}

type StepProps = {
  values: OnboardingValues;
  errors: FieldErrors;
  update: <K extends keyof OnboardingValues>(key: K, value: OnboardingValues[K]) => void;
};

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-[13px] font-semibold text-app-muted">
      {label}
      {children}
      {hint && !error && <span className="font-normal">{hint}</span>}
      {error && (
        <span role="alert" className="font-normal text-[#b42318] dark:text-[#ff8a7a]">
          {error}
        </span>
      )}
    </label>
  );
}

const inputClass =
  "w-full min-w-0 rounded-lg border border-app-line bg-app-bg px-3 py-2.5 text-base font-normal text-app-ink outline-none focus:border-app-accent aria-invalid:border-[#b42318]";

function StepShop({ values, errors, update }: StepProps) {
  const designs = getDesignsForIndustry(values.industry);
  return (
    <>
      <Field label="상호" error={errors.name}>
        <input
          value={values.name}
          onChange={(e) => update("name", e.target.value)}
          maxLength={MAX_NAME_LENGTH}
          placeholder={`예: ${SAMPLE_SHOPS[values.industry].name}`}
          autoComplete="organization"
          aria-invalid={Boolean(errors.name)}
          className={inputClass}
        />
      </Field>
      <Field label="업종" error={errors.industry}>
        <select
          value={values.industry}
          onChange={(e) => update("industry", e.target.value as Industry)}
          className={inputClass}
        >
          {industrySchema.options.map((industry) => (
            <option key={industry} value={industry}>
              {INDUSTRY_LABELS[industry]}
            </option>
          ))}
        </select>
      </Field>
      <fieldset className="grid gap-2">
        <legend className="mb-1.5 text-[13px] font-semibold text-app-muted">디자인</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {designs.map((design) => (
            <label
              key={design.id}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-app-line p-3 has-checked:border-app-accent has-checked:bg-app-soft"
            >
              <input
                type="radio"
                name="design"
                value={design.id}
                checked={values.designId === design.id}
                onChange={() => update("designId", design.id)}
                className="accent-app-accent"
              />
              <span aria-hidden className="size-6 shrink-0 rounded-full" style={{ background: design.theme.accent }} />
              <span className="grid text-sm">
                <span className="font-semibold">{design.name}</span>
                <span className="text-app-muted">{design.description}</span>
              </span>
            </label>
          ))}
        </div>
        {errors.designId && (
          <span role="alert" className="text-[13px] text-[#b42318] dark:text-[#ff8a7a]">
            {errors.designId}
          </span>
        )}
      </fieldset>
    </>
  );
}

function StepContact({ values, errors, update }: StepProps) {
  return (
    <>
      <p className="text-sm text-app-muted">
        홈페이지의 영업 안내·문의 섹션과 하단 전화·길찾기 버튼에 쓰여요. 모두 나중에 채워도 됩니다.
      </p>
      <Field label="전화번호" error={errors.phone}>
        <input
          type="tel"
          inputMode="tel"
          value={values.phone}
          onChange={(e) => update("phone", e.target.value)}
          placeholder="예: 031-905-1234"
          autoComplete="tel"
          maxLength={20}
          aria-invalid={Boolean(errors.phone)}
          className={inputClass}
        />
      </Field>
      <Field
        label="카카오톡 채널"
        hint="채널 링크(https://pf.kakao.com/_…), 오픈채팅 링크, 또는 @아이디"
        error={errors.kakao}
      >
        <input
          value={values.kakao}
          onChange={(e) => update("kakao", e.target.value)}
          placeholder="예: https://pf.kakao.com/_damso"
          maxLength={100}
          aria-invalid={Boolean(errors.kakao)}
          className={inputClass}
        />
      </Field>
      <Field label="주소" error={errors.address}>
        <input
          value={values.address}
          onChange={(e) => update("address", e.target.value)}
          placeholder="예: 경기 고양시 일산동구 정발산로 24, 1층"
          autoComplete="street-address"
          maxLength={200}
          aria-invalid={Boolean(errors.address)}
          className={inputClass}
        />
      </Field>
      <Field label="영업시간" error={errors.hours}>
        <input
          value={values.hours}
          onChange={(e) => update("hours", e.target.value)}
          placeholder="예: 매일 11:00–21:00 · 월요일 휴무"
          maxLength={100}
          aria-invalid={Boolean(errors.hours)}
          className={inputClass}
        />
      </Field>
    </>
  );
}

function StepTone({ values, update, domain }: Omit<StepProps, "errors"> & { domain: string }) {
  return (
    <>
      <fieldset className="grid gap-2">
        <legend className="mb-1.5 text-[13px] font-semibold text-app-muted">홈페이지 글의 말투</legend>
        {toneSchema.options.map((tone) => (
          <label
            key={tone}
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-app-line p-3 has-checked:border-app-accent has-checked:bg-app-soft"
          >
            <input
              type="radio"
              name="tone"
              value={tone}
              checked={values.tone === tone}
              onChange={() => update("tone", tone)}
              className="mt-1 accent-app-accent"
            />
            <span className="grid gap-0.5 text-sm">
              <span className="font-semibold">{TONE_LABELS[tone]}</span>
              <span className="text-app-muted">“{getToneCopy(values.industry, tone, values.name).subtitle}”</span>
            </span>
          </label>
        ))}
      </fieldset>
      <div className="rounded-lg bg-app-soft px-3.5 py-3 text-sm">
        <p className="text-app-muted">홈페이지 주소 (예정)</p>
        <p className="mt-0.5 font-semibold break-all" data-slug-preview>
          {previewSlug(values.name, values.industry)}.{domain}
        </p>
        <p className="mt-1 text-app-muted">공개 전에 바꿀 수 있어요. 같은 주소가 있으면 끝에 숫자가 붙어요.</p>
      </div>
    </>
  );
}

// 오른쪽 미리보기: 지금 입력으로 만들어질 첫 화면. 3단계에서는 말투에 따라 글이 바뀐다.
function Preview({ values, step }: { values: OnboardingValues; step: Step }) {
  const name = values.name.trim() || SAMPLE_SHOPS[values.industry].name;
  const content = buildDraftContent({
    name,
    industry: values.industry,
    designId: values.designId,
    tone: values.tone,
    // 미리보기는 입력 중인 값을 그대로 쓰지 않고, 형식이 맞는 칸만 보여 준다.
    business: STEP_SCHEMAS[2](values).data ?? {},
  });
  const sections = content.sections.slice(0, step === 3 ? 2 : 3);
  return (
    <div className="lg:sticky lg:top-6 lg:self-start">
      <p className="mb-2 text-xs text-app-muted">미리보기 · 실제 홈페이지는 편집실에서 계속 고칠 수 있어요</p>
      <ScaledPreview
        width={980}
        initialScale={0.5}
        label={`${name} 홈페이지 미리보기`}
        className="aspect-[4/3.4] rounded-2xl border border-app-line bg-app-surface"
      >
        <SiteRenderer content={{ ...content, sections }} industry={values.industry} siteName={name} embedded />
      </ScaledPreview>
    </div>
  );
}
