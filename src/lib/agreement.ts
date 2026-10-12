// 가입 동의(이용약관·개인정보 처리방침·만 14세 이상)의 입력 검사와 기록 판단.
import { z } from "zod";

// 약관 본문이 바뀌면 이 값을 올린다. 기록된 버전이 다르면 다시 동의를 받는다.
export const TERMS_VERSION = "2026-10-12";

const checked = (message: string) => z.literal("on", { error: message });

// 체크박스는 체크했을 때만 "on"으로 전송된다.
export const agreementFormSchema = z.object({
  terms: checked("이용약관에 동의해 주세요."),
  privacy: checked("개인정보 처리방침에 동의해 주세요."),
  age14: checked("만 14세 이상만 가입할 수 있어요."),
});

// 이메일 가입 요청의 user metadata에 넣는 값. handle_new_user 트리거가 profiles로 옮긴다.
export function agreementMetadata() {
  return { agreement: { terms: true, privacy: true, age14: true, version: TERMS_VERSION } };
}

export type AgreementRecord = {
  terms_agreed_at: string | null;
  privacy_agreed_at: string | null;
  age_confirmed_at: string | null;
  terms_version: string | null;
};

export function hasCurrentAgreement(record: AgreementRecord | null | undefined): boolean {
  return Boolean(
    record &&
      record.terms_agreed_at &&
      record.privacy_agreed_at &&
      record.age_confirmed_at &&
      record.terms_version === TERMS_VERSION,
  );
}
