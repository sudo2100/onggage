import Image from "next/image";
import { assetUrl } from "@/lib/site-links";

type Props = {
  path?: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
};

// 사진이 있으면 Storage 공개 주소로 보여 주고, 없으면 accent 색 그라데이션으로 대신한다.
// 위치(relative/absolute)는 className으로 넘긴다. next/image의 fill은 둘 다 기준 상자로 쓴다.
export function SitePhoto({ path, alt, sizes, priority, className = "relative" }: Props) {
  const src = path ? assetUrl(path) : undefined;
  return (
    <div
      className={`overflow-hidden ${className}`}
      style={{ backgroundImage: "var(--site-placeholder)" }}
      data-photo={src ? "image" : "placeholder"}
    >
      {src ? <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" /> : null}
    </div>
  );
}
