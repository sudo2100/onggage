import { afterEach, describe, expect, it, vi } from "vitest";
import { assetUrl, getQuickActions, kakaoHref, kakaoLabel, mapHref, telHref } from "./site-links";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("가게 정보 링크", () => {
  it("전화번호는 숫자만 남긴 tel: 링크가 된다", () => {
    expect(telHref("031-905-1234")).toBe("tel:0319051234");
  });

  it("길찾기는 주소로 네이버 지도를 검색한다", () => {
    expect(mapHref("경기 고양시 정발산로 24")).toBe(
      `https://map.naver.com/p/search/${encodeURIComponent("경기 고양시 정발산로 24")}`,
    );
  });

  it("카카오톡은 채널·오픈채팅 링크만 링크로 쓰고 @아이디는 글자로 둔다", () => {
    expect(kakaoHref("https://pf.kakao.com/_abc")).toBe("https://pf.kakao.com/_abc");
    expect(kakaoHref("https://open.kakao.com/o/abc")).toBe("https://open.kakao.com/o/abc");
    expect(kakaoHref("@담소식당")).toBeUndefined();
    expect(kakaoLabel("https://pf.kakao.com/_abc")).toBe("카카오톡 채널");
    expect(kakaoLabel("https://open.kakao.com/o/abc")).toBe("카카오톡 오픈채팅");
    expect(kakaoLabel("@담소식당")).toBe("@담소식당");
  });

  it("채널 채팅 바로가기(/chat) 링크도 채널 링크로 쓴다", () => {
    expect(kakaoHref("https://pf.kakao.com/_abc/chat")).toBe("https://pf.kakao.com/_abc/chat");
    expect(kakaoLabel("https://pf.kakao.com/_abc/chat")).toBe("카카오톡 채널");
    expect(getQuickActions({ kakao: "https://pf.kakao.com/_abc/chat" })[0]).toMatchObject({
      kind: "kakao",
      href: "https://pf.kakao.com/_abc/chat",
    });
  });
});

describe("getQuickActions (하단 고정 버튼)", () => {
  it("가게 정보가 비면 버튼이 없다", () => {
    expect(getQuickActions({})).toEqual([]);
  });

  it("값이 있는 항목만 순서대로 만든다", () => {
    expect(getQuickActions({ phone: "031-905-1234", address: "정발산로 24" }).map((a) => a.kind)).toEqual([
      "phone",
      "map",
    ]);
  });

  it("카카오톡이 @아이디뿐이면 카카오톡 버튼은 만들지 않는다", () => {
    expect(getQuickActions({ kakao: "@담소식당" })).toEqual([]);
    expect(getQuickActions({ kakao: "https://pf.kakao.com/_damso" }).map((a) => a.kind)).toEqual(["kakao"]);
  });
});

describe("assetUrl", () => {
  it("사진 경로를 Storage 공개 주소로 바꾼다", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321/");
    expect(assetUrl("aaaaaaaa-0000-4000-8000-000000000001/hero.jpg")).toBe(
      "http://127.0.0.1:54321/storage/v1/object/public/site-assets/aaaaaaaa-0000-4000-8000-000000000001/hero.jpg",
    );
  });

  it("Supabase 주소가 없으면 undefined (색 배경으로 대신)", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect(assetUrl("aaaaaaaa-0000-4000-8000-000000000001/hero.jpg")).toBeUndefined();
  });
});
