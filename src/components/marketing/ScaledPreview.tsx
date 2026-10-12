"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  // 사이트를 그릴 실제 폭 (PC 980, 모바일 390). 사이트 루트가 @container라 이 폭대로 배치된다.
  width: number;
  // clip: 바깥 상자 크기(className의 aspect 등)에 맞춰 잘라 보여 준다 (카드·랜딩).
  // fit: 축소된 사이트 전체 높이만큼 바깥 상자를 늘린다 (디자인 상세).
  mode?: "clip" | "fit";
  // 자바스크립트가 폭을 재기 전(서버 렌더링 직후)에 쓸 배율
  initialScale?: number;
  // fit 모드에서 높이를 재기 전에 쓸 높이(px)
  fallbackHeight?: number;
  className?: string;
  label: string;
  children: ReactNode;
};

// 고정 폭으로 그린 사이트를 바깥 상자 폭에 맞게 줄여 보여 준다.
// 안쪽은 inert라 링크·버튼·입력칸을 누르거나 포커스할 수 없다. 내용은 서버에서 그린 HTML 그대로다.
export function ScaledPreview({
  width,
  mode = "clip",
  initialScale = 0.4,
  fallbackHeight = 640,
  className = "",
  label,
  children,
}: Props) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(initialScale);
  const [innerHeight, setInnerHeight] = useState<number | null>(null);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      setScale(Math.min(1, outer.clientWidth / width));
      setInnerHeight(inner.offsetHeight);
    });
    observer.observe(outer);
    observer.observe(inner);
    return () => observer.disconnect();
  }, [width]);

  const height = mode === "fit" ? (innerHeight !== null ? innerHeight * scale : fallbackHeight) : undefined;

  return (
    <div
      ref={outerRef}
      role="img"
      aria-label={label}
      data-scaled-preview
      className={`relative overflow-hidden ${className}`}
      style={height !== undefined ? { height } : undefined}
    >
      <div
        ref={innerRef}
        inert
        className="pointer-events-none absolute top-0 left-0 origin-top-left select-none"
        style={{ width, transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}
