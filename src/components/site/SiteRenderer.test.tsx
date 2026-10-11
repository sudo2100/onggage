import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Business, SiteContent } from "@/lib/site-schema";
import { DESIGNS, getTemplateContent } from "@/lib/templates";
import { SiteRenderer } from "./SiteRenderer";

// next/font는 Next 빌드에서만 동작하므로 테스트에서는 글꼴 이름을 class로 돌려준다.
vi.mock("./fonts", () => ({ siteFontClass: (font: string) => `font-site-${font}` }));

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

const fullBusiness: Business = {
  hours: "매일 11:00–21:00",
  phone: "031-905-1234",
  kakao: "https://pf.kakao.com/_damso",
  address: "경기 고양시 일산동구 정발산로 24",
};

function renderSite(content: SiteContent, siteName = "담소 식당") {
  return render(<SiteRenderer content={content} industry="food" siteName={siteName} />).container;
}

function foodContent(business: Business = fullBusiness): SiteContent {
  return { ...getTemplateContent("food", "담소 식당"), business };
}

describe("SiteRenderer", () => {
  it.each(DESIGNS.map((d) => [d.id, d] as const))("%s 디자인을 그린다", (_, design) => {
    const content: SiteContent = {
      ...getTemplateContent(design.industry, "온가게 테스트점"),
      theme: { ...design.theme },
      business: fullBusiness,
    };
    const { container } = render(
      <SiteRenderer content={content} industry={design.industry} siteName="온가게 테스트점" />,
    );
    const root = container.querySelector("[data-site-root]");
    expect(root).not.toBeNull();
    expect(root?.className).toContain(`font-site-${design.theme.font}`);
    expect(container.querySelector("h1")?.textContent).toBe("온가게 테스트점");
    expect(container.querySelectorAll("section[data-section]")).toHaveLength(5);
    expect(container.querySelector("[data-quick-actions]")).not.toBeNull();
  });

  it("가게 정보가 비면 하단 버튼과 영업 안내 섹션을 숨긴다", () => {
    const container = renderSite(foodContent({}));
    expect(container.querySelector("[data-quick-actions]")).toBeNull();
    expect(container.querySelector('[data-section="info"]')).toBeNull();
    expect(container.querySelector('[data-section="contact"]')).not.toBeNull();
  });

  it("값이 있는 항목만 하단 버튼과 영업 안내에 보여 준다", () => {
    const container = renderSite(foodContent({ phone: "031-905-1234" }));
    const actions = [...container.querySelectorAll("[data-quick-actions] a")];
    expect(actions.map((a) => a.textContent)).toEqual(["전화"]);
    expect(actions[0].getAttribute("href")).toBe("tel:0319051234");
    const info = container.querySelector('[data-section="info"]');
    expect([...(info?.querySelectorAll("dt") ?? [])].map((dt) => dt.textContent)).toEqual(["전화"]);
  });

  it("카카오톡이 @아이디뿐이면 글자로만 보여 주고 버튼은 만들지 않는다", () => {
    const container = renderSite(foodContent({ kakao: "@담소식당" }));
    expect(container.querySelector("[data-quick-actions]")).toBeNull();
    expect(container.querySelector('[data-section="info"] dd')?.textContent).toBe("@담소식당");
  });

  it("사장님이 쓴 글의 HTML은 텍스트로만 나온다", () => {
    const content = foodContent();
    content.sections[1] = {
      id: "about",
      type: "about",
      visible: true,
      title: "<b>우리</b> 이야기",
      body: '<script>alert("x")</script><img src=x onerror=alert(1)>',
    };
    const container = renderSite(content);
    const about = container.querySelector('[data-section="about"]');
    expect(about?.querySelector("script, img, b")).toBeNull();
    expect(about?.textContent).toContain('<script>alert("x")</script>');
  });

  it("숨긴 섹션은 그리지 않는다", () => {
    const content = foodContent();
    content.sections = content.sections.map((s) => (s.type === "list" ? { ...s, visible: false } : s));
    expect(renderSite(content).querySelector('[data-section="list"]')).toBeNull();
  });

  it("문의 폼은 전송하지 않는다 (버튼이 submit이 아니다)", () => {
    const container = renderSite(foodContent());
    const form = container.querySelector('[data-section="contact"] form');
    expect(form?.querySelector('button[type="submit"], input[type="submit"]')).toBeNull();
    expect(form?.querySelector("button")?.getAttribute("type")).toBe("button");
    expect(form?.getAttribute("action")).toBeNull();
  });

  it("문의 저장 기능이 꺼져 있으면(기본) 보내기 버튼을 비활성화하고 안내 문구를 보여 준다", () => {
    const container = renderSite(foodContent());
    const contact = container.querySelector('[data-section="contact"]');
    const button = contact?.querySelector("form button");
    expect(button?.hasAttribute("disabled")).toBe(true);
    const notice = contact?.querySelector("[data-inquiry-notice]");
    expect(notice?.textContent).toBe("온라인 문의는 준비 중이에요. 전화나 카카오톡으로 연락해 주세요.");
    expect(button?.getAttribute("aria-describedby")).toBe(notice?.id);
  });

  it("inquiryEnabled를 켜면 보내기 버튼이 활성화되고 안내 문구가 사라진다", () => {
    const { container } = render(
      <SiteRenderer content={foodContent()} industry="food" siteName="담소 식당" inquiryEnabled />,
    );
    const contact = container.querySelector('[data-section="contact"]');
    expect(contact?.querySelector("form button")?.hasAttribute("disabled")).toBe(false);
    expect(contact?.querySelector("[data-inquiry-notice]")).toBeNull();
  });

  it("대표 화면 버튼은 문의 섹션으로 가는 링크다", () => {
    const container = renderSite(foodContent());
    const cta = container.querySelector('[data-section="hero"] [data-cta]');
    expect(cta?.tagName).toBe("A");
    expect(cta?.getAttribute("href")).toBe("#contact");
    expect(container.querySelector("section#contact")).not.toBeNull();
  });

  it("문의 섹션이 숨겨져 있으면 대표 화면 버튼은 링크 없이 모양만 보여 준다", () => {
    const content = foodContent();
    content.sections = content.sections.map((s) => (s.type === "contact" ? { ...s, visible: false } : s));
    const cta = renderSite(content).querySelector('[data-section="hero"] [data-cta]');
    expect(cta?.tagName).toBe("SPAN");
    expect(cta?.hasAttribute("href")).toBe(false);
    expect(cta?.textContent).toBe("예약·문의하기");
  });

  describe("사진 모음", () => {
    const gallery = (photos: string[]) => {
      const content = foodContent();
      content.sections = [...content.sections, { id: "gallery", type: "gallery", visible: true, title: "사진 모음", photos }];
      return content;
    };

    it("사진이 없으면 공개 화면에서 섹션을 그리지 않는다", () => {
      expect(renderSite(gallery([])).querySelector('[data-section="gallery"]')).toBeNull();
    });

    it("showPlaceholders를 켜면 사진 없이도 자리 표시를 그린다 (편집실 미리보기)", () => {
      const { container } = render(
        <SiteRenderer content={gallery([])} industry="food" siteName="담소 식당" showPlaceholders />,
      );
      const section = container.querySelector('[data-section="gallery"]');
      expect(section?.querySelectorAll('[data-photo="placeholder"]')).toHaveLength(3);
    });

    it("사진이 있으면 공개 화면에서도 그린다", () => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
      const container = renderSite(gallery(["aaaaaaaa-0000-4000-8000-000000000001/shop-1.webp"]));
      expect(container.querySelectorAll('[data-section="gallery"] [data-photo="image"] img')).toHaveLength(1);
    });
  });

  it("사진이 없으면 색 배경, 있으면 Storage 공개 주소로 보여 준다", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    const without = renderSite(foodContent());
    expect(without.querySelector('[data-section="hero"] [data-photo]')?.getAttribute("data-photo")).toBe(
      "placeholder",
    );
    cleanup();

    const content = foodContent();
    content.theme = { ...content.theme, photo: "aaaaaaaa-0000-4000-8000-000000000001/hero.jpg" };
    const withPhoto = renderSite(content);
    const img = withPhoto.querySelector('[data-section="hero"] [data-photo="image"] img');
    expect(img?.getAttribute("alt")).toBe("담소 식당 대표 사진");
    expect(decodeURIComponent(img?.getAttribute("src") ?? "")).toContain(
      "http://127.0.0.1:54321/storage/v1/object/public/site-assets/aaaaaaaa-0000-4000-8000-000000000001/hero.jpg",
    );
  });
});
