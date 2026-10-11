import { notFound } from "next/navigation";
import { SiteRenderer } from "@/components/site";
import { DESIGNS, getPreview, PREVIEW_VARIANTS, type PreviewVariant } from "../../sample";

// 개발용 페이지라 즉시 표시용 껍데기 없이 다 그린 뒤 보여 준다.
export const instant = false;

export function generateStaticParams() {
  return DESIGNS.flatMap((design) => PREVIEW_VARIANTS.map((variant) => ({ designId: design.id, variant })));
}

// 디자인 하나를 사이트 전체 화면으로 그린다. /dev/preview의 iframe이 이 페이지를 띄운다.
export default async function DesignPreviewPage({ params }: PageProps<"/dev/preview/[designId]/[variant]">) {
  const { designId, variant } = await params;
  if (!(PREVIEW_VARIANTS as readonly string[]).includes(variant)) notFound();
  const preview = getPreview(designId, variant as PreviewVariant);
  if (!preview) notFound();

  return <SiteRenderer content={preview.content} industry={preview.design.industry} siteName={preview.siteName} />;
}
