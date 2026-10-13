"use client";

import { useState, useTransition } from "react";
import { publishSite, stopPublishing, type StudioActionResult } from "@/app/studio/[siteId]/actions";
import { SLUG_PATTERN } from "@/lib/slug";

type Props = {
  siteId: string;
  status: "draft" | "published" | "paused";
  slug: string;
  everPublished: boolean;
  rootHost: string;
  protocol: string;
};

const buttonClass = "rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-60";
const primary = `${buttonClass} bg-app-accent text-app-accent-ink`;
const secondary = `${buttonClass} border border-app-line bg-app-surface text-app-ink`;

// 편집실 공개 패널: 첫 공개(주소 확인) / 공개 중(변경 사항 공개·공개 중지) / 공개 중지됨 / 요금 만료(paused).
// 확인은 브라우저 팝업 대신 패널 안에서 한 번 더 누르게 한다.
export function PublishPanel({ siteId, status, slug, everPublished, rootHost, protocol }: Props) {
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"idle" | "choose-slug" | "confirm-stop">("idle");
  const [slugInput, setSlugInput] = useState(slug);
  const [result, setResult] = useState<StudioActionResult | null>(null);

  const address = `${slug}.${rootHost}`;
  const error = result && !result.ok ? result : null;

  function run(action: () => Promise<StudioActionResult>, after?: () => void) {
    setResult(null);
    startTransition(async () => {
      const response = await action();
      setResult(response);
      if (response.ok) {
        setMode("idle");
        after?.();
      }
    });
  }

  function publishWithSlug() {
    const next = slugInput.trim().toLowerCase();
    if (!SLUG_PATTERN.test(next)) {
      setResult({ ok: false, field: "slug", error: "주소는 영문 소문자·숫자·하이픈으로 3~30자예요. 하이픈으로 시작하거나 끝날 수 없어요." });
      return;
    }
    run(() => publishSite(siteId, next === slug ? undefined : next));
  }

  if (status === "paused") {
    return (
      <Box>
        <p className="font-semibold">요금제 만료로 공개가 멈췄어요</p>
        <p className="mt-1 text-sm text-app-muted">요금제를 다시 시작하면 손님이 홈페이지를 볼 수 있어요.</p>
      </Box>
    );
  }

  if (status === "published") {
    return (
      <Box>
        <p className="text-sm text-app-muted" data-publish-state="published">
          <span className="font-semibold text-app-ink">공개 중</span> · 손님은 아래 주소에서 홈페이지를 봐요
        </p>
        <a
          href={`${protocol}//${address}/`}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block font-semibold break-all text-app-accent underline underline-offset-4"
          data-public-link
        >
          {address}
        </a>
        <p className="mt-2 text-sm text-app-muted">초안을 고친 뒤 ‘변경 사항 공개하기’를 눌러야 공개 홈페이지에 반영돼요.</p>
        {mode === "confirm-stop" ? (
          <div className="mt-3 rounded-lg bg-app-soft p-3 text-sm">
            <p>공개를 중지하면 손님이 주소로 들어와도 홈페이지를 볼 수 없어요. 주소는 그대로 남아요.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" disabled={pending} onClick={() => run(() => stopPublishing(siteId))} className={primary}>
                공개 중지
              </button>
              <button type="button" disabled={pending} onClick={() => setMode("idle")} className={secondary}>
                취소
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={pending} onClick={() => run(() => publishSite(siteId))} className={primary}>
              {pending ? "공개하는 중…" : "변경 사항 공개하기"}
            </button>
            <button type="button" disabled={pending} onClick={() => setMode("confirm-stop")} className={secondary}>
              공개 중지
            </button>
          </div>
        )}
        <Feedback result={result} okText="공개 홈페이지에 반영했어요." />
      </Box>
    );
  }

  // 공개 중지됨: 주소는 잠겨 있고, 최신 초안으로 다시 공개한다.
  if (everPublished) {
    return (
      <Box>
        <p className="text-sm text-app-muted" data-publish-state="stopped">
          <span className="font-semibold text-app-ink">공개 중지됨</span> · {address}
        </p>
        <p className="mt-1 text-sm text-app-muted">다시 공개하면 지금 초안이 같은 주소로 공개돼요.</p>
        <div className="mt-3">
          <button type="button" disabled={pending} onClick={() => run(() => publishSite(siteId))} className={primary}>
            {pending ? "공개하는 중…" : "다시 공개하기"}
          </button>
        </div>
        <Feedback result={result} />
      </Box>
    );
  }

  // 처음 공개: 주소를 확인·수정한 뒤 공개한다.
  return (
    <Box>
      <p className="text-sm text-app-muted" data-publish-state="never">
        <span className="font-semibold text-app-ink">아직 공개 전</span> · 손님에게는 보이지 않아요
      </p>
      {mode === "choose-slug" ? (
        <form
          className="mt-3 grid gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            publishWithSlug();
          }}
        >
          <label className="grid gap-1.5 text-[13px] font-semibold text-app-muted">
            홈페이지 주소
            <span className="flex items-center gap-1.5">
              <input
                value={slugInput}
                onChange={(event) => setSlugInput(event.target.value)}
                maxLength={30}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                aria-invalid={error?.field === "slug"}
                className="w-full min-w-0 rounded-lg border border-app-line bg-app-bg px-3 py-2.5 text-base font-normal text-app-ink outline-none focus:border-app-accent aria-invalid:border-[#b42318]"
              />
              <span className="shrink-0 text-sm font-normal">.{rootHost}</span>
            </span>
            <span className="font-normal">
              영문 소문자·숫자·하이픈 3~30자. <strong className="text-app-ink">공개하면 주소를 바꿀 수 없어요.</strong>
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={pending} className={primary}>
              {pending ? "공개하는 중…" : "이 주소로 공개하기"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setMode("idle");
                setResult(null);
                setSlugInput(slug);
              }}
              className={secondary}
            >
              취소
            </button>
          </div>
          <Feedback result={result} />
        </form>
      ) : (
        <div className="mt-3">
          <button type="button" onClick={() => setMode("choose-slug")} className={primary}>
            공개하기
          </button>
        </div>
      )}
    </Box>
  );
}

function Box({ children }: { children: React.ReactNode }) {
  return <section aria-label="공개 설정" className="rounded-2xl border border-app-line bg-app-surface p-4 sm:p-5">{children}</section>;
}

function Feedback({ result, okText }: { result: StudioActionResult | null; okText?: string }) {
  if (!result) return null;
  if (result.ok) {
    return okText ? (
      <p role="status" className="mt-2 text-sm text-app-muted">
        {okText}
      </p>
    ) : null;
  }
  return (
    <p role="alert" className="mt-2 text-sm text-[#b42318] dark:text-[#ff8a7a]">
      {result.error}
    </p>
  );
}
