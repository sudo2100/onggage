import { describe, expect, it } from "vitest";
import { DESIGNS } from "@/lib/templates";
import { contrastRatio, getSiteColors, MIN_TEXT_CONTRAST } from "./site-colors";

describe("contrastRatio", () => {
  it("흰색과 검정의 대비는 21:1이다", () => {
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 5);
  });
});

describe("getSiteColors", () => {
  const accents = [...DESIGNS.map((d) => d.theme.accent), "#F0C24B", "#FFFF00", "#00FFFF", "#FFFFFF", "#000000"];

  it("밝은 accent(#F0C24B) 위 버튼 글자는 검정을 쓴다", () => {
    expect(getSiteColors("#F0C24B").onAccent).toBe("#000000");
  });

  it("어두운 accent(#1E3A5F) 위 버튼 글자는 흰색을 쓴다", () => {
    expect(getSiteColors("#1E3A5F").onAccent).toBe("#FFFFFF");
  });

  it("밝은 accent(#F0C24B)를 글자색으로 쓸 때 어둡게 보정해 배경 대비 4.5:1 이상을 맞춘다", () => {
    const colors = getSiteColors("#F0C24B");
    expect(contrastRatio("#F0C24B", colors.bg)).toBeLessThan(MIN_TEXT_CONTRAST);
    expect(colors.accentText).not.toBe("#F0C24B");
    expect(contrastRatio(colors.accentText, colors.bg)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
    expect(contrastRatio(colors.accentText, colors.altBg)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });

  it("이미 대비가 충분한 accent는 글자색을 바꾸지 않는다", () => {
    expect(getSiteColors("#1E3A5F").accentText).toBe("#1E3A5F");
  });

  it.each(accents)("%s: 버튼 글자·accent 글자·본문 글자가 모두 기준 대비를 넘는다", (accent) => {
    const colors = getSiteColors(accent);
    const otherOnAccent = colors.onAccent === "#FFFFFF" ? "#000000" : "#FFFFFF";
    expect(contrastRatio(colors.onAccent, colors.accent)).toBeGreaterThanOrEqual(
      contrastRatio(otherOnAccent, colors.accent),
    );
    for (const bg of [colors.bg, colors.altBg]) {
      expect(contrastRatio(colors.accentText, bg)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
      expect(contrastRatio(colors.ink, bg)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
    }
  });
});
