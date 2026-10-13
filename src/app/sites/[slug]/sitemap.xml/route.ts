import { getPublishedSite } from "@/lib/public-site";
import { siteUrl } from "@/lib/site-host";

// 공개 사이트 서브도메인의 sitemap.xml. 지금 공개 사이트는 한 페이지라 주소 하나만 넣는다.
// 검색엔진은 다른 호스트의 주소를 한 sitemap에 섞는 것을 인정하지 않아, 메인 sitemap과 나눈다.
export async function GET(_request: Request, { params }: RouteContext<"/sites/[slug]/sitemap.xml">) {
  const { slug } = await params;
  const published = await getPublishedSite(slug);
  if (!published) return new Response("Not Found", { status: 404 });

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    `  <url><loc>${siteUrl(slug)}</loc><lastmod>${new Date(published.updatedAt).toISOString()}</lastmod></url>`,
    "</urlset>",
    "",
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
