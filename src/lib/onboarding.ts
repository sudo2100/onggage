// 온보딩(/start) 3단계의 입력 검사, 디자인 상세에서 넘어온 쿼리 다시 검증, 첫 초안 만들기.
// 화면(단계별)과 Server Action(전체)이 같은 스키마를 쓴다.
import { z } from "zod";
import { normalizeName, type SearchParamsRecord } from "./start-query";
import {
  businessFieldsSchema,
  businessSchema,
  industrySchema,
  toneSchema,
  type Industry,
  type SiteContent,
  type Tone,
} from "./site-schema";
import { DEFAULT_TONE, getDesign, getDesignsForIndustry, getTemplateContent } from "./templates";

// 화면이 들고 있는 값. 모두 문자열이라 입력칸에 그대로 묶인다.
export type OnboardingValues = {
  name: string;
  industry: Industry;
  designId: string;
  phone: string;
  kakao: string;
  address: string;
  hours: string;
  tone: Tone;
};

export type FieldErrors = Partial<Record<keyof OnboardingValues, string>>;

const nameSchema = z
  .string()
  .transform((value) => normalizeName(value) ?? "")
  .pipe(z.string().min(1, { error: "상호를 입력해 주세요." }));

const step1Shape = {
  name: nameSchema,
  industry: industrySchema,
  designId: z.string(),
};

// 고른 디자인이 고른 업종의 디자인이어야 한다.
function refineDesign(value: { industry: Industry; designId: string }, ctx: z.RefinementCtx) {
  const design = getDesign(value.designId);
  if (!design || design.industry !== value.industry) {
    ctx.addIssue({ code: "custom", path: ["designId"], message: "디자인을 골라 주세요." });
  }
}

export const step1Schema = z.object(step1Shape).superRefine(refineDesign);
// 가게 정보는 site-schema.ts의 businessSchema를 그대로 쓴다 (단계 화면은 칸별 오류를 위해 필드 스키마로).
export const step2Schema = businessFieldsSchema;
export const step3Schema = z.object({ tone: toneSchema });

// Server Action이 받는 전체 입력.
export const onboardingSchema = z
  .object({ ...step1Shape, business: businessSchema, tone: toneSchema })
  .superRefine(refineDesign);

export type OnboardingInput = z.output<typeof onboardingSchema>;

export function toOnboardingPayload(values: OnboardingValues) {
  return {
    name: values.name,
    industry: values.industry,
    designId: values.designId,
    tone: values.tone,
    business: { phone: values.phone, kakao: values.kakao, address: values.address, hours: values.hours },
  };
}

// zod 오류 → 칸별 안내. 길이 초과처럼 스키마에 문구가 없는 오류는 여기서 한국어로 바꾼다.
function issueMessage(issue: z.core.$ZodIssue): string {
  if (issue.code === "too_big" && typeof issue.maximum === "number") return `${issue.maximum}자 이하로 입력해 주세요.`;
  if (issue.code === "invalid_value" || issue.code === "invalid_type") return "다시 골라 주세요.";
  return issue.message;
}

export function fieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.at(-1);
    if (typeof key === "string" && !(key in errors)) errors[key as keyof OnboardingValues] = issueMessage(issue);
  }
  return errors;
}

export const STEP_SCHEMAS = {
  1: (values: OnboardingValues) => step1Schema.safeParse(values),
  2: (values: OnboardingValues) =>
    step2Schema.safeParse({ phone: values.phone, kakao: values.kakao, address: values.address, hours: values.hours }),
  3: (values: OnboardingValues) => step3Schema.safeParse(values),
} as const;

export type Step = keyof typeof STEP_SCHEMAS;

// 아직 통과하지 못한 첫 단계. 모두 통과하면 3.
export function firstIncompleteStep(values: OnboardingValues): Step {
  for (const step of [1, 2, 3] as const) {
    if (!STEP_SCHEMAS[step](values).success) return step;
  }
  return 3;
}

// 디자인 상세의 "이 디자인으로 시작"이 넘겨준 쿼리(design·name)를 다시 검증한다. 틀린 값은 버린다.
export type OnboardingPrefill = { name?: string; industry?: Industry; designId?: string };

export function parsePrefill(params: SearchParamsRecord): OnboardingPrefill {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const design = getDesign(first(params.design) ?? "");
  return {
    name: normalizeName(first(params.name)),
    industry: design?.industry,
    designId: design?.id,
  };
}

export function initialValues(prefill: OnboardingPrefill): OnboardingValues {
  const industry = prefill.industry ?? "food";
  return {
    name: prefill.name ?? "",
    industry,
    designId: prefill.designId ?? getDesignsForIndustry(industry)[0].id,
    phone: "",
    kakao: "",
    address: "",
    hours: "",
    tone: DEFAULT_TONE,
  };
}

// 첫 초안: 업종 템플릿(말투 반영) + 고른 디자인의 theme + 입력한 가게 정보.
// 저장 전에 validateSiteContent를 한 번 더 거친다 (Server Action).
export function buildDraftContent(input: OnboardingInput): SiteContent {
  const design = getDesign(input.designId);
  const base = getTemplateContent(input.industry, input.name, input.tone);
  return {
    ...base,
    theme: design ? { ...design.theme } : base.theme,
    business: input.business,
  };
}
