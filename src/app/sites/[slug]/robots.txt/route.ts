import { getPublishedSite } from "@/lib/public-site";
import { siteUrl } from "@/lib/site-host";

// 공개 사이트 서브도메인의 robots.txt ({slug}.기준 도메인/robots.txt → proxy rewrite).
export async function GET(_request: Request, { params }: RouteContext<"/sites/[slug]/robots.txt">) {
  const { slug } = await params;
  const published = await getPublishedSite(slug);
  if (!published) return new Response("Not Found", { status: 404 });

  const body = ["User-agent: *", "Allow: /", "", `Sitemap: ${siteUrl(slug, "/sitemap.xml")}`, ""].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
