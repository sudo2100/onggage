import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "개발용 미리보기",
  robots: { index: false, follow: false },
};

// /dev 아래 페이지는 개발 환경에서만 연다. 운영 빌드에서는 404.
export default function DevLayout({ children }: LayoutProps<"/dev">) {
  if (process.env.NODE_ENV !== "development") notFound();
  return children;
}
