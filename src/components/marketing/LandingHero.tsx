"use client";

import { useState } from "react";
import { SiteRenderer } from "@/components/site";
import { MAX_NAME_LENGTH, normalizeName } from "@/lib/start-query";
import { industrySchema, type Industry } from "@/lib/site-schema";
import { getDesignsForIndustry, INDUSTRY_LABELS } from "@/lib/templates";
import { getDesignPreviewContent, SAMPLE_SHOPS } from "@/lib/templates/samples";
import { ScaledPreview } from "./ScaledPreview";

const INDUSTRIES = industrySchema.options;

// 랜딩 첫 화면의 입력 폼 + 내 가게 미리보기. 이 부분만 클라이언트 컴포넌트다.
// 폼은 일반 GET 폼이라 자바스크립트 없이도 /designs?name=…&industry=… 로 이동한다.
export function LandingHero() {
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState<Industry>("food");

  const design = getDesignsForIndustry(industry)[0];
  const preview = getDesignPreviewContent(design, { siteName: normalizeName(name) });
  // 첫 화면 미리보기는 대표 화면·소개·메뉴까지만 보여 준다 (프로토타입과 같음).
  const content = { ...preview.content, sections: preview.content.sections.slice(0, 3) };

  return (
    <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-12">
      <div>
        <p className="text-xs font-semibold tracking-[0.12em] text-app-accent">동네 가게 홈페이지 · 온가게(가칭)</p>
        <h1 className="mt-3 text-[32px] leading-tight font-bold tracking-tight break-keep sm:text-[44px]">
          상호만 넣으면 <span className="text-app-accent">우리 가게 홈페이지</span>가 바로 생겨요
        </h1>
        <p className="mt-4 max-w-[32em] text-[17px] break-keep text-app-muted">
          AI가 업종에 맞는 소개 글과 메뉴 구성을 먼저 채워 둡니다. 마음에 드는 디자인을 고르고, 글자만 눌러서 고치면
          끝이에요. 서브도메인 공개까지 무료입니다.
        </p>

        <form action="/designs" method="get" className="mt-6 grid max-w-[460px] gap-3.5 rounded-2xl border border-app-line bg-app-surface p-5">
          <div className="grid gap-2.5 sm:grid-cols-[1fr_150px]">
            <label className="grid gap-1.5 text-[13px] font-semibold text-app-muted">
              상호
              <input
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={MAX_NAME_LENGTH}
                placeholder={`예: ${SAMPLE_SHOPS[industry].name}`}
                autoComplete="organization"
                className="w-full min-w-0 rounded-lg border border-app-line bg-app-surface px-3 py-2.5 text-[15px] font-normal text-app-ink focus:border-app-accent focus:outline-none"
              />
            </label>
            <label className="grid gap-1.5 text-[13px] font-semibold text-app-muted">
              업종
              <select
                name="industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value as Industry)}
                className="w-full rounded-lg border border-app-line bg-app-surface px-3 py-2.5 text-[15px] font-normal text-app-ink focus:border-app-accent focus:outline-none"
              >
                {INDUSTRIES.map((value) => (
                  <option key={value} value={value}>
                    {INDUSTRY_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-app-accent px-5 py-3 text-[15.5px] font-semibold text-app-accent-ink"
          >
            내 가게 디자인 보기
          </button>
          <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
            <span className="text-app-muted">예시로 넣어 보기:</span>
            {INDUSTRIES.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setName(SAMPLE_SHOPS[value].name);
                  setIndustry(value);
                }}
                className="rounded-full border border-app-line bg-app-surface px-3 py-1"
              >
                {SAMPLE_SHOPS[value].name}
              </button>
            ))}
          </div>
        </form>
      </div>

      <div>
        <p className="mb-2 text-xs text-app-muted">
          미리보기 · {INDUSTRY_LABELS[industry]} · {design.name} 디자인
        </p>
        <ScaledPreview
          width={980}
          initialScale={0.5}
          label={`${preview.siteName} 홈페이지 미리보기`}
          className="aspect-[4/3.4] rounded-2xl border border-app-line bg-app-surface"
        >
          <SiteRenderer content={content} industry={industry} siteName={preview.siteName} embedded />
        </ScaledPreview>
      </div>
    </div>
  );
}
