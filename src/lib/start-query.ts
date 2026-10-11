// 마케팅 화면이 주고받는 쿼리(name·industry)를 읽고, 다음 화면 주소를 만든다.
// name은 사용자가 입력한 값이라 길이만 자르고 화면에는 텍스트로만 출력한다.
import { industrySchema, type Industry } from "@/lib/site-schema";

export const MAX_NAME_LENGTH = 50;

export type SearchParamsRecord = Record<string, string | string[] | undefined>;
export type StartQuery = { name?: string; industry?: Industry };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

// 앞뒤 공백을 지우고 50자(한글·이모지도 한 글자로)를 넘으면 자른다. 빈 값은 없는 것으로 본다.
export function normalizeName(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  return Array.from(trimmed).slice(0, MAX_NAME_LENGTH).join("").trim();
}

export function parseStartQuery(params: SearchParamsRecord): StartQuery {
  const industry = industrySchema.safeParse(first(params.industry));
  return {
    name: normalizeName(first(params.name)),
    industry: industry.success ? industry.data : undefined,
  };
}

function withQuery(path: string, query: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}

export function designsHref(query: StartQuery & { filter?: string }): string {
  return withQuery("/designs", { name: query.name, industry: query.industry, filter: query.filter });
}

export function designHref(designId: string, query: StartQuery): string {
  return withQuery(`/designs/${designId}`, { name: query.name, industry: query.industry });
}

// 가입 후 온보딩으로 이어지는 주소: /signup?next=/start?design=…&name=…
export function startHref(designId: string, name?: string): string {
  return withQuery("/signup", { next: withQuery("/start", { design: designId, name }) });
}
