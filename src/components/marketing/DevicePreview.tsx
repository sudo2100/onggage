"use client";

import { useState, type ReactNode } from "react";
import { ScaledPreview } from "./ScaledPreview";

const DEVICES = {
  desktop: { label: "PC", width: 980 },
  mobile: { label: "모바일", width: 390 },
} as const;

type Device = keyof typeof DEVICES;

// 디자인 상세의 PC/모바일 전환 미리보기. 사이트 내용(children)은 서버에서 그린 것을 그대로 받는다.
export function DevicePreview({ label, children }: { label: string; children: ReactNode }) {
  const [device, setDevice] = useState<Device>("desktop");
  const { width } = DEVICES[device];

  return (
    <div>
      <div role="group" aria-label="미리보기 크기" className="inline-flex overflow-hidden rounded-lg border border-app-line">
        {(Object.keys(DEVICES) as Device[]).map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={device === key}
            onClick={() => setDevice(key)}
            className="px-4 py-1.5 text-sm aria-pressed:bg-app-soft aria-pressed:font-semibold"
          >
            {DEVICES[key].label}
          </button>
        ))}
      </div>
      <div className="mt-4 rounded-2xl bg-app-soft/60 p-3 sm:p-6">
        <div className="mx-auto" style={{ maxWidth: width }} data-device={device}>
          <ScaledPreview
            key={device}
            width={width}
            mode="fit"
            initialScale={device === "desktop" ? 0.6 : 0.9}
            label={`${label} (${DEVICES[device].label})`}
            className="rounded-xl bg-white shadow-sm"
          >
            {children}
          </ScaledPreview>
        </div>
      </div>
    </div>
  );
}
