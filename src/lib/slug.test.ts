import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { previewSlug, RESERVED_SLUGS, romanizeHangul, SLUG_PATTERN, slugify, suggestSlug } from "./slug";
import { SAMPLE_SHOPS } from "./templates/samples";

describe("romanizeHangul", () => {
  it.each([
    ["담소 식당", "damso sikdang"],
    ["결 헤어", "gyeol heeo"],
    ["숲속 쉼표", "supsok swimpyo"],
    ["바른 세무회계", "bareun semuhoegye"],
    ["꽃집", "kkotjip"],
  ])("%s → %s", (input, expected) => {
    expect(romanizeHangul(input)).toBe(expected);
  });

  it("한글이 아닌 글자는 그대로 둔다", () => {
    expect(romanizeHangul("Cafe 담 2호점")).toBe("Cafe dam 2hojeom");
  });
});

describe("slugify / suggestSlug", () => {
  it("공백·기호는 하이픈 하나로, 앞뒤 하이픈은 지운다", () => {
    expect(slugify("  담소 식당!! (일산점) ")).toBe("damso-sikdang-ilsanjeom");
    expect(slugify("Café Moment")).toBe("cafe-moment");
  });

  it("30자를 넘으면 자르고, 끝의 하이픈도 지운다", () => {
    const slug = slugify("가나다라마바사 아자차카타파하 가나다라");
    expect(slug.length).toBeLessThanOrEqual(30);
    expect(slug).toMatch(SLUG_PATTERN);
  });

  it("너무 짧거나 비면 업종 이름을 쓴다", () => {
    expect(suggestSlug("A", "food")).toBe("a-food");
    expect(suggestSlug("🍜🍜", "food")).toBe("food");
    expect(suggestSlug("!!!", "beauty")).toBe("beauty");
  });

  it("예시 상호는 모두 DB 형식을 통과한다", () => {
    for (const [industry, shop] of Object.entries(SAMPLE_SHOPS)) {
      expect(suggestSlug(shop.name, industry as "food")).toMatch(SLUG_PATTERN);
    }
  });

  it("예상 주소: 예약어면 -2를 붙여 보여 준다", () => {
    expect(previewSlug("admin", "food")).toBe("admin-2");
    expect(previewSlug("담소 식당", "food")).toBe("damso-sikdang");
  });
});

// DB의 기준 목록: 가장 최근 마이그레이션에 정의된 public.reserved_slugs()
function reservedSlugsFromMigrations(): string[] {
  const dir = join(process.cwd(), "supabase/migrations");
  const files = readdirSync(dir).filter((file) => file.endsWith(".sql")).sort();
  let latest: string | undefined;
  for (const file of files) {
    const sql = readFileSync(join(dir, file), "utf8");
    const match = /function public\.reserved_slugs\(\)[\s\S]*?array\[([\s\S]*?)\]::text\[\]/.exec(sql);
    if (match) latest = match[1];
  }
  return [...(latest ?? "").matchAll(/'([a-z0-9-]+)'/g)].map((match) => match[1]);
}

describe("RESERVED_SLUGS", () => {
  it("DB 기준 목록(reserved_slugs())과 같다", () => {
    const fromDb = reservedSlugsFromMigrations();
    expect(fromDb.length).toBeGreaterThan(10);
    expect([...RESERVED_SLUGS].sort()).toEqual([...fromDb].sort());
  });

  it("꼭 막아야 하는 주소를 포함한다", () => {
    for (const slug of ["www", "api", "admin", "app", "studio", "mail", "static", "assets"]) {
      expect(RESERVED_SLUGS).toContain(slug);
    }
  });
});
