import { describe, expect, it } from "vitest";
import { businessSchema, siteContentSchema, type SiteContent } from "./site-schema";

const SITE_ID = "aaaaaaaa-0000-4000-8000-000000000001";

function validContent(): SiteContent {
  return {
    sections: [
      { id: "hero", type: "hero", visible: true, title: "결 헤어", subtitle: "손질이 쉬운 머리", ctaLabel: "예약 문의하기" },
      {
        id: "list",
        type: "list",
        visible: true,
        title: "시술 메뉴",
        items: [{ name: "클리닉 펌", description: "손상 케어 포함", price: "80,000원부터" }],
      },
      { id: "info", type: "info", visible: true, title: "영업 안내" },
      { id: "gallery", type: "gallery", visible: false, title: "사진 모음", photos: [`${SITE_ID}/shop-1.webp`] },
    ],
    theme: { accent: "#8C5A7A", font: "dodum", layout: "center", photo: `${SITE_ID}/hero.jpg` },
    business: { phone: "031-922-5678", hours: "화–일 10:00–20:00", kakao: "@결헤어" },
  };
}

describe("siteContentSchema", () => {
  it("올바른 사이트 데이터를 통과시킨다", () => {
    expect(siteContentSchema.safeParse(validContent()).success).toBe(true);
  });

  it("모르는 섹션 타입을 거부한다", () => {
    const content = validContent();
    const result = siteContentSchema.safeParse({
      ...content,
      sections: [...content.sections, { id: "canvas", type: "canvas", visible: true, title: "자유 배치" }],
    });
    expect(result.success).toBe(false);
  });

  it("너무 긴 제목을 거부한다", () => {
    const content = validContent();
    content.sections[0] = { ...content.sections[0], title: "가".repeat(51) } as SiteContent["sections"][number];
    expect(siteContentSchema.safeParse(content).success).toBe(false);
  });

  it("섹션 타입에 맞지 않는 필드 구성을 거부한다", () => {
    const content = validContent();
    const result = siteContentSchema.safeParse({
      ...content,
      sections: [{ id: "list", type: "list", visible: true, title: "메뉴" }],
    });
    expect(result.success).toBe(false);
  });

  it("잘못된 색상 값을 거부한다", () => {
    const content = validContent();
    expect(siteContentSchema.safeParse({ ...content, theme: { ...content.theme, accent: "green" } }).success).toBe(
      false,
    );
  });

  it("빈 theme를 거부한다", () => {
    expect(siteContentSchema.safeParse({ ...validContent(), theme: {} }).success).toBe(false);
  });

  it("사이트 폴더 밖을 가리키는 사진 경로를 거부한다", () => {
    const content = validContent();
    for (const photo of ["../secret.png", `/${SITE_ID}/a.png`, `${SITE_ID}/../a.png`, "https://example.com/a.png"]) {
      expect(siteContentSchema.safeParse({ ...content, theme: { ...content.theme, photo } }).success).toBe(false);
    }
  });

  it("중복된 섹션 id를 거부한다", () => {
    const content = validContent();
    expect(
      siteContentSchema.safeParse({ ...content, sections: [content.sections[0], content.sections[0]] }).success,
    ).toBe(false);
  });

  it("빈 가게 정보는 통과시키고, 잘못된 전화번호는 거부한다", () => {
    const content = validContent();
    expect(siteContentSchema.safeParse({ ...content, business: {} }).success).toBe(true);
    expect(siteContentSchema.safeParse({ ...content, business: { phone: "전화 주세요" } }).success).toBe(false);
  });
});

describe("businessSchema", () => {
  it("빈 전화번호는 입력 안 함으로 저장할 수 있다", () => {
    for (const phone of ["", "   "]) {
      const result = businessSchema.safeParse({ phone });
      expect(result.success).toBe(true);
      expect(result.data).not.toHaveProperty("phone");
    }
  });

  it("다른 필드의 빈 문자열도 입력 안 함으로 처리한다", () => {
    const result = businessSchema.parse({ address: "", hours: "  ", kakao: "", phone: "" });
    expect(result).toEqual({});
    expect(Object.keys(result)).toEqual([]);
  });

  it("띄어 쓴 전화번호를 하이픈으로 정리한다", () => {
    expect(businessSchema.parse({ phone: "010 1234 5678" }).phone).toBe("010-1234-5678");
    expect(businessSchema.parse({ phone: "  031  905 - 1234 " }).phone).toBe("031-905-1234");
    expect(businessSchema.parse({ phone: "1588-1234" }).phone).toBe("1588-1234");
  });

  it("문자가 섞인 전화번호는 거부한다", () => {
    for (const phone of ["010-1234-567O", "010 1234 abcd", "전화 010-1234-5678", "+82 10 1234 5678"]) {
      expect(businessSchema.safeParse({ phone }).success).toBe(false);
    }
  });
});
