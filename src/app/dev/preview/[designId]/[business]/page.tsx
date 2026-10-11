import { notFound } from "next/navigation";
import { SiteRenderer } from "@/components/site";
import { BUSINESS_VARIANTS, DESIGNS, getPreview, type BusinessVariant } from "../../sample";

// 개발용 페이지라 즉시 표시용 껍데기 없이 다 그린 뒤 보여 준다.
export const instant = false;

export function generateStaticParams() {
  return DESIGNS.flatMap((design) => BUSINESS_VARIANTS.map((business) => ({ designId: design.id, business })));
}

// 디자인 하나를 사이트 전체 화면으로 그린다. /dev/preview의 iframe이 이 페이지를 띄운다.
export default async function DesignPreviewPage({ params }: PageProps<"/dev/preview/[designId]/[business]">) {
  const { designId, business } = await params;
  if (!(BUSINESS_VARIANTS as readonly string[]).includes(business)) notFound();
  const preview = getPreview(designId, business as BusinessVariant);
  if (!preview) notFound();

  return <SiteRenderer content={preview.content} industry={preview.design.industry} siteName={preview.siteName} />;
}
